-- Create gallery invites table
CREATE TABLE public.gallery_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id UUID NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  invite_token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  used_count INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER DEFAULT NULL, -- NULL means unlimited uses
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.gallery_invites ENABLE ROW LEVEL SECURITY;

-- Create policies for gallery invites
CREATE POLICY "Gallery owners can manage their gallery invites" 
ON public.gallery_invites 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.galleries g 
    WHERE g.id = gallery_invites.gallery_id 
    AND g.photographer_id = auth.uid()
  )
);

-- Create policy for invite access
CREATE POLICY "Anyone can use valid invites" 
ON public.gallery_invites 
FOR SELECT 
USING (
  is_active = true 
  AND expires_at > now() 
  AND (max_uses IS NULL OR used_count < max_uses)
);

-- Create function to validate and use invite
CREATE OR REPLACE FUNCTION public.validate_gallery_invite(invite_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invite_record gallery_invites%ROWTYPE;
  gallery_record galleries%ROWTYPE;
BEGIN
  -- Get the invite record
  SELECT * INTO invite_record 
  FROM public.gallery_invites 
  WHERE gallery_invites.invite_token = validate_gallery_invite.invite_token
  AND is_active = true
  AND expires_at > now()
  AND (max_uses IS NULL OR used_count < max_uses);
  
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

-- Create function to generate invite token
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
  expires_at timestamp with time zone;
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
  
  -- Generate unique invite token
  invite_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  expires_at := now() + (expires_in_days || ' days')::interval;
  
  -- Insert invite record
  INSERT INTO public.gallery_invites (
    gallery_id, 
    invite_token, 
    created_by, 
    expires_at, 
    max_uses
  ) VALUES (
    gallery_id, 
    invite_token, 
    auth.uid(), 
    expires_at, 
    max_uses
  );
  
  -- Return success with invite info
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