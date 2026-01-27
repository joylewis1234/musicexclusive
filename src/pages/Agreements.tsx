import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, Loader2, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// =============================================================================
// LEGAL CONTENT - Replace placeholder text below with actual legal documents
// =============================================================================

const TERMS_VERSION = "1.0";
const PRIVACY_VERSION = "1.0";

const FAN_TERMS_OF_SERVICE = `
FAN TERMS OF SERVICE
Version ${TERMS_VERSION}
Last Updated: [DATE]

1. ACCEPTANCE OF TERMS

By accessing or using Music Exclusive ("the Platform"), you agree to be bound by these Fan Terms of Service. If you do not agree to these terms, do not use the Platform.

2. ELIGIBILITY

You must be at least 18 years old or the age of majority in your jurisdiction to use this Platform. By using the Platform, you represent and warrant that you meet these requirements.

3. ACCOUNT REGISTRATION

To access certain features, you must register for an account. You agree to provide accurate information and keep your account credentials secure.

4. USER CONDUCT

You agree not to:
- Violate any applicable laws or regulations
- Infringe on the rights of others
- Share your account credentials
- Attempt to circumvent security measures

5. INTELLECTUAL PROPERTY

All content on the Platform is protected by copyright and other intellectual property laws. You may not reproduce, distribute, or create derivative works without permission.

6. LIMITATION OF LIABILITY

The Platform is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, or consequential damages.

7. TERMINATION

We reserve the right to terminate or suspend your account at any time for violations of these terms.

8. CHANGES TO TERMS

We may modify these terms at any time. Continued use of the Platform constitutes acceptance of modified terms.

9. GOVERNING LAW

These terms shall be governed by and construed in accordance with applicable laws.

10. CONTACT

For questions about these terms, please contact us through the Platform.

[ADDITIONAL TERMS TO BE ADDED]
`;

const PRIVACY_POLICY = `
PRIVACY POLICY
Version ${PRIVACY_VERSION}
Last Updated: [DATE]

1. INTRODUCTION

This Privacy Policy explains how Music Exclusive ("we", "us", "our") collects, uses, and protects your personal information.

2. INFORMATION WE COLLECT

We may collect:
- Account information (name, email address)
- Usage data (how you interact with the Platform)
- Device information (browser type, IP address)
- Communications you send to us

3. HOW WE USE YOUR INFORMATION

We use your information to:
- Provide and improve our services
- Communicate with you
- Personalize your experience
- Ensure security and prevent fraud

4. INFORMATION SHARING

We do not sell your personal information. We may share information with:
- Service providers who assist our operations
- Legal authorities when required by law
- Business partners with your consent

5. DATA SECURITY

We implement appropriate security measures to protect your information. However, no method of transmission is 100% secure.

6. YOUR RIGHTS

You may have rights to:
- Access your personal information
- Request correction of inaccurate data
- Request deletion of your data
- Opt out of certain data uses

7. COOKIES AND TRACKING

We use cookies and similar technologies to enhance your experience and collect usage data.

8. DATA RETENTION

We retain your information for as long as necessary to provide our services and comply with legal obligations.

9. CHILDREN'S PRIVACY

The Platform is not intended for users under 18 years of age.

10. CHANGES TO THIS POLICY

We may update this policy periodically. We will notify you of significant changes.

11. CONTACT US

For privacy-related inquiries, please contact us through the Platform.

[ADDITIONAL PRIVACY TERMS TO BE ADDED]
`;

// =============================================================================
// END LEGAL CONTENT
// =============================================================================

interface LocationState {
  email?: string;
  name?: string;
  flow?: "superfan" | "vault";
}

const Agreements = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const state = location.state as LocationState | null;
  
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canContinue = termsAccepted && privacyAccepted;

  const handleAccept = async () => {
    setIsSubmitting(true);

    try {
      // Only save to database if we have user info from the vault flow
      if (state?.email && state?.name) {
        const { error } = await supabase
          .from("agreement_acceptances")
          .upsert(
            {
              email: state.email,
              name: state.name,
              terms_version: TERMS_VERSION,
              privacy_version: PRIVACY_VERSION,
              accepted_at: new Date().toISOString(),
            },
            { onConflict: "email" }
          );

        if (error) throw error;
      }

      // Navigate based on flow type
      if (state?.flow === "superfan") {
        // Superfan flow: go directly to subscription payment (no choice)
        navigate("/subscribe", { state: { ...state, flow: "superfan" } });
      } else {
        // Vault winner flow: show both payment options
        navigate("/onboarding/listen", { state: { ...state, flow: "vault" } });
      }
    } catch (error) {
      console.error("Error saving agreement:", error);
      toast({
        title: "Error",
        description: "Failed to save your agreement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          <GlowCard glowColor="gradient" className="p-6 md:p-8">
            {/* Framed Header */}
            <div className="flex justify-center mb-8">
              <SectionHeader 
                title="Agreements Required" 
                align="center" 
                framed 
              />
            </div>

            <p className="text-muted-foreground text-center mb-8 text-sm md:text-base">
              Please review and accept the following agreements to continue.
            </p>

            {/* Terms of Service */}
            <div className="mb-6">
              <h3 className="text-foreground uppercase tracking-wider text-sm mb-3 flex items-center gap-2">
                Fan Terms of Service
                <span className="text-xs text-muted-foreground font-normal normal-case">
                  (v{TERMS_VERSION})
                </span>
              </h3>
              <div className="border border-border/50 rounded-lg bg-background/50">
                <ScrollArea className="h-48 md:h-56 p-4">
                  <pre className="whitespace-pre-wrap text-xs md:text-sm text-muted-foreground font-body leading-relaxed">
                    {FAN_TERMS_OF_SERVICE}
                  </pre>
                </ScrollArea>
              </div>
              <label className="flex items-start gap-3 mt-4 cursor-pointer group">
                <Checkbox
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  className="mt-0.5 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  I have read and agree to the Fan Terms of Service
                </span>
              </label>
            </div>

            {/* Privacy Policy */}
            <div className="mb-8">
              <h3 className="text-foreground uppercase tracking-wider text-sm mb-3 flex items-center gap-2">
                Privacy Policy
                <span className="text-xs text-muted-foreground font-normal normal-case">
                  (v{PRIVACY_VERSION})
                </span>
              </h3>
              <div className="border border-border/50 rounded-lg bg-background/50">
                <ScrollArea className="h-48 md:h-56 p-4">
                  <pre className="whitespace-pre-wrap text-xs md:text-sm text-muted-foreground font-body leading-relaxed">
                    {PRIVACY_POLICY}
                  </pre>
                </ScrollArea>
              </div>
              <label className="flex items-start gap-3 mt-4 cursor-pointer group">
                <Checkbox
                  checked={privacyAccepted}
                  onCheckedChange={(checked) => setPrivacyAccepted(checked === true)}
                  className="mt-0.5 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  I have read and agree to the Privacy Policy
                </span>
              </label>
            </div>

            {/* CTA Button */}
            <Button
              onClick={handleAccept}
              disabled={!canContinue || isSubmitting}
              className="w-full"
              variant="primary"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Accept & Continue"
              )}
            </Button>

            {!canContinue && (
              <p className="text-xs text-muted-foreground text-center mt-4">
                Please review and accept both agreements to continue
              </p>
            )}
          </GlowCard>
        </div>
      </main>
    </div>
  );
};

export default Agreements;
