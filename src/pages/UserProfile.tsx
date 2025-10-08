import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Camera, Heart, Grid, Settings } from "lucide-react";
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
  email: string;
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
}

export default function UserProfile() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [stats, setStats] = useState({ galleries: 0, favorites: 0 });

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
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', targetUserId)
      .single();
    
    if (data && !error) {
      setProfile(data);
    }
    setLoading(false);
  };

  const loadGalleries = async () => {
    if (!targetUserId) return;
    
    const { data, error } = await supabase
      .from('galleries')
      .select('id, name, description, client_name, created_at, view_count')
      .eq('photographer_id', targetUserId)
      .eq('is_public', true)
      .order('created_at', { ascending: false });
    
    if (data && !error) {
      setGalleries(data);
    }
  };

  const loadStats = async () => {
    if (!targetUserId) return;
    
    // Count public galleries
    const { count: galleriesCount } = await supabase
      .from('galleries')
      .select('*', { count: 'exact', head: true })
      .eq('photographer_id', targetUserId)
      .eq('is_public', true);
    
    // Count favorites (only for own profile)
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
      favorites: favoritesCount
    });
  };

  const avatarUrl = profile?.avatar_url 
    ? supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl 
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
              <span className="text-xl font-serif">Pixie Studio</span>
            </Link>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-32 w-32 rounded-full mx-auto" />
          <Skeleton className="h-8 w-48 mx-auto mt-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Camera className="h-6 w-6" />
            <span className="text-xl font-serif">Pixie Studio</span>
          </Link>
          {isOwnProfile && (
            <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <Avatar className="h-32 w-32 mb-4">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-3xl font-serif font-bold mb-2">{displayName}</h1>
          {profile?.business_name && (
            <p className="text-lg text-muted-foreground mb-2">{profile.business_name}</p>
          )}
          {profile?.bio && (
            <p className="text-muted-foreground max-w-2xl">{profile.bio}</p>
          )}
          
          {/* Stats */}
          <div className="flex gap-8 mt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.galleries}</p>
              <p className="text-sm text-muted-foreground">Public Galleries</p>
            </div>
            {isOwnProfile && (
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.favorites}</p>
                <p className="text-sm text-muted-foreground">Favorites</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="galleries" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="galleries" className="flex items-center gap-2">
              <Grid className="h-4 w-4" />
              Public Galleries
            </TabsTrigger>
            {isOwnProfile && (
              <TabsTrigger value="favorites" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Favorites
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="galleries" className="mt-6">
            {galleries.length === 0 ? (
              <Card className="p-12 text-center">
                <Grid className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No public galleries yet</h3>
                <p className="text-muted-foreground">
                  {isOwnProfile 
                    ? "Create your first public gallery to share with the world" 
                    : "This user hasn't shared any public galleries yet"}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {galleries.map((gallery) => (
                  <Link key={gallery.id} to={`/gallery/${gallery.id}`}>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                      <div className="p-4">
                        <h3 className="font-semibold mb-1">{gallery.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {gallery.client_name}
                        </p>
                        {gallery.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {gallery.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-3">
                          {gallery.view_count} views
                        </p>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {isOwnProfile && (
            <TabsContent value="favorites" className="mt-6">
              <FavoritesManagement />
            </TabsContent>
          )}
        </Tabs>
      </div>

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
