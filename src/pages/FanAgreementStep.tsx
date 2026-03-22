import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, Music, ShieldCheck, Ban, Check, Crown, Sparkles, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadFanAgreementPdf } from "@/utils/generateAgreementPdf";

interface LocationState {
  email?: string;
  name?: string;
  vaultCode?: string;
  flow?: string;
  invite_token?: string;
  invite_type?: string;
}

const FanAgreementStep = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get user info from navigation state or session storage
  const email = state?.email || sessionStorage.getItem("vaultEmail") || "";
  const name = state?.name || sessionStorage.getItem("vaultName") || "";
  const vaultCode = state?.vaultCode || sessionStorage.getItem("vaultCode") || "";

  const handleContinue = async () => {
    if (!agreed) {
      toast.error("Please agree to the terms to continue");
      return;
    }

    setIsSubmitting(true);

    try {
      // Store agreement acceptance in session for now
      // It will be saved to database after account creation
      sessionStorage.setItem("fanTermsAccepted", "true");
      sessionStorage.setItem("fanTermsAcceptedAt", new Date().toISOString());
      
      // Navigate to choose access / payment page
      navigate("/onboarding/listen", {
        state: {
          email,
          name,
          vaultCode,
          agreedToTerms: true,
          invite_token: state?.invite_token,
          invite_type: state?.invite_type,
          flow: state?.flow,
        },
      });
    } catch (err) {
      console.error("Error in handleContinue:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const agreementItems = [
    {
      icon: Music,
      title: "Stream Pricing",
      description: "Each stream costs 1 credit ($0.20). Credits are non-transferable.",
    },
    {
      icon: ShieldCheck,
      title: "No Refunds on Used Credits",
      description: "Once credits are used to stream, they cannot be refunded.",
    },
    {
      icon: Ban,
      title: "Fair Use Policy",
      description: "No fraudulent activity, stream manipulation, or abuse of the platform.",
    },
    {
      icon: ShieldCheck,
      title: "Watermark Protection",
      description:
        "Vault audio may include account-linked watermarking and security controls. You may not record, rip, redistribute, or publicly share Vault content or access credentials.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle page background gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none" />
      
      {/* Minimal Header */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/30">
        <div className="max-w-[680px] mx-auto w-full px-5 md:px-7 py-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-5 md:px-7 py-8 md:py-12 pb-32">
        <div className="max-w-[680px] mx-auto w-full">
          
          {/* Celebration Header */}
          <div className="text-center mb-8">
            {/* Sparkle Icon */}
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
            </div>
            
            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
              YOU'RE IN <span className="inline-block">🎉</span>
            </h1>
            <p className="text-muted-foreground text-base">
              One Last Step...
            </p>
          </div>

          {/* Agreement Card */}
          <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
            {/* Card Header */}
            <div className="px-6 py-5 border-b border-border/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Crown className="w-5 h-5 text-primary" />
                  <span className="text-primary font-semibold">Music Exclusive</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadFanAgreementPdf}
                  className="gap-2 text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </Button>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Welcome to Music Exclusive — where fans get early access to music before the world hears it.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                Before you stream, we just need your agreement to keep the Vault fair, safe, and exclusive.
              </p>
            </div>

            {/* Agreement Items */}
            <div className="divide-y divide-border/30">
              {agreementItems.map((item, index) => (
                <div key={index} className="px-6 py-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <h3 className="text-sm font-semibold text-foreground mb-0.5">
                        {item.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Checkbox Agreement Section */}
            <div className="border-t border-border/50 bg-muted/10 px-6 py-5">
              <div 
                className={cn(
                  "rounded-xl border p-4 cursor-pointer transition-all",
                  agreed 
                    ? "border-primary/50 bg-primary/5" 
                    : "border-border/50 bg-background/50 hover:border-primary/30"
                )}
                onClick={() => setAgreed(!agreed)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="agree-terms"
                    checked={agreed}
                    onCheckedChange={(checked) => setAgreed(checked === true)}
                    className="mt-0.5 w-5 h-5 rounded-full border-2 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor="agree-terms"
                      className="text-sm text-foreground leading-relaxed cursor-pointer block"
                    >
                      I agree to the Music Exclusive{" "}
                      <Link
                        to="/terms"
                        className="text-primary hover:underline font-medium"
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Terms of Use
                      </Link>.
                    </label>
                    
                    {/* Additional Policy Links */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                      <Link 
                        to="/privacy" 
                        className="hover:text-primary transition-colors" 
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Privacy Policy
                      </Link>
                      <span className="text-border">•</span>
                      <Link 
                        to="/refunds" 
                        className="hover:text-primary transition-colors" 
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Refund Policy
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-t border-border/30 px-5 md:px-7 py-4">
        <div className="max-w-[680px] mx-auto w-full">
          <Button
            onClick={handleContinue}
            disabled={!agreed || isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? "Saving..." : "Agree & Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FanAgreementStep;
