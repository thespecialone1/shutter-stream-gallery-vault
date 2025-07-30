-- Drop and recreate check_rate_limit function with proper parameter names
DROP FUNCTION IF EXISTS public.check_rate_limit(text,text,integer,integer);

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_identifier text, p_attempt_type text, p_max_attempts integer DEFAULT 5, p_window_minutes integer DEFAULT 15)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_attempts integer;
  is_blocked boolean;
BEGIN
  -- Check if currently blocked
  SELECT EXISTS (
    SELECT 1 FROM public.auth_rate_limits
    WHERE identifier = p_identifier
    AND attempt_type = p_attempt_type
    AND blocked_until > now()
  ) INTO is_blocked;
  
  IF is_blocked THEN
    RETURN false;
  END IF;
  
  -- Clean up old entries
  DELETE FROM public.auth_rate_limits
  WHERE window_start < (p_window_minutes || ' minutes')::interval < now();
  
  -- Get current attempts in window
  SELECT COALESCE(SUM(attempts), 0) INTO current_attempts
  FROM public.auth_rate_limits
  WHERE identifier = p_identifier
  AND attempt_type = p_attempt_type
  AND window_start > (now() - (p_window_minutes || ' minutes')::interval);
  
  -- If over limit, block
  IF current_attempts >= p_max_attempts THEN
    INSERT INTO public.auth_rate_limits (
      identifier, attempt_type, attempts, blocked_until
    ) VALUES (
      p_identifier, p_attempt_type, 1, now() + interval '1 hour'
    )
    ON CONFLICT (identifier, attempt_type) 
    DO UPDATE SET 
      attempts = auth_rate_limits.attempts + 1,
      blocked_until = now() + interval '1 hour';
    RETURN false;
  END IF;
  
  -- Record attempt using ON CONFLICT to handle duplicates
  INSERT INTO public.auth_rate_limits (identifier, attempt_type)
  VALUES (p_identifier, p_attempt_type)
  ON CONFLICT (identifier, attempt_type) 
  DO UPDATE SET attempts = auth_rate_limits.attempts + 1;
  
  RETURN true;
END;
$function$;