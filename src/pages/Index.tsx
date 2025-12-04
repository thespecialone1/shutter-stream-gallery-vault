import { Button } from "@/components/ui/button";
import { Camera, Lock, Heart, Image, Users, Download, Shield, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<{ id: string; url: string; alt: string }[]>([]);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    document.title = "Pixie - Professional Photo Sharing for Photographers";
    const metaDesc = "Securely share wedding and event photos with your clients. Create beautiful, password-protected galleries.";
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

  const handleImageError = (id: string) => {
    setImageErrors(prev => new Set(prev).add(id));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
                    <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
                      <Link to="/feed">Feed</Link>
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
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-12 sm:py-16">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-medium mb-4 text-foreground leading-tight">
              Securely Share Your <br className="hidden sm:block" />
              <span className="text-primary">Wedding Photos</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              The elegant way for photographers to deliver photos to their clients. 
              Create private, password-protected galleries or share publicly.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {!loading && (
                user ? (
                  <Button asChild size="lg">
                    <Link to="/admin">
                      Create Gallery
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="lg">
                    <Link to="/auth">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )
              )}
              <Button variant="outline" size="lg" asChild>
                <Link to="/browse">
                  <Camera className="mr-2 h-4 w-4" />
                  Browse Galleries
                </Link>
              </Button>
            </div>
          </div>

          {/* Featured Photos Grid */}
          {featured.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 max-w-5xl mx-auto">
              {featured.slice(0, 8).map((img, idx) => (
                <div 
                  key={img.id} 
                  className={`relative overflow-hidden rounded-xl bg-muted aspect-square group cursor-pointer shadow-sm hover:shadow-lg transition-shadow ${
                    idx === 0 ? 'sm:col-span-2 sm:row-span-2' : ''
                  }`}
                  onClick={() => navigate('/browse')}
                >
                  {imageErrors.has(img.id) ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  ) : (
                    <img
                      src={img.url}
                      alt={img.alt}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      onError={() => handleImageError(img.id)}
                    />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state when no featured images */}
          {featured.length === 0 && (
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                {Array(8).fill(0).map((_, idx) => (
                  <div 
                    key={idx}
                    className={`bg-muted/50 rounded-xl aspect-square flex items-center justify-center border border-border/50 ${
                      idx === 0 ? 'sm:col-span-2 sm:row-span-2' : ''
                    }`}
                  >
                    <Camera className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                ))}
              </div>
              <p className="text-center text-muted-foreground mt-6 text-sm">
                Be the first photographer to share your work
              </p>
            </div>
          )}
        </section>

        {/* Features Section */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-serif text-center mb-10">Built for Professional Photographers</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-medium mb-2">Password Protected</h3>
                <p className="text-sm text-muted-foreground">Share private galleries securely with your clients only</p>
              </div>
              
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Image className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-medium mb-2">Beautiful Galleries</h3>
                <p className="text-sm text-muted-foreground">Elegant layouts that showcase your photography</p>
              </div>
              
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-medium mb-2">Client Favorites</h3>
                <p className="text-sm text-muted-foreground">Let clients mark their favorite shots for easy selection</p>
              </div>

              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Download className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-medium mb-2">Easy Downloads</h3>
                <p className="text-sm text-muted-foreground">Clients can download full-quality images instantly</p>
              </div>
            </div>
          </div>
        </section>

        {/* Social Feed Teaser */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-primary/5 border border-primary/10">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Community</span>
            </div>
            <h2 className="text-2xl font-serif mb-4">Discover Amazing Photography</h2>
            <p className="text-muted-foreground mb-6">
              Make your galleries public to join our community feed. Get discovered, receive feedback, and connect with other photographers.
            </p>
            <Button variant="outline" asChild>
              <Link to="/feed">
                Explore the Feed
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-b from-background to-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-xl mx-auto text-center">
              <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-serif mb-4">Trusted by Photographers</h2>
              <p className="text-muted-foreground mb-8">
                Join photographers who trust Pixie to deliver their work professionally and securely.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {!loading && (
                  user ? (
                    <Button asChild size="lg">
                      <Link to="/admin">Go to Dashboard</Link>
                    </Button>
                  ) : (
                    <Button asChild size="lg">
                      <Link to="/auth">Create Free Account</Link>
                    </Button>
                  )
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-foreground" />
              <span className="font-serif text-foreground">Pixie</span>
            </div>
            <p className="text-xs text-muted-foreground">
              © 2024 Pixie. Secure photo sharing for professionals.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
