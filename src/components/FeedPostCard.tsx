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
}

export const FeedPostCard = ({ post, onCommentClick, onImageClick }: FeedPostCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [isLiking, setIsLiking] = useState(false);

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

  return (
    <div className="bg-background rounded-2xl overflow-hidden border border-border hover:shadow-lg transition-shadow">
      {/* User Header */}
      <div className="flex items-center gap-3 p-4">
        <Link to={`/profile/${post.user_id}`}>
          <Avatar className="h-10 w-10 cursor-pointer">
            <AvatarImage src={post.user_avatar} alt={post.user_name} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1">
          <Link to={`/profile/${post.user_id}`} className="font-medium hover:underline">
            {post.user_name}
          </Link>
          <p className="text-xs text-muted-foreground">
            {new Date(post.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Image */}
      <div 
        className="relative w-full cursor-pointer bg-muted/30 flex items-center justify-center min-h-[400px]"
        onClick={onImageClick}
      >
        <img 
          src={post.image_url} 
          alt={post.caption || 'Feed post'}
          className="w-full max-h-[600px] object-contain"
          loading="eager"
          onLoad={(e) => {
            console.log('Image loaded successfully:', post.image_url);
          }}
          onError={(e) => {
            console.error('Failed to load image:', post.image_url);
            console.error('Image element:', e.currentTarget);
          }}
        />
      </div>

      {/* Actions */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          {/* Like Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={isLiking}
            className="gap-1.5 px-2 h-8 hover:text-destructive"
          >
            <Heart 
              className={`h-5 w-5 transition-all ${
                isLiked ? 'fill-destructive text-destructive' : ''
              }`} 
            />
            <span className="text-sm font-medium">{likeCount}</span>
          </Button>
          
          {/* Comments */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onCommentClick}
            className="gap-1.5 px-2 h-8"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm">{post.comment_count}</span>
          </Button>

          {/* Views */}
          <div className="flex items-center gap-1 ml-auto text-muted-foreground">
            <Eye className="h-4 w-4" />
            <span className="text-xs">{post.view_count}</span>
          </div>
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="text-sm">
            <Link to={`/profile/${post.user_id}`} className="font-medium hover:underline mr-2">
              {post.user_name}
            </Link>
            {post.caption}
          </p>
        )}
      </div>
    </div>
  );
};
