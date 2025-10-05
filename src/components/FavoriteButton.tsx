import { useState, useRef } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { HeartParticles } from './HeartParticles';

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
  const [showParticles, setShowParticles] = useState(false);
  const navigate = useNavigate();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingActionRef = useRef<boolean | null>(null);

  const toggleFavorite = async () => {
    // Clear any pending debounced action
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Store the intended state
    const targetState = !isFavorited;
    pendingActionRef.current = targetState;

    // Optimistically update UI
    onFavoriteChange(imageId, targetState);

    // Debounce the actual API call
    debounceTimerRef.current = setTimeout(async () => {
      await performFavoriteAction(targetState);
    }, 300);
  };

  const performFavoriteAction = async (shouldBeFavorited: boolean) => {
    if (!user) {
      toast.error('Please sign in to save favorites');
      navigate('/auth');
      // Revert optimistic update
      onFavoriteChange(imageId, !shouldBeFavorited);
      return;
    }

    setIsLoading(true);
    try {
      if (!shouldBeFavorited) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('gallery_id', galleryId)
          .eq('image_id', imageId)
          .eq('user_id', user.id);

        if (error) throw error;
        
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
            return;
          }
          throw error;
        }
        
        setShowParticles(true);
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
      // Revert optimistic update on error
      onFavoriteChange(imageId, !shouldBeFavorited);
    } finally {
      setIsLoading(false);
      pendingActionRef.current = null;
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleFavorite}
      disabled={isLoading}
      className={`favorite-button-enhanced h-9 w-9 p-0 transition-all duration-300 group relative ${
        isFavorited 
          ? 'text-red-500 hover:text-red-600 scale-110' 
          : 'text-muted-foreground hover:text-red-500'
      }`}
    >
      <Heart 
        className={`h-4 w-4 transition-all duration-300 ${
          isFavorited ? 'fill-current' : 'group-hover:scale-110'
        }`} 
      />
      <HeartParticles 
        trigger={showParticles} 
        onComplete={() => setShowParticles(false)} 
      />
    </Button>
  );
};