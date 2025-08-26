import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Heart, Users, TrendingUp, Image as ImageIcon, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FavoritesAnalyticsProps {
  galleryId: string;
}

interface UserFavorite {
  sessionToken: string;
  clientIP: string;
  userAgent: string;
  sessionCreated: string;
  totalFavorites: number;
  favorites: Array<{
    imageId: string;
    filename: string;
    originalFilename: string;
    favoritedAt: string;
  }>;
}

interface TopImage {
  imageId: string;
  filename: string;
  originalFilename: string;
  count: number;
}

interface AnalyticsData {
  summary: {
    totalFavorites: number;
    uniqueUsers: number;
    averageFavoritesPerUser: number;
  };
  topImages: TopImage[];
  userBreakdown: UserFavorite[];
  recentActivity: any[];
}

export const FavoritesAnalytics = ({ galleryId }: FavoritesAnalyticsProps) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchAnalytics = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `https://xcucqsonzfovlcxktxiy.supabase.co/functions/v1/gallery-favorites-analytics`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ galleryId })
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        throw new Error(data.message || 'Failed to fetch analytics');
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
  }, [galleryId, user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const maskIP = (ip: string) => {
    if (!ip || ip === 'unknown') return 'Unknown';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***.***`;
    }
    return ip.substring(0, 8) + '***';
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

  if (!analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Favorites Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No favorites data available yet. Share your gallery to start collecting favorites!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Favorites</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.summary.totalFavorites}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.summary.uniqueUsers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Visitor</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.summary.averageFavoritesPerUser}</div>
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
                Favorites Analytics
              </CardTitle>
              <CardDescription>
                Track which images visitors are favoriting and user engagement patterns
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAnalytics}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="top-images" className="w-full">
            <TabsList>
              <TabsTrigger value="top-images">Popular Images</TabsTrigger>
              <TabsTrigger value="users">Visitor Breakdown</TabsTrigger>
              <TabsTrigger value="recent">Recent Activity</TabsTrigger>
            </TabsList>
            
            <TabsContent value="top-images" className="space-y-4">
              <h3 className="text-lg font-semibold">Most Favorited Images</h3>
              {analytics.topImages.length > 0 ? (
                <div className="space-y-2">
                  {analytics.topImages.map((image, index) => (
                    <div key={image.imageId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <div>
                          <p className="font-medium">{image.originalFilename}</p>
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
            
            <TabsContent value="users" className="space-y-4">
              <h3 className="text-lg font-semibold">Visitor Engagement</h3>
              {analytics.userBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {analytics.userBreakdown.map((user, index) => (
                    <Card key={user.sessionToken} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Visitor #{index + 1}</Badge>
                          <Badge variant="secondary">
                            {user.totalFavorites} favorites
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(user.sessionCreated)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>IP: {maskIP(user.clientIP)}</p>
                        <p>Device: {user.userAgent.split(' ')[0]} {user.userAgent.includes('Mobile') ? '📱' : '💻'}</p>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-medium mb-1">Favorited Images:</p>
                        <div className="flex flex-wrap gap-1">
                          {user.favorites.slice(0, 3).map((fav) => (
                            <Badge key={fav.imageId} variant="outline" className="text-xs">
                              {fav.originalFilename.length > 20 
                                ? fav.originalFilename.substring(0, 20) + '...'
                                : fav.originalFilename
                              }
                            </Badge>
                          ))}
                          {user.favorites.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.favorites.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No visitor data available yet.</p>
              )}
            </TabsContent>
            
            <TabsContent value="recent" className="space-y-4">
              <h3 className="text-lg font-semibold">Recent Favorites</h3>
              {analytics.recentActivity.length > 0 ? (
                <div className="space-y-2">
                  {analytics.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{activity.images.original_filename}</p>
                          <p className="text-sm text-muted-foreground">
                            Favorited by {maskIP(activity.client_ip)}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(activity.created_at)}
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