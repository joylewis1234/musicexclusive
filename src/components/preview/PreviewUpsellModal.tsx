import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface PreviewUpsellModalProps {
  open: boolean;
  onDismiss: () => void;
}

export const PreviewUpsellModal = ({ open, onDismiss }: PreviewUpsellModalProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onDismiss(); }}>
      <DialogContent
        className="sm:max-w-md bg-background/95 backdrop-blur-md border-border shadow-[0_0_40px_hsl(var(--primary)/0.15)] rounded-xl"
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <DialogTitle className="font-display uppercase tracking-wider text-lg">
              The Vault Is Calling.
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground mt-2 font-display tracking-wide">
            You've just heard a taste. The full experience lives inside.
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground/80 font-body leading-relaxed mt-1">
          This release is exclusive to Music Exclusive. Unlock full access by entering
          the Vault Lottery, or skip the Vault and become a Superfan for instant entry.
        </p>

        <div className="flex flex-col gap-3 mt-4">
          <Button
            size="lg"
            className="w-full shadow-[0_0_16px_hsl(var(--primary)/0.3)]"
            onClick={() => navigate("/vault/enter")}
          >
            Enter the Vault Lottery
          </Button>

          <div className="flex flex-col items-center gap-1">
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => navigate("/auth/fan", { state: { flow: "superfan" } })}
            >
              Become a Superfan
            </Button>
            <span className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">
              Skip the Vault entry and get access now.
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={onDismiss}
          >
            Not now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
