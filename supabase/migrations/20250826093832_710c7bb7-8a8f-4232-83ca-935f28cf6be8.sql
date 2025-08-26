-- Fix infinite recursion in galleries RLS policies - Part 2

-- Drop existing problematic policies on galleries table
DROP POLICY IF EXISTS "Public can view limited public gallery data" ON public.galleries;
DROP POLICY IF EXISTS "Public can view public galleries" ON public.galleries;
DROP POLICY IF EXISTS "Gallery owners can view their galleries" ON public.galleries;
DROP POLICY IF EXISTS "Gallery owners can create galleries" ON public.galleries;
DROP POLICY IF EXISTS "Gallery owners can update their galleries" ON public.galleries;
DROP POLICY IF EXISTS "Gallery owners can delete their galleries" ON public.galleries;

-- Drop existing problematic policies on images table
DROP POLICY IF EXISTS "Public can view limited image data from public galleries" ON public.images;
DROP POLICY IF EXISTS "Public can view public gallery images" ON public.images;

-- Create security definer function to check gallery ownership (if not exists)
CREATE OR REPLACE FUNCTION public.is_gallery_owner(gallery_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.galleries g
    WHERE g.id = gallery_id AND g.photographer_id = user_id
  );
$$;

-- Create new safe RLS policies for galleries
CREATE POLICY "Gallery owners can view their galleries" 
ON public.galleries 
FOR SELECT 
USING (photographer_id = auth.uid());

CREATE POLICY "Gallery owners can create galleries" 
ON public.galleries 
FOR INSERT 
WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "Gallery owners can update their galleries" 
ON public.galleries 
FOR UPDATE 
USING (photographer_id = auth.uid())
WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "Gallery owners can delete their galleries" 
ON public.galleries 
FOR DELETE 
USING (photographer_id = auth.uid());

CREATE POLICY "Public can view public galleries" 
ON public.galleries 
FOR SELECT 
USING (is_public = true);

-- Create new safe RLS policy for images
CREATE POLICY "Public can view public gallery images" 
ON public.images 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.galleries g 
  WHERE g.id = images.gallery_id AND g.is_public = true
));