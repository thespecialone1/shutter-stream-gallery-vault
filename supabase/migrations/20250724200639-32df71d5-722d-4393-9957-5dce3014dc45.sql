-- Remove the remaining security definer view
DROP VIEW IF EXISTS public.gallery_public CASCADE;

-- Fix the remaining functions with proper search_path
DROP FUNCTION IF EXISTS public.hash_password(TEXT);
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Generate a random salt and hash with SHA256
  RETURN encode(digest(password || gen_random_uuid()::text, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP FUNCTION IF EXISTS public.verify_password(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Try direct hash comparison first (for migration compatibility)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;