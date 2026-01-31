import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Copy, Check, Home, Crown } from "lucide-react";
import { toast } from "sonner";
import vaultPortal from "@/assets/vault-portal.png";

interface VaultLoseScreenProps {
  vaultCode: string;
  email: string;
  name: string;
}

export const VaultLoseScreen = ({ vaultCode, email, name }: VaultLoseScreenProps) => {
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

  return (
    <div className="flex flex-col items-center text-center animate-fade-in">
      {/* Vault Portal - soft hopeful glow */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-2xl animate-pulse" />
        <div className="relative w-28 h-28 md:w-36 md:h-36 flex items-center justify-center">
          <img
            src={vaultPortal}
            alt="Vault Portal"
            className="w-full h-full object-contain opacity-80 drop-shadow-[0_0_15px_rgba(139,92,246,0.4)]"
          />
          <Sparkles className="absolute w-8 h-8 text-purple-400/70 animate-pulse" />
        </div>
      </div>

      {/* Header with fire emoji - encouraging */}
      <h1
        className="font-display text-xl md:text-2xl uppercase tracking-[0.1em] text-foreground mb-4"
        style={{
          textShadow: "0 0 20px rgba(139, 92, 246, 0.4)",
        }}
      >
        Not this time… but you're getting closer 🔥
      </h1>

      {/* Body Copy */}
      <div className="text-muted-foreground font-body text-sm md:text-base max-w-sm mb-6 space-y-3">
        <p>
          No worries — you didn't unlock the Vault today.
        </p>
        <p>
          Your Vault Code is saved, and you're <span className="text-purple-400 font-medium">automatically entered into the next draw</span>.
        </p>
        <p className="text-muted-foreground/80 text-sm">
          Check your email — we sent your Vault Code and your next steps.
        </p>
      </div>

      {/* Glowing Divider */}
      <div className="w-full max-w-[200px] h-px mb-6 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

      {/* Vault Code Display Box */}
      <div className="w-full max-w-xs mb-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Your Vault Code
        </p>
        <div className="relative">
          {/* Outer glow */}
          <div 
            className="absolute -inset-[3px] rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 opacity-40 blur-lg"
            aria-hidden="true"
          />
          {/* Gradient border */}
          <div 
            className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500"
            aria-hidden="true"
          />
          {/* Code container */}
          <div className="relative rounded-xl bg-background p-5">
            <p 
              className="text-2xl md:text-3xl font-display font-bold tracking-[0.3em] text-foreground select-all"
              style={{
                textShadow: "0 0 15px rgba(139, 92, 246, 0.5), 0 0 30px rgba(139, 92, 246, 0.3)",
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

      {/* Return to Vault Home Button */}
      <Button
        size="lg"
        className="w-full max-w-xs mb-6"
        onClick={() => navigate("/vault/enter")}
      >
        <Home className="mr-2 h-5 w-5" />
        RETURN TO VAULT HOME
      </Button>

      {/* Glowing Divider */}
      <div className="w-full max-w-[200px] h-px mb-6 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* Superfan Upsell */}
      <div className="w-full max-w-xs p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/20">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Crown className="w-5 h-5 text-amber-400" />
          <p className="text-sm font-display uppercase tracking-wider text-amber-400">
            Want guaranteed access?
          </p>
        </div>
        <Button
          variant="outline"
          size="lg"
          className="w-full border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/10"
          onClick={() => navigate("/subscribe")}
        >
          BECOME A SUPERFAN
        </Button>
      </div>
    </div>
  );
};
