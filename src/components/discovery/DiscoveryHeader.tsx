import { useNavigate } from "react-router-dom";
import { ChevronLeft, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const DiscoveryHeader = () => {
  const navigate = useNavigate();

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
    <header className="w-full max-w-5xl mx-auto mb-6">
      {/* Top nav row */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-xs uppercase tracking-wider">Back</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-xs uppercase tracking-wider">Log Out</span>
        </button>
      </div>

      {/* Title */}
      <div className="mb-2">
        <h1
          className="font-display text-xl md:text-2xl uppercase tracking-[0.08em] text-foreground font-bold"
          style={{
            textShadow: "0 0 20px hsl(var(--primary) / 0.3)",
          }}
        >
          Discover
        </h1>
        <p className="text-muted-foreground text-xs uppercase tracking-wider mt-1">
          New music lives here first
        </p>
      </div>
    </header>
  );
};
