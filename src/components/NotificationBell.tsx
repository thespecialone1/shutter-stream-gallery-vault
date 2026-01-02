import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Bell, Heart, MessageCircle, Calendar, User, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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

export const NotificationBell = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    
    const channel = supabase
      .channel('notifications-bell')
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Count unread
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      setUnreadCount(count || 0);

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
    }
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

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return date.toLocaleDateString();
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-xl overflow-hidden z-50">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">{unreadCount} new</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Bell className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications</p>
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
                    className={`p-3 hover:bg-muted/50 transition-colors flex gap-3 ${
                      !notification.is_read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={avatarUrl} />
                        <AvatarFallback className="text-xs">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
                        notification.type === 'like' ? 'bg-destructive' : 'bg-primary'
                      }`}>
                        <Icon className="h-2 w-2 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <Link
            to="/feed"
            onClick={() => setIsOpen(false)}
            className="block p-3 border-t border-border text-center text-sm font-medium text-primary hover:bg-muted/50 transition-colors"
          >
            View All
            <ChevronRight className="h-4 w-4 inline ml-1" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;