-- Reset all feed post view counts to 0
UPDATE public.feed_posts SET view_count = 0;

-- Reset all gallery view counts to 0
UPDATE public.galleries SET view_count = 0;