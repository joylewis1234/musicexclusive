import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Lock, Sparkles } from "lucide-react";

// TEMPORARY: Set to false to disable modal for testing lottery flow
// Set to true to re-enable the "Vault is Closed" popup
const VAULT_LOCKED_MODAL_ENABLED = false;

interface VaultLockedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VaultLockedModal({ open, onOpenChange }: VaultLockedModalProps) {
  const navigate = useNavigate();

  // Temporarily disabled for testing
  if (!VAULT_LOCKED_MODAL_ENABLED) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border/50 text-center">
        <DialogHeader className="items-center">
          <div className="p-3 rounded-full bg-primary/10 mb-2">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl text-foreground">
            The Vault Is Locked.
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base mt-1">
            Music Exclusive launches in 2026.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            We're preparing something different. Something{" "}
            <span className="text-foreground font-semibold">EXCLUSIVE</span>.
          </p>
          <p>
            Music Exclusive is an artist-first music streaming platform built
            around exclusivity, superfans, and direct artist support.
          </p>
          <p className="text-primary font-medium">
            The Vault will open soon — but early supporters can secure lifetime
            access now.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={() => {
              onOpenChange(false);
              navigate("/founding-superfan");
            }}
          >
            <Sparkles className="w-4 h-4" />
            Secure Lifetime Access
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            Not Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
