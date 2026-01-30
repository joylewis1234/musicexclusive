import { useNavigate } from "react-router-dom";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Home, Sparkles } from "lucide-react";
import WalletBalanceCard from "@/components/WalletBalanceCard";

const FanDashboard = () => {
  const navigate = useNavigate();

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
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">Home</span>
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
