-- Allow anyone to view basic profile info for users with public posts
-- This is needed for the feed to show user names and avatars
CREATE POLICY "Anyone can view basic profile info for public posts"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM feed_posts fp
    JOIN galleries g ON g.id = fp.gallery_id
    WHERE fp.user_id = profiles.user_id
    AND g.is_public = true
    AND fp.is_active = true
  )
);