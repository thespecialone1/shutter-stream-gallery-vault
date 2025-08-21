-- Fix the gallery_public view to use security_invoker instead of security_definer
ALTER VIEW public.gallery_public SET (security_invoker = true);