import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

interface UnifiedFavoriteButtonProps {
  galleryId: string;
  imageId: string;
  isPublicGallery: boolean;
  sessionToken?: string | null;
  user: User | null;
  isFavorited: boolean;
  onFavoriteChange: (imageId: string, isFavorited: boolean) => void;
}

export const UnifiedFavoriteButton = ({ 
  galleryId, 
  imageId, 
  isPublicGallery,
  sessionToken,
  user,
  isFavorited, 
  onFavoriteChange 
}: UnifiedFavoriteButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const toggleFavorite = async () => {
    // Handle public galleries
    if (isPublicGallery) {
      if (!user) {
        toast.error('Please sign in to save favorites');
        navigate('/auth');
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

          if (error) throw error;
          
          onFavoriteChange(imageId, true);
          toast.success('Added to favorites');
        }
      } catch (error) {
        console.error('Error toggling favorite:', error);
        toast.error('Failed to update favorites');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Handle private galleries with session tokens
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