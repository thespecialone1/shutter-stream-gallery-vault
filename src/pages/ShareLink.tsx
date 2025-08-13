import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, Link as LinkIcon, AlertCircle } from "lucide-react";

const ShareLink = () => {
  const { alias } = useParams<{ alias: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<string>("Validating link...");
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    document.title = "Secure Gallery Share Link";
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");

    // Debug logging
    console.log('ShareLink Debug:', {
      alias,
      token: token ? 'present' : 'missing',
      pathname: location.pathname,
      search: location.search,
      timestamp: new Date().toISOString()
    });

    const run = async () => {
      try {
        setStatus("Creating secure session...");
        setError(null);
        
        // Get client IP (best effort)
        let clientIp = null;
        try {
          const ipResponse = await fetch('https://api.ipify.org?format=json');
          const ipData = await ipResponse.json();
          clientIp = ipData.ip;
        } catch (ipError) {
          console.log('Could not fetch IP:', ipError);
        }
        
        // Validate input parameters
        if (!alias && !token) {
          throw new Error('No share link identifier found. Please check the URL.');
        }

        console.log('Calling create_session_from_share_link with:', {
          invite_token: token ? 'present' : null,
          alias: alias || null,
          client_ip: clientIp,
          user_agent: navigator.userAgent
        });

        const { data, error } = await supabase.rpc('create_session_from_share_link', {
          invite_token: token,
          alias: alias ?? null,
          client_ip: clientIp,
          user_agent: navigator.userAgent,
        });

        console.log('RPC Response:', { data, error });

        if (error) throw error;
        const res = data as any;
        
        setDebugInfo(res);
        
        if (!res?.success) {
          const errorMessage = res?.message || 'Invalid or expired link';
          setStatus(errorMessage);
          setError(errorMessage);
          toast({ title: 'Invalid link', description: res?.message || 'This share link is not valid anymore', variant: 'destructive' });
          
          // Don't auto-redirect on error, let user decide
          console.error('Share link validation failed:', res);
          return;
        }

        const galleryId = res.gallery.id as string;
        const sessionToken = res.session_token as string;
        const expiresAt = res.expires_at as string | null;

        if (!galleryId || !sessionToken) {
          const errorMessage = 'Unexpected response from server - missing gallery ID or session token';
          setStatus(errorMessage);
          setError(errorMessage);
          console.error('Missing required fields in response:', res);
          return;
        }

        console.log('Session created successfully:', {
          galleryId,
          sessionToken: 'present',
          expiresAt
        });

        sessionStorage.setItem(`gallery_session_${galleryId}`, sessionToken);
        if (expiresAt) sessionStorage.setItem(`gallery_expires_${galleryId}`, expiresAt);

        setStatus('Redirecting to gallery...');
        navigate(`/gallery/${galleryId}`);
      } catch (err: any) {
        console.error('Share link error', err);
        const errorMessage = err?.message || 'Failed to process link';
        setStatus(errorMessage);
        setError(errorMessage);
        setDebugInfo({ error: err, timestamp: new Date().toISOString() });
        toast({ title: 'Error', description: err?.message || 'Failed to open share link', variant: 'destructive' });
      }
    };

    run();
  }, [alias, location.search]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="py-10 text-center space-y-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
            error ? 'bg-destructive/20' : 'bg-accent/20'
          }`}>
            {error ? (
              <AlertCircle className="w-8 h-8 text-destructive" />
            ) : (
              <LinkIcon className="w-8 h-8 text-primary" />
            )}
          </div>
          <h1 className="text-xl font-semibold">
            {error ? 'Share Link Error' : 'Opening Shared Gallery'}
          </h1>
          <p className="text-muted-foreground">{status}</p>
          
          {!error && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
              <Camera className="w-4 h-4" />
              Secure session is being prepared
            </div>
          )}
          
          <div className="pt-2 space-y-2">
            <Button variant="outline" onClick={() => navigate('/browse')}>
              Go to Browse
            </Button>
            
            {error && (
              <div className="text-left">
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground">
                    Debug Information
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                    {JSON.stringify({
                      alias,
                      hasToken: !!new URL(window.location.href).searchParams.get("token"),
                      pathname: location.pathname,
                      search: location.search,
                      debugInfo
                    }, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShareLink;
