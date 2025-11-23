import { useState, useEffect } from "react";
import { X, Send, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  comment_text: string;
  image_url?: string;
  created_at: string;
}

interface CommentDrawerProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CommentDrawer = ({ postId, isOpen, onClose }: CommentDrawerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && postId) {
      loadComments();
    }
  }, [isOpen, postId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const { data: commentsData, error } = await supabase
        .from('post_comments')
        .select(`
          id,
          user_id,
          comment_text,
          image_url,
          created_at
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch user profiles for comments
      const userIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(
        profiles?.map(p => [p.user_id, p]) || []
      );

      const enrichedComments = commentsData?.map(comment => ({
        ...comment,
        user_name: profileMap.get(comment.user_id)?.display_name || 
                   profileMap.get(comment.user_id)?.full_name || 
                   'User',
        user_avatar: profileMap.get(comment.user_id)?.avatar_url
          ? supabase.storage.from('gallery-images').getPublicUrl(profileMap.get(comment.user_id)!.avatar_url).data.publicUrl
          : undefined
      })) || [];

      setComments(enrichedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to comment",
        variant: "destructive"
      });
      return;
    }

    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          comment_text: newComment.trim()
        });

      if (error) throw error;

      setNewComment("");
      await loadComments();
      
      toast({
        title: "Comment posted",
        description: "Your comment has been added"
      });
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-200" onClick={onClose} />
      
      {/* Drawer */}
      <div 
        className={`fixed right-0 top-0 bottom-0 w-full max-w-md bg-background shadow-2xl border-l border-border z-50 transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">Comments</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Comments List */}
        <ScrollArea className="flex-1 p-4">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Link to={`/profile/${comment.user_id}`}>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.user_avatar} alt={comment.user_name} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {comment.user_name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1">
                    <div className="bg-muted rounded-2xl px-3 py-2">
                      <Link 
                        to={`/profile/${comment.user_id}`}
                        className="font-medium text-sm hover:underline"
                      >
                        {comment.user_name}
                      </Link>
                      <p className="text-sm mt-1">{comment.comment_text}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-3">
                      {new Date(comment.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Comment Input */}
        {user && (
          <div className="p-4 border-t bg-background shrink-0">
            <div className="flex gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="min-h-[40px] max-h-[120px] resize-none"
                maxLength={500}
                disabled={submitting}
              />
              <Button 
                onClick={handleSubmit}
                disabled={!newComment.trim() || submitting}
                size="icon"
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
