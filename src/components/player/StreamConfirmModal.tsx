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
              {hasEnoughCredits ? "Support the Artist" : "Out of Credits"}
            </DialogTitle>
            
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              {hasEnoughCredits ? (
                <>
                  This stream costs{" "}
                  <span 
                    className="font-semibold"
                    style={{ 
                      color: "hsl(280, 80%, 65%)",
                      textShadow: "0 0 8px hsla(280, 80%, 50%, 0.5)"
                    }}
                  >
                    1 Credit ($0.20)
                  </span>
                  .
                  <br />
                  <span className="mt-2 block">
                    Thank you for supporting <span className="text-foreground font-medium">{artistName}</span> — every stream helps artists earn more and grow.
                  </span>
                </>
              ) : (
                <>
                  You need credits to stream "<span className="text-foreground">{trackTitle}</span>".
                  <br />
                  <span className="mt-2 block">
                    Add more credits to keep supporting your favorite artists.
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Cost breakdown for sufficient credits */}
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
                    "Play & Support"
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={isProcessing}
                  className="w-full h-10 rounded-xl text-muted-foreground hover:text-foreground"
                >
                  Cancel
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
                  Maybe Later
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
