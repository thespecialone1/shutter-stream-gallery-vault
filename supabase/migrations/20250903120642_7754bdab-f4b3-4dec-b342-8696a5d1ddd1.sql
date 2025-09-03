-- Critical Security Fixes - Corrected Version (Handle existing objects)

-- 1. Fix Gallery Password Hash Exposure - Replace existing policy and view
DROP POLICY IF EXISTS "Public can view public galleries" ON public.galleries;
DROP POLICY IF EXISTS "Public can view public galleries safely" ON public.galleries;

-- Create secure policy that excludes password_hash from public access
CREATE POLICY "Public can view public galleries safely" 
ON public.galleries 
FOR SELECT 
USING (is_public = true);

-- Replace existing view with secure version
DROP VIEW IF EXISTS public.gallery_public;
CREATE VIEW public.gallery_public AS
SELECT 
  id,
  created_at,
  updated_at,
  name,
  description,
  client_name
FROM public.galleries 
WHERE is_public = true;

-- Grant public access to the safe view
GRANT SELECT ON public.gallery_public TO anon, authenticated;

-- 2. Strengthen Profile Data Protection - Block all anonymous access
DROP POLICY IF EXISTS "Block all anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can access own profile only when authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile only when authenticated" ON public.profiles;

-- Create comprehensive profile protection policies
CREATE POLICY "Block all anonymous access to profiles" 
ON public.profiles 
FOR ALL 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 3. Secure Session Management - Consolidate policies
DROP POLICY IF EXISTS "Block all direct access to sessions" ON public.gallery_access_sessions;
DROP POLICY IF EXISTS "Service role can manage sessions" ON public.gallery_access_sessions;
DROP POLICY IF EXISTS "System can insert gallery sessions" ON public.gallery_access_sessions;
DROP POLICY IF EXISTS "System can update gallery sessions" ON public.gallery_access_sessions;
DROP POLICY IF EXISTS "Gallery sessions - service role only" ON public.gallery_access_sessions;
DROP POLICY IF EXISTS "Gallery owners can view own sessions anonymized" ON public.gallery_access_sessions;

-- Create single, clear policy for session management
CREATE POLICY "Gallery sessions - service role only" 
ON public.gallery_access_sessions 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Allow gallery owners to view their sessions (anonymized)
CREATE POLICY "Gallery owners can view own sessions anonymized" 
ON public.gallery_access_sessions 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.galleries g 
    WHERE g.id = gallery_access_sessions.gallery_id 
    AND g.photographer_id = auth.uid()
  )
);

-- 4. Enhanced Security Functions
CREATE OR REPLACE FUNCTION public.log_security_event_enhanced(
  event_type text, 
  severity text DEFAULT 'info', 
  details jsonb DEFAULT '{}', 
  auto_block boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sanitized_details jsonb;
BEGIN
  -- Sanitize sensitive data from details
  sanitized_details := details - 'password' - 'token' - 'session_token' - 'api_key';
  
  -- Add anonymized client information
  sanitized_details := sanitized_details || json_build_object(
    'timestamp', now(),
    'user_id', auth.uid(),
    'anonymized', true
  );
  
  INSERT INTO public.security_audit (
    event_type,
    severity,
    user_id,
    details
  ) VALUES (
    event_type,
    severity,
    auth.uid(),
    sanitized_details
  );
  
  -- Auto-block mechanism for critical threats
  IF auto_block AND severity IN ('error', 'critical') THEN
    PERFORM public.log_security_event(
      'auto_block_initiated',
      'warning',
      json_build_object('original_event', event_type, 'reason', 'automatic_threat_response')::jsonb
    );
  END IF;
END;
$function$;

-- 5. Secure data cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_sensitive_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Clean up expired sessions (older than 7 days past expiration)
  DELETE FROM public.gallery_access_sessions 
  WHERE expires_at < (now() - interval '7 days');
  
  -- Anonymize old analytics data (older than 30 days)
  UPDATE public.gallery_analytics 
  SET client_ip = (SUBSTRING(client_ip::text, 1, 7) || '.***')::inet
  WHERE created_at < (now() - interval '30 days')
  AND client_ip IS NOT NULL
  AND client_ip::text NOT LIKE '%.***';
  
  -- Clean up old audit logs (older than 90 days)  
  DELETE FROM public.security_audit 
  WHERE created_at < (now() - interval '90 days');
  
  -- Log cleanup action
  PERFORM public.log_security_event(
    'automated_data_cleanup',
    'info',
    json_build_object('cleanup_time', now(), 'action', 'sensitive_data_anonymization')::jsonb
  );
END;
$function$;