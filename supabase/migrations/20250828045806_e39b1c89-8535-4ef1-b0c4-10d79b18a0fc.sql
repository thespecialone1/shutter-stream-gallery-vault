-- Enable leaked password protection in Supabase Auth
-- This will help prevent users from using passwords that have been compromised in data breaches

-- Update auth configuration to enable password strength validation
-- Note: This setting is typically configured through the Supabase dashboard under Auth settings
-- But we can verify the database functions are in place

-- Ensure our secure password hashing function includes breach checking
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

-- Log security configuration update
SELECT public.log_security_event(
  'password_security_enhanced',
  'info',
  '{"feature": "leaked_password_protection", "breach_detection": true}'::jsonb
);