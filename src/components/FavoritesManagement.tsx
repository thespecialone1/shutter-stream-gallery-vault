import { useState, useEffect } from 'react';
import { Heart, Download, Eye, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { EnhancedImageLightbox } from './EnhancedImageLightbox';
import { DownloadOptionsDialog } from './DownloadOptionsDialog';
import { EnhancedSkeletonLoader, MasonrySkeletonLoader } from './EnhancedSkeletonLoader';

interface FavoriteImage {
  favorite_id: string;
  image_id: string;
  gallery_id: string;
  gallery_name: string;
  gallery_client_name: string;
  image_filename: string;
  image_original_filename: string;
  image_full_path: string;
  image_thumbnail_path: string | null;
  image_width: number | null;
  image_height: number | null;
  favorited_at: string;
}

export const FavoritesManagement = () => {
  const [favorites, setFavorites] = useState<FavoriteImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<FavoriteImage | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchFavorites = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_favorites', {
        user_uuid: user?.id
      });
      
      if (error) throw error;
      
      setFavorites(data || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast({
        title: "Error",
        description: "Failed to load your favorites",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (favoriteId: string, imageId: string) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;

      setFavorites(prev => prev.filter(f => f.favorite_id !== favoriteId));
      toast({
        title: "Removed from favorites",
        description: "The image has been removed from your favorites"
      });
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast({
        title: "Error",
        description: "Failed to remove from favorites",
        variant: "destructive"
      });
    }
  };

  const downloadImage = async (image: FavoriteImage) => {
    try {
      const imageUrl = getImageUrl(image.image_full_path);
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = image.image_original_filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download started",
        description: `Downloading ${image.image_original_filename}`
      });
    } catch (error) {
      console.error('Error downloading image:', error);
      toast({
        title: "Download failed",
        description: "Could not download the image",
        variant: "destructive"
      });
    }
  };

  const getImageUrl = (imagePath: string) => {
    return `${supabase.storage.from("gallery-images").getPublicUrl(imagePath).data.publicUrl}`;
  };

  const openLightbox = (image: FavoriteImage, galleryImages: FavoriteImage[]) => {
    setLightboxImage(image);
    setCurrentImageIndex(galleryImages.findIndex(img => img.favorite_id === image.favorite_id));
  };

  const getCurrentGalleryImages = () => {
    if (!lightboxImage) return [];
    return favorites.filter(fav => fav.gallery_id === lightboxImage.gallery_id);
  };

  const navigateImage = (direction: 'next' | 'prev') => {
    const galleryImages = getCurrentGalleryImages();
    const newIndex = direction === 'next' 
      ? (currentImageIndex + 1) % galleryImages.length
      : (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
    
    setCurrentImageIndex(newIndex);
    setLightboxImage(galleryImages[newIndex]);
  };

  const groupFavoritesByGallery = () => {
    const grouped = favorites.reduce((acc, favorite) => {
      const galleryId = favorite.gallery_id;
      if (!acc[galleryId]) {
        acc[galleryId] = {
          gallery_name: favorite.gallery_name,
          gallery_client_name: favorite.gallery_client_name,
          images: []
        };
      }
      acc[galleryId].images.push(favorite);
      return acc;
    }, {} as Record<string, { gallery_name: string; gallery_client_name: string; images: FavoriteImage[] }>);

    return grouped;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            My Favorites
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MasonrySkeletonLoader count={9} />
        </CardContent>
      </Card>
    );
  }

  if (favorites.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            My Favorites
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
            <p className="text-muted-foreground mb-4">
              Start favoriting images in galleries to see them here
            </p>
            <Link to="/browse">
              <Button>
                <Eye className="w-4 h-4 mr-2" />
                Browse Galleries
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const groupedFavorites = groupFavoritesByGallery();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            My Favorites ({favorites.length})
          </CardTitle>
        </CardHeader>
      </Card>

      {Object.entries(groupedFavorites).map(([galleryId, gallery]) => (
        <Card key={galleryId}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{gallery.gallery_name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Client: {gallery.gallery_client_name} • {gallery.images.length} favorites
                </p>
              </div>
              <Link to={`/gallery/${galleryId}`}>
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Gallery
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {gallery.images.map((favorite, index) => (
                <div key={favorite.favorite_id} className="group relative staggered-item magnetic-hover">
                  <div 
                    className="aspect-square overflow-hidden rounded-lg bg-muted cursor-pointer"
                    onClick={() => openLightbox(favorite, gallery.images)}
                  >
                    <img
                      src={getImageUrl(favorite.image_thumbnail_path || favorite.image_full_path)}
                      alt={favorite.image_original_filename}
                      className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  
                  {/* Fixed positioned overlay with actions */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-lg">
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openLightbox(favorite, gallery.images);
                        }}
                        className="w-10 h-10 rounded-full bg-white/95 hover:bg-white text-black backdrop-blur-sm border-0 hover:scale-110 transition-all duration-200 flex items-center justify-center"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadImage(favorite);
                        }}
                        className="w-10 h-10 rounded-full bg-white/95 hover:bg-white text-black backdrop-blur-sm border-0 hover:scale-110 transition-all duration-200 flex items-center justify-center"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFavorite(favorite.favorite_id, favorite.image_id);
                        }}
                        className="w-10 h-10 rounded-full bg-red-500/95 hover:bg-red-500 text-white backdrop-blur-sm border-0 hover:scale-110 transition-all duration-200 flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Image info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 rounded-b-lg">
                    <p className="text-white text-xs truncate font-medium">
                      {favorite.image_original_filename}
                    </p>
                    <p className="text-white/70 text-xs">
                      Favorited {new Date(favorite.favorited_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Enhanced Image Lightbox */}
      {lightboxImage && (
        <>
          <EnhancedImageLightbox
            isOpen={!!lightboxImage}
            onClose={() => setLightboxImage(null)}
            thumbnailUrl={lightboxImage.image_thumbnail_path ? getImageUrl(lightboxImage.image_thumbnail_path) : getImageUrl(lightboxImage.image_full_path)}
            fullUrl={getImageUrl(lightboxImage.image_full_path)}
            alt={lightboxImage.image_original_filename}
            filename={lightboxImage.image_original_filename}
            onNext={currentImageIndex < getCurrentGalleryImages().length - 1 ? () => navigateImage('next') : undefined}
            onPrevious={currentImageIndex > 0 ? () => navigateImage('prev') : undefined}
            hasNext={currentImageIndex < getCurrentGalleryImages().length - 1}
            hasPrevious={currentImageIndex > 0}
          />
          
          <DownloadOptionsDialog
            isOpen={showDownloadDialog}
            onClose={() => setShowDownloadDialog(false)}
            imageUrl={getImageUrl(lightboxImage.image_full_path)}
            filename={lightboxImage.image_original_filename}
          />
        </>
      )}
    </div>
  );
};