-- Fix digest function signature and create favoriting system
-- First fix the digest function calls
DROP FUNCTION IF EXISTS public.hash_password(text);
DROP FUNCTION IF EXISTS public.verify_password(text, text);

-- Create hash_password with correct digest signature
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
  -- Create hash with correct signature: digest(data, algorithm)
  hash_result := encode(digest(password_with_salt::bytea, 'sha256'), 'hex');
  -- Return salt:hash format
  RETURN salt || ':' || hash_result;
END;
$$;

-- Create verify_password with correct digest signature
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
    computed_hash := encode(digest(password_with_salt::bytea, 'sha256'), 'hex');
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

-- Create favorites table for image favoriting
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  image_id uuid NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(gallery_id, image_id)
);

-- Enable RLS on favorites table
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Create policies for favorites table
CREATE POLICY "Public can view favorites" 
ON public.favorites 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage favorites" 
ON public.favorites 
FOR ALL 
USING (auth.role() = 'authenticated'::text);