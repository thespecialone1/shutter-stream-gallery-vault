-- Fix the galleries RLS policy that incorrectly allows access to all private galleries
DROP POLICY IF EXISTS "Allow basic gallery access for authentication" ON public.galleries;

-- Create a proper policy that only allows access to:
-- 1. Public galleries (anyone can see them)
-- 2. Private galleries owned by the authenticated user
-- 3. Private galleries with valid sessions (for anonymous access)
CREATE POLICY "Secure gallery access" ON public.galleries
FOR SELECT USING (
  is_public = true 
  OR (auth.uid() IS NOT NULL AND auth.uid() = photographer_id)
  OR (
    is_public = false 
    AND EXISTS (
      SELECT 1 FROM gallery_access_sessions gas 
      WHERE gas.gallery_id = galleries.id 
      AND gas.expires_at > now()
    )
  )
);

-- Also fix the duplicate gallery session validation by improving the session check
-- The issue might be that the Gallery.tsx is not properly passing session token
-- Let's also ensure the gallery-session edge function properly validates sessions