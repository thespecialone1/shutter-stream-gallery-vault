-- Enhanced secure share-links for galleries
-- Extend gallery_invites table with advanced sharing features

-- Add new columns for enhanced share-link functionality
ALTER TABLE public.gallery_invites ADD COLUMN IF NOT EXISTS link_type text DEFAULT 'standard' CHECK (link_type IN ('standard', 'temporary', 'client', 'preview', 'passwordless'));
ALTER TABLE public.gallery_invites ADD COLUMN IF NOT EXISTS alias text UNIQUE;
ALTER TABLE public.gallery_invites ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.gallery_invites ADD COLUMN IF NOT EXISTS ip_restrictions inet[];
ALTER TABLE public.gallery_invites ADD COLUMN IF NOT EXISTS requires_email boolean DEFAULT false;
ALTER TABLE public.gallery_invites ADD COLUMN IF NOT EXISTS email_domains text[];
ALTER TABLE public.gallery_invites ADD COLUMN IF NOT EXISTS last_used_at timestamp with time zone;
ALTER TABLE public.gallery_invites ADD COLUMN IF NOT EXISTS last_used_ip inet;
ALTER TABLE public.gallery_invites ADD COLUMN IF NOT EXISTS last_used_user_agent text;

-- Create index for better performance on alias lookups
CREATE INDEX IF NOT EXISTS idx_gallery_invites_alias ON public.gallery_invites(alias) WHERE alias IS NOT NULL;

-- Create function to generate secure share links with advanced options
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
AS $function$
DECLARE
  invite_token text;
  invite_hash text;
  expires_at timestamptz;
  gallery_record galleries%ROWTYPE;
  new_invite_id uuid;
BEGIN
  -- Check if user owns the gallery
  SELECT * INTO gallery_record 
  FROM public.galleries 
  WHERE id = gallery_id 
  AND photographer_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Gallery not found or access denied');
  END IF;
  
  -- Validate link type
  IF link_type NOT IN ('standard', 'temporary', 'client', 'preview', 'passwordless') THEN
    RETURN json_build_object('success', false, 'message', 'Invalid link type');
  END IF;
  
  -- Check if alias is already taken
  IF alias IS NOT NULL AND EXISTS (SELECT 1 FROM gallery_invites WHERE gallery_invites.alias = create_secure_share_link.alias) THEN
    RETURN json_build_object('success', false, 'message', 'Alias already exists');
  END IF;
  
  -- Generate unique invite token and hash it
  invite_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  invite_hash := encode(sha256(invite_token::bytea), 'hex');
  expires_at := now() + (expires_in_days || ' days')::interval;
  
  -- Insert enhanced invite
  INSERT INTO public.gallery_invites (
    gallery_id, invite_token_hash, created_by, expires_at, max_uses,
    link_type, alias, description, ip_restrictions, requires_email, email_domains
  ) VALUES (
    gallery_id, invite_hash, auth.uid(), expires_at, max_uses,
    link_type, alias, description, ip_restrictions, requires_email, email_domains
  ) RETURNING id INTO new_invite_id;
  
  -- Return the raw token and link info
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
      WHEN alias IS NOT NULL THEN concat('https://xcucqsonzfovlcxktxiy.supabase.co/gallery/', alias)
      ELSE concat('https://xcucqsonzfovlcxktxiy.supabase.co/gallery/', gallery_id, '?token=', invite_token)
    END,
    'gallery', json_build_object(
      'id', gallery_record.id,
      'name', gallery_record.name
    )
  );
END;
$function$;

-- Enhanced validation function with IP and email checks
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
BEGIN
  -- Determine lookup method
  IF alias IS NOT NULL THEN
    -- Look up by alias
    SELECT * INTO invite_record 
    FROM public.gallery_invites 
    WHERE gallery_invites.alias = validate_secure_share_link.alias
    AND is_active = true
    AND expires_at > now()
    AND (max_uses IS NULL OR used_count < max_uses);
  ELSIF invite_token IS NOT NULL THEN
    -- Look up by hashed token
    token_hash := encode(sha256(invite_token::bytea), 'hex');
    SELECT * INTO invite_record 
    FROM public.gallery_invites 
    WHERE invite_token_hash = token_hash
    AND is_active = true
    AND expires_at > now()
    AND (max_uses IS NULL OR used_count < max_uses);
  ELSE
    RETURN json_build_object('success', false, 'message', 'No valid identifier provided');
  END IF;
  
  -- Check if invite exists and is valid
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or expired share link');
  END IF;
  
  -- Check IP restrictions
  IF invite_record.ip_restrictions IS NOT NULL AND client_ip IS NOT NULL THEN
    IF NOT (client_ip = ANY(invite_record.ip_restrictions)) THEN
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
    )
  );
END;
$function$;

-- Function to get share link analytics
CREATE OR REPLACE FUNCTION public.get_share_link_analytics(gallery_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  gallery_record galleries%ROWTYPE;
  analytics_data json;
BEGIN
  -- Check if user owns the gallery
  SELECT * INTO gallery_record 
  FROM public.galleries 
  WHERE id = gallery_id 
  AND photographer_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Gallery not found or access denied');
  END IF;
  
  -- Get analytics data
  SELECT json_build_object(
    'total_links', COUNT(*),
    'active_links', COUNT(*) FILTER (WHERE is_active = true AND expires_at > now()),
    'expired_links', COUNT(*) FILTER (WHERE expires_at <= now()),
    'total_uses', COALESCE(SUM(used_count), 0),
    'links_by_type', json_object_agg(
      link_type, 
      COUNT(*)
    ),
    'recent_activity', (
      SELECT json_agg(json_build_object(
        'id', id,
        'link_type', link_type,
        'alias', alias,
        'description', description,
        'last_used_at', last_used_at,
        'used_count', used_count,
        'expires_at', expires_at
      ) ORDER BY last_used_at DESC NULLS LAST)
      FROM gallery_invites 
      WHERE gallery_invites.gallery_id = get_share_link_analytics.gallery_id
      LIMIT 10
    )
  ) INTO analytics_data
  FROM gallery_invites
  WHERE gallery_invites.gallery_id = get_share_link_analytics.gallery_id;
  
  RETURN json_build_object(
    'success', true,
    'gallery_id', gallery_id,
    'analytics', analytics_data
  );
END;
$function$;