import { useState, useEffect, useRef } from 'react';
import { X, Send, ArrowLeft, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  updated_at: string;
  other_user: {
    user_id: string;
    display_name: string;
    avatar_url?: string;
  };
  last_message?: string;
  unread_count: number;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

interface FloatingChatProps {
  isOpen: boolean;
  onClose: () => void;
  initialUserId?: string;
  initialUserName?: string;
}

export const FloatingChat = ({ isOpen, onClose, initialUserId, initialUserName }: FloatingChatProps) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<{ name: string; avatar?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    if (!user || !isOpen) return;

    const loadConversations = async () => {
      setLoading(true);
      try {
        // Get conversations where user is a participant
        const { data: participations } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user.id);

        if (!participations?.length) {
          setConversations([]);
          setLoading(false);
          return;
        }

        const conversationIds = participations.map(p => p.conversation_id);

        // Get conversation details with other participants
        const { data: convData } = await supabase
          .from('conversations')
          .select('id, updated_at')
          .in('id', conversationIds)
          .order('updated_at', { ascending: false });

        if (!convData?.length) {
          setConversations([]);
          setLoading(false);
          return;
        }

        // Get other participants for each conversation
        const enrichedConversations: Conversation[] = [];
        
        for (const conv of convData) {
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conv.id)
            .neq('user_id', user.id);

          if (participants?.[0]) {
            const otherUserId = participants[0].user_id;
            const { data: profileData } = await supabase
              .rpc('get_public_profile', { profile_user_id: otherUserId });
            
            const profile = profileData?.[0];
            
            // Get last message
            const { data: lastMsg } = await supabase
              .from('messages')
              .select('content')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1);

            enrichedConversations.push({
              id: conv.id,
              updated_at: conv.updated_at,
              other_user: {
                user_id: otherUserId,
                display_name: profile?.display_name || profile?.full_name || 'User',
                avatar_url: profile?.avatar_url,
              },
              last_message: lastMsg?.[0]?.content,
              unread_count: 0,
            });
          }
        }

        setConversations(enrichedConversations);
      } catch (err) {
        console.error('Error loading conversations:', err);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [user, isOpen]);

  // Handle initial user (start new conversation)
  useEffect(() => {
    if (!user || !isOpen || !initialUserId) return;

    const startConversation = async () => {
      try {
        const { data: convId, error } = await supabase.rpc('find_or_create_conversation', {
          other_user_id: initialUserId
        });

        if (error) throw error;
        
        setSelectedConversation(convId);
        setOtherUser({ name: initialUserName || 'User' });
      } catch (err) {
        console.error('Error starting conversation:', err);
      }
    };

    startConversation();
  }, [user, isOpen, initialUserId, initialUserName]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConversation || !user) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('id, content, sender_id, created_at')
        .eq('conversation_id', selectedConversation)
        .order('created_at', { ascending: true });

      setMessages(data || []);
      
      // Mark as read
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', selectedConversation)
        .eq('user_id', user.id);
    };

    loadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${selectedConversation}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation,
          sender_id: user.id,
          content: newMessage.trim(),
        });

      if (error) throw error;
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv.id);
    setOtherUser({ 
      name: conv.other_user.display_name, 
      avatar: conv.other_user.avatar_url 
    });
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed bottom-4 right-4 w-80 sm:w-96 h-[500px] bg-card border border-border rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        {selectedConversation && otherUser ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setSelectedConversation(null);
                setOtherUser(null);
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium truncate flex-1 text-center">{otherUser.name}</span>
          </>
        ) : (
          <span className="font-medium flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Messages
          </span>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      {selectedConversation ? (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                    msg.sender_id === user.id
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {msg.content}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
                disabled={sending}
              />
              <Button type="submit" size="icon" disabled={!newMessage.trim() || sending}>
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </>
      ) : (
        <>
          {/* Conversation List */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">No messages yet</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Start a conversation from a photographer's profile
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conv.other_user.avatar_url} />
                      <AvatarFallback>
                        {conv.other_user.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">
                        {conv.other_user.display_name}
                      </p>
                      {conv.last_message && (
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.last_message}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </>
      )}
    </div>
  );
};