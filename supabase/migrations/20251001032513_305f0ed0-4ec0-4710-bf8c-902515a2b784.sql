-- Security Fix: Prevent password hash exposure in public galleries
-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public can view public galleries safely" ON public.galleries;

-- Create a more secure policy that uses a view or function
-- Note: Public access should now only happen through the galleries_public_view view
-- or the get_gallery_safe_info() function which exclude password_hash

-- Add explicit policy to block direct password_hash access
CREATE POLICY "Public cannot access password hashes"
ON public.galleries
FOR SELECT
USING (
  is_public = true 
  AND auth.uid() IS NULL 
  AND false  -- Block all direct public access, must use views/functions
);

-- Enhance the get_gallery_safe_info function with better security
CREATE OR REPLACE FUNCTION public.get_gallery_safe_info(gallery_uuid uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  -- Only return safe fields, never password_hash
  SELECT json_build_object(
    'id', g.id,
    'name', g.name,
    'description', g.description,
    'client_name', g.client_name,
    'created_at', g.created_at,
    'updated_at', g.updated_at,
    'view_count', g.view_count,
    'is_public', g.is_public,
    'photographer_id', g.photographer_id,
    'has_password', (g.password_hash IS NOT NULL)  -- Only indicate if password exists
  ) INTO result
  FROM public.galleries g
  WHERE g.id = gallery_uuid 
    AND g.is_public = true;
    
  -- Log access attempt for security monitoring
  IF result IS NOT NULL THEN
    PERFORM public.log_security_event(
      'public_gallery_access',
      'info',
      json_build_object(
        'gallery_id', gallery_uuid,
        'access_method', 'safe_function'
      )::jsonb
    );
  END IF;
    
  RETURN result;
END;
$$;

-- Create a policy that allows authenticated gallery owners to see their own password hashes
-- This is needed for gallery management
CREATE POLICY "Gallery owners can view full gallery info including password status"
ON public.galleries
FOR SELECT
USING (
  photographer_id = auth.uid()
);

-- Ensure the galleries_public_view excludes password_hash
DROP VIEW IF EXISTS public.galleries_public_view CASCADE;
CREATE VIEW public.galleries_public_view AS
SELECT 
  id,
  name,
  description,
  client_name,
  created_at,
  view_count,
  is_public
FROM public.galleries
WHERE is_public = true;

-- Grant access to the view
GRANT SELECT ON public.galleries_public_view TO anon, authenticated;

-- Log the security fix
SELECT public.log_security_event(
  'security_patch_applied',
  'info',
  json_build_object(
    'patch', 'password_hash_exposure_fix',
    'timestamp', now(),
    'description', 'Removed public access to password hashes in galleries table'
  )::jsonb
);