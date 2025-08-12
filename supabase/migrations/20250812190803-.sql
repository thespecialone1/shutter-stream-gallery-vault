-- Make storage bucket private
update storage.buckets set public = false where id = 'gallery-images';

-- Tighten images RLS: remove session-based broad SELECT policy
DROP POLICY IF EXISTS "Allow image access with valid gallery session" ON public.images;

-- Remove overly permissive anonymous_favorites INSERT policy (edge functions/RPC handle inserts securely)
DROP POLICY IF EXISTS "System can insert anonymous favorites" ON public.anonymous_favorites;

-- Prevent client-side creation of gallery sessions by dropping permissive INSERT policy
DROP POLICY IF EXISTS "System can create gallery sessions" ON public.gallery_access_sessions;

-- Strengthen create_gallery_session: transparently rehash legacy passwords to secure format on successful verification
CREATE OR REPLACE FUNCTION public.create_gallery_session(
  gallery_id uuid,
  provided_password text,
  client_ip inet DEFAULT NULL::inet,
  user_agent text DEFAULT NULL::text
)
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

  -- If verification succeeded but stored hash is legacy (no salt:hash), rehash to secure format
  IF gallery_record.password_hash IS NULL OR position(':' in gallery_record.password_hash) = 0 THEN
    BEGIN
      UPDATE public.galleries
      SET password_hash = public.hash_password_secure(provided_password),
          updated_at = now()
      WHERE id = gallery_record.id;
      PERFORM public.log_security_event(
        'password_rehashed',
        'info',
        json_build_object('gallery_id', gallery_record.id)
      );
    EXCEPTION WHEN others THEN
      PERFORM public.log_security_event(
        'password_rehash_failed',
        'warning',
        json_build_object('gallery_id', gallery_record.id)
      );
    END;
  END IF;
  
  -- Generate session token
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