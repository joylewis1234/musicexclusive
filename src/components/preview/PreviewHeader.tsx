import { useNavigate } from "react-router-dom";
import { ChevronLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const PreviewHeader = () => {
  const navigate = useNavigate();

  return (
    <header className="w-full max-w-5xl mx-auto mb-6">
      {/* Top nav row */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-xs uppercase tracking-wider">Home</span>
        </button>
        <Button
          size="sm"
          onClick={() => navigate("/vault/enter")}
          className="text-xs"
        >
          <Lock className="w-3 h-3 mr-1.5" />
          Enter the Vault
        </Button>
      </div>

      {/* Title */}
      <div className="mb-2">
        <h1
          className="font-display text-xl md:text-2xl uppercase tracking-[0.08em] text-foreground font-bold"
          style={{
            textShadow: "0 0 20px hsl(var(--primary) / 0.3)",
          }}
        >
          Preview
        </h1>
        <p className="text-muted-foreground text-xs uppercase tracking-wider mt-1">
          15-second hooks — no sign-in required
        </p>
      </div>
    </header>
  );
};
