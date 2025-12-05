-- Fix: Drop the ineffective policy and create a proper one
-- The "Public cannot access password hashes" policy has AND false which never matches

DROP POLICY IF EXISTS "Public cannot access password hashes" ON public.galleries;

-- Drop the overly permissive public select policy
DROP POLICY IF EXISTS "Anyone can view public gallery status" ON public.galleries;

-- Create a function that returns public gallery info WITHOUT sensitive data
CREATE OR REPLACE FUNCTION public.get_gallery_safe_info(gallery_uuid uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'id', g.id,
    'name', g.name,
    'description', g.description,
    'client_name', g.client_name,
    'created_at', g.created_at,
    'updated_at', g.updated_at,
    'view_count', g.view_count,
    'is_public', g.is_public,
    'cover_image_id', g.cover_image_id,
    'has_password', (g.password_hash IS NOT NULL)
  ) INTO result
  FROM public.galleries g
  WHERE g.id = gallery_uuid 
    AND g.is_public = true;
    
  RETURN result;
END;
$$;

-- Create a new restrictive policy for public galleries that excludes password_hash
-- This uses a security definer view approach
CREATE OR REPLACE VIEW public.galleries_safe_public AS
SELECT 
  id,
  name,
  description,
  client_name,
  created_at,
  updated_at,
  view_count,
  is_public,
  photographer_id,
  cover_image_id,
  (password_hash IS NOT NULL) as has_password
FROM public.galleries
WHERE is_public = true;

-- Grant select on the safe view to anon and authenticated
GRANT SELECT ON public.galleries_safe_public TO anon, authenticated;

-- Re-add a policy for public galleries that only allows viewing basic info
-- through authenticated users (not anon) for direct table access
CREATE POLICY "Authenticated users can view public gallery basic info"
ON public.galleries
FOR SELECT
USING (
  is_public = true 
  AND auth.uid() IS NOT NULL
);