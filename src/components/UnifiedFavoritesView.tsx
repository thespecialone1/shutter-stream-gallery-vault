import { useState, useEffect } from 'react';
import { Download, Heart, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { FavoritesViewSkeleton } from './SkeletonLoader';

interface FavoriteImage {
  id: string;
  full_path: string;
  thumbnail_path: string | null;
  original_filename: string;
  filename: string;
  width: number | null;
  height: number | null;
  upload_date: string;
  signed_thumbnail_url?: string | null;
  signed_full_url?: string | null;
}

interface UnifiedFavoritesViewProps {
  galleryId: string;
  isPublicGallery: boolean;
  sessionToken?: string | null;
  user: User | null;
  images: FavoriteImage[];
  favoriteImageIds: Set<string>;
  onFavoriteChange: (imageId: string, isFavorited: boolean) => void;
}

export const UnifiedFavoritesView = ({ 
  galleryId, 
  isPublicGallery, 
  sessionToken, 
  user, 
  images,
  favoriteImageIds
}: UnifiedFavoritesViewProps) => {
  const [favoriteImages, setFavoriteImages] = useState<FavoriteImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getImageUrl = (imagePath: string) => {
    const { data } = supabase.storage
      .from('gallery-images')
      .getPublicUrl(imagePath);
    return data.publicUrl;
  };

  const fetchFavorites = async () => {
    setIsLoading(true);
    try {
      if (isPublicGallery) {
        // For public galleries, require user authentication
        if (!user) {
          setFavoriteImages([]);
          setIsLoading(false);
          return;
        }

        // Fetch user-based favorites for public galleries
        const { data, error } = await supabase
          .from('favorites')
          .select(`
            image_id,
            images!inner(
              id,
              filename,
              original_filename,
              thumbnail_path,
              full_path,
              width,
              height,
              upload_date
            )
          `)
          .eq('gallery_id', galleryId)
          .eq('user_id', user.id);

        if (error) throw error;

        const images = data.map(fav => ({
          id: fav.images.id,
          filename: fav.images.filename,
          original_filename: fav.images.original_filename,
          thumbnail_path: fav.images.thumbnail_path,
          full_path: fav.images.full_path,
          width: fav.images.width,
          height: fav.images.height,
          upload_date: fav.images.upload_date
        }));

        setFavoriteImages(images);
      } else {
        // For private galleries, use session-based favorites
        if (!sessionToken) {
          setFavoriteImages([]);
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke('anonymous-favorites', {
          body: {
            galleryId,
            sessionToken,
            action: 'list'
          }
        });

        if (error) throw error;

        if (data.success) {
          const favoriteIds = data.favorites.map((fav: any) => fav.image_id);
          const filteredFavorites = images.filter(img => favoriteIds.includes(img.id));
          setFavoriteImages(filteredFavorites);
        }
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast.error('Failed to load favorites');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadImage = async (image: FavoriteImage) => {
    try {
      const imageUrl = image.signed_full_url || getImageUrl(image.full_path);
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = image.original_filename || image.filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      toast.success('Image downloaded successfully');
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Failed to download image');
    }
  };

  const downloadAllFavorites = async () => {
    if (favoriteImages.length === 0) return;
    
    toast.promise(
      Promise.all(favoriteImages.map(img => downloadImage(img))),
      {
        loading: 'Downloading all favorites...',
        success: 'All favorites downloaded successfully',
        error: 'Failed to download some images'
      }
    );
  };

  useEffect(() => {
    fetchFavorites();
  }, [galleryId, sessionToken, user, images]);

  if (isLoading) {
    return <FavoritesViewSkeleton />;
  }

  // Show sign-in requirement for public galleries without user
  if (isPublicGallery && !user) {
    return (
      <div className="text-center py-20 fade-in">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center mx-auto mb-8">
          <Heart className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="heading-lg mb-4">Sign In to Save Favorites</h3>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Sign in with Google to save your favorite images and access them across sessions.
        </p>
        <Button asChild className="btn-premium">
          <Link to="/auth">Sign In with Google</Link>
        </Button>
      </div>
    );
  }

  // Show empty state
  if (favoriteImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center fade-in">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center mx-auto mb-8">
          <Heart className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="heading-lg mb-4">No Favorites Yet</h3>
        <p className="text-muted-foreground mb-8 max-w-md">
          Start building your collection by clicking the heart icon on images you love. 
          Your favorites will appear here for easy access.
        </p>
        <div className="flex items-center gap-2 px-6 py-3 bg-accent/20 rounded-full border border-accent/30">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">Tap the heart to save images</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in">
      {/* Favorites Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="heading-lg">Your Favorites</h3>
          <p className="text-muted-foreground">
            {favoriteImages.length} image{favoriteImages.length !== 1 ? 's' : ''} in your collection
          </p>
        </div>
        {favoriteImages.length > 0 && (
          <Button onClick={downloadAllFavorites} className="btn-premium">
            <Download className="w-4 h-4 mr-2" />
            Download All
          </Button>
        )}
      </div>

      {/* Premium Masonry Grid for Favorites */}
      <div className="masonry-grid">
        {favoriteImages.map((image) => (
          <div key={image.id} className="masonry-item group relative overflow-hidden rounded-lg bg-white shadow-sm hover:shadow-lg transition-all duration-500">
            <div className="relative image-hover-effect">
              <img
                src={image.signed_thumbnail_url || getImageUrl(image.thumbnail_path || image.full_path)}
                alt={image.original_filename || image.filename}
                className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                style={{ 
                  aspectRatio: image.width && image.height ? `${image.width}/${image.height}` : 'auto',
                }}
                loading="lazy"
              />
              
              {/* Premium Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Premium Action Buttons */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                <Button
                  size="sm"
                  onClick={() => downloadImage(image)}
                  className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white text-primary border-0 shadow-lg hover:scale-110 transition-all duration-300"
                >
                  <Download className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Premium Favorite Button */}
            <div className="favorite-btn active">
              <Heart className="h-5 w-5 fill-current text-red-500" />
            </div>

            {/* Image Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <p className="text-white text-sm font-medium truncate">
                {image.original_filename || image.filename}
              </p>
              <p className="text-white/70 text-xs">
                Added {new Date(image.upload_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};