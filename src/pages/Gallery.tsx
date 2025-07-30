
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { FavoriteButton } from "@/components/FavoriteButton";
import { FavoritesView } from "@/components/FavoritesView";

type Gallery = {
  id: string;
  name: string;
  description: string;
  password_hash: string;
  client_name: string;
  created_at: string;
};

type GalleryImage = {
  id: string;
  filename: string;
  full_path: string;
  thumbnail_path: string | null;
  upload_date: string;
  width: number | null;
  height: number | null;
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
          // Session is still valid
          setIsAuthenticated(true);
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading gallery...</p>
        </div>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Gallery not found</h2>
          <p className="text-muted-foreground mb-4">
            The gallery you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/galleries">
            <Button>Browse Galleries</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <Link to="/galleries" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Back to Galleries
            </Link>
          </div>
        </header>

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Protected Gallery</CardTitle>
                <p className="text-muted-foreground">
                  This gallery is password protected. Enter the password to view the photos.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">{gallery.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Client: {gallery.client_name}
                  </p>
                  {gallery.description && (
                    <p className="text-sm text-muted-foreground">
                      {gallery.description}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter gallery password"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <Button 
                  onClick={verifyPassword} 
                  className="w-full"
                  disabled={!password || authLoading}
                >
                  {authLoading ? "Verifying..." : "Access Gallery"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/galleries" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Back to Galleries
            </Link>
            <div className="text-right">
              <h1 className="text-xl font-bold">{gallery.name}</h1>
              <p className="text-sm text-muted-foreground">
                {gallery.client_name} • {formatDate(gallery.created_at)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="all">All Images</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-6">
            {images.length === 0 ? (
              <div className="text-center py-12">
                <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No photos yet</h3>
                <p className="text-muted-foreground">
                  Photos will appear here once they're uploaded to this gallery.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((image) => (
                  <div key={image.id} className="group relative">
                    <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                      <img
                        src={getImageUrl(image.thumbnail_path || image.full_path)}
                        alt={image.filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <FavoriteButton
                        galleryId={gallery!.id}
                        imageId={image.id}
                        isFavorited={favoriteImageIds.has(image.id)}
                        onFavoriteChange={handleFavoriteChange}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="favorites" className="mt-6">
            <FavoritesView galleryId={gallery!.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Gallery;
