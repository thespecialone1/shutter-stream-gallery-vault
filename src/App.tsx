import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FloatingChat } from "@/components/FloatingChat";
import { UsernamePrompt } from "@/components/UsernamePrompt";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Gallery from "./pages/Gallery";
import Galleries from "./pages/Galleries";
import BrowseGalleries from "./pages/BrowseGalleries";
import NotFound from "./pages/NotFound";
import ShareLink from "./pages/ShareLink";
import UserProfile from "./pages/UserProfile";
import Feed from "./pages/Feed";

const queryClient = new QueryClient();

// Chat and username prompt wrapper
const AppWrapper = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatUserId, setChatUserId] = useState<string | undefined>();
  const [chatUserName, setChatUserName] = useState<string | undefined>();
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);

  // Check if user needs to set username
  useEffect(() => {
    if (!user) return;

    const checkUsername = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .single();

      // Show prompt if no username set (only once per session)
      const promptShown = sessionStorage.getItem('username_prompt_shown');
      if (!promptShown && (!data || !(data as any).username)) {
        setShowUsernamePrompt(true);
        sessionStorage.setItem('username_prompt_shown', 'true');
      }
    };

    checkUsername();
  }, [user]);

  // Expose method to open chat globally
  useEffect(() => {
    (window as any).openChat = (userId?: string, userName?: string) => {
      setChatUserId(userId);
      setChatUserName(userName);
      setChatOpen(true);
    };

    return () => {
      delete (window as any).openChat;
    };
  }, []);

  return (
    <>
      {children}
      
      {/* Username Prompt */}
      <UsernamePrompt 
        open={showUsernamePrompt} 
        onOpenChange={setShowUsernamePrompt}
        onUsernameSet={() => setShowUsernamePrompt(false)}
      />
      
      {/* Floating Chat */}
      <FloatingChat
        isOpen={chatOpen}
        onClose={() => {
          setChatOpen(false);
          setChatUserId(undefined);
          setChatUserName(undefined);
        }}
        initialUserId={chatUserId}
        initialUserName={chatUserName}
      />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppWrapper>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/browse" element={<BrowseGalleries />} />
              <Route path="/galleries" element={<Galleries />} />
              <Route path="/gallery/:id" element={<Gallery />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/profile/:userId" element={<UserProfile />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/s/:alias" element={<ShareLink />} />
              <Route path="/share" element={<ShareLink />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppWrapper>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;