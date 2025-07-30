-- Fix rate limiting duplicate key issue by using ON CONFLICT
CREATE OR REPLACE FUNCTION public.check_rate_limit(identifier text, attempt_type text, max_attempts integer DEFAULT 5, window_minutes integer DEFAULT 15)
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
    WHERE auth_rate_limits.identifier = check_rate_limit.identifier
    AND auth_rate_limits.attempt_type = check_rate_limit.attempt_type
    AND blocked_until > now()
  ) INTO is_blocked;
  
  IF is_blocked THEN
    RETURN false;
  END IF;
  
  -- Clean up old entries
  DELETE FROM public.auth_rate_limits
  WHERE window_start < (now() - (window_minutes || ' minutes')::interval);
  
  -- Get current attempts in window
  SELECT COALESCE(SUM(attempts), 0) INTO current_attempts
  FROM public.auth_rate_limits
  WHERE auth_rate_limits.identifier = check_rate_limit.identifier
  AND auth_rate_limits.attempt_type = check_rate_limit.attempt_type
  AND window_start > (now() - (window_minutes || ' minutes')::interval);
  
  -- If over limit, block
  IF current_attempts >= max_attempts THEN
    INSERT INTO public.auth_rate_limits (
      identifier, attempt_type, attempts, blocked_until
    ) VALUES (
      identifier, attempt_type, 1, now() + interval '1 hour'
    )
    ON CONFLICT (identifier, attempt_type) 
    DO UPDATE SET 
      attempts = auth_rate_limits.attempts + 1,
      blocked_until = now() + interval '1 hour';
    RETURN false;
  END IF;
  
  -- Record attempt using ON CONFLICT to handle duplicates
  INSERT INTO public.auth_rate_limits (identifier, attempt_type)
  VALUES (identifier, attempt_type)
  ON CONFLICT (identifier, attempt_type) 
  DO UPDATE SET attempts = auth_rate_limits.attempts + 1;
  
  RETURN true;
END;
$function$;