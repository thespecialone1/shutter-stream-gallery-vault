
import React, { useState, useEffect } from 'react';
import { Plus, FolderOpen, Upload, Settings, ExternalLink, Eye, LogOut, User, BarChart3, RefreshCcw, Sparkles } from 'lucide-react';
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
import AnonymousFavoritesAnalytics from '@/components/AnonymousFavoritesAnalytics';
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

    // Validate and sanitize inputs
    const nameValidation = validateGalleryName(rawName);
    if (!nameValidation.valid) {
      toast({
        title: "Invalid Gallery Name",
        description: nameValidation.error,
        variant: "destructive"
      });
      return;
    }

    const clientNameValidation = validateClientName(rawClientName);
    if (!clientNameValidation.valid) {
      toast({
        title: "Invalid Client Name",
        description: clientNameValidation.error,
        variant: "destructive"
      });
      return;
    }

    const descriptionValidation = validateDescription(rawDescription);
    if (!descriptionValidation.valid) {
      toast({
        title: "Invalid Description",
        description: descriptionValidation.error,
        variant: "destructive"
      });
      return;
    }

    // Rate limiting check
    if (!globalRateLimit.checkLimit('gallery_creation', 3, 5 * 60 * 1000)) {
      const remainingTime = Math.ceil(globalRateLimit.getRemainingTime('gallery_creation') / 1000 / 60);
      toast({
        title: "Rate Limit Exceeded",
        description: `Please wait ${remainingTime} minutes before creating another gallery`,
        variant: "destructive"
      });
      return;
    }

    const name = nameValidation.sanitized;
    const description = descriptionValidation.sanitized;
    const clientName = clientNameValidation.sanitized;

    if (!password && !isPublicGallery) {
      toast({
        title: "Error",
        description: "Password is required for private galleries",
        variant: "destructive"
      });
      return;
    }

    try {
      let hashedPassword = null;
      
      // Only hash password if it's a private gallery
      if (!isPublicGallery && password) {
        const { data: hashResult, error: hashError } = await supabase.rpc('hash_password_secure', {
          password: password
        });
        if (hashError) {
          console.error('Password hashing error:', hashError);
          throw new Error(`Password hashing failed: ${hashError.message}`);
        }
        hashedPassword = hashResult;
      }
      
      const { data, error } = await supabase
        .from('galleries')
        .insert({
          name,
          description,
          client_name: clientName,
          password_hash: hashedPassword,
          photographer_id: user?.id,
          is_public: isPublicGallery
        })
        .select('id, name, description, client_name, created_at, updated_at, view_count, is_public, photographer_id')
        .single();

      if (error) throw error;

      setGalleries(prev => [data, ...prev]);
      setIsCreateGalleryOpen(false);
      setIsPublicGallery(false); // Reset the toggle
      
      toast({
        title: "Gallery created",
        description: `Gallery "${name}" has been created successfully`
      });
    } catch (error: any) {
      console.error('Error creating gallery:', error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to create gallery";
      if (error?.message?.includes('permission')) {
        errorMessage = "Permission denied. Please make sure you're logged in.";
      } else if (error?.message?.includes('hash_password_secure')) {
        errorMessage = "Password security function error. Please try a different password.";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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
    // Since the admin owns the gallery, bypass password verification
    setSelectedGallery(gallery);
    setIsPasswordVerified(true);
    setShowPasswordDialog(false);
  };

  const verifyGalleryPassword = async () => {
    if (!selectedGallery || !galleryPassword) return;

    try {
      const { data, error } = await supabase.rpc('verify_gallery_access', {
        gallery_id: selectedGallery.id,
        provided_password: galleryPassword
      });

      if (error) throw error;

      if ((data as any).success) {
        setIsPasswordVerified(true);
        setShowPasswordDialog(false);
        toast({
          title: "Access granted",
          description: "You can now manage this gallery"
        });
      } else {
        toast({
          title: "Invalid password",
          description: "Please enter the correct gallery password",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Password verification error:', error);
      toast({
        title: "Error",
        description: "Failed to verify password",
        variant: "destructive"
      });
    }
  };

  const convertHeicImages = async () => {
    if (!selectedGallery) return;

    setIsConvertingHeic(true);
    
    try {
      toast({
        title: "Converting HEIC Images",
        description: "Starting batch conversion of HEIC files to JPEG..."
      });

      const { data, error } = await supabase.functions.invoke('batch-convert-heic', {
        body: { galleryId: selectedGallery.id }
      });

      if (error) throw error;

      toast({
        title: "Conversion Complete",
        description: `Successfully converted ${data.converted} out of ${data.total} HEIC images`
      });

      if (data.errors > 0) {
        toast({
          title: "Some Conversions Failed",
          description: `${data.errors} images failed to convert. Check the browser console for details.`,
          variant: "destructive"
        });
        console.log('Conversion results:', data.results);
      }
    } catch (error) {
      console.error('HEIC conversion error:', error);
      toast({
        title: "Conversion Failed",
        description: "Failed to convert HEIC images. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsConvertingHeic(false);
    }
  };

  const convertDngImages = async () => {
    if (!selectedGallery) return;

    setIsConvertingDng(true);
    
    try {
      toast({
        title: "Converting DNG Images",
        description: "Starting batch conversion of DNG files to JPEG..."
      });

      const { data, error } = await supabase.functions.invoke('batch-convert-dng', {
        body: { galleryId: selectedGallery.id }
      });

      if (error) throw error;

      toast({
        title: "Conversion Complete",
        description: `Successfully processed ${data.processed} DNG images (${data.successful} successful, ${data.errors} errors)`
      });
      
    } catch (error) {
      console.error('DNG conversion error:', error);
      toast({
        title: "Conversion Failed",
        description: "Failed to convert DNG images. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsConvertingDng(false);
    }
  };
  
  // Test function to create a demo gallery
  const createDemoGallery = async () => {
    try {
      setLoading(true);
      
      // Create a public demo gallery
      const { data: publicGallery, error: publicError } = await supabase
        .from('galleries')
        .insert({
          name: 'Demo Public Gallery',
          description: 'A beautiful demo gallery showcasing our platform',
          client_name: 'Demo Client',
          password_hash: null,
          photographer_id: user?.id,
          is_public: true
        })
        .select('id, name, description, client_name, created_at, updated_at, view_count, is_public, photographer_id')
        .single();

      if (publicError) throw publicError;

      // Create a private demo gallery
      const { data: hashResult, error: hashError } = await supabase.rpc('hash_password_secure', {
        password: 'demo123'
      });
      if (hashError) throw hashError;

      const { data: privateGallery, error: privateError } = await supabase
        .from('galleries')
        .insert({
          name: 'Demo Private Gallery',
          description: 'A password-protected demo gallery (password: demo123)',
          client_name: 'Private Demo Client',
          password_hash: hashResult,
          photographer_id: user?.id,
          is_public: false
        })
        .select('id, name, description, client_name, created_at, updated_at, view_count, is_public, photographer_id')
        .single();

      if (privateError) throw privateError;

      // Update galleries list
      setGalleries(prev => [publicGallery, privateGallery, ...prev]);
      
      toast({
        title: "Demo galleries created!",
        description: `Created public and private demo galleries. Private gallery password: "demo123"`
      });
    } catch (error: any) {
      console.error('Error creating demo galleries:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create demo galleries",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Gallery Admin</h1>
              <p className="text-muted-foreground">Manage your photo galleries</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mr-4">
              <User className="w-4 h-4" />
              {user?.email}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={signOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
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
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" placeholder="Optional description" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="privacy-toggle" className="text-sm font-medium">
                      Gallery Privacy
                    </Label>
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
                  <Button type="button" variant="outline" onClick={() => setIsCreateGalleryOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Gallery</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {galleries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No galleries yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first gallery to get started or try our demo
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setIsCreateGalleryOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Gallery
              </Button>
              <Button variant="outline" onClick={createDemoGallery}>
                <Sparkles className="w-4 h-4 mr-2" />
                Create Demo Galleries
              </Button>
            </div>
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
                      onClick={() => handleGallerySelect(gallery)}
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
            {selectedGallery && isPasswordVerified ? (
              <Tabs defaultValue="analytics" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="analytics">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Analytics
                  </TabsTrigger>
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

                <TabsContent value="analytics" className="space-y-4">
                  <GalleryAnalytics 
                    galleryId={selectedGallery.id} 
                    galleryName={selectedGallery.name}
                  />
                  <AnonymousFavoritesAnalytics galleryId={selectedGallery.id} />
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedGallery.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Client: {selectedGallery.client_name}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <ImageUpload
                          galleryId={selectedGallery.id}
                          onUploadComplete={(images) => {
                            toast({
                              title: "Upload complete",
                              description: `Uploaded ${images.length} image(s) successfully`
                            });
                          }}
                        />
                        
                        <div className="border-t pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-medium">HEIC Image Conversion</h4>
                              <p className="text-sm text-muted-foreground">
                                Convert existing HEIC images to JPEG for better browser compatibility
                              </p>
                            </div>
                            <Button 
                              onClick={convertHeicImages}
                              disabled={isConvertingHeic}
                              variant="outline"
                              size="sm"
                            >
                              {isConvertingHeic ? (
                                <>
                                  <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                                  Converting...
                                </>
                              ) : (
                                <>
                                  <RefreshCcw className="w-4 h-4 mr-2" />
                                  Convert HEIC Files
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        <div className="border-t pt-4">
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <h4 className="font-medium mb-2">DNG Image Support</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              DNG files are now automatically converted to JPEG during upload in the browser. 
                              No server processing or API keys required!
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Legacy batch conversion has been replaced with client-side processing.
                            </p>
                          </div>
                        </div>
                       </div>
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

                <TabsContent value="settings" className="space-y-4">
                  <GallerySettings
                    gallery={selectedGallery}
                    onGalleryUpdated={handleGalleryUpdated}
                  />
                  <ShareLinksManager galleryId={selectedGallery.id} />
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

        {/* Password Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gallery Password Required</DialogTitle>
              <DialogDescription>
                Enter the password for "{selectedGallery?.name}" to access management features
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="galleryPassword">Password</Label>
                <Input
                  id="galleryPassword"
                  type="password"
                  value={galleryPassword}
                  onChange={(e) => setGalleryPassword(e.target.value)}
                  placeholder="Enter gallery password"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      verifyGalleryPassword();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowPasswordDialog(false);
                    setSelectedGallery(null);
                    setGalleryPassword('');
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={verifyGalleryPassword}>
                  Access Gallery
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
