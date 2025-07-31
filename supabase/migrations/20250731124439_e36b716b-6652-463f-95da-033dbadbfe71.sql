-- Add is_public column to galleries table
ALTER TABLE public.galleries 
ADD COLUMN is_public boolean NOT NULL DEFAULT false;

-- Add view_count column to track gallery popularity
ALTER TABLE public.galleries 
ADD COLUMN view_count integer NOT NULL DEFAULT 0;

-- Create index for better performance on public galleries
CREATE INDEX idx_galleries_public ON public.galleries(is_public, view_count DESC);

-- Update RLS policies to allow public access to public galleries
CREATE POLICY "Public can view public galleries" 
ON public.galleries 
FOR SELECT 
USING (is_public = true);

-- Update images RLS policy to allow viewing images from public galleries
CREATE POLICY "Public can view images from public galleries" 
ON public.images 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.galleries 
  WHERE galleries.id = images.gallery_id 
  AND galleries.is_public = true
));

-- Create function to increment gallery view count
CREATE OR REPLACE FUNCTION public.increment_gallery_views(gallery_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.galleries 
  SET view_count = view_count + 1 
  WHERE id = gallery_id;
END;
$function$;