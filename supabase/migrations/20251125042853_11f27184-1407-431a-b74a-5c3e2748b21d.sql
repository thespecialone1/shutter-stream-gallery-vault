-- Allow anyone to check if a gallery is public (needed for feed RLS policies)
CREATE POLICY "Anyone can view public gallery status"
ON public.galleries
FOR SELECT
USING (is_public = true);

-- Update increment_post_views to require authentication
CREATE OR REPLACE FUNCTION public.increment_post_views(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only increment views for authenticated users to prevent abuse
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  
  UPDATE public.feed_posts 
  SET view_count = view_count + 1 
  WHERE id = post_id;
END;
$function$;