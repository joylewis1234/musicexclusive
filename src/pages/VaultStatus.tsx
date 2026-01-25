import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, Clock, Users, Sparkles, ChevronLeft, RotateCcw, Home } from "lucide-react";
import vaultPortal from "@/assets/vault-portal.png";

type VaultState = "in_draw" | "winner" | "not_selected";

interface LocationState {
  email?: string;
  name?: string;
  vaultState?: VaultState;
}

// Check if we're in development mode
const isDev = import.meta.env.DEV;

const VaultStatus = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  // Use local state for demo controls
  const [demoState, setDemoState] = useState<VaultState | null>(null);
  
  // Use demo state if set, otherwise use location state
  const vaultState: VaultState = demoState || state?.vaultState || "in_draw";
  const userName = state?.name || "Vault Member";

  const renderInDraw = () => (
    <div className="flex flex-col items-center text-center animate-fade-in">
      {/* Vault Portal with breathing animation */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl vault-glow" />
        <div className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
          <img
            src={vaultPortal}
            alt="Vault Portal"
            className="w-full h-full object-contain vault-glow"
          />
          <Clock className="absolute w-10 h-10 text-primary drop-shadow-[0_0_10px_hsl(var(--primary))]" />
        </div>
      </div>

      {/* Header */}
      <h1
        className="font-display text-2xl md:text-3xl lg:text-4xl uppercase tracking-[0.15em] text-foreground mb-4"
        style={{
          textShadow:
            "0 0 20px rgba(255, 255, 255, 0.3), 0 0 40px rgba(0, 255, 255, 0.2)",
        }}
      >
        You're In The Draw
      </h1>

      {/* Subtext */}
      <p className="text-muted-foreground font-body text-sm md:text-base max-w-xs mb-6">
        Access is limited. Check back after the next draw.
      </p>

      {/* Countdown placeholder */}
      <div className="relative">
        <div
          className="absolute -inset-1 rounded-lg bg-gradient-to-r from-primary/30 via-purple-500/30 to-pink-500/30 blur-sm"
          aria-hidden="true"
        />
        <div className="relative bg-card/80 rounded-lg px-6 py-4 border border-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Next Draw
          </p>
          <p className="font-display text-lg text-foreground tracking-wide">
            Coming Soon
          </p>
        </div>
      </div>
    </div>
  );

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
      </div>

      {/* Header with stronger glow */}
      <h1
        className="font-display text-2xl md:text-3xl lg:text-4xl uppercase tracking-[0.15em] text-foreground mb-4"
        style={{
          textShadow:
            "0 0 30px rgba(0, 255, 255, 0.5), 0 0 60px rgba(0, 255, 255, 0.3), 0 0 90px rgba(128, 0, 255, 0.2)",
        }}
      >
        Access Granted
      </h1>

      {/* Subtext */}
      <p className="text-muted-foreground font-body text-sm md:text-base max-w-xs mb-8">
        Welcome inside Music Exclusive, {userName}.
      </p>

      {/* CTA - Navigate to agreements */}
      <Button size="lg" onClick={() => navigate("/agreements/fan", { state })}>
        Continue
      </Button>
    </div>
  );

  const renderNotSelected = () => (
    <div className="flex flex-col items-center text-center animate-fade-in">
      {/* Vault Portal - dimmed but hopeful */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-muted/20 rounded-full blur-2xl" />
        <div className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center opacity-70">
          <img
            src={vaultPortal}
            alt="Vault Portal"
            className="w-full h-full object-contain grayscale-[30%]"
          />
          <Lock className="absolute w-10 h-10 text-muted-foreground" />
        </div>
      </div>

      {/* Header - calm, not harsh */}
      <h1
        className="font-display text-2xl md:text-3xl lg:text-4xl uppercase tracking-[0.15em] text-foreground mb-4"
        style={{
          textShadow: "0 0 20px rgba(255, 255, 255, 0.2)",
        }}
      >
        Not This Time
      </h1>

      {/* Subtext - encouraging */}
      <p className="text-muted-foreground font-body text-sm md:text-base max-w-xs mb-6">
        You're automatically re-entered for the next draw.
      </p>

      {/* CTAs */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button size="lg" onClick={() => navigate("/vault/submit", { state })}>
          <RotateCcw className="mr-2 h-5 w-5" />
          Try Again
        </Button>
        
        <Button variant="secondary" size="lg" className="group">
          <Users className="mr-2 h-5 w-5 group-hover:text-primary transition-colors" />
          Invite a Friend
        </Button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (vaultState) {
      case "winner":
        return renderWinner();
      case "not_selected":
        return renderNotSelected();
      case "in_draw":
      default:
        return renderInDraw();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-4 py-12">
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
        <div className="w-full max-w-md">
          <GlowCard
            className="group"
            glowColor={
              vaultState === "winner"
                ? "primary"
                : vaultState === "not_selected"
                ? "secondary"
                : "gradient"
            }
          >
            <div className="p-8 md:p-10">{renderContent()}</div>
          </GlowCard>
        </div>
      </div>

      {/* Demo Controls - Only visible in development */}
      {isDev && (
        <div className="w-full max-w-md mx-auto mt-8">
          <div className="border border-dashed border-yellow-500/50 rounded-lg p-4 bg-yellow-500/5">
            <p className="text-xs text-yellow-500 uppercase tracking-wider mb-3 text-center font-medium">
              Demo Controls (Dev Only)
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant={vaultState === "in_draw" ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setDemoState("in_draw")}
              >
                Preview: In Draw
              </Button>
              <Button
                variant={vaultState === "winner" ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setDemoState("winner")}
              >
                Preview: Winner
              </Button>
              <Button
                variant={vaultState === "not_selected" ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setDemoState("not_selected")}
              >
                Preview: Not Selected
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VaultStatus;
