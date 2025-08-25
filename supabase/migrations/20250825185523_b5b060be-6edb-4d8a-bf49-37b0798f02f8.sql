-- Fix Security Definer View warning for gallery_sessions_safe view
ALTER VIEW public.gallery_sessions_safe SET (security_invoker = true);