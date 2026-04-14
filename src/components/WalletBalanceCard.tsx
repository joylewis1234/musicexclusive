import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2 } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";

const CREDIT_TO_DOLLAR = 0.20;

interface WalletBalanceCardProps {
  externalCredits?: number;
  externalLoading?: boolean;
}

const WalletBalanceCard = ({ externalCredits, externalLoading }: WalletBalanceCardProps = {}) => {
  const navigate = useNavigate();
  const { credits: hookCredits, loading: hookLoading } = useCredits();
  const credits = externalCredits !== undefined ? externalCredits : hookCredits;
  const loading = externalLoading !== undefined ? externalLoading : hookLoading;
  const [showDollars, setShowDollars] = useState(false);

  const dollars = credits * CREDIT_TO_DOLLAR;

  if (loading) {
    return (
      <GlowCard glowColor="primary" hover={false}>
        <div className="p-6 flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </GlowCard>
    );
  }

  return (
    <GlowCard glowColor="primary" hover={false}>
      <div className="p-6 text-center">
        {/* Title */}
        <p className="text-muted-foreground font-display text-xs uppercase tracking-wider mb-3">
          Listening Balance
        </p>

        {/* Primary Balance Display */}
        <div className="min-h-[72px] flex flex-col items-center justify-center mb-1">
          <p
            className="font-display text-4xl md:text-5xl font-bold text-foreground transition-all duration-300"
            style={{
              textShadow: "0 0 30px rgba(0, 255, 255, 0.3)",
            }}
          >
            {showDollars ? `$${dollars.toFixed(2)}` : `${credits} Credits`}
          </p>
        </div>

        {/* Secondary Balance (opposite unit) */}
        <p className="text-muted-foreground/70 text-sm mb-5">
          {showDollars ? `≈ ${credits} Credits` : `≈ $${dollars.toFixed(2)}`}
        </p>

        {/* Toggle Switch */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <span
            className={`font-display text-xs uppercase tracking-wider transition-colors duration-200 ${
              !showDollars ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Credits
          </span>
          <Switch
            checked={showDollars}
            onCheckedChange={setShowDollars}
            className="data-[state=checked]:bg-accent data-[state=unchecked]:bg-muted"
          />
          <span
            className={`font-display text-xs uppercase tracking-wider transition-colors duration-200 ${
              showDollars ? "text-accent" : "text-muted-foreground"
            }`}
          >
            $
          </span>
        </div>

        {/* CTA Button */}
        <Button
          variant="accent"
          size="sm"
          className="gap-2 mb-4"
          onClick={() => navigate("/fan/add-credits")}
        >
          <Plus className="w-4 h-4" />
          Add Credits
        </Button>

        {/* Quick Add Chips */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {[
            { credits: 25, dollars: 5 },
            { credits: 50, dollars: 10 },
            { credits: 100, dollars: 20 },
          ].map(({ credits: amt, dollars: dollarAmt }) => (
            <button
              key={amt}
              onClick={() =>
                navigate("/fan/add-credits", { state: { topUpCredits: amt } })
              }
              className="relative px-3 py-1.5 rounded-full text-xs font-display uppercase tracking-wider transition-all duration-200 active:scale-95 hover:-translate-y-0.5 group"
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
              <span className="relative flex flex-col items-center bg-card rounded-full px-3 py-1.5 -m-[1px]">
                <span className="text-foreground font-semibold">+{amt}</span>
                <span className="text-muted-foreground/70 text-[10px]">
                  ≈ ${dollarAmt.toFixed(2)}
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* Helper Text */}
        <p className="text-muted-foreground/60 text-[11px]">
          Credits are used for listening. 1 credit = $0.20.
        </p>
      </div>
    </GlowCard>
  );
};

export default WalletBalanceCard;
