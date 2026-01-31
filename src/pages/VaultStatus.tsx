import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { Unlock, Sparkles, ChevronLeft, Home } from "lucide-react";
import vaultPortal from "@/assets/vault-portal.png";
import { cn } from "@/lib/utils";
import { useUnlockFeedback } from "@/hooks/useUnlockFeedback";
import { SpinWheel } from "@/components/vault/SpinWheel";
import { VaultLoseScreen } from "@/components/vault/VaultLoseScreen";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type VaultState = "winner" | "not_selected";
type RevealPhase = "spinning" | "revealed";

interface LocationState {
  email?: string;
  name?: string;
  vaultCode?: string;
  vaultState?: VaultState;
}

// Check if we're in development mode
const isDev = import.meta.env.DEV;

const VaultStatus = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;
  const { triggerUnlockFeedback } = useUnlockFeedback();

  // Use local state for demo controls
  const [demoState, setDemoState] = useState<VaultState | null>(null);
  // Track reveal phase: spinning wheel first, then show result
  const [revealPhase, setRevealPhase] = useState<RevealPhase>("spinning");
  // Track if unlock animation has played
  const [hasAnimated, setHasAnimated] = useState(false);
  // Track if currently unlocking (for frame glow)
  const [isUnlocking, setIsUnlocking] = useState(false);
  // Track screen flash state
  const [showFlash, setShowFlash] = useState(false);
  
  // Use demo state if set, otherwise use location state, default to "winner"
  const vaultState: VaultState = demoState || state?.vaultState || "winner";
  const userName = state?.name || "Vault Member";
  const userEmail = state?.email || "";
  const vaultCode = state?.vaultCode || sessionStorage.getItem("vaultCode") || "";

  // Handle lose state - update database and send email
  useEffect(() => {
    const handleLoseFlow = async () => {
      if (revealPhase === "revealed" && vaultState === "not_selected" && userEmail && vaultCode) {
        try {
          // Update vault_codes status to 'lost'
          const { error: updateError } = await supabase
            .from("vault_codes")
            .update({ 
              status: "lost",
              next_draw_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Next draw in 7 days
            })
            .eq("email", userEmail)
            .eq("code", vaultCode);

          if (updateError) {
            console.error("Error updating vault code status:", updateError);
          }

          // Send lose email with vault code
          const appUrl = window.location.origin;
          const { error: emailError } = await supabase.functions.invoke("send-vault-lose-email", {
            body: {
              email: userEmail,
              name: userName,
              vaultCode: vaultCode,
              appUrl: appUrl,
            },
          });

          if (emailError) {
            console.error("Failed to send vault lose email:", emailError);
          }
        } catch (err) {
          console.error("Error in lose flow:", err);
        }
      }
    };

    handleLoseFlow();
  }, [revealPhase, vaultState, userEmail, vaultCode, userName]);

  // Handle spin wheel completion
  const handleSpinComplete = useCallback(() => {
    setRevealPhase("revealed");
  }, []);

  // Reset animation state when switching to winner state (only after reveal)
  useEffect(() => {
    if (revealPhase === "revealed" && vaultState === "winner") {
      setHasAnimated(false);
      setIsUnlocking(true);
      setShowFlash(false);
      
      // Trigger animation after a brief delay to ensure state is set
      const timer = setTimeout(() => {
        setHasAnimated(true);
        setShowFlash(true);
        // Trigger haptic + sound feedback
        triggerUnlockFeedback();
      }, 50);
      
      // End flash after 400ms (synced with 808 decay)
      const flashTimer = setTimeout(() => {
        setShowFlash(false);
      }, 450);
      
      // End unlocking state after animations complete
      const unlockTimer = setTimeout(() => {
        setIsUnlocking(false);
      }, 600);
      
      return () => {
        clearTimeout(timer);
        clearTimeout(flashTimer);
        clearTimeout(unlockTimer);
      };
    }
  }, [revealPhase, vaultState, triggerUnlockFeedback]);

  // Reset to spinning phase when demo state changes
  useEffect(() => {
    if (demoState !== null) {
      setRevealPhase("spinning");
    }
  }, [demoState]);

  const renderWinner = () => (
    <div className="flex flex-col items-center text-center animate-fade-in">
      {/* Vault Portal with intense glow - "opening" effect */}
      <div className="relative mb-8">
        {/* Outer glow rings */}
        <div className="absolute inset-[-20px] bg-primary/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute inset-[-10px] bg-gradient-to-r from-primary via-purple-500 to-primary rounded-full blur-xl opacity-60 animate-pulse" />

        <div className="relative w-36 h-36 md:w-44 md:h-44 flex items-center justify-center">
          <img
            src={vaultPortal}
            alt="Vault Portal Open"
            className="w-full h-full object-contain drop-shadow-[0_0_30px_hsl(var(--primary))]"
          />
          <Unlock className="absolute w-12 h-12 text-primary drop-shadow-[0_0_15px_hsl(var(--primary))] animate-pulse" />
        </div>

        {/* Sparkle effects */}
        <Sparkles className="absolute top-0 right-0 w-6 h-6 text-primary/80 animate-pulse" />
        <Sparkles className="absolute bottom-4 left-0 w-5 h-5 text-purple-400/80 animate-pulse delay-150" />
        <Sparkles className="absolute top-8 left-2 w-4 h-4 text-pink-400/70 animate-pulse delay-300" />
      </div>

      {/* Header with emoji and strong glow */}
      <h1
        className="font-display text-xl md:text-2xl lg:text-3xl uppercase tracking-[0.12em] text-foreground mb-3"
        style={{
          textShadow:
            "0 0 30px rgba(0, 255, 255, 0.5), 0 0 60px rgba(0, 255, 255, 0.3), 0 0 90px rgba(128, 0, 255, 0.2)",
        }}
      >
        🎉 Congratulations — You're In
      </h1>

      {/* Subheadline */}
      <p className="font-display text-lg md:text-xl text-primary uppercase tracking-wider mb-6">
        The Vault is open.
      </p>

      {/* Body Copy */}
      <div className="text-muted-foreground font-body text-sm md:text-base max-w-sm mb-8 space-y-4">
        <p>
          You've unlocked access to Music Exclusive™ — a private space where fans hear music before it hits Spotify or Apple Music.
        </p>
        <p>
          This is your chance to experience exclusive releases, support artists directly, and be part of something only a few get to access.
        </p>
      </div>

      {/* CTA - Navigate to auth with vault flow state */}
      <Button size="lg" onClick={() => navigate("/auth/fan", { state: { ...state, flow: "vault" } })}>
        Enter The Vault
      </Button>
    </div>
  );

  const renderNotSelected = () => (
    <VaultLoseScreen 
      vaultCode={vaultCode}
      email={userEmail}
      name={userName}
    />
  );

  const renderContent = () => {
    // Show spin wheel first
    if (revealPhase === "spinning") {
      return (
        <SpinWheel 
          result={vaultState} 
          onComplete={handleSpinComplete} 
        />
      );
    }

    // Show result after spin
    switch (vaultState) {
      case "winner":
        return renderWinner();
      case "not_selected":
      default:
        return renderNotSelected();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-4 py-12 relative overflow-hidden">
      {/* Screen flash overlay - synced with 808 bass hit */}
      <div 
        className={cn(
          "fixed inset-0 pointer-events-none z-50 transition-opacity",
          "bg-gradient-radial from-primary/20 via-primary/5 to-transparent",
          showFlash ? "animate-screen-flash" : "opacity-0"
        )}
        aria-hidden="true"
      />
      {/* Navigation Header */}
      <header className="w-full max-w-md mx-auto mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate("/vault/submit")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">Back</span>
        </button>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">Home</span>
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center">
        {revealPhase === "spinning" ? (
          // Spin wheel takes full width, no card wrapper
          <div className="w-full max-w-md">
            {renderContent()}
          </div>
        ) : (
          // Result card with glow effects
          <div className="w-full max-w-md">
            <GlowCard
              className={cn(
                "group",
                vaultState === "winner" && !hasAnimated && "animate-vault-unlock"
              )}
              glowColor={vaultState === "winner" ? "primary" : "secondary"}
              unlocking={vaultState === "winner" && isUnlocking}
            >
              <div className="p-8 md:p-10">{renderContent()}</div>
            </GlowCard>
          </div>
        )}
      </div>

      {/* Demo Controls - Only visible in development */}
      {isDev && (
        <div className="w-full max-w-md mx-auto mt-8">
          <div className="border border-dashed border-yellow-500/50 rounded-lg p-4 bg-yellow-500/5">
            <p className="text-xs text-yellow-500 uppercase tracking-wider mb-3 text-center font-medium">
              Developer Test Controls (Dev Only)
            </p>
            <div className="flex gap-2">
              <Button
                variant={vaultState === "winner" ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setDemoState("winner")}
              >
                Force WIN
              </Button>
              <Button
                variant={vaultState === "not_selected" ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setDemoState("not_selected")}
              >
                Force NOT SELECTED
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VaultStatus;
