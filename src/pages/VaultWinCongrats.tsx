import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/GlowCard";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Crown, Sparkles, Music, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { warmFanAuthRoute } from "@/utils/preloadRoutes";
import { MIN_PASSWORD_LENGTH, PASSWORD_MIN_LENGTH_MESSAGE } from "@/config/passwordPolicy";

type ClaimState = "checking" | "claimable" | "claiming" | "account_exists" | "invalid";

const VaultWinCongrats = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showContent, setShowContent] = useState(false);
  const [claimState, setClaimState] = useState<ClaimState>("checking");
  const [winnerName, setWinnerName] = useState("Vault Member");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { signIn, setActiveRole } = useAuth();

  // Get params from URL
  const email = searchParams.get("email") || "";
  const code = searchParams.get("code") || "";
  const isRetry = searchParams.get("retry") === "true";

  useEffect(() => {
    // Store in session for later steps
    if (email) sessionStorage.setItem("vaultEmail", email);
    if (code) sessionStorage.setItem("vaultCode", code);

    // Animate in content
    const timer = setTimeout(() => setShowContent(true), 100);
    warmFanAuthRoute();
    return () => clearTimeout(timer);
  }, [email, code]);

  useEffect(() => {
    const inspectClaim = async () => {
      if (!email || !code) {
        setClaimState("invalid");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("claim-vault-access", {
          body: {
            mode: "inspect",
            email,
            vaultCode: code,
          },
        });

        if (error || !data?.success) {
          setClaimState("invalid");
          return;
        }

        setWinnerName(data.name || "Vault Member");
        setClaimState(data.status === "account_exists" ? "account_exists" : "claimable");
      } catch (err) {
        console.error("[VaultWinCongrats] Failed to inspect claim:", err);
        setClaimState("invalid");
      }
    };

    void inspectClaim();
  }, [email, code]);

  const handleSignIn = () => {
    warmFanAuthRoute();
    navigate("/auth/fan?flow=vault", {
      state: { email, name: winnerName, vaultCode: code, flow: "vault" },
    });
  };

  const handleClaim = async () => {
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      toast.error(PASSWORD_MIN_LENGTH_MESSAGE);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (!termsAccepted) {
      toast.error("Please agree to the Terms of Use to continue.");
      return;
    }

    setClaimState("claiming");

    try {
      const { data, error } = await supabase.functions.invoke("claim-vault-access", {
        body: {
          mode: "claim",
          email,
          vaultCode: code,
          password,
          termsVersion: "1.0",
          privacyVersion: "1.0",
        },
      });

      if (error) {
        toast.error("We couldn't claim your access. Please try again.");
        setClaimState("claimable");
        return;
      }

      if (data?.status === "account_exists") {
        setWinnerName(data.name || winnerName);
        setClaimState("account_exists");
        toast.info("This winner email has already been claimed. Sign in to continue.");
        return;
      }

      if (!data?.success) {
        toast.error(data?.error || "We couldn't claim your access. Please try again.");
        setClaimState("claimable");
        return;
      }

      setActiveRole("fan");
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        console.error("[VaultWinCongrats] Sign-in after claim failed:", signInError);
        toast.success("Your account is ready. Sign in to continue.");
        handleSignIn();
        return;
      }

      toast.success("Your account is ready. Welcome to the Vault.");
      navigate("/onboarding/listen", {
        replace: true,
        state: { email, name: data.name || winnerName, flow: "vault" },
      });
    } catch (err) {
      console.error("[VaultWinCongrats] Claim error:", err);
      toast.error("Something went wrong while claiming your access.");
      setClaimState("claimable");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8 overflow-hidden">
      {/* Animated background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] bg-purple-500/10 rounded-full blur-[60px]" />
      </div>

      {/* Content */}
      <div
        className={`relative z-10 max-w-lg w-full text-center transition-all duration-700 ${
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* Celebration Icon */}
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="absolute inset-0 w-32 h-32 bg-primary/30 rounded-full blur-2xl animate-pulse" />
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 border-2 border-primary/50 flex items-center justify-center shadow-[0_0_60px_rgba(0,212,255,0.4)]">
            <Crown className="w-14 h-14 text-primary" />
          </div>
          {/* Sparkles */}
          <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-amber-400 animate-bounce" />
          <Sparkles className="absolute -bottom-1 -left-3 w-6 h-6 text-primary animate-pulse" />
        </div>

        {/* Title */}
        <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
          {isRetry ? "You Finally Made It!" : "YOU'RE IN!"} 🎉
        </h1>

        {/* Subtitle */}
        <p className="text-xl text-primary font-medium mb-6">
          {isRetry
            ? "Vault Access Granted After All!"
            : "Welcome to Music Exclusive"}
        </p>

        {/* Vault Code Display */}
        {code && (
        <GlowCard className="inline-block px-10 py-6 mb-8">
            <p className="text-base text-muted-foreground uppercase tracking-wider mb-2">
              Your Vault Code
            </p>
            <p className="text-4xl font-mono font-bold text-primary tracking-[0.3em]">
              {code}
            </p>
          </GlowCard>
        )}

        {/* Description */}
        <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-md mx-auto">
          {isRetry ? (
            <>
              After trying before, you've officially been selected. Inside the
              Vault is where artists drop music <strong className="text-foreground">FIRST</strong>.
            </>
          ) : (
            <>
              You're now getting <strong className="text-foreground">early access to exclusive music</strong>{" "}
              that the rest of the world isn't hearing yet.
            </>
          )}
        </p>

        {/* Features */}
        <div className="flex items-center justify-center gap-6 mb-10 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-primary" />
            <span>Exclusive Tracks</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Early Access</span>
          </div>
        </div>

        <GlowCard className="max-w-md mx-auto w-full p-6 text-left">
          {claimState === "checking" && (
            <div className="space-y-4 text-center">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Checking your winner access...
              </p>
            </div>
          )}

          {(claimState === "claimable" || claimState === "claiming") && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-display uppercase tracking-wider text-foreground">
                  Claim Your Access
                </h2>
                <p className="text-sm text-muted-foreground">
                  Create your password now and we&apos;ll take you straight to choose your access.
                </p>
              </div>

              <PasswordInput
                placeholder="Create password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-muted/30"
              />

              <PasswordInput
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-muted/30"
              />

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
                  </Link>.
                </span>
              </label>


              <Button
                onClick={handleClaim}
                size="lg"
                className="w-full"
                disabled={claimState === "claiming"}
              >
                {claimState === "claiming" ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Claiming Access...
                  </>
                ) : (
                  <>
                    Claim Your Access
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}

          {claimState === "account_exists" && (
            <div className="space-y-4 text-center">
              <h2 className="text-xl font-display uppercase tracking-wider text-foreground">
                Account Already Claimed
              </h2>
              <p className="text-sm text-muted-foreground">
                This winner link belongs to an account that already exists. Sign in to continue, or reset your password if you need to.
              </p>
              <Button onClick={handleSignIn} size="lg" className="w-full">
                Sign In to Continue
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => navigate(`/forgot-password?type=fan&email=${encodeURIComponent(email)}`)}
              >
                Reset Password
              </Button>
            </div>
          )}

          {claimState === "invalid" && (
            <div className="space-y-4 text-center">
              <h2 className="text-xl font-display uppercase tracking-wider text-foreground">
                Winner Link Unavailable
              </h2>
              <p className="text-sm text-muted-foreground">
                We couldn&apos;t verify this winner link. Go back to the vault and submit your code again, or request a resend email.
              </p>
              <Button onClick={() => navigate("/vault/submit")} size="lg" className="w-full">
                Return to Vault
              </Button>
            </div>
          )}
        </GlowCard>
      </div>
    </div>
  );
};

export default VaultWinCongrats;
