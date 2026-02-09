import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, LogOut, Sparkles } from "lucide-react";
import WalletBalanceCard from "@/components/WalletBalanceCard";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FanDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { refetch } = useCredits();
  const [isVerifying, setIsVerifying] = useState(false);

  // Handle payment success redirect - verify with Stripe and update credits
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const creditsAdded = searchParams.get("credits");
    const sessionId = searchParams.get("session_id");
    
    if (paymentStatus === "success" && sessionId && !isVerifying) {
      setIsVerifying(true);
      
      // Clear URL params first to prevent re-triggering
      setSearchParams({}, { replace: true });
      
      // Call verify-checkout to update credits immediately
      const verifyCheckout = async () => {
        try {
          console.log("[FanDashboard] Verifying checkout session:", sessionId);
          
          const { data, error } = await supabase.functions.invoke("verify-checkout", {
            body: { sessionId },
          });
          
          if (error) {
            console.error("[FanDashboard] Verify error:", error);
            toast.error("Failed to verify payment. Credits may appear shortly.");
          } else if (data?.success) {
            console.log("[FanDashboard] Verification successful:", data);
            // Refetch credits to update UI
            await refetch();
            toast.success(
              creditsAdded 
                ? `Payment successful! ${creditsAdded} credits added.`
                : "Payment successful! Credits added to your wallet."
            );
          } else {
            console.error("[FanDashboard] Verification failed:", data);
            toast.error(data?.error || "Payment verification failed.");
          }
        } catch (err) {
          console.error("[FanDashboard] Verification exception:", err);
          toast.info("Payment successful! Credits should appear shortly.");
        } finally {
          setIsVerifying(false);
        }
      };
      
      verifyCheckout();
    }
  }, [searchParams, setSearchParams, refetch, isVerifying]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to log out");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-4 py-6">
      {/* Navigation Header */}
      <header className="w-full max-w-md mx-auto mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">Back</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">Log Out</span>
        </button>
      </header>

      <div className="flex-1 w-full max-w-md mx-auto space-y-6">
        {/* Vault Status Header */}
        <section className="text-center animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 
              className="font-display text-xl md:text-2xl uppercase tracking-[0.1em] text-foreground"
              style={{
                textShadow: "0 0 20px rgba(0, 255, 255, 0.4), 0 0 40px rgba(0, 255, 255, 0.2)"
              }}
            >
              You're Inside the Vault
            </h1>
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <StatusBadge variant="vault" size="default">
            Vault Access Active
          </StatusBadge>
        </section>

        {/* Wallet Balance Card */}
        <section className="animate-fade-in" style={{ animationDelay: "100ms" }}>
          <WalletBalanceCard />
        </section>

        {/* Discovery CTA */}
        <section className="animate-fade-in" style={{ animationDelay: "200ms" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 
              className="font-display text-sm uppercase tracking-wider text-foreground"
              style={{
                textShadow: "0 0 15px rgba(255, 255, 255, 0.2)"
              }}
            >
              Discover Exclusive Music
            </h2>
          </div>
          
          <Button 
            variant="secondary" 
            size="lg" 
            className="w-full"
            onClick={() => navigate("/discovery")}
          >
            Explore All Music
          </Button>
        </section>
      </div>
    </div>
  );
};

export default FanDashboard;
