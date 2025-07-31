
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Key, Eye, EyeOff, Globe, Lock } from 'lucide-react';

interface Gallery {
  id: string;
  name: string;
  description: string;
  client_name: string;
  created_at: string;
  password_hash: string;
  is_public?: boolean;
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
  const { toast } = useToast();

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
      // Use secure SHA256 hashing with salt
      const { data: hashedPassword, error: hashError } = await supabase.rpc('hash_password', {
        password: newPassword
      });

      if (hashError) throw hashError;
      
      const { data, error } = await supabase
        .from('galleries')
        .update({ password_hash: hashedPassword })
        .eq('id', gallery.id)
        .select()
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
      
      // If switching to public, clear the password hash
      if (isPublic) {
        updateData.password_hash = null;
      }
      
      const { data, error } = await supabase
        .from('galleries')
        .update(updateData)
        .eq('id', gallery.id)
        .select()
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
