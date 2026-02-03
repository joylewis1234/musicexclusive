import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/GlowCard";
import { Crown, Sparkles, Music, ArrowRight } from "lucide-react";

const VaultWinCongrats = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showContent, setShowContent] = useState(false);

  // Get params from URL
  const email = searchParams.get("email") || "";
  const code = searchParams.get("code") || "";
  const isRetry = searchParams.get("retry") === "true";

  useEffect(() => {
    // Store in session for later steps
    if (email) sessionStorage.setItem("vaultEmail", email);
    if (code) sessionStorage.setItem("vaultCode", code);

    // Animate in content
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, [email, code]);

  const handleContinue = () => {
    // Navigate to login page with vault flow
    navigate("/auth/fan?flow=vault", {
      state: { email, vaultCode: code, flow: "vault" },
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8 overflow-hidden">
      {/* Animated background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] bg-purple-500/10 rounded-full blur-[60px]" />
      </div>

      {/* Content */}
      <div
        className={`relative z-10 max-w-lg w-full text-center transition-all duration-700 ${
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* Celebration Icon */}
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="absolute inset-0 w-32 h-32 bg-primary/30 rounded-full blur-2xl animate-pulse" />
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 border-2 border-primary/50 flex items-center justify-center shadow-[0_0_60px_rgba(0,212,255,0.4)]">
            <Crown className="w-14 h-14 text-primary" />
          </div>
          {/* Sparkles */}
          <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-amber-400 animate-bounce" />
          <Sparkles className="absolute -bottom-1 -left-3 w-6 h-6 text-primary animate-pulse" />
        </div>

        {/* Title */}
        <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
          {isRetry ? "You Finally Made It!" : "YOU'RE IN!"} 🎉
        </h1>

        {/* Subtitle */}
        <p className="text-xl text-primary font-medium mb-6">
          {isRetry
            ? "Vault Access Granted After All!"
            : "Welcome to Music Exclusive"}
        </p>

        {/* Vault Code Display */}
        {code && (
          <GlowCard className="inline-block px-8 py-4 mb-8">
            <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">
              Your Vault Code
            </p>
            <p className="text-3xl font-mono font-bold text-primary tracking-[0.3em]">
              {code}
            </p>
          </GlowCard>
        )}

        {/* Description */}
        <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-md mx-auto">
          {isRetry ? (
            <>
              After trying before, you've officially been selected. Inside the
              Vault is where artists drop music <strong className="text-foreground">FIRST</strong>.
            </>
          ) : (
            <>
              You're now getting <strong className="text-foreground">early access to exclusive music</strong>{" "}
              that the rest of the world isn't hearing yet.
            </>
          )}
        </p>

        {/* Features */}
        <div className="flex items-center justify-center gap-6 mb-10 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-primary" />
            <span>Exclusive Tracks</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Early Access</span>
          </div>
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleContinue}
          size="lg"
          className="text-lg px-10 py-6 shadow-[0_0_30px_rgba(0,212,255,0.3)] hover:shadow-[0_0_40px_rgba(0,212,255,0.5)] transition-all"
        >
          Continue to Login
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>

        {/* Sub text */}
        <p className="text-sm text-muted-foreground mt-6">
          Sign in to access your Vault membership
        </p>
      </div>
    </div>
  );
};

export default VaultWinCongrats;
