import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Calendar, MessageCircle, Grid, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface PhotographerSidePanelProps {
  userId: string;
  userName: string;
  userAvatar?: string;
  side: 'left' | 'right';
  isVisible: boolean;
  onClose: () => void;
}

interface Gallery {
  id: string;
  name: string;
  cover_url?: string;
}

export const PhotographerSidePanel = ({ 
  userId, 
  userName, 
  userAvatar, 
  side, 
  isVisible,
  onClose 
}: PhotographerSidePanelProps) => {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (isVisible && userId) {
      loadPhotographerData();
    }
  }, [isVisible, userId]);

  const loadPhotographerData = async () => {
    // Load profile
    const { data: profileData } = await supabase
      .rpc('get_public_profile', { profile_user_id: userId });
    
    if (profileData?.[0]) {
      setProfile(profileData[0]);
    }

    // Load galleries
    const { data: galleriesData } = await supabase
      .from('galleries')
      .select('id, name, cover_image_id')
      .eq('photographer_id', userId)
      .eq('is_public', true)
      .limit(4);

    if (galleriesData) {
      const galleriesWithCovers = await Promise.all(
        galleriesData.map(async (g) => {
          let cover_url;
          if (g.cover_image_id) {
            const { data: img } = await supabase
              .from('images')
              .select('thumbnail_path, full_path')
              .eq('id', g.cover_image_id)
              .single();
            
            if (img) {
              const path = img.thumbnail_path || img.full_path;
              cover_url = supabase.storage.from('gallery-images').getPublicUrl(path).data.publicUrl;
            }
          }
          return { id: g.id, name: g.name, cover_url };
        })
      );
      setGalleries(galleriesWithCovers);
    }
  };

  const initials = userName.substring(0, 2).toUpperCase();
  const avatarUrl = userAvatar?.startsWith('http') 
    ? userAvatar 
    : userAvatar 
      ? supabase.storage.from('gallery-images').getPublicUrl(userAvatar).data.publicUrl
      : undefined;

  return (
    <>
      {/* Backdrop */}
      {isVisible && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}
      
      {/* Panel */}
      <div 
        className={`fixed top-0 ${side === 'left' ? 'left-0' : 'right-0'} h-full w-80 sm:w-96 bg-card border-${side === 'left' ? 'r' : 'l'} border-border shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isVisible 
            ? 'translate-x-0' 
            : side === 'left' ? '-translate-x-full' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-serif text-lg">Photographer</h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Profile Section */}
          <div className="p-6 text-center border-b border-border">
            <Avatar className="h-20 w-20 mx-auto mb-4 ring-4 ring-primary/10">
              <AvatarImage src={avatarUrl} alt={userName} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <h4 className="font-serif text-xl font-medium mb-1">{userName}</h4>
            {profile?.business_name && (
              <p className="text-sm text-muted-foreground mb-3">{profile.business_name}</p>
            )}
            {profile?.bio && (
              <p className="text-sm text-muted-foreground line-clamp-3">{profile.bio}</p>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 space-y-3 border-b border-border">
            <Button className="w-full" asChild>
              <Link to={`/profile/${userId}`}>
                <Grid className="h-4 w-4 mr-2" />
                View Portfolio
              </Link>
            </Button>
            <Button variant="outline" className="w-full">
              <Calendar className="h-4 w-4 mr-2" />
              Book a Session
            </Button>
            <Button variant="outline" className="w-full">
              <MessageCircle className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </div>

          {/* Galleries Preview */}
          {galleries.length > 0 && (
            <div className="flex-1 p-4 overflow-auto">
              <h5 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                Recent Galleries
              </h5>
              <div className="grid grid-cols-2 gap-2">
                {galleries.map((gallery) => (
                  <Link
                    key={gallery.id}
                    to={`/gallery/${gallery.id}`}
                    className="group relative aspect-square rounded-lg overflow-hidden bg-muted"
                  >
                    {gallery.cover_url ? (
                      <img
                        src={gallery.cover_url}
                        alt={gallery.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Grid className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs font-medium truncate">{gallery.name}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Side Arrow Button Component
interface SideArrowButtonProps {
  side: 'left' | 'right';
  onClick: () => void;
  isActive: boolean;
}

export const SideArrowButton = ({ side, onClick, isActive }: SideArrowButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed ${side === 'left' ? 'left-2 sm:left-4' : 'right-2 sm:right-4'} top-1/2 -translate-y-1/2 z-30
        w-10 h-10 sm:w-12 sm:h-12 rounded-full 
        flex items-center justify-center
        transition-all duration-300 ease-out
        ${isHovered || isActive
          ? 'bg-primary text-primary-foreground shadow-lg scale-110' 
          : 'bg-muted/50 text-muted-foreground hover:bg-muted'
        }
        backdrop-blur-sm border border-border/50
      `}
      aria-label={`View photographer ${side === 'left' ? 'info' : 'portfolio'}`}
    >
      <Icon className={`h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300 ${isHovered ? (side === 'left' ? '-translate-x-0.5' : 'translate-x-0.5') : ''}`} />
    </button>
  );
};