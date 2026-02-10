import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Loader2, Plus, RefreshCw, Link as LinkIcon, Check, Users } from "lucide-react";
import { format } from "date-fns";

interface Invite {
  id: string;
  token: string;
  created_at: string;
  status: string;
  used_at: string | null;
  invitee_email: string | null;
}

interface ArtistInviteSectionProps {
  artistProfileId: string;
}

const ArtistInviteSection = ({ artistProfileId }: ArtistInviteSectionProps) => {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(100);

  const baseUrl = "https://musicexclusive.lovable.app";

  const fetchInvites = useCallback(async () => {
    setIsLoading(true);
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("fan_invites")
        .select("id, token, created_at, status, used_at, invitee_email")
        .eq("inviter_id", artistProfileId)
        .eq("inviter_type", "artist")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching invites:", error);
        return;
      }

      setInvites(data || []);
      setRemaining(100 - (data?.length || 0));
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [artistProfileId]);

  useEffect(() => {
    if (artistProfileId) fetchInvites();
  }, [artistProfileId, fetchInvites]);

  const handleGenerate = async () => {
    if (remaining <= 0) {
      toast.error("You've used all 100 invites this month.");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-fan-invite", {
        body: { type: "artist", count: 1 },
      });

      if (error || data?.error) {
        toast.error(data?.error || "Failed to generate invite");
        return;
      }

      toast.success("Invite link generated!");
      fetchInvites();
    } catch (err) {
      toast.error("Something went wrong.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyInviteLink = async (token: string, id: string) => {
    const link = `${baseUrl}/invite?token=${token}&type=artist`;
    await navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast.success("Invite link copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const usedCount = invites.filter(i => i.status === "used").length;

  return (
    <section className="space-y-4 animate-fade-in" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg font-semibold text-foreground">Invite Fans</h2>
          <div
            className="relative px-2.5 py-1 rounded-full"
            style={{ background: "hsla(280, 80%, 50%, 0.12)" }}
          >
            <Users
              className="absolute -top-1.5 -left-0.5 w-3 h-3 rotate-[-12deg]"
              style={{
                color: "hsl(45, 90%, 55%)",
                filter: "drop-shadow(0 0 3px hsla(45, 90%, 55%, 0.8))",
              }}
              fill="hsl(45, 90%, 55%)"
            />
            <span
              className="text-[10px] font-display uppercase tracking-wider pl-1"
              style={{ color: "hsl(280, 80%, 70%)" }}
            >
              {remaining} left
            </span>
          </div>
        </div>
        <Button
          size="sm"
          className="rounded-full gap-1.5 px-4"
          style={{
            background: "hsl(280, 80%, 50%)",
            boxShadow: "0 0 15px hsla(280, 80%, 50%, 0.3)",
          }}
          onClick={handleGenerate}
          disabled={isGenerating || remaining <= 0}
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Generate Link
        </Button>
      </div>

      {/* Usage Bar */}
      <div className="p-3 rounded-xl border border-border/30 bg-muted/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Monthly Usage</span>
          <span className="text-xs text-muted-foreground">
            {invites.length} / 100 generated · {usedCount} redeemed
          </span>
        </div>
        <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(invites.length / 100) * 100}%`,
              background: "linear-gradient(90deg, hsl(280, 80%, 50%), hsl(265, 90%, 60%))",
            }}
          />
        </div>
      </div>

      {/* Invites List */}
      {isLoading ? (
        <div className="p-8 text-center rounded-xl bg-muted/20 border border-border/30">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: "hsl(280, 80%, 70%)" }} />
        </div>
      ) : invites.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-muted/20 border border-border/30">
          <LinkIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            No invites generated yet. Click "Generate Link" to create your first invite.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/30 bg-card/30"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${
                      invite.status === "used"
                        ? "bg-green-500/10 text-green-400"
                        : invite.status === "expired" || invite.status === "invalidated"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {invite.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(invite.created_at), "MMM d, yyyy")}
                  </span>
                </div>
                {invite.status === "used" && invite.invitee_email && (
                  <p className="text-xs text-muted-foreground truncate">
                    Redeemed by: {invite.invitee_email}
                  </p>
                )}
              </div>
              {invite.status === "unused" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full flex-shrink-0"
                  onClick={() => copyInviteLink(invite.token, invite.id)}
                >
                  {copiedId === invite.id ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default ArtistInviteSection;
