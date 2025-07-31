import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, Users, Camera, Sparkles, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PublicGallery {
  id: string;
  name: string;
  description: string | null;
  client_name: string;
  created_at: string;
  view_count: number;
}

export default function BrowseGalleries() {
  const [galleries, setGalleries] = useState<PublicGallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadPublicGalleries();
  }, []);

  const loadPublicGalleries = async () => {
    try {
      const { data, error } = await supabase
        .from('galleries')
        .select('id, name, description, client_name, created_at, view_count')
        .eq('is_public', true)
        .order('view_count', { ascending: false })
        .limit(50);

      if (error) throw error;
      setGalleries(data || []);
    } catch (error) {
      console.error('Error loading public galleries:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async (galleryId: string) => {
    try {
      await supabase.rpc('increment_gallery_views', { gallery_id: galleryId });
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  const filteredGalleries = galleries.filter(gallery =>
    gallery.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gallery.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Premium Header */}
      <header className="nav-premium">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center group-hover:scale-105 transition-transform">
                <Camera className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-serif font-medium text-foreground">Pixie Studio</h1>
                <p className="text-sm text-muted-foreground -mt-1">Browse Public Galleries</p>
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <Button variant="outline" asChild className="btn-premium-outline">
                <Link to="/galleries">All Galleries</Link>
              </Button>
              <Button asChild className="btn-premium">
                <Link to="/auth">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-accent/10 to-background">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto fade-in-up">
            <div className="inline-flex items-center gap-2 mb-6 px-6 py-3 rounded-full bg-primary/5 border border-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Discover Beautiful Memories</span>
            </div>
            
            <h2 className="heading-hero mb-6">
              Browse Public Galleries
            </h2>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Discover stunning photography collections shared by photographers worldwide
            </p>

            {/* Premium Search */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search galleries or photographers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 rounded-full border-border/50 focus:border-primary bg-background/80 backdrop-blur-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card-premium p-6 animate-pulse">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-muted rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-full"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
                <div className="flex items-center justify-between mt-6">
                  <div className="h-4 bg-muted rounded w-20"></div>
                  <div className="h-8 bg-muted rounded w-24"></div>
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
              {searchTerm ? "No galleries found" : "No public galleries available"}
            </h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              {searchTerm
                ? "Try adjusting your search terms to find what you're looking for"
                : "No public galleries shared yet. Check back later for amazing collections!"}
            </p>
            {searchTerm && (
              <Button 
                onClick={() => setSearchTerm("")}
                variant="outline" 
                className="btn-premium-outline"
              >
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <div className="fade-in">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="heading-lg">
                  {searchTerm ? "Search Results" : "Public Galleries"}
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

            {/* Gallery Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredGalleries.map((gallery, index) => (
                <Card key={gallery.id} className="card-premium group hover:scale-[1.02] transition-all duration-300" style={{ animationDelay: `${index * 100}ms` }}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Camera className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-serif truncate group-hover:text-primary transition-colors">
                          {gallery.name}
                        </CardTitle>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Users className="h-3 w-3" />
                          <span className="truncate">{gallery.client_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center text-muted-foreground text-xs">
                        <Eye className="w-3 h-3 mr-1" />
                        {gallery.view_count}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                      {gallery.description || "A beautiful collection of moments captured in time."}
                    </p>
                    
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>{formatDate(gallery.created_at)}</span>
                      </div>
                      <Button asChild size="sm" className="btn-premium group/btn" onClick={() => incrementViewCount(gallery.id)}>
                        <Link to={`/gallery/${gallery.id}`} className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          <span>View</span>
                          <ArrowRight className="h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

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
              <Camera className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Create Your Own</span>
            </div>
            
            <h3 className="heading-xl mb-6">
              Share Your Photography
            </h3>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Create your own gallery and share your beautiful moments with the world. 
              Choose to keep them private or make them public for everyone to enjoy.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Button asChild className="btn-premium">
                <Link to="/auth">Get Started</Link>
              </Button>
              <Button variant="outline" asChild className="btn-premium-outline">
                <Link to="/galleries">Browse All</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}