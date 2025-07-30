-- Complete the remaining security fixes

-- 1. Add rate limiting table for authentication attempts
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP or email
  attempt_type text NOT NULL, -- 'login', 'signup', 'password_reset'
  attempts integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  blocked_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on rate limits table
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system can manage rate limits
DROP POLICY IF EXISTS "System can manage auth rate limits" ON public.auth_rate_limits;
CREATE POLICY "System can manage auth rate limits"
ON public.auth_rate_limits
FOR ALL
USING (auth.role() = 'service_role');

-- 2. Create function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  identifier text,
  attempt_type text,
  max_attempts integer DEFAULT 5,
  window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_attempts integer;
  is_blocked boolean;
BEGIN
  -- Check if currently blocked
  SELECT EXISTS (
    SELECT 1 FROM public.auth_rate_limits
    WHERE auth_rate_limits.identifier = check_rate_limit.identifier
    AND auth_rate_limits.attempt_type = check_rate_limit.attempt_type
    AND blocked_until > now()
  ) INTO is_blocked;
  
  IF is_blocked THEN
    RETURN false;
  END IF;
  
  -- Clean up old entries
  DELETE FROM public.auth_rate_limits
  WHERE window_start < (now() - (window_minutes || ' minutes')::interval);
  
  -- Get current attempts in window
  SELECT COALESCE(SUM(attempts), 0) INTO current_attempts
  FROM public.auth_rate_limits
  WHERE auth_rate_limits.identifier = check_rate_limit.identifier
  AND auth_rate_limits.attempt_type = check_rate_limit.attempt_type
  AND window_start > (now() - (window_minutes || ' minutes')::interval);
  
  -- If over limit, block
  IF current_attempts >= max_attempts THEN
    INSERT INTO public.auth_rate_limits (
      identifier, attempt_type, attempts, blocked_until
    ) VALUES (
      identifier, attempt_type, 1, now() + interval '1 hour'
    );
    RETURN false;
  END IF;
  
  -- Record attempt
  INSERT INTO public.auth_rate_limits (identifier, attempt_type)
  VALUES (identifier, attempt_type);
  
  RETURN true;
END;
$$;

-- 3. Add automatic cleanup for expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete sessions older than 7 days past expiration
  DELETE FROM public.gallery_access_sessions 
  WHERE expires_at < (now() - interval '7 days');
  
  -- Log cleanup action
  PERFORM public.log_security_event(
    'session_cleanup',
    'info',
    json_build_object('cleanup_time', now())
  );
END;
$$;

-- 4. Create function to validate session tokens securely
CREATE OR REPLACE FUNCTION public.is_valid_gallery_session(
  gallery_id uuid,
  session_token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  session_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.gallery_access_sessions
    WHERE gallery_access_sessions.gallery_id = is_valid_gallery_session.gallery_id
    AND gallery_access_sessions.session_token = is_valid_gallery_session.session_token
    AND expires_at > now()
  ) INTO session_exists;
  
  -- Log access attempt
  PERFORM public.log_security_event(
    'session_validation',
    CASE WHEN session_exists THEN 'info' ELSE 'warning' END,
    json_build_object(
      'gallery_id', gallery_id,
      'token_valid', session_exists
    )
  );
  
  RETURN session_exists;
END;
$$;