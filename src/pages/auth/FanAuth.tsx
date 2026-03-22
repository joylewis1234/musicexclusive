import { useState, forwardRef } from "react";
import { useNavigate, useLocation, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { GlowCard } from "@/components/ui/GlowCard";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, CheckCircle2, Loader2, Music, Sparkles, Crown } from "lucide-react";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getAppBaseUrl } from "@/config/app";
import { startSignupVerification } from "@/lib/signupVerification";
import { MIN_PASSWORD_LENGTH, PASSWORD_MIN_LENGTH_MESSAGE } from "@/config/passwordPolicy";

interface LocationState {
  from?: Location;
  flow?: "superfan" | "vault" | "invite";
  email?: string;
  name?: string;
  invite_token?: string;
  invite_type?: string;
}

const FanAuth = forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { signIn, setActiveRole } = useAuth();
  
  const state = location.state as LocationState | null;
  // Check both URL query param and location state for flow
  const flowFromParams = searchParams.get("flow") as "superfan" | "vault" | "invite" | null;
  const flowFromState = state?.flow;
  const flow = flowFromParams || flowFromState;
  const isSuperfanFlow = flow === "superfan";
  const isVaultFlow = flow === "vault";
  const isInviteFlow = flow === "invite";
  const inviteToken = searchParams.get("invite_token") || state?.invite_token || "";
  const inviteType = searchParams.get("invite_type") || state?.invite_type || "";
  
  // Vault winners now claim their account on /vault/congrats, so vault auth is sign-in only.
  const [isSignUp, setIsSignUp] = useState(isSuperfanFlow || isInviteFlow);
  const [email, setEmail] = useState(state?.email || "");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState(state?.name || "");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);

  const getDestination = () => {
    if (isSuperfanFlow) {
      return "/subscribe";
    }
    if (isInviteFlow) {
      // Invite flow: go to agreements, then membership selection
      return "/fan/agreements";
    }
    if (isVaultFlow) {
      return "/fan/agreements";
    }
    return state?.from?.pathname || "/fan/profile";
  };

  // Consume the invite token so it's marked "used" on the artist's dashboard
  const consumeInvite = async () => {
    if (!inviteToken) return;
    try {
      await supabase.functions.invoke("validate-fan-invite", {
        body: { token: inviteToken, action: "consume" },
      });
      console.log("[FanAuth] Invite token consumed");
    } catch (err) {
      console.warn("[FanAuth] Failed to consume invite (non-fatal):", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const destination = getDestination();
    const navState = { flow, email, name: displayName, invite_token: inviteToken, invite_type: inviteType };

    try {
      // Pre-set the active role BEFORE signIn so that onAuthStateChange's
      // pickActiveRole finds "fan" in sessionStorage and doesn't default to "artist"
      setActiveRole("fan");

      if (isSignUp) {
        if (password.length < MIN_PASSWORD_LENGTH) {
          toast.error(PASSWORD_MIN_LENGTH_MESSAGE);
          return;
        }
        const normalizedEmail = email.trim().toLowerCase();
        const data = await startSignupVerification({
          intent: "fan",
          email: normalizedEmail,
          password,
          displayName: displayName.trim(),
          flow: flow === "vault" ? null : flow ?? null,
          inviteToken,
          inviteType,
          next: destination,
        });

        if (!data.success) {
          toast.error(data.error || "We couldn't start signup.");
          return;
        }

        if (data?.status === "account_exists") {
          setIsSignUp(false);
          toast.error(data.message || "An account with this email already exists. Sign in or reset your password.");
          return;
        }

        setVerificationEmailSent(true);
        toast.success("Check your inbox to verify your account.");
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message);
          return;
        }
        setActiveRole("fan");
        await consumeInvite();
        toast.success("Welcome back!");
        navigate(destination, { replace: true, state: navState });
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSignUp && verificationEmailSent) {
    return (
      <div ref={ref} className="min-h-screen bg-background flex flex-col">
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
          <div className="container max-w-lg mx-auto px-4 h-14 flex items-center">
            <button
              onClick={() => navigate("/")}
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
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mb-3">
              Check Your Email
            </h1>
            <p className="text-muted-foreground mb-6">
              We sent a verification link to <span className="text-foreground">{email}</span>. Open that email to verify your account and continue.
            </p>
            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    const data = await startSignupVerification({
                      intent: "fan",
                      email,
                      password,
                      displayName: displayName.trim(),
                      flow: flow ?? null,
                      inviteToken,
                      inviteType,
                      next: getDestination(),
                    });
                    if (!data.success) {
                      toast.error(data.error || "We couldn't resend your verification email.");
                      return;
                    }
                    toast.success("Verification email sent.");
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Resend Verification Email
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setVerificationEmailSent(false)}>
                Edit Signup Details
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setIsSignUp(false)}>
                Already verified? Sign in
              </Button>
            </div>
          </GlowCard>
        </main>
      </div>
    );
  }

  return (
    <div ref={ref} className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-lg mx-auto px-4 h-14 flex items-center">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm uppercase tracking-wider">Back</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-8">
        <GlowCard className="max-w-md w-full p-8">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            {isSuperfanFlow ? (
              <Crown className="w-8 h-8 text-primary" />
            ) : (
              <Music className="w-8 h-8 text-primary" />
            )}
          </div>

          <h1 className="font-display text-2xl font-bold text-foreground text-center mb-2">
            {isInviteFlow
              ? (isSignUp ? "Accept Your Invite" : "Welcome Back")
              : isVaultFlow
              ? "Welcome Back"
              : isSuperfanFlow 
                ? (isSignUp ? "Become a Superfan" : "Welcome Back, Superfan")
                : (isSignUp ? "Join the Vault" : "Welcome Back")}
          </h1>
          
          <p className="text-muted-foreground text-center mb-6">
            {isInviteFlow
              ? (isSignUp
                  ? "You've been invited! Create your account to continue"
                  : "Sign in to accept your invite")
              : isVaultFlow
              ? "Sign in to access your Vault membership"
              : isSuperfanFlow
                ? (isSignUp 
                    ? "Create your account to unlock guaranteed access"
                    : "Sign in to continue to your Superfan subscription")
                : (isSignUp 
                    ? "Create your fan account to access exclusive music"
                    : "Sign in to continue discovering exclusive tracks")}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">
                  Display Name
                </label>
                <Input
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-muted/30"
                />
              </div>
            )}
            
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                Email
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-muted/30"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                Password
              </label>
              <PasswordInput
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-muted/30"
              />
            </div>

            {/* Terms Checkbox - only show for signup */}
            {isSignUp && (
              <label className="flex items-start gap-3 cursor-pointer group">
                <Checkbox
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  className="mt-0.5 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed">
                  I agree to the Music Exclusive{" "}
                  <Link 
                    to="/terms" 
                    target="_blank"
                    className="text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Terms of Use
                  </Link>
                </span>
              </label>
            )}

            <Button type="submit" className="w-full" disabled={isLoading || (isSignUp && !termsAccepted)}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {isSignUp ? "Create Account" : "Sign In"}
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            {/* Google Sign-In */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isLoading}
              onClick={async () => {
                setIsLoading(true);
                // Pre-set fan role so pickActiveRole finds it after OAuth redirect
                setActiveRole("fan");
                try {
                  const destination = getDestination();
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: "google",
                    options: {
                      redirectTo: `${getAppBaseUrl()}${destination}`,
                    },
                  });
                  if (error) {
                    toast.error(error.message || "Google sign-in failed");
                  }
                } catch (err: any) {
                  toast.error(err?.message || "Google sign-in failed");
                } finally {
                  setIsLoading(false);
                }
              }}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>
          </form>

          <div className="mt-6 text-center space-y-3">
            {!isVaultFlow && (
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-primary hover:underline"
              >
                {isSignUp
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Sign up"}
              </button>
            )}

            {isVaultFlow && (
              <p className="text-sm text-muted-foreground">
                Need to create your account? Open the winner email and claim your access first.
              </p>
            )}
            
            {!isSignUp && (
              <div>
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password?type=fan")}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot your password?
                </button>
              </div>
            )}
          </div>

          {/* Patent Pending Notice */}
          <p className="mt-6 text-center text-[10px] text-primary/60 font-display tracking-wider">
            Music Exclusive™ | Patent Pending
          </p>
        </GlowCard>
      </main>
    </div>
  );
});
FanAuth.displayName = "FanAuth";

export default FanAuth;
