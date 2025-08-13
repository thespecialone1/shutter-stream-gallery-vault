import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Copy, Link as LinkIcon, Plus, Shield, Trash2 } from "lucide-react";

interface ShareLinksManagerProps {
  galleryId: string;
}

interface InviteRow {
  id: string;
  link_type: string;
  alias: string | null;
  description: string | null;
  expires_at: string;
  used_count: number;
  max_uses: number | null;
  is_active: boolean;
  created_at: string;
}

export const ShareLinksManager: React.FC<ShareLinksManagerProps> = ({ galleryId }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [invites, setInvites] = useState<InviteRow[]>([]);

  // Form state
  const [linkType, setLinkType] = useState<'standard' | 'temporary' | 'client' | 'preview' | 'passwordless'>('standard');
  const [expiresInDays, setExpiresInDays] = useState<number>(30);
  const [maxUses, setMaxUses] = useState<string>("");
  const [alias, setAlias] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  const origin = useMemo(() => (typeof window !== 'undefined' ? window.location.origin : ''), []);

  const fetchInvites = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gallery_invites')
        .select('id, link_type, alias, description, expires_at, used_count, max_uses, is_active, created_at')
        .eq('gallery_id', galleryId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites(data as InviteRow[]);
    } catch (err) {
      console.error('Failed to load share links', err);
      toast({ title: 'Error', description: 'Failed to load share links', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (galleryId) fetchInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryId]);

  const createLink = async () => {
    if (!galleryId) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.rpc('create_secure_share_link', {
        gallery_id: galleryId,
        link_type: linkType,
        expires_in_days: expiresInDays,
        max_uses: maxUses ? Number(maxUses) : null,
        description: description || null,
        alias: alias || null,
      });

      if (error) throw error;
      const res = data as any;
      if (!res?.success) {
        toast({ title: 'Could not create link', description: res?.message || 'Unknown error', variant: 'destructive' });
        return;
      }

      // Build share URL for user
      const shareUrl = res.alias
        ? `${origin}/s/${res.alias}`
        : `${origin}/share?token=${res.invite_token}`;

      await fetchInvites();
      setAlias("");
      setDescription("");
      setMaxUses("");
      setLinkType('standard');
      setExpiresInDays(30);

      // Show token only once for non-alias links
      toast({ title: 'Share link created', description: 'The share link has been created.' });

      // Copy to clipboard for convenience
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: 'Link copied', description: 'Share URL copied to clipboard.' });
      } catch {}
    } catch (err: any) {
      console.error('Failed to create link', err);
      toast({ title: 'Error', description: err?.message || 'Failed to create link', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const deactivateLink = async (id: string) => {
    try {
      const { error } = await supabase
        .from('gallery_invites')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Link deactivated' });
      fetchInvites();
    } catch (err) {
      console.error('Failed to deactivate link', err);
      toast({ title: 'Error', description: 'Failed to deactivate link', variant: 'destructive' });
    }
  };

  const deleteLink = async (id: string) => {
    try {
      const { error } = await supabase
        .from('gallery_invites')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Link deleted permanently' });
      fetchInvites();
    } catch (err) {
      console.error('Failed to delete link', err);
      toast({ title: 'Error', description: 'Failed to delete link', variant: 'destructive' });
    }
  };

  const copyLink = async (inv: InviteRow) => {
    if (inv.alias) {
      const url = `${origin}/s/${inv.alias}`;
      await navigator.clipboard.writeText(url);
      toast({ title: 'Copied', description: 'Share URL copied to clipboard.' });
    } else {
      toast({ title: 'Token unavailable', description: 'This link has no alias and its token is only shown on creation.' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" /> Secure Share Links
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Link type</Label>
            <select
              className="w-full h-10 rounded-md border bg-background"
              value={linkType}
              onChange={(e) => setLinkType(e.target.value as any)}
            >
              <option value="standard">Standard</option>
              <option value="temporary">Temporary</option>
              <option value="client">Client</option>
              <option value="preview">Preview (limited)</option>
              <option value="passwordless">Passwordless</option>
            </select>
          </div>
          <div>
            <Label>Expires in (days)</Label>
            <Input type="number" min={1} value={expiresInDays} onChange={(e) => setExpiresInDays(Number(e.target.value))} />
          </div>
          <div>
            <Label>Max uses (optional)</Label>
            <Input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Unlimited if empty" />
          </div>
          <div>
            <Label>Alias (optional)</Label>
            <Input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="e.g. client-proof-august" />
          </div>
          <div className="md:col-span-2">
            <Label>Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Internal note for this link" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={createLink} disabled={creating}>
            <Plus className="w-4 h-4 mr-2" />
            {creating ? 'Creating...' : 'Create Share Link'}
          </Button>
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="font-medium">Existing Links</h4>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : invites.length === 0 ? (
            <p className="text-muted-foreground">No share links yet. Create one above.</p>
          ) : (
            <div className="space-y-3">
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm px-2 py-0.5 rounded-full bg-accent/30">{inv.link_type}</span>
                      {!inv.is_active && (
                        <span className="text-xs text-muted-foreground">(inactive)</span>
                      )}
                    </div>
                    <div className="text-sm mt-1 truncate">
                      {inv.alias ? (
                        <div className="flex items-center gap-2">
                          <LinkIcon className="w-4 h-4" />
                          <span className="truncate">{origin}/s/{inv.alias}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Token link (shown on creation only)</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Uses: {inv.used_count} {inv.max_uses ? `/ ${inv.max_uses}` : ''} · Expires: {new Date(inv.expires_at).toLocaleDateString()}
                    </div>
                    {inv.description && (
                      <div className="text-xs mt-1">{inv.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => copyLink(inv)}>
                      <Copy className="w-4 h-4 mr-1" /> Copy
                    </Button>
                    {inv.is_active ? (
                      <Button variant="destructive" size="sm" onClick={() => deactivateLink(inv.id)}>
                        <Trash2 className="w-4 h-4 mr-1" /> Deactivate
                      </Button>
                    ) : (
                      <Button variant="destructive" size="sm" onClick={() => deleteLink(inv.id)}>
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ShareLinksManager;
