-- Drop the overly permissive policy that exposes all profile columns including email/phone
DROP POLICY IF EXISTS "Anyone can view basic profile info for public posts" ON public.profiles;

-- Create a secure function to get public profile information (safe fields only)
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  display_name text,
  full_name text,
  avatar_url text,
  bio text,
  business_name text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.display_name,
    p.full_name,
    p.avatar_url,
    p.bio,
    p.business_name,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.user_id = profile_user_id
    AND EXISTS (
      SELECT 1
      FROM feed_posts fp
      JOIN galleries g ON g.id = fp.gallery_id
      WHERE fp.user_id = p.user_id
        AND g.is_public = true
        AND fp.is_active = true
    );
$$;

-- Grant execute permission to all users
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO anon, authenticated;

-- The existing policies remain:
-- "Users can view own profile" - allows users to see their own full profile including email/phone
-- "Admins can view all profiles" - allows admins to see all data
-- Now public users must use get_public_profile() function which only returns safe fields