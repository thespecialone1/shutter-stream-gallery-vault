-- Check and fix pgcrypto extension, then use proper password hashing
-- Ensure pgcrypto extension is properly available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Alternative approach using sha256 function from pgcrypto  
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
  -- Use sha256 function from pgcrypto
  hash_result := encode(sha256(password_with_salt::bytea), 'hex');
  -- Return salt:hash format
  RETURN salt || ':' || hash_result;
END;
$$;

-- Recreate verify_password with sha256
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