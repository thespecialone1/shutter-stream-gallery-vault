import React, { useState, useEffect } from 'react';
import { Plus, FolderOpen, Upload, Settings, ExternalLink, Eye, BarChart3, RefreshCcw, Sparkles, Heart, Camera } from 'lucide-react';
import { UserProfileDropdown } from '@/components/UserProfileDropdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ImageUpload } from '@/components/ImageUpload';
import { ManageGalleryContent } from '@/components/ManageGalleryContent';
import { GallerySettings } from '@/components/GallerySettings';
import { GalleryAnalytics } from '@/components/GalleryAnalytics';
import { GalleryFavoritesAnalytics } from '@/components/GalleryFavoritesAnalytics';
import { FavoritesManagement } from '@/components/FavoritesManagement';
import { Link } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import ShareLinksManager from '@/components/ShareLinksManager';
import { validateGalleryName, validateClientName, validateDescription, globalRateLimit } from '@/utils/security';

interface Gallery {
  id: string;
  name: string;
  description: string;
  client_name: string;
  created_at: string;
  updated_at?: string;
  view_count?: number;
  photographer_id?: string;
  is_public?: boolean;
}

export default function Admin() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null);
  const [isCreateGalleryOpen, setIsCreateGalleryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [galleryPassword, setGalleryPassword] = useState('');
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [isPublicGallery, setIsPublicGallery] = useState(false);
  const [isConvertingHeic, setIsConvertingHeic] = useState(false);
  const [isConvertingDng, setIsConvertingDng] = useState(false);
  const { toast } = useToast();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (user) {
      fetchGalleries();
    }
  }, [user]);

  const fetchGalleries = async () => {
    try {
      const { data, error } = await supabase
        .from('galleries')
        .select('id, name, description, client_name, created_at, updated_at, view_count, is_public, photographer_id')
        .eq('photographer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGalleries(data || []);
    } catch (error) {
      console.error('Error fetching galleries:', error);
      toast({
        title: "Error",
        description: "Failed to load galleries",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createGallery = async (formData: FormData) => {
    const rawName = formData.get('name') as string;
    const rawDescription = formData.get('description') as string;
    const rawClientName = formData.get('clientName') as string;
    const password = formData.get('password') as string;

    try {
      let hashedPassword = null;
      
      if (!isPublicGallery && password) {
        const { data: hashResult, error: hashError } = await supabase.rpc('hash_password_secure', {
          password: password
        });
        if (hashError) throw new Error(`Password hashing failed: ${hashError.message}`);
        hashedPassword = hashResult;
      }
      
      const { data, error } = await supabase
        .from('galleries')
        .insert({
          name: rawName,
          description: rawDescription,
          client_name: rawClientName,
          password_hash: hashedPassword,
          photographer_id: user?.id,
          is_public: isPublicGallery
        })
        .select('id, name, description, client_name, created_at, updated_at, view_count, is_public, photographer_id')
        .single();

      if (error) throw error;

      setGalleries(prev => [data, ...prev]);
      setIsCreateGalleryOpen(false);
      setIsPublicGallery(false);
      
      toast({
        title: "Gallery created",
        description: `Gallery "${rawName}" has been created successfully`
      });
    } catch (error: any) {
      console.error('Error creating gallery:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create gallery",
        variant: "destructive"
      });
    }
  };

  const handleGalleryDeleted = (galleryId: string) => {
    setGalleries(prev => prev.filter(g => g.id !== galleryId));
    if (selectedGallery?.id === galleryId) {
      setSelectedGallery(null);
    }
  };

  const handleGalleryUpdated = (updatedGallery: Gallery) => {
    setGalleries(prev => 
      prev.map(g => g.id === updatedGallery.id ? updatedGallery : g)
    );
    setSelectedGallery(updatedGallery);
  };

  const handleGallerySelect = (gallery: Gallery) => {
    setSelectedGallery(gallery);
    setIsPasswordVerified(true);
    setShowPasswordDialog(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading galleries...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Camera className="h-6 w-6" />
              <span className="text-xl font-serif">Pixie Studio</span>
            </Link>
            <UserProfileDropdown />
          </div>
        </header>
        
        <div className="container mx-auto py-8 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Gallery Admin</h1>
              <p className="text-muted-foreground">Manage your photo galleries</p>
            </div>
          </div>
        
        <Tabs defaultValue="galleries" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="galleries">
              <FolderOpen className="w-4 h-4 mr-2" />
              My Galleries
            </TabsTrigger>
            <TabsTrigger value="my-favorites">
              <Heart className="w-4 h-4 mr-2" />
              My Favorites
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="galleries" className="space-y-6">
            <div className="flex gap-2">
              <Link to="/galleries">
                <Button variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  View Galleries
                </Button>
              </Link>
              
              <Dialog open={isCreateGalleryOpen} onOpenChange={setIsCreateGalleryOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Gallery
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Gallery</DialogTitle>
                    <DialogDescription>Set up a new photo gallery for your client</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    createGallery(formData);
                  }} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Gallery Name *</Label>
                      <Input id="name" name="name" placeholder="Wedding Gallery" required />
                    </div>
                    <div>
                      <Label htmlFor="clientName">Client Name *</Label>
                      <Input id="clientName" name="clientName" placeholder="John & Jane Smith" required />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" name="description" placeholder="Optional description" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="privacy-toggle" className="text-sm font-medium">Gallery Privacy</Label>
                        <p className="text-xs text-muted-foreground">
                          {isPublicGallery ? "Anyone can view without password" : "Password required for access"}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="privacy-toggle" className="text-sm">Private</Label>
                        <Switch
                          id="privacy-toggle"
                          checked={isPublicGallery}
                          onCheckedChange={setIsPublicGallery}
                        />
                        <Label htmlFor="privacy-toggle" className="text-sm">Public</Label>
                      </div>
                    </div>
                    {!isPublicGallery && (
                      <div>
                        <Label htmlFor="password">Gallery Password *</Label>
                        <Input id="password" name="password" type="password" placeholder="Secure password for clients" required />
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsCreateGalleryOpen(false)}>Cancel</Button>
                      <Button type="submit">Create Gallery</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {galleries.length > 0 ? (
              <div className="grid gap-4">
                {galleries.map((gallery) => (
                  <Card key={gallery.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleGallerySelect(gallery)}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{gallery.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {gallery.is_public ? 'Public' : 'Private'}
                        </span>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">Client: {gallery.client_name}</p>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8">
                <div className="flex flex-col items-center gap-4">
                  <FolderOpen className="w-16 h-16 text-muted-foreground" />
                  <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">No Galleries Yet</h2>
                    <p className="text-muted-foreground mb-6">Create your first gallery to start sharing photos with clients</p>
                  </div>
                </div>
              </Card>
            )}

            {selectedGallery && (
              <Tabs defaultValue="analytics" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  <TabsTrigger value="favorites">Favorites</TabsTrigger>
                  <TabsTrigger value="upload">Upload</TabsTrigger>
                  <TabsTrigger value="manage">Manage</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="analytics">
                  <GalleryAnalytics galleryId={selectedGallery.id} galleryName={selectedGallery.name} />
                </TabsContent>

                <TabsContent value="favorites">
                  <GalleryFavoritesAnalytics galleryId={selectedGallery.id} />
                </TabsContent>

                <TabsContent value="upload">
                  <ImageUpload galleryId={selectedGallery.id} onUploadComplete={() => {}} />
                </TabsContent>

                <TabsContent value="manage">
                  <ManageGalleryContent
                    gallery={selectedGallery}
                    onGalleryDeleted={handleGalleryDeleted}
                    onGalleryUpdated={handleGalleryUpdated}
                  />
                </TabsContent>

                <TabsContent value="settings">
                  <GallerySettings gallery={selectedGallery} onGalleryUpdated={handleGalleryUpdated} />
                  <ShareLinksManager galleryId={selectedGallery.id} />
                </TabsContent>
              </Tabs>
            )}
          </TabsContent>
          
          <TabsContent value="my-favorites">
            <FavoritesManagement />
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </ProtectedRoute>
  );
}
