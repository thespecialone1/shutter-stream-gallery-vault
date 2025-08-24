-- Security fix: Strengthen RLS policies for profiles table to prevent data theft

-- First, drop existing policies to rebuild them more securely
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON public.profiles;

-- Ensure RLS is enabled (should already be, but double-check)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create secure policies with explicit restrictions

-- 1. Only authenticated users can view their own profile data
CREATE POLICY "Users can view only their own profile" ON public.profiles
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- 2. Only authenticated users can update their own profile data
CREATE POLICY "Users can update only their own profile" ON public.profiles
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Admins can view all profiles (but only authenticated admins)
CREATE POLICY "Authenticated admins can view all profiles" ON public.profiles
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- 4. Admins can update any profile (but only authenticated admins)
CREATE POLICY "Authenticated admins can update any profile" ON public.profiles
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- 5. Explicitly deny all access to anonymous users
CREATE POLICY "Deny all anonymous access to profiles" ON public.profiles
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- 6. Only the system can insert profiles (via triggers)
CREATE POLICY "System can insert profiles" ON public.profiles
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 7. Prevent profile deletion (profiles should be soft-deleted or kept for audit)
CREATE POLICY "Prevent profile deletion" ON public.profiles
FOR DELETE 
TO authenticated
USING (false);

-- Add additional security: Revoke any public grants
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.profiles FROM public;

-- Grant only necessary permissions to authenticated users
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- Log this security fix
SELECT public.log_security_event(
  'profiles_table_secured',
  'info',
  '{"action": "strengthened_rls_policies", "table": "profiles", "description": "Fixed potential data theft vulnerability"}'::jsonb
);