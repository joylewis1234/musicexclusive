import { useState } from "react";
import { Loader2, Music, Wallet, CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StreamConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistName: string;
  trackTitle: string;
  userCredits: number;
  onConfirm: () => Promise<void>;
  onAddCredits: () => void;
}

export const StreamConfirmModal = ({
  open,
  onOpenChange,
  artistName,
  trackTitle,
  userCredits,
  onConfirm,
  onAddCredits,
}: StreamConfirmModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const hasEnoughCredits = userCredits >= 1;

  const handleConfirm = async () => {
    if (isProcessing) return; // Prevent double-tap
    setIsProcessing(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Stream confirm error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddCredits = () => {
    onOpenChange(false);
    onAddCredits();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[340px] rounded-2xl border-primary/30 bg-card/98 backdrop-blur-xl p-0 overflow-hidden"
        style={{
          boxShadow: "0 0 60px hsla(280, 80%, 50%, 0.2), 0 0 20px hsla(280, 80%, 50%, 0.1)",
        }}
      >
        {/* Top glow accent */}
        <div 
          className="absolute top-0 left-0 right-0 h-1"
          style={{
            background: "linear-gradient(90deg, hsl(280, 80%, 50%), hsl(300, 70%, 50%), hsl(280, 80%, 50%))",
          }}
        />

        <div className="px-6 pt-8 pb-6">
          {/* Icon */}
          <div 
            className="w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center"
            style={{
              background: hasEnoughCredits 
                ? "linear-gradient(135deg, hsla(280, 80%, 50%, 0.2), hsla(300, 70%, 50%, 0.15))"
                : "hsla(0, 70%, 50%, 0.15)",
              border: hasEnoughCredits 
                ? "1px solid hsla(280, 80%, 50%, 0.4)"
                : "1px solid hsla(0, 70%, 50%, 0.4)",
            }}
          >
            {hasEnoughCredits ? (
              <Music 
                className="w-7 h-7"
                style={{ color: "hsl(280, 80%, 65%)" }}
              />
            ) : (
              <Wallet 
                className="w-7 h-7"
                style={{ color: "hsl(0, 70%, 60%)" }}
              />
            )}
          </div>

          <DialogHeader className="space-y-3 text-center">
            <DialogTitle className="font-display text-xl font-semibold text-foreground">
              {hasEnoughCredits ? "🔒 Exclusive Pre-Release. Protected Content." : "Not Enough Credits"}
            </DialogTitle>
            
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              {hasEnoughCredits ? (
                <span className="space-y-3 block">
                  <span className="block">
                    This track is made available exclusively through Music Exclusive.
                  </span>
                  <span className="block">
                    Unauthorized copying, recording, or redistribution of this content may constitute copyright infringement and may result in account termination and legal action by rights holders.
                  </span>
                  <span className="block font-medium text-foreground">
                    🛡 Playback sessions are monitored for abuse.
                  </span>
                  <span className="block">
                    By continuing, you agree to stream for personal use only in accordance with our Terms of Service.
                  </span>
                </span>
              ) : (
                <>
                  You don't have enough credits to stream this track.
                  <br />
                  <span className="mt-2 block">
                    Add credits to continue supporting your favorite artists.
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Balance info for sufficient credits */}
          {hasEnoughCredits && (
            <div 
              className="mt-5 p-3 rounded-xl text-center"
              style={{
                background: "hsla(280, 80%, 50%, 0.08)",
                border: "1px solid hsla(280, 80%, 50%, 0.2)",
              }}
            >
              <div className="flex items-center justify-center gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Balance:</span>
                  <span 
                    className="font-semibold"
                    style={{ color: "hsl(280, 80%, 70%)" }}
                  >
                    {userCredits} Credits
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground/70 mt-1.5">
                After stream: {userCredits - 1} Credits remaining
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-6 space-y-3">
            {hasEnoughCredits ? (
              <>
                <Button
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className={cn(
                    "w-full h-12 rounded-xl font-display uppercase tracking-wide text-sm",
                    "bg-primary hover:bg-primary/90 text-primary-foreground",
                    "transition-all duration-200"
                  )}
                  style={{
                    boxShadow: "0 0 20px hsla(280, 80%, 50%, 0.3)",
                  }}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Stream Now (1 Credit)"
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={isProcessing}
                  className="w-full h-10 rounded-xl text-muted-foreground hover:text-foreground"
                >
                  Not Now
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleAddCredits}
                  className={cn(
                    "w-full h-12 rounded-xl font-display uppercase tracking-wide text-sm",
                    "bg-primary hover:bg-primary/90 text-primary-foreground",
                    "transition-all duration-200"
                  )}
                  style={{
                    boxShadow: "0 0 20px hsla(280, 80%, 50%, 0.3)",
                  }}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Add Credits
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="w-full h-10 rounded-xl text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>

          {/* Footer note */}
          <p className="mt-4 text-center text-[11px] text-muted-foreground/60">
            You can manage credits from your dashboard.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
