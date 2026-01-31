import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, FileText, Loader2, ExternalLink } from "lucide-react";
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
    <div className="min-h-screen bg-background flex flex-col">
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
          <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
            Agreement
          </span>
          <div className="w-16" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-8">
        <div className="w-full max-w-lg">
          <GlowCard glowColor="gradient" className="p-6 md:p-8">
            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-primary" />
            </div>

            {/* Title */}
            <div className="text-center mb-6">
              <SectionHeader 
                title="Artist Agreement" 
                align="center" 
                framed 
              />
            </div>

            {/* Summary */}
            <div className="bg-muted/20 rounded-lg p-4 mb-6 border border-border/30">
              <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">
                Summary
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>3-week exclusive release window on Music Exclusive</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>You retain 100% ownership of your music</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Earn $0.10 per stream (50/50 revenue split)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Weekly payouts every Monday via Stripe</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>You confirm you own or control all rights to uploaded content</span>
                </li>
              </ul>
            </div>

            {/* View Full Agreement Button */}
            <div className="flex justify-center mb-6">
              <Link to="/artist-agreement" target="_blank">
                <Button variant="outline" className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  View Full Agreement
                </Button>
              </Link>
            </div>

            {/* Checkbox */}
            <div className="flex items-start gap-3 mb-6 p-4 bg-background/50 rounded-lg border border-border/30">
              <Checkbox
                id="agree"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
                className="mt-0.5"
              />
              <label 
                htmlFor="agree" 
                className="text-sm text-muted-foreground cursor-pointer leading-relaxed"
              >
                I agree to the Music Exclusive{" "}
                <Link 
                  to="/artist-agreement" 
                  target="_blank"
                  className="text-primary hover:underline"
                >
                  Artist Participation Agreement
                </Link>
                .
              </label>
            </div>

            {/* Continue Button */}
            <Button
              onClick={handleContinue}
              disabled={!agreed || isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Continue"
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Agreement version: {currentVersion}
            </p>
          </GlowCard>
        </div>
      </main>
    </div>
  );
};

export default ArtistAgreementAccept;
