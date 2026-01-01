import { useState, useEffect, useCallback, useRef } from "react";
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
import { PhotographerSidePanel, SideArrowButton } from "@/components/PhotographerSidePanel";

// Intersection Observer hook for view tracking
const useInView = (postId: string, callback: () => void) => {
  const ref = useRef<HTMLDivElement>(null);
  const hasBeenViewed = useRef(false);

  useEffect(() => {
    if (!ref.current || hasBeenViewed.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasBeenViewed.current) {
          hasBeenViewed.current = true;
          callback();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [postId, callback]);

  return ref;
};

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

// Component to track views with intersection observer
const PostItem = ({ post, index, onCommentClick, onImageClick, incrementPostView, postRefs, onPhotographerClick }: { 
  post: FeedPost; 
  index: number;
  onCommentClick: (id: string) => void;
  onImageClick: (index: number) => void;
  incrementPostView: (postId: string) => void;
  postRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  onPhotographerClick: (post: FeedPost) => void;
}) => {
  const viewCallback = useCallback(() => incrementPostView(post.id), [post.id, incrementPostView]);
  const postRef = useInView(post.id, viewCallback);
  
  useEffect(() => {
    const element = postRef.current;
    if (element) {
      postRefs.current.set(post.id, element);
      return () => {
        postRefs.current.delete(post.id);
      };
    }
  }, [post.id, postRef, postRefs]);

  return (
    <div ref={postRef} className="relative">
      <FeedPostCard
        post={post}
        onCommentClick={() => onCommentClick(post.id)}
        onImageClick={() => onImageClick(index)}
        onPhotographerClick={() => onPhotographerClick(post)}
      />
    </div>
  );
};

export default function Feed() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [selectedPhotographer, setSelectedPhotographer] = useState<FeedPost | null>(null);
  const [showPhotographerPanel, setShowPhotographerPanel] = useState(false);
  const lastScrollY = useRef(0);
  const { cachedData, setCache } = useFeedCache<FeedPost[]>('feed-posts');
  const postRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Get current post for side arrows
  const [currentVisiblePost, setCurrentVisiblePost] = useState<FeedPost | null>(null);

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

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('feed-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feed_posts' },
        () => loadFeed()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        () => loadFeed()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Track scroll and current visible post
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
      lastScrollY.current = currentScrollY;
      
      setShowScrollTop(currentScrollY > 500);
      
      // Auto-close comments when scrolling past the post
      if (selectedPostId) {
        const postElement = postRefs.current.get(selectedPostId);
        if (postElement) {
          const rect = postElement.getBoundingClientRect();
          if (rect.bottom < 0 || rect.top > window.innerHeight) {
            setSelectedPostId(null);
          }
        }
      }

      // Find currently visible post for side arrows
      const viewportCenter = window.innerHeight / 2;
      let closestPost: FeedPost | null = null;
      let closestDistance = Infinity;

      postRefs.current.forEach((element, postId) => {
        const rect = element.getBoundingClientRect();
        const postCenter = rect.top + rect.height / 2;
        const distance = Math.abs(postCenter - viewportCenter);
        
        if (distance < closestDistance && rect.top < window.innerHeight && rect.bottom > 0) {
          closestDistance = distance;
          closestPost = posts.find(p => p.id === postId) || null;
        }
      });

      if (closestPost) {
        setCurrentVisiblePost(closestPost);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedPostId, posts]);

  const loadFeed = async () => {
    try {
      const { data: feedPosts, error: postsError } = await supabase
        .from('feed_posts')
        .select(`id, image_id, gallery_id, user_id, caption, like_count, comment_count, view_count, created_at, is_active`)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (postsError) throw postsError;

      if (!feedPosts || feedPosts.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const imageIds = feedPosts.map(p => p.image_id);
      const { data: images } = await supabase
        .from('images')
        .select('id, full_path, thumbnail_path')
        .in('id', imageIds);

      const userIds = [...new Set(feedPosts.map(p => p.user_id))];
      const profileResults = await Promise.all(
        userIds.map(async (userId) => {
          const { data } = await supabase.rpc('get_public_profile', { profile_user_id: userId });
          return data?.[0] || null;
        })
      );

      const imageMap = new Map(images?.map(img => [img.id, img]) || []);
      const profileMap = new Map(profileResults.filter(Boolean).map((p: any) => [p.user_id, p]));

      const enrichedPosts: FeedPost[] = feedPosts.map(post => {
        const image = imageMap.get(post.image_id);
        const profile = profileMap.get(post.user_id);
        const imagePath = image?.full_path || image?.thumbnail_path;
        
        let imageUrl = '';
        if (imagePath) {
          const { data } = supabase.storage.from('gallery-images').getPublicUrl(imagePath);
          imageUrl = data.publicUrl;
        }
        
        return {
          id: post.id,
          image_id: post.image_id,
          image_url: imageUrl,
          caption: post.caption || undefined,
          like_count: post.like_count,
          comment_count: post.comment_count,
          view_count: post.view_count,
          user_id: post.user_id,
          user_name: profile?.display_name || profile?.full_name || 'User',
          user_avatar: profile?.avatar_url,
          created_at: post.created_at
        };
      });

      setPosts(enrichedPosts);
      setCache(enrichedPosts);
      
      // Set initial visible post
      if (enrichedPosts.length > 0 && !currentVisiblePost) {
        setCurrentVisiblePost(enrichedPosts[0]);
      }
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackedViews = useRef(new Set<string>());

  const incrementPostView = useCallback(async (postId: string) => {
    if (trackedViews.current.has(postId)) return;
    trackedViews.current.add(postId);

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

  const handlePhotographerClick = (post: FeedPost) => {
    setSelectedPhotographer(post);
    setShowPhotographerPanel(true);
  };

  const handleSideArrowClick = () => {
    if (currentVisiblePost) {
      setSelectedPhotographer(currentVisiblePost);
      setShowPhotographerPanel(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className={`nav-premium fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${showHeader ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="container mx-auto px-4 sm:px-6 py-3">
          <nav className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Camera className="h-6 w-6 text-foreground" />
              <span className="text-lg font-serif font-medium text-foreground">Pixie</span>
            </Link>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/browse">
                  <Camera className="h-4 w-4 mr-1" />
                  Galleries
                </Link>
              </Button>
              <UserProfileDropdown />
            </div>
          </nav>
        </div>
      </header>

      {/* Side Arrow Buttons - Only show when there are posts */}
      {posts.length > 0 && currentVisiblePost && (
        <>
          <SideArrowButton 
            side="left" 
            onClick={handleSideArrowClick}
            isActive={showPhotographerPanel}
          />
          <SideArrowButton 
            side="right" 
            onClick={handleSideArrowClick}
            isActive={showPhotographerPanel}
          />
        </>
      )}

      {/* Feed Content - Wider layout */}
      <main className="container mx-auto px-4 pt-20 pb-6 max-w-2xl">
        <div className="space-y-6">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-background rounded-2xl border p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="w-full aspect-[4/5] rounded-xl" />
              </div>
            ))
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-serif mb-2">No posts yet</h2>
              <p className="text-muted-foreground mb-6">
                Be the first to share your photos on the feed!
              </p>
              <Button asChild>
                <Link to="/admin">Create a Gallery</Link>
              </Button>
            </div>
          ) : (
            posts.map((post, index) => (
              <PostItem 
                key={post.id} 
                post={post} 
                index={index}
                onCommentClick={setSelectedPostId}
                onImageClick={handleImageClick}
                incrementPostView={incrementPostView}
                postRefs={postRefs}
                onPhotographerClick={handlePhotographerClick}
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

      {/* Photographer Side Panel */}
      {selectedPhotographer && (
        <PhotographerSidePanel
          userId={selectedPhotographer.user_id}
          userName={selectedPhotographer.user_name}
          userAvatar={selectedPhotographer.user_avatar}
          side="right"
          isVisible={showPhotographerPanel}
          onClose={() => setShowPhotographerPanel(false)}
        />
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