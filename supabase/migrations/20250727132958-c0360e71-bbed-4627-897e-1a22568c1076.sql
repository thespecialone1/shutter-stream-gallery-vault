-- Completely rebuild the password system from scratch
-- First, drop everything
DROP FUNCTION IF EXISTS public.verify_gallery_access(uuid, text);
DROP FUNCTION IF EXISTS public.hash_password(text);
DROP FUNCTION IF EXISTS public.verify_password(text, text);

-- Ensure pgcrypto is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Test that digest function works
DO $$
BEGIN
  IF encode(digest('test', 'sha256'), 'hex') IS NULL THEN
    RAISE EXCEPTION 'digest function not working';
  END IF;
END;
$$;

-- Create simple hash_password function using pgcrypto
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  salt text;
  result text;
BEGIN
  -- Generate a random salt
  salt := gen_random_uuid()::text;
  -- Create salted hash using pgcrypto digest function
  result := salt || ':' || encode(digest(password || salt, 'sha256'), 'hex');
  RETURN result;
END;
$$;

-- Create verify_password function
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

-- Create verify_gallery_access function
CREATE OR REPLACE FUNCTION public.verify_gallery_access(gallery_id uuid, provided_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  gallery_record galleries%ROWTYPE;
  is_valid BOOLEAN;
BEGIN
  -- Get the gallery record
  SELECT * INTO gallery_record 
  FROM public.galleries 
  WHERE id = gallery_id;
  
  -- Check if gallery exists
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Gallery not found');
  END IF;
  
  -- Verify password using our verify_password function
  SELECT public.verify_password(provided_password, gallery_record.password_hash) INTO is_valid;
  
  IF is_valid THEN
    -- Return gallery info without password hash
    RETURN json_build_object(
      'success', true,
      'gallery', json_build_object(
        'id', gallery_record.id,
        'name', gallery_record.name,
        'description', gallery_record.description,
        'client_name', gallery_record.client_name,
        'created_at', gallery_record.created_at,
        'updated_at', gallery_record.updated_at
      )
    );
  ELSE
    RETURN json_build_object('success', false, 'message', 'Invalid password');
  END IF;
END;
$$;

-- Test the functions work
SELECT public.hash_password('test123');
SELECT public.verify_password('test123', public.hash_password('test123'));