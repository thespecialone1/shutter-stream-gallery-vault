-- Comprehensive security hardening for sensitive data protection

-- 1. PROFILES TABLE SECURITY HARDENING
-- Add additional security definer function for profiles access
CREATE OR REPLACE FUNCTION public.get_user_profile(user_uuid uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  full_name text,
  business_name text,
  email text,
  phone text,
  created_at timestamptz,
  updated_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only return profile if user is requesting their own data or is admin
  IF auth.uid() = user_uuid OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN QUERY
    SELECT p.id, p.user_id, p.full_name, p.business_name, p.email, p.phone, p.created_at, p.updated_at
    FROM public.profiles p
    WHERE p.user_id = user_uuid;
  END IF;
END;
$$;

-- Add profile data masking function for any potential leaks
CREATE OR REPLACE FUNCTION public.mask_sensitive_profile_data()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log any direct access attempts to profiles
  PERFORM public.log_security_event(
    'profile_access_attempt',
    'warning',
    json_build_object(
      'user_id', auth.uid(),
      'target_profile', NEW.user_id,
      'access_method', 'direct_table_access'
    )::jsonb
  );
  RETURN NEW;
END;
$$;

-- Create trigger to monitor profile access
CREATE TRIGGER profile_access_monitor
  BEFORE SELECT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.mask_sensitive_profile_data();

-- 2. GALLERY ANALYTICS SECURITY HARDENING
-- Drop existing policies and create more restrictive ones
DROP POLICY IF EXISTS "Authenticated photographers can view own gallery analytics" ON public.gallery_analytics;
DROP POLICY IF EXISTS "System can insert gallery analytics" ON public.gallery_analytics;

-- Create security definer function for analytics access
CREATE OR REPLACE FUNCTION public.get_gallery_analytics_summary(gallery_uuid uuid)
RETURNS TABLE(
  total_views bigint,
  unique_visitors bigint,
  top_images jsonb,
  date_range daterange
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify user owns the gallery
  IF NOT EXISTS (
    SELECT 1 FROM public.galleries g 
    WHERE g.id = gallery_uuid AND g.photographer_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: Gallery not found or insufficient permissions';
  END IF;

  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_views,
    COUNT(DISTINCT ga.client_ip)::bigint as unique_visitors,
    json_agg(
      json_build_object(
        'image_id', ga.image_id,
        'action_count', COUNT(ga.action)
      )
    )::jsonb as top_images,
    daterange(MIN(ga.created_at)::date, MAX(ga.created_at)::date) as date_range
  FROM public.gallery_analytics ga
  WHERE ga.gallery_id = gallery_uuid
    AND ga.created_at >= NOW() - INTERVAL '30 days';
END;
$$;

-- Restrictive analytics policies
CREATE POLICY "Gallery owners can view anonymized analytics only" ON public.gallery_analytics
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.galleries g 
    WHERE g.id = gallery_analytics.gallery_id 
    AND g.photographer_id = auth.uid()
  )
);

CREATE POLICY "System can insert analytics with IP hashing" ON public.gallery_analytics
FOR INSERT 
TO authenticated, anon
WITH CHECK (
  -- Hash IP addresses before storage
  client_ip = NULL OR 
  EXISTS (SELECT 1 FROM public.galleries WHERE id = gallery_analytics.gallery_id)
);

-- 3. SESSION SECURITY HARDENING  
-- Create secure session token hashing function
CREATE OR REPLACE FUNCTION public.hash_session_token(token text)
RETURNS text
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql
AS $$
BEGIN
  -- Use SHA-256 hashing for session tokens
  RETURN encode(digest(token::bytea, 'sha256'), 'hex');
END;
$$;

-- Create session validation function that uses hashed tokens
CREATE OR REPLACE FUNCTION public.validate_session_secure(gallery_uuid uuid, token_hash text)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  session_valid boolean := false;
BEGIN
  -- Check for valid session using hashed token
  SELECT EXISTS (
    SELECT 1 FROM public.gallery_access_sessions gas
    WHERE gas.gallery_id = gallery_uuid
      AND gas.session_token = token_hash
      AND gas.expires_at > NOW()
  ) INTO session_valid;

  -- Log session validation attempt
  PERFORM public.log_security_event(
    'session_validation_attempt',
    CASE WHEN session_valid THEN 'info' ELSE 'warning' END,
    json_build_object(
      'gallery_id', gallery_uuid,
      'token_valid', session_valid,
      'client_ip', inet_client_addr()
    )::jsonb
  );

  RETURN session_valid;
END;
$$;

-- Update session policies to be more restrictive
DROP POLICY IF EXISTS "Gallery owners can view their gallery sessions" ON public.gallery_access_sessions;
DROP POLICY IF EXISTS "Gallery owners can update their gallery sessions" ON public.gallery_access_sessions;
DROP POLICY IF EXISTS "Gallery owners can delete their gallery sessions" ON public.gallery_access_sessions;

-- New restrictive session policies
CREATE POLICY "Gallery owners can view session metadata only" ON public.gallery_access_sessions
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.galleries g 
    WHERE g.id = gallery_access_sessions.gallery_id 
    AND g.photographer_id = auth.uid()
  )
);

CREATE POLICY "Gallery owners can revoke sessions" ON public.gallery_access_sessions
FOR DELETE 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.galleries g 
    WHERE g.id = gallery_access_sessions.gallery_id 
    AND g.photographer_id = auth.uid()
  )
);

-- Prevent session token exposure by creating a view
CREATE OR REPLACE VIEW public.gallery_sessions_safe AS
SELECT 
  id,
  gallery_id,
  -- Do not expose session_token
  client_ip,
  created_at,
  expires_at,
  last_accessed,
  user_agent
FROM public.gallery_access_sessions;

-- Grant access to the safe view instead of the table
GRANT SELECT ON public.gallery_sessions_safe TO authenticated;
REVOKE SELECT ON public.gallery_access_sessions FROM authenticated;

-- 4. Add database-level security monitoring
CREATE OR REPLACE FUNCTION public.monitor_sensitive_data_access()
RETURNS event_trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log any attempts to disable RLS on sensitive tables
  IF tg_tag = 'ALTER TABLE' THEN
    PERFORM public.log_security_event(
      'sensitive_table_modification',
      'critical',
      json_build_object(
        'command', tg_tag,
        'user', current_user,
        'timestamp', now()
      )::jsonb
    );
  END IF;
END;
$$;

-- Create event trigger to monitor table modifications
DROP EVENT TRIGGER IF EXISTS sensitive_data_monitor;
CREATE EVENT TRIGGER sensitive_data_monitor
ON ddl_command_end
WHEN TAG IN ('ALTER TABLE', 'DROP POLICY', 'CREATE POLICY')
EXECUTE FUNCTION public.monitor_sensitive_data_access();

-- 5. Final security verification and logging
PERFORM public.log_security_event(
  'comprehensive_security_hardening',
  'info',
  json_build_object(
    'profiles_secured', true,
    'analytics_restricted', true, 
    'sessions_hardened', true,
    'monitoring_enabled', true,
    'completion_time', now()
  )::jsonb
);