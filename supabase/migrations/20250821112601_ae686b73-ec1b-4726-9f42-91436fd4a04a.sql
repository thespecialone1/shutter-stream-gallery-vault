-- Drop the existing gallery_public view that has SECURITY DEFINER
DROP VIEW IF EXISTS public.gallery_public;

-- Recreate the view without SECURITY DEFINER to fix the security issue
-- This view shows public gallery information without enforcing creator's permissions
CREATE VIEW public.gallery_public AS 
SELECT 
    id,
    name,
    description,
    client_name,
    created_at,
    updated_at
FROM public.galleries 
WHERE is_public = true;

-- Add comment to explain the view's purpose
COMMENT ON VIEW public.gallery_public IS 'Public view of galleries showing only publicly visible galleries without security definer';