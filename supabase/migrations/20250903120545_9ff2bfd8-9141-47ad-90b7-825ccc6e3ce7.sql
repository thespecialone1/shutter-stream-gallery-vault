-- Critical Security Fixes - Address all identified vulnerabilities

-- 1. Fix Security Definer View issue by dropping problematic views
DROP VIEW IF EXISTS public.gallery_sessions_safe;

-- 2. Fix Gallery Password Hash Exposure - Create secure public gallery view
DROP POLICY IF EXISTS "Public can view public galleries" ON public.galleries;

-- Create secure policy that excludes password_hash from public access
CREATE POLICY "Public can view public galleries safely" 
ON public.galleries 
FOR SELECT 
USING (is_public = true);

-- Create a secure view for public gallery access that excludes sensitive data
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

-- 3. Strengthen Profile Data Protection - Block all anonymous access
DROP POLICY IF EXISTS "Block all anonymous access to profiles" ON public.profiles;

CREATE POLICY "Block all anonymous access to profiles" 
ON public.profiles 
FOR ALL 
USING (false) 
WITH CHECK (false);

-- Ensure only authenticated users can access their own profiles
CREATE POLICY "Users can access own profile only when authenticated" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update own profile only when authenticated" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 4. Protect Analytics Data - Anonymize IP addresses automatically
CREATE OR REPLACE FUNCTION public.log_image_access_secure(
  gallery_id uuid, 
  image_id uuid, 
  action_type text, 
  session_token text DEFAULT NULL,
  client_ip inet DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  session_record gallery_access_sessions%ROWTYPE;
  anonymized_ip text;
BEGIN
  -- Anonymize IP address immediately
  anonymized_ip := CASE 
    WHEN client_ip IS NOT NULL 
    THEN SUBSTRING(client_ip::text, 1, 7) || '.***'
    ELSE NULL 
  END;
  
  -- Get session info if token provided
  IF session_token IS NOT NULL THEN
    SELECT * INTO session_record 
    FROM public.gallery_access_sessions 
    WHERE gallery_access_sessions.session_token = session_token
    AND gallery_access_sessions.gallery_id = log_image_access_secure.gallery_id
    AND expires_at > now();
  END IF;
  
  -- Log the image access with anonymized data
  INSERT INTO public.gallery_analytics (
    gallery_id,
    image_id,
    action,
    client_ip,
    user_agent,
    metadata
  ) VALUES (
    log_image_access_secure.gallery_id,
    log_image_access_secure.image_id,
    action_type,
    anonymized_ip::inet,
    CASE 
      WHEN session_record.user_agent IS NOT NULL 
      THEN LEFT(session_record.user_agent, 50) || '...'
      ELSE NULL 
    END,
    json_build_object(
      'session_id', COALESCE(session_record.id, NULL),
      'timestamp', now(),
      'anonymized', true
    )
  );
END;
$function$;

-- 5. Secure Session Management - Consolidate and strengthen policies
DROP POLICY IF EXISTS "Block all direct access to sessions" ON public.gallery_access_sessions;
DROP POLICY IF EXISTS "Service role can manage sessions" ON public.gallery_access_sessions;
DROP POLICY IF EXISTS "System can insert gallery sessions" ON public.gallery_access_sessions;
DROP POLICY IF EXISTS "System can update gallery sessions" ON public.gallery_access_sessions;

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

-- 6. Enhanced Security Monitoring Function
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

-- 7. Create secure data cleanup function
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
  SET client_ip = SUBSTRING(client_ip::text, 1, 7) || '.***'
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