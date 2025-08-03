-- Fix type mismatch in is_valid_gallery_session function
CREATE OR REPLACE FUNCTION public.is_valid_gallery_session(gallery_id uuid, session_token text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  session_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.gallery_access_sessions
    WHERE gallery_access_sessions.gallery_id = is_valid_gallery_session.gallery_id
    AND gallery_access_sessions.session_token = is_valid_gallery_session.session_token
    AND expires_at > now()
  ) INTO session_exists;
  
  -- Log access attempt (fix: cast json_build_object to jsonb)
  PERFORM public.log_security_event(
    'session_validation',
    CASE WHEN session_exists THEN 'info' ELSE 'warning' END,
    json_build_object(
      'gallery_id', gallery_id,
      'token_valid', session_exists
    )::jsonb
  );
  
  RETURN session_exists;
END;
$function$