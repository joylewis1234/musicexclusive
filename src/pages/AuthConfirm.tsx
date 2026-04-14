import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { completeSignupVerification, type SignupIntent } from "@/lib/signupVerification";
import { useAuth } from "@/contexts/AuthContext";

type ConfirmState = "verifying" | "error";

function getHashParams() {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;

  return new URLSearchParams(hash);
}

const AuthConfirm = () => {
  const navigate = useNavigate();
  const { refreshRole, setActiveRole } = useAuth();
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const hashParams = useMemo(() => getHashParams(), []);
  const intent = (searchParams.get("intent") || "fan") as SignupIntent;
  const [state, setState] = useState<ConfirmState>("verifying");
  const [message, setMessage] = useState("Verifying your email and signing you in…");

  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    let isMounted = true;

    const completeFlow = async () => {
      const displayName = searchParams.get("display_name") || undefined;
      const applicationId = searchParams.get("application_id") || undefined;
      const flow = searchParams.get("flow");
      const inviteToken = searchParams.get("invite_token") || undefined;
      const next = searchParams.get("next");

      try {
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const code = searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          throw new Error("This verification link is invalid or has expired.");
        }

        const completion = await completeSignupVerification({ intent, displayName });
        if (!completion.success) {
          throw new Error(completion.error || "We couldn't finish verifying your account.");
        }

        if (intent === "artist-setup") {
          const { data: finalizeData, error: finalizeError } = await supabase.functions.invoke("finalize-artist-setup", {
            body: applicationId ? { application_id: applicationId } : {},
          });

          if (finalizeError) {
            throw finalizeError;
          }

          if (!finalizeData?.success) {
            throw new Error(finalizeData?.message || "We verified your email, but couldn't finish artist setup.");
          }

          await refreshRole();
          setActiveRole("artist");
          navigate("/artist/dashboard", { replace: true });
          return;
        }

        if (intent === "artist-signup") {
          await refreshRole();
          setActiveRole("artist");
          navigate(next && next.startsWith("/") ? next : "/artist/profile", { replace: true });
          return;
        }

        await refreshRole();
        setActiveRole("fan");

        if (inviteToken) {
          await supabase.functions.invoke("validate-fan-invite", {
            body: { token: inviteToken, action: "consume" },
          }).catch(() => {});
        }

        if (flow === "superfan") {
          navigate("/subscribe", { replace: true });
          return;
        }

        if (flow === "invite") {
          navigate("/fan/agreements", { replace: true, state: { invite_token: inviteToken } });
          return;
        }

        navigate(next && next.startsWith("/") ? next : "/fan/profile", { replace: true });
      } catch (error) {
        console.error("[AuthConfirm] verification failed:", error);
        if (!isMounted) return;
        setMessage(error instanceof Error ? error.message : "This verification link is invalid or has expired.");
        setState("error");
      }
    };

    void completeFlow();

    return () => {
      isMounted = false;
    };
  }, [hashParams, navigate, refreshRole, searchParams, setActiveRole]);

  if (state === "verifying") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
          <div className="container max-w-lg mx-auto px-4 h-14 flex items-center">
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm uppercase tracking-wider">Back</span>
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-8">
          <GlowCard className="max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mb-3">
              Verifying Your Account
            </h1>
            <p className="text-muted-foreground">
              {message}
            </p>
          </GlowCard>
        </main>
      </div>
    );
  }

  const returnPath = intent === "artist-setup" ? "/artist/setup-account" : intent === "artist-signup" ? "/artist/login" : "/login";
  const helpPath = intent === "fan" ? "/forgot-password?type=fan" : "/forgot-password?type=artist";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-lg mx-auto px-4 h-14 flex items-center">
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm uppercase tracking-wider">Back</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-8">
        <GlowCard className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-3">
            Verification Link Unavailable
          </h1>
          <p className="text-muted-foreground mb-6">
            {message}
          </p>
          <div className="space-y-3">
            <Button className="w-full" onClick={() => navigate(returnPath)}>
              Return to Login
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link to={helpPath}>Need help signing in?</Link>
            </Button>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-4 h-4" />
            <span>If you requested a new email, use the newest verification link.</span>
          </div>
        </GlowCard>
      </main>
    </div>
  );
};

export default AuthConfirm;
