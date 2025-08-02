-- Add policy to allow anonymous users to view gallery metadata for password authentication
-- This allows the gallery page to load and show the password form for private galleries
CREATE POLICY "Anonymous users can view gallery metadata for authentication" 
ON public.galleries 
FOR SELECT 
USING (true);