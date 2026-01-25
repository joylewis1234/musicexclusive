import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Home, Crown, Coins, Loader2, CheckCircle2 } from "lucide-react";

interface LocationState {
  accessType?: "superfan" | "credits";
}

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  
  const accessType = state?.accessType || "credits";
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const planDetails = {
    superfan: {
      title: "Superfan Membership",
      description: "Monthly subscription with guaranteed access and perks",
      price: "$5.00",
      period: "/month",
      icon: Crown,
      iconColor: "text-primary",
      iconBg: "bg-primary/20",
    },
    credits: {
      title: "Credit Bundle",
      description: "One-time purchase of listening credits",
      price: "$5.00",
      period: "one-time",
      icon: Coins,
      iconColor: "text-accent",
      iconBg: "bg-accent/20",
    },
  };

  const plan = planDetails[accessType];
  const Icon = plan.icon;

  const handlePayment = async () => {
    setIsProcessing(true);
    
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setIsProcessing(false);
    setIsComplete(true);
  };

  const handleGoToProfile = () => {
    navigate("/fan/profile", { 
      state: { 
        accessType,
        balance: accessType === "credits" ? 5.00 : null,
        isSuperfan: accessType === "superfan",
      } 
    });
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

            <SectionHeader 
              title="Payment Complete" 
              align="center" 
              framed 
            />

            <p className="text-muted-foreground mt-6 mb-2">
              {accessType === "superfan" 
                ? "Welcome to the Superfan experience!"
                : "Your credits have been loaded!"}
            </p>

            <GlowCard glowColor="primary" hover={false} className="mt-8">
              <div className="p-6 text-center">
                <div className={`inline-flex items-center justify-center p-3 rounded-full ${plan.iconBg} ${plan.iconColor} mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-display uppercase tracking-wider text-foreground mb-1">
                  {accessType === "superfan" ? "Superfan Status" : "Credit Balance"}
                </h3>
                <p className="text-3xl font-bold text-primary">
                  {accessType === "superfan" ? "Active" : "$5.00"}
                </p>
              </div>
            </GlowCard>

            <Button
              onClick={handleGoToProfile}
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
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Framed Header */}
          <div className="flex justify-center mb-8">
            <SectionHeader 
              title="Complete Payment" 
              align="center" 
              framed 
            />
          </div>

          {/* Order Summary */}
          <GlowCard glowColor="gradient" hover={false} className="mb-6">
            <div className="p-6">
              <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-4">
                Order Summary
              </h3>
              
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${plan.iconBg} ${plan.iconColor}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="text-foreground font-display uppercase tracking-wider">
                    {plan.title}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.description}
                  </p>
                </div>
              </div>

              <div className="border-t border-border/50 mt-6 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground ml-1">{plan.period}</span>
                  </div>
                </div>
              </div>
            </div>
          </GlowCard>

          {/* Payment Form Placeholder */}
          <GlowCard glowColor="gradient" hover={false} className="mb-8">
            <div className="p-6">
              <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-4">
                Payment Method
              </h3>
              <div className="h-32 flex items-center justify-center border border-dashed border-border/50 rounded-lg">
                <p className="text-muted-foreground text-sm text-center px-4">
                  Payment integration placeholder
                  <br />
                  <span className="text-xs">(Stripe integration coming soon)</span>
                </p>
              </div>
            </div>
          </GlowCard>

          {/* CTA Button */}
          <Button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full"
            variant="primary"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ${plan.price}`
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Secure payment powered by Stripe
          </p>
        </div>
      </main>
    </div>
  );
};

export default Payment;
