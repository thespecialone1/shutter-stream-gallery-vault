import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

interface FavoriteButtonProps {
  galleryId: string;
  imageId: string;
  user: User | null;
  isFavorited: boolean;
  onFavoriteChange: (imageId: string, isFavorited: boolean) => void;
}

export const FavoriteButton = ({ 
  galleryId, 
  imageId, 
  user,
  isFavorited, 
  onFavoriteChange 
}: FavoriteButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const toggleFavorite = async () => {
    if (!user) {
      toast.error('Please sign in to save favorites');
      navigate('/auth');
      return;
    }

    // Check if already favorited to prevent duplicates
    if (isFavorited) {
      toast.info('This image is already in your favorites');
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
          .eq('image_id', imageId)
          .eq('user_id', user.id);

        if (error) throw error;
        
        onFavoriteChange(imageId, false);
        toast.success('Removed from favorites');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            gallery_id: galleryId,
            image_id: imageId,
            user_id: user.id
          });

        if (error) {
          // Handle duplicate favorite error gracefully
          if (error.code === '23505') {
            toast.info('This image is already in your favorites');
            onFavoriteChange(imageId, true);
            return;
          }
          throw error;
        }
        
        onFavoriteChange(imageId, true);
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
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