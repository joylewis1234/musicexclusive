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
import { Search, Send, User, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface ShareableMember {
  id: string;
  display_name: string;
}

interface ShareArtistProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistProfileId: string;
  artistName: string;
  artistAvatarUrl: string | null;
  artistGenre: string | null;
}

export const ShareArtistProfileModal = ({
  open,
  onOpenChange,
  artistProfileId,
  artistName,
  artistAvatarUrl,
  artistGenre,
}: ShareArtistProfileModalProps) => {
  const [members, setMembers] = useState<ShareableMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<ShareableMember | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [note, setNote] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const currentUserEmail = user?.email;

  useEffect(() => {
    if (open) fetchVaultMembers();
  }, [open]);

  const fetchVaultMembers = async () => {
    setIsLoading(true);

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
      toast({
        title: "Error",
        description: "Could not load Vault members",
        variant: "destructive",
      });
      setMembers([]);
    } else {
      const others = (data || []).filter((m) => m.id !== currentMemberId);
      setMembers(others);
    }
    setIsLoading(false);
  };

  const filteredMembers = members.filter((member) =>
    member.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSend = async () => {
    if (!selectedMember || !currentUserEmail) return;

    setIsSending(true);

    const { data: senderData } = await supabase
      .from("vault_members")
      .select("id")
      .eq("email", currentUserEmail)
      .maybeSingle();

    if (!senderData) {
      toast({
        title: "Error",
        description: "Could not find your Vault membership",
        variant: "destructive",
      });
      setIsSending(false);
      return;
    }

    const { error } = await supabase.from("shared_artist_profiles").insert({
      sender_id: senderData.id,
      recipient_id: selectedMember.id,
      artist_profile_id: artistProfileId,
      note: note.trim() || null,
    });

    if (error) {
      console.error("Error sharing artist:", error);
      toast({
        title: "Error",
        description: "Could not share this artist",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sent to their Inbox",
        description: `${artistName}'s profile shared with ${selectedMember.display_name}`,
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
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl uppercase tracking-wider text-foreground flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Share Artist Profile
          </DialogTitle>
        </DialogHeader>

        {/* Artist preview card */}
        <div className="mb-4 p-3 rounded-lg bg-muted/20 border border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-muted/30 border border-border flex-shrink-0">
            {artistAvatarUrl ? (
              <img
                src={artistAvatarUrl}
                alt={artistName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
              Sharing Artist
            </p>
            <p className="font-display font-semibold text-foreground truncate">
              {artistName}
            </p>
            {artistGenre && (
              <p className="text-xs text-primary truncate">{artistGenre}</p>
            )}
          </div>
        </div>

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
              No other active Vault members to share with yet
            </p>
            <p className="text-sm text-muted-foreground">
              When more fans join with Vault access, they will appear here.
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
                  No match — try another name, or there are no other active Vault members yet.
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
                placeholder="Add a note (optional)"
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
              variant="accent"
              className="w-full gap-2"
              disabled={!selectedMember || isSending}
              onClick={handleSend}
            >
              <Send className="w-4 h-4" />
              {isSending ? "Sending..." : "Send"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
