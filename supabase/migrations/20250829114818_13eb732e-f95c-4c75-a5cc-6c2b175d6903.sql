-- Phase 1: Critical Security Fixes

-- 1. Fix password hash exposure - Create secure functions that never return password_hash
CREATE OR REPLACE FUNCTION public.get_gallery_safe_info(gallery_uuid uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'id', g.id,
    'name', g.name,
    'description', g.description,
    'client_name', g.client_name,
    'created_at', g.created_at,
    'updated_at', g.updated_at,
    'view_count', g.view_count,
    'is_public', g.is_public,
    'photographer_id', g.photographer_id
  ) INTO result
  FROM public.galleries g
  WHERE g.id = gallery_uuid 
    AND g.is_public = true;
    
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_gallery_info(gallery_uuid uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'id', g.id,
    'name', g.name,
    'description', g.description,
    'client_name', g.client_name,
    'created_at', g.created_at,
    'updated_at', g.updated_at,
    'view_count', g.view_count,
    'is_public', g.is_public,
    'photographer_id', g.photographer_id,
    'has_password', (g.password_hash IS NOT NULL)
  ) INTO result
  FROM public.galleries g
  WHERE g.id = gallery_uuid 
    AND g.photographer_id = auth.uid();
    
  RETURN result;
END;
$$;

-- 2. Enhanced password security with strength validation
CREATE OR REPLACE FUNCTION public.validate_password_strength(password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check minimum length
  IF length(password) < 8 THEN
    RETURN false;
  END IF;
  
  -- Check for at least one uppercase letter
  IF password !~ '[A-Z]' THEN
    RETURN false;
  END IF;
  
  -- Check for at least one lowercase letter
  IF password !~ '[a-z]' THEN
    RETURN false;
  END IF;
  
  -- Check for at least one number
  IF password !~ '[0-9]' THEN
    RETURN false;
  END IF;
  
  -- Check for at least one special character
  IF password !~ '[^a-zA-Z0-9]' THEN
    RETURN false;
  END IF;
  
  -- Check for common weak patterns
  IF lower(password) SIMILAR TO '%(password|123456|qwerty|admin|user|test)%' THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_secure_gallery_password()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  adjectives text[] := ARRAY['Swift', 'Bright', 'Clear', 'Sharp', 'Quick', 'Bold', 'Fresh', 'Smart', 'Pure', 'Strong'];
  nouns text[] := ARRAY['Photo', 'Light', 'Frame', 'Focus', 'Lens', 'Shot', 'View', 'Scene', 'Image', 'Snap'];
  numbers text[] := ARRAY['21', '42', '77', '88', '99', '123', '456', '789'];
  symbols text[] := ARRAY['!', '@', '#', '$', '%', '&', '*'];
  password text;
BEGIN
  -- Generate a memorable but secure password: Adjective + Noun + Number + Symbol
  password := adjectives[floor(random() * array_length(adjectives, 1) + 1)] ||
             nouns[floor(random() * array_length(nouns, 1) + 1)] ||
             numbers[floor(random() * array_length(numbers, 1) + 1)] ||
             symbols[floor(random() * array_length(symbols, 1) + 1)];
  
  RETURN password;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_password_compromised(password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  common_passwords text[] := ARRAY[
    'password', '123456', 'password123', 'admin', 'qwerty', 
    'letmein', 'welcome', 'monkey', '1234567890', 'abc123',
    'password1', 'guest', 'login', 'changeme', 'secret'
  ];
BEGIN
  -- Check against common passwords
  IF lower(password) = ANY(common_passwords) THEN
    RETURN true;
  END IF;
  
  -- Check for simple patterns
  IF password SIMILAR TO '[0-9]+' THEN -- All numbers
    RETURN true;
  END IF;
  
  IF password SIMILAR TO '[a-zA-Z]+' THEN -- All letters
    RETURN true;
  END IF;
  
  -- Check for keyboard patterns
  IF lower(password) SIMILAR TO '%(qwerty|asdf|zxcv|1234|abcd)%' THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 3. Secure password hashing with salt
CREATE OR REPLACE FUNCTION public.hash_password_secure(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  salt text;
  password_with_salt text;
  hash_result text;
BEGIN
  -- Validate password strength
  IF NOT public.validate_password_strength(password) THEN
    RAISE EXCEPTION 'Password does not meet security requirements: minimum 8 chars with upper, lower, number, special';
  END IF;

  -- Check if password has been compromised
  IF public.is_password_compromised(password) THEN
    RAISE EXCEPTION 'Password is too common or has been found in data breaches. Please choose a different password.';
  END IF;

  -- Generate cryptographically secure salt
  salt := encode(gen_random_bytes(32), 'hex');
  password_with_salt := password || salt;

  -- Double SHA-256 hashing for extra security
  hash_result := encode(
                  digest(
                    digest(password_with_salt::bytea, 'sha256'),
                    'sha256'
                  ),
                'hex');

  -- Return salt:hash format for secure verification
  RETURN salt || ':' || hash_result;
END;
$$;

-- 4. Session security improvements - cleanup and rotation
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

CREATE OR REPLACE FUNCTION public.rotate_gallery_session(gallery_id uuid, old_session_token text)
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

-- 5. Enhanced session validation with security checks
CREATE OR REPLACE FUNCTION public.validate_session_secure(gallery_uuid uuid, raw_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- 6. Trigger for automatic session cleanup
CREATE OR REPLACE FUNCTION public.trigger_cleanup_expired_sessions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Clean up sessions that have been expired for more than 1 day
  DELETE FROM public.gallery_access_sessions 
  WHERE expires_at < (now() - interval '1 day');
  
  RETURN NULL;
END;
$$;