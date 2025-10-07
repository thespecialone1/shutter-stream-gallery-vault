-- Phase 1: Social Feed & Enhanced User Profiles - Database Schema

-- 1. Update profiles table with social features
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS display_name text;

-- 2. Create feed_posts table
CREATE TABLE IF NOT EXISTS public.feed_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_id uuid NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  caption text,
  is_active boolean NOT NULL DEFAULT true,
  view_count integer NOT NULL DEFAULT 0,
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Create post_likes table
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- 4. Create post_comments table
CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  comment_text text NOT NULL,
  image_url text,
  parent_comment_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feed_posts_user_id ON public.feed_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_gallery_id ON public.feed_posts(gallery_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON public.feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_active ON public.feed_posts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON public.post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent ON public.post_comments(parent_comment_id);

-- 6. Enable RLS on all new tables
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for feed_posts
CREATE POLICY "Anyone can view active feed posts from public galleries"
ON public.feed_posts FOR SELECT
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM public.galleries g 
    WHERE g.id = feed_posts.gallery_id 
    AND g.is_public = true
  )
);

CREATE POLICY "Gallery owners can manage their feed posts"
ON public.feed_posts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.galleries g 
    WHERE g.id = feed_posts.gallery_id 
    AND g.photographer_id = auth.uid()
  )
);

CREATE POLICY "Gallery owners can create feed posts"
ON public.feed_posts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.galleries g 
    WHERE g.id = feed_posts.gallery_id 
    AND g.photographer_id = auth.uid()
  )
);

-- 8. RLS Policies for post_likes
CREATE POLICY "Anyone can view like counts"
ON public.post_likes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage their own likes"
ON public.post_likes FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 9. RLS Policies for post_comments
CREATE POLICY "Anyone can view comments on active posts"
ON public.post_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.feed_posts fp 
    WHERE fp.id = post_comments.post_id 
    AND fp.is_active = true
  )
);

CREATE POLICY "Authenticated users can create comments"
ON public.post_comments FOR INSERT
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own comments"
ON public.post_comments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.post_comments FOR DELETE
USING (auth.uid() = user_id);

-- 10. Add updated_at trigger for feed_posts
CREATE TRIGGER update_feed_posts_updated_at
BEFORE UPDATE ON public.feed_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Add updated_at trigger for post_comments
CREATE TRIGGER update_post_comments_updated_at
BEFORE UPDATE ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Function to increment post views
CREATE OR REPLACE FUNCTION public.increment_post_views(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.feed_posts 
  SET view_count = view_count + 1 
  WHERE id = post_id;
END;
$$;

-- 13. Function to update like count on feed posts
CREATE OR REPLACE FUNCTION public.update_post_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feed_posts 
    SET like_count = like_count + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feed_posts 
    SET like_count = like_count - 1 
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER post_likes_count_trigger
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_post_like_count();

-- 14. Function to update comment count on feed posts
CREATE OR REPLACE FUNCTION public.update_post_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feed_posts 
    SET comment_count = comment_count + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feed_posts 
    SET comment_count = comment_count - 1 
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER post_comments_count_trigger
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_post_comment_count();

-- 15. Function to get personalized feed
CREATE OR REPLACE FUNCTION public.get_personalized_feed(
  p_user_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  post_id uuid,
  image_id uuid,
  gallery_id uuid,
  user_id uuid,
  caption text,
  view_count integer,
  like_count integer,
  comment_count integer,
  created_at timestamp with time zone,
  image_url text,
  thumbnail_url text,
  gallery_name text,
  photographer_name text,
  photographer_avatar text,
  user_has_liked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fp.id as post_id,
    fp.image_id,
    fp.gallery_id,
    fp.user_id,
    fp.caption,
    fp.view_count,
    fp.like_count,
    fp.comment_count,
    fp.created_at,
    i.full_path as image_url,
    i.thumbnail_path as thumbnail_url,
    g.name as gallery_name,
    COALESCE(p.display_name, p.full_name, p.business_name) as photographer_name,
    p.avatar_url as photographer_avatar,
    EXISTS(
      SELECT 1 FROM public.post_likes pl 
      WHERE pl.post_id = fp.id 
      AND pl.user_id = p_user_id
    ) as user_has_liked
  FROM public.feed_posts fp
  INNER JOIN public.images i ON i.id = fp.image_id
  INNER JOIN public.galleries g ON g.id = fp.gallery_id
  INNER JOIN public.profiles p ON p.user_id = fp.user_id
  WHERE fp.is_active = true
    AND g.is_public = true
  ORDER BY RANDOM()
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 16. Function to automatically generate feed posts from public galleries
CREATE OR REPLACE FUNCTION public.generate_feed_posts_for_gallery(p_gallery_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_image_record record;
  v_posts_created integer := 0;
BEGIN
  -- Get the gallery owner
  SELECT photographer_id INTO v_user_id
  FROM public.galleries
  WHERE id = p_gallery_id AND is_public = true;
  
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Create feed posts for up to 5 random images from the gallery
  FOR v_image_record IN (
    SELECT id, gallery_id
    FROM public.images
    WHERE gallery_id = p_gallery_id
    ORDER BY RANDOM()
    LIMIT 5
  )
  LOOP
    -- Only create if doesn't already exist
    IF NOT EXISTS (
      SELECT 1 FROM public.feed_posts 
      WHERE image_id = v_image_record.id
    ) THEN
      INSERT INTO public.feed_posts (
        image_id, 
        gallery_id, 
        user_id, 
        is_active
      ) VALUES (
        v_image_record.id,
        v_image_record.gallery_id,
        v_user_id,
        true
      );
      v_posts_created := v_posts_created + 1;
    END IF;
  END LOOP;
  
  RETURN v_posts_created;
END;
$$;

-- 17. Create storage buckets for avatars and comment images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('comment-images', 'comment-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- 18. RLS Policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 19. RLS Policies for comment-images bucket
CREATE POLICY "Comment images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'comment-images');

CREATE POLICY "Authenticated users can upload comment images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'comment-images' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own comment images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'comment-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);