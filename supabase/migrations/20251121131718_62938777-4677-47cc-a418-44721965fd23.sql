-- Fix RLS policies for profiles table to allow user updates
-- Drop conflicting policies
DROP POLICY IF EXISTS "Profiles completely blocked from anonymous access" ON profiles;
DROP POLICY IF EXISTS "Users can update only their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view only their own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users access own profile only" ON profiles;

-- Create simple, clear policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Keep admin policies
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));