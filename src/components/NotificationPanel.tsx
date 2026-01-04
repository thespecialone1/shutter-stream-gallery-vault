import { useState, useEffect } from "react";
import { Bell, Heart, MessageCircle, Calendar, User, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Notification {
  id: string;
  sender_id: string | null;
  type: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
}

export const NotificationPanel = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    
    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` },
        () => loadNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Enrich with sender profiles
      const senderIds = [...new Set((data || []).filter(n => n.sender_id).map(n => n.sender_id))];
      const profileResults = await Promise.all(
        senderIds.map(async (senderId) => {
          const { data: profile } = await supabase.rpc('get_public_profile', { profile_user_id: senderId });
          return profile?.[0];
        })
      );

      const profileMap = new Map(profileResults.filter(Boolean).map(p => [p.user_id, p]));

      const enriched = (data || []).map(n => {
        const profile = n.sender_id ? profileMap.get(n.sender_id) : null;
        return {
          ...n,
          sender_name: profile?.display_name || profile?.full_name,
          sender_avatar: profile?.avatar_url
        };
      });

      setNotifications(enriched);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false);
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return Heart;
      case 'comment': return MessageCircle;
      case 'booking': return Calendar;
      default: return Bell;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!user) return null;

  return (
    <div className="fixed left-0 top-16 bottom-0 w-80 z-20 hidden lg:flex flex-col">
      {/* Seamless panel - no border, blends with page */}
      <div className="h-full bg-background/60 backdrop-blur-sm flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <span className="font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-7 px-2 text-xs">
              <Check className="h-3 w-3 mr-1" />
              Read all
            </Button>
          )}
        </div>

        {/* Notifications List - scrolls independently */}
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1 pb-6">
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="p-3 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-muted rounded w-3/4" />
                      <div className="h-2 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = getIcon(notification.type);
                const avatarUrl = notification.sender_avatar
                  ? (notification.sender_avatar.startsWith('http')
                      ? notification.sender_avatar
                      : supabase.storage.from('gallery-images').getPublicUrl(notification.sender_avatar).data.publicUrl)
                  : undefined;

                return (
                  <div
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={`p-3 rounded-xl cursor-pointer transition-colors ${
                      notification.is_read 
                        ? 'hover:bg-muted/50' 
                        : 'bg-primary/5 hover:bg-primary/10'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={avatarUrl} />
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                          notification.type === 'like' ? 'bg-destructive' : 'bg-primary'
                        }`}>
                          <Icon className="h-2.5 w-2.5 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-tight">
                          {notification.message || `New ${notification.type}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default NotificationPanel;
