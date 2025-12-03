import { Button } from "@/components/ui/button";
import { Camera, Lock, Heart, Image, Download, Eye } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";
import { OnboardingGalleryCreator } from "@/components/OnboardingGalleryCreator";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<{ id: string; url: string; alt: string }[]>([]);

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
          .limit(6);

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

      <main className="pt-20">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-8 md:py-12">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Left: Text + CTA */}
            <div className="text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-medium mb-4 text-foreground">
                Share Your Photos<br />With the World
              </h1>
              <p className="text-muted-foreground text-lg mb-6 max-w-md mx-auto lg:mx-0">
                Create beautiful galleries and share them instantly. Your photos deserve to be seen.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8">
                <Button variant="outline" asChild>
                  <Link to="/feed">
                    <Eye className="mr-2 h-4 w-4" />
                    Explore Feed
                  </Link>
                </Button>
                {user && (
                  <Button variant="ghost" asChild>
                    <Link to="/admin">Go to Dashboard</Link>
                  </Button>
                )}
              </div>

              {/* Featured Photos Preview - Desktop */}
              {featured.length > 0 && (
                <div className="hidden lg:block">
                  <p className="text-sm text-muted-foreground mb-3">Recently shared</p>
                  <div className="grid grid-cols-3 gap-2">
                    {featured.slice(0, 6).map((img) => (
                      <div 
                        key={img.id}
                        className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => navigate('/feed')}
                      >
                        <img
                          src={img.url}
                          alt={img.alt}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Onboarding Creator */}
            <div>
              <OnboardingGalleryCreator />
            </div>
          </div>
        </section>

        {/* Features */}
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

        {/* Mobile Featured Photos */}
        {featured.length > 0 && (
          <section className="lg:hidden container mx-auto px-4 py-8">
            <p className="text-sm text-muted-foreground mb-3 text-center">Recently shared photos</p>
            <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
              {featured.slice(0, 6).map((img) => (
                <div 
                  key={img.id}
                  className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer"
                  onClick={() => navigate('/feed')}
                >
                  <img
                    src={img.url}
                    alt={img.alt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
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
