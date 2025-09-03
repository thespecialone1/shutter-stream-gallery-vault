-- Final Security Fixes - Address all remaining issues

-- 1. Fix profiles table - Completely block anonymous access
DROP POLICY IF EXISTS "Block all anonymous access to profiles" ON public.profiles;

-- Create the strongest possible protection for profiles
CREATE POLICY "Profiles completely blocked from anonymous access"
ON public.profiles
FOR ALL
USING (false)
WITH CHECK (false);

-- Allow only authenticated users to access their own data
CREATE POLICY "Authenticated users access own profile only"
ON public.profiles
FOR ALL
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 2. Add RLS policies to public views to ensure they're secure
ALTER VIEW public.gallery_public SET (security_invoker = true);
ALTER VIEW public.galleries_public_view SET (security_invoker = true);
ALTER VIEW public.images_public_view SET (security_invoker = true);

-- 3. Drop any problematic SECURITY DEFINER views and recreate them properly
DROP VIEW IF EXISTS public.galleries_public_view CASCADE;
DROP VIEW IF EXISTS public.images_public_view CASCADE;

-- Recreate views with proper security settings
CREATE VIEW public.galleries_public_view
WITH (security_invoker = true)
AS
SELECT 
  id,
  created_at,
  view_count,
  name,
  description,
  client_name
FROM public.galleries 
WHERE is_public = true;

CREATE VIEW public.images_public_view  
WITH (security_invoker = true)
AS
SELECT 
  i.id,
  i.gallery_id,
  i.section_id,
  i.width,
  i.height,
  i.upload_date,
  i.filename,
  i.mime_type,
  i.thumbnail_path
FROM public.images i
INNER JOIN public.galleries g ON i.gallery_id = g.id
WHERE g.is_public = true;

-- Grant appropriate permissions
GRANT SELECT ON public.galleries_public_view TO anon, authenticated;
GRANT SELECT ON public.images_public_view TO anon, authenticated;

-- 4. Ensure all new views have proper security
ALTER VIEW public.gallery_public SET (security_invoker = true);

-- 5. Add comprehensive audit logging for profile access
CREATE OR REPLACE FUNCTION public.audit_profile_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.log_security_event(
    'profile_accessed',
    'info',
    json_build_object(
      'profile_id', COALESCE(NEW.id, OLD.id),
      'operation', TG_OP,
      'accessed_by', auth.uid(),
      'timestamp', now()
    )::jsonb
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;

-- Create trigger for profile access auditing
DROP TRIGGER IF EXISTS audit_profile_access_trigger ON public.profiles;
CREATE TRIGGER audit_profile_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_profile_access();

-- 6. Create secure function to check for unauthorized access attempts
CREATE OR REPLACE FUNCTION public.log_unauthorized_access_attempt(
  table_name text,
  attempted_action text,
  details jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.log_security_event(
    'unauthorized_access_attempt',
    'warning',
    json_build_object(
      'table', table_name,
      'action', attempted_action,
      'user_id', auth.uid(),
      'details', details,
      'timestamp', now()
    )::jsonb
  );
END;
$function$;