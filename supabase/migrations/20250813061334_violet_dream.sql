/*
  # Fix Share Link Validation Issues

  1. Database Functions
    - Enhanced error handling in create_session_from_share_link
    - Better logging for debugging share link issues
    - Improved validation logic for invite tokens and aliases

  2. Security
    - Add proper error logging for failed validations
    - Improve debugging capabilities while maintaining security
*/

-- Enhanced create_session_from_share_link function with better error handling
CREATE OR REPLACE FUNCTION public.create_session_from_share_link(
  invite_token text DEFAULT NULL,
  alias text DEFAULT NULL,
  client_ip inet DEFAULT NULL,
  user_agent text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invite_record gallery_invites%ROWTYPE;
  gallery_record galleries%ROWTYPE;
  token_hash text;
  new_session_token text;
  session_expires timestamptz;
  debug_info jsonb := '{}';
BEGIN
  -- Add debug information
  debug_info := json_build_object(
    'function_called', 'create_session_from_share_link',
    'timestamp', now(),
    'has_alias', alias IS NOT NULL,
    'has_token', invite_token IS NOT NULL,
    'client_ip', client_ip,
    'user_agent_length', CASE WHEN user_agent IS NOT NULL THEN length(user_agent) ELSE 0 END
  );

  -- Validate input parameters
  IF alias IS NULL AND invite_token IS NULL THEN
    PERFORM public.log_security_event(
      'share_link_validation_failed',
      'warning',
      debug_info || json_build_object('error', 'no_identifier_provided')
    );
    RETURN json_build_object(
      'success', false, 
      'message', 'No valid identifier provided',
      'debug', debug_info
    );
  END IF;

  -- Look up invite by alias or token
  IF alias IS NOT NULL THEN
    debug_info := debug_info || json_build_object('lookup_method', 'alias', 'alias_value', alias);
    
    SELECT * INTO invite_record 
    FROM public.gallery_invites 
    WHERE gallery_invites.alias = create_session_from_share_link.alias
      AND is_active = true
      AND expires_at > now()
      AND (max_uses IS NULL OR used_count < max_uses)
    LIMIT 1;
    
  ELSIF invite_token IS NOT NULL THEN
    debug_info := debug_info || json_build_object('lookup_method', 'token_hash');
    token_hash := encode(sha256(invite_token::bytea), 'hex');
    
    SELECT * INTO invite_record 
    FROM public.gallery_invites 
    WHERE invite_token_hash = token_hash
      AND is_active = true
      AND expires_at > now()
      AND (max_uses IS NULL OR used_count < max_uses)
    LIMIT 1;
  END IF;

  -- Check if invite was found
  IF NOT FOUND THEN
    -- Enhanced debugging for invite lookup failures
    debug_info := debug_info || json_build_object('invite_found', false);
    
    -- Check if invite exists but is expired/inactive
    IF alias IS NOT NULL THEN
      SELECT COUNT(*) INTO debug_info
      FROM public.gallery_invites 
      WHERE gallery_invites.alias = create_session_from_share_link.alias;
      
      debug_info := debug_info || json_build_object(
        'total_invites_with_alias', debug_info,
        'expired_check', (
          SELECT json_build_object(
            'found_but_expired', COUNT(*) > 0,
            'is_active', bool_and(is_active),
            'expires_at', max(expires_at),
            'current_time', now()
          )
          FROM public.gallery_invites 
          WHERE gallery_invites.alias = create_session_from_share_link.alias
        )
      );
    END IF;
    
    PERFORM public.log_security_event(
      'share_link_not_found',
      'warning',
      debug_info
    );
    
    RETURN json_build_object(
      'success', false, 
      'message', 'Invalid or expired share link',
      'debug', debug_info
    );
  END IF;

  debug_info := debug_info || json_build_object(
    'invite_found', true,
    'invite_id', invite_record.id,
    'gallery_id', invite_record.gallery_id,
    'link_type', invite_record.link_type,
    'used_count', invite_record.used_count,
    'max_uses', invite_record.max_uses
  );

  -- Fetch gallery
  SELECT * INTO gallery_record 
  FROM public.galleries 
  WHERE id = invite_record.gallery_id;

  IF NOT FOUND THEN
    debug_info := debug_info || json_build_object('gallery_found', false);
    PERFORM public.log_security_event(
      'gallery_not_found_for_invite',
      'error',
      debug_info
    );
    RETURN json_build_object(
      'success', false, 
      'message', 'Gallery not found',
      'debug', debug_info
    );
  END IF;

  debug_info := debug_info || json_build_object(
    'gallery_found', true,
    'gallery_name', gallery_record.name,
    'gallery_is_public', gallery_record.is_public
  );

  -- Create a gallery session
  new_session_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  session_expires := now() + interval '24 hours';

  -- Insert session
  BEGIN
    INSERT INTO public.gallery_access_sessions (
      gallery_id, session_token, client_ip, user_agent, expires_at
    ) VALUES (
      invite_record.gallery_id, new_session_token, client_ip, user_agent, session_expires
    );
  EXCEPTION WHEN OTHERS THEN
    debug_info := debug_info || json_build_object(
      'session_creation_failed', true,
      'sql_error', SQLERRM
    );
    PERFORM public.log_security_event(
      'session_creation_failed',
      'error',
      debug_info
    );
    RETURN json_build_object(
      'success', false, 
      'message', 'Failed to create session',
      'debug', debug_info
    );
  END;

  -- Increment usage and track
  UPDATE public.gallery_invites 
  SET used_count = used_count + 1,
      last_used_at = now(),
      last_used_ip = client_ip,
      last_used_user_agent = user_agent
  WHERE id = invite_record.id;

  -- Log analytics
  INSERT INTO public.gallery_analytics (
    gallery_id, action, client_ip, user_agent, metadata
  ) VALUES (
    invite_record.gallery_id,
    'share_link_access_granted',
    client_ip,
    user_agent,
    json_build_object(
      'invite_id', invite_record.id, 
      'link_type', invite_record.link_type, 
      'alias', invite_record.alias,
      'session_token_created', true
    )
  );

  debug_info := debug_info || json_build_object('success', true);

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
    ),
    'debug', debug_info
  );
END;
$function$;

-- Enhanced validate_secure_share_link function with better debugging
CREATE OR REPLACE FUNCTION public.validate_secure_share_link(
  invite_token text DEFAULT NULL,
  alias text DEFAULT NULL,
  client_ip inet DEFAULT NULL,
  user_agent text DEFAULT NULL,
  email text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invite_record gallery_invites%ROWTYPE;
  gallery_record galleries%ROWTYPE;
  token_hash text;
  debug_info jsonb := '{}';
BEGIN
  debug_info := json_build_object(
    'function_called', 'validate_secure_share_link',
    'timestamp', now(),
    'has_alias', alias IS NOT NULL,
    'has_token', invite_token IS NOT NULL,
    'has_email', email IS NOT NULL
  );

  -- Determine lookup method
  IF alias IS NOT NULL THEN
    debug_info := debug_info || json_build_object('lookup_method', 'alias');
    
    -- Look up by alias
    SELECT * INTO invite_record 
    FROM public.gallery_invites 
    WHERE gallery_invites.alias = validate_secure_share_link.alias
    AND is_active = true
    AND expires_at > now()
    AND (max_uses IS NULL OR used_count < max_uses);
    
  ELSIF invite_token IS NOT NULL THEN
    debug_info := debug_info || json_build_object('lookup_method', 'token');
    
    -- Look up by hashed token
    token_hash := encode(sha256(invite_token::bytea), 'hex');
    SELECT * INTO invite_record 
    FROM public.gallery_invites 
    WHERE invite_token_hash = token_hash
    AND is_active = true
    AND expires_at > now()
    AND (max_uses IS NULL OR used_count < max_uses);
  ELSE
    RETURN json_build_object(
      'success', false, 
      'message', 'No valid identifier provided',
      'debug', debug_info
    );
  END IF;
  
  -- Check if invite exists and is valid
  IF NOT FOUND THEN
    debug_info := debug_info || json_build_object('invite_found', false);
    
    -- Additional debugging for why invite wasn't found
    IF alias IS NOT NULL THEN
      SELECT json_build_object(
        'total_with_alias', COUNT(*),
        'active_with_alias', COUNT(*) FILTER (WHERE is_active = true),
        'non_expired_with_alias', COUNT(*) FILTER (WHERE expires_at > now()),
        'under_max_uses', COUNT(*) FILTER (WHERE max_uses IS NULL OR used_count < max_uses)
      ) INTO debug_info
      FROM public.gallery_invites 
      WHERE gallery_invites.alias = validate_secure_share_link.alias;
    END IF;
    
    PERFORM public.log_security_event(
      'share_link_validation_failed',
      'warning',
      debug_info
    );
    
    RETURN json_build_object(
      'success', false, 
      'message', 'Invalid or expired share link',
      'debug', debug_info
    );
  END IF;
  
  debug_info := debug_info || json_build_object(
    'invite_found', true,
    'invite_id', invite_record.id,
    'link_type', invite_record.link_type
  );

  -- Check IP restrictions
  IF invite_record.ip_restrictions IS NOT NULL AND client_ip IS NOT NULL THEN
    IF NOT (client_ip = ANY(invite_record.ip_restrictions)) THEN
      PERFORM public.log_security_event(
        'share_link_ip_blocked',
        'warning',
        debug_info || json_build_object('blocked_ip', client_ip)
      );
      RETURN json_build_object('success', false, 'message', 'Access denied from this IP address');
    END IF;
  END IF;
  
  -- Check email requirements
  IF invite_record.requires_email AND email IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Email verification required', 'requires_email', true);
  END IF;
  
  -- Check email domain restrictions
  IF invite_record.email_domains IS NOT NULL AND email IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM unnest(invite_record.email_domains) AS domain
      WHERE email LIKE '%@' || domain
    ) THEN
      RETURN json_build_object('success', false, 'message', 'Email domain not allowed');
    END IF;
  END IF;
  
  -- Update usage tracking
  UPDATE public.gallery_invites 
  SET used_count = used_count + 1,
      last_used_at = now(),
      last_used_ip = client_ip,
      last_used_user_agent = user_agent
  WHERE id = invite_record.id;
  
  -- Get gallery info
  SELECT * INTO gallery_record 
  FROM public.galleries 
  WHERE id = invite_record.gallery_id;
  
  IF NOT FOUND THEN
    debug_info := debug_info || json_build_object('gallery_found_after_invite', false);
    PERFORM public.log_security_event(
      'gallery_missing_after_invite_validation',
      'error',
      debug_info
    );
    RETURN json_build_object(
      'success', false, 
      'message', 'Gallery not found',
      'debug', debug_info
    );
  END IF;
  
  -- Return success with enhanced info
  RETURN json_build_object(
    'success', true,
    'link_type', invite_record.link_type,
    'gallery', json_build_object(
      'id', gallery_record.id,
      'name', gallery_record.name,
      'description', gallery_record.description,
      'client_name', gallery_record.client_name,
      'created_at', gallery_record.created_at,
      'is_public', gallery_record.is_public
    ),
    'invite_expires', invite_record.expires_at,
    'permissions', json_build_object(
      'can_download', invite_record.link_type IN ('standard', 'client'),
      'can_favorite', invite_record.link_type IN ('standard', 'client', 'preview'),
      'requires_password', invite_record.link_type != 'passwordless' AND gallery_record.password_hash IS NOT NULL,
      'preview_only', invite_record.link_type = 'preview'
    ),
    'debug', debug_info
  );
END;
$function$;

-- Add function to check share link health for debugging
CREATE OR REPLACE FUNCTION public.debug_share_link_health(
  identifier text,
  lookup_type text DEFAULT 'auto' -- 'auto', 'alias', 'token'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{}';
  invite_count integer;
  gallery_count integer;
  token_hash text;
BEGIN
  -- Only allow this function for authenticated users (debugging purposes)
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Authentication required');
  END IF;

  result := json_build_object(
    'identifier', identifier,
    'lookup_type', lookup_type,
    'timestamp', now()
  );

  -- Check by alias
  IF lookup_type IN ('auto', 'alias') THEN
    SELECT COUNT(*) INTO invite_count
    FROM public.gallery_invites
    WHERE alias = identifier;
    
    result := result || json_build_object(
      'alias_check', json_build_object(
        'total_found', invite_count,
        'active_found', (
          SELECT COUNT(*) FROM public.gallery_invites 
          WHERE alias = identifier AND is_active = true
        ),
        'non_expired_found', (
          SELECT COUNT(*) FROM public.gallery_invites 
          WHERE alias = identifier AND expires_at > now()
        ),
        'under_usage_limit', (
          SELECT COUNT(*) FROM public.gallery_invites 
          WHERE alias = identifier AND (max_uses IS NULL OR used_count < max_uses)
        )
      )
    );
  END IF;

  -- Check by token hash
  IF lookup_type IN ('auto', 'token') THEN
    token_hash := encode(sha256(identifier::bytea), 'hex');
    
    SELECT COUNT(*) INTO invite_count
    FROM public.gallery_invites
    WHERE invite_token_hash = token_hash;
    
    result := result || json_build_object(
      'token_check', json_build_object(
        'token_hash', token_hash,
        'total_found', invite_count,
        'active_found', (
          SELECT COUNT(*) FROM public.gallery_invites 
          WHERE invite_token_hash = token_hash AND is_active = true
        ),
        'non_expired_found', (
          SELECT COUNT(*) FROM public.gallery_invites 
          WHERE invite_token_hash = token_hash AND expires_at > now()
        )
      )
    );
  END IF;

  -- Check gallery count
  SELECT COUNT(*) INTO gallery_count FROM public.galleries;
  result := result || json_build_object('total_galleries', gallery_count);

  RETURN json_build_object('success', true, 'debug_info', result);
END;
$function$;