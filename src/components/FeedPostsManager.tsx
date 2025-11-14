import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Eye, EyeOff, Edit2, Save, X, Heart, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface FeedPost {
  id: string;
  image_id: string;
  caption: string | null;
  is_active: boolean;
  like_count: number;
  comment_count: number;
  view_count: number;
  created_at: string;
  image_url?: string;
}

interface FeedPostsManagerProps {
  galleryId: string;
}

export const FeedPostsManager = ({ galleryId }: FeedPostsManagerProps) => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadPosts();
  }, [galleryId]);

  const loadPosts = async () => {
    try {
      const { data: feedPosts, error } = await supabase
        .from('feed_posts')
        .select('*')
        .eq('gallery_id', galleryId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get image URLs
      if (feedPosts && feedPosts.length > 0) {
        const imageIds = feedPosts.map(p => p.image_id);
        const { data: images } = await supabase
          .from('images')
          .select('id, thumbnail_path, full_path')
          .in('id', imageIds);

        const imageMap = new Map(images?.map(img => [
          img.id, 
          supabase.storage.from('gallery-images').getPublicUrl(img.thumbnail_path || img.full_path).data.publicUrl
        ]));

        const enrichedPosts = feedPosts.map(post => ({
          ...post,
          image_url: imageMap.get(post.image_id) || ''
        }));

        setPosts(enrichedPosts);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error loading feed posts:', error);
      toast({
        title: "Error",
        description: "Failed to load feed posts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (postId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('feed_posts')
        .update({ is_active: !currentActive })
        .eq('id', postId);

      if (error) throw error;

      setPosts(posts.map(p => p.id === postId ? { ...p, is_active: !currentActive } : p));
      toast({
        title: "Success",
        description: `Post ${!currentActive ? 'activated' : 'deactivated'}`
      });
    } catch (error) {
      console.error('Error toggling post:', error);
      toast({
        title: "Error",
        description: "Failed to update post",
        variant: "destructive"
      });
    }
  };

  const startEdit = (post: FeedPost) => {
    setEditingPostId(post.id);
    setEditCaption(post.caption || '');
  };

  const cancelEdit = () => {
    setEditingPostId(null);
    setEditCaption('');
  };

  const saveCaption = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('feed_posts')
        .update({ caption: editCaption })
        .eq('id', postId);

      if (error) throw error;

      setPosts(posts.map(p => p.id === postId ? { ...p, caption: editCaption } : p));
      setEditingPostId(null);
      toast({
        title: "Success",
        description: "Caption updated"
      });
    } catch (error) {
      console.error('Error updating caption:', error);
      toast({
        title: "Error",
        description: "Failed to update caption",
        variant: "destructive"
      });
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('feed_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      setPosts(posts.filter(p => p.id !== postId));
      toast({
        title: "Success",
        description: "Post deleted"
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading posts...</div>;
  }

  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground mb-4">No feed posts yet.</p>
          <p className="text-sm text-muted-foreground">
            Use the "Share to Feed" button on images in the Manage tab to create posts.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Feed Posts ({posts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post) => (
              <Card key={post.id} className={!post.is_active ? 'opacity-50' : ''}>
                <CardContent className="p-4 space-y-3">
                  {post.image_url && (
                    <img 
                      src={post.image_url} 
                      alt="Post" 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex gap-3">
                      <span className="flex items-center gap-1">
                        <Heart className="h-4 w-4" />
                        {post.like_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        {post.comment_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {post.view_count}
                      </span>
                    </div>
                  </div>

                  {editingPostId === post.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editCaption}
                        onChange={(e) => setEditCaption(e.target.value)}
                        placeholder="Caption (optional)"
                        maxLength={500}
                        className="min-h-[80px]"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveCaption(post.id)}>
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm line-clamp-2 min-h-[40px]">
                        {post.caption || <span className="text-muted-foreground italic">No caption</span>}
                      </p>
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <div className="flex items-center gap-2 flex-1">
                          <Switch
                            checked={post.is_active}
                            onCheckedChange={() => toggleActive(post.id, post.is_active)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {post.is_active ? 'Active' : 'Hidden'}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(post)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deletePost(post.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
