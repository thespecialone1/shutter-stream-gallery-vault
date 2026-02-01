import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, Camera, ArrowRight, Share2, Copy, CheckCircle, User, Lock } from "lucide-react";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Gallery {
  id: string;
  name: string;
  description: string | null;
  client_name: string;
  created_at: string;
  view_count: number;
  is_public: boolean;
  photographer_id?: string;
}

interface GalleryWithCover extends Gallery {
  coverUrl?: string;
}

export default function BrowseGalleries() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [galleries, setGalleries] = useState<GalleryWithCover[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showMyGalleries, setShowMyGalleries] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadGalleries();
  }, [showMyGalleries, user]);

  const loadGalleries = async () => {
    try {
      setLoading(true);
      
      let data: any[] = [];
      let error: any = null;
      
      if (showMyGalleries && user) {
        // Owner can access full galleries table for their own galleries
        const result = await supabase
          .from('galleries')
          .select('id, name, description, client_name, created_at, view_count, is_public, photographer_id, cover_image_id')
          .eq('photographer_id', user.id)
          .order('view_count', { ascending: false })
          .limit(50);
        data = result.data || [];
        error = result.error;
      } else {
        // Use secure view for public galleries (excludes password_hash)
        const result = await supabase
          .from('galleries_public_secure')
          .select('id, name, description, client_name, created_at, view_count, is_public, photographer_id, cover_image_id')
          .order('view_count', { ascending: false })
          .limit(50);
        data = result.data || [];
        error = result.error;
      }

      if (error) throw error;

      const galleriesData = data || [];
      
      // Fetch cover images for each gallery
      const galleryIds = galleriesData.map(g => g.id);
      if (galleryIds.length > 0) {
        // Get all images for galleries
        const { data: images } = await supabase
          .from('images')
          .select('id, gallery_id, thumbnail_path, full_path')
          .in('gallery_id', galleryIds)
          .order('upload_date', { ascending: true });

        // Build cover map - use cover_image_id if set, otherwise first image
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

        // Override with explicit cover image if set (cover_image_id is in galleriesData now)
        galleriesData.forEach((g: any) => {
          if (g.cover_image_id && imageMap.has(g.cover_image_id)) {
            const coverImg = imageMap.get(g.cover_image_id)!;
            const path = coverImg.thumbnail_path || coverImg.full_path;
            const { data } = supabase.storage.from('gallery-images').getPublicUrl(path);
            coverMap.set(g.id, data.publicUrl);
          }
        });

        const galleriesWithCovers: GalleryWithCover[] = galleriesData.map(g => ({
          ...g,
          coverUrl: coverMap.get(g.id)
        }));
        
        setGalleries(galleriesWithCovers);
      } else {
        setGalleries([]);
      }
    } catch (error) {
      console.error('Error loading galleries:', error);
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

  const generateInvite = async (galleryId: string) => {
    if (!user) return;
    
    setGeneratingInvite(true);
    try {
      const { data, error } = await supabase.rpc('create_gallery_invite', {
        gallery_id: galleryId,
        max_uses: null,
        expires_in_days: 30
      });

      if (error) throw error;
      
      const response = data as any;
      if (response?.success) {
        const inviteUrl = `${window.location.origin}/gallery/${galleryId}?invite=${response.invite_token}`;
        setGeneratedInvite(inviteUrl);
      } else {
        toast({
          title: "Error",
          description: response?.message || "Failed to generate invite",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error generating invite:', error);
      toast({
        title: "Error",
        description: "Failed to generate invite link",
        variant: "destructive",
      });
    } finally {
      setGeneratingInvite(false);
    }
  };

  const copyInviteLink = async () => {
    if (!generatedInvite) return;
    
    try {
      await navigator.clipboard.writeText(generatedInvite);
      toast({
        title: "Copied!",
        description: "Invite link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const handleImageError = (id: string) => {
    setImageErrors(prev => new Set(prev).add(id));
  };

  const filteredGalleries = galleries.filter(gallery =>
    gallery.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gallery.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="nav-premium sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Camera className="h-6 w-6 text-foreground" />
              <span className="text-xl font-serif font-medium text-foreground">Pixie</span>
            </Link>
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/admin">Dashboard</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/feed">Feed</Link>
                  </Button>
                  <UserProfileDropdown />
                </>
              ) : (
                <Button asChild size="sm">
                  <Link to="/auth">Sign In</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-8 bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-serif mb-3">
              {showMyGalleries ? "My Galleries" : "Browse Galleries"}
            </h1>
            
            <p className="text-muted-foreground mb-6">
              {showMyGalleries 
                ? "Manage and share your photography collections"
                : "Discover stunning photography from talented photographers"
              }
            </p>

            {/* Toggle Switch */}
            {user && (
              <div className="flex items-center justify-center gap-3 mb-6">
                <Label htmlFor="gallery-toggle" className={`text-sm ${!showMyGalleries ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  Public
                </Label>
                <Switch
                  id="gallery-toggle"
                  checked={showMyGalleries}
                  onCheckedChange={setShowMyGalleries}
                />
                <Label htmlFor="gallery-toggle" className={`text-sm ${showMyGalleries ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  Mine
                </Label>
              </div>
            )}

            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search galleries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 rounded-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden bg-muted animate-pulse">
                <div className="aspect-[4/3] bg-muted-foreground/10" />
                <div className="p-4 space-y-2">
                  <div className="h-5 bg-muted-foreground/10 rounded w-3/4" />
                  <div className="h-4 bg-muted-foreground/10 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredGalleries.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <Camera className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-medium mb-2">
              {searchTerm ? "No galleries found" : "No galleries yet"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchTerm
                ? "Try adjusting your search terms"
                : showMyGalleries 
                  ? "Create your first gallery to get started"
                  : "Check back later for amazing photography"}
            </p>
            {showMyGalleries && (
              <Button asChild>
                <Link to="/admin">Create Gallery</Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Results count */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-muted-foreground">
                {filteredGalleries.length} {filteredGalleries.length === 1 ? "gallery" : "galleries"}
              </p>
              {searchTerm && (
                <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")}>
                  Clear search
                </Button>
              )}
            </div>

            {/* Gallery Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredGalleries.map((gallery) => (
                <Card 
                  key={gallery.id} 
                  className="group overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-card"
                >
                  {/* Cover Image */}
                  <Link 
                    to={`/gallery/${gallery.id}`} 
                    onClick={() => incrementViewCount(gallery.id)}
                    className="block"
                  >
                    <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                      {gallery.coverUrl && !imageErrors.has(gallery.id) ? (
                        <img
                          src={gallery.coverUrl}
                          alt={gallery.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="eager"
                          onError={() => handleImageError(gallery.id)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                          <Camera className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      {/* Privacy badge */}
                      {!gallery.is_public && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-background/90 rounded-full flex items-center gap-1">
                          <Lock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Private</span>
                        </div>
                      )}
                      
                      {/* View count */}
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded-full flex items-center gap-1 text-white text-xs">
                        <Eye className="h-3 w-3" />
                        {gallery.view_count}
                      </div>
                    </div>
                  </Link>

                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Link 
                          to={`/gallery/${gallery.id}`}
                          onClick={() => incrementViewCount(gallery.id)}
                          className="block"
                        >
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
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {showMyGalleries && user && gallery.photographer_id === user.id && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedGalleryId(gallery.id);
                              setGeneratedInvite(null);
                              setInviteDialogOpen(true);
                            }}
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button asChild size="icon" variant="ghost" className="h-8 w-8" onClick={() => incrementViewCount(gallery.id)}>
                          <Link to={`/gallery/${gallery.id}`}>
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Gallery</DialogTitle>
            <DialogDescription>
              Generate an invite link to share this gallery. Valid for 30 days.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {!generatedInvite ? (
              <Button
                onClick={() => selectedGalleryId && generateInvite(selectedGalleryId)}
                disabled={generatingInvite}
                className="w-full"
              >
                {generatingInvite ? "Generating..." : "Generate Invite Link"}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Invite link generated!
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <code className="text-xs break-all">{generatedInvite}</code>
                </div>
                <Button onClick={copyInviteLink} className="w-full">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* CTA Section */}
      {!user && (
        <section className="py-12 bg-muted/30 border-t">
          <div className="container mx-auto px-4 text-center">
            <h3 className="text-xl font-serif mb-3">Ready to share your photography?</h3>
            <p className="text-muted-foreground mb-6">
              Create beautiful galleries and share them securely with your clients.
            </p>
            <Button asChild>
              <Link to="/auth">Get Started Free</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
