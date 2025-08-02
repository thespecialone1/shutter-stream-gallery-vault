-- Drop the problematic policy that causes infinite recursion
DROP POLICY "Allow gallery metadata access for password authentication" ON public.galleries;

-- Create a simpler policy that allows basic access without recursion
-- This allows viewing gallery info so password forms can be shown
CREATE POLICY "Allow basic gallery access for authentication" 
ON public.galleries 
FOR SELECT 
USING (
  -- Allow if it's a public gallery
  is_public = true 
  OR 
  -- Allow if user owns the gallery
  (auth.uid() IS NOT NULL AND auth.uid() = photographer_id)
  OR
  -- Allow basic read access for private galleries (so password form can show)
  (is_public = false)
);