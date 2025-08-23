-- Remove the dangerous policy that exposes all gallery metadata to public
DROP POLICY "Public can view gallery metadata" ON public.galleries;

-- Verify we still have the necessary policies:
-- 1. "Public can view public galleries" - allows public access to public galleries only
-- 2. "Authenticated photographers can view own galleries" - allows owners to view their galleries
-- 3. Other authenticated user policies for gallery management

-- No additional policies needed - existing policies provide proper access control