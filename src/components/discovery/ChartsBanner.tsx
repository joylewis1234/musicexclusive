import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, X } from "lucide-react";

export const ChartsBanner = () => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative bg-card border-l-4 border-amber-400 rounded-lg p-4 flex items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3 min-w-0">
        <Trophy className="w-5 h-5 text-amber-400 flex-shrink-0" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Exclusive Charts</h3>
          <p className="text-xs text-muted-foreground truncate">See who's leading the charts this week</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-primary text-primary hover:bg-primary/10"
          onClick={() => navigate("/charts")}
        >
          View Charts
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
