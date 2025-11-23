-- Fix security definer view by enabling security_invoker
-- This makes the view run with the permissions of the querying user
-- rather than the view creator, which is more secure

ALTER VIEW public.galleries_public_view
SET (security_invoker = true);

-- Verify the change
COMMENT ON VIEW public.galleries_public_view IS 
  'Public view of galleries with security_invoker enabled. Shows only public galleries.';