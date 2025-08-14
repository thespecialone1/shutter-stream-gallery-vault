-- Fix share link to require gallery password validation
CREATE OR REPLACE FUNCTION public.create_session_from_share_link(
  invite_token text DEFAULT NULL,
  alias text DEFAULT NULL,
  client_ip inet DEFAULT NULL,
  user_agent text DEFAULT NULL,
  gallery_password text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  invite_record gallery_invites%ROWTYPE;
  gallery_record galleries%ROWTYPE;
  token_hash text;
  new_session_token text;
  session_expires timestamptz;
BEGIN
  IF alias IS NOT NULL THEN
    SELECT * INTO invite_record 
    FROM public.gallery_invites 
    WHERE gallery_invites.alias = create_session_from_share_link.alias
      AND is_active = true
      AND expires_at > now()
      AND (max_uses IS NULL OR used_count < max_uses)
    LIMIT 1;
  ELSIF invite_token IS NOT NULL THEN
    token_hash := encode(extensions.digest(invite_token::bytea, 'sha256'), 'hex');
    SELECT * INTO invite_record 
    FROM public.gallery_invites 
    WHERE invite_token_hash = token_hash
      AND is_active = true
      AND expires_at > now()
      AND (max_uses IS NULL OR used_count < max_uses)
    LIMIT 1;
  ELSE
    RETURN json_build_object('success', false, 'message', 'No valid identifier provided');
  END IF;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or expired share link');
  END IF;

  -- Get gallery record
  SELECT * INTO gallery_record FROM public.galleries WHERE id = invite_record.gallery_id;
  
  -- Check if gallery requires password and validate it
  IF gallery_record.password_hash IS NOT NULL THEN
    IF gallery_password IS NULL THEN
      RETURN json_build_object(
        'success', false, 
        'message', 'Password required',
        'requires_password', true,
        'gallery', json_build_object(
          'id', gallery_record.id,
          'name', gallery_record.name,
          'client_name', gallery_record.client_name,
          'description', gallery_record.description
        )
      );
    END IF;
    
    -- Validate password
    IF NOT public.verify_password(gallery_password, gallery_record.password_hash) THEN
      RETURN json_build_object('success', false, 'message', 'Invalid password');
    END IF;
  END IF;

  -- Password validated or not required, create session
  new_session_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  session_expires := now() + interval '24 hours';

  INSERT INTO public.gallery_access_sessions (
    gallery_id, session_token, client_ip, user_agent, expires_at
  ) VALUES (
    invite_record.gallery_id, new_session_token, client_ip, user_agent, session_expires
  );

  UPDATE public.gallery_invites 
  SET used_count = used_count + 1,
      last_used_at = now(),
      last_used_ip = client_ip,
      last_used_user_agent = user_agent
  WHERE id = invite_record.id;

  INSERT INTO public.gallery_analytics (
    gallery_id, action, client_ip, user_agent, metadata
  ) VALUES (
    invite_record.gallery_id,
    'share_link_access_granted',
    client_ip,
    user_agent,
    json_build_object('invite_id', invite_record.id, 'link_type', invite_record.link_type, 'alias', invite_record.alias)
  );

  RETURN json_build_object(
    'success', true,
    'session_token', new_session_token,
    'expires_at', session_expires,
    'gallery', json_build_object(
      'id', gallery_record.id,
      'name', gallery_record.name,
      'description', gallery_record.description,
      'client_name', gallery_record.client_name,
      'created_at', gallery_record.created_at,
      'is_public', gallery_record.is_public
    )
  );
END;
$function$;