import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";

interface WalletBalanceCardProps {
  credits: number;
}

const CREDIT_TO_DOLLAR = 0.20;

const WalletBalanceCard = ({ credits }: WalletBalanceCardProps) => {
  const navigate = useNavigate();
  const [showDollars, setShowDollars] = useState(false);

  const dollars = credits * CREDIT_TO_DOLLAR;

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
          onClick={() => navigate("/fan/payment")}
        >
          <Plus className="w-4 h-4" />
          Add Credits
        </Button>

        {/* Helper Text */}
        <p className="text-muted-foreground/60 text-[11px]">
          Credits are used for listening. 1 credit = $0.20.
        </p>
      </div>
    </GlowCard>
  );
};

export default WalletBalanceCard;
