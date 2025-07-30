-- Phase 1: Fix Authentication & Authorization - Database Security (Fixed)

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Photographers can manage own gallery images" ON public.images;
DROP POLICY IF EXISTS "Admins can manage all images" ON public.images;
DROP POLICY IF EXISTS "Public can view images" ON public.images;

DROP POLICY IF EXISTS "Photographers can manage own gallery sections" ON public.sections;
DROP POLICY IF EXISTS "Admins can manage all sections" ON public.sections;
DROP POLICY IF EXISTS "Public can view sections" ON public.sections;

DROP POLICY IF EXISTS "Photographers can manage own image variants" ON public.image_variants;
DROP POLICY IF EXISTS "Public can view image variants" ON public.image_variants;

DROP POLICY IF EXISTS "Public can view gallery metadata" ON public.galleries;
DROP POLICY IF EXISTS "Photographers can manage own galleries" ON public.galleries;
DROP POLICY IF EXISTS "Admins can manage all galleries" ON public.galleries;

DROP POLICY IF EXISTS "Public can view favorites" ON public.favorites;
DROP POLICY IF EXISTS "Authenticated users can manage favorites" ON public.favorites;

-- Create new secure policies for galleries
CREATE POLICY "Photographers can view own galleries" 
ON public.galleries 
FOR SELECT 
USING (auth.uid() = photographer_id);

CREATE POLICY "Photographers can create galleries" 
ON public.galleries 
FOR INSERT 
WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "Photographers can update own galleries" 
ON public.galleries 
FOR UPDATE 
USING (auth.uid() = photographer_id)
WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "Photographers can delete own galleries" 
ON public.galleries 
FOR DELETE 
USING (auth.uid() = photographer_id);

-- Create new secure policies for images
CREATE POLICY "Photographers can manage own gallery images" 
ON public.images 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM galleries 
  WHERE galleries.id = images.gallery_id 
  AND galleries.photographer_id = auth.uid()
));

-- Create new secure policies for sections
CREATE POLICY "Photographers can manage own gallery sections" 
ON public.sections 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM galleries 
  WHERE galleries.id = sections.gallery_id 
  AND galleries.photographer_id = auth.uid()
));

-- Create new secure policies for image variants
CREATE POLICY "Photographers can manage own image variants" 
ON public.image_variants 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM images i
  JOIN galleries g ON i.gallery_id = g.id
  WHERE i.id = image_variants.image_id 
  AND g.photographer_id = auth.uid()
));

-- Create a table to track gallery access sessions (for client access without accounts)
CREATE TABLE IF NOT EXISTS public.gallery_access_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid REFERENCES public.galleries(id) ON DELETE CASCADE NOT NULL,
  session_token text UNIQUE NOT NULL,
  client_ip inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  last_accessed timestamp with time zone DEFAULT now()
);

-- Enable RLS on gallery access sessions
ALTER TABLE public.gallery_access_sessions ENABLE ROW LEVEL SECURITY;

-- Policy for gallery access sessions - only system can manage these
CREATE POLICY "System can manage gallery access sessions" 
ON public.gallery_access_sessions 
FOR ALL
USING (true);

-- Create new secure policy for favorites
CREATE POLICY "Gallery owners can manage favorites" 
ON public.favorites 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM galleries 
    WHERE galleries.id = favorites.gallery_id 
    AND galleries.photographer_id = auth.uid()
  )
);

-- Update the verify_gallery_access function to use sessions
CREATE OR REPLACE FUNCTION public.verify_gallery_access(gallery_id uuid, provided_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- This function is deprecated - use create_gallery_session instead
  RETURN json_build_object('success', false, 'message', 'Please use the new authentication method');
END;
$$;

-- Function to create gallery access session after password verification
CREATE OR REPLACE FUNCTION public.create_gallery_session(gallery_id uuid, provided_password text, client_ip inet DEFAULT NULL, user_agent text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  gallery_record galleries%ROWTYPE;
  is_valid BOOLEAN;
  new_session_token text;
  session_expires timestamp with time zone;
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
  
  IF NOT is_valid THEN
    RETURN json_build_object('success', false, 'message', 'Invalid password');
  END IF;
  
  -- Generate session token and expiration (24 hours)
  new_session_token := encode(gen_random_bytes(32), 'base64');
  session_expires := now() + interval '24 hours';
  
  -- Create session record
  INSERT INTO public.gallery_access_sessions (
    gallery_id, 
    session_token, 
    client_ip, 
    user_agent, 
    expires_at
  ) VALUES (
    gallery_id, 
    new_session_token, 
    client_ip, 
    user_agent, 
    session_expires
  );
  
  -- Log the access
  PERFORM public.log_audit_action(
    'gallery_access_granted',
    'galleries',
    gallery_id,
    json_build_object(
      'client_ip', client_ip,
      'user_agent', user_agent,
      'session_expires', session_expires
    )
  );
  
  -- Return success with session token and gallery info
  RETURN json_build_object(
    'success', true,
    'session_token', new_session_token,
    'expires_at', session_expires,
    'gallery', json_build_object(
      'id', gallery_record.id,
      'name', gallery_record.name,
      'description', gallery_record.description,
      'client_name', gallery_record.client_name,
      'created_at', gallery_record.created_at
    )
  );
END;
$$;

-- Function to verify gallery access via session token
CREATE OR REPLACE FUNCTION public.verify_gallery_session(gallery_id uuid, session_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  session_record gallery_access_sessions%ROWTYPE;
  gallery_record galleries%ROWTYPE;
BEGIN
  -- Get the session record
  SELECT * INTO session_record 
  FROM public.gallery_access_sessions 
  WHERE gallery_access_sessions.session_token = verify_gallery_session.session_token
  AND gallery_access_sessions.gallery_id = verify_gallery_session.gallery_id
  AND expires_at > now();
  
  -- Check if session exists and is valid
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or expired session');
  END IF;
  
  -- Update last accessed time
  UPDATE public.gallery_access_sessions 
  SET last_accessed = now() 
  WHERE id = session_record.id;
  
  -- Get gallery info
  SELECT * INTO gallery_record 
  FROM public.galleries 
  WHERE id = session_record.gallery_id;
  
  -- Return success with gallery info
  RETURN json_build_object(
    'success', true,
    'gallery', json_build_object(
      'id', gallery_record.id,
      'name', gallery_record.name,
      'description', gallery_record.description,
      'client_name', gallery_record.client_name,
      'created_at', gallery_record.created_at
    ),
    'session_expires', session_record.expires_at
  );
END;
$$;