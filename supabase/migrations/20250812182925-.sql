-- Fix security definer view issue by making it more secure
-- Removing the potential security definer view in favor of proper RLS-only access

-- Remove the potentially problematic view that may have been flagged
DROP VIEW IF EXISTS public.gallery_invites_safe;

-- Add comment to table confirming security posture
COMMENT ON TABLE public.gallery_invites IS 'Gallery invite tokens are hashed and stored securely. RLS policies ensure only gallery owners can view their own invites. Anonymous users can only validate tokens via the validate_gallery_invite() RPC function.';

-- Ensure the RLS policies are properly restrictive (idempotent)
DO $$
BEGIN
  -- Check if the policy already exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'gallery_invites' 
    AND policyname = 'Gallery owners can manage their gallery invites'
  ) THEN
    CREATE POLICY "Gallery owners can manage their gallery invites"
    ON public.gallery_invites
    FOR ALL
    USING (
      auth.uid() IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM galleries g
        WHERE g.id = gallery_invites.gallery_id
        AND g.photographer_id = auth.uid()
      )
    );
  END IF;
END $$;