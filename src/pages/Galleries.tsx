import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FavoritesAnalytics } from "@/components/FavoritesAnalytics";
import { Camera, Search, Calendar, User, Heart, ArrowRight, Sparkles, Eye, BarChart3 } from "lucide-react";

type Gallery = {
  id: string;
  name: string;
  description: string;
  client_name: string;
  created_at: string;
  is_public: boolean;
  photographer_id?: string;
  coverUrl?: string;
};

const Galleries = () => {
  const { user } = useAuth();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showMyGalleries, setShowMyGalleries] = useState(false);
  const [selectedGalleryForAnalytics, setSelectedGalleryForAnalytics] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadGalleries();
  }, [showMyGalleries, user]);

  const loadGalleries = async () => {
    try {
      setLoading(true);
      
      let galleriesData: any[] = [];
      
      if (showMyGalleries && user) {
        // Owner can access full galleries table for their own galleries
        const { data, error } = await supabase
          .from('galleries')
          .select('id, name, description, client_name, created_at, is_public, photographer_id, cover_image_id')
          .eq('photographer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
          
        if (error) {
          console.error('Error fetching galleries:', error);
          return;
        }
        galleriesData = data || [];
      } else {
        // Use secure view for public galleries (excludes password_hash)
        const { data, error } = await supabase
          .from('galleries_public_secure')
          .select('id, name, description, client_name, created_at, is_public, photographer_id, cover_image_id')
          .order('created_at', { ascending: false })
          .limit(50);
          
        if (error) {
          console.error('Error fetching galleries:', error);
          return;
        }
        galleriesData = data || [];
      }
      
      // Fetch cover images for each gallery
      const galleryIds = galleriesData.map(g => g.id);
      if (galleryIds.length > 0) {
        const { data: images } = await supabase
          .from('images')
          .select('id, gallery_id, thumbnail_path, full_path')
          .in('gallery_id', galleryIds)
          .order('upload_date', { ascending: true });

        // Build cover map
        const coverMap = new Map<string, string>();
        const imageMap = new Map<string, { thumbnail_path: string | null; full_path: string }>();
        
        (images || []).forEach(img => {
          imageMap.set(img.id, { thumbnail_path: img.thumbnail_path, full_path: img.full_path });
          // Set first image as default cover
          if (!coverMap.has(img.gallery_id)) {
            const path = img.thumbnail_path || img.full_path;
            const { data } = supabase.storage.from('gallery-images').getPublicUrl(path);
            coverMap.set(img.gallery_id, data.publicUrl);
          }
        });

        // Override with explicit cover image if set
        galleriesData.forEach((g: any) => {
          if (g.cover_image_id && imageMap.has(g.cover_image_id)) {
            const coverImg = imageMap.get(g.cover_image_id)!;
            const path = coverImg.thumbnail_path || coverImg.full_path;
            const { data } = supabase.storage.from('gallery-images').getPublicUrl(path);
            coverMap.set(g.id, data.publicUrl);
          }
        });

        const galleriesWithCovers = galleriesData.map(g => ({
          ...g,
          coverUrl: coverMap.get(g.id)
        }));
        
        setGalleries(galleriesWithCovers);
      } else {
        setGalleries([]);
      }
    } catch (error) {
      console.error('Error fetching galleries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = (id: string) => {
    setImageErrors(prev => new Set(prev).add(id));
  };

  const filteredGalleries = galleries.filter(
    (gallery) =>
      gallery.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gallery.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Simple Header - matches homepage */}
      <header className="nav-premium fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Camera className="h-6 w-6 text-foreground" />
              <span className="text-xl font-serif font-medium text-foreground">Pixie</span>
            </Link>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/feed">Feed</Link>
              </Button>
              {user && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin">Dashboard</Link>
                </Button>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section - Compact */}
      <section className="pt-20 pb-8">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl font-serif mb-3">
              {showMyGalleries ? "My Galleries" : "Browse Galleries"}
            </h1>
            
            <p className="text-muted-foreground mb-6">
              {showMyGalleries 
                ? "Manage your photography collections"
                : "Discover beautiful photo galleries from our community"
              }
            </p>

            {/* Toggle + Search Row */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {user && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
                  <Label htmlFor="gallery-toggle" className="text-sm">Public</Label>
                  <Switch
                    id="gallery-toggle"
                    checked={showMyGalleries}
                    onCheckedChange={setShowMyGalleries}
                  />
                  <Label htmlFor="gallery-toggle" className="text-sm">Mine</Label>
                </div>
              )}

              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10 rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card-premium overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-muted" />
                <div className="p-4 space-y-2">
                  <div className="h-5 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredGalleries.length === 0 ? (
          <div className="text-center py-20 fade-in">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-muted to-accent/20 flex items-center justify-center mx-auto mb-8">
              <Camera className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="heading-xl mb-4">
              {searchTerm ? "No galleries found" : "No galleries available"}
            </h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              {searchTerm
                ? "Try adjusting your search terms to find what you're looking for"
                : "Create your first gallery in the admin panel to get started"}
            </p>
            {!searchTerm && (
              <Button asChild className="btn-premium">
                <Link to="/admin">Create Gallery</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="fade-in">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="heading-lg">
                  {searchTerm ? "Search Results" : (showMyGalleries ? "My Galleries" : "Public Galleries")}
                </h3>
                <p className="text-muted-foreground mt-1">
                  {filteredGalleries.length} {filteredGalleries.length === 1 ? "gallery" : "galleries"} found
                </p>
              </div>
              {searchTerm && (
                <Button
                  variant="outline"
                  onClick={() => setSearchTerm("")}
                  className="btn-premium-outline"
                >
                  Clear Search
                </Button>
              )}
            </div>

            {/* Gallery Content */}
            {showMyGalleries && user ? (
              <Tabs defaultValue="galleries" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="galleries">My Galleries</TabsTrigger>
                  <TabsTrigger value="analytics">Favorites Analytics</TabsTrigger>
                </TabsList>
                
                <TabsContent value="galleries" className="space-y-8">
                  {/* Gallery Grid with Covers */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredGalleries.map((gallery, index) => (
                      <Card key={gallery.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300" style={{ animationDelay: `${index * 100}ms` }}>
                        {/* Cover Image */}
                        <Link to={`/gallery/${gallery.id}`} className="block">
                          <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                            {gallery.coverUrl && !imageErrors.has(gallery.id) ? (
                              <img
                                src={gallery.coverUrl}
                                alt={gallery.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                onError={() => handleImageError(gallery.id)}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                                <Camera className="h-12 w-12 text-muted-foreground/30" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </Link>
                        
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <Link to={`/gallery/${gallery.id}`}>
                                <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                                  {gallery.name}
                                </h3>
                              </Link>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                                <User className="h-3 w-3" />
                                <span className="truncate">{gallery.client_name}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDate(gallery.created_at)}
                              </p>
                            </div>
                            
                            <div className="flex gap-2 shrink-0">
                              <Button 
                                variant="outline" 
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setSelectedGalleryForAnalytics(gallery.id)}
                              >
                                <BarChart3 className="h-4 w-4" />
                              </Button>
                              <Button asChild size="icon" className="h-8 w-8">
                                <Link to={`/gallery/${gallery.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="analytics" className="space-y-6">
                  {selectedGalleryForAnalytics ? (
                    <FavoritesAnalytics galleryId={selectedGalleryForAnalytics} />
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5" />
                          Favorites Analytics
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground text-center py-8">
                          Select a gallery from the "My Galleries" tab to view favorites analytics.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              /* Public Gallery Grid with Covers */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGalleries.map((gallery, index) => (
                  <Card key={gallery.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300" style={{ animationDelay: `${index * 100}ms` }}>
                    {/* Cover Image */}
                    <Link to={`/gallery/${gallery.id}`} className="block">
                      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                        {gallery.coverUrl && !imageErrors.has(gallery.id) ? (
                          <img
                            src={gallery.coverUrl}
                            alt={gallery.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={() => handleImageError(gallery.id)}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                            <Camera className="h-12 w-12 text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                    
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <Link to={`/gallery/${gallery.id}`}>
                            <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                              {gallery.name}
                            </h3>
                          </Link>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                            <User className="h-3 w-3" />
                            <span className="truncate">{gallery.client_name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(gallery.created_at)}
                          </p>
                        </div>
                        
                        <Button asChild size="icon" className="h-8 w-8 shrink-0">
                          <Link to={`/gallery/${gallery.id}`}>
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Load More Button - for future pagination */}
            {filteredGalleries.length >= 50 && (
              <div className="text-center mt-12">
                <Button variant="outline" className="btn-premium-outline">
                  Load More Galleries
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <section className="py-20 bg-gradient-to-t from-accent/10 to-background border-t border-border/50">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-2xl mx-auto fade-in-up">
            <div className="inline-flex items-center gap-2 mb-6 px-6 py-3 rounded-full bg-primary/5 border border-primary/10">
              <Heart className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Create Your Own</span>
            </div>
            
            <h3 className="heading-xl mb-6">
              Ready to Create Your Gallery?
            </h3>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Share your beautiful moments with clients and loved ones. 
              Create professional galleries in minutes.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Button asChild className="btn-premium">
                <Link to="/admin">Create Gallery</Link>
              </Button>
              <Button variant="outline" asChild className="btn-premium-outline">
                <Link to="/auth">Sign Up Free</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Galleries;