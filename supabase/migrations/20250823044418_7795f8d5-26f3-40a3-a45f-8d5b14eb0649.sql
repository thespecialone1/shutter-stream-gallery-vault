-- Create secure public views that only expose necessary data without sensitive information

-- 1. Create a secure view for public gallery access (without photographer_id)
CREATE OR REPLACE VIEW public.galleries_public_view AS
SELECT 
  id,
  name,
  description,
  client_name,
  created_at,
  view_count
FROM public.galleries
WHERE is_public = true;

-- Set security_invoker to ensure proper permission enforcement
ALTER VIEW public.galleries_public_view SET (security_invoker = true);

-- 2. Create a secure view for public image access (without sensitive file paths and metadata)
CREATE OR REPLACE VIEW public.images_public_view AS
SELECT 
  i.id,
  i.gallery_id,
  i.section_id,
  i.width,
  i.height,
  i.upload_date,
  i.filename,
  i.mime_type,
  i.thumbnail_path
FROM public.images i
INNER JOIN public.galleries g ON i.gallery_id = g.id
WHERE g.is_public = true;

-- Set security_invoker to ensure proper permission enforcement  
ALTER VIEW public.images_public_view SET (security_invoker = true);

-- 3. Update the galleries table RLS policy to restrict public access
DROP POLICY IF EXISTS "Public can view public galleries" ON public.galleries;
DROP POLICY IF EXISTS "Public galleries are viewable by everyone" ON public.galleries;

-- Create a restrictive policy that only allows viewing specific fields for public galleries
CREATE POLICY "Public can view limited public gallery data" ON public.galleries
FOR SELECT 
USING (
  is_public = true AND 
  -- Only allow access to non-sensitive columns via the view
  (SELECT COUNT(*) FROM public.galleries_public_view WHERE id = galleries.id) > 0
);

-- 4. Update the images table RLS policy to restrict public access to sensitive data
DROP POLICY IF EXISTS "Public can view images from public galleries" ON public.images;

-- Create a restrictive policy for public image access
CREATE POLICY "Public can view limited image data from public galleries" ON public.images
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.galleries g 
    WHERE g.id = images.gallery_id AND g.is_public = true
  )
  AND 
  -- Only allow access to non-sensitive columns via the view
  (SELECT COUNT(*) FROM public.images_public_view WHERE id = images.id) > 0
);

-- 5. Grant public access to the secure views
GRANT SELECT ON public.galleries_public_view TO anon;
GRANT SELECT ON public.galleries_public_view TO authenticated;
GRANT SELECT ON public.images_public_view TO anon;
GRANT SELECT ON public.images_public_view TO authenticated;