import { useState, useEffect } from 'react';
import { Heart, Download, Eye, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';

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
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchFavorites = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_favorites');
      
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
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
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
              {gallery.images.map((favorite) => (
                <div key={favorite.favorite_id} className="group relative">
                  <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                    <img
                      src={getImageUrl(favorite.image_thumbnail_path || favorite.image_full_path)}
                      alt={favorite.image_original_filename}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => downloadImage(favorite)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeFavorite(favorite.favorite_id, favorite.image_id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
    </div>
  );
};