import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowBigUp, ArrowBigDown, MessageCircle, Eye } from "lucide-react";
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
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [voteCount, setVoteCount] = useState(post.like_count);
  const [isVoting, setIsVoting] = useState(false);

  // Load user's current vote
  useEffect(() => {
    if (!user) return;
    
    const loadUserVote = async () => {
      const { data } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      setUserVote(data ? 'up' : null);
    };
    
    loadUserVote();
  }, [user, post.id]);

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to vote",
        variant: "destructive"
      });
      return;
    }

    if (isVoting) return;

    setIsVoting(true);
    const previousVote = userVote;
    const previousCount = voteCount;

    // Optimistic update
    let newCount = voteCount;
    let newVote: 'up' | 'down' | null = voteType;

    if (userVote === voteType) {
      // Unvote
      newVote = null;
      newCount = voteCount - 1;
    } else if (userVote === null) {
      // New upvote
      newCount = voteCount + 1;
    } else {
      // Switch vote (down to up or up to down)
      newCount = voteCount; // For now, just track upvotes
    }

    setUserVote(newVote);
    setVoteCount(newCount);

    try {
      if (newVote === 'up') {
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: post.id, user_id: user.id });
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
        
        if (error) throw error;
      }
    } catch (error) {
      // Revert on error
      setUserVote(previousVote);
      setVoteCount(previousCount);
      console.error('Error voting:', error);
      toast({
        title: "Error",
        description: "Failed to update vote",
        variant: "destructive"
      });
    } finally {
      setIsVoting(false);
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
          {/* Upvote/Downvote */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVote('up')}
              disabled={isVoting}
              className="h-8 w-8 p-0 hover:text-primary"
            >
              <ArrowBigUp 
                className={`h-6 w-6 transition-colors ${
                  userVote === 'up' ? 'fill-primary text-primary' : ''
                }`} 
              />
            </Button>
            <span className="text-sm font-medium min-w-[2ch] text-center">{voteCount}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVote('down')}
              disabled={isVoting}
              className="h-8 w-8 p-0 hover:text-destructive"
            >
              <ArrowBigDown 
                className={`h-6 w-6 transition-colors ${
                  userVote === 'down' ? 'fill-destructive text-destructive' : ''
                }`} 
              />
            </Button>
          </div>
          
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
