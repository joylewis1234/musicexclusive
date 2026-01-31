import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GlowCard } from "@/components/ui/GlowCard";
import { Header } from "@/components/Header";
import { useFanTermsAgreement } from "@/hooks/useFanTermsAgreement";
import { Sparkles, Music, ShieldCheck, Ban } from "lucide-react";
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
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-lg mx-auto px-4 pt-24 pb-8">
        {/* Celebration Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4 animate-pulse">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-wide mb-2">
            <span className="text-foreground">You're In</span>{" "}
            <span className="text-primary">🎉</span>
          </h1>
          <p className="text-lg font-display text-muted-foreground">
            One Last Step…
          </p>
        </div>

        <GlowCard className="p-6 mb-6">
          {/* Welcome Text */}
          <p className="text-sm md:text-base font-body text-muted-foreground mb-6 leading-relaxed">
            Welcome to <span className="text-primary font-semibold">Music Exclusive</span> — where fans get early access to music before the world hears it.
            <br /><br />
            Before you stream, we just need your agreement to keep the Vault fair, safe, and exclusive.
          </p>

          {/* Quick Bullet Points */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Music className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-body text-foreground pt-1">
                Streaming costs <span className="text-primary font-semibold">1 credit ($0.20)</span> per stream
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-body text-foreground pt-1">
                No refunds once credits are used
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Ban className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-body text-foreground pt-1">
                Respect the Vault — no fraud or stream manipulation
              </p>
            </div>
          </div>

          {/* Checkbox Agreement */}
          <div className="border-t border-border/30 pt-6">
            <div className="flex items-start gap-3 mb-4">
              <Checkbox
                id="agree-terms"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
                className="mt-0.5"
              />
              <label
                htmlFor="agree-terms"
                className="text-sm font-body text-foreground leading-relaxed cursor-pointer"
              >
                I agree to the Music Exclusive{" "}
                <Link
                  to="/terms"
                  className="text-primary hover:underline font-semibold"
                  target="_blank"
                >
                  Terms of Use
                </Link>{" "}
                and understand streaming costs 1 credit ($0.20) per stream.
              </label>
            </div>

            {/* Additional Policy Links */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground ml-7">
              <Link to="/privacy" className="hover:text-primary hover:underline" target="_blank">
                Privacy Policy
              </Link>
              <span className="text-border">•</span>
              <Link to="/refunds" className="hover:text-primary hover:underline" target="_blank">
                Refund Policy
              </Link>
            </div>
          </div>
        </GlowCard>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full"
            onClick={handleContinue}
            disabled={!agreed || isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Continue to Choose Access"}
          </Button>

          <Button
            variant="ghost"
            size="default"
            className="w-full"
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
