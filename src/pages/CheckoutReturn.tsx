import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";

const CheckoutReturn = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sessionId = searchParams.get("session_id");
  const credits = searchParams.get("credits");

  const dashboardUrl = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("payment", "success");
    if (credits) qs.set("credits", credits);
    return `/fan/dashboard?${qs.toString()}`;
  }, [credits]);

  useEffect(() => {
    const run = async () => {
      if (!sessionId) {
        setStatus("error");
        setErrorMessage("Missing Stripe session id in return URL.");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("verify-checkout", {
          body: { sessionId },
        });

        if (error) {
          setStatus("error");
          setErrorMessage(error.message || "Failed to verify checkout.");
          return;
        }

        if (!data?.success) {
          setStatus("error");
          setErrorMessage(data?.error || "Payment verification failed.");
          return;
        }

        setStatus("success");

        // Redirect into the app after we’ve written credits.
        // If the user isn’t logged in, the protected dashboard will route them to /login,
        // but credits will already be in the database for their email.
        setTimeout(() => navigate(dashboardUrl, { replace: true }), 700);
      } catch (e) {
        setStatus("error");
        setErrorMessage(e instanceof Error ? e.message : "Unknown error");
      }
    };

    run();
  }, [navigate, sessionId, dashboardUrl]);

  return (
    <div className="min-h-screen bg-background flex flex-col px-4 py-10">
      <main className="w-full max-w-md mx-auto flex-1 flex items-center">
        <div className="w-full space-y-6">
          <div className="text-center">
            <SectionHeader title="Finalizing your purchase" align="center" framed />
          </div>

          <GlowCard glowColor="primary" hover={false}>
            <div className="p-6 text-center space-y-3">
              {status === "loading" && (
                <>
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Verifying your payment and updating your wallet…
                  </p>
                </>
              )}

              {status === "success" && (
                <>
                  <CheckCircle2 className="w-10 h-10 mx-auto text-primary" />
                  <p className="text-sm text-foreground font-medium">Payment verified.</p>
                  <p className="text-sm text-muted-foreground">Sending you back to your dashboard…</p>
                </>
              )}

              {status === "error" && (
                <>
                  <AlertTriangle className="w-10 h-10 mx-auto text-destructive" />
                  <p className="text-sm text-foreground font-medium">We couldn’t verify the payment.</p>
                  {errorMessage && (
                    <p className="text-xs text-muted-foreground break-words">{errorMessage}</p>
                  )}
                </>
              )}
            </div>
          </GlowCard>

          {status === "error" && (
            <div className="space-y-2">
              <Button className="w-full" onClick={() => navigate("/fan/payment")}>Go to Payments</Button>
              <Button className="w-full" variant="outline" onClick={() => navigate("/login")}>Log in</Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CheckoutReturn;
