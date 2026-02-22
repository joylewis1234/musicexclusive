import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Search, Send, User, Lock, Crown } from "lucide-react";
import { SignedArtwork } from "@/components/ui/SignedArtwork";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ShareableMember {
  id: string;
  display_name: string;
}

interface TrackInfo {
  id: string;
  title: string;
  artistName: string;
  artworkUrl: string | null;
}

interface ShareExclusiveTrackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: TrackInfo | null;
  artistId: string;
}

export const ShareExclusiveTrackModal = ({
  open,
  onOpenChange,
  track,
  artistId,
}: ShareExclusiveTrackModalProps) => {
  const [members, setMembers] = useState<ShareableMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<ShareableMember | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [note, setNote] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const currentUserEmail = user?.email;

  // Fetch active vault members via the shareable view
  useEffect(() => {
    if (open) {
      fetchVaultMembers();
    }
  }, [open]);

  const fetchVaultMembers = async () => {
    setIsLoading(true);

    // Get current user's vault member ID to exclude them
    let currentMemberId: string | null = null;
    if (currentUserEmail) {
      const { data: self } = await supabase
        .from("vault_members")
        .select("id")
        .eq("email", currentUserEmail)
        .maybeSingle();
      currentMemberId = self?.id || null;
    }

    const { data, error } = await supabase
      .from("shareable_vault_members")
      .select("id, display_name");

    if (error) {
      console.error("Error fetching vault members:", error);
      toast.error("Could not load Vault members");
      setMembers([]);
    } else {
      const others = (data || []).filter(m => m.id !== currentMemberId);
      setMembers(others);
    }
    setIsLoading(false);
  };

  const filteredMembers = members.filter((member) =>
    member.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSend = async () => {
    if (!selectedMember || !track || !currentUserEmail) return;

    setIsSending(true);

    // Get current user's vault member ID
    const { data: senderData } = await supabase
      .from("vault_members")
      .select("id")
      .eq("email", currentUserEmail)
      .maybeSingle();

    if (!senderData) {
      toast.error("Could not find your Vault membership");
      setIsSending(false);
      return;
    }

    const { error } = await supabase.from("shared_tracks").insert({
      sender_id: senderData.id,
      recipient_id: selectedMember.id,
      artist_id: artistId,
      track_id: track.id,
      note: note.trim() || null,
    });

    if (error) {
      console.error("Error sharing track:", error);
      toast.error("Could not share this track");
    } else {
      toast.success("Sent! Your friend can listen inside their Vault Inbox.", {
        duration: 4000,
      });
      onOpenChange(false);
      resetForm();
    }

    setIsSending(false);
  };

  const resetForm = () => {
    setSelectedMember(null);
    setSearchQuery("");
    setNote("");
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-lg uppercase tracking-wider text-foreground flex items-center gap-2">
            <div className="relative">
              <Lock className="w-5 h-5 text-primary" />
              <Crown 
                className="absolute -top-1.5 -left-1 w-3 h-3 text-amber-400 rotate-[-20deg]" 
                style={{ 
                  filter: 'drop-shadow(0 0 3px rgba(251, 191, 36, 0.8))' 
                }} 
              />
            </div>
            Share this Exclusive Track
          </DialogTitle>
        </DialogHeader>

        {track && (
          <div className="mb-4 p-3 rounded-xl bg-muted/20 border border-primary/20">
            <div className="flex items-center gap-3">
              <SignedArtwork
                trackId={track.id}
                alt={track.title}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-foreground truncate">
                  {track.title}
                </p>
                <p className="text-sm text-primary">{track.artistName}</p>
              </div>
              {/* Exclusive badge */}
              <div className="relative px-2 py-0.5 rounded-full bg-primary/10 flex-shrink-0">
                <span className="text-primary text-[10px] font-display uppercase tracking-wider">
                  Exclusive
                </span>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">Loading Vault members...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted/20 border border-border flex items-center justify-center">
              <User className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-foreground font-display mb-2">
              No other Vault members found
            </p>
            <p className="text-sm text-muted-foreground">
              Sharing is available only between Vault members.
            </p>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search Vault members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>

            {/* Member List */}
            <div className="max-h-[200px] overflow-y-auto space-y-2">
              {filteredMembers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  No members found
                </p>
              ) : (
                filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMember(member)}
                    className={`w-full p-3 rounded-lg border transition-all text-left ${
                      selectedMember?.id === member.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/10 hover:border-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted/30 border border-border flex items-center justify-center">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="font-display text-sm font-semibold text-foreground">
                        {member.display_name}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Note Field */}
            <div>
              <Textarea
                placeholder="Add a message (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 120))}
                className="bg-background border-border resize-none"
                rows={2}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {note.length}/120
              </p>
            </div>

            {/* Send Button */}
            <Button
              className="w-full gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
              disabled={!selectedMember || isSending}
              onClick={handleSend}
            >
              <Send className="w-4 h-4" />
              {isSending ? "Sending..." : "Send to Inbox"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
