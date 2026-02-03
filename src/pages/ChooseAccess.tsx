import { useNavigate, useLocation, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Crown, Zap, Star, Users, Gift, Sparkles, CreditCard, Check, Home, Trophy, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface LocationState {
  email?: string;
  name?: string;
  flow?: "vault";
}

const ChooseAccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const state = location.state as LocationState | null;
  const [hasCredits, setHasCredits] = useState<boolean | null>(null);
  const [isCheckingCredits, setIsCheckingCredits] = useState(false);

  // Check if user already has credits
  useEffect(() => {
    const checkCredits = async () => {
      if (!user?.email) return;
      
      setIsCheckingCredits(true);
      try {
        const { data, error } = await supabase
          .from("vault_members")
          .select("credits, vault_access_active")
          .eq("email", user.email)
          .maybeSingle();
        
        if (!error && data && data.credits > 0 && data.vault_access_active) {
          setHasCredits(true);
        } else {
          setHasCredits(false);
        }
      } catch (err) {
        console.error("Error checking credits:", err);
        setHasCredits(false);
      } finally {
        setIsCheckingCredits(false);
      }
    };

    checkCredits();
  }, [user?.email]);

  const handleSuperfan = () => {
    navigate("/subscribe", { state: { ...state, flow: "vault" } });
  };

  const handlePayAsYouGo = () => {
    navigate("/load-credits", { state: { ...state, flow: "vault" } });
  };

  const superfanPerks = [
    { icon: Zap, text: "25 listening credits included each month" },
    { icon: Crown, text: "Guaranteed access to Music Exclusive" },
    { icon: Star, text: "Early access to exclusive music before public release" },
    { icon: Sparkles, text: "Superfan status badge on your profile" },
    { icon: Users, text: "Monthly friend bypass — invite a friend directly into the Vault" },
    { icon: Gift, text: "Priority access to new drops and featured artists" },
  ];

  const payAsYouGoDetails = [
    "$5 minimum load (25 credits)",
    "Each stream uses 1 credit",
    "Listen until credits run out",
    "No subscription",
    "No additional perks",
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation Header */}
      <header className="p-4 flex items-center justify-between max-w-4xl mx-auto w-full">
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
      <main className="flex-1 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-4xl">
          {/* Winner Banner */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-2">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-display uppercase tracking-wider">
                Vault Winner
              </span>
            </div>
          </div>

          {/* Framed Header */}
          <div className="flex justify-center mb-4">
            <SectionHeader 
              title="Choose Your Access" 
              align="center" 
              framed 
            />
          </div>

          <p className="text-muted-foreground text-center mb-10 text-sm md:text-base max-w-md mx-auto">
            Congratulations! As a vault winner, you can choose how you want to listen.
          </p>

          {/* Options Grid */}
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            
            {/* SUPERFAN Card - Visually dominant */}
            <div className="relative group md:scale-[1.02]">
              {/* Popular badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                <span className="bg-gradient-to-r from-primary to-purple-500 text-primary-foreground text-xs uppercase tracking-wider px-4 py-1 rounded-full font-medium shadow-lg">
                  Best Value
                </span>
              </div>
              
              <GlowCard glowColor="gradient" className="h-full">
                <div className="p-6 md:p-8 flex flex-col h-full">
                  {/* Icon */}
                  <div className="flex justify-center mb-4">
                    <div 
                      className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center"
                      style={{ boxShadow: '0 0 30px rgba(138, 43, 226, 0.3)' }}
                    >
                      <Crown className="w-8 h-8 text-primary" />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 
                    className="text-2xl md:text-3xl font-display uppercase tracking-wider text-center mb-2 text-foreground"
                    style={{ textShadow: '0 0 20px rgba(138, 43, 226, 0.5)' }}
                  >
                    Superfan
                  </h3>

                  {/* Price */}
                  <div className="text-center mb-2">
                    <span className="text-4xl font-display text-foreground">$5</span>
                    <span className="text-muted-foreground text-sm"> / month</span>
                  </div>

                  {/* Description */}
                  <p className="text-muted-foreground text-center text-sm mb-6">
                    Unlock guaranteed access and exclusive perks.
                  </p>

                  {/* Benefits */}
                  <ul className="space-y-3 mb-6 flex-1">
                    {superfanPerks.map(({ icon: Icon, text }, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground text-sm leading-tight">
                          {text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    onClick={handleSuperfan}
                    variant="primary"
                    size="lg"
                    className="w-full mb-3"
                  >
                    Become a Superfan
                  </Button>

                  {/* Helper text */}
                  <p className="text-xs text-muted-foreground text-center">
                    Best value. Cancel anytime.
                  </p>
                </div>
              </GlowCard>
            </div>

            {/* PAY AS YOU GO Card */}
            <GlowCard glowColor="secondary" hover={false} className="h-full">
              <div className="p-6 md:p-8 flex flex-col h-full">
                {/* Icon */}
                <div className="flex justify-center mb-4 mt-3">
                  <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center border border-secondary/30">
                    <CreditCard className="w-8 h-8 text-secondary-foreground/70" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl md:text-3xl font-display uppercase tracking-wider text-center mb-2 text-foreground">
                  Pay As You Go
                </h3>

                {/* Price */}
                <div className="text-center mb-2">
                  <span className="text-4xl font-display text-foreground">$0.20</span>
                  <span className="text-muted-foreground text-sm"> per stream</span>
                </div>

                {/* Description */}
                <p className="text-muted-foreground text-center text-sm mb-6">
                  Listen on your own terms.
                </p>

                {/* Details */}
                <ul className="space-y-3 mb-6 flex-1">
                  {payAsYouGoDetails.map((text, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="text-muted-foreground text-sm leading-tight">
                        {text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  onClick={handlePayAsYouGo}
                  variant="outline"
                  size="lg"
                  className="w-full border-border/50 hover:border-primary/50 hover:bg-primary/5 mb-3"
                >
                  Load $5 in Credits
                </Button>

                {/* Helper text */}
                <p className="text-xs text-muted-foreground text-center">
                  Simple, flexible listening.
                </p>
              </div>
            </GlowCard>
          </div>

          {/* Footer note */}
          <p className="text-xs text-muted-foreground text-center mt-8 max-w-md mx-auto">
            Both options support artists directly. You can switch between plans anytime.
          </p>

          {/* Already purchased link */}
          <div className="text-center mt-6 pt-6 border-t border-border/30">
            {isCheckingCredits ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Checking account...</span>
              </div>
            ) : hasCredits ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Already purchased credits?
                </p>
                <Button
                  variant="link"
                  onClick={() => navigate("/fan/dashboard")}
                  className="text-primary hover:text-primary/80"
                >
                  Go to Dashboard →
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                You need to purchase credits to access the Vault.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChooseAccess;
