-- Fix infinite recursion in galleries RLS policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Public can view limited public gallery data" ON public.galleries;
DROP POLICY IF EXISTS "Public can view public galleries" ON public.galleries;
DROP POLICY IF EXISTS "Gallery owners can view their galleries" ON public.galleries;
DROP POLICY IF EXISTS "Gallery owners can create galleries" ON public.galleries;
DROP POLICY IF EXISTS "Gallery owners can update their galleries" ON public.galleries;
DROP POLICY IF EXISTS "Gallery owners can delete their galleries" ON public.galleries;

-- Create security definer function to check gallery ownership
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

-- Fix any other tables that might have similar issues with images
DROP POLICY IF EXISTS "Public can view limited image data from public galleries" ON public.images;

CREATE POLICY "Public can view public gallery images" 
ON public.images 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.galleries g 
  WHERE g.id = images.gallery_id AND g.is_public = true
));