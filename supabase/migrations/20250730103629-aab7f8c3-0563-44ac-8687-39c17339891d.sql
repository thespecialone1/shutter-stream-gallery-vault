-- Fix the gen_random_bytes issue by using gen_random_uuid instead
-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update create_gallery_session function to use proper random generation
CREATE OR REPLACE FUNCTION public.create_gallery_session(gallery_id uuid, provided_password text, client_ip inet DEFAULT NULL::inet, user_agent text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- Generate session token using gen_random_uuid (more reliable than gen_random_bytes)
  new_session_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
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
  
  -- Log the access in analytics
  INSERT INTO public.gallery_analytics (
    gallery_id,
    action,
    client_ip,
    user_agent,
    metadata
  ) VALUES (
    gallery_id,
    'gallery_access_granted',
    client_ip,
    user_agent,
    json_build_object(
      'session_expires', session_expires,
      'access_method', 'password'
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
$function$;

-- Create function to validate session tokens and log access
CREATE OR REPLACE FUNCTION public.validate_gallery_session(gallery_id uuid, session_token text, action_type text DEFAULT 'gallery_view')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  session_record gallery_access_sessions%ROWTYPE;
  gallery_record galleries%ROWTYPE;
BEGIN
  -- Get the session record
  SELECT * INTO session_record 
  FROM public.gallery_access_sessions 
  WHERE gallery_access_sessions.session_token = validate_gallery_session.session_token
  AND gallery_access_sessions.gallery_id = validate_gallery_session.gallery_id
  AND expires_at > now();
  
  -- Check if session exists and is valid
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or expired session');
  END IF;
  
  -- Update last accessed time
  UPDATE public.gallery_access_sessions 
  SET last_accessed = now() 
  WHERE id = session_record.id;
  
  -- Log the access action in analytics
  INSERT INTO public.gallery_analytics (
    gallery_id,
    action,
    client_ip,
    user_agent,
    metadata
  ) VALUES (
    validate_gallery_session.gallery_id,
    action_type,
    session_record.client_ip,
    session_record.user_agent,
    json_build_object(
      'session_id', session_record.id,
      'last_accessed', session_record.last_accessed
    )
  );
  
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
$function$;

-- Create function to log specific image access
CREATE OR REPLACE FUNCTION public.log_image_access(gallery_id uuid, image_id uuid, action_type text, session_token text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  session_record gallery_access_sessions%ROWTYPE;
BEGIN
  -- Get session info if token provided
  IF session_token IS NOT NULL THEN
    SELECT * INTO session_record 
    FROM public.gallery_access_sessions 
    WHERE gallery_access_sessions.session_token = log_image_access.session_token
    AND gallery_access_sessions.gallery_id = log_image_access.gallery_id
    AND expires_at > now();
  END IF;
  
  -- Log the image access
  INSERT INTO public.gallery_analytics (
    gallery_id,
    image_id,
    action,
    client_ip,
    user_agent,
    metadata
  ) VALUES (
    log_image_access.gallery_id,
    log_image_access.image_id,
    action_type,
    COALESCE(session_record.client_ip, NULL),
    COALESCE(session_record.user_agent, NULL),
    json_build_object(
      'session_id', COALESCE(session_record.id, NULL),
      'timestamp', now()
    )
  );
END;
$function$;