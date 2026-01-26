import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Home, Coins, Loader2, CheckCircle2, Plus, Minus } from "lucide-react";

interface LocationState {
  topUpCredits?: number;
}

const CREDIT_TO_DOLLAR = 0.20;
const MIN_CREDITS = 25;
const DEFAULT_CREDITS = 25;

// Mock current balance - in production this would come from user data
const CURRENT_BALANCE_CREDITS = 40;

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [credits, setCredits] = useState<number>(
    state?.topUpCredits || DEFAULT_CREDITS
  );
  const [currentBalance] = useState(CURRENT_BALANCE_CREDITS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [newBalance, setNewBalance] = useState(0);

  const dollars = credits * CREDIT_TO_DOLLAR;
  const afterTopUpCredits = currentBalance + credits;
  const afterTopUpDollars = afterTopUpCredits * CREDIT_TO_DOLLAR;
  const currentBalanceDollars = currentBalance * CREDIT_TO_DOLLAR;

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

    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setNewBalance(currentBalance + credits);
    setIsProcessing(false);
    setIsComplete(true);
  };

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

            <SectionHeader title="Credits Added" align="center" framed />

            <p className="text-muted-foreground mt-6 mb-2">
              Your credits have been loaded!
            </p>

            {/* Updated Balance Card */}
            <GlowCard glowColor="primary" hover={false} className="mt-8">
              <div className="p-6 text-center">
                <p className="text-muted-foreground/70 text-xs uppercase tracking-wider mb-2">
                  New Balance
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
                <p className="text-primary text-xs mt-3">Balance updated.</p>
              </div>
            </GlowCard>

            <Button
              onClick={() => navigate("/fan/profile")}
              className="w-full mt-8"
              variant="primary"
              size="lg"
            >
              Go to My Profile
            </Button>
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
          <SectionHeader title="Add Credits" align="center" framed />
        </div>

        {/* Current Balance & After Top-Up Preview */}
        <GlowCard glowColor="primary" hover={false}>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4">
              {/* Current Balance */}
              <div className="text-center">
                <p className="text-muted-foreground/70 text-[10px] uppercase tracking-wider mb-1">
                  Current Balance
                </p>
                <p
                  className="text-2xl font-bold font-display text-foreground"
                  style={{ textShadow: "0 0 20px rgba(0, 255, 255, 0.2)" }}
                >
                  {currentBalance}
                </p>
                <p className="text-muted-foreground/60 text-xs">
                  ≈ ${currentBalanceDollars.toFixed(2)}
                </p>
              </div>

              {/* After Top-Up */}
              <div className="text-center border-l border-border/30 pl-4">
                <p className="text-muted-foreground/70 text-[10px] uppercase tracking-wider mb-1">
                  After Top-Up
                </p>
                <p
                  className="text-2xl font-bold font-display text-primary"
                  style={{ textShadow: "0 0 20px rgba(0, 255, 255, 0.3)" }}
                >
                  {afterTopUpCredits}
                </p>
                <p className="text-muted-foreground/60 text-xs">
                  ≈ ${afterTopUpDollars.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </GlowCard>

        {/* Credits Input */}
        <GlowCard glowColor="gradient" hover={false}>
          <div className="p-5 space-y-4">
            <Label
              htmlFor="credits"
              className="text-xs uppercase tracking-wider text-muted-foreground"
            >
              Credits to Add
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
                Minimum top-up: {MIN_CREDITS} credits (${(MIN_CREDITS * CREDIT_TO_DOLLAR).toFixed(2)})
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
                  ≈ ${dollarAmt.toFixed(2)}
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* Payment Summary */}
        <GlowCard glowColor="gradient" hover={false}>
          <div className="p-5">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
              Payment Summary
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">You're adding</span>
                <span className="text-foreground font-display font-semibold">
                  {credits} credits
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Equivalent</span>
                <span className="text-foreground font-display font-semibold">
                  ${dollars.toFixed(2)}
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

        {/* Payment Placeholder */}
        <GlowCard glowColor="gradient" hover={false}>
          <div className="p-5">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
              Payment Method
            </h3>
            <div className="h-20 flex items-center justify-center border border-dashed border-border/50 rounded-lg">
              <p className="text-muted-foreground/60 text-xs text-center">
                Stripe integration coming soon
              </p>
            </div>
          </div>
        </GlowCard>

        {/* CTA Button */}
        <Button
          onClick={handlePayment}
          disabled={isProcessing || credits < MIN_CREDITS}
          className="w-full"
          variant="accent"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Coins className="w-4 h-4 mr-2" />
              Pay & Add Credits
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground/50 text-center">
          Secure payment powered by Stripe
        </p>
      </main>
    </div>
  );
};

export default Payment;
