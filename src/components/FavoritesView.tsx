import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FavoriteButton } from "./FavoriteButton";
import { Button } from "@/components/ui/button";
import { Download, Heart, Sparkles } from "lucide-react";
import { FavoritesViewSkeleton } from "./SkeletonLoader";

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

  const getImageUrl = (imagePath: string) => {
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

  const downloadImage = async (image: FavoriteImage) => {
    try {
      const imageUrl = getImageUrl(image.full_path);
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = image.filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      toast({
        title: "Download started",
        description: `Downloading ${image.filename}`,
      });
    } catch (error) {
      console.error('Error downloading image:', error);
      toast({
        title: "Download failed",
        description: "Failed to download image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const downloadAllFavorites = async () => {
    if (favoriteImages.length === 0) return;
    
    toast({
      title: "Download started",
      description: `Downloading ${favoriteImages.length} favorite image${favoriteImages.length > 1 ? 's' : ''}`,
    });

    // Download each image individually
    for (const image of favoriteImages) {
      await downloadImage(image);
      // Add a small delay to prevent overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [galleryId]);

  if (isLoading) {
    return <FavoritesViewSkeleton />;
  }

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
          <span className="text-sm font-medium text-primary">Tip: Tap the heart to save images</span>
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
                src={getImageUrl(image.thumbnail_path || image.full_path)}
                alt={image.filename}
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
              <FavoriteButton
                galleryId={galleryId}
                imageId={image.id}
                isFavorited={favoriteImageIds.has(image.id)}
                onFavoriteChange={handleFavoriteChange}
              />
            </div>

            {/* Image Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <p className="text-white text-sm font-medium truncate">
                {image.filename}
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