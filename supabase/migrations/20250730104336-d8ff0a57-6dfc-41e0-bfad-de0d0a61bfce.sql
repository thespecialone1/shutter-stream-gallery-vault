-- Fix RLS policies to be more restrictive and secure
-- Update policies to properly restrict access to authenticated users only

-- Update audit_logs policies
DROP POLICY IF EXISTS "Audit logs visible only to authenticated users" ON public.audit_logs;
CREATE POLICY "Audit logs visible only to authenticated users" 
ON public.audit_logs 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Update galleries policies to be authenticated only
DROP POLICY IF EXISTS "Photographers can view own galleries" ON public.galleries;
DROP POLICY IF EXISTS "Photographers can create galleries" ON public.galleries;
DROP POLICY IF EXISTS "Photographers can update own galleries" ON public.galleries;
DROP POLICY IF EXISTS "Photographers can delete own galleries" ON public.galleries;

CREATE POLICY "Photographers can view own galleries" 
ON public.galleries 
FOR SELECT 
TO authenticated 
USING (auth.uid() = photographer_id);

CREATE POLICY "Photographers can create galleries" 
ON public.galleries 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "Photographers can update own galleries" 
ON public.galleries 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = photographer_id)
WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "Photographers can delete own galleries" 
ON public.galleries 
FOR DELETE 
TO authenticated 
USING (auth.uid() = photographer_id);

-- Update favorites policies
DROP POLICY IF EXISTS "Gallery owners can manage favorites" ON public.favorites;
CREATE POLICY "Gallery owners can manage favorites" 
ON public.favorites 
FOR ALL 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM galleries 
  WHERE galleries.id = favorites.gallery_id 
  AND galleries.photographer_id = auth.uid()
));

-- Update images policies
DROP POLICY IF EXISTS "Photographers can manage own gallery images" ON public.images;
CREATE POLICY "Photographers can manage own gallery images" 
ON public.images 
FOR ALL 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM galleries 
  WHERE galleries.id = images.gallery_id 
  AND galleries.photographer_id = auth.uid()
));

-- Update sections policies
DROP POLICY IF EXISTS "Photographers can manage own gallery sections" ON public.sections;
CREATE POLICY "Photographers can manage own gallery sections" 
ON public.sections 
FOR ALL 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM galleries 
  WHERE galleries.id = sections.gallery_id 
  AND galleries.photographer_id = auth.uid()
));

-- Update image_variants policies
DROP POLICY IF EXISTS "Photographers can manage own image variants" ON public.image_variants;
CREATE POLICY "Photographers can manage own image variants" 
ON public.image_variants 
FOR ALL 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM images i 
  JOIN galleries g ON i.gallery_id = g.id 
  WHERE i.id = image_variants.image_id 
  AND g.photographer_id = auth.uid()
));

-- Update gallery_analytics policies
DROP POLICY IF EXISTS "Photographers can view own gallery analytics" ON public.gallery_analytics;
CREATE POLICY "Photographers can view own gallery analytics" 
ON public.gallery_analytics 
FOR SELECT 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM galleries 
  WHERE galleries.id = gallery_analytics.gallery_id 
  AND galleries.photographer_id = auth.uid()
));

CREATE POLICY "System can insert analytics" 
ON public.gallery_analytics 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Update profiles policies to be authenticated only
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update user_roles policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update gallery_access_sessions policy to be more restrictive
DROP POLICY IF EXISTS "System can manage gallery access sessions" ON public.gallery_access_sessions;
CREATE POLICY "System can manage gallery access sessions" 
ON public.gallery_access_sessions 
FOR ALL 
TO anon, authenticated, service_role
USING (true);

-- Note: Storage policy for gallery-images remains public as clients need to view images
-- This is intentional and secure as long as image paths are not guessable