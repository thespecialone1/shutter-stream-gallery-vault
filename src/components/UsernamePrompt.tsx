import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Loader2, AtSign } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface UsernamePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUsernameSet?: () => void;
}

export const UsernamePrompt = ({ open, onOpenChange, onUsernameSet }: UsernamePromptProps) => {
  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check username availability with debounce
  useEffect(() => {
    if (!username || username.length < 3) {
      setIsAvailable(null);
      setError(null);
      return;
    }

    // Validate alphanumeric
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      setIsAvailable(false);
      setError('Only letters (a-z) and numbers (0-9) allowed');
      return;
    }

    if (username.length > 30) {
      setIsAvailable(false);
      setError('Username must be 30 characters or less');
      return;
    }

    setError(null);
    const timer = setTimeout(async () => {
      setIsChecking(true);
      try {
        const { data, error } = await supabase.rpc('is_username_available', { 
          check_username: username 
        });
        
        if (error) throw error;
        setIsAvailable(data);
        if (!data) {
          setError('Username is already taken');
        }
      } catch (err) {
        console.error('Error checking username:', err);
        setIsAvailable(null);
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSave = async () => {
    if (!username || !isAvailable || !user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: username.toLowerCase() })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Username set!',
        description: `Your username is now @${username.toLowerCase()}`,
      });
      
      onUsernameSet?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error saving username:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to save username',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AtSign className="h-5 w-5 text-primary" />
            Choose Your Username
          </DialogTitle>
          <DialogDescription>
            Pick a unique username so others can find and message you. You can change it later in your profile settings.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                placeholder="yourname"
                className="pl-8 pr-10"
                maxLength={30}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isChecking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {!isChecking && isAvailable === true && <Check className="h-4 w-4 text-green-500" />}
                {!isChecking && isAvailable === false && <X className="h-4 w-4 text-red-500" />}
              </div>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {isAvailable && !error && (
              <p className="text-sm text-green-600">Username is available!</p>
            )}
            <p className="text-xs text-muted-foreground">
              3-30 characters, letters and numbers only
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Skip for now
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!isAvailable || isSaving || username.length < 3}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Set Username'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};