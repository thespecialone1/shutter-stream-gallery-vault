import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, Check, X, AtSign } from "lucide-react";

interface ProfileSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileUpdated?: () => void;
}

export const ProfileSettings = ({ open, onOpenChange, onProfileUpdated }: ProfileSettingsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [originalUsername, setOriginalUsername] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    full_name: '',
    display_name: '',
    business_name: '',
    bio: '',
    email: '',
    phone: '',
    avatar_url: '',
    username: ''
  });

  useEffect(() => {
    if (open && user) {
      loadProfile();
    }
  }, [open, user]);

  // Check username availability with debounce
  useEffect(() => {
    const username = profile.username;
    
    // If unchanged from original, mark as available
    if (username === originalUsername) {
      setUsernameAvailable(true);
      setUsernameError(null);
      return;
    }

    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      setUsernameError(null);
      return;
    }

    // Validate alphanumeric
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      setUsernameAvailable(false);
      setUsernameError('Only letters (a-z) and numbers (0-9) allowed');
      return;
    }

    if (username.length > 30) {
      setUsernameAvailable(false);
      setUsernameError('Username must be 30 characters or less');
      return;
    }

    setUsernameError(null);
    const timer = setTimeout(async () => {
      setUsernameChecking(true);
      try {
        const { data, error } = await supabase.rpc('is_username_available', { 
          check_username: username 
        });
        
        if (error) throw error;
        setUsernameAvailable(data);
        if (!data) {
          setUsernameError('Username is already taken');
        }
      } catch (err) {
        console.error('Error checking username:', err);
        setUsernameAvailable(null);
      } finally {
        setUsernameChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [profile.username, originalUsername]);

  const loadProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data && !error) {
      setProfile({
        full_name: data.full_name || '',
        display_name: data.display_name || '',
        business_name: data.business_name || '',
        bio: data.bio || '',
        email: data.email || user.email || '',
        phone: data.phone || '',
        avatar_url: data.avatar_url || '',
        username: (data as any).username || ''
      });
      setOriginalUsername((data as any).username || null);
    } else if (!data && user.email) {
      // If profile doesn't exist yet, use user data
      setProfile(prev => ({
        ...prev,
        email: user.email || ''
      }));
      setOriginalUsername(null);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;

    const file = e.target.files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatars/${user.id}-${Date.now()}.${fileExt}`;

      // Upload to gallery-images bucket (reuse existing bucket)
      const { error: uploadError } = await supabase.storage
        .from('gallery-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Update profile with new avatar URL
      setProfile(prev => ({ ...prev, avatar_url: fileName }));

      toast({
        title: "Avatar uploaded",
        description: "Your profile picture has been updated. Click Save to apply changes."
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Validation
    if (!profile.full_name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your full name",
        variant: "destructive"
      });
      return;
    }

    if (profile.bio && profile.bio.length > 500) {
      toast({
        title: "Bio too long",
        description: "Bio must be less than 500 characters",
        variant: "destructive"
      });
      return;
    }

    // Username validation
    if (profile.username && profile.username !== originalUsername) {
      if (!usernameAvailable) {
        toast({
          title: "Username unavailable",
          description: usernameError || "Please choose a different username",
          variant: "destructive"
        });
        return;
      }
    }

    setLoading(true);
    try {
      const updateData: Record<string, any> = {
        full_name: profile.full_name.trim(),
        display_name: profile.display_name.trim() || null,
        business_name: profile.business_name.trim() || null,
        bio: profile.bio.trim() || null,
        phone: profile.phone.trim() || null,
        avatar_url: profile.avatar_url || null,
        updated_at: new Date().toISOString()
      };

      // Only include username if it's changed and valid
      if (profile.username && profile.username !== originalUsername && usernameAvailable) {
        updateData.username = profile.username.toLowerCase();
      }
      
      console.log('Attempting to update profile for user:', user.id);
      console.log('Update data:', updateData);

      // First check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking profile:', checkError);
        throw checkError;
      }

      let result;
      if (!existingProfile) {
        // Profile doesn't exist, insert it
        console.log('Profile does not exist, creating new profile');
        const insertData = {
          user_id: user.id,
          email: user.email || '',
          full_name: updateData.full_name,
          display_name: updateData.display_name,
          business_name: updateData.business_name,
          bio: updateData.bio,
          phone: updateData.phone,
          avatar_url: updateData.avatar_url,
          updated_at: updateData.updated_at,
          ...(updateData.username ? { username: updateData.username } : {})
        };
        result = await supabase
          .from('profiles')
          .insert(insertData)
          .select();
      } else {
        // Profile exists, update it
        console.log('Profile exists, updating');
        result = await supabase
          .from('profiles')
          .update(updateData)
          .eq('user_id', user.id)
          .select();
      }

      const { data, error } = result;

      if (error) {
        console.error('Supabase update/insert error:', error);
        throw error;
      }

      console.log('Profile saved successfully:', data);

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully. Refreshing..."
      });

      // Force reload the profile data
      await loadProfile();
      onProfileUpdated?.();
      
      // Small delay to ensure real-time updates propagate
      setTimeout(() => {
        onOpenChange(false);
      }, 500);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Get avatar URL - handle both avatars bucket and gallery-images bucket
  const avatarUrl = profile.avatar_url 
    ? (profile.avatar_url.startsWith('http') 
        ? profile.avatar_url 
        : supabase.storage.from('gallery-images').getPublicUrl(profile.avatar_url).data.publicUrl)
    : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information and avatar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarUrl} alt={profile.display_name || profile.full_name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {(profile.display_name || profile.full_name).substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent transition-colors">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span className="text-sm">{uploading ? 'Uploading...' : 'Upload Avatar'}</span>
                </div>
              </Label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                JPG, PNG or GIF (max 5MB)
              </p>
            </div>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username" className="flex items-center gap-2">
              <AtSign className="h-4 w-4" />
              Username
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                id="username"
                value={profile.username}
                onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value.replace(/[^a-zA-Z0-9]/g, '') }))}
                placeholder="yourname"
                className="pl-8 pr-10"
                maxLength={30}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameChecking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {!usernameChecking && usernameAvailable === true && profile.username && <Check className="h-4 w-4 text-green-500" />}
                {!usernameChecking && usernameAvailable === false && <X className="h-4 w-4 text-red-500" />}
              </div>
            </div>
            {usernameError && (
              <p className="text-sm text-destructive">{usernameError}</p>
            )}
            {usernameAvailable && !usernameError && profile.username && profile.username !== originalUsername && (
              <p className="text-sm text-green-600">Username is available!</p>
            )}
            <p className="text-xs text-muted-foreground">
              3-30 characters, letters and numbers only. Others can find and message you with this.
            </p>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              value={profile.full_name}
              onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="John Doe"
            />
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              value={profile.display_name}
              onChange={(e) => setProfile(prev => ({ ...prev, display_name: e.target.value }))}
              placeholder="How you want to be shown (optional)"
            />
          </div>

          {/* Business Name */}
          <div className="space-y-2">
            <Label htmlFor="business_name">Business Name</Label>
            <Input
              id="business_name"
              value={profile.business_name}
              onChange={(e) => setProfile(prev => ({ ...prev, business_name: e.target.value }))}
              placeholder="Your Studio Name"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={profile.bio}
              onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell us about yourself..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {profile.bio.length}/500 characters
            </p>
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={profile.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={profile.phone}
              onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
