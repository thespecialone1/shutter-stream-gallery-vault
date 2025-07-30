-- Additional Security Improvements

-- 7. Add rate limiting table for authentication attempts  
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP or email
  attempt_type text NOT NULL, -- 'login', 'signup', 'password_reset'
  attempts integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  blocked_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(identifier, attempt_type)
);

-- Enable RLS on rate limits table
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system can manage rate limits
CREATE POLICY "System can manage auth rate limits"
ON public.auth_rate_limits
FOR ALL
USING (auth.role() = 'service_role');

-- 8. Create function to check rate limits
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
    )
    ON CONFLICT (identifier, attempt_type) DO UPDATE SET
      blocked_until = now() + interval '1 hour';
    RETURN false;
  END IF;
  
  -- Record attempt
  INSERT INTO public.auth_rate_limits (identifier, attempt_type)
  VALUES (identifier, attempt_type)
  ON CONFLICT (identifier, attempt_type) 
  DO UPDATE SET 
    attempts = auth_rate_limits.attempts + 1,
    window_start = CASE 
      WHEN auth_rate_limits.window_start < (now() - (window_minutes || ' minutes')::interval)
      THEN now()
      ELSE auth_rate_limits.window_start
    END;
  
  RETURN true;
END;
$$;

-- 9. Improve password verification function with additional security
CREATE OR REPLACE FUNCTION public.verify_password(password text, hash text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  salt text;
  stored_hash text;
  password_with_salt text;
  computed_hash text;
BEGIN
  -- Log the verification attempt for security monitoring
  PERFORM public.log_security_event(
    'password_verification',
    'info',
    json_build_object('timestamp', now())
  );

  -- Check if hash contains salt (new format: salt:hash)
  IF position(':' in hash) > 0 THEN
    salt := split_part(hash, ':', 1);
    stored_hash := split_part(hash, ':', 2);
    password_with_salt := password || salt;
    computed_hash := encode(sha256(password_with_salt::bytea), 'hex');
    RETURN computed_hash = stored_hash;
  END IF;
  
  -- Fallback for old passwords (backwards compatibility)
  -- Try base64 comparison (for old passwords)
  IF encode(password::bytea, 'base64') = hash THEN
    RETURN TRUE;
  END IF;
  
  -- Try plain text comparison (for very old passwords)
  IF password = hash THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- 10. Create function to rotate session tokens for additional security
CREATE OR REPLACE FUNCTION public.rotate_gallery_session(
  gallery_id uuid,
  old_session_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  session_record gallery_access_sessions%ROWTYPE;
  new_session_token text;
  new_expires_at timestamp with time zone;
BEGIN
  -- Verify current session is valid
  SELECT * INTO session_record 
  FROM public.gallery_access_sessions 
  WHERE gallery_access_sessions.session_token = old_session_token
  AND gallery_access_sessions.gallery_id = rotate_gallery_session.gallery_id
  AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invalid session');
  END IF;
  
  -- Generate new session token
  new_session_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  new_expires_at := now() + interval '24 hours';
  
  -- Update session with new token
  UPDATE public.gallery_access_sessions 
  SET 
    session_token = new_session_token,
    expires_at = new_expires_at,
    last_accessed = now()
  WHERE id = session_record.id;
  
  -- Log session rotation
  PERFORM public.log_security_event(
    'session_rotation',
    'info',
    json_build_object(
      'gallery_id', gallery_id,
      'old_session_id', session_record.id
    )
  );
  
  RETURN json_build_object(
    'success', true,
    'session_token', new_session_token,
    'expires_at', new_expires_at
  );
END;
$$;