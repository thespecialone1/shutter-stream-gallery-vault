-- First, let's remove the anonymous favorites system completely
-- We'll keep the favorites table but clean it up for authenticated users only

-- Drop the anonymous_favorites table and its related functions
DROP TABLE IF EXISTS public.anonymous_favorites CASCADE;

-- Remove any functions that were handling anonymous favorites
DROP FUNCTION IF EXISTS public.toggle_anonymous_favorite(uuid, uuid, text, inet);
DROP FUNCTION IF EXISTS public.get_anonymous_favorites(uuid, text);

-- Update the favorites table to ensure it only handles authenticated users
-- Remove any NULL user_ids from existing data
DELETE FROM public.favorites WHERE user_id IS NULL;

-- Make user_id NOT NULL (since all favorites must be from authenticated users)
ALTER TABLE public.favorites ALTER COLUMN user_id SET NOT NULL;

-- Add a unique constraint to prevent duplicate favorites
ALTER TABLE public.favorites ADD CONSTRAINT unique_user_gallery_image 
  UNIQUE (user_id, gallery_id, image_id);

-- Update RLS policies for the simplified system
DROP POLICY IF EXISTS "Gallery owners can view favorites on their galleries" ON public.favorites;
DROP POLICY IF EXISTS "Users can create their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.favorites;

-- Create new simplified RLS policies
CREATE POLICY "Users can manage their own favorites" 
ON public.favorites 
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Gallery owners can view favorites on their galleries" 
ON public.favorites 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.galleries g
  WHERE g.id = favorites.gallery_id 
  AND g.photographer_id = auth.uid()
));

-- Create function to get user's favorites with image details
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
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow users to get their own favorites
  IF auth.uid() IS NULL OR auth.uid() != user_uuid THEN
    RAISE EXCEPTION 'Access denied';
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
  FROM public.favorites f
  JOIN public.images i ON f.image_id = i.id
  JOIN public.galleries g ON f.gallery_id = g.id
  WHERE f.user_id = user_uuid
  ORDER BY f.created_at DESC;
END;
$function$;

-- Create function to get favorites analytics for gallery owners
CREATE OR REPLACE FUNCTION public.get_gallery_favorites_analytics(gallery_uuid uuid)
RETURNS TABLE(
  total_favorites bigint,
  unique_users bigint,
  most_favorited_images jsonb,
  recent_favorites jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify user owns the gallery
  IF NOT EXISTS (
    SELECT 1 FROM public.galleries g 
    WHERE g.id = gallery_uuid AND g.photographer_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: Gallery not found or insufficient permissions';
  END IF;

  RETURN QUERY
  SELECT 
    COUNT(f.id) as total_favorites,
    COUNT(DISTINCT f.user_id) as unique_users,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'image_id', image_favorites.image_id,
          'filename', image_favorites.filename,
          'original_filename', image_favorites.original_filename,
          'count', image_favorites.count
        ) ORDER BY image_favorites.count DESC
      )
      FROM (
        SELECT 
          i.id as image_id,
          i.filename,
          i.original_filename,
          COUNT(f2.id) as count
        FROM public.images i
        LEFT JOIN public.favorites f2 ON i.id = f2.image_id
        WHERE i.gallery_id = gallery_uuid
        GROUP BY i.id, i.filename, i.original_filename
        HAVING COUNT(f2.id) > 0
        ORDER BY COUNT(f2.id) DESC
        LIMIT 10
      ) as image_favorites),
      '[]'::jsonb
    ) as most_favorited_images,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'user_id', recent.user_id,
          'user_email', recent.user_email,
          'image_id', recent.image_id,
          'filename', recent.filename,
          'original_filename', recent.original_filename,
          'favorited_at', recent.favorited_at
        ) ORDER BY recent.favorited_at DESC
      )
      FROM (
        SELECT 
          f3.user_id,
          p.email as user_email,
          f3.image_id,
          i.filename,
          i.original_filename,
          f3.created_at as favorited_at
        FROM public.favorites f3
        JOIN public.images i ON f3.image_id = i.id
        LEFT JOIN public.profiles p ON f3.user_id = p.user_id
        WHERE f3.gallery_id = gallery_uuid
        ORDER BY f3.created_at DESC
        LIMIT 20
      ) as recent),
      '[]'::jsonb
    ) as recent_favorites
  FROM public.favorites f
  WHERE f.gallery_id = gallery_uuid;
END;
$function$;