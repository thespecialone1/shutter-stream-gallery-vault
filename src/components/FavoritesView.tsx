import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FavoriteButton } from "./FavoriteButton";

interface FavoriteImage {
  id: string;
  filename: string;
  thumbnail_path: string | null;
  full_path: string;
  width: number | null;
  height: number | null;
  upload_date: string;
}

interface FavoritesViewProps {
  galleryId: string;
}

export const FavoritesView = ({ galleryId }: FavoritesViewProps) => {
  const [favoriteImages, setFavoriteImages] = useState<FavoriteImage[]>([]);
  const [favoriteImageIds, setFavoriteImageIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getImageUrl = (imagePath: string, isPublic: boolean = true) => {
    const { data } = supabase.storage
      .from('gallery-images')
      .getPublicUrl(imagePath);
    return data.publicUrl;
  };

  const fetchFavorites = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          image_id,
          images!inner(
            id,
            filename,
            thumbnail_path,
            full_path,
            width,
            height,
            upload_date
          )
        `)
        .eq('gallery_id', galleryId);

      if (error) throw error;

      const images = data.map(fav => ({
        id: fav.images.id,
        filename: fav.images.filename,
        thumbnail_path: fav.images.thumbnail_path,
        full_path: fav.images.full_path,
        width: fav.images.width,
        height: fav.images.height,
        upload_date: fav.images.upload_date
      }));

      setFavoriteImages(images);
      setFavoriteImageIds(new Set(images.map(img => img.id)));
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast({
        title: "Error",
        description: "Failed to load favorite images",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFavoriteChange = (imageId: string, isFavorited: boolean) => {
    if (!isFavorited) {
      // Remove from favorites view
      setFavoriteImages(prev => prev.filter(img => img.id !== imageId));
      setFavoriteImageIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [galleryId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-muted-foreground">Loading favorites...</div>
      </div>
    );
  }

  if (favoriteImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-muted-foreground mb-2">No favorite images yet</div>
        <div className="text-sm text-muted-foreground">
          Click the heart icon on any image to add it to your favorites
        </div>
      </div>
    );
  }

  return (
    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
      {favoriteImages.map((image) => (
        <div key={image.id} className="relative group break-inside-avoid mb-4">
          <div className="bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
               style={{ boxShadow: 'var(--shadow-soft)' }}>
            <img
              src={getImageUrl(image.thumbnail_path || image.full_path)}
              alt={image.filename}
              className="w-full h-auto rounded group-hover:scale-[1.02] transition-transform duration-300"
              style={{ 
                aspectRatio: image.width && image.height ? `${image.width}/${image.height}` : 'auto',
                maxHeight: '400px',
                objectFit: 'contain'
              }}
              loading="lazy"
            />
          </div>
          <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
            <FavoriteButton
              galleryId={galleryId}
              imageId={image.id}
              isFavorited={favoriteImageIds.has(image.id)}
              onFavoriteChange={handleFavoriteChange}
            />
          </div>
        </div>
      ))}
    </div>
  );
};