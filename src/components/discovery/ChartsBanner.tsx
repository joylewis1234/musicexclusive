import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";

export const ChartsBanner = () => {
  const navigate = useNavigate();

  return (
    <div
      className="p-4 rounded-2xl flex items-center justify-between gap-4 mb-6"
      style={{
        background: "hsla(45, 90%, 55%, 0.06)",
        border: "1px solid hsla(45, 90%, 55%, 0.25)",
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "hsla(45, 90%, 55%, 0.15)" }}
        >
          <Trophy className="w-5 h-5" style={{ color: "hsl(45, 90%, 55%)" }} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Exclusive Charts</h3>
          <p className="text-xs text-muted-foreground truncate">See who's leading this year</p>
        </div>
      </div>
      <Button
        size="sm"
        className="rounded-full flex-shrink-0"
        style={{ background: "hsl(45, 90%, 50%)", color: "hsl(0, 0%, 0%)" }}
        onClick={() => navigate("/charts")}
      >
        View Charts
      </Button>
    </div>
  );
};
