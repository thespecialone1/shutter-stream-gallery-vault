import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Camera, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";
import { FeedPostCard } from "@/components/FeedPostCard";
import { CommentDrawer } from "@/components/CommentDrawer";
import { ImageLightbox } from "@/components/ImageLightbox";
import { useFeedCache } from "@/hooks/useFeedCache";
import { Skeleton } from "@/components/ui/skeleton";

interface FeedPost {
  id: string;
  image_id: string;
  image_url: string;
  caption?: string;
  like_count: number;
  comment_count: number;
  view_count: number;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  created_at: string;
}

export default function Feed() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { cachedData, setCache } = useFeedCache<FeedPost[]>('feed-posts');

  // Load cached data immediately
  useEffect(() => {
    if (cachedData && cachedData.length > 0) {
      setPosts(cachedData);
      setLoading(false);
    }
  }, [cachedData]);

  // Load fresh data
  useEffect(() => {
    loadFeed();
  }, []);

  // Track scroll for "scroll to top" button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadFeed = async () => {
    try {
      // Get feed posts with all data
      const { data: feedPosts, error: postsError } = await supabase
        .from('feed_posts')
        .select(`
          id,
          image_id,
          gallery_id,
          user_id,
          caption,
          like_count,
          comment_count,
          view_count,
          created_at,
          is_active
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (postsError) throw postsError;

      if (!feedPosts || feedPosts.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      // Get image data
      const imageIds = feedPosts.map(p => p.image_id);
      const { data: images } = await supabase
        .from('images')
        .select('id, full_path, thumbnail_path')
        .in('id', imageIds);

      // Get user profiles
      const userIds = [...new Set(feedPosts.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, full_name, avatar_url')
        .in('user_id', userIds);

      // Create lookup maps
      const imageMap = new Map(images?.map(img => [img.id, img]) || []);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Enrich posts with image URLs and user data
      const enrichedPosts: FeedPost[] = feedPosts.map(post => {
        const image = imageMap.get(post.image_id);
        const profile = profileMap.get(post.user_id);
        const imagePath = image?.thumbnail_path || image?.full_path;
        
        return {
          id: post.id,
          image_id: post.image_id,
          image_url: imagePath 
            ? supabase.storage.from('gallery-images').getPublicUrl(imagePath).data.publicUrl 
            : '',
          caption: post.caption || undefined,
          like_count: post.like_count,
          comment_count: post.comment_count,
          view_count: post.view_count,
          user_id: post.user_id,
          user_name: profile?.display_name || profile?.full_name || 'User',
          user_avatar: profile?.avatar_url
            ? supabase.storage.from('gallery-images').getPublicUrl(profile.avatar_url).data.publicUrl
            : undefined,
          created_at: post.created_at
        };
      });

      setPosts(enrichedPosts);
      setCache(enrichedPosts); // Cache for offline viewing
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementPostView = useCallback(async (postId: string) => {
    try {
      await supabase.rpc('increment_post_views', { post_id: postId });
    } catch (error) {
      console.error('Error incrementing view:', error);
    }
  }, []);

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    incrementPostView(posts[index].id);
  };

  const handleCloseLightbox = () => setLightboxIndex(null);

  const handleNextImage = () => {
    if (lightboxIndex !== null && lightboxIndex < posts.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
      incrementPostView(posts[lightboxIndex + 1].id);
    }
  };

  const handlePreviousImage = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
      incrementPostView(posts[lightboxIndex - 1].id);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="nav-premium fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <nav className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Camera className="h-4 w-4 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div>
                <span className="text-lg sm:text-2xl font-serif font-medium text-foreground">Pixie Studio</span>
                <p className="text-xs text-muted-foreground -mt-1 hidden sm:block">Social Feed</p>
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/'}
                className="hidden sm:flex"
              >
                <Camera className="h-4 w-4 mr-2" />
                Back to Galleries
              </Button>
              <UserProfileDropdown />
            </div>
          </nav>
        </div>
      </header>

      {/* Feed Content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="space-y-6">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-background rounded-2xl border p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="w-full h-96 rounded-xl" />
              </div>
            ))
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-serif mb-2">No posts yet</h2>
              <p className="text-muted-foreground">
                Be the first to share your photos on the feed!
              </p>
            </div>
          ) : (
            posts.map((post, index) => (
              <FeedPostCard
                key={post.id}
                post={post}
                onCommentClick={() => setSelectedPostId(post.id)}
                onImageClick={() => handleImageClick(index)}
              />
            ))
          )}
        </div>
      </main>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 rounded-full w-12 h-12 shadow-lg z-40"
          size="icon"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}

      {/* Comment Drawer */}
      {selectedPostId && (
        <CommentDrawer
          postId={selectedPostId}
          isOpen={!!selectedPostId}
          onClose={() => setSelectedPostId(null)}
        />
      )}

      {/* Image Lightbox */}
      {lightboxIndex !== null && posts[lightboxIndex] && (
        <ImageLightbox
          isOpen={true}
          onClose={handleCloseLightbox}
          imageUrl={posts[lightboxIndex].image_url}
          thumbnailUrl={posts[lightboxIndex].image_url}
          alt={posts[lightboxIndex].caption || 'Feed image'}
          filename={posts[lightboxIndex].caption || 'image'}
          onNext={lightboxIndex < posts.length - 1 ? handleNextImage : undefined}
          onPrevious={lightboxIndex > 0 ? handlePreviousImage : undefined}
          hasNext={lightboxIndex < posts.length - 1}
          hasPrevious={lightboxIndex > 0}
        />
      )}
    </div>
  );
}
