import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, FileText, Loader2, ExternalLink, Crown, Calendar, DollarSign, Music, Shield } from "lucide-react";
import { useArtistAgreement } from "@/hooks/useArtistAgreement";
import { toast } from "sonner";

const ArtistAgreementAccept = () => {
  const navigate = useNavigate();
  const { acceptAgreement, isSubmitting, currentVersion } = useArtistAgreement();
  const [agreed, setAgreed] = useState(false);

  const handleContinue = async () => {
    if (!agreed) return;

    const success = await acceptAgreement();
    if (success) {
      toast.success("Agreement accepted!");
      navigate("/artist/upload");
    } else {
      toast.error("Failed to save agreement. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/artist/dashboard")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm uppercase tracking-wider">Back</span>
          </button>
          <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400" />
            Agreement
          </span>
          <div className="w-16" />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex-1 flex items-center justify-center px-4 pt-20 pb-8">
        <div className="w-full max-w-lg">
          <GlowCard glowColor="gradient" className="p-6 md:p-8 backdrop-blur-xl bg-card/80">
            {/* Icon */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-purple-600/20 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20">
              <FileText className="w-10 h-10 text-primary" />
            </div>

            {/* Title */}
            <div className="text-center mb-6">
              <p className="text-xs uppercase tracking-widest text-primary mb-2 flex items-center justify-center gap-2">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                Music Exclusive™
              </p>
              <SectionHeader 
                title="Artist Agreement" 
                align="center" 
                framed 
              />
            </div>

            {/* Glowing Divider */}
            <div className="relative h-px w-full mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent blur-sm" />
            </div>

            {/* Summary */}
            <div className="bg-background/60 rounded-xl p-5 mb-6 border border-primary/20">
              <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Key Terms
              </h3>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <span className="pt-1.5">
                    <span className="text-primary font-bold">3-week</span> exclusive release window on Music Exclusive
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Music className="w-4 h-4 text-primary" />
                  </div>
                  <span className="pt-1.5">
                    You retain <span className="text-foreground font-semibold">100% ownership</span> of your music
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                  <span className="pt-1.5">
                    Earn <span className="text-primary font-bold">$0.10</span> per stream (50/50 revenue split)
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <span className="pt-1.5">
                    Weekly payouts every <span className="text-primary font-bold">Monday</span> via Stripe
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  <span className="pt-1.5">
                    You confirm you own or control all rights to uploaded content
                  </span>
                </li>
              </ul>
            </div>

            {/* View Full Agreement Button */}
            <div className="flex justify-center mb-6">
              <Link to="/artist-agreement" target="_blank">
                <Button variant="outline" className="gap-2 border-primary/30 hover:border-primary/50 hover:bg-primary/5">
                  <ExternalLink className="w-4 h-4" />
                  View Full Agreement
                </Button>
              </Link>
            </div>

            {/* Glowing Divider */}
            <div className="relative h-px w-full mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent blur-sm" />
            </div>

            {/* Checkbox - Enhanced for mobile */}
            <div 
              className="rounded-xl bg-background/60 border border-primary/20 p-4 md:p-5 mb-6 cursor-pointer transition-all hover:border-primary/40 hover:bg-background/80 active:scale-[0.99]"
              onClick={() => setAgreed(!agreed)}
            >
              <div className="flex items-start gap-4">
                <Checkbox
                  id="agree"
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked === true)}
                  className="mt-1 w-5 h-5 border-2 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <label 
                  htmlFor="agree" 
                  className="text-sm md:text-base text-foreground cursor-pointer leading-relaxed"
                >
                  I agree to the Music Exclusive{" "}
                  <Link 
                    to="/artist-agreement" 
                    target="_blank"
                    className="text-primary hover:underline font-semibold"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Artist Participation Agreement
                  </Link>
                  .
                </label>
              </div>
            </div>

            {/* Continue Button - Large and mobile-friendly */}
            <Button
              onClick={handleContinue}
              disabled={!agreed || isSubmitting}
              className="w-full h-14 text-base font-display uppercase tracking-wider bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Continue"
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Agreement version: <span className="text-primary">{currentVersion}</span>
            </p>
          </GlowCard>
        </div>
      </main>
    </div>
  );
};

export default ArtistAgreementAccept;
