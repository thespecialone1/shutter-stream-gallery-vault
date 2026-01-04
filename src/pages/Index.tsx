import { Button } from "@/components/ui/button";
import { Camera, Lock, Heart, Image, Users, Download, ArrowRight, Sparkles, Calendar, Send, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";

// Fallback images using local homePagePhotos (same as categories)
const CATEGORY_FALLBACKS: Record<string, string> = {
  "Wedding": "/homePagePhotos/wedding.jpg",
  "Portrait": "/homePagePhotos/portrait.webp",
  "Family": "/homePagePhotos/family.jpg",
  "Seniors": "/homePagePhotos/seniors.jpeg",
  "Events": "/homePagePhotos/events.jpg",
  "Adventure": "/homePagePhotos/adventure.webp",
  "Commercial": "/homePagePhotos/commercial.jpg",
  "Sports": "/homePagePhotos/sports.jpg",
};

const CATEGORIES = [
  { name: "Wedding", image: "/homePagePhotos/wedding.jpg" },
  { name: "Portrait", image: "/homePagePhotos/portrait.webp" },
  { name: "Family", image: "/homePagePhotos/family.jpg" },
  { name: "Seniors", image: "/homePagePhotos/seniors.jpeg" },
  { name: "Events", image: "/homePagePhotos/events.jpg" },
  { name: "Adventure", image: "/homePagePhotos/adventure.webp" },
  { name: "Commercial", image: "/homePagePhotos/commercial.jpg" },
  { name: "Sports", image: "/homePagePhotos/sports.jpg" },
];

// Use local homePagePhotos as placeholders for Featured Work (no Unsplash)
const PLACEHOLDER_IMAGES = [
  "/homePagePhotos/wedding.jpg",
  "/homePagePhotos/portrait.webp",
  "/homePagePhotos/family.jpg",
  "/homePagePhotos/seniors.jpeg",
  "/homePagePhotos/events.jpg",
  "/homePagePhotos/adventure.webp",
  "/homePagePhotos/commercial.jpg",
  "/homePagePhotos/sports.jpg",
];

interface FeaturedImage {
  id: string;
  url: string;
  alt: string;
}

interface FeedPost {
  id: string;
  image_url: string;
  user_name: string;
  user_avatar?: string;
  caption?: string;
}

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<FeaturedImage[]>([]);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [categoryErrors, setCategoryErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    document.title = "Pixie - The Better Way to Share, Deliver & Sell Photos Online";
    const metaDesc = "Professional photo galleries for modern photographers. Share, deliver, proof and sell photos online beautifully.";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = metaDesc;

    loadFeaturedImages();
    loadFeedPosts();
  }, []);

  const loadFeaturedImages = async () => {
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
  };

  const loadFeedPosts = async () => {
    try {
      const { data: posts } = await supabase
        .from('feed_posts')
        .select('id, image_id, user_id, caption')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (!posts || posts.length === 0) return;

      const imageIds = posts.map(p => p.image_id);
      const userIds = [...new Set(posts.map(p => p.user_id))];

      const [imagesResult, profilesResult] = await Promise.all([
        supabase.from('images').select('id, full_path, thumbnail_path').in('id', imageIds),
        Promise.all(userIds.map(uid => 
          supabase.rpc('get_public_profile', { profile_user_id: uid })
        ))
      ]);

      const imageMap = new Map((imagesResult.data || []).map(img => [img.id, img]));
      const profileMap = new Map();
      profilesResult.forEach(r => {
        if (r.data?.[0]) profileMap.set(r.data[0].user_id, r.data[0]);
      });

      const enriched = posts.map(post => {
        const image = imageMap.get(post.image_id);
        const profile = profileMap.get(post.user_id);
        const imagePath = image?.full_path || image?.thumbnail_path;
        const imageUrl = imagePath 
          ? supabase.storage.from('gallery-images').getPublicUrl(imagePath).data.publicUrl 
          : '';

        return {
          id: post.id,
          image_url: imageUrl,
          user_name: profile?.display_name || profile?.full_name || 'Photographer',
          user_avatar: profile?.avatar_url,
          caption: post.caption
        };
      });

      setFeedPosts(enriched);
    } catch (e) {
      console.warn('Feed posts load failed', e);
    }
  };

  const handleImageError = (id: string) => {
    setImageErrors(prev => new Set(prev).add(id));
  };

  const handleCategoryError = (name: string) => {
    setCategoryErrors(prev => new Set(prev).add(name));
  };

  // Repeat featured images if not enough to fill 8 slots
  const getDisplayImages = () => {
    if (featured.length === 0) {
      return PLACEHOLDER_IMAGES.map((url, i) => ({ id: `placeholder-${i}`, url, alt: 'Photography showcase' }));
    }
    
    const result: FeaturedImage[] = [];
    for (let i = 0; i < 8; i++) {
      result.push(featured[i % featured.length]);
    }
    return result;
  };

  const displayImages = getDisplayImages();

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
                  <>
                    <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
                      <Link to="/browse">Browse</Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
                      <Link to="/feed">Feed</Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link to="/auth">Log In</Link>
                    </Button>
                  </>
                )
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="pt-16">
        {/* Hero Section - Full Width */}
        <section className="relative overflow-hidden">
          {/* Background Image Grid */}
          <div className="absolute inset-0 grid grid-cols-4 gap-1 opacity-20">
            {displayImages.slice(0, 4).map((img, i) => (
              <div key={i} className="h-full">
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
          
          <div className="relative container mx-auto px-4 py-20 sm:py-28 lg:py-36">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Made for all photographers</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-serif font-medium mb-6 text-foreground leading-tight tracking-tight">
                The better way to <br className="hidden sm:block" />
                <span className="text-primary">share, deliver & sell</span><br className="hidden sm:block" />
                photos online
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                From weddings to landscapes and everything in between, Pixie is built to elevate your business—and make your work look its best.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-base px-8 h-12">
                  <Link to={user ? "/admin" : "/auth"}>
                    Start Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="text-base px-8 h-12" asChild>
                  <Link to="/browse">
                    See Examples
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-16 sm:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-serif mb-4">Built for Every Style</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Whether you shoot weddings, portraits, or commercial work—Pixie adapts to your needs.
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.name}
                  to={`/browse?category=${cat.name.toLowerCase()}`}
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-muted"
                >
                  <img 
                    src={categoryErrors.has(cat.name) ? CATEGORY_FALLBACKS[cat.name] : cat.image} 
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    onError={() => handleCategoryError(cat.name)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <span className="text-white text-sm font-medium">{cat.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Galleries - Full Width Masonry */}
        <section className="py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl sm:text-4xl font-serif mb-2">Featured Work</h2>
                <p className="text-muted-foreground">Discover stunning photography from our community</p>
              </div>
              <Button variant="outline" asChild className="hidden sm:flex">
                <Link to="/browse">
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {displayImages.map((img, idx) => (
                <div 
                  key={img.id} 
                  className={`relative overflow-hidden rounded-xl bg-muted group cursor-pointer ${
                    idx === 0 ? 'md:col-span-2 md:row-span-2' : ''
                  }`}
                  onClick={() => navigate('/browse')}
                >
                  <div className={`w-full ${idx === 0 ? 'aspect-square' : 'aspect-[4/5]'}`}>
                    {imageErrors.has(img.id) ? (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Camera className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    ) : (
                      <img
                        src={img.url}
                        alt={img.alt}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading={idx < 4 ? "eager" : "lazy"}
                        onError={() => handleImageError(img.id)}
                      />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                </div>
              ))}
            </div>
            
            <div className="mt-8 text-center sm:hidden">
              <Button variant="outline" asChild>
                <Link to="/browse">View All Galleries</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Feed Section - Prominent */}
        {feedPosts.length > 0 && (
          <section className="py-16 sm:py-20 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-primary uppercase tracking-wide">Community Feed</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-serif">What Photographers Are Sharing</h2>
                </div>
                <Button asChild className="hidden sm:flex">
                  <Link to="/feed">
                    Explore Feed
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {feedPosts.map((post) => (
                  <Link
                    key={post.id}
                    to="/feed"
                    className="group relative aspect-square rounded-xl overflow-hidden bg-muted"
                  >
                    <img
                      src={post.image_url}
                      alt={post.caption || 'Feed post'}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-sm font-medium truncate">{post.user_name}</p>
                    </div>
                  </Link>
                ))}
              </div>
              
              <div className="mt-8 text-center sm:hidden">
                <Button asChild>
                  <Link to="/feed">Explore Feed</Link>
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Features Section - Modern Cards */}
        <section className="py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-serif mb-4">Everything You Need</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Professional tools designed to make delivering photos a breeze.
              </p>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {[
                { icon: Lock, title: "Password Protected", desc: "Share private galleries securely with clients only" },
                { icon: Image, title: "Beautiful Galleries", desc: "Elegant layouts that showcase your photography" },
                { icon: Heart, title: "Client Favorites", desc: "Let clients mark their favorite shots for selection" },
                { icon: Download, title: "Easy Downloads", desc: "Clients can download full-quality images instantly" },
              ].map((feature) => (
                <div 
                  key={feature.title}
                  className="group relative p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2 text-lg">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 sm:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-serif mb-4">Simple as 1-2-3</h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                { step: "1", icon: Camera, title: "Upload", desc: "Drag and drop your photos into beautiful galleries" },
                { step: "2", icon: Send, title: "Share", desc: "Send secure links to your clients instantly" },
                { step: "3", icon: Calendar, title: "Deliver", desc: "Clients browse, favorite, and download with ease" },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-serif mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 sm:py-28">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif mb-6">
                Ready to elevate your photography business?
              </h2>
              <p className="text-lg text-muted-foreground mb-10">
                Join photographers who trust Pixie to deliver their work professionally.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-base px-8 h-12">
                  <Link to={user ? "/admin" : "/auth"}>
                    {user ? "Go to Dashboard" : "Create Free Account"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-foreground" />
              <span className="font-serif text-foreground">Pixie</span>
            </div>
            <div className="flex gap-6">
              <Link to="/browse" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Browse
              </Link>
              <Link to="/feed" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Feed
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Pixie. Professional photo sharing.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;