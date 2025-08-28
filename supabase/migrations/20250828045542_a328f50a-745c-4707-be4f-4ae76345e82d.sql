-- Drop the failed policies and views from previous attempt
DROP VIEW IF EXISTS public.galleries_public_safe CASCADE;
DROP VIEW IF EXISTS public.galleries_owner_safe CASCADE;
DROP POLICY IF EXISTS "Gallery owners can view their galleries safely" ON public.galleries_owner_safe;
DROP POLICY IF EXISTS "Public can view public galleries metadata only" ON public.galleries;
DROP POLICY IF EXISTS "Anonymous can view through safe view only" ON public.galleries;

-- Restore the original public galleries policy but make it more restrictive
CREATE POLICY "Public can view public galleries" 
ON public.galleries 
FOR SELECT 
USING (is_public = true);

-- Create a function to safely get public gallery info without password hash
CREATE OR REPLACE FUNCTION public.get_public_gallery_safe(gallery_uuid uuid)
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
    AND g.is_public = true;
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

-- Create function to get public galleries list safely (for browse page)
CREATE OR REPLACE FUNCTION public.get_public_galleries_safe()
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
  WHERE g.is_public = true
  ORDER BY g.view_count DESC
  LIMIT 50;
$$;