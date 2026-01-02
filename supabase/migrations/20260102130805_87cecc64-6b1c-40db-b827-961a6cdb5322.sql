-- Fix favorites constraint - remove the incorrect one that prevents multiple users from favoriting the same image
ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_gallery_id_image_id_key;

-- Create notifications table for like/comment/message notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  sender_id uuid,
  type text NOT NULL CHECK (type IN ('like', 'comment', 'message', 'follow', 'booking')),
  reference_id uuid,
  reference_type text,
  message text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = recipient_id);

-- System can insert notifications
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = recipient_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = recipient_id);

-- Create trigger function for like notifications
CREATE OR REPLACE FUNCTION public.create_like_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner_id uuid;
  sender_name text;
BEGIN
  -- Get the post owner
  SELECT user_id INTO post_owner_id FROM feed_posts WHERE id = NEW.post_id;
  
  -- Don't notify yourself
  IF post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get sender display name
  SELECT COALESCE(display_name, full_name) INTO sender_name FROM profiles WHERE user_id = NEW.user_id;
  
  -- Create notification
  INSERT INTO notifications (recipient_id, sender_id, type, reference_id, reference_type, message)
  VALUES (post_owner_id, NEW.user_id, 'like', NEW.post_id, 'feed_post', sender_name || ' liked your photo');
  
  RETURN NEW;
END;
$$;

-- Create trigger for likes
DROP TRIGGER IF EXISTS on_post_like_notification ON post_likes;
CREATE TRIGGER on_post_like_notification
AFTER INSERT ON post_likes
FOR EACH ROW
EXECUTE FUNCTION create_like_notification();

-- Create trigger function for comment notifications
CREATE OR REPLACE FUNCTION public.create_comment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner_id uuid;
  sender_name text;
BEGIN
  -- Get the post owner
  SELECT user_id INTO post_owner_id FROM feed_posts WHERE id = NEW.post_id;
  
  -- Don't notify yourself
  IF post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get sender display name
  SELECT COALESCE(display_name, full_name) INTO sender_name FROM profiles WHERE user_id = NEW.user_id;
  
  -- Create notification
  INSERT INTO notifications (recipient_id, sender_id, type, reference_id, reference_type, message)
  VALUES (post_owner_id, NEW.user_id, 'comment', NEW.post_id, 'feed_post', sender_name || ' commented on your photo');
  
  RETURN NEW;
END;
$$;

-- Create trigger for comments
DROP TRIGGER IF EXISTS on_post_comment_notification ON post_comments;
CREATE TRIGGER on_post_comment_notification
AFTER INSERT ON post_comments
FOR EACH ROW
EXECUTE FUNCTION create_comment_notification();