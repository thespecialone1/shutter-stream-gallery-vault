-- Drop the problematic policy that's causing infinite recursion
DROP POLICY IF EXISTS "Secure gallery access" ON public.galleries;

-- Create a simple, non-recursive policy for galleries
-- Public galleries: anyone can see them
CREATE POLICY "Public galleries are viewable by everyone" ON public.galleries
FOR SELECT USING (is_public = true);

-- Private galleries: only owners can see them when authenticated
CREATE POLICY "Gallery owners can view their own galleries" ON public.galleries
FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = photographer_id);

-- Note: Anonymous access to private galleries will be handled by the edge function
-- We can't create a non-recursive policy for session-based access in RLS