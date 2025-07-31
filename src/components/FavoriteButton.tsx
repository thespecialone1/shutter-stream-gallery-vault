import { useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface FavoriteButtonProps {
  galleryId: string;
  imageId: string;
  isFavorited: boolean;
  onFavoriteChange: (imageId: string, isFavorited: boolean) => void;
  isPublicGallery?: boolean;
}

export const FavoriteButton = ({
  galleryId,
  imageId,
  isFavorited,
  onFavoriteChange,
  isPublicGallery = false,
}: FavoriteButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const toggleFavorite = async () => {
    // If public gallery and user not authenticated, redirect to auth
    if (isPublicGallery && !user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add favorites",
      });
      navigate("/auth");
      return;
    }

    setIsLoading(true);
    try {
      if (isFavorited) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('gallery_id', galleryId)
          .eq('image_id', imageId);

        if (error) throw error;
        
        onFavoriteChange(imageId, false);
        toast({
          title: "Removed from favorites",
          description: "Image removed from your collection"
        });
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            gallery_id: galleryId,
            image_id: imageId
          });

        if (error) throw error;
        
        onFavoriteChange(imageId, true);
        toast({
          title: "Added to favorites",
          description: "Image saved to your collection"
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleFavorite}
      disabled={isLoading}
      className={`
        p-0 w-full h-full hover:bg-transparent hover:scale-110 transition-all duration-300
        ${isFavorited 
          ? 'text-red-500 hover:text-red-600' 
          : 'text-white/70 hover:text-red-500'
        }
      `}
    >
      <Heart
        className={`h-5 w-5 transition-all duration-300 ${
          isFavorited 
            ? 'fill-current scale-110' 
            : 'hover:scale-110'
        }`}
      />
    </Button>
  );
};