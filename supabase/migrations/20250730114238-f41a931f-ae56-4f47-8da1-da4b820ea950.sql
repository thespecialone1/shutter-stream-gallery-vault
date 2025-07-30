-- Fix RLS policies to prevent anonymous access warnings
-- Remove the broad "authenticated" role policies and replace with more specific ones

-- Fix audit_logs policies
DROP POLICY IF EXISTS "Audit logs visible only to authenticated users" ON public.audit_logs;

-- Fix gallery_access_sessions - make it more explicit about system access
DROP POLICY IF EXISTS "System can manage gallery access sessions" ON public.gallery_access_sessions;

CREATE POLICY "Authenticated system can manage gallery access sessions" 
ON public.gallery_access_sessions 
FOR ALL 
USING (auth.role() = 'service_role' OR auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- Update profiles policies to be more explicit
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Authenticated users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Update user_roles policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Authenticated users can view own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Update galleries policies to be more explicit
DROP POLICY IF EXISTS "Photographers can view own galleries" ON public.galleries;
DROP POLICY IF EXISTS "Photographers can create galleries" ON public.galleries;
DROP POLICY IF EXISTS "Photographers can update own galleries" ON public.galleries;
DROP POLICY IF EXISTS "Photographers can delete own galleries" ON public.galleries;

CREATE POLICY "Authenticated photographers can view own galleries" 
ON public.galleries 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = photographer_id);

CREATE POLICY "Authenticated photographers can create galleries" 
ON public.galleries 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = photographer_id);

CREATE POLICY "Authenticated photographers can update own galleries" 
ON public.galleries 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = photographer_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = photographer_id);

CREATE POLICY "Authenticated photographers can delete own galleries" 
ON public.galleries 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND auth.uid() = photographer_id);

-- Update favorites policies
DROP POLICY IF EXISTS "Gallery owners can manage favorites" ON public.favorites;

CREATE POLICY "Authenticated gallery owners can manage favorites" 
ON public.favorites 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1
    FROM galleries
    WHERE galleries.id = favorites.gallery_id 
    AND galleries.photographer_id = auth.uid()
  )
);

-- Update images policies
DROP POLICY IF EXISTS "Photographers can manage own gallery images" ON public.images;

CREATE POLICY "Authenticated photographers can manage own gallery images" 
ON public.images 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1
    FROM galleries
    WHERE galleries.id = images.gallery_id 
    AND galleries.photographer_id = auth.uid()
  )
);

-- Update image_variants policies
DROP POLICY IF EXISTS "Photographers can manage own image variants" ON public.image_variants;

CREATE POLICY "Authenticated photographers can manage own image variants" 
ON public.image_variants 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1
    FROM (images i JOIN galleries g ON ((i.gallery_id = g.id)))
    WHERE i.id = image_variants.image_id 
    AND g.photographer_id = auth.uid()
  )
);

-- Update sections policies
DROP POLICY IF EXISTS "Photographers can manage own gallery sections" ON public.sections;

CREATE POLICY "Authenticated photographers can manage own gallery sections" 
ON public.sections 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1
    FROM galleries
    WHERE galleries.id = sections.gallery_id 
    AND galleries.photographer_id = auth.uid()
  )
);

-- Update gallery_analytics policies
DROP POLICY IF EXISTS "Photographers can view own gallery analytics" ON public.gallery_analytics;

CREATE POLICY "Authenticated photographers can view own gallery analytics" 
ON public.gallery_analytics 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1
    FROM galleries
    WHERE galleries.id = gallery_analytics.gallery_id 
    AND galleries.photographer_id = auth.uid()
  )
);

-- Update security_audit policies to be more explicit
DROP POLICY IF EXISTS "Admins can view security audit" ON public.security_audit;

CREATE POLICY "Authenticated admins can view security audit" 
ON public.security_audit 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- The storage.objects policy for "Public can view gallery images" is intentionally public
-- as galleries need to be viewable by clients without accounts
-- This policy should remain as-is for the app to function properly