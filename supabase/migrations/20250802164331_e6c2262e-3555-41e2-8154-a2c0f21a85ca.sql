-- Remove the overly permissive policy
DROP POLICY "Anonymous users can view gallery metadata for authentication" ON public.galleries;

-- Add a more specific policy that allows viewing gallery metadata only for direct access
-- This allows the gallery page to load for password authentication but doesn't expose all galleries in browse
CREATE POLICY "Allow gallery metadata access for password authentication" 
ON public.galleries 
FOR SELECT 
USING (
  -- Allow if it's a public gallery
  is_public = true 
  OR 
  -- Allow if user owns the gallery
  (auth.uid() IS NOT NULL AND auth.uid() = photographer_id)
  OR
  -- Allow if there's a valid session for this specific gallery
  EXISTS (
    SELECT 1 FROM public.gallery_access_sessions gas
    WHERE gas.gallery_id = galleries.id 
    AND gas.expires_at > now()
  )
);