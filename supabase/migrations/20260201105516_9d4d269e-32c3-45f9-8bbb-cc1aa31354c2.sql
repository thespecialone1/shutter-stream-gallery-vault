-- Fix security issues: profiles PII exposure and galleries password_hash exposure

-- =====================================================
-- PART 1: Fix profiles table - restrict public access to sensitive fields
-- =====================================================

-- The profiles table already has RLS policies that restrict access to:
-- - Users viewing their own profile (auth.uid() = user_id)
-- - Admins viewing all profiles
-- However, we need to ensure there's no public/anonymous access

-- First, let's verify the get_public_profile function returns only safe fields (it already does)
-- The function already excludes email and phone - just verify it's being used

-- =====================================================
-- PART 2: Fix galleries table - hide password_hash from public queries
-- =====================================================

-- Create a secure view for galleries that excludes password_hash
-- This view should be used for public access instead of the base table

DROP VIEW IF EXISTS public.galleries_public_secure CASCADE;

CREATE VIEW public.galleries_public_secure
WITH (security_invoker=on) AS
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
  (password_hash IS NOT NULL) as has_password
FROM public.galleries
WHERE is_public = true;

-- Grant SELECT on the view to authenticated and anon users
GRANT SELECT ON public.galleries_public_secure TO authenticated;
GRANT SELECT ON public.galleries_public_secure TO anon;

-- =====================================================
-- PART 3: Update galleries RLS to hide password_hash from non-owners
-- =====================================================

-- Drop and recreate the public viewing policy to be more restrictive
-- The issue is that public users can see password_hash through existing policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Anonymous can view public galleries" ON public.galleries;
DROP POLICY IF EXISTS "Authenticated users can view public gallery basic info" ON public.galleries;

-- Create new restrictive policy for public gallery viewing
-- Note: This policy will return rows but the password_hash is visible to owners only
-- The view galleries_public_secure should be used for public access

-- For anonymous users, deny direct table access - they must use the view
CREATE POLICY "Anonymous must use secure view"
ON public.galleries
FOR SELECT
TO anon
USING (false);

-- For authenticated non-owners viewing public galleries, also deny direct access
-- They should use the secure view for public galleries
CREATE POLICY "Non-owners use secure view for public galleries"
ON public.galleries
FOR SELECT
TO authenticated
USING (
  -- Only allow if user is the owner
  photographer_id = auth.uid()
);

-- =====================================================
-- PART 4: Create a function for safe gallery access
-- =====================================================

-- This function returns gallery info without password_hash for non-owners
CREATE OR REPLACE FUNCTION public.get_gallery_public_info(gallery_uuid uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  gallery_record galleries%ROWTYPE;
BEGIN
  -- Get the gallery
  SELECT * INTO gallery_record
  FROM public.galleries
  WHERE id = gallery_uuid;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Gallery not found');
  END IF;
  
  -- If user is the owner, return full info including has_password flag
  IF gallery_record.photographer_id = auth.uid() THEN
    RETURN json_build_object(
      'success', true,
      'gallery', json_build_object(
        'id', gallery_record.id,
        'name', gallery_record.name,
        'description', gallery_record.description,
        'client_name', gallery_record.client_name,
        'created_at', gallery_record.created_at,
        'updated_at', gallery_record.updated_at,
        'view_count', gallery_record.view_count,
        'is_public', gallery_record.is_public,
        'photographer_id', gallery_record.photographer_id,
        'cover_image_id', gallery_record.cover_image_id,
        'has_password', (gallery_record.password_hash IS NOT NULL)
      ),
      'is_owner', true
    );
  END IF;
  
  -- For public galleries, return safe info
  IF gallery_record.is_public = true THEN
    RETURN json_build_object(
      'success', true,
      'gallery', json_build_object(
        'id', gallery_record.id,
        'name', gallery_record.name,
        'description', gallery_record.description,
        'client_name', gallery_record.client_name,
        'created_at', gallery_record.created_at,
        'updated_at', gallery_record.updated_at,
        'view_count', gallery_record.view_count,
        'is_public', gallery_record.is_public,
        'photographer_id', gallery_record.photographer_id,
        'cover_image_id', gallery_record.cover_image_id,
        'has_password', (gallery_record.password_hash IS NOT NULL)
      ),
      'is_owner', false
    );
  END IF;
  
  -- Private gallery that user doesn't own - return minimal info
  RETURN json_build_object(
    'success', true,
    'gallery', json_build_object(
      'id', gallery_record.id,
      'name', gallery_record.name,
      'client_name', gallery_record.client_name,
      'has_password', (gallery_record.password_hash IS NOT NULL)
    ),
    'is_owner', false,
    'requires_auth', true
  );
END;
$$;

-- =====================================================
-- PART 5: Ensure profiles RLS prevents anonymous access
-- =====================================================

-- The profiles table already has restrictive policies but let's add an explicit deny for anon
-- Check current policies and add explicit anonymous denial if needed

-- Create policy to explicitly deny anonymous access to profiles
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- Log this security fix
SELECT public.log_security_event(
  'security_fix_applied',
  'info',
  json_build_object(
    'fixes', ARRAY[
      'profiles_anonymous_access_denied',
      'galleries_password_hash_hidden',
      'secure_views_created'
    ],
    'timestamp', now()
  )::jsonb
);