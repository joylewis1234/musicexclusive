import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Home, Coins, Loader2, CheckCircle2, Plus, Minus } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LocationState {
  email?: string;
  name?: string;
  topUpCredits?: number;
  flow?: string;
}

const CREDIT_TO_DOLLAR = 0.20;
const MIN_CREDITS = 25;
const DEFAULT_CREDITS = 25;

const LoadCredits = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = location.state as LocationState | null;
  const { credits: currentBalance, refetch } = useCredits();
  const { user, isLoading: authLoading } = useAuth();

  const initialCredits = state?.topUpCredits || DEFAULT_CREDITS;
  const [credits, setCredits] = useState<number>(initialCredits);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [purchasedCredits, setPurchasedCredits] = useState(0);
  const [newBalance, setNewBalance] = useState(0);

  // Check for payment success from URL params
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      refetch();
      toast.success("Payment successful! Credits added to your wallet.");
    } else if (paymentStatus === "cancelled") {
      toast.info("Payment cancelled.");
    }
  }, [searchParams, refetch]);

  useEffect(() => {
    if (state?.topUpCredits) {
      setCredits(state.topUpCredits);
    }
  }, [state?.topUpCredits]);

  const dollars = credits * CREDIT_TO_DOLLAR;

  const quickOptions = [
    { credits: 25, dollars: 5 },
    { credits: 50, dollars: 10 },
    { credits: 100, dollars: 20 },
  ];

  const handleCreditsChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0) {
      setCredits(num);
    } else if (value === "") {
      setCredits(0);
    }
  };

  const adjustCredits = (delta: number) => {
    setCredits((prev) => Math.max(0, prev + delta));
  };

  const handlePayment = async () => {
    if (credits < MIN_CREDITS) return;
    if (!user?.email) {
      toast.error("Please log in to purchase credits");
      return;
    }

    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          credits,
          email: user.email,
          // Always return via a public route so verification can run even if the user session is lost.
          successUrl: `${window.location.origin}/checkout/return?payment=success&credits=${credits}`,
          cancelUrl: `${window.location.origin}/fan/payment?payment=cancelled`,
        },
      });

      if (error) {
        console.error("Checkout error:", error);
        toast.error("Failed to start checkout. Please try again.");
        setIsProcessing(false);
        return;
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        toast.error("Failed to create checkout session");
        setIsProcessing(false);
      }
    } catch (err) {
      console.error("Payment error:", err);
      toast.error("Something went wrong. Please try again.");
      setIsProcessing(false);
    }
  };

  // After payment completes, auto-redirect to dashboard after a brief delay
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        navigate("/fan/profile", { replace: true });
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, navigate]);

  if (isComplete) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Navigation Header */}
        <header className="p-4 flex items-center justify-end max-w-2xl mx-auto w-full">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="w-5 h-5" />
            <span className="text-sm uppercase tracking-wider">Home</span>
          </button>
        </header>

        {/* Success State */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-md text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 text-primary mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            </div>

            <SectionHeader title="Credits Loaded!" align="center" framed />

            <p className="text-muted-foreground mt-6 mb-2">
              Your credits are ready to use.
            </p>

            {/* Balance Card */}
            <GlowCard glowColor="primary" hover={false} className="mt-8">
              <div className="p-6 text-center">
                <p className="text-muted-foreground/70 text-xs uppercase tracking-wider mb-2">
                  Your Balance
                </p>
                <p
                  className="text-4xl font-bold font-display text-foreground mb-1"
                  style={{ textShadow: "0 0 30px rgba(0, 255, 255, 0.3)" }}
                >
                  {newBalance} Credits
                </p>
                <p className="text-muted-foreground/70 text-sm">
                  ≈ ${(newBalance * CREDIT_TO_DOLLAR).toFixed(2)}
                </p>
              </div>
            </GlowCard>

            <p className="text-muted-foreground/60 text-sm mt-6">
              Redirecting to your profile...
            </p>
          </div>
        </main>
      </div>
    );
  }

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
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-6">
        {/* Page Title */}
        <div className="flex justify-center">
          <SectionHeader title="Load Credits" align="center" framed />
        </div>

        <p className="text-muted-foreground text-center text-sm">
          Pay as you go. Each stream uses 1 credit.
        </p>

        {/* Credits Input */}
        <GlowCard glowColor="gradient" hover={false}>
          <div className="p-5 space-y-4">
            <Label
              htmlFor="credits"
              className="text-xs uppercase tracking-wider text-muted-foreground"
            >
              Credits to Load
            </Label>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => adjustCredits(-5)}
                disabled={credits <= 0}
                className="shrink-0"
              >
                <Minus className="w-4 h-4" />
              </Button>

              <Input
                id="credits"
                type="number"
                min={0}
                step={1}
                value={credits}
                onChange={(e) => handleCreditsChange(e.target.value)}
                className="text-center text-2xl font-display font-bold h-14 bg-background border-border"
              />

              <Button
                variant="secondary"
                size="icon"
                onClick={() => adjustCredits(5)}
                className="shrink-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Live Conversion */}
            <p className="text-center text-muted-foreground text-sm">
              <span className="text-foreground font-semibold">{credits} credits</span>
              {" = "}
              <span className="text-accent font-semibold">${dollars.toFixed(2)}</span>
            </p>

            {credits < MIN_CREDITS && credits > 0 && (
              <p className="text-center text-destructive text-xs">
                Minimum: {MIN_CREDITS} credits (${(MIN_CREDITS * CREDIT_TO_DOLLAR).toFixed(2)})
              </p>
            )}
          </div>
        </GlowCard>

        {/* Quick Select Chips */}
        <div className="flex flex-wrap justify-center gap-2">
          {quickOptions.map(({ credits: amt, dollars: dollarAmt }) => (
            <button
              key={amt}
              onClick={() => setCredits(amt)}
              className={`relative px-4 py-2 rounded-full text-xs font-display uppercase tracking-wider transition-all duration-200 active:scale-95 hover:-translate-y-0.5 group ${
                credits === amt ? "ring-2 ring-accent" : ""
              }`}
            >
              {/* Gradient border */}
              <span
                className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-purple-500 to-pink-500 opacity-60 group-hover:opacity-90 transition-opacity"
                aria-hidden="true"
              />
              {/* Soft glow */}
              <span
                className="absolute -inset-[1px] rounded-full bg-gradient-to-r from-primary via-purple-500 to-pink-500 blur-sm opacity-0 group-hover:opacity-40 transition-opacity"
                aria-hidden="true"
              />
              {/* Inner content */}
              <span className="relative flex items-center gap-2 bg-card rounded-full px-4 py-2 -m-[1px]">
                <span className="text-foreground font-semibold">+{amt}</span>
                <span className="text-muted-foreground/70 text-[10px]">
                  ${dollarAmt.toFixed(2)}
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* Payment Method Info */}
        <GlowCard glowColor="gradient" hover={false}>
          <div className="p-5">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
              Payment Method
            </h3>
            <div className="h-16 flex items-center justify-center border border-border/50 rounded-lg bg-muted/20">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="32" height="32" rx="6" fill="#635BFF"/>
                  <path d="M15.024 13.356c0-.656.536-.908 1.424-.908.896 0 2.032.272 2.928.756v-2.772c-.98-.388-1.944-.544-2.928-.544-2.392 0-3.984 1.252-3.984 3.344 0 3.264 4.492 2.744 4.492 4.152 0 .776-.676 1.028-1.62 1.028-1.4 0-2.688-.576-3.584-1.356v2.804c1.22.524 2.456.748 3.584.748 2.452 0 4.136-1.212 4.136-3.34-.016-3.52-4.448-2.896-4.448-3.912z" fill="white"/>
                </svg>
                <span>Secure checkout via Stripe</span>
              </div>
            </div>
          </div>
        </GlowCard>

        {/* Order Summary */}
        <GlowCard glowColor="gradient" hover={false}>
          <div className="p-5">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
              Order Summary
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Credits</span>
                <span className="text-foreground font-display font-semibold">
                  {credits} credits
                </span>
              </div>

              <div className="border-t border-border/30 pt-3 flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Total</span>
                <span className="text-2xl font-bold text-accent">
                  ${dollars.toFixed(2)}
                </span>
              </div>
            </div>

            <p className="text-muted-foreground/50 text-[10px] text-center mt-4">
              1 credit = $0.20
            </p>
          </div>
        </GlowCard>

        {/* CTA Button */}
        <Button
          onClick={handlePayment}
          disabled={isProcessing || credits < MIN_CREDITS || authLoading || !user}
          className="w-full"
          variant="primary"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Redirecting to Checkout...
            </>
          ) : authLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Coins className="w-4 h-4 mr-2" />
              Pay ${dollars.toFixed(2)} with Stripe
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground/50 text-center">
          No subscription. Secure payment powered by Stripe.
        </p>
      </main>
    </div>
  );
};

export default LoadCredits;
