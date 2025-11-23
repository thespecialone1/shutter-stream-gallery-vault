-- Fix profiles table RLS policies
-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Prevent profile deletion" ON public.profiles;

-- Create secure policies for profiles table
-- Users can only view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can insert their own profile (for new user registration)
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Prevent profile deletion entirely
CREATE POLICY "Prevent profile deletion"
ON public.profiles
FOR DELETE
TO authenticated
USING (false);

-- Fix post_likes table to not expose individual user_id values
-- Drop existing policy that exposes user data
DROP POLICY IF EXISTS "Anyone can view like counts" ON public.post_likes;

-- Create new policy that only allows viewing for authenticated users
-- Individual users can only see if THEY liked something, not who else did
CREATE POLICY "Users can view own likes"
ON public.post_likes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow anonymous users to see aggregate counts only via the feed_posts table
-- (The feed already shows like_count which is safe)

-- Ensure the existing policy for managing own likes is correct
DROP POLICY IF EXISTS "Authenticated users can manage their own likes" ON public.post_likes;

CREATE POLICY "Users can insert own likes"
ON public.post_likes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
ON public.post_likes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);