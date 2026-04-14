import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Coins, Loader2, Wallet } from "lucide-react";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { PaymentErrorBoundary } from "@/components/error-boundaries";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CREDIT_TO_DOLLAR = 0.20;

function getAppBaseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://www.musicexclusive.co";
}

interface CreditOption {
  credits: number;
  dollars: number;
}

const QUICK_OPTIONS: CreditOption[] = [
  { credits: 25, dollars: 5 },
  { credits: 50, dollars: 10 },
  { credits: 100, dollars: 20 },
];

interface LocationState {
  topUpCredits?: number;
  flow?: string;
}

const AddCredits = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const { credits: currentBalance, refetch } = useCredits();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedOption, setSelectedOption] = useState<CreditOption | null>(null);

  // Pre-select the option matching the topUpCredits from navigation state
  const preselectedCredits = locationState?.topUpCredits ?? null;

  const handlePurchase = async (option: CreditOption) => {
    if (!user?.email) {
      toast.error("Please log in to purchase credits");
      return;
    }

    setIsProcessing(true);
    setSelectedOption(option);

    try {
      const base = getAppBaseUrl();
      const successUrl = `${base}/checkout/return?payment=success&credits=${option.credits}&return_to=%2Ffan%2Fprofile`;
      const cancelUrl = `${base}/fan/add-credits?payment=cancelled`;

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          credits: option.credits,
          email: user.email,
          successUrl,
          cancelUrl,
        },
      });

      if (error) {
        console.error("Checkout error:", error);
        toast.error(error.message || "Failed to start checkout. Please try again.");
        setIsProcessing(false);
        setSelectedOption(null);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to create checkout session");
        setIsProcessing(false);
        setSelectedOption(null);
      }
    } catch (err) {
      console.error("Purchase error:", err);
      toast.error("Something went wrong. Please try again.");
      setIsProcessing(false);
      setSelectedOption(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation Header */}
      <header className="p-4 flex items-center justify-between max-w-md mx-auto w-full">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">Back</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-6">
        {/* Page Title */}
        <div className="text-center space-y-2">
          <SectionHeader title="Add Credits" align="center" framed />
          <p className="text-muted-foreground text-sm">
            1 credit = <span className="text-primary font-semibold">$0.20</span> per stream
          </p>
        </div>

        {/* Current Balance Card */}
        <GlowCard glowColor="primary" hover={false}>
          <div className="p-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-primary" />
              <p className="text-muted-foreground/70 text-xs uppercase tracking-wider">
                Current Balance
              </p>
            </div>
            <p
              className="text-4xl font-bold font-display text-foreground"
              style={{ textShadow: "0 0 30px hsla(280, 80%, 50%, 0.3)" }}
            >
              {currentBalance}
            </p>
            <p className="text-muted-foreground/60 text-sm mt-1">
              ≈ ${(currentBalance * CREDIT_TO_DOLLAR).toFixed(2)}
            </p>
          </div>
        </GlowCard>

        {/* Quick Purchase Options - wrapped in error boundary */}
        <PaymentErrorBoundary onBack={() => navigate(-1)}>
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground text-center">
              Quick Add
            </h3>

            <div className="grid gap-3">
              {QUICK_OPTIONS.map((option) => {
                const isSelected = selectedOption?.credits === option.credits;
                const isPreselected = preselectedCredits === option.credits;
                const isLoading = isProcessing && isSelected;

                return (
                  <button
                    key={option.credits}
                    onClick={() => handlePurchase(option)}
                    disabled={isProcessing}
                    className={cn(
                      "relative group rounded-xl overflow-hidden transition-all duration-300",
                      "active:scale-[0.98] hover:-translate-y-0.5",
                      isProcessing && !isSelected && "opacity-50"
                    )}
                  >
                    {/* Glow border */}
                    <div
                      className={cn(
                        "absolute inset-0 rounded-xl transition-opacity duration-300",
                        "bg-gradient-to-r from-primary via-purple-500 to-pink-500",
                        isSelected ? "opacity-100" : isPreselected ? "opacity-80" : "opacity-40 group-hover:opacity-70"
                      )}
                      style={{
                        filter: isSelected ? "blur(4px)" : "blur(2px)"
                      }}
                    />

                    {/* Content */}
                    <div
                      className={cn(
                        "relative m-[1px] rounded-xl p-4",
                        "bg-card flex items-center justify-between"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{
                            background: "hsla(280, 80%, 50%, 0.15)",
                            border: "1px solid hsla(280, 80%, 50%, 0.3)"
                          }}
                        >
                          {isLoading ? (
                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                          ) : (
                            <Coins className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="text-left">
                          <p className="font-display font-semibold text-foreground">
                            +{option.credits} credits
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {option.credits} streams
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p
                          className="text-xl font-bold text-primary"
                          style={{ textShadow: "0 0 15px hsla(280, 80%, 50%, 0.4)" }}
                        >
                          ${option.dollars.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </PaymentErrorBoundary>

        {/* Info */}
        <div className="text-center space-y-1">
          <p className="text-xs text-muted-foreground/60">
            Credits never expire. Use them to stream exclusive music.
          </p>
        </div>

        {/* Back to Discovery */}
        <Button
          onClick={() => navigate("/discovery")}
          variant="outline"
          className="w-full rounded-xl"
        >
          Back to Discovery
        </Button>
      </main>
    </div>
  );
};

export default AddCredits;
