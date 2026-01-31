import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GlowCard } from "@/components/ui/GlowCard";
import { Header } from "@/components/Header";
import { useFanTermsAgreement } from "@/hooks/useFanTermsAgreement";
import { Sparkles, Music, ShieldCheck, Ban, Crown } from "lucide-react";
import { toast } from "sonner";

const FanAgreementStep = () => {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const { acceptTerms, isSubmitting } = useFanTermsAgreement();

  const handleContinue = async () => {
    if (!agreed) {
      toast.error("Please agree to the terms to continue");
      return;
    }

    const success = await acceptTerms();
    if (success) {
      navigate("/onboarding/listen");
    } else {
      toast.error("Failed to save agreement. Please try again.");
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      
      <Header />

      <main className="relative container max-w-lg mx-auto px-4 pt-24 pb-8">
        {/* Celebration Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-purple-600/20 mb-4 animate-pulse shadow-lg shadow-primary/20">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-wide mb-2">
            <span className="text-foreground">You're In</span>{" "}
            <span className="text-primary">🎉</span>
          </h1>
          <p className="text-lg font-display text-muted-foreground">
            One Last Step…
          </p>
        </div>

        <GlowCard glowColor="gradient" className="p-6 md:p-8 backdrop-blur-xl bg-card/80">
          {/* Welcome Text */}
          <p className="text-sm md:text-base font-body text-muted-foreground mb-6 leading-relaxed">
            Welcome to{" "}
            <span className="text-primary font-semibold inline-flex items-center gap-1.5">
              Music Exclusive
              <Crown className="w-4 h-4 text-amber-400" />
            </span>{" "}
            — where fans get early access to music before the world hears it.
          </p>
          <p className="text-sm md:text-base font-body text-muted-foreground mb-6 leading-relaxed">
            Before you stream, we just need your agreement to keep the Vault fair, safe, and exclusive.
          </p>

          {/* Glowing Divider */}
          <div className="relative h-px w-full mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent blur-sm" />
          </div>

          {/* Quick Bullet Points */}
          <div className="space-y-5 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-purple-600/20 flex items-center justify-center shrink-0 shadow-lg shadow-primary/10">
                <Music className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm md:text-base font-body text-foreground pt-2">
                Streaming costs{" "}
                <span className="text-primary font-bold">1 credit</span>{" "}
                <span className="text-primary font-bold">($0.20)</span> per stream
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-purple-600/20 flex items-center justify-center shrink-0 shadow-lg shadow-primary/10">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm md:text-base font-body text-foreground pt-2">
                No refunds once credits are used
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-purple-600/20 flex items-center justify-center shrink-0 shadow-lg shadow-primary/10">
                <Ban className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm md:text-base font-body text-foreground pt-2">
                Respect the Vault — no fraud or stream manipulation
              </p>
            </div>
          </div>

          {/* Glowing Divider */}
          <div className="relative h-px w-full mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent blur-sm" />
          </div>

          {/* Checkbox Agreement - Enhanced for mobile */}
          <div 
            className="rounded-xl bg-background/60 border border-primary/20 p-4 md:p-5 cursor-pointer transition-all hover:border-primary/40 hover:bg-background/80 active:scale-[0.99]"
            onClick={() => setAgreed(!agreed)}
          >
            <div className="flex items-start gap-4">
              <Checkbox
                id="agree-terms"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
                className="mt-1 w-5 h-5 border-2 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <label
                htmlFor="agree-terms"
                className="text-sm md:text-base font-body text-foreground leading-relaxed cursor-pointer"
              >
                I agree to the Music Exclusive{" "}
                <Link
                  to="/terms"
                  className="text-primary hover:underline font-semibold"
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                >
                  Terms of Use
                </Link>
                .
              </label>
            </div>

            {/* Additional Policy Links */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-4 ml-9">
              <Link 
                to="/privacy" 
                className="hover:text-primary hover:underline transition-colors" 
                target="_blank"
                onClick={(e) => e.stopPropagation()}
              >
                Privacy Policy
              </Link>
              <span className="text-primary/30">•</span>
              <Link 
                to="/refunds" 
                className="hover:text-primary hover:underline transition-colors" 
                target="_blank"
                onClick={(e) => e.stopPropagation()}
              >
                Refund Policy
              </Link>
            </div>
          </div>
        </GlowCard>

        {/* Action Buttons - Large and mobile-friendly */}
        <div className="space-y-3 mt-6">
          <Button
            size="lg"
            className="w-full h-14 text-base font-display uppercase tracking-wider bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
            onClick={handleContinue}
            disabled={!agreed || isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Continue to Choose Access"}
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="w-full h-12 text-muted-foreground hover:text-foreground"
            onClick={handleBack}
            disabled={isSubmitting}
          >
            Back
          </Button>
        </div>
      </main>
    </div>
  );
};

export default FanAgreementStep;
