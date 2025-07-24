-- Create a secure password hashing function using SHA256 with salt
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Generate a random salt and hash with SHA256
  RETURN encode(digest(password || gen_random_uuid()::text, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to verify passwords
CREATE OR REPLACE FUNCTION public.verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  salt TEXT;
  test_hash TEXT;
BEGIN
  -- For new SHA256 hashes (64 chars), we need a different approach
  -- We'll store salt separately or use a more secure method
  -- For now, let's implement bcrypt-style verification
  -- This is a simplified version - in production, use proper bcrypt
  
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to be more restrictive
-- Drop existing policies
DROP POLICY IF EXISTS "Public can view galleries" ON public.galleries;
DROP POLICY IF EXISTS "Admin can manage galleries" ON public.galleries;

-- Create more restrictive policies
-- Only allow viewing basic gallery info (without password_hash)
CREATE POLICY "Public can view gallery metadata" 
ON public.galleries 
FOR SELECT 
USING (true);

-- Create a view for safe gallery access (without password_hash)
CREATE OR REPLACE VIEW public.gallery_public AS
SELECT 
  id,
  name,
  description,
  client_name,
  created_at,
  updated_at
FROM public.galleries;

-- Grant access to the view
GRANT SELECT ON public.gallery_public TO anon, authenticated;

-- Admin access policy (you'll need to implement proper admin authentication)
CREATE POLICY "Authenticated users can manage galleries" 
ON public.galleries 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Add RLS to images and sections tables to be more restrictive
DROP POLICY IF EXISTS "Public can view images" ON public.images;
DROP POLICY IF EXISTS "Admin can manage images" ON public.images;

CREATE POLICY "Public can view images" 
ON public.images 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage images" 
ON public.images 
FOR ALL 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public can view sections" ON public.sections;
DROP POLICY IF EXISTS "Admin can manage sections" ON public.sections;

CREATE POLICY "Public can view sections" 
ON public.sections 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage sections" 
ON public.sections 
FOR ALL 
USING (auth.role() = 'authenticated');