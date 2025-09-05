import { useState, useEffect } from 'react';
import { Heart, Users, TrendingUp, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GalleryFavoritesAnalyticsProps {
  galleryId: string;
}

interface FavoritesAnalytics {
  total_favorites: number;
  unique_users: number;
  most_favorited_images: Array<{
    image_id: string;
    filename: string;
    original_filename: string;
    count: number;
  }>;
  recent_favorites: Array<{
    user_id: string;
    user_email: string | null;
    image_id: string;
    filename: string;
    original_filename: string;
    favorited_at: string;
  }>;
}

export const GalleryFavoritesAnalytics = ({ galleryId }: GalleryFavoritesAnalyticsProps) => {
  const [analytics, setAnalytics] = useState<FavoritesAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_gallery_favorites_analytics', {
        gallery_uuid: galleryId
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        setAnalytics({
          total_favorites: result.total_favorites,
          unique_users: result.unique_users,
          most_favorited_images: Array.isArray(result.most_favorited_images) ? result.most_favorited_images as any[] : [],
          recent_favorites: Array.isArray(result.recent_favorites) ? result.recent_favorites as any[] : []
        });
      } else {
        setAnalytics({
          total_favorites: 0,
          unique_users: 0,
          most_favorited_images: [],
          recent_favorites: []
        });
      }
    } catch (error) {
      console.error('Error fetching favorites analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load favorites analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [galleryId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Favorites Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics || analytics.total_favorites === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Favorites Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
            <p className="text-muted-foreground">
              Share your gallery to start collecting favorites from viewers!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Favorites</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_favorites}</div>
            <p className="text-xs text-muted-foreground">
              Images favorited by viewers
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.unique_users}</div>
            <p className="text-xs text-muted-foreground">
              People who favorited images
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Favorites Breakdown
              </CardTitle>
              <CardDescription>
                See which images are most popular with your viewers
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAnalytics}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="popular-images" className="w-full">
            <TabsList>
              <TabsTrigger value="popular-images">Popular Images</TabsTrigger>
              <TabsTrigger value="recent-activity">Recent Activity</TabsTrigger>
            </TabsList>
            
            <TabsContent value="popular-images" className="space-y-4">
              <h3 className="text-lg font-semibold">Most Favorited Images</h3>
              {analytics.most_favorited_images.length > 0 ? (
                <div className="space-y-2">
                  {analytics.most_favorited_images.map((image, index) => (
                    <div key={image.image_id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <div>
                          <p className="font-medium">{image.original_filename}</p>
                          <p className="text-sm text-muted-foreground">{image.filename}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        <Heart className="w-3 h-3 mr-1 fill-current" />
                        {image.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No images have been favorited yet.</p>
              )}
            </TabsContent>
            
            <TabsContent value="recent-activity" className="space-y-4">
              <h3 className="text-lg font-semibold">Recent Favorites</h3>
              {analytics.recent_favorites.length > 0 ? (
                <div className="space-y-3">
                  {analytics.recent_favorites.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{activity.original_filename}</p>
                        <p className="text-sm text-muted-foreground">
                          Favorited by {activity.user_email || 'Anonymous User'}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(activity.favorited_at)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No recent activity.</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};