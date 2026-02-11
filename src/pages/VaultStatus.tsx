import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnlockFeedback } from "@/hooks/useUnlockFeedback";
import { SpinWheel } from "@/components/vault/SpinWheel";
import { VaultDoorAnimation } from "@/components/vault/VaultDoorAnimation";
import { VaultLoseScreen } from "@/components/vault/VaultLoseScreen";
import { VaultWinScreen } from "@/components/vault/VaultWinScreen";
import { VaultPendingScreen } from "@/components/vault/VaultPendingScreen";
import { supabase } from "@/integrations/supabase/client";

type VaultState = "winner" | "not_selected";
type RevealPhase = "spinning" | "revealed";

interface LocationState {
  email?: string;
  name?: string;
  vaultCode?: string;
  vaultState?: VaultState;
  fromReturn?: boolean; // Flag for returning fans checking their status
  nextDrawDate?: string | null;
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
  // Animation style toggle (dev only)
  const [animationStyle, setAnimationStyle] = useState<"wheel" | "vault-door">("vault-door");
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
  const fromReturn = state?.fromReturn || false;
  const nextDrawDate = state?.nextDrawDate || null;

  // Handle win state - update database and send email
  useEffect(() => {
    const handleWinFlow = async () => {
      if (revealPhase === "revealed" && vaultState === "winner" && userEmail && vaultCode) {
        try {
          // Update vault_codes status to 'won'
          const { error: updateError } = await supabase
            .from("vault_codes")
            .update({ 
              status: "won",
              used_at: new Date().toISOString()
            })
            .eq("email", userEmail)
            .eq("code", vaultCode);

          if (updateError) {
            console.error("Error updating vault code status:", updateError);
          }

          // Send win email with vault code and app link
          const appUrl = window.location.origin;
          const { error: emailError } = await supabase.functions.invoke("send-vault-win-email", {
            body: {
              email: userEmail,
              name: userName,
              vaultCode: vaultCode,
              appUrl: appUrl,
            },
          });

          if (emailError) {
            console.error("Failed to send vault win email:", emailError);
          }
        } catch (err) {
          console.error("Error in win flow:", err);
        }
      }
    };

    handleWinFlow();
  }, [revealPhase, vaultState, userEmail, vaultCode, userName]);

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
    // Scroll to top to show the revealed code
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    <VaultWinScreen 
      vaultCode={vaultCode}
      email={userEmail}
      name={userName}
    />
  );

  const renderNotSelected = () => {
    // If returning fan checking status (not first-time spin), show pending screen
    if (fromReturn) {
      return (
        <VaultPendingScreen 
          vaultCode={vaultCode}
          email={userEmail}
          name={userName}
          nextDrawDate={nextDrawDate}
        />
      );
    }
    
    // First-time lose screen
    return (
      <VaultLoseScreen 
        vaultCode={vaultCode}
        email={userEmail}
        name={userName}
      />
    );
  };

  const renderContent = () => {
    // If returning fan, skip the spin wheel and show status directly
    if (fromReturn) {
      if (vaultState === "winner") {
        return renderWinner();
      }
      return renderNotSelected();
    }

    // Show spin wheel first (for first-time reveals)
    if (revealPhase === "spinning") {
      const AnimationComponent = animationStyle === "vault-door" ? VaultDoorAnimation : SpinWheel;
      return (
        <AnimationComponent
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
        {fromReturn ? (
          // Returning fan — show result directly
          <div className="w-full max-w-md">
            <GlowCard
              className={cn(
                "group",
                vaultState === "winner" && !hasAnimated && !fromReturn && "animate-vault-unlock"
              )}
              glowColor={vaultState === "winner" ? "primary" : "secondary"}
              unlocking={vaultState === "winner" && isUnlocking && !fromReturn}
            >
              <div className="p-8 md:p-10">{renderContent()}</div>
            </GlowCard>
          </div>
        ) : (
          // Vault animation with result overlaying on top
          <div className="relative w-full max-w-md">
            {/* Vault animation layer (stays visible behind) */}
            <div className={cn(
              "transition-opacity duration-700",
              revealPhase === "revealed" ? "opacity-0" : "opacity-100"
            )}>
              {revealPhase === "spinning" && renderContent()}
            </div>

            {/* Result card overlays on top, emerging from vault */}
            {revealPhase === "revealed" && (
              <div className="absolute inset-0 flex items-center justify-center animate-vault-emerge">
                <div className="w-full">
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
              </div>
            )}
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
            {/* Animation style toggle */}
            <div className="flex gap-2 mb-3">
              <Button
                variant={animationStyle === "wheel" ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => { setAnimationStyle("wheel"); setRevealPhase("spinning"); setDemoState(null); }}
              >
                🎡 Wheel
              </Button>
              <Button
                variant={animationStyle === "vault-door" ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => { setAnimationStyle("vault-door"); setRevealPhase("spinning"); setDemoState(null); }}
              >
                🔐 Vault Door
              </Button>
            </div>
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
