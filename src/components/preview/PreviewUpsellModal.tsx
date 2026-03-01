import { useNavigate } from "react-router-dom";
import { Sparkles, Unlock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import vaultPortal from "@/assets/vault-portal.png";

interface PreviewUpsellModalProps {
  open: boolean;
  onDismiss: () => void;
}

export const PreviewUpsellModal = ({ open, onDismiss }: PreviewUpsellModalProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onDismiss(); }}>
      <DialogContent
        className="sm:max-w-md bg-background/95 backdrop-blur-xl border-primary/20 shadow-[0_0_60px_hsl(var(--primary)/0.2)] rounded-xl p-6"
      >
        <div className="flex flex-col items-center text-center animate-fade-in">
          {/* Vault Portal with glow rings */}
          <div className="relative mb-5">
            <div className="absolute inset-[-16px] bg-primary/25 rounded-full blur-3xl animate-pulse" />
            <div className="absolute inset-[-8px] bg-gradient-to-r from-primary via-purple-500 to-primary rounded-full blur-xl opacity-50 animate-pulse" />

            <div className="relative w-24 h-24 flex items-center justify-center">
              <img
                src={vaultPortal}
                alt="Vault Portal"
                className="w-full h-full object-contain drop-shadow-[0_0_20px_hsl(var(--primary))]"
              />
            </div>

            <Sparkles className="absolute top-0 right-0 w-5 h-5 text-primary/80 animate-pulse" />
            <Sparkles className="absolute bottom-2 left-0 w-4 h-4 text-purple-400/80 animate-pulse delay-150" />
          </div>

          {/* Title */}
          <h2
            className="font-display text-xl md:text-2xl uppercase tracking-[0.1em] text-foreground mb-1"
            style={{
              textShadow:
                "0 0 20px rgba(0, 255, 255, 0.4), 0 0 40px rgba(0, 255, 255, 0.2), 0 0 60px rgba(128, 0, 255, 0.15)",
            }}
          >
            The Vault Is Calling
          </h2>

          {/* Subtitle */}
          <p className="text-sm text-muted-foreground font-display tracking-wide mb-3">
            You've just heard a taste. The full experience lives inside.
          </p>

          {/* Gradient divider */}
          <div className="w-full max-w-[180px] h-px mb-4 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          {/* Body */}
          <p className="text-sm text-muted-foreground/80 font-body leading-relaxed max-w-xs mb-5">
            These tracks are <span className="text-primary font-medium">exclusive</span> to Music Exclusive.
            Unlock full access through the Vault Lottery or skip straight in as a Superfan.
          </p>

          {/* CTAs */}
          <div className="flex flex-col gap-3 w-full">
            <Button
              size="lg"
              className="w-full shadow-[0_0_20px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.6)] transition-shadow"
              onClick={() => navigate("/vault/enter")}
            >
              <Unlock className="mr-2 h-5 w-5" />
              Enter the Vault Lottery
            </Button>

            <div className="flex flex-col items-center gap-1">
              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={() => navigate("/auth/fan", { state: { flow: "superfan" } })}
              >
                <Zap className="mr-2 h-5 w-5" />
                Become a Superfan — Instant Access
              </Button>
              <span className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">
                Skip the lottery. Listen now.
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
