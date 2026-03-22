import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/GlowCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Clock, Home, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const ArtistPendingActivation = () => {
  const navigate = useNavigate();
  const { user, refreshRole, setActiveRole } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  const handleRetry = async () => {
    if (!user) {
      navigate("/");
      return;
    }

    setIsChecking(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (accessToken) {
        try {
          await supabase.functions.invoke("finalize-artist-setup", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        } catch (finalizeErr) {
          console.warn("[ArtistPending] finalize-artist-setup retry error:", finalizeErr);
        }
      }
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "artist");

      if (roleRows && roleRows.length > 0) {
        await refreshRole();
        setActiveRole("artist");
        navigate("/artist/dashboard", { replace: true });
      } else {
        toast.info("Still activating. Please try again in a moment.");
        setIsChecking(false);
      }
    } catch {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <GlowCard className="max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Clock className="w-8 h-8 text-primary" />
        </div>

        <h1 className="text-xl font-display font-bold text-foreground mb-3">
          Your artist account is being activated.
        </h1>

        <p className="text-sm text-muted-foreground mb-8">
          This usually takes less than a minute. You can retry below or come back shortly.
        </p>

        <div className="flex flex-col gap-3">
          <Button onClick={handleRetry} disabled={isChecking} className="w-full">
            {isChecking ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking…
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </>
            )}
          </Button>

          <Button variant="outline" onClick={() => navigate("/")} className="w-full">
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </div>
      </GlowCard>
    </div>
  );
};

export default ArtistPendingActivation;
