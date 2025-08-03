-- Phase 1: Fix Anonymous Gallery Access
-- First, update the images table RLS policy to allow anonymous users with valid gallery sessions

-- Drop the current restrictive policy for public gallery session access
DROP POLICY IF EXISTS "Public can view gallery images with valid session" ON public.images;

-- Create a new policy that properly handles anonymous access with valid sessions
CREATE POLICY "Allow image access with valid gallery session" 
ON public.images 
FOR SELECT 
USING (
  -- Allow if it's from a public gallery
  EXISTS (
    SELECT 1 FROM galleries g 
    WHERE g.id = images.gallery_id AND g.is_public = true
  )
  OR 
  -- Allow if user owns the gallery (authenticated photographers)
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM galleries g 
    WHERE g.id = images.gallery_id AND g.photographer_id = auth.uid()
  ))
  OR
  -- Allow if there's a valid gallery session (for anonymous password-protected access)
  EXISTS (
    SELECT 1 FROM gallery_access_sessions gas
    WHERE gas.gallery_id = images.gallery_id 
    AND gas.expires_at > now()
    -- Note: We don't check session_token here as that will be validated in the application layer
  )
);

-- Create a new table to track anonymous favorites linked to gallery sessions
CREATE TABLE IF NOT EXISTS public.anonymous_favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id uuid NOT NULL,
  image_id uuid NOT NULL,
  session_token text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  client_ip inet,
  UNIQUE(gallery_id, image_id, session_token)
);

-- Enable RLS on anonymous_favorites
ALTER TABLE public.anonymous_favorites ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for anonymous_favorites
CREATE POLICY "Gallery owners can view anonymous favorites" 
ON public.anonymous_favorites 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM galleries g 
    WHERE g.id = anonymous_favorites.gallery_id 
    AND g.photographer_id = auth.uid()
  )
);

CREATE POLICY "System can insert anonymous favorites" 
ON public.anonymous_favorites 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM galleries g 
    WHERE g.id = anonymous_favorites.gallery_id
  )
);

CREATE POLICY "Users can manage favorites with valid session" 
ON public.anonymous_favorites 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM gallery_access_sessions gas
    WHERE gas.session_token = anonymous_favorites.session_token
    AND gas.gallery_id = anonymous_favorites.gallery_id
    AND gas.expires_at > now()
  )
);

-- Create a function to get anonymous favorites for a session
CREATE OR REPLACE FUNCTION public.get_anonymous_favorites(
  p_gallery_id uuid,
  p_session_token text
) RETURNS TABLE (
  image_id uuid,
  created_at timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate session first
  IF NOT EXISTS (
    SELECT 1 FROM gallery_access_sessions gas
    WHERE gas.session_token = p_session_token
    AND gas.gallery_id = p_gallery_id
    AND gas.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Invalid or expired session';
  END IF;

  RETURN QUERY
  SELECT af.image_id, af.created_at
  FROM anonymous_favorites af
  WHERE af.gallery_id = p_gallery_id
  AND af.session_token = p_session_token
  ORDER BY af.created_at DESC;
END;
$$;

-- Create a function to toggle anonymous favorites
CREATE OR REPLACE FUNCTION public.toggle_anonymous_favorite(
  p_gallery_id uuid,
  p_image_id uuid,
  p_session_token text,
  p_client_ip inet DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  favorite_exists boolean;
  action_taken text;
BEGIN
  -- Validate session first
  IF NOT EXISTS (
    SELECT 1 FROM gallery_access_sessions gas
    WHERE gas.session_token = p_session_token
    AND gas.gallery_id = p_gallery_id
    AND gas.expires_at > now()
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or expired session');
  END IF;

  -- Check if favorite already exists
  SELECT EXISTS (
    SELECT 1 FROM anonymous_favorites af
    WHERE af.gallery_id = p_gallery_id
    AND af.image_id = p_image_id
    AND af.session_token = p_session_token
  ) INTO favorite_exists;

  IF favorite_exists THEN
    -- Remove favorite
    DELETE FROM anonymous_favorites
    WHERE gallery_id = p_gallery_id
    AND image_id = p_image_id
    AND session_token = p_session_token;
    
    action_taken := 'removed';
  ELSE
    -- Add favorite
    INSERT INTO anonymous_favorites (
      gallery_id, image_id, session_token, client_ip
    ) VALUES (
      p_gallery_id, p_image_id, p_session_token, p_client_ip
    );
    
    action_taken := 'added';
  END IF;

  -- Log the action
  INSERT INTO gallery_analytics (
    gallery_id, image_id, action, client_ip, metadata
  ) VALUES (
    p_gallery_id, p_image_id, 
    CASE WHEN action_taken = 'added' THEN 'image_favorited' ELSE 'image_unfavorited' END,
    p_client_ip,
    json_build_object('session_token', p_session_token, 'action', action_taken)
  );

  RETURN json_build_object(
    'success', true, 
    'action', action_taken,
    'is_favorited', action_taken = 'added'
  );
END;
$$;