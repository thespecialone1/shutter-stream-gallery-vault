import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, Lock, ArrowLeft, Eye, EyeOff, Heart, Star, Calendar, User, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { FavoriteButton } from "@/components/FavoriteButton";
import { FavoritesView } from "@/components/FavoritesView";
import { MasonryGallery } from "@/components/MasonryGallery";
import { ImageGridSkeleton, SectionTabsSkeleton, FavoritesViewSkeleton } from "@/components/SkeletonLoader";

type Gallery = {
  id: string;
  name: string;
  description: string;
  password_hash: string | null;
  client_name: string;
  created_at: string;
  is_public: boolean;
};

type GalleryImage = {
  id: string;
  filename: string;
  full_path: string;
  thumbnail_path: string | null;
  upload_date: string;
  width: number | null;
  height: number | null;
  original_filename: string;
};

type Section = {
  id: string;
  name: string;
  sort_order: number;
};

const Gallery = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [favoriteImageIds, setFavoriteImageIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("all");
  const [contentLoading, setContentLoading] = useState(false);

  // Premium section navigation items
  const sectionNavItems = [
    { id: "all", label: "All Photos", icon: Camera },
    { id: "highlights", label: "Highlights", icon: Star },
    { id: "ceremony", label: "Ceremony", icon: Heart },
    { id: "reception", label: "Reception", icon: Sparkles },
    { id: "portraits", label: "Portraits", icon: User },
    { id: "family", label: "Family", icon: Heart },
  ];

  useEffect(() => {
    if (id) {
      loadGallery();
      
      // Check if there's a valid session token for this gallery
      const sessionToken = sessionStorage.getItem(`gallery_session_${id}`);
      const expiresAt = sessionStorage.getItem(`gallery_expires_${id}`);
      
      if (sessionToken && expiresAt) {
        const now = new Date();
        const expiry = new Date(expiresAt);
        
        if (now < expiry) {
          // Validate session with server
          validateSession(sessionToken);
        } else {
          // Session expired, clean up
          sessionStorage.removeItem(`gallery_session_${id}`);
          sessionStorage.removeItem(`gallery_expires_${id}`);
        }
      }
    }
  }, [id]);

  const loadGallery = async () => {
    try {
      const { data, error } = await supabase
        .from("galleries")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error loading gallery:", error);
        toast({
          title: "Error",
          description: "Gallery not found",
          variant: "destructive",
        });
        navigate("/galleries");
        return;
      }

      setGallery(data);
      
      // If gallery is public, bypass authentication
      if (data.is_public) {
        setIsAuthenticated(true);
        loadGalleryContent();
      }
    } catch (error) {
      console.error("Error loading gallery:", error);
      toast({
        title: "Error",
        description: "Failed to load gallery",
        variant: "destructive",
      });
      navigate("/galleries");
    } finally {
      setLoading(false);
    }
  };

  const loadGalleryContent = async () => {
    setContentLoading(true);
    try {
      // Load sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from("sections")
        .select("*")
        .eq("gallery_id", id)
        .order("sort_order", { ascending: true });

      if (sectionsError) {
        console.error("Error loading sections:", sectionsError);
      } else {
        setSections(sectionsData || []);
      }

      // Load images
      const { data: imagesData, error: imagesError } = await supabase
        .from("images")
        .select("*")
        .eq("gallery_id", id)
        .order("upload_date", { ascending: true });

      if (imagesError) {
        console.error("Error loading images:", imagesError);
      } else {
        setImages(imagesData || []);
      }

      // Load favorites
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('favorites')
        .select('image_id')
        .eq('gallery_id', id);

      if (favoritesError) {
        console.error("Error loading favorites:", favoritesError);
      } else {
        setFavoriteImageIds(new Set(favoritesData?.map(fav => fav.image_id) || []));
      }
    } catch (error) {
      console.error("Error loading gallery content:", error);
    } finally {
      setContentLoading(false);
    }
  };

  const validateSession = async (sessionToken: string) => {
    try {
      const response = await fetch(`https://xcucqsonzfovlcxktxiy.supabase.co/functions/v1/gallery-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjdWNxc29uemZvdmxjeGt0eGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNjYxNTgsImV4cCI6MjA2ODc0MjE1OH0.T6O_dIeMr6mjZPcM8N5VktHQ81IKzusy0t6ZJVembsk`,
        },
        body: JSON.stringify({
          galleryId: id,
          sessionToken: sessionToken,
          action: 'gallery_view'
        })
      });

      const data = await response.json();

      if (data.success) {
        setIsAuthenticated(true);
        setGallery(data.gallery);
        loadGalleryContent();
      } else {
        // Session invalid, clean up
        sessionStorage.removeItem(`gallery_session_${id}`);
        sessionStorage.removeItem(`gallery_expires_${id}`);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error validating session:', error);
      // On error, clean up session
      sessionStorage.removeItem(`gallery_session_${id}`);
      sessionStorage.removeItem(`gallery_expires_${id}`);
      setIsAuthenticated(false);
    }
  };

  const logImageAccess = async (imageId: string, action: string) => {
    try {
      const sessionToken = sessionStorage.getItem(`gallery_session_${id}`);
      await fetch(`https://xcucqsonzfovlcxktxiy.supabase.co/functions/v1/image-analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjdWNxc29uemZvdmxjeGt0eGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNjYxNTgsImV4cCI6MjA2ODc0MjE1OH0.T6O_dIeMr6mjZPcM8N5VktHQ81IKzusy0t6ZJVembsk`,
        },
        body: JSON.stringify({
          galleryId: id,
          imageId: imageId,
          action: action,
          sessionToken: sessionToken
        })
      });
    } catch (error) {
      console.error('Error logging image access:', error);
      // Don't block user experience if analytics fail
    }
  };

  const handleFavoriteChange = (imageId: string, isFavorited: boolean) => {
    setFavoriteImageIds(prev => {
      const newSet = new Set(prev);
      if (isFavorited) {
        newSet.add(imageId);
      } else {
        newSet.delete(imageId);
      }
      return newSet;
    });

    // Log favorite action
    logImageAccess(imageId, isFavorited ? 'image_favorited' : 'image_unfavorited');
  };

  const verifyPassword = async () => {
    if (!password.trim() || !gallery) return;

    setAuthLoading(true);
    try {
      // Use the new secure Edge Function for gallery authentication
      const response = await fetch(`https://xcucqsonzfovlcxktxiy.supabase.co/functions/v1/gallery-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjdWNxc29uemZvdmxjeGt0eGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNjYxNTgsImV4cCI6MjA2ODc0MjE1OH0.T6O_dIeMr6mjZPcM8N5VktHQ81IKzusy0t6ZJVembsk`,
        },
        body: JSON.stringify({
          galleryId: id,
          password: password
        })
      });

      const data = await response.json();

      if (data.success) {
        // Store session token securely in sessionStorage (not localStorage to prevent manipulation)
        sessionStorage.setItem(`gallery_session_${id}`, data.sessionToken);
        sessionStorage.setItem(`gallery_expires_${id}`, data.expiresAt);
        
        setIsAuthenticated(true);
        toast({
          title: "Access granted",
          description: "Welcome to the gallery!",
        });
        loadGalleryContent();
      } else {
        toast({
          title: "Access denied",
          description: data.message || "Invalid password",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      toast({
        title: "Error",
        description: "Failed to verify password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      verifyPassword();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getImageUrl = (imagePath: string) => {
    return `${supabase.storage.from("gallery-images").getPublicUrl(imagePath).data.publicUrl}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center fade-in">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Camera className="h-8 w-8 text-primary-foreground" />
          </div>
          <h3 className="heading-md mb-2">Loading Gallery</h3>
          <p className="text-muted-foreground">Preparing your viewing experience...</p>
        </div>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center fade-in">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-muted to-accent/20 flex items-center justify-center mx-auto mb-8">
            <Camera className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="heading-xl mb-4">Gallery Not Found</h2>
          <p className="text-muted-foreground mb-8 max-w-md">
            The gallery you're looking for doesn't exist or has been removed.
          </p>
          <Button asChild className="btn-premium">
            <Link to="/galleries">Browse Galleries</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        {/* Premium Header */}
        <header className="nav-premium">
          <div className="container mx-auto px-6 py-4">
            <Link to="/galleries" className="inline-flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group">
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Galleries</span>
            </Link>
          </div>
        </header>

        <div className="container mx-auto px-6 py-20">
          <div className="max-w-md mx-auto fade-in-up">
            <div className="card-premium p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-10 h-10 text-primary" />
                </div>
                <h2 className="heading-lg mb-4">Private Gallery</h2>
                <p className="text-muted-foreground">
                  This gallery is password protected. Enter the access code to view the collection.
                </p>
              </div>

              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h3 className="heading-md">{gallery.name}</h3>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>{gallery.client_name}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(gallery.created_at)}</span>
                  </div>
                  {gallery.description && (
                    <p className="text-sm text-muted-foreground mt-3">
                      {gallery.description}
                    </p>
                  )}
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="password" className="text-sm font-medium">Access Code</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter gallery password"
                      className="pr-12 h-12 rounded-xl border-border/50 focus:border-primary transition-colors"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <Button 
                  onClick={verifyPassword} 
                  className="w-full btn-premium h-12 text-base"
                  disabled={!password || authLoading}
                >
                  {authLoading ? "Verifying..." : "Enter Gallery"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Premium Header */}
      <header className="nav-premium">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/galleries" className="inline-flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group">
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Galleries</span>
            </Link>
            <div className="text-right">
              <h1 className="heading-md">{gallery.name}</h1>
              <div className="flex items-center justify-end gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{gallery.client_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(gallery.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Premium Section Navigation - Only show for private galleries */}
      {loading ? (
        <SectionTabsSkeleton />
      ) : !gallery?.is_public ? (
        <div className="section-nav">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
              {sectionNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`section-nav-item ${activeSection === item.id ? 'active' : ''}`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeSection === "favorites" ? "favorites" : "all"} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8 bg-accent/20 rounded-full p-1">
            <TabsTrigger 
              value="all" 
              onClick={() => setActiveSection("all")}
              className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-md"
            >
              <Camera className="w-4 h-4 mr-2" />
              All Images
            </TabsTrigger>
            <TabsTrigger 
              value="favorites"
              onClick={() => setActiveSection("favorites")}
              className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-md"
            >
              <Heart className="w-4 h-4 mr-2" />
              Favorites
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-8 fade-in">
            {contentLoading ? (
              <ImageGridSkeleton />
            ) : images.length === 0 ? (
              <div className="text-center py-20 fade-in">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-muted to-accent/20 flex items-center justify-center mx-auto mb-8">
                  <Camera className="w-12 h-12 text-muted-foreground" />
                </div>
                <h3 className="heading-lg mb-4">No Photos Yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Photos will appear here once they're uploaded to this gallery. 
                  Check back soon for beautiful memories.
                </p>
              </div>
            ) : (
              <MasonryGallery
                images={images}
                galleryId={gallery!.id}
                favoriteImageIds={favoriteImageIds}
                onFavoriteChange={handleFavoriteChange}
                onImageView={(imageId) => logImageAccess(imageId, 'image_viewed')}
                isPublicGallery={gallery!.is_public}
              />
            )}
          </TabsContent>
          
          <TabsContent value="favorites" className="mt-8 fade-in">
            {contentLoading ? (
              <FavoritesViewSkeleton />
            ) : (
              <FavoritesView galleryId={gallery!.id} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Gallery;