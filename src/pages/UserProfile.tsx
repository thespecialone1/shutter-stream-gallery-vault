import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Camera, Heart, Grid, Settings, Calendar, MessageCircle, MapPin, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileSettings } from "@/components/ProfileSettings";
import { FavoritesManagement } from "@/components/FavoritesManagement";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  business_name?: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  display_name?: string;
}

interface Gallery {
  id: string;
  name: string;
  description: string | null;
  client_name: string;
  created_at: string;
  view_count: number;
  cover_url?: string;
}

export default function UserProfile() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [stats, setStats] = useState({ galleries: 0, favorites: 0, views: 0 });

  const isOwnProfile = !userId || userId === user?.id;
  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (targetUserId) {
      loadProfile();
      loadGalleries();
      loadStats();
    }
  }, [targetUserId]);

  const loadProfile = async () => {
    if (!targetUserId) return;
    
    if (isOwnProfile) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .single();
      
      if (data && !error) {
        setProfile(data);
      }
    } else {
      const { data, error } = await supabase
        .rpc('get_public_profile', { profile_user_id: targetUserId });
      
      if (data && data.length > 0 && !error) {
        setProfile(data[0] as Profile);
      }
    }
    setLoading(false);
  };

  const loadGalleries = async () => {
    if (!targetUserId) return;
    
    const { data, error } = await supabase
      .from('galleries')
      .select('id, name, description, client_name, created_at, view_count, cover_image_id')
      .eq('photographer_id', targetUserId)
      .eq('is_public', true)
      .order('created_at', { ascending: false });
    
    if (data && !error) {
      // Load cover images
      const galleriesWithCovers = await Promise.all(
        data.map(async (g: any) => {
          let cover_url;
          if (g.cover_image_id) {
            const { data: img } = await supabase
              .from('images')
              .select('thumbnail_path, full_path')
              .eq('id', g.cover_image_id)
              .single();
            
            if (img) {
              const path = img.thumbnail_path || img.full_path;
              cover_url = supabase.storage.from('gallery-images').getPublicUrl(path).data.publicUrl;
            }
          } else {
            // Get first image as cover
            const { data: firstImg } = await supabase
              .from('images')
              .select('thumbnail_path, full_path')
              .eq('gallery_id', g.id)
              .limit(1)
              .single();
            
            if (firstImg) {
              const path = firstImg.thumbnail_path || firstImg.full_path;
              cover_url = supabase.storage.from('gallery-images').getPublicUrl(path).data.publicUrl;
            }
          }
          return { ...g, cover_url };
        })
      );
      setGalleries(galleriesWithCovers);
    }
  };

  const loadStats = async () => {
    if (!targetUserId) return;
    
    const { count: galleriesCount } = await supabase
      .from('galleries')
      .select('*', { count: 'exact', head: true })
      .eq('photographer_id', targetUserId)
      .eq('is_public', true);
    
    // Get total views
    const { data: viewData } = await supabase
      .from('galleries')
      .select('view_count')
      .eq('photographer_id', targetUserId)
      .eq('is_public', true);
    
    const totalViews = viewData?.reduce((sum, g) => sum + (g.view_count || 0), 0) || 0;
    
    let favoritesCount = 0;
    if (isOwnProfile) {
      const { count } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', targetUserId);
      favoritesCount = count || 0;
    }
    
    setStats({
      galleries: galleriesCount || 0,
      favorites: favoritesCount,
      views: totalViews
    });
  };

  const avatarUrl = profile?.avatar_url 
    ? (profile.avatar_url.startsWith('http') 
        ? profile.avatar_url 
        : supabase.storage.from('gallery-images').getPublicUrl(profile.avatar_url).data.publicUrl)
    : undefined;

  const displayName = profile?.display_name || profile?.full_name || 'User';
  const initials = displayName.substring(0, 2).toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <Link to="/" className="flex items-center gap-2">
              <Camera className="h-6 w-6" />
              <span className="text-xl font-serif">Pixie</span>
            </Link>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-40 w-40 rounded-full mx-auto" />
          <Skeleton className="h-8 w-48 mx-auto mt-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="nav-premium fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Camera className="h-6 w-6" />
            <span className="text-xl font-serif">Pixie</span>
          </Link>
          <div className="flex items-center gap-3">
            {isOwnProfile && (
              <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="relative h-48 sm:h-64 bg-gradient-to-br from-primary/20 via-primary/10 to-background overflow-hidden pt-16">
        <div className="absolute inset-0 opacity-30">
          {galleries[0]?.cover_url && (
            <img 
              src={galleries[0].cover_url} 
              alt="" 
              className="w-full h-full object-cover blur-2xl scale-110"
            />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      {/* Profile Content */}
      <div className="container mx-auto px-4 max-w-6xl -mt-20 relative z-10">
        {/* Profile Header */}
        <div className="flex flex-col lg:flex-row lg:items-end gap-6 mb-8">
          {/* Avatar */}
          <Avatar className="h-36 w-36 sm:h-44 sm:w-44 border-4 border-background shadow-xl mx-auto lg:mx-0">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 text-center lg:text-left pb-4">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-2">{displayName}</h1>
            {profile?.business_name && (
              <p className="text-lg text-muted-foreground mb-3">{profile.business_name}</p>
            )}
            {profile?.bio && (
              <p className="text-muted-foreground max-w-2xl mb-4">{profile.bio}</p>
            )}
            
            {/* Stats */}
            <div className="flex gap-6 justify-center lg:justify-start">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.galleries}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Galleries</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.views.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Views</p>
              </div>
              {isOwnProfile && (
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats.favorites}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Favorites</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {!isOwnProfile && (
            <div className="flex gap-3 justify-center lg:justify-end pb-4">
              <Button>
                <Calendar className="h-4 w-4 mr-2" />
                Book Session
              </Button>
              <Button variant="outline">
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact
              </Button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="galleries" className="w-full">
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-grid sm:grid-cols-2 mb-6">
            <TabsTrigger value="galleries" className="flex items-center gap-2">
              <Grid className="h-4 w-4" />
              Galleries
            </TabsTrigger>
            {isOwnProfile && (
              <TabsTrigger value="favorites" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Favorites
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="galleries" className="mt-0">
            {galleries.length === 0 ? (
              <Card className="p-12 text-center">
                <Grid className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No public galleries yet</h3>
                <p className="text-muted-foreground mb-4">
                  {isOwnProfile 
                    ? "Create your first public gallery to share with the world" 
                    : "This photographer hasn't shared any public galleries yet"}
                </p>
                {isOwnProfile && (
                  <Button asChild>
                    <Link to="/admin">Create Gallery</Link>
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {galleries.map((gallery) => (
                  <Link key={gallery.id} to={`/gallery/${gallery.id}`}>
                    <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 h-full">
                      {/* Cover Image */}
                      <div className="aspect-[4/3] bg-muted overflow-hidden">
                        {gallery.cover_url ? (
                          <img
                            src={gallery.cover_url}
                            alt={gallery.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="p-4">
                        <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                          {gallery.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {gallery.client_name}
                        </p>
                        {gallery.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {gallery.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{new Date(gallery.created_at).toLocaleDateString()}</span>
                          <span>{gallery.view_count} views</span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {isOwnProfile && (
            <TabsContent value="favorites" className="mt-0">
              <FavoritesManagement />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Footer spacing */}
      <div className="h-16" />

      {isOwnProfile && (
        <ProfileSettings 
          open={isSettingsOpen} 
          onOpenChange={setIsSettingsOpen}
          onProfileUpdated={loadProfile}
        />
      )}
    </div>
  );
}