-- Fix auto-generation trigger to handle both INSERT and UPDATE
DROP TRIGGER IF EXISTS gallery_public_trigger ON galleries;

CREATE OR REPLACE FUNCTION auto_generate_feed_posts_on_public()
RETURNS TRIGGER AS $$
BEGIN
  -- When gallery becomes public (INSERT with is_public=true OR UPDATE to is_public=true)
  IF NEW.is_public = true AND (TG_OP = 'INSERT' OR OLD.is_public = false) THEN
    -- Insert feed posts for all images in the gallery that don't already have posts
    INSERT INTO public.feed_posts (image_id, gallery_id, user_id, caption, is_active)
    SELECT 
      i.id,
      NEW.id,
      NEW.photographer_id,
      CONCAT('Photo from ', NEW.name, ' gallery'),
      true
    FROM public.images i
    WHERE i.gallery_id = NEW.id
    AND NOT EXISTS (
      SELECT 1 FROM public.feed_posts fp 
      WHERE fp.image_id = i.id AND fp.gallery_id = NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for both INSERT and UPDATE
CREATE TRIGGER gallery_public_trigger
  AFTER INSERT OR UPDATE OF is_public ON galleries
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_feed_posts_on_public();

-- Generate feed posts for all existing public galleries that don't have posts
INSERT INTO public.feed_posts (image_id, gallery_id, user_id, caption, is_active)
SELECT 
  i.id,
  g.id,
  g.photographer_id,
  CONCAT('Photo from ', g.name, ' gallery'),
  true
FROM public.images i
JOIN public.galleries g ON g.id = i.gallery_id
WHERE g.is_public = true
AND NOT EXISTS (
  SELECT 1 FROM public.feed_posts fp 
  WHERE fp.image_id = i.id AND fp.gallery_id = g.id
);