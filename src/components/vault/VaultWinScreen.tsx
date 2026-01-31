import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Unlock, Sparkles, Copy, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import vaultPortal from "@/assets/vault-portal.png";

interface VaultWinScreenProps {
  vaultCode: string;
  email: string;
  name: string;
}

export const VaultWinScreen = ({ vaultCode, email, name }: VaultWinScreenProps) => {
  const navigate = useNavigate();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(vaultCode);
      setIsCopied(true);
      toast.success("Code copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const handleContinue = () => {
    // Navigate to fan agreements with state preserved
    navigate("/fan/agreements", { 
      state: { 
        email, 
        name, 
        vaultCode,
        flow: "vault" 
      } 
    });
  };

  return (
    <div className="flex flex-col items-center text-center animate-fade-in">
      {/* Vault Portal with intense glow - "opening" effect */}
      <div className="relative mb-6">
        {/* Outer glow rings */}
        <div className="absolute inset-[-20px] bg-primary/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute inset-[-10px] bg-gradient-to-r from-primary via-purple-500 to-primary rounded-full blur-xl opacity-60 animate-pulse" />

        <div className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
          <img
            src={vaultPortal}
            alt="Vault Portal Open"
            className="w-full h-full object-contain drop-shadow-[0_0_30px_hsl(var(--primary))]"
          />
          <Unlock className="absolute w-10 h-10 text-primary drop-shadow-[0_0_15px_hsl(var(--primary))] animate-pulse" />
        </div>

        {/* Sparkle effects */}
        <Sparkles className="absolute top-0 right-0 w-6 h-6 text-primary/80 animate-pulse" />
        <Sparkles className="absolute bottom-4 left-0 w-5 h-5 text-purple-400/80 animate-pulse delay-150" />
        <Sparkles className="absolute top-8 left-2 w-4 h-4 text-pink-400/70 animate-pulse delay-300" />
      </div>

      {/* Header with emoji and strong glow */}
      <h1
        className="font-display text-xl md:text-2xl uppercase tracking-[0.1em] text-foreground mb-2"
        style={{
          textShadow:
            "0 0 30px rgba(0, 255, 255, 0.5), 0 0 60px rgba(0, 255, 255, 0.3), 0 0 90px rgba(128, 0, 255, 0.2)",
        }}
      >
        CONGRATULATIONS 🎉 YOU'RE IN!
      </h1>

      {/* Subheadline */}
      <p className="font-display text-base md:text-lg text-primary uppercase tracking-wider mb-4">
        The Vault just opened for you 🔓
      </p>

      {/* Body Copy */}
      <div className="text-muted-foreground font-body text-sm md:text-base max-w-sm mb-5 space-y-2">
        <p>
          This is your chance to hear <span className="text-primary font-medium">exclusive music</span> before the world does.
        </p>
        <p className="text-muted-foreground/80 text-sm">
          Your Vault Code is below — we also emailed it to you.
        </p>
      </div>

      {/* Glowing Divider */}
      <div className="w-full max-w-[200px] h-px mb-5 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      {/* Vault Code Display Box */}
      <div className="w-full max-w-xs mb-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Your Vault Code
        </p>
        <div className="relative">
          {/* Outer glow */}
          <div 
            className="absolute -inset-[3px] rounded-xl bg-gradient-to-r from-primary via-purple-500 to-pink-500 opacity-50 blur-lg"
            aria-hidden="true"
          />
          {/* Gradient border */}
          <div 
            className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-primary via-purple-500 to-pink-500"
            aria-hidden="true"
          />
          {/* Code container */}
          <div className="relative rounded-xl bg-background p-5">
            <p 
              className="text-2xl md:text-3xl font-display font-bold tracking-[0.3em] text-foreground select-all"
              style={{
                textShadow: "0 0 20px rgba(0, 212, 255, 0.5), 0 0 40px rgba(139, 92, 246, 0.3)",
              }}
            >
              {vaultCode}
            </p>
          </div>
        </div>
      </div>

      {/* Copy Code Button */}
      <Button
        variant="outline"
        size="lg"
        className="w-full max-w-xs mb-4"
        onClick={handleCopyCode}
      >
        {isCopied ? (
          <>
            <Check className="mr-2 h-5 w-5 text-green-500" />
            COPIED!
          </>
        ) : (
          <>
            <Copy className="mr-2 h-5 w-5" />
            COPY CODE
          </>
        )}
      </Button>

      {/* Primary CTA - Continue to Agreements */}
      <Button
        size="lg"
        className="w-full max-w-xs"
        onClick={handleContinue}
      >
        CONTINUE TO AGREEMENTS
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );
};
