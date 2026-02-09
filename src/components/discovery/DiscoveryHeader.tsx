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
    <>
      {/* Navigation */}
      <header className="w-full max-w-2xl mx-auto mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">Back</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">Log Out</span>
        </button>
      </header>

      {/* Page Title with Vault Glow */}
      <section className="relative text-center mb-8 animate-fade-in">
        {/* Vault glow background (static) */}
        <div 
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.15) 0%, transparent 60%)",
            filter: "blur(40px)",
          }}
        />
        <div 
          className="absolute inset-0 -z-10 opacity-40"
          style={{
            background: "radial-gradient(ellipse at center, hsl(var(--accent) / 0.1) 0%, transparent 50%)",
            filter: "blur(60px)",
          }}
        />

        <h1 
          className="font-display text-2xl md:text-3xl uppercase tracking-[0.1em] text-foreground font-bold mb-2"
          style={{
            textShadow: "0 0 30px hsl(var(--primary) / 0.4), 0 0 60px hsl(var(--primary) / 0.2)"
          }}
        >
          Discover Exclusive Drops
        </h1>
        <p className="text-muted-foreground font-display text-sm uppercase tracking-wider">
          New music lives here first.
        </p>
      </section>
    </>
  );
};
