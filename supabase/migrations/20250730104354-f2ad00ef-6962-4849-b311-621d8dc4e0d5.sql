-- Fix the duplicate policy error by dropping it first
DROP POLICY IF EXISTS "System can insert analytics" ON public.gallery_analytics;

-- Now create the policy properly
CREATE POLICY "System can insert analytics" 
ON public.gallery_analytics 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);