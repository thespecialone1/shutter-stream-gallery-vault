-- Drop and recreate the get_public_profile function to be less restrictive
-- It should return basic public profile info (no email/phone) for any user
DROP FUNCTION IF EXISTS public.get_public_profile(uuid);

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
  WHERE p.user_id = profile_user_id;
$$;