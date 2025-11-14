-- Create function to auto-generate feed posts when gallery becomes public
CREATE OR REPLACE FUNCTION auto_generate_feed_posts_on_public()
RETURNS TRIGGER AS $$
BEGIN
  -- When gallery becomes public, generate feed posts for all images
  IF NEW.is_public = true AND OLD.is_public = false THEN
    -- Insert feed posts for all images in the gallery
    INSERT INTO public.feed_posts (image_id, gallery_id, user_id, caption)
    SELECT 
      i.id,
      NEW.id,
      NEW.photographer_id,
      CONCAT('Photo from ', NEW.name, ' gallery')
    FROM public.images i
    WHERE i.gallery_id = NEW.id
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-generating feed posts
DROP TRIGGER IF EXISTS gallery_public_trigger ON galleries;
CREATE TRIGGER gallery_public_trigger
  AFTER UPDATE OF is_public ON galleries
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_feed_posts_on_public();