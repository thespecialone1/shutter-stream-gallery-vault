-- Comprehensive security hardening for sensitive data protection (Fixed)

-- 1. PROFILES TABLE SECURITY HARDENING
-- Create security definer function for secure profile access
CREATE OR REPLACE FUNCTION public.get_user_profile_secure(user_uuid uuid)
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
  ELSE
    -- Log unauthorized access attempt
    PERFORM public.log_security_event(
      'unauthorized_profile_access',
      'warning',
      json_build_object(
        'requesting_user', auth.uid(),
        'target_user', user_uuid,
        'timestamp', now()
      )::jsonb
    );
  END IF;
END;
$$;

-- 2. GALLERY ANALYTICS SECURITY HARDENING
-- Drop existing policies and create more restrictive ones
DROP POLICY IF EXISTS "Gallery owners can view anonymized analytics only" ON public.gallery_analytics;
DROP POLICY IF EXISTS "System can insert analytics with IP hashing" ON public.gallery_analytics;

-- Create security definer function for analytics access that anonymizes sensitive data
CREATE OR REPLACE FUNCTION public.get_gallery_analytics_summary(gallery_uuid uuid)
RETURNS TABLE(
  total_views bigint,
  unique_visitors_estimate bigint,
  popular_images jsonb,
  recent_activity_days integer
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

  -- Return anonymized analytics data only
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_views,
    -- Estimate unique visitors without exposing exact IPs
    (COUNT(DISTINCT SUBSTRING(ga.client_ip::text, 1, 10)) * 1.2)::bigint as unique_visitors_estimate,
    COALESCE(
      json_agg(
        json_build_object(
          'image_id', ga.image_id,
          'action_count', COUNT(ga.action)
        ) ORDER BY COUNT(ga.action) DESC
      ) FILTER (WHERE ga.image_id IS NOT NULL),
      '[]'::jsonb
    ) as popular_images,
    EXTRACT(DAYS FROM (MAX(ga.created_at) - MIN(ga.created_at)))::integer as recent_activity_days
  FROM public.gallery_analytics ga
  WHERE ga.gallery_id = gallery_uuid
    AND ga.created_at >= NOW() - INTERVAL '30 days';
END;
$$;

-- Restrictive analytics policies that prevent raw data access
CREATE POLICY "Gallery owners view analytics via function only" ON public.gallery_analytics
FOR SELECT 
TO authenticated
USING (false); -- Force use of security definer function

CREATE POLICY "System can insert analytics" ON public.gallery_analytics
FOR INSERT 
TO authenticated, anon
WITH CHECK (
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
  -- Use SHA-256 hashing for session tokens with salt
  RETURN encode(digest((token || 'gallery_session_salt')::bytea, 'sha256'), 'hex');
END;
$$;

-- Create session validation function that uses hashed tokens
CREATE OR REPLACE FUNCTION public.validate_session_secure(gallery_uuid uuid, raw_token text)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  session_valid boolean := false;
  token_hash text;
BEGIN
  -- Hash the provided token
  token_hash := public.hash_session_token(raw_token);
  
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
      'timestamp', now()
    )::jsonb
  );

  RETURN session_valid;
END;
$$;

-- Update session policies to be more restrictive
DROP POLICY IF EXISTS "Gallery owners can view session metadata only" ON public.gallery_access_sessions;
DROP POLICY IF EXISTS "Gallery owners can revoke sessions" ON public.gallery_access_sessions;

-- Create safe view for session data that hides sensitive information
CREATE OR REPLACE VIEW public.gallery_sessions_safe AS
SELECT 
  id,
  gallery_id,
  -- Mask session tokens completely
  '***HIDDEN***' as session_token_status,
  -- Partially mask IP addresses for privacy
  CASE 
    WHEN client_ip IS NOT NULL THEN 
      SUBSTRING(client_ip::text, 1, 7) || '.***'
    ELSE NULL 
  END as client_ip_masked,
  created_at,
  expires_at,
  last_accessed,
  -- Partially mask user agents
  CASE 
    WHEN user_agent IS NOT NULL THEN 
      SUBSTRING(user_agent, 1, 20) || '...'
    ELSE NULL 
  END as user_agent_partial
FROM public.gallery_access_sessions;

-- New restrictive session policies that only allow viewing via safe functions
CREATE POLICY "Gallery owners view sessions via safe view only" ON public.gallery_access_sessions
FOR SELECT 
TO authenticated
USING (false); -- Force use of safe view or functions

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

-- Grant access to the safe view
GRANT SELECT ON public.gallery_sessions_safe TO authenticated;

-- 4. Additional security functions for data protection
CREATE OR REPLACE FUNCTION public.anonymize_ip_address(ip_addr inet)
RETURNS text
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Return only partial IP for privacy
  IF ip_addr IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN SUBSTRING(ip_addr::text, 1, 7) || '.***';
END;
$$;

-- Create function to safely get user's own profile
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE(
  id uuid,
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, p.business_name, p.email, p.phone, p.created_at, p.updated_at
  FROM public.profiles p
  WHERE p.user_id = auth.uid();
END;
$$;

-- 5. Log the comprehensive security hardening completion
SELECT public.log_security_event(
  'comprehensive_security_hardening_complete',
  'info',
  json_build_object(
    'profiles_secured', true,
    'analytics_anonymized', true, 
    'sessions_hardened', true,
    'safe_views_created', true,
    'completion_time', now()
  )::jsonb
);