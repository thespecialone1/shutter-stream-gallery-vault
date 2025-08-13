-- Fix the share URL generation in create_secure_share_link function
CREATE OR REPLACE FUNCTION public.create_secure_share_link(gallery_id uuid, link_type text DEFAULT 'standard'::text, expires_in_days integer DEFAULT 30, max_uses integer DEFAULT NULL::integer, description text DEFAULT NULL::text, alias text DEFAULT NULL::text, ip_restrictions inet[] DEFAULT NULL::inet[], requires_email boolean DEFAULT false, email_domains text[] DEFAULT NULL::text[])
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
  base_url text := 'https://ddd5c31f-a37a-4dd8-9ed2-cedd82230890.lovableproject.com';
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
  
  -- Check if alias is already taken (excluding inactive ones)
  IF alias IS NOT NULL AND EXISTS (
    SELECT 1 FROM gallery_invites 
    WHERE gallery_invites.alias = create_secure_share_link.alias 
    AND is_active = true
  ) THEN
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
  
  -- Return the raw token and link info with correct frontend URL
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
    'gallery', json_build_object(
      'id', gallery_record.id,
      'name', gallery_record.name
    )
  );
END;
$function$;