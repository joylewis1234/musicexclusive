import { useNavigate } from "react-router-dom";
import { ChevronLeft, Lock, Unlock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const PreviewHeader = () => {
  const navigate = useNavigate();

  return (
    <header className="w-full max-w-5xl mx-auto mb-8">
      {/* Top nav row */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-xs uppercase tracking-wider">Home</span>
        </button>
      </div>

      {/* Headline */}
      <div className="mb-6 text-center max-w-2xl mx-auto">
        <h1
          className="font-display text-xl md:text-2xl lg:text-3xl uppercase tracking-[0.06em] text-foreground font-bold leading-relaxed mb-6"
          style={{
            textShadow: "0 0 20px hsl(var(--primary) / 0.3)",
          }}
        >
          Discover the hottest emerging and exclusive artists. Unlock the full Music Exclusive experience to stream without limits.
        </h1>

        {/* CTAs */}
        <div className="flex flex-col items-center gap-3">
          {/* Vault Lottery */}
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/vault/enter")}
            className="w-full max-w-xs"
          >
            <Unlock className="w-4 h-4 mr-2" />
            Enter the Vault Lottery
          </Button>

          {/* Skip text */}
          <span className="text-[10px] uppercase tracking-[0.2em] text-primary/70 font-display mt-2">
            Skip the lottery — get access now
          </span>

          {/* Superfan */}
          <Button
            size="lg"
            variant="accent"
            onClick={() => navigate("/auth/fan", { state: { flow: "superfan" } })}
            className="w-full max-w-xs"
          >
            <Zap className="w-4 h-4 mr-2" />
            Become a Superfan
          </Button>
        </div>
      </div>
    </header>
  );
};
