
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Key, Eye, EyeOff, Globe, Lock, Image, Check } from 'lucide-react';

interface Gallery {
  id: string;
  name: string;
  description?: string;
  client_name: string;
  created_at: string;
  updated_at?: string;
  view_count?: number;
  photographer_id?: string;
  is_public?: boolean;
  cover_image_id?: string | null;
}

interface GalleryImage {
  id: string;
  thumbnail_path: string | null;
  full_path: string;
  original_filename: string;
}

interface GallerySettingsProps {
  gallery: Gallery;
  onGalleryUpdated: (gallery: Gallery) => void;
}

export function GallerySettings({ gallery, onGalleryUpdated }: GallerySettingsProps) {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const [isUpdatingCover, setIsUpdatingCover] = useState(false);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadGalleryImages();
  }, [gallery.id]);

  const loadGalleryImages = async () => {
    setLoadingImages(true);
    try {
      const { data, error } = await supabase
        .from('images')
        .select('id, thumbnail_path, full_path, original_filename')
        .eq('gallery_id', gallery.id)
        .order('upload_date', { ascending: true })
        .limit(20);

      if (error) throw error;
      setGalleryImages(data || []);
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setLoadingImages(false);
    }
  };

  const getImageUrl = (img: GalleryImage) => {
    const path = img.thumbnail_path || img.full_path;
    const { data } = supabase.storage.from('gallery-images').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleCoverSelect = async (imageId: string) => {
    setIsUpdatingCover(true);
    try {
      const { data, error } = await supabase
        .from('galleries')
        .update({ cover_image_id: imageId })
        .eq('id', gallery.id)
        .select('id, name, description, client_name, created_at, updated_at, view_count, is_public, photographer_id, cover_image_id')
        .single();

      if (error) throw error;

      onGalleryUpdated(data);
      toast({
        title: "Cover updated",
        description: "Gallery cover image has been updated"
      });
    } catch (error) {
      console.error('Error updating cover:', error);
      toast({
        title: "Error",
        description: "Failed to update cover image",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingCover(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!newPassword) {
      toast({
        title: "Error",
        description: "Please enter a new password",
        variant: "destructive"
      });
      return;
    }

    setIsUpdating(true);
    try {
      const { data: hashedPassword, error: hashError } = await supabase.rpc('hash_password_secure', {
        password: newPassword
      });

      if (hashError) {
        const errorMessage = hashError.message.includes('security requirements') 
          ? 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
          : hashError.message.includes('common or has been found in data breaches')
          ? 'This password is too common. Please choose a more secure password'
          : hashError.message;
        
        throw new Error(errorMessage);
      }
      
      const { data, error } = await supabase
        .from('galleries')
        .update({ password_hash: hashedPassword })
        .eq('id', gallery.id)
        .select('id, name, description, client_name, created_at, updated_at, view_count, is_public, photographer_id, cover_image_id')
        .single();

      if (error) throw error;

      onGalleryUpdated(data);
      setNewPassword('');
      toast({
        title: "Password updated",
        description: "Gallery password has been updated successfully"
      });
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Error",
        description: "Failed to update password",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrivacyToggle = async (isPublic: boolean) => {
    setIsUpdatingPrivacy(true);
    try {
      let updateData: any = { is_public: isPublic };
      
      if (isPublic) {
        updateData.password_hash = null;
      }
      
      const { data, error } = await supabase
        .from('galleries')
        .update(updateData)
        .eq('id', gallery.id)
        .select('id, name, description, client_name, created_at, updated_at, view_count, is_public, photographer_id, cover_image_id')
        .single();

      if (error) throw error;

      onGalleryUpdated(data);
      toast({
        title: "Privacy updated",
        description: `Gallery is now ${isPublic ? 'public' : 'private'}`
      });
    } catch (error) {
      console.error('Error updating privacy:', error);
      toast({
        title: "Error",
        description: "Failed to update gallery privacy",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cover Image Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Cover Image
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Select an image to use as the gallery cover in browse and previews
          </p>
          {loadingImages ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : galleryImages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No images uploaded yet</p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {galleryImages.map((img) => (
                <button
                  key={img.id}
                  onClick={() => handleCoverSelect(img.id)}
                  disabled={isUpdatingCover}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    gallery.cover_image_id === img.id 
                      ? 'border-primary ring-2 ring-primary/30' 
                      : 'border-transparent hover:border-muted-foreground/30'
                  }`}
                >
                  <img
                    src={getImageUrl(img)}
                    alt={img.original_filename}
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                  {gallery.cover_image_id === img.id && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <Check className="h-6 w-6 text-primary" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {gallery.is_public ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            Gallery Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">
                Privacy Settings
              </Label>
              <p className="text-xs text-muted-foreground">
                {gallery.is_public ? "Anyone can view without password" : "Password required for access"}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Label className="text-sm">Private</Label>
              <Switch
                checked={gallery.is_public || false}
                onCheckedChange={handlePrivacyToggle}
                disabled={isUpdatingPrivacy}
              />
              <Label className="text-sm">Public</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {!gallery.is_public && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Gallery Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="current-password">Current Password Status</Label>
              <div className="mt-2 p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  Password is currently set and protecting this gallery
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              onClick={handlePasswordUpdate}
              disabled={!newPassword || isUpdating}
            >
              {isUpdating ? 'Updating...' : 'Update Password'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Gallery Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Gallery URL</Label>
              <div className="mt-2 p-3 bg-muted rounded-md">
                <code className="text-sm">
                  {window.location.origin}/gallery/{gallery.id}
                </code>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Share this URL with clients to access the gallery
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
