import { useState } from "react";
import { useNavigate, useLocation, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { GlowCard } from "@/components/ui/GlowCard";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Loader2, Music, Sparkles, Crown } from "lucide-react";
import { toast } from "sonner";

interface LocationState {
  from?: Location;
  flow?: "superfan" | "vault";
  email?: string;
  name?: string;
}

const FanAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { signIn, signUp } = useAuth();
  
  const state = location.state as LocationState | null;
  // Check both URL query param and location state for flow
  const flowFromParams = searchParams.get("flow") as "superfan" | "vault" | null;
  const flowFromState = state?.flow;
  const flow = flowFromParams || flowFromState; // Keep as undefined if neither exists
  const isSuperfanFlow = flow === "superfan";
  const isVaultFlow = flow === "vault";
  
  // Default to signup for superfan and vault flows
  const [isSignUp, setIsSignUp] = useState(isSuperfanFlow || isVaultFlow);
  const [email, setEmail] = useState(state?.email || "");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState(state?.name || "");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Determine destination based on flow
  const getDestination = () => {
    if (isSuperfanFlow || isVaultFlow) {
      // Both flows: go to agreements first
      return "/agreements/fan";
    }
    // Default flow: go to dashboard
    return state?.from?.pathname || "/fan/dashboard";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, "fan", displayName);
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success("Account created! Welcome to the Vault.");
        navigate(getDestination(), { replace: true, state: { flow, email, name: displayName } });
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success("Welcome back!");
        navigate(getDestination(), { replace: true, state: { flow, email } });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
            {isVaultFlow
              ? (isSignUp ? "Create Your Account" : "Welcome Back")
              : isSuperfanFlow 
                ? (isSignUp ? "Become a Superfan" : "Welcome Back, Superfan")
                : (isSignUp ? "Join the Vault" : "Welcome Back")}
          </h1>
          
          <p className="text-muted-foreground text-center mb-6">
            {isVaultFlow
              ? (isSignUp 
                  ? "You've won access! Create your account to continue"
                  : "Sign in to access your Vault membership")
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
              <Input
                type="password"
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
          </form>

          <div className="mt-6 text-center space-y-3">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:underline"
            >
              {isSignUp 
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
            
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
        </GlowCard>
      </main>
    </div>
  );
};

export default FanAuth;
