import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ShareToFeedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageId: string;
  imageUrl: string;
  galleryId: string;
  userId: string;
  onSuccess?: () => void;
}

export const ShareToFeedDialog = ({
  open,
  onOpenChange,
  imageId,
  imageUrl,
  galleryId,
  userId,
  onSuccess
}: ShareToFeedDialogProps) => {
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleShare = async () => {
    setLoading(true);
    try {
      // Check if post already exists
      const { data: existing } = await supabase
        .from('feed_posts')
        .select('id')
        .eq('image_id', imageId)
        .eq('gallery_id', galleryId)
        .single();

      if (existing) {
        toast({
          title: "Already posted",
          description: "This image is already in the feed",
          variant: "destructive"
        });
        return;
      }

      // Create feed post
      const { error } = await supabase
        .from('feed_posts')
        .insert({
          image_id: imageId,
          gallery_id: galleryId,
          user_id: userId,
          caption: caption.trim() || null,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Posted to feed!"
      });
      
      setCaption("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error sharing to feed:', error);
      toast({
        title: "Error",
        description: "Failed to share to feed",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share to Feed</DialogTitle>
          <DialogDescription>
            Add this photo to the public feed
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="aspect-square w-full overflow-hidden rounded-lg">
            <img 
              src={imageUrl} 
              alt="Preview" 
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="caption">Caption (optional)</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              maxLength={500}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground text-right">
              {caption.length}/500
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleShare}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Post to Feed
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
