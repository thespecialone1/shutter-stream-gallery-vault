import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, Link as LinkIcon } from "lucide-react";

const ShareLink = () => {
  const { alias } = useParams<{ alias: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<string>("Validating link...");

  useEffect(() => {
    document.title = "Secure Gallery Share Link";
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");

    const run = async () => {
      try {
        setStatus("Creating secure session...");
        const { data, error } = await supabase.rpc('create_session_from_share_link', {
          invite_token: token,
          alias: alias ?? null,
          user_agent: navigator.userAgent,
        });
        if (error) throw error;
        const res = data as any;
        if (!res?.success) {
          setStatus(res?.message || 'Invalid or expired link');
          toast({ title: 'Invalid link', description: res?.message || 'This share link is not valid anymore', variant: 'destructive' });
          setTimeout(() => navigate('/browse'), 1800);
          return;
        }

        const galleryId = res.gallery.id as string;
        const sessionToken = res.session_token as string;
        const expiresAt = res.expires_at as string | null;

        if (!galleryId || !sessionToken) {
          setStatus('Unexpected response from server');
          return;
        }

        sessionStorage.setItem(`gallery_session_${galleryId}`, sessionToken);
        if (expiresAt) sessionStorage.setItem(`gallery_expires_${galleryId}`, expiresAt);

        setStatus('Redirecting to gallery...');
        navigate(`/gallery/${galleryId}`);
      } catch (err: any) {
        console.error('Share link error', err);
        setStatus('Failed to process link');
        toast({ title: 'Error', description: err?.message || 'Failed to open share link', variant: 'destructive' });
        setTimeout(() => navigate('/browse'), 1800);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alias, location.search]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="py-10 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
            <LinkIcon className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">Opening Shared Gallery</h1>
          <p className="text-muted-foreground">{status}</p>
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <Camera className="w-4 h-4" />
            Secure session is being prepared
          </div>
          <div className="pt-2">
            <Button variant="outline" onClick={() => navigate('/browse')}>Go to Browse</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShareLink;
