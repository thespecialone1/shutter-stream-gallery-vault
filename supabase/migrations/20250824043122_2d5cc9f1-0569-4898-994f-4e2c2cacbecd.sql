-- Clean up database for fresh start and fix infinite recursion error

-- 1. First, fix the infinite recursion in galleries policies by dropping problematic policies
DROP POLICY IF EXISTS "Public can view limited public gallery data" ON public.galleries;
DROP POLICY IF EXISTS "Public can view limited image data from public galleries" ON public.images;

-- 2. Clean up all existing data for fresh start
DELETE FROM public.anonymous_favorites;
DELETE FROM public.favorites;
DELETE FROM public.gallery_analytics;
DELETE FROM public.gallery_access_sessions;
DELETE FROM public.gallery_invites;
DELETE FROM public.image_variants;
DELETE FROM public.images;
DELETE FROM public.sections;
DELETE FROM public.galleries;
DELETE FROM public.profiles;
DELETE FROM public.user_roles;
DELETE FROM public.security_audit;
DELETE FROM public.audit_logs;
DELETE FROM public.auth_rate_limits;

-- 3. Reset auto-increment sequences (if any)
-- Note: UUID primary keys don't need sequence resets

-- 4. Create clean, simple RLS policies for galleries without recursion
CREATE POLICY "Authenticated users can view their own galleries" ON public.galleries
FOR SELECT 
TO authenticated
USING (auth.uid() = photographer_id);

CREATE POLICY "Authenticated users can create galleries" ON public.galleries
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "Authenticated users can update their own galleries" ON public.galleries
FOR UPDATE 
TO authenticated
USING (auth.uid() = photographer_id)
WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "Authenticated users can delete their own galleries" ON public.galleries
FOR DELETE 
TO authenticated
USING (auth.uid() = photographer_id);

-- 5. Simple public access for galleries (no circular references)
CREATE POLICY "Public can view public galleries basic info" ON public.galleries
FOR SELECT 
TO anon, authenticated
USING (is_public = true);

-- 6. Create clean image policies
CREATE POLICY "Gallery owners can manage their images" ON public.images
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.galleries g 
    WHERE g.id = images.gallery_id 
    AND g.photographer_id = auth.uid()
  )
);

CREATE POLICY "Public can view images from public galleries" ON public.images
FOR SELECT 
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.galleries g 
    WHERE g.id = images.gallery_id 
    AND g.is_public = true
  )
);

-- 7. Create clean section policies
CREATE POLICY "Gallery owners can manage their sections" ON public.sections
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.galleries g 
    WHERE g.id = sections.gallery_id 
    AND g.photographer_id = auth.uid()
  )
);

CREATE POLICY "Public can view sections from public galleries" ON public.sections
FOR SELECT 
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.galleries g 
    WHERE g.id = sections.gallery_id 
    AND g.is_public = true
  )
);

-- 8. Log the database cleanup
INSERT INTO public.security_audit (event_type, severity, details)
VALUES (
  'database_cleanup',
  'info',
  '{"action": "fresh_start", "description": "Cleaned all data and fixed infinite recursion in RLS policies"}'
);