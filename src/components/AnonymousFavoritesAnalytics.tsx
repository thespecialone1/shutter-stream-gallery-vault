import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Eye, Download, Users, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/utils';

interface AnonymousFavoritesAnalyticsProps {
  galleryId: string;
}

interface FavoriteAnalytic {
  image_id: string;
  image_filename: string;
  favorite_count: number;
  last_favorited: string;
}

interface SessionStats {
  total_sessions: number;
  total_favorites: number;
  unique_images_favorited: number;
  most_recent_session: string;
}

const AnonymousFavoritesAnalytics = ({ galleryId }: AnonymousFavoritesAnalyticsProps) => {
  const [favoriteAnalytics, setFavoriteAnalytics] = useState<FavoriteAnalytic[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      // Fetch favorite analytics for this gallery
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('anonymous_favorites')
        .select(`
          image_id,
          created_at,
          images!inner(original_filename)
        `)
        .eq('gallery_id', galleryId);

      if (favoritesError) throw favoritesError;

      // Process favorites data to get counts per image
      const favoriteMap = new Map();
      favoritesData?.forEach(fav => {
        const imageId = fav.image_id;
        const existing = favoriteMap.get(imageId);
        if (existing) {
          existing.favorite_count += 1;
          if (new Date(fav.created_at) > new Date(existing.last_favorited)) {
            existing.last_favorited = fav.created_at;
          }
        } else {
          favoriteMap.set(imageId, {
            image_id: imageId,
            image_filename: (fav.images as any).original_filename,
            favorite_count: 1,
            last_favorited: fav.created_at
          });
        }
      });

      const analytics = Array.from(favoriteMap.values())
        .sort((a, b) => b.favorite_count - a.favorite_count);
      
      setFavoriteAnalytics(analytics);

      // Use secure function to get session count without exposing session data
      const { data: sessionCountData } = await supabase
        .rpc('get_gallery_analytics_summary', { gallery_uuid: galleryId });
      
      const sessionCount = sessionCountData?.[0]?.total_views || 0;

      const stats: SessionStats = {
        total_sessions: sessionCount,
        total_favorites: favoritesData?.length || 0,
        unique_images_favorited: favoriteMap.size,
        most_recent_session: favoritesData?.length > 0 
          ? favoritesData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
          : ''
      };

      setSessionStats(stats);
    } catch (error) {
      // Log error without exposing sensitive data
      console.error('Anonymous favorites analytics fetch failed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [galleryId]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-6 bg-muted rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Client Sessions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessionStats?.total_sessions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total access sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Favorites</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessionStats?.total_favorites || 0}</div>
            <p className="text-xs text-muted-foreground">
              Images favorited by clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Popular Images</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessionStats?.unique_images_favorited || 0}</div>
            <p className="text-xs text-muted-foreground">
              Different images favorited
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Activity</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessionStats?.most_recent_session ? formatDate(sessionStats.most_recent_session) : 'None'}
            </div>
            <p className="text-xs text-muted-foreground">
              Most recent client access
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Favorited Images */}
      {favoriteAnalytics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Most Favorited Images</CardTitle>
            <CardDescription>
              See which images your clients love most
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {favoriteAnalytics.slice(0, 10).map((item, index) => (
                <div key={item.image_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium truncate max-w-[200px]">{item.image_filename}</p>
                      <p className="text-sm text-muted-foreground">
                        Last favorited {formatDate(item.last_favorited)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Heart className="h-3 w-3" />
                    {item.favorite_count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {favoriteAnalytics.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No favorites yet</h3>
            <p className="text-muted-foreground">
              When clients start favoriting images, you'll see the analytics here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnonymousFavoritesAnalytics;