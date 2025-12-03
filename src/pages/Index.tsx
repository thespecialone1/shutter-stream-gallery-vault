import { Button } from "@/components/ui/button";
import { Camera, Lock, Heart, Image, Users, Download, Eye, ArrowRight, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<{ id: string; url: string; alt: string }[]>([]);
  const [showFeed, setShowFeed] = useState(false);

  useEffect(() => {
    document.title = "Pixie - Share Your Photos";
    const metaDesc = "Share beautiful photos with the world. Create galleries, discover stunning photography.";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = metaDesc;

    // Load featured images from public galleries
    (async () => {
      try {
        const { data: galleries } = await supabase
          .from('galleries')
          .select('id')
          .eq('is_public', true)
          .limit(8);
        
        const ids = (galleries || []).map((g: any) => g.id);
        if (ids.length === 0) return;

        const { data: imgs } = await supabase
          .from('images')
          .select('id, thumbnail_path, full_path, original_filename, gallery_id')
          .in('gallery_id', ids)
          .order('upload_date', { ascending: false })
          .limit(12);

        const mapped = (imgs || []).map((img: any) => {
          const path = img.thumbnail_path || img.full_path;
          const { data } = supabase.storage.from('gallery-images').getPublicUrl(path);
          return { id: img.id, url: data.publicUrl, alt: img.original_filename || 'Photo' };
        });
        setFeatured(mapped);
      } catch (e) {
        console.warn('Featured load failed', e);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Compact Header */}
      <header className="nav-premium fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Camera className="h-6 w-6 text-foreground" />
              <span className="text-xl font-serif font-medium text-foreground">Pixie</span>
            </Link>
            <div className="flex gap-3 items-center">
              {!loading && (
                user ? (
                  <>
                    <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
                      <Link to="/browse">Browse</Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/admin">Dashboard</Link>
                    </Button>
                    <UserProfileDropdown />
                  </>
                ) : (
                  <Button asChild size="sm">
                    <Link to="/auth">Log In</Link>
                  </Button>
                )
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="pt-16">
        {/* Hero - Compact and Photo-Focused */}
        <section className="container mx-auto px-4 py-8">
          {/* Navigation Toggle */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-1 p-1 bg-muted rounded-full">
              <Button
                variant={!showFeed ? "default" : "ghost"}
                size="sm"
                onClick={() => setShowFeed(false)}
                className="rounded-full px-4 h-8"
              >
                <Camera className="h-4 w-4 mr-1.5" />
                Galleries
              </Button>
              <Button
                variant={showFeed ? "default" : "ghost"}
                size="sm"
                onClick={() => navigate('/feed')}
                className="rounded-full px-4 h-8"
              >
                <Users className="h-4 w-4 mr-1.5" />
                Feed
              </Button>
            </div>
          </div>

          {/* Hero Content */}
          <div className="max-w-2xl mx-auto text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-serif font-medium mb-3 text-foreground">
              Share Your Photos
            </h1>
            <p className="text-muted-foreground mb-6">
              Create beautiful galleries and share them with the world
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {!loading && (
                user ? (
                  <Button asChild>
                    <Link to="/admin">
                      Create Gallery
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild>
                    <Link to="/auth">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )
              )}
              <Button variant="outline" asChild>
                <Link to="/feed">
                  <Eye className="mr-2 h-4 w-4" />
                  Explore Feed
                </Link>
              </Button>
            </div>
          </div>

          {/* Featured Photos Grid */}
          {featured.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 max-w-4xl mx-auto">
              {featured.slice(0, 8).map((img, idx) => (
                <div 
                  key={img.id} 
                  className={`relative overflow-hidden rounded-lg bg-muted aspect-square group cursor-pointer ${
                    idx === 0 ? 'sm:col-span-2 sm:row-span-2' : ''
                  }`}
                  onClick={() => navigate('/feed')}
                >
                  <img
                    src={img.url}
                    alt={img.alt}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state when no featured images */}
          {featured.length === 0 && (
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                {Array(8).fill(0).map((_, idx) => (
                  <div 
                    key={idx}
                    className={`bg-muted rounded-lg aspect-square flex items-center justify-center ${
                      idx === 0 ? 'sm:col-span-2 sm:row-span-2' : ''
                    }`}
                  >
                    <Camera className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                ))}
              </div>
              <p className="text-center text-muted-foreground mt-4 text-sm">
                Be the first to share your photos
              </p>
            </div>
          )}
        </section>

        {/* Features - Compact */}
        <section className="bg-muted/30 py-12">
          <div className="container mx-auto px-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Image className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium mb-1">Beautiful Galleries</h3>
                <p className="text-sm text-muted-foreground">Showcase your work elegantly</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium mb-1">Private or Public</h3>
                <p className="text-sm text-muted-foreground">Control who sees your photos</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Heart className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium mb-1">Get Feedback</h3>
                <p className="text-sm text-muted-foreground">Likes and comments on your work</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Download className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium mb-1">Easy Downloads</h3>
                <p className="text-sm text-muted-foreground">Full quality image access</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-12">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-2xl font-serif mb-3">Ready to share?</h2>
            <p className="text-muted-foreground mb-6">
              Join photographers sharing their best work
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {!loading && (
                user ? (
                  <Button asChild>
                    <Link to="/admin">Go to Dashboard</Link>
                  </Button>
                ) : (
                  <Button asChild>
                    <Link to="/auth">Create Free Account</Link>
                  </Button>
                )
              )}
              <Button variant="outline" asChild>
                <Link to="/browse">Browse Galleries</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-foreground" />
              <span className="font-serif text-foreground">Pixie</span>
            </div>
            <p className="text-xs text-muted-foreground">
              © 2024 Pixie. Share your world.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
