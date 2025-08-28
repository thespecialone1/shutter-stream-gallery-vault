-- Create a secure view for public galleries that excludes sensitive information
CREATE OR REPLACE VIEW public.galleries_public_safe AS
SELECT 
  id,
  name,
  description,
  client_name,
  created_at,
  updated_at,
  view_count,
  is_public,
  photographer_id
FROM public.galleries
WHERE is_public = true;

-- Grant access to the view
GRANT SELECT ON public.galleries_public_safe TO authenticated, anon;

-- Create a secure view for gallery owners that includes all columns except password_hash
CREATE OR REPLACE VIEW public.galleries_owner_safe AS
SELECT 
  id,
  name,
  description,
  client_name,
  created_at,
  updated_at,
  view_count,
  is_public,
  photographer_id
FROM public.galleries;

-- Grant access to the view with proper RLS
GRANT SELECT ON public.galleries_owner_safe TO authenticated;

-- Create RLS policy for the owner safe view
CREATE POLICY "Gallery owners can view their galleries safely" 
ON public.galleries_owner_safe 
FOR SELECT 
USING (photographer_id = auth.uid());

-- Update the existing RLS policy to be more restrictive
-- First drop the existing policy
DROP POLICY IF EXISTS "Public can view public galleries" ON public.galleries;

-- Create new restrictive policy that prevents direct access to the galleries table for public galleries
CREATE POLICY "Public can view public galleries metadata only" 
ON public.galleries 
FOR SELECT 
USING (is_public = true AND auth.uid() IS NOT NULL);

-- Create a new policy for anonymous users to access only through the safe view
CREATE POLICY "Anonymous can view through safe view only" 
ON public.galleries 
FOR SELECT 
USING (false);

-- Create function to safely get gallery basic info without password hash
CREATE OR REPLACE FUNCTION public.get_gallery_safe(gallery_uuid uuid)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  client_name text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  view_count integer,
  is_public boolean,
  photographer_id uuid
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO public
AS $$
  SELECT 
    g.id,
    g.name,
    g.description,
    g.client_name,
    g.created_at,
    g.updated_at,
    g.view_count,
    g.is_public,
    g.photographer_id
  FROM public.galleries g
  WHERE g.id = gallery_uuid 
    AND (g.is_public = true OR g.photographer_id = auth.uid());
$$;

-- Create function for gallery owners to get their gallery info safely
CREATE OR REPLACE FUNCTION public.get_my_gallery_safe(gallery_uuid uuid)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  client_name text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  view_count integer,
  is_public boolean,
  photographer_id uuid,
  has_password boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO public
AS $$
  SELECT 
    g.id,
    g.name,
    g.description,
    g.client_name,
    g.created_at,
    g.updated_at,
    g.view_count,
    g.is_public,
    g.photographer_id,
    (g.password_hash IS NOT NULL) as has_password
  FROM public.galleries g
  WHERE g.id = gallery_uuid 
    AND g.photographer_id = auth.uid();
$$;