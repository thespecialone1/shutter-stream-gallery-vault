CREATE OR REPLACE FUNCTION public.verify_password(password text, hash text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  salt text;
  stored_hash text;
  password_with_salt text;
  computed_hash text;
BEGIN
  -- Log the verification attempt for security monitoring
  PERFORM public.log_security_event(
    'password_verification'::text,
    'info'::text,
    '{"timestamp": "now()"}'::jsonb
  );

  -- Check if hash contains salt (new format: salt:hash)
  IF position(':' in hash) > 0 THEN
    salt := split_part(hash, ':', 1);
    stored_hash := split_part(hash, ':', 2);
    password_with_salt := password || salt;
    computed_hash := encode(sha256(password_with_salt::bytea), 'hex');
    RETURN computed_hash = stored_hash;
  END IF;
  
  -- Fallback for old passwords (backwards compatibility)
  -- Try base64 comparison (for old passwords)
  IF encode(password::bytea, 'base64') = hash THEN
    RETURN TRUE;
  END IF;
  
  -- Try plain text comparison (for very old passwords)
  IF password = hash THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$function$;