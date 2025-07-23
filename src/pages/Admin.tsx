
import React, { useState, useEffect } from 'react';
import { Plus, FolderOpen, Upload, Settings, ExternalLink, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ImageUpload } from '@/components/ImageUpload';
import { ManageGalleryContent } from '@/components/ManageGalleryContent';
import { GallerySettings } from '@/components/GallerySettings';
import { Link } from 'react-router-dom';

interface Gallery {
  id: string;
  name: string;
  description: string;
  client_name: string;
  created_at: string;
}

export default function Admin() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null);
  const [isCreateGalleryOpen, setIsCreateGalleryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchGalleries();
  }, []);

  const fetchGalleries = async () => {
    try {
      const { data, error } = await supabase
        .from('galleries')
        .select('*')
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
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const clientName = formData.get('clientName') as string;
    const password = formData.get('password') as string;

    if (!name || !clientName || !password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      // Use base64 encoding for password consistency
      const passwordHash = btoa(password);
      
      const { data, error } = await supabase
        .from('galleries')
        .insert({
          name,
          description,
          client_name: clientName,
          password_hash: passwordHash
        })
        .select()
        .single();

      if (error) throw error;

      setGalleries(prev => [data, ...prev]);
      setIsCreateGalleryOpen(false);
      
      toast({
        title: "Gallery created",
        description: `Gallery "${name}" has been created successfully`
      });
    } catch (error) {
      console.error('Error creating gallery:', error);
      toast({
        title: "Error",
        description: "Failed to create gallery",
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
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gallery Admin</h1>
          <p className="text-muted-foreground">Manage your photo galleries</p>
        </div>
        
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
                <DialogDescription>
                  Set up a new photo gallery for your client
                </DialogDescription>
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
                  <Label htmlFor="password">Gallery Password *</Label>
                  <Input id="password" name="password" type="password" placeholder="Secure password for clients" required />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" placeholder="Optional description" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateGalleryOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Gallery</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {galleries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No galleries yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first gallery to get started
            </p>
            <Button onClick={() => setIsCreateGalleryOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Gallery
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gallery List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Galleries</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {galleries.map((gallery) => (
                  <div key={gallery.id} className="flex items-center gap-2">
                    <Button
                      variant={selectedGallery?.id === gallery.id ? "default" : "ghost"}
                      className="flex-1 justify-start"
                      onClick={() => setSelectedGallery(gallery)}
                    >
                      <FolderOpen className="w-4 h-4 mr-2" />
                      <div className="flex-1 text-left truncate">
                        <div className="font-medium truncate">{gallery.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {gallery.client_name}
                        </div>
                      </div>
                    </Button>
                    <Link to={`/gallery/${gallery.id}`}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Gallery Details */}
          <div className="lg:col-span-2">
            {selectedGallery ? (
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="upload">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </TabsTrigger>
                  <TabsTrigger value="manage">
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Manage
                  </TabsTrigger>
                  <TabsTrigger value="settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedGallery.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Client: {selectedGallery.client_name}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <ImageUpload
                        galleryId={selectedGallery.id}
                        onUploadComplete={(images) => {
                          toast({
                            title: "Upload complete",
                            description: `Uploaded ${images.length} image(s) successfully`
                          });
                        }}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="manage">
                  <ManageGalleryContent
                    gallery={selectedGallery}
                    onGalleryDeleted={handleGalleryDeleted}
                    onGalleryUpdated={handleGalleryUpdated}
                  />
                </TabsContent>

                <TabsContent value="settings">
                  <GallerySettings
                    gallery={selectedGallery}
                    onGalleryUpdated={handleGalleryUpdated}
                  />
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select a gallery</h3>
                  <p className="text-muted-foreground">
                    Choose a gallery from the list to manage its contents
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
