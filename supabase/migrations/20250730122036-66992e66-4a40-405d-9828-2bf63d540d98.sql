-- Critical Security Fixes for RLS Policies (Fixed Syntax)

-- 1. Fix gallery_access_sessions - currently allows ANY authenticated user to access ALL sessions
DROP POLICY IF EXISTS "Authenticated system can manage gallery access sessions" ON public.gallery_access_sessions;

-- Create proper policies for gallery_access_sessions
CREATE POLICY "Gallery owners can view their gallery sessions"
ON public.gallery_access_sessions
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.galleries 
    WHERE galleries.id = gallery_access_sessions.gallery_id 
    AND galleries.photographer_id = auth.uid()
  )
);

CREATE POLICY "System can create gallery sessions"
ON public.gallery_access_sessions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Gallery owners can update their gallery sessions"
ON public.gallery_access_sessions
FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.galleries 
    WHERE galleries.id = gallery_access_sessions.gallery_id 
    AND galleries.photographer_id = auth.uid()
  )
);

CREATE POLICY "Gallery owners can delete their gallery sessions"
ON public.gallery_access_sessions
FOR DELETE
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.galleries 
    WHERE galleries.id = gallery_access_sessions.gallery_id 
    AND galleries.photographer_id = auth.uid()
  )
);

-- 2. Fix gallery_analytics INSERT policy - currently allows anyone to insert anything
DROP POLICY IF EXISTS "System can insert analytics" ON public.gallery_analytics;

CREATE POLICY "System can insert gallery analytics"
ON public.gallery_analytics
FOR INSERT
WITH CHECK (
  -- Only allow insertions for galleries that exist
  EXISTS (SELECT 1 FROM public.galleries WHERE galleries.id = gallery_analytics.gallery_id)
);

-- 3. Add missing security policies for images table to prevent unauthorized access
DROP POLICY IF EXISTS "Public can view gallery images with valid session" ON public.images;

CREATE POLICY "Public can view gallery images with valid session"
ON public.images
FOR SELECT
USING (
  -- Allow public access if there's a valid session for this gallery
  EXISTS (
    SELECT 1 FROM public.gallery_access_sessions gas
    WHERE gas.gallery_id = images.gallery_id
    AND gas.expires_at > now()
  )
);

-- 4. Create security audit function to log policy violations
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  severity text DEFAULT 'warning',
  details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit (
    event_type,
    severity,
    user_id,
    details,
    client_ip,
    user_agent
  ) VALUES (
    event_type,
    severity,
    auth.uid(),
    details,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Fail silently to prevent blocking operations
    NULL;
END;
$$;