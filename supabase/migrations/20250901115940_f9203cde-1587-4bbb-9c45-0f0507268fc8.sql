-- Fix critical security vulnerabilities for sensitive data protection

-- 1. Fix profiles table - Remove the overly broad "Deny all anonymous access" policy
-- and replace with more specific, secure policies
DROP POLICY IF EXISTS "Deny all anonymous access to profiles" ON public.profiles;

-- Create restrictive default policy for anonymous users
CREATE POLICY "Block all anonymous access to profiles" 
ON public.profiles 
FOR ALL 
TO anon
USING (false) 
WITH CHECK (false);

-- 2. Fix gallery_access_sessions table - Add proper RLS policies to prevent data exposure
DROP POLICY IF EXISTS "System can insert gallery sessions" ON public.gallery_access_sessions;

CREATE POLICY "Service role can manage sessions" 
ON public.gallery_access_sessions 
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

CREATE POLICY "Block all direct access to sessions" 
ON public.gallery_access_sessions 
FOR ALL 
TO anon, authenticated
USING (false) 
WITH CHECK (false);

-- 3. Fix security_audit table - Ensure only admins can access security logs
CREATE POLICY "Block all non-admin access to security audit" 
ON public.security_audit 
FOR SELECT 
TO anon, authenticated
USING (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role)
);

-- 4. Fix auth_rate_limits table - Block all direct access except service role
CREATE POLICY "Block all direct access to rate limits" 
ON public.auth_rate_limits 
FOR ALL 
TO anon, authenticated
USING (false) 
WITH CHECK (false);

-- 5. Create secure view for session management (for gallery owners only)
CREATE OR REPLACE VIEW public.gallery_sessions_safe AS
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
  END as session_token_status,
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

-- 6. Enhanced data access function for profiles (replace existing if needed)
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