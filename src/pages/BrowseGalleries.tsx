import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Eye, Users, Camera } from "lucide-react";
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
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold text-foreground">
              PhotoVault
            </Link>
            <nav className="flex items-center space-x-6">
              <Link to="/galleries" className="text-muted-foreground hover:text-foreground transition-colors">
                All Galleries
              </Link>
              <Link to="/auth" className="text-muted-foreground hover:text-foreground transition-colors">
                Sign In
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 text-center">
          <Camera className="w-16 h-16 mx-auto mb-6 text-primary" />
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-foreground">
            Browse Public Galleries
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Discover stunning photography collections shared by photographers worldwide
          </p>
          
          {/* Search */}
          <div className="max-w-md mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search galleries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {searchTerm && (
            <div className="mb-8">
              <p className="text-muted-foreground">
                {filteredGalleries.length} galleries found for "{searchTerm}"
              </p>
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm("")}
                  className="text-primary hover:underline ml-2"
                >
                  Clear search
                </button>
              )}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-lg" />
              ))}
            </div>
          ) : filteredGalleries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredGalleries.map((gallery) => (
                <Card key={gallery.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">{gallery.name}</CardTitle>
                      <div className="flex items-center text-muted-foreground text-sm">
                        <Eye className="w-4 h-4 mr-1" />
                        {gallery.view_count}
                      </div>
                    </div>
                    <CardDescription>
                      <span className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {gallery.client_name}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {gallery.description && (
                      <p className="text-muted-foreground mb-4 line-clamp-3">
                        {gallery.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(gallery.created_at)}
                      </span>
                      <Link
                        to={`/gallery/${gallery.id}`}
                        onClick={() => incrementViewCount(gallery.id)}
                        className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                      >
                        View Gallery
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No galleries found</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? "Try adjusting your search terms"
                  : "No public galleries available at the moment"
                }
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-16 bg-muted/20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Share Your Photography</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create your own gallery and share your beautiful moments with the world. 
            Choose to keep them private or make them public for everyone to enjoy.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
}