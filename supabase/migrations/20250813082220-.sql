-- Enable required extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fix legacy hash helper to use proper bytea casts
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN encode(digest((password || gen_random_uuid()::text)::bytea, 'sha256'), 'hex');
END;
$$;

-- Strong hashing using salt: double sha256(password||salt)
CREATE OR REPLACE FUNCTION public.hash_password_secure(password text)
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
  IF NOT public.validate_password_strength(password) THEN
    RAISE EXCEPTION 'Password does not meet security requirements: minimum 8 chars with upper, lower, number, special';
  END IF;

  IF public.is_password_compromised(password) THEN
    RAISE EXCEPTION 'Password is too common or has been found in data breaches';
  END IF;

  salt := encode(gen_random_bytes(32), 'hex');
  password_with_salt := password || salt;

  hash_result := encode(
                  digest(
                    digest(password_with_salt::bytea, 'sha256'),
                    'sha256'
                  ),
                'hex');

  RETURN salt || ':' || hash_result;
END;
$$;

-- Verify across legacy formats and salt:hash; support bcrypt if present
CREATE OR REPLACE FUNCTION public.verify_password(password text, hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  salt_part text;
  hash_part text;
  calc text;
BEGIN
  IF hash IS NULL THEN
    RETURN false;
  END IF;

  -- bcrypt
  IF left(hash, 3) IN ('$2a', '$2b', '$2y') THEN
    RETURN crypt(password, hash) = hash;
  END IF;

  -- salt:hash (double sha256(password||salt))
  IF position(':' in hash) > 0 THEN
    salt_part := split_part(hash, ':', 1);
    hash_part := split_part(hash, ':', 2);
    calc := encode(
             digest(
               digest((password || salt_part)::bytea, 'sha256'),
               'sha256'
             ),
           'hex');
    RETURN calc = hash_part;
  END IF;

  -- 64-char legacy hex sha256
  IF length(hash) = 64 THEN
    RETURN encode(digest(password::bytea, 'sha256'), 'hex') = hash;
  END IF;

  -- base64 legacy
  IF encode(password::bytea, 'base64') = hash THEN
    RETURN true;
  END IF;

  -- plain legacy
  IF password = hash THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Replace all uses of sha256(...) convenience with digest(..., 'sha256') for tokens
CREATE OR REPLACE FUNCTION public.create_secure_share_link(
  gallery_id uuid,
  link_type text DEFAULT 'standard',
  expires_in_days integer DEFAULT 30,
  max_uses integer DEFAULT NULL,
  description text DEFAULT NULL,
  alias text DEFAULT NULL,
  ip_restrictions inet[] DEFAULT NULL,
  requires_email boolean DEFAULT false,
  email_domains text[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invite_token text;
  invite_hash text;
  expires_at timestamptz;
  gallery_record galleries%ROWTYPE;
  new_invite_id uuid;
  base_url text := 'https://ddd5c31f-a37a-4dd8-9ed2-cedd82230890.lovableproject.com';
BEGIN
  SELECT * INTO gallery_record 
  FROM public.galleries 
  WHERE id = gallery_id 
  AND photographer_id = auth.uid();
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Gallery not found or access denied');
  END IF;

  IF link_type NOT IN ('standard', 'temporary', 'client', 'preview', 'passwordless') THEN
    RETURN json_build_object('success', false, 'message', 'Invalid link type');
  END IF;

  IF alias IS NOT NULL AND EXISTS (
    SELECT 1 FROM gallery_invites 
    WHERE gallery_invites.alias = create_secure_share_link.alias 
      AND is_active = true
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Alias already exists');
  END IF;

  invite_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  invite_hash := encode(digest(invite_token::bytea, 'sha256'), 'hex');
  expires_at := now() + (expires_in_days || ' days')::interval;

  INSERT INTO public.gallery_invites (
    gallery_id, invite_token_hash, created_by, expires_at, max_uses,
    link_type, alias, description, ip_restrictions, requires_email, email_domains
  ) VALUES (
    gallery_id, invite_hash, auth.uid(), expires_at, max_uses,
    link_type, alias, description, ip_restrictions, requires_email, email_domains
  ) RETURNING id INTO new_invite_id;

  RETURN json_build_object(
    'success', true,
    'invite_id', new_invite_id,
    'invite_token', invite_token,
    'link_type', link_type,
    'expires_at', expires_at,
    'max_uses', max_uses,
    'alias', alias,
    'description', description,
    'share_url', CASE 
      WHEN alias IS NOT NULL THEN concat(base_url, '/s/', alias)
      ELSE concat(base_url, '/share?token=', invite_token)
    END,
    'gallery', json_build_object('id', gallery_record.id, 'name', gallery_record.name)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_gallery_invite(gallery_id uuid, max_uses integer DEFAULT NULL, expires_in_days integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invite_token text;
  invite_hash text;
  expires_at timestamptz;
  gallery_record galleries%ROWTYPE;
BEGIN
  SELECT * INTO gallery_record FROM public.galleries WHERE id = gallery_id AND photographer_id = auth.uid();
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Gallery not found or access denied');
  END IF;

  invite_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  invite_hash := encode(digest(invite_token::bytea, 'sha256'), 'hex');
  expires_at := now() + (expires_in_days || ' days')::interval;

  INSERT INTO public.gallery_invites (gallery_id, invite_token_hash, created_by, expires_at, max_uses)
  VALUES (gallery_id, invite_hash, auth.uid(), expires_at, max_uses);

  RETURN json_build_object(
    'success', true,
    'invite_token', invite_token,
    'expires_at', expires_at,
    'max_uses', max_uses,
    'gallery', json_build_object('id', gallery_record.id, 'name', gallery_record.name)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_gallery_invite(invite_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invite_record gallery_invites%ROWTYPE;
  gallery_record galleries%ROWTYPE;
  token_hash text := encode(digest(invite_token::bytea, 'sha256'), 'hex');
BEGIN
  SELECT * INTO invite_record 
  FROM public.gallery_invites 
  WHERE is_active = true
    AND expires_at > now()
    AND ((invite_token_hash = token_hash)
         OR (invite_token IS NOT NULL AND invite_token = validate_gallery_invite.invite_token))
    AND (max_uses IS NULL OR used_count < max_uses)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or expired invite');
  END IF;

  UPDATE public.gallery_invites 
  SET used_count = used_count + 1
  WHERE id = invite_record.id;

  SELECT * INTO gallery_record FROM public.galleries WHERE id = invite_record.gallery_id;

  RETURN json_build_object(
    'success', true,
    'gallery', json_build_object(
      'id', gallery_record.id,
      'name', gallery_record.name,
      'description', gallery_record.description,
      'client_name', gallery_record.client_name,
      'created_at', gallery_record.created_at,
      'is_public', gallery_record.is_public
    ),
    'invite_expires', invite_record.expires_at
  );
END;
$$;

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
AS $$
DECLARE
  invite_record gallery_invites%ROWTYPE;
  gallery_record galleries%ROWTYPE;
  token_hash text;
BEGIN
  IF alias IS NOT NULL THEN
    SELECT * INTO invite_record 
    FROM public.gallery_invites 
    WHERE gallery_invites.alias = validate_secure_share_link.alias
      AND is_active = true
      AND expires_at > now()
      AND (max_uses IS NULL OR used_count < max_uses);
  ELSIF invite_token IS NOT NULL THEN
    token_hash := encode(digest(invite_token::bytea, 'sha256'), 'hex');
    SELECT * INTO invite_record 
    FROM public.gallery_invites 
    WHERE invite_token_hash = token_hash
      AND is_active = true
      AND expires_at > now()
      AND (max_uses IS NULL OR used_count < max_uses);
  ELSE
    RETURN json_build_object('success', false, 'message', 'No valid identifier provided');
  END IF;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or expired share link');
  END IF;

  IF invite_record.ip_restrictions IS NOT NULL AND client_ip IS NOT NULL THEN
    IF NOT (client_ip = ANY(invite_record.ip_restrictions)) THEN
      RETURN json_build_object('success', false, 'message', 'Access denied from this IP address');
    END IF;
  END IF;

  IF invite_record.requires_email AND email IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Email verification required', 'requires_email', true);
  END IF;

  IF invite_record.email_domains IS NOT NULL AND email IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM unnest(invite_record.email_domains) AS domain
      WHERE email LIKE '%@' || domain
    ) THEN
      RETURN json_build_object('success', false, 'message', 'Email domain not allowed');
    END IF;
  END IF;

  UPDATE public.gallery_invites 
  SET used_count = used_count + 1,
      last_used_at = now(),
      last_used_ip = client_ip,
      last_used_user_agent = user_agent
  WHERE id = invite_record.id;

  SELECT * INTO gallery_record FROM public.galleries WHERE id = invite_record.gallery_id;

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
    )
  );
END;
$$;

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
AS $$
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
    token_hash := encode(digest(invite_token::bytea, 'sha256'), 'hex');
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

  SELECT * INTO gallery_record FROM public.galleries WHERE id = invite_record.gallery_id;

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
$$;

-- Lock down over-permissive policies
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'images' AND policyname = 'Public can view images'
  ) THEN
    EXECUTE 'DROP POLICY "Public can view images" ON public.images';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'sections' AND policyname = 'Public can view sections'
  ) THEN
    EXECUTE 'DROP POLICY "Public can view sections" ON public.sections';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'sections' AND policyname = 'Public can view sections from public galleries'
  ) THEN
    EXECUTE 'CREATE POLICY "Public can view sections from public galleries" ON public.sections FOR SELECT USING (EXISTS (SELECT 1 FROM public.galleries g WHERE g.id = sections.gallery_id AND g.is_public = true))';
  END IF;
END $$;
