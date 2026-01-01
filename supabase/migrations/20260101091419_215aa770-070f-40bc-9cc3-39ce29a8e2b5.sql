-- Allow anonymous users to view public galleries (for homepage showcase)
CREATE POLICY "Anonymous can view public galleries"
ON public.galleries
FOR SELECT
USING (is_public = true);

-- Allow anonymous users to view images from public galleries
CREATE POLICY "Anonymous can view public gallery images"
ON public.images
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM galleries g 
    WHERE g.id = images.gallery_id AND g.is_public = true
  )
);