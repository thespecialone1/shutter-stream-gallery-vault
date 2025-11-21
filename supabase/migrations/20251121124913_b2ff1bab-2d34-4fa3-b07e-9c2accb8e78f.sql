-- Verify trigger exists or recreate it
DROP TRIGGER IF EXISTS gallery_public_trigger ON galleries;
CREATE TRIGGER gallery_public_trigger
  AFTER UPDATE OF is_public ON galleries
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_feed_posts_on_public();

-- Manually generate feed posts for existing public galleries
INSERT INTO public.feed_posts (image_id, gallery_id, user_id, caption)
SELECT 
  i.id,
  g.id,
  g.photographer_id,
  CONCAT('Photo from ', g.name, ' gallery')
FROM public.galleries g
JOIN public.images i ON i.gallery_id = g.id
WHERE g.is_public = true
ON CONFLICT DO NOTHING;