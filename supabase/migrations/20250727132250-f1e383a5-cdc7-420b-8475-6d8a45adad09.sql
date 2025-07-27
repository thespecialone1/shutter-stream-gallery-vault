-- Fix password hashing and verification system
-- The issue is that hash_password generates a hash with salt, but verify_password doesn't handle salted hashes properly

-- Drop and recreate the password functions with proper salt handling
DROP FUNCTION IF EXISTS public.hash_password(text);
DROP FUNCTION IF EXISTS public.verify_password(text, text);

-- Create improved hash_password function that stores salt with hash
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  salt text;
BEGIN
  -- Generate a random salt
  salt := gen_random_uuid()::text;
  -- Return salt:hash format so we can verify later
  RETURN salt || ':' || encode(digest(password || salt, 'sha256'), 'hex');
END;
$$;

-- Create improved verify_password function that handles salted hashes
CREATE OR REPLACE FUNCTION public.verify_password(password text, hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  salt text;
  stored_hash text;
  computed_hash text;
BEGIN
  -- Check if hash contains salt (new format: salt:hash)
  IF position(':' in hash) > 0 THEN
    salt := split_part(hash, ':', 1);
    stored_hash := split_part(hash, ':', 2);
    computed_hash := encode(digest(password || salt, 'sha256'), 'hex');
    RETURN computed_hash = stored_hash;
  END IF;
  
  -- Fallback for old passwords (backwards compatibility)
  -- Try direct hash comparison (simple SHA256)
  IF encode(digest(password, 'sha256'), 'hex') = hash THEN
    RETURN TRUE;
  END IF;
  
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