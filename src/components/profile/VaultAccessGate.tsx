import { useNavigate } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VaultAccessGateProps {
  onClose: () => void;
}

export const VaultAccessGate = ({ onClose }: VaultAccessGateProps) => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative max-w-sm w-full">
        {/* Glow effect */}
        <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-primary/30 via-purple-500/20 to-pink-500/30 blur-xl" />

        <div className="relative bg-card rounded-2xl border border-primary/30 p-6 text-center">
          {/* Lock icon */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>

          <h2 className="font-display text-xl font-bold text-foreground mb-2">
            Vault Access Required
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Full track streaming is exclusive to Vault members. Enter the Vault to unlock unlimited access.
          </p>

          <div className="space-y-3">
            <Button
              onClick={() => navigate("/vault/enter")}
              className="w-full bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Enter the Vault
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full text-muted-foreground"
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
