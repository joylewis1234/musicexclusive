import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Home, Crown, Loader2, CheckCircle2, Zap, Star, Users, Gift, Sparkles } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";

interface LocationState {
  email?: string;
  name?: string;
  flow?: "superfan" | "vault";
}

const Subscribe = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const flow = state?.flow || "superfan";
  const { addCredits } = useCredits();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const superfanPerks = [
    { icon: Zap, text: "25 listening credits included each month" },
    { icon: Crown, text: "Guaranteed access to Music Exclusive" },
    { icon: Star, text: "Early access to exclusive music" },
    { icon: Sparkles, text: "Superfan status badge" },
    { icon: Users, text: "Monthly friend bypass" },
    { icon: Gift, text: "Priority access to new drops" },
  ];

  const handleSubscribe = async () => {
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // Add 25 credits for superfan subscription
    await addCredits(25);
    
    setIsProcessing(false);
    setIsComplete(true);
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Navigation Header */}
        <header className="p-4 flex items-center justify-end max-w-2xl mx-auto w-full">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="w-5 h-5" />
            <span className="text-sm uppercase tracking-wider">Home</span>
          </button>
        </header>

        {/* Success State */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-md text-center">
            <div className="mb-6">
              <div 
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary mb-4"
                style={{ boxShadow: '0 0 40px rgba(138, 43, 226, 0.4)' }}
              >
                <Crown className="w-10 h-10" />
              </div>
            </div>

            <SectionHeader title="Welcome, Superfan!" align="center" framed />

            <p className="text-muted-foreground mt-6 mb-2">
              Your subscription is now active.
            </p>

            {/* Status Card */}
            <GlowCard glowColor="gradient" hover={false} className="mt-8">
              <div className="p-6 text-center">
                <p className="text-muted-foreground/70 text-xs uppercase tracking-wider mb-2">
                  Your Status
                </p>
                <p
                  className="text-2xl font-bold font-display uppercase tracking-wider text-foreground mb-3"
                  style={{ textShadow: "0 0 20px rgba(138, 43, 226, 0.5)" }}
                >
                  Superfan
                </p>
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm">25 credits added to your wallet</span>
                </div>
              </div>
            </GlowCard>

            <Button
              onClick={() => {
                // Vault winners already signed agreements, go to dashboard
                // Superfan direct signup goes to agreements first
                if (flow === "vault") {
                  navigate("/fan/dashboard", { replace: true });
                } else {
                  navigate("/agreements/fan", { state: { ...state, flow: "superfan" } });
                }
              }}
              className="w-full mt-8"
              variant="primary"
              size="lg"
            >
              Enter Music Exclusive
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation Header */}
      <header className="p-4 flex items-center justify-between max-w-2xl mx-auto w-full">
        <button
          onClick={() => navigate(-1)}
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

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-6">
        {/* Page Title */}
        <div className="flex justify-center">
          <SectionHeader title="Become a Superfan" align="center" framed />
        </div>

        {/* Plan Summary */}
        <GlowCard glowColor="gradient" hover={false}>
          <div className="p-6">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div 
                className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center"
                style={{ boxShadow: '0 0 30px rgba(138, 43, 226, 0.3)' }}
              >
                <Crown className="w-7 h-7 text-primary" />
              </div>
            </div>

            {/* Title & Price */}
            <h3 
              className="text-xl font-display uppercase tracking-wider text-center mb-1 text-foreground"
              style={{ textShadow: '0 0 15px rgba(138, 43, 226, 0.4)' }}
            >
              Superfan
            </h3>
            <div className="text-center mb-4">
              <span className="text-3xl font-display text-foreground">$5</span>
              <span className="text-muted-foreground text-sm"> / month</span>
            </div>

            {/* Benefits */}
            <ul className="space-y-2">
              {superfanPerks.map(({ icon: Icon, text }, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-muted-foreground text-sm">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </GlowCard>

        {/* Payment Method Placeholder */}
        <GlowCard glowColor="gradient" hover={false}>
          <div className="p-5">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
              Payment Method
            </h3>
            <div className="h-20 flex items-center justify-center border border-dashed border-border/50 rounded-lg">
              <p className="text-muted-foreground/60 text-xs text-center">
                Stripe integration coming soon
              </p>
            </div>
          </div>
        </GlowCard>

        {/* Order Summary */}
        <GlowCard glowColor="gradient" hover={false}>
          <div className="p-5">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
              Order Summary
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Superfan subscription</span>
                <span className="text-foreground font-display font-semibold">
                  $5.00/mo
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Included credits</span>
                <span className="text-primary font-display font-semibold">
                  25 credits
                </span>
              </div>

              <div className="border-t border-border/30 pt-3 flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Due today</span>
                <span className="text-2xl font-bold text-accent">
                  $5.00
                </span>
              </div>
            </div>
          </div>
        </GlowCard>

        {/* CTA Button */}
        <Button
          onClick={handleSubscribe}
          disabled={isProcessing}
          className="w-full"
          variant="primary"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Crown className="w-4 h-4 mr-2" />
              Subscribe & Become Superfan
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground/50 text-center">
          Cancel anytime. Secure payment powered by Stripe.
        </p>
      </main>
    </div>
  );
};

export default Subscribe;
