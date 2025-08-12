-- 1) Add hashed token column and index
ALTER TABLE public.gallery_invites
  ADD COLUMN IF NOT EXISTS invite_token_hash text;

CREATE INDEX IF NOT EXISTS idx_gallery_invites_token_hash
  ON public.gallery_invites (invite_token_hash);

-- 2) Backfill hashes for existing tokens, then nullify plaintext tokens
UPDATE public.gallery_invites
SET invite_token_hash = encode(sha256(invite_token::bytea), 'hex')
WHERE invite_token IS NOT NULL
  AND invite_token_hash IS NULL;

UPDATE public.gallery_invites
SET invite_token = NULL
WHERE invite_token IS NOT NULL;

-- 3) Update create_gallery_invite to store only hashed tokens and return the raw token once
CREATE OR REPLACE FUNCTION public.create_gallery_invite(
  gallery_id uuid,
  max_uses integer DEFAULT NULL,
  expires_in_days integer DEFAULT 30
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
BEGIN
  -- Check if user owns the gallery
  SELECT * INTO gallery_record 
  FROM public.galleries 
  WHERE id = gallery_id 
  AND photographer_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Gallery not found or access denied');
  END IF;
  
  -- Generate unique invite token (long random string) and hash it
  invite_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  invite_hash := encode(sha256(invite_token::bytea), 'hex');
  expires_at := now() + (expires_in_days || ' days')::interval;
  
  -- Insert invite storing only the hash
  INSERT INTO public.gallery_invites (
    gallery_id, invite_token_hash, created_by, expires_at, max_uses
  ) VALUES (
    gallery_id, invite_hash, auth.uid(), expires_at, max_uses
  );
  
  -- Return the raw token once so it can be shared externally
  RETURN json_build_object(
    'success', true,
    'invite_token', invite_token,
    'expires_at', expires_at,
    'max_uses', max_uses,
    'gallery', json_build_object(
      'id', gallery_record.id,
      'name', gallery_record.name
    )
  );
END;
$function$;

-- 4) Update validate_gallery_invite to verify via hash (with legacy fallback)
CREATE OR REPLACE FUNCTION public.validate_gallery_invite(invite_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invite_record gallery_invites%ROWTYPE;
  gallery_record galleries%ROWTYPE;
  token_hash text := encode(sha256(invite_token::bytea), 'hex');
BEGIN
  -- Get the invite record (prefer hash; fallback to plaintext for legacy rows if any remain)
  SELECT * INTO invite_record 
  FROM public.gallery_invites 
  WHERE is_active = true
    AND expires_at > now()
    AND ((invite_token_hash = token_hash)
         OR (invite_token IS NOT NULL AND invite_token = validate_gallery_invite.invite_token))
    AND (max_uses IS NULL OR used_count < max_uses)
  LIMIT 1;
  
  -- Check if invite exists and is valid
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or expired invite');
  END IF;
  
  -- Increment usage count
  UPDATE public.gallery_invites 
  SET used_count = used_count + 1
  WHERE id = invite_record.id;
  
  -- Get gallery info
  SELECT * INTO gallery_record 
  FROM public.galleries 
  WHERE id = invite_record.gallery_id;
  
  -- Return success with gallery info
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
$function$;

-- 5) Optional: create a safe view that never exposes token fields
CREATE OR REPLACE VIEW public.gallery_invites_safe AS
SELECT 
  id, gallery_id, created_by, created_at, expires_at, used_count, max_uses, is_active
FROM public.gallery_invites;