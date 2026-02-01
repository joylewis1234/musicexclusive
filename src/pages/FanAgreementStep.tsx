import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, FileText, Music, ShieldCheck, Ban, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LocationState {
  email?: string;
  name?: string;
  vaultCode?: string;
  flow?: string;
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
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle page background gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-muted/30 via-background to-background pointer-events-none" />
      
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
          {/* Document Header */}
          <div className="mb-8">
            {/* Document Icon + Title */}
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-[26px] md:text-[30px] font-display font-bold tracking-tight text-foreground leading-tight">
                  Vault Access Agreement
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Music Exclusive™ Fan Terms
                </p>
              </div>
            </div>
            
            {/* Summary Strip */}
            <div className="mt-5 p-4 rounded-lg bg-muted/50 border border-border/40">
              <p className="text-sm text-foreground/90 leading-relaxed">
                Before you enter the Vault, please confirm the terms below. By agreeing, you acknowledge and accept the streaming terms, credit policies, and fair use guidelines.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border/50 mb-8" />

          {/* Agreement Content Card */}
          <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-[2px] overflow-hidden">
            {/* Agreement Items */}
            <div className="divide-y divide-border/30">
              {agreementItems.map((item, index) => (
                <div key={index} className="p-5 md:p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-foreground mb-1">
                        {item.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Checkbox Agreement Section */}
            <div className="border-t border-border/50 bg-muted/20 p-5 md:p-6">
              <div 
                className={cn(
                  "rounded-lg border p-4 cursor-pointer transition-all",
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
                    className="mt-0.5 w-5 h-5 border-2 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor="agree-terms"
                      className="text-sm text-foreground leading-relaxed cursor-pointer block"
                    >
                      I have read and agree to the Music Exclusive{" "}
                      <Link
                        to="/terms"
                        className="text-primary hover:underline font-medium"
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Terms of Use
                      </Link>
                      , including the streaming credit policy and fair use guidelines.
                    </label>
                    
                    {/* Additional Policy Links */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3">
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
        <div className="max-w-[680px] mx-auto w-full flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          
          <Button
            onClick={handleContinue}
            disabled={!agreed || isSubmitting}
            className="min-w-[160px]"
          >
            {isSubmitting ? "Saving..." : "Agree & Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FanAgreementStep;
