import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, Heart, Download, Users, Calendar, TrendingUp } from "lucide-react";

interface AnalyticsData {
  totalViews: number;
  totalFavorites: number;
  totalDownloads: number;
  uniqueVisitors: number;
  recentActivity: Array<{
    action: string;
    count: number;
    date: string;
  }>;
  popularImages: Array<{
    id: string;
    filename: string;
    views: number;
    favorites: number;
  }>;
}

interface GalleryAnalyticsProps {
  galleryId: string;
  galleryName: string;
}

export const GalleryAnalytics = ({ galleryId, galleryName }: GalleryAnalyticsProps) => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalViews: 0,
    totalFavorites: 0,
    totalDownloads: 0,
    uniqueVisitors: 0,
    recentActivity: [],
    popularImages: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      // Fetch gallery analytics
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('gallery_analytics')
        .select('*')
        .eq('gallery_id', galleryId);

      if (analyticsError) throw analyticsError;

      // Fetch favorites count
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('favorites')
        .select('id')
        .eq('gallery_id', galleryId);

      if (favoritesError) throw favoritesError;

      // Process analytics data
      const viewActions = analyticsData?.filter(a => a.action === 'image_viewed') || [];
      const downloadActions = analyticsData?.filter(a => a.action === 'image_download') || [];
      const uniqueIPs = new Set(analyticsData?.map(a => a.client_ip).filter(Boolean));

      // Get recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentAnalytics = analyticsData?.filter(a => 
        new Date(a.created_at) >= sevenDaysAgo
      ) || [];

      // Group by date for recent activity
      const activityByDate = recentAnalytics.reduce((acc, item) => {
        const date = new Date(item.created_at).toLocaleDateString();
        if (!acc[date]) {
          acc[date] = { views: 0, favorites: 0, downloads: 0 };
        }
        if (item.action === 'image_viewed') acc[date].views++;
        if (item.action === 'favorite_added') acc[date].favorites++;
        if (item.action === 'image_download') acc[date].downloads++;
        return acc;
      }, {} as Record<string, any>);

      const recentActivity = Object.entries(activityByDate).map(([date, data]: [string, any]) => ({
        date,
        action: 'mixed',
        count: data.views + data.favorites + data.downloads
      }));

      setAnalytics({
        totalViews: viewActions.length,
        totalFavorites: favoritesData?.length || 0,
        totalDownloads: downloadActions.length,
        uniqueVisitors: uniqueIPs.size,
        recentActivity: recentActivity.slice(-7),
        popularImages: [] // Would need more complex query for image-specific stats
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [galleryId]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Analytics for {galleryName}</h3>
          <p className="text-sm text-muted-foreground">Gallery performance overview</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-all duration-300" style={{ boxShadow: 'var(--shadow-soft)' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalViews}</div>
            <p className="text-xs text-muted-foreground">
              Image impressions
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-300" style={{ boxShadow: 'var(--shadow-soft)' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Favorites</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalFavorites}</div>
            <p className="text-xs text-muted-foreground">
              Client selections
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-300" style={{ boxShadow: 'var(--shadow-soft)' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalDownloads}</div>
            <p className="text-xs text-muted-foreground">
              Image downloads
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-300" style={{ boxShadow: 'var(--shadow-soft)' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.uniqueVisitors}</div>
            <p className="text-xs text-muted-foreground">
              Gallery visitors
            </p>
          </CardContent>
        </Card>
      </div>

      {analytics.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Activity (Last 7 Days)
            </CardTitle>
            <CardDescription>
              Daily engagement with your gallery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{activity.date}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {activity.count} interactions
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};