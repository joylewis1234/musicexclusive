import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, Loader2, Crown } from "lucide-react";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useArtistAgreement } from "@/hooks/useArtistAgreement";
import { useAuth } from "@/contexts/AuthContext";
import AgreementTextContent from "@/components/artist/agreement/AgreementTextContent";

const signatureSchema = z.object({
  legalName: z.string().trim().min(1, "Legal name is required").max(200),
  artistName: z.string().trim().min(1, "Artist / stage name is required").max(200),
  agreedTerms: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the Artist Participation Agreement" }),
  }),
  agreedAge: z.literal(true, {
    errorMap: () => ({ message: "You must confirm you are 18 or older" }),
  }),
});

type SignatureFormValues = z.infer<typeof signatureSchema>;

const ArtistAgreementAccept = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { acceptAgreement, isSubmitting, lastError } = useArtistAgreement();

  const [scrollPercent, setScrollPercent] = useState(0);
  const [hasScrolled90, setHasScrolled90] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const form = useForm<SignatureFormValues>({
    resolver: zodResolver(signatureSchema),
    mode: "onChange",
    defaultValues: {
      legalName: "",
      artistName: "",
      agreedTerms: undefined as unknown as true,
      agreedAge: undefined as unknown as true,
    },
  });

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const pct = Math.round(
      (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100
    );
    setScrollPercent(Math.min(pct, 100));
    if (pct >= 90) setHasScrolled90(true);
  }, []);

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const onSubmit = async (values: SignatureFormValues) => {
    if (!hasScrolled90) return;
    setSubmitError(null);

    const success = await acceptAgreement({
      legalName: values.legalName,
      artistName: values.artistName,
    });

    if (success) {
      setShowConfirmation(true);
    } else {
      setSubmitError(
        lastError || "Something went wrong. Please try again or contact support@musicexclusive.co"
      );
    }
  };

  const handleBack = () => navigate(-1);

  const canSubmit =
    hasScrolled90 && form.formState.isValid && !isSubmitting;

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

      <main className="relative container max-w-lg mx-auto px-4 pt-4 pb-8">
        {/* Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/30 to-primary/20 mb-3 shadow-lg shadow-amber-500/20">
            <Crown className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-wide mb-1">
            Artist Participation Agreement
          </h1>
          <p className="text-sm text-muted-foreground">
            Please read the full agreement before signing
          </p>
        </div>

        {/* Scroll progress */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Reading progress</span>
            <span>{scrollPercent}%</span>
          </div>
          <Progress value={scrollPercent} className="h-2" />
        </div>

        {/* Scrollable agreement text */}
        <GlowCard glowColor="gradient" className="p-0 backdrop-blur-xl mb-4">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="max-h-[520px] overflow-y-auto p-5 md:p-7 scrollbar-thin"
            style={{ scrollbarWidth: "thin" }}
          >
            <AgreementTextContent />
          </div>
        </GlowCard>

        {/* Helper text */}
        {!hasScrolled90 && (
          <p className="text-center text-xs text-amber-400 mb-4 animate-pulse">
            Scroll to the bottom to unlock the signature block
          </p>
        )}

        {/* Signature Block */}
        <div
          className={`transition-opacity duration-500 ${
            hasScrolled90
              ? "opacity-100"
              : "opacity-40 pointer-events-none"
          }`}
        >
          <GlowCard glowColor="gradient" className="p-0 backdrop-blur-xl">
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 md:p-7 space-y-5">
              <h2 className="text-lg font-display font-semibold text-foreground">
                Electronic Signature
              </h2>

              {/* Legal Name */}
              <div className="space-y-1.5">
                <Label htmlFor="legalName">Legal Full Name *</Label>
                <Input
                  id="legalName"
                  placeholder="Type your full legal name as your electronic signature"
                  {...form.register("legalName")}
                />
                {form.formState.errors.legalName && (
                  <p className="text-xs text-destructive">{form.formState.errors.legalName.message}</p>
                )}
              </div>

              {/* Artist Name */}
              <div className="space-y-1.5">
                <Label htmlFor="artistName">Artist / Stage Name *</Label>
                <Input
                  id="artistName"
                  placeholder="Your artist or stage name"
                  {...form.register("artistName")}
                />
                {form.formState.errors.artistName && (
                  <p className="text-xs text-destructive">{form.formState.errors.artistName.message}</p>
                )}
              </div>

              {/* Email (read-only) */}
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  value={user?.email || ""}
                  readOnly
                  className="bg-muted/50 cursor-not-allowed"
                />
              </div>

              {/* Signature Date (read-only) */}
              <div className="space-y-1.5">
                <Label>Signature Date</Label>
                <Input
                  value={todayFormatted}
                  readOnly
                  className="bg-muted/50 cursor-not-allowed"
                />
              </div>

              {/* Glowing Divider */}
              <div className="relative h-px w-full">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              </div>

              {/* Checkbox 1 */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="agreedTerms"
                  checked={form.watch("agreedTerms") === true}
                  onCheckedChange={(checked) =>
                    form.setValue("agreedTerms", checked === true ? true : (undefined as unknown as true), {
                      shouldValidate: true,
                    })
                  }
                  className="mt-1 w-5 h-5 border-2 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <label htmlFor="agreedTerms" className="text-sm text-foreground leading-relaxed cursor-pointer">
                  I have read and agree to the full Music Exclusive Artist Participation Agreement including all Schedules.
                </label>
              </div>

              {/* Checkbox 2 */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="agreedAge"
                  checked={form.watch("agreedAge") === true}
                  onCheckedChange={(checked) =>
                    form.setValue("agreedAge", checked === true ? true : (undefined as unknown as true), {
                      shouldValidate: true,
                    })
                  }
                  className="mt-1 w-5 h-5 border-2 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <label htmlFor="agreedAge" className="text-sm text-foreground leading-relaxed cursor-pointer">
                  I confirm I am 18 years of age or older, or have legal parental or guardian consent to enter this agreement.
                </label>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                size="lg"
                className="w-full h-14 text-base font-display uppercase tracking-wider bg-gradient-to-r from-amber-500 to-primary hover:from-amber-500/90 hover:to-primary/90 shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
                disabled={!canSubmit}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Signing...
                  </>
                ) : (
                  "Sign & Continue"
                )}
              </Button>

              {/* Error banner */}
              {submitError && (
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
                  <p className="text-destructive text-sm">{submitError}</p>
                </div>
              )}
            </form>
          </GlowCard>
        </div>

        {/* Back button */}
        <div className="mt-4">
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

      {/* Confirmation Modal */}
      <Dialog open={showConfirmation} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-display">
              Agreement Signed ✓
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-2">
              Your signed agreement has been recorded. You can download a copy anytime from your Artist Dashboard.
            </DialogDescription>
          </DialogHeader>
          <Button
            size="lg"
            className="w-full mt-4 bg-gradient-to-r from-amber-500 to-primary"
            onClick={() => {
              setShowConfirmation(false);
              navigate("/artist/dashboard");
            }}
          >
            Continue to Dashboard
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArtistAgreementAccept;
