import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AnonymousFavoriteButtonProps {
  galleryId: string;
  imageId: string;
  sessionToken: string;
  isFavorited: boolean;
  onFavoriteChange: (imageId: string, isFavorited: boolean) => void;
}

const AnonymousFavoriteButton = ({ 
  galleryId, 
  imageId, 
  sessionToken,
  isFavorited, 
  onFavoriteChange 
}: AnonymousFavoriteButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const toggleFavorite = async () => {
    if (!sessionToken) {
      toast.error('Session expired. Please refresh the page.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('anonymous-favorites', {
        body: {
          galleryId,
          imageId,
          sessionToken,
          action: 'toggle'
        }
      });

      if (error) throw error;

      if (data.success) {
        const newFavoriteState = data.is_favorited;
        onFavoriteChange(imageId, newFavoriteState);
        toast.success(
          newFavoriteState ? 'Added to favorites' : 'Removed from favorites'
        );
      } else {
        throw new Error(data.message || 'Failed to update favorite');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite. Please try again.');
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
      className={`h-9 w-9 p-0 transition-colors ${
        isFavorited 
          ? 'text-red-500 hover:text-red-600' 
          : 'text-muted-foreground hover:text-red-500'
      }`}
    >
      <Heart 
        className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} 
      />
    </Button>
  );
};

export default AnonymousFavoriteButton;