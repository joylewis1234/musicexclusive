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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <DialogTitle className="font-display uppercase tracking-wider">
              Like what you hear?
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground mt-2">
            Enter the Vault Lottery for a chance to unlock full access, or join as a Superfan for instant entry.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button
            size="lg"
            className="w-full"
            onClick={() => navigate("/vault/enter")}
          >
            Enter the Vault Lottery
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => navigate("/auth/fan", { state: { flow: "superfan" } })}
          >
            Join as a Superfan
          </Button>
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
