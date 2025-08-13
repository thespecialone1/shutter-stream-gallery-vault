import { useState, useEffect } from 'react';
import { Download, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AnonymousFavoriteButton from './AnonymousFavoriteButton';

interface FavoriteImage {
  id: string;
  full_path: string;
  thumbnail_path: string | null;
  original_filename: string;
  width: number;
  height: number;
  upload_date: string;
  signed_thumbnail_url?: string | null;
  signed_full_url?: string | null;
}

interface AnonymousFavoritesViewProps {
  galleryId: string;
  sessionToken: string;
  images: FavoriteImage[];
}

const AnonymousFavoritesView = ({ galleryId, sessionToken, images }: AnonymousFavoritesViewProps) => {
  const [favoriteImageIds, setFavoriteImageIds] = useState<string[]>([]);
  const [favoriteImages, setFavoriteImages] = useState<FavoriteImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const publicUrl = (path: string) => supabase.storage.from('gallery-images').getPublicUrl(path).data.publicUrl;
  const getThumbUrl = (img: FavoriteImage) => img.signed_thumbnail_url || (img.thumbnail_path ? publicUrl(img.thumbnail_path) : publicUrl(img.full_path));
  const getFullUrl = (img: FavoriteImage) => img.signed_full_url || publicUrl(img.full_path);

  const fetchFavorites = async () => {
    if (!sessionToken) return;
    
    try {
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
        setFavoriteImageIds(favoriteIds);
        
        // Filter images to show only favorites
        const filteredFavorites = images.filter(img => favoriteIds.includes(img.id));
        setFavoriteImages(filteredFavorites);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast.error('Failed to load favorites');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [galleryId, sessionToken, images]);

  const handleFavoriteChange = (imageId: string, isFavorited: boolean) => {
    if (isFavorited) {
      setFavoriteImageIds(prev => [...prev, imageId]);
      const newFavorite = images.find(img => img.id === imageId);
      if (newFavorite) {
        setFavoriteImages(prev => [...prev, newFavorite]);
      }
    } else {
      setFavoriteImageIds(prev => prev.filter(id => id !== imageId));
      setFavoriteImages(prev => prev.filter(img => img.id !== imageId));
    }
  };

  const downloadImage = async (image: FavoriteImage) => {
    try {
      const imageUrl = getFullUrl(image);
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = image.original_filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
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

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (favoriteImages.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No favorites yet</h3>
        <p className="text-muted-foreground">
          Click the heart icon on images to add them to your favorites.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">
          {favoriteImages.length} favorite{favoriteImages.length !== 1 ? 's' : ''}
        </h3>
        {favoriteImages.length > 0 && (
          <Button onClick={downloadAllFavorites} className="gap-2">
            <Download className="h-4 w-4" />
            Download All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {favoriteImages.map((image) => (
          <div
            key={image.id}
            className="group relative aspect-square bg-muted rounded-lg overflow-hidden"
          >
            <img
              src={getThumbUrl(image)}
              alt={image.original_filename}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => downloadImage(image)}
                  className="h-8 w-8 p-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Favorite button and info overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
              <div className="flex justify-between items-end">
                <div className="text-white text-sm truncate">
                  {image.original_filename}
                </div>
                <AnonymousFavoriteButton
                  galleryId={galleryId}
                  imageId={image.id}
                  sessionToken={sessionToken}
                  isFavorited={favoriteImageIds.includes(image.id)}
                  onFavoriteChange={handleFavoriteChange}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnonymousFavoritesView;