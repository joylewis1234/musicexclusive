import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, Loader2, Crown, ShieldCheck, Clock, Coins, DollarSign } from "lucide-react";
import { useArtistAgreement } from "@/hooks/useArtistAgreement";
import { toast } from "sonner";

const ArtistAgreementAccept = () => {
  const navigate = useNavigate();
  const { acceptAgreement, isSubmitting } = useArtistAgreement();
  const [agreed, setAgreed] = useState(false);

  const handleContinue = async () => {
    if (!agreed) {
      toast.error("Please agree to the Artist Participation Agreement to continue");
      return;
    }

    const success = await acceptAgreement();
    if (success) {
      toast.success("Agreement accepted! You can now upload your music.");
      navigate("/artist/dashboard");
    } else {
      toast.error("Failed to save agreement. Please try again.");
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const bulletPoints = [
    {
      icon: ShieldCheck,
      text: "You confirm you own or control the rights to your music + artwork"
    },
    {
      icon: Clock,
      text: "Your releases are exclusive on Music Exclusive for at least 3 weeks"
    },
    {
      icon: Coins,
      text: "Fans stream using credits (1 credit = $0.20)"
    },
    {
      icon: DollarSign,
      text: "You earn $0.10 per verified stream (paid weekly on Mondays)"
    }
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative p-4 flex items-center justify-between max-w-2xl mx-auto w-full">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">Back</span>
        </button>
      </header>

      <main className="relative container max-w-lg mx-auto px-4 pt-8 pb-8">
        {/* Header with crown */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/30 to-primary/20 mb-4 shadow-lg shadow-amber-500/20">
            <Crown className="w-10 h-10 text-amber-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-wide mb-2">
            <span className="text-foreground">Welcome, Artist</span>{" "}
            <span className="text-amber-400">👑</span>
          </h1>
          <p className="text-lg font-display text-primary">
            Let's Make It Official
          </p>
        </div>

        <GlowCard glowColor="gradient" className="p-0 backdrop-blur-xl">
          <div className="p-7 md:p-9">
          {/* Intro Text */}
          <p className="text-sm md:text-base font-body text-muted-foreground mb-4 leading-relaxed">
            <span className="text-primary font-semibold">Music Exclusive</span> is a pre-release platform built to pay artists more and reward real fans.
          </p>
          <p className="text-sm md:text-base font-body text-muted-foreground mb-6 leading-relaxed">
            Before you upload, we need your agreement to protect your work and the platform.
          </p>

          {/* Glowing Divider */}
          <div className="relative h-px w-full mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent blur-sm" />
          </div>

          {/* Bullet Points */}
          <div className="space-y-5 mb-8">
            {bulletPoints.map((item, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-purple-600/20 flex items-center justify-center shrink-0 shadow-lg shadow-primary/10">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm md:text-base font-body text-foreground pt-2">
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          {/* Glowing Divider */}
          <div className="relative h-px w-full mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent blur-sm" />
          </div>

          {/* Checkbox Agreement */}
          <div 
            className="rounded-xl bg-background/60 border border-primary/20 p-4 md:p-5 cursor-pointer transition-all hover:border-primary/40 hover:bg-background/80 active:scale-[0.99]"
            onClick={() => setAgreed(!agreed)}
          >
            <div className="flex items-start gap-4">
              <Checkbox
                id="agree-artist-terms"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
                className="mt-1 w-5 h-5 border-2 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <label
                htmlFor="agree-artist-terms"
                className="text-sm md:text-base font-body text-foreground leading-relaxed cursor-pointer"
              >
                I agree to the{" "}
                <Link
                  to="/artist-agreement?from=artist-agreement-accept"
                  className="text-primary hover:underline font-semibold"
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                >
                  Artist Participation Agreement
                </Link>{" "}
                and confirm I own or control all rights to the Content I upload.
              </label>
            </div>

            {/* Additional Policy Links */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-4 ml-9">
              <Link 
                to="/terms" 
                className="hover:text-primary hover:underline transition-colors" 
                target="_blank"
                onClick={(e) => e.stopPropagation()}
              >
                Terms of Use
              </Link>
              <span className="text-primary/30">•</span>
              <Link 
                to="/dmca" 
                className="hover:text-primary hover:underline transition-colors" 
                target="_blank"
                onClick={(e) => e.stopPropagation()}
              >
                Copyright & DMCA
              </Link>
            </div>
          </div>
          </div>
        </GlowCard>

        {/* Action Buttons */}
        <div className="space-y-3 mt-6">
          <Button
            size="lg"
            className="w-full h-14 text-base font-display uppercase tracking-wider bg-gradient-to-r from-amber-500 to-primary hover:from-amber-500/90 hover:to-primary/90 shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
            onClick={handleContinue}
            disabled={!agreed || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "I Agree & Continue"
            )}
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

export default ArtistAgreementAccept;
