-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_user_favorites(uuid);

-- Create get_user_favorites RPC function for favorites retrieval
CREATE OR REPLACE FUNCTION public.get_user_favorites(user_uuid uuid)
RETURNS TABLE (
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  INNER JOIN public.images i ON f.image_id = i.id
  INNER JOIN public.galleries g ON f.gallery_id = g.id
  WHERE f.user_id = user_uuid
  ORDER BY f.created_at DESC;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_favorites(uuid) TO authenticated;

-- Create image quality variants table for progressive loading
CREATE TABLE IF NOT EXISTS public.image_quality_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id uuid NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
  quality_level text NOT NULL CHECK (quality_level IN ('thumbnail', 'social', 'web', 'original')),
  file_path text NOT NULL,
  file_size integer NOT NULL,
  width integer,
  height integer,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(image_id, quality_level)
);

-- Enable RLS
ALTER TABLE public.image_quality_variants ENABLE ROW LEVEL SECURITY;

-- RLS policies for image variants
CREATE POLICY "Gallery owners can manage variants"
ON public.image_quality_variants
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.images i
    INNER JOIN public.galleries g ON i.gallery_id = g.id
    WHERE i.id = image_quality_variants.image_id 
    AND g.photographer_id = auth.uid()
  )
);

CREATE POLICY "Public can view public gallery variants"
ON public.image_quality_variants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.images i
    INNER JOIN public.galleries g ON i.gallery_id = g.id
    WHERE i.id = image_quality_variants.image_id 
    AND g.is_public = true
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_image_quality_variants_image_id ON public.image_quality_variants(image_id);
CREATE INDEX IF NOT EXISTS idx_image_quality_variants_quality_level ON public.image_quality_variants(quality_level);

COMMENT ON TABLE public.image_quality_variants IS 'Stores different quality versions of images for progressive loading and optimized downloads';