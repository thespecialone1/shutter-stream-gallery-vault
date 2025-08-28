-- Create secure functions to access gallery data without exposing password hashes

-- Function to safely get gallery info for public access
CREATE OR REPLACE FUNCTION public.get_gallery_safe_info(gallery_uuid uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO public
AS $$
  SELECT json_build_object(
    'id', g.id,
    'name', g.name,
    'description', g.description,
    'client_name', g.client_name,
    'created_at', g.created_at,
    'updated_at', g.updated_at,
    'view_count', g.view_count,
    'is_public', g.is_public,
    'photographer_id', g.photographer_id
  )
  FROM public.galleries g
  WHERE g.id = gallery_uuid 
    AND g.is_public = true;
$$;

-- Function for gallery owners to get their gallery info safely
CREATE OR REPLACE FUNCTION public.get_my_gallery_info(gallery_uuid uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO public
AS $$
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
    'has_password', (g.password_hash IS NOT NULL)
  )
  FROM public.galleries g
  WHERE g.id = gallery_uuid 
    AND g.photographer_id = auth.uid();
$$;

-- Function to get list of public galleries safely
CREATE OR REPLACE FUNCTION public.list_public_galleries()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO public
AS $$
  SELECT json_agg(
    json_build_object(
      'id', g.id,
      'name', g.name,
      'description', g.description,
      'client_name', g.client_name,
      'created_at', g.created_at,
      'view_count', g.view_count,
      'is_public', g.is_public,
      'photographer_id', g.photographer_id
    )
  )
  FROM public.galleries g
  WHERE g.is_public = true
  ORDER BY g.view_count DESC
  LIMIT 50;
$$;