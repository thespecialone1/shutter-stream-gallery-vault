-- Fix the infinite recursion and clean database - Step 1: Drop all existing policies

-- Drop all existing policies to start clean
DROP POLICY IF EXISTS "Authenticated photographers can create galleries" ON public.galleries;
DROP POLICY IF EXISTS "Authenticated photographers can delete own galleries" ON public.galleries;
DROP POLICY IF EXISTS "Authenticated photographers can update own galleries" ON public.galleries;
DROP POLICY IF EXISTS "Authenticated photographers can view own galleries" ON public.galleries;
DROP POLICY IF EXISTS "Authenticated users can manage galleries" ON public.galleries;
DROP POLICY IF EXISTS "Gallery owners can view their own galleries" ON public.galleries;
DROP POLICY IF EXISTS "Public can view gallery metadata" ON public.galleries;
DROP POLICY IF EXISTS "Public can view public galleries" ON public.galleries;
DROP POLICY IF EXISTS "Public galleries are viewable by everyone" ON public.galleries;
DROP POLICY IF EXISTS "Public can view public galleries basic info" ON public.galleries;
DROP POLICY IF EXISTS "Authenticated users can view their own galleries" ON public.galleries;
DROP POLICY IF EXISTS "Authenticated users can create galleries" ON public.galleries;
DROP POLICY IF EXISTS "Authenticated users can update their own galleries" ON public.galleries;
DROP POLICY IF EXISTS "Authenticated users can delete their own galleries" ON public.galleries;

-- Drop image policies
DROP POLICY IF EXISTS "Authenticated photographers can manage own gallery images" ON public.images;
DROP POLICY IF EXISTS "Authenticated users can manage images" ON public.images;
DROP POLICY IF EXISTS "Public can view images from public galleries" ON public.images;
DROP POLICY IF EXISTS "Gallery owners can manage their images" ON public.images;

-- Drop section policies
DROP POLICY IF EXISTS "Authenticated photographers can manage own gallery sections" ON public.sections;
DROP POLICY IF EXISTS "Authenticated users can manage sections" ON public.sections;
DROP POLICY IF EXISTS "Public can view sections from public galleries" ON public.sections;
DROP POLICY IF EXISTS "Gallery owners can manage their sections" ON public.sections;

-- Clean up all existing data for fresh start
DELETE FROM public.anonymous_favorites;
DELETE FROM public.favorites;
DELETE FROM public.gallery_analytics;
DELETE FROM public.gallery_access_sessions;
DELETE FROM public.gallery_invites;
DELETE FROM public.image_variants;
DELETE FROM public.images;
DELETE FROM public.sections;
DELETE FROM public.galleries;
DELETE FROM public.profiles;
DELETE FROM public.user_roles WHERE role != 'admin'; -- Keep admin roles
DELETE FROM public.security_audit;
DELETE FROM public.audit_logs;
DELETE FROM public.auth_rate_limits;