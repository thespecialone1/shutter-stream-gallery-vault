import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface FeedPostCardProps {
  post: {
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
  };
  onCommentClick: () => void;
  onImageClick: () => void;
  onPhotographerClick?: () => void;
  isOwnPost?: boolean;
}

export const FeedPostCard = ({ post, onCommentClick, onImageClick, onPhotographerClick, isOwnPost = false }: FeedPostCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [isLiking, setIsLiking] = useState(false);

  // Convert avatar path to URL if needed
  const avatarUrl = post.user_avatar
    ? (post.user_avatar.startsWith('http')
        ? post.user_avatar
        : supabase.storage.from('gallery-images').getPublicUrl(post.user_avatar).data.publicUrl)
    : undefined;

  // Load user's current like status
  useEffect(() => {
    if (!user) return;
    
    const loadLikeStatus = async () => {
      const { data } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      setIsLiked(!!data);
    };
    
    loadLikeStatus();
  }, [user, post.id]);

  // Subscribe to real-time like updates
  useEffect(() => {
    const channel = supabase
      .channel(`post-likes-${post.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_likes',
          filter: `post_id=eq.${post.id}`
        },
        () => {
          // Reload like count from feed_posts table
          supabase
            .from('feed_posts')
            .select('like_count')
            .eq('id', post.id)
            .single()
            .then(({ data }) => {
              if (data) {
                setLikeCount(data.like_count);
              }
            });

          // Reload user's like status
          if (user) {
            supabase
              .from('post_likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', user.id)
              .maybeSingle()
              .then(({ data }) => {
                setIsLiked(!!data);
              });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [post.id, user]);

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to like posts",
        variant: "destructive"
      });
      return;
    }

    if (isLiking) return;

    setIsLiking(true);
    const previousLiked = isLiked;
    const previousCount = likeCount;

    // Optimistic update
    const newIsLiked = !isLiked;
    const newCount = newIsLiked ? likeCount + 1 : likeCount - 1;

    setIsLiked(newIsLiked);
    setLikeCount(newCount);

    try {
      if (newIsLiked) {
        // Add like
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: post.id, user_id: user.id });
        
        if (error) throw error;
      } else {
        // Remove like
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
        
        if (error) throw error;
      }
    } catch (error) {
      // Revert on error
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
      console.error('Error updating like:', error);
      toast({
        title: "Error",
        description: "Failed to update like",
        variant: "destructive"
      });
    } finally {
      setIsLiking(false);
    }
  };

  const initials = post.user_name.substring(0, 2).toUpperCase();

  // Check if user is anonymous (not logged in)
  const isAnonymous = !user;

  return (
    <div className="bg-background rounded-xl overflow-hidden border border-border hover:shadow-lg transition-shadow">
      {/* User Header */}
      <div className="flex items-center gap-3 p-3">
        {isAnonymous ? (
          // Anonymous users can't click profile
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatarUrl} alt={post.user_name} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
        ) : (
          <button onClick={onPhotographerClick} className="focus:outline-none">
            <Avatar className="h-10 w-10 cursor-pointer ring-2 ring-transparent hover:ring-primary/20 transition-all">
              <AvatarImage src={avatarUrl} alt={post.user_name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        )}
        <div className="flex-1 min-w-0">
          {isAnonymous ? (
            <span className="font-medium text-sm">{post.user_name}</span>
          ) : (
            <button 
              onClick={onPhotographerClick}
              className="font-medium text-sm hover:text-primary transition-colors text-left block truncate"
            >
              {post.user_name}
            </button>
          )}
          <p className="text-xs text-muted-foreground">
            {new Date(post.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Image - 4:5 aspect ratio like Instagram */}
      <div 
        className="relative w-full cursor-pointer bg-muted/30"
        onClick={onImageClick}
      >
        <img 
          src={post.image_url} 
          alt={post.caption || 'Feed post'}
          className="w-full aspect-[4/5] object-cover"
          loading="eager"
        />
      </div>

      {/* Actions */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-1">
          {/* Like Button - only show count for anonymous */}
          {isAnonymous ? (
            <div className="flex items-center gap-1.5 px-2 h-8 text-muted-foreground">
              <Heart className="h-4 w-4" />
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={isLiking}
              className="gap-1.5 px-2 h-8 hover:text-destructive"
            >
              <Heart 
                className={`h-4 w-4 transition-all ${
                  isLiked ? 'fill-destructive text-destructive' : ''
                }`} 
              />
              <span className="text-sm font-medium">{likeCount}</span>
            </Button>
          )}
          
          {/* Comments - hide count for anonymous */}
          {isAnonymous ? (
            <div className="flex items-center gap-1.5 px-2 h-8 text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCommentClick}
              className="gap-1.5 px-2 h-8"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm">{post.comment_count}</span>
            </Button>
          )}

          {/* Views - visible to everyone */}
          <div className="flex items-center gap-1 ml-auto text-muted-foreground">
            <Eye className="h-4 w-4" />
            <span className="text-xs">{post.view_count}</span>
          </div>
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="text-sm">
            {isAnonymous ? (
              <span className="font-medium mr-2">{post.user_name}</span>
            ) : (
              <Link to={`/profile/${post.user_id}`} className="font-medium hover:underline mr-2">
                {post.user_name}
              </Link>
            )}
            {post.caption}
          </p>
        )}
      </div>
    </div>
  );
};