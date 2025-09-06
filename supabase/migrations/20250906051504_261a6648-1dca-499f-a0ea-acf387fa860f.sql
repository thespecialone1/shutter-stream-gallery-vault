-- Check if get_user_favorites function exists
SELECT 
  p.proname AS function_name,
  p.pronargs AS num_args,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'get_user_favorites';

-- Make gallery-images bucket public for proper image access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'gallery-images';

-- Create get_user_favorites function if it doesn't exist properly
CREATE OR REPLACE FUNCTION public.get_user_favorites(user_uuid uuid DEFAULT auth.uid())
RETURNS TABLE(
  favorite_id uuid,
  image_id uuid,
  gallery_id uuid,
  gallery_name text,
  gallery_client_name text,
  image_filename text,
  image_original_filename text,
  image_full_path text,
  image_thumbnail_path text,
  image_width integer,
  image_height integer,
  favorited_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT 
    f.id as favorite_id,
    f.image_id,
    f.gallery_id,
    g.name as gallery_name,
    g.client_name as gallery_client_name,
    i.filename as image_filename,
    i.original_filename as image_original_filename,
    i.full_path as image_full_path,
    i.thumbnail_path as image_thumbnail_path,
    i.width as image_width,
    i.height as image_height,
    f.created_at as favorited_at
  FROM favorites f
  JOIN images i ON f.image_id = i.id
  JOIN galleries g ON f.gallery_id = g.id
  WHERE f.user_id = user_uuid
  ORDER BY f.created_at DESC;
END;
$$;