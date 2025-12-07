-- Fix Security Definer View issue by recreating views with SECURITY INVOKER
-- This ensures RLS policies are enforced based on the querying user, not the view owner

-- Drop and recreate galleries_public_view with SECURITY INVOKER
DROP VIEW IF EXISTS public.galleries_public_view;
CREATE VIEW public.galleries_public_view 
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  description,
  client_name,
  created_at,
  view_count,
  is_public
FROM galleries
WHERE is_public = true;

-- Drop and recreate galleries_safe_public with SECURITY INVOKER
DROP VIEW IF EXISTS public.galleries_safe_public;
CREATE VIEW public.galleries_safe_public
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  description,
  client_name,
  created_at,
  updated_at,
  view_count,
  is_public,
  photographer_id,
  cover_image_id,
  (password_hash IS NOT NULL) AS has_password
FROM galleries
WHERE is_public = true;

-- Drop and recreate gallery_public with SECURITY INVOKER
DROP VIEW IF EXISTS public.gallery_public;
CREATE VIEW public.gallery_public
WITH (security_invoker = true)
AS
SELECT 
  id,
  created_at,
  updated_at,
  name,
  description,
  client_name
FROM galleries
WHERE is_public = true;

-- Drop and recreate gallery_sessions_safe with SECURITY INVOKER
DROP VIEW IF EXISTS public.gallery_sessions_safe;
CREATE VIEW public.gallery_sessions_safe
WITH (security_invoker = true)
AS
SELECT 
  id,
  gallery_id,
  created_at,
  expires_at,
  last_accessed,
  CASE
    WHEN user_agent IS NOT NULL THEN left(user_agent, 50) || '...'
    ELSE NULL
  END AS user_agent_partial,
  CASE
    WHEN expires_at > now() THEN 'active'
    ELSE 'expired'
  END AS session_status,
  CASE
    WHEN client_ip IS NOT NULL THEN anonymize_ip_address(client_ip)
    ELSE NULL
  END AS client_ip_masked
FROM gallery_access_sessions gas
WHERE EXISTS (
  SELECT 1 FROM galleries g
  WHERE g.id = gas.gallery_id AND g.photographer_id = auth.uid()
);

-- Drop and recreate images_public_view with SECURITY INVOKER
DROP VIEW IF EXISTS public.images_public_view;
CREATE VIEW public.images_public_view
WITH (security_invoker = true)
AS
SELECT 
  i.id,
  i.gallery_id,
  i.section_id,
  i.width,
  i.height,
  i.upload_date,
  i.filename,
  i.mime_type,
  i.thumbnail_path
FROM images i
JOIN galleries g ON i.gallery_id = g.id
WHERE g.is_public = true;