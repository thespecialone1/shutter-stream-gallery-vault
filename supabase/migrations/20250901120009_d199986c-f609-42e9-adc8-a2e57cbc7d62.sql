-- Fix critical security vulnerabilities - Part 1: Clean up existing views and policies

-- Drop existing problematic view
DROP VIEW IF EXISTS public.gallery_sessions_safe;

-- 1. Fix profiles table - Remove the overly broad policy and replace with secure one
DROP POLICY IF EXISTS "Deny all anonymous access to profiles" ON public.profiles;

CREATE POLICY "Block all anonymous access to profiles" 
ON public.profiles 
FOR ALL 
TO anon
USING (false) 
WITH CHECK (false);

-- 2. Fix gallery_access_sessions table - Restrict direct access
CREATE POLICY "Service role can manage sessions" 
ON public.gallery_access_sessions 
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

CREATE POLICY "Block all direct access to sessions" 
ON public.gallery_access_sessions 
FOR ALL 
TO anon, authenticated
USING (false) 
WITH CHECK (false);

-- 3. Fix security_audit table - Only admins can access
CREATE POLICY "Block all non-admin access to security audit" 
ON public.security_audit 
FOR SELECT 
TO anon, authenticated
USING (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role)
);

-- 4. Fix auth_rate_limits table - Block all direct access
CREATE POLICY "Block all direct access to rate limits" 
ON public.auth_rate_limits 
FOR ALL 
TO anon, authenticated
USING (false) 
WITH CHECK (false);