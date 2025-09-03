-- Fix Security Definer View Issue - Update gallery_sessions_safe view

-- Drop and recreate the gallery_sessions_safe view with proper security settings
DROP VIEW IF EXISTS public.gallery_sessions_safe;

CREATE VIEW public.gallery_sessions_safe
WITH (security_invoker = true)
AS
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

-- Ensure proper permissions are granted
GRANT SELECT ON public.gallery_sessions_safe TO authenticated;

-- Verify the view is now using security_invoker
COMMENT ON VIEW public.gallery_sessions_safe IS 'Secure view for gallery session data with anonymized information. Uses security_invoker for proper RLS enforcement.';