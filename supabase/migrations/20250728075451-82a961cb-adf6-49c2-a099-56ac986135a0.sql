-- Final fix for password system - use explicit casting for digest function
DROP FUNCTION IF EXISTS public.hash_password(text);
DROP FUNCTION IF EXISTS public.verify_password(text, text);

-- Recreate hash_password with proper function signature
CREATE OR REPLACE FUNCTION public.hash_password(password text)
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
  -- Generate a random salt
  salt := gen_random_uuid()::text;
  -- Concatenate password and salt
  password_with_salt := password || salt;
  -- Create hash with explicit type casting
  hash_result := encode(digest(password_with_salt, 'sha256'::text), 'hex');
  -- Return salt:hash format
  RETURN salt || ':' || hash_result;
END;
$$;

-- Recreate verify_password with proper function signature
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
  -- Check if hash contains salt (new format: salt:hash)
  IF position(':' in hash) > 0 THEN
    salt := split_part(hash, ':', 1);
    stored_hash := split_part(hash, ':', 2);
    password_with_salt := password || salt;
    computed_hash := encode(digest(password_with_salt, 'sha256'::text), 'hex');
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

-- Test the functions
SELECT public.hash_password('test123') as hashed_password;
SELECT public.verify_password('test123', public.hash_password('test123')) as password_verified;