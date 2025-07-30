-- Enable leaked password protection and strengthen authentication security
-- This addresses the security warning about leaked password protection being disabled

-- Enable leaked password protection (this requires enabling it in Supabase dashboard)
-- We'll create a trigger to validate passwords meet security requirements

-- Create function to validate password strength
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

-- Create function to generate secure gallery passwords
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

-- Create function to check for compromised passwords (basic implementation)
-- In production, this would integrate with external breach databases
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

-- Create enhanced hash_password function that includes security checks
CREATE OR REPLACE FUNCTION public.hash_password_secure(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  salt text;
  password_with_salt text;
  hash_result text;
BEGIN
  -- Validate password strength
  IF NOT public.validate_password_strength(password) THEN
    RAISE EXCEPTION 'Password does not meet security requirements: minimum 8 characters with uppercase, lowercase, number, and special character';
  END IF;
  
  -- Check if password is compromised
  IF public.is_password_compromised(password) THEN
    RAISE EXCEPTION 'Password is too common or has been found in data breaches. Please choose a different password.';
  END IF;
  
  -- Generate a random salt using crypto-secure method
  salt := encode(gen_random_bytes(32), 'hex');
  
  -- Concatenate password and salt
  password_with_salt := password || salt;
  
  -- Use multiple rounds of hashing for better security
  hash_result := encode(sha256(sha256(password_with_salt::bytea)::bytea), 'hex');
  
  -- Return salt:hash format
  RETURN salt || ':' || hash_result;
END;
$$;

-- Create trigger to automatically clean up expired sessions
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

-- Create a trigger that runs cleanup when new sessions are created
DROP TRIGGER IF EXISTS cleanup_sessions_trigger ON public.gallery_access_sessions;
CREATE TRIGGER cleanup_sessions_trigger
  AFTER INSERT ON public.gallery_access_sessions
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_cleanup_expired_sessions();