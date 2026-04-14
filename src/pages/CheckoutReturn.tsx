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
  const [newCredits, setNewCredits] = useState<number | null>(null);

  const sessionId = searchParams.get("session_id");
  const credits = searchParams.get("credits");
  const requestedReturnPath = searchParams.get("return_to");

  const retryPath = useMemo(() => {
    const allowedPaths = new Set(["/subscribe", "/fan/add-credits"]);
    if (requestedReturnPath && allowedPaths.has(requestedReturnPath)) {
      return requestedReturnPath;
    }
    return "/fan/add-credits";
  }, [requestedReturnPath]);

  const profileUrl = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("payment", "success");
    if (credits) qs.set("credits", credits);
    return `/fan/profile?${qs.toString()}`;
  }, [credits]);


  useEffect(() => {
    const run = async () => {
      if (!sessionId) {
        setStatus("error");
        setErrorMessage("Missing Stripe session id in return URL.");
        return;
      }

      // If Stripe didn't replace the placeholder, the URL param will decode to "{CHECKOUT_SESSION_ID}".
      // That will always fail verification.
      if (sessionId.includes("CHECKOUT_SESSION_ID")) {
        setStatus("error");
        setErrorMessage(
          "Stripe did not return a valid session id. Please retry the purchase from inside the app (Fan → Add Credits)."
        );
        return;
      }

      try {
        console.log("[CheckoutReturn] Verifying session:", sessionId);
        
        const { data, error } = await supabase.functions.invoke("verify-checkout", {
          body: { sessionId },
        });

        console.log("[CheckoutReturn] Verification response:", { data, error });

        if (error) {
          setStatus("error");
          // supabase-js sometimes gives a generic message for non-2xx responses.
          // Try to extract the server error body if present.
          const maybeAny = error as unknown as { message?: string; context?: unknown };
          const ctx = maybeAny?.context as
            | { status?: number; body?: unknown; response?: { status?: number } }
            | undefined;
          const bodyError =
            typeof ctx?.body === "object" && ctx?.body && "error" in (ctx.body as Record<string, unknown>)
              ? String((ctx.body as Record<string, unknown>).error)
              : null;
          setErrorMessage(bodyError || maybeAny?.message || "Failed to verify checkout.");
          return;
        }

        if (!data?.success) {
          setStatus("error");
          setErrorMessage(data?.error || "Payment verification failed.");
          return;
        }

        // Store the new credits balance from verification
        if (data.credits !== undefined) {
          setNewCredits(data.credits);
        }

        setStatus("success");

        // Redirect into the app after we've verified and written credits.
        // Use a slightly longer delay to ensure the database write has propagated.
        setTimeout(() => {
          // Try to navigate to profile first (user's preferred destination), fall back to dashboard
          navigate(profileUrl, { replace: true });
        }, 1200);
      } catch (e) {
        console.error("[CheckoutReturn] Verification error:", e);
        setStatus("error");
        setErrorMessage(e instanceof Error ? e.message : "Unknown error");
      }
    };

    run();
  }, [navigate, sessionId, profileUrl]);

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
                  <p className="text-sm text-foreground font-medium">Payment verified!</p>
                  {newCredits !== null && (
                    <p className="text-lg font-bold text-primary">
                      Your new balance: {newCredits} credits
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">Sending you back to your profile…</p>
                </>
              )}

              {status === "error" && (
                <>
                  <AlertTriangle className="w-10 h-10 mx-auto text-destructive" />
                  <p className="text-sm text-foreground font-medium">We couldn't verify the payment.</p>
                  {errorMessage && (
                    <p className="text-xs text-muted-foreground break-words">{errorMessage}</p>
                  )}
                </>
              )}
            </div>
          </GlowCard>

          {status === "error" && (
            <div className="space-y-2">
              <Button className="w-full" onClick={() => navigate(retryPath)}>Try Again</Button>
              <Button className="w-full" variant="outline" onClick={() => navigate("/fan/profile")}>Go to Profile</Button>
              <Button className="w-full" variant="ghost" onClick={() => navigate("/login")}>Log in</Button>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-2">
              <Button className="w-full" onClick={() => navigate(profileUrl, { replace: true })}>
                Go to Profile Now
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CheckoutReturn;
