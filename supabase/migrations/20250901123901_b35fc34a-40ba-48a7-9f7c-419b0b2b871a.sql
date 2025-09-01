-- Complete security fixes - Part 2: Create secure view and enhanced functions (fixed syntax)

-- Create secure view for session management (gallery owners only)
CREATE VIEW public.gallery_sessions_safe AS
SELECT 
  gas.id,
  gas.gallery_id,
  gas.created_at,
  gas.expires_at,
  gas.last_accessed,
  CASE 
    WHEN gas.user_agent IS NOT NULL 
    THEN LEFT(gas.user_agent, 50) || '...'
    ELSE NULL 
  END as user_agent_partial,
  CASE 
    WHEN gas.expires_at > now() THEN 'active'
    ELSE 'expired'
  END as session_status,
  CASE 
    WHEN gas.client_ip IS NOT NULL 
    THEN anonymize_ip_address(gas.client_ip)
    ELSE NULL 
  END as client_ip_masked
FROM public.gallery_access_sessions gas
WHERE EXISTS (
  SELECT 1 FROM public.galleries g 
  WHERE g.id = gas.gallery_id 
  AND g.photographer_id = auth.uid()
);

-- Enhanced secure profile access function
CREATE OR REPLACE FUNCTION public.get_my_profile_secure()
RETURNS TABLE(
  id uuid, 
  full_name text, 
  business_name text, 
  email text, 
  phone text, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Log profile access for security monitoring
  PERFORM public.log_security_event(
    'profile_access',
    'info',
    json_build_object(
      'user_id', auth.uid(),
      'access_time', now(),
      'function', 'get_my_profile_secure'
    )::jsonb
  );

  RETURN QUERY
  SELECT p.id, p.full_name, p.business_name, p.email, p.phone, p.created_at, p.updated_at
  FROM public.profiles p
  WHERE p.user_id = auth.uid();
END;
$function$;

-- Add data masking for sensitive profile updates (fixed syntax)
CREATE OR REPLACE FUNCTION public.update_my_profile_secure(
  p_full_name text,
  p_business_name text DEFAULT NULL,
  p_email text,
  p_phone text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  updated_profile public.profiles%ROWTYPE;
BEGIN
  -- Verify user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate email format
  IF p_email IS NULL OR p_email = '' OR p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Validate full name
  IF p_full_name IS NULL OR LENGTH(TRIM(p_full_name)) < 2 THEN
    RAISE EXCEPTION 'Full name must be at least 2 characters';
  END IF;

  -- Update the profile
  UPDATE public.profiles 
  SET 
    full_name = TRIM(p_full_name),
    business_name = CASE WHEN p_business_name IS NOT NULL THEN TRIM(p_business_name) ELSE business_name END,
    email = LOWER(TRIM(p_email)),
    phone = CASE WHEN p_phone IS NOT NULL THEN TRIM(p_phone) ELSE phone END,
    updated_at = now()
  WHERE user_id = auth.uid()
  RETURNING * INTO updated_profile;

  -- Log profile update for security monitoring
  PERFORM public.log_security_event(
    'profile_updated',
    'info',
    json_build_object(
      'user_id', auth.uid(),
      'fields_updated', ARRAY['full_name', 'email'] || 
        CASE WHEN p_business_name IS NOT NULL THEN ARRAY['business_name'] ELSE ARRAY[]::text[] END ||
        CASE WHEN p_phone IS NOT NULL THEN ARRAY['phone'] ELSE ARRAY[]::text[] END,
      'update_time', now()
    )::jsonb
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Profile updated successfully',
    'profile', json_build_object(
      'id', updated_profile.id,
      'full_name', updated_profile.full_name,
      'business_name', updated_profile.business_name,
      'email', updated_profile.email,
      'phone', updated_profile.phone,
      'updated_at', updated_profile.updated_at
    )
  );
END;
$function$;