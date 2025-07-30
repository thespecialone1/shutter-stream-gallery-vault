-- Create a version of check_rate_limit with original parameter names but internal disambiguation
DROP FUNCTION IF EXISTS public.check_rate_limit(text,text,integer,integer);

CREATE OR REPLACE FUNCTION public.check_rate_limit(identifier text, attempt_type text, max_attempts integer DEFAULT 5, window_minutes integer DEFAULT 15)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_attempts integer;
  is_blocked boolean;
  _input_identifier text := identifier;
  _input_attempt_type text := attempt_type;
  _input_max_attempts integer := max_attempts;
  _input_window_minutes integer := window_minutes;
BEGIN
  -- Check if currently blocked
  SELECT EXISTS (
    SELECT 1 FROM public.auth_rate_limits arl
    WHERE arl.identifier = _input_identifier
    AND arl.attempt_type = _input_attempt_type
    AND arl.blocked_until > now()
  ) INTO is_blocked;
  
  IF is_blocked THEN
    RETURN false;
  END IF;
  
  -- Clean up old entries
  DELETE FROM public.auth_rate_limits
  WHERE window_start < (now() - (_input_window_minutes || ' minutes')::interval);
  
  -- Get current attempts in window
  SELECT COALESCE(SUM(arl.attempts), 0) INTO current_attempts
  FROM public.auth_rate_limits arl
  WHERE arl.identifier = _input_identifier
  AND arl.attempt_type = _input_attempt_type
  AND arl.window_start > (now() - (_input_window_minutes || ' minutes')::interval);
  
  -- If over limit, block
  IF current_attempts >= _input_max_attempts THEN
    INSERT INTO public.auth_rate_limits (
      identifier, attempt_type, attempts, blocked_until
    ) VALUES (
      _input_identifier, _input_attempt_type, 1, now() + interval '1 hour'
    )
    ON CONFLICT (identifier, attempt_type) 
    DO UPDATE SET 
      attempts = auth_rate_limits.attempts + 1,
      blocked_until = now() + interval '1 hour';
    RETURN false;
  END IF;
  
  -- Record attempt using ON CONFLICT to handle duplicates
  INSERT INTO public.auth_rate_limits (identifier, attempt_type)
  VALUES (_input_identifier, _input_attempt_type)
  ON CONFLICT (identifier, attempt_type) 
  DO UPDATE SET attempts = auth_rate_limits.attempts + 1;
  
  RETURN true;
END;
$function$;