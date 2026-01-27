import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Home, Crown, Loader2, Zap, Star, Users, Gift, Sparkles } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LocationState {
  email?: string;
  name?: string;
  flow?: "superfan" | "vault";
}

const Subscribe = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = location.state as LocationState | null;
  const { addCredits, refetch } = useCredits();
  const { user } = useAuth();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const superfanPerks = [
    { icon: Zap, text: "25 listening credits included each month" },
    { icon: Crown, text: "Guaranteed access to Music Exclusive" },
    { icon: Star, text: "Early access to exclusive music" },
    { icon: Sparkles, text: "Superfan status badge" },
    { icon: Users, text: "Monthly friend bypass" },
    { icon: Gift, text: "Priority access to new drops" },
  ];

  // Check for payment success from URL params
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      // Add 25 credits for superfan subscription
      addCredits(25).then(() => {
        refetch();
        setIsComplete(true);
        toast.success("Subscription activated! 25 credits added.");
      });
    } else if (paymentStatus === "cancelled") {
      toast.info("Subscription cancelled.");
    }
  }, [searchParams, addCredits, refetch]);

  const handleSubscribe = async () => {
    const email = user?.email || state?.email;
    if (!email) {
      toast.error("Please log in to subscribe");
      return;
    }

    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("create-subscription-checkout", {
        body: {
          email,
          successUrl: `${window.location.origin}/subscribe?payment=success`,
          cancelUrl: `${window.location.origin}/subscribe?payment=cancelled`,
        },
      });

      if (error) {
        console.error("Subscription checkout error:", error);
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
      console.error("Subscription error:", err);
      toast.error("Something went wrong. Please try again.");
      setIsProcessing(false);
    }
  };

  // After subscription completes, go to dashboard (agreements already signed)
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        navigate("/fan/dashboard", { replace: true });
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
              <div 
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary mb-4"
                style={{ boxShadow: '0 0 40px rgba(138, 43, 226, 0.4)' }}
              >
                <Crown className="w-10 h-10" />
              </div>
            </div>

            <SectionHeader title="Welcome, Superfan!" align="center" framed />

            <p className="text-muted-foreground mt-6 mb-2">
              Your subscription is now active.
            </p>

            {/* Status Card */}
            <GlowCard glowColor="gradient" hover={false} className="mt-8">
              <div className="p-6 text-center">
                <p className="text-muted-foreground/70 text-xs uppercase tracking-wider mb-2">
                  Your Status
                </p>
                <p
                  className="text-2xl font-bold font-display uppercase tracking-wider text-foreground mb-3"
                  style={{ textShadow: "0 0 20px rgba(138, 43, 226, 0.5)" }}
                >
                  Superfan
                </p>
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm">25 credits added to your wallet</span>
                </div>
              </div>
            </GlowCard>

            <p className="text-muted-foreground/60 text-sm mt-6">
              Redirecting...
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
          <SectionHeader title="Become a Superfan" align="center" framed />
        </div>

        {/* Plan Summary */}
        <GlowCard glowColor="gradient" hover={false}>
          <div className="p-6">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div 
                className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center"
                style={{ boxShadow: '0 0 30px rgba(138, 43, 226, 0.3)' }}
              >
                <Crown className="w-7 h-7 text-primary" />
              </div>
            </div>

            {/* Title & Price */}
            <h3 
              className="text-xl font-display uppercase tracking-wider text-center mb-1 text-foreground"
              style={{ textShadow: '0 0 15px rgba(138, 43, 226, 0.4)' }}
            >
              Superfan
            </h3>
            <div className="text-center mb-4">
              <span className="text-3xl font-display text-foreground">$5</span>
              <span className="text-muted-foreground text-sm"> / month</span>
            </div>

            {/* Benefits */}
            <ul className="space-y-2">
              {superfanPerks.map(({ icon: Icon, text }, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-muted-foreground text-sm">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </GlowCard>

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
                <span className="text-muted-foreground text-sm">Superfan subscription</span>
                <span className="text-foreground font-display font-semibold">
                  $5.00/mo
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Included credits</span>
                <span className="text-primary font-display font-semibold">
                  25 credits
                </span>
              </div>

              <div className="border-t border-border/30 pt-3 flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Due today</span>
                <span className="text-2xl font-bold text-accent">
                  $5.00
                </span>
              </div>
            </div>
          </div>
        </GlowCard>

        {/* CTA Button */}
        <Button
          onClick={handleSubscribe}
          disabled={isProcessing}
          className="w-full"
          variant="primary"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Redirecting to Checkout...
            </>
          ) : (
            <>
              <Crown className="w-4 h-4 mr-2" />
              Subscribe $5/month
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground/50 text-center">
          Cancel anytime. Secure payment powered by Stripe.
        </p>
      </main>
    </div>
  );
};

export default Subscribe;
