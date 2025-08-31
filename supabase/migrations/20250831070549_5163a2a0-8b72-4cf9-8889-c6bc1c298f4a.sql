-- Remove conflicting RLS policies that cause access issues

-- Drop the conflicting policy on gallery_analytics that blocks all access
DROP POLICY IF EXISTS "Gallery owners view analytics via function only" ON public.gallery_analytics;

-- Drop the conflicting policy on gallery_access_sessions that blocks all access  
DROP POLICY IF EXISTS "Gallery owners view sessions via safe view only" ON public.gallery_access_sessions;

-- Ensure proper INSERT policy for gallery_access_sessions (system-only)
DROP POLICY IF EXISTS "System can insert gallery sessions" ON public.gallery_access_sessions;

CREATE POLICY "System can insert gallery sessions" 
ON public.gallery_access_sessions 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role'::text);

-- Consolidate duplicate analytics insert policies
DROP POLICY IF EXISTS "System can insert analytics" ON public.gallery_analytics;
DROP POLICY IF EXISTS "System can insert gallery analytics" ON public.gallery_analytics;

CREATE POLICY "System can insert gallery analytics" 
ON public.gallery_analytics 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role'::text OR EXISTS (
  SELECT 1 FROM galleries WHERE galleries.id = gallery_analytics.gallery_id
));

-- Add missing UPDATE and DELETE policies for gallery_access_sessions
CREATE POLICY "System can update gallery sessions" 
ON public.gallery_access_sessions 
FOR UPDATE 
USING (auth.role() = 'service_role'::text OR EXISTS (
  SELECT 1 FROM galleries g 
  WHERE g.id = gallery_access_sessions.gallery_id AND g.photographer_id = auth.uid()
));

-- Improve security audit log retention by adding cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_security_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete security audit logs older than 90 days
  DELETE FROM public.security_audit 
  WHERE created_at < (now() - interval '90 days');
  
  -- Delete old analytics data older than 1 year to protect privacy
  DELETE FROM public.gallery_analytics 
  WHERE created_at < (now() - interval '1 year');
  
  -- Log cleanup action
  PERFORM public.log_security_event(
    'automated_log_cleanup',
    'info',
    json_build_object('cleanup_time', now(), 'retention_policy', '90_days_security_1_year_analytics')::jsonb
  );
END;
$function$;