import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlowCard } from "@/components/ui/GlowCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, Mic2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const ArtistLogin = () => {
  const navigate = useNavigate();
  const { signIn, refreshRole } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setApplicationStatus(null);

    // Validate inputs
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === "email") fieldErrors.email = err.message;
        if (err.path[0] === "password") fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      // First check if this email has an approved application pending setup
      // (these users don't have auth accounts yet)
      let applicationCheck: { status: string } | null = null;
      try {
        const { data, error: applicationCheckError } = await supabase
          .from("artist_applications")
          .select("status")
          .eq("contact_email", email)
          .maybeSingle();

        if (applicationCheckError) {
          // Log but don't block login - proceed to sign-in attempt
          console.warn("[ArtistLogin] application pre-check warning:", applicationCheckError);
        } else {
          applicationCheck = data;
        }
      } catch (preCheckErr) {
        // Non-blocking: log and continue
        console.warn("[ArtistLogin] application pre-check exception:", preCheckErr);
      }

      if (applicationCheck?.status === "approved_pending_setup") {
        // Redirect to setup page with email
        toast.success("Your application is approved! Complete your account setup.");
        navigate(`/artist/setup-account?email=${encodeURIComponent(email)}`, { replace: true });
        setIsLoading(false);
        return;
      }

      // Sign in
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        const errMsg = signInError.message.toLowerCase();
        console.error("[ArtistLogin] Sign-in error:", signInError.message);
        
        if (errMsg.includes("invalid login credentials") || errMsg.includes("invalid_credentials")) {
          toast.error("Incorrect email or password. Please try again or reset your password.");
        } else if (errMsg.includes("email not confirmed")) {
          toast.error("Your email hasn't been confirmed yet. Please check your inbox.");
        } else {
          toast.error(signInError.message);
        }
        setIsLoading(false);
        return;
      }

      // Finalize artist setup (ensures status is "active" and profile exists)
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (accessToken) {
          await supabase.functions.invoke("finalize-artist-setup", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        }
        // Refresh role in AuthContext so ProtectedRoute sees "artist"
        await refreshRole();
      } catch (finalizeErr) {
        console.warn("[ArtistLogin] finalize-artist-setup warning:", finalizeErr);
        // Non-blocking - continue with login
      }

      // Check artist application status (non-blocking - if this fails, still try to navigate)
      let application: { status: string } | null = null;
      try {
        const { data, error: appError } = await supabase
          .from("artist_applications")
          .select("status")
          .eq("contact_email", email)
          .maybeSingle();

        if (appError) {
          console.warn("[ArtistLogin] Application lookup warning:", appError);
          // Don't block - user is authenticated, let AuthContext/ProtectedRoute handle routing
          toast.success("Welcome back!");
          navigate("/artist/dashboard", { replace: true });
          return;
        }
        application = data;
      } catch (lookupErr) {
        console.warn("[ArtistLogin] Application lookup exception:", lookupErr);
        // Don't block - user is authenticated
        toast.success("Welcome back!");
        navigate("/artist/dashboard", { replace: true });
        return;
      }

      // Route based on status
      if (!application) {
        // No application found - they need to apply first
        setApplicationStatus("no_application");
        try {
          await supabase.auth.signOut();
        } catch (err) {
          console.error("[ArtistLogin] signOut failed:", err);
        }
        setIsLoading(false);
        return;
      }

      switch (application.status) {
        case "active":
        case "approved":
          toast.success("Welcome back, artist!");
          navigate("/artist/dashboard", { replace: true });
          break;
        case "approved_pending_setup":
          toast.success("Complete your account setup to get started.");
          navigate(`/artist/setup-account?email=${encodeURIComponent(email)}`, { replace: true });
          break;
        case "pending":
          setApplicationStatus("pending");
          try {
            await supabase.auth.signOut();
          } catch (err) {
            console.error("[ArtistLogin] signOut failed:", err);
          }
          break;
        case "rejected":
        case "not_approved":
          setApplicationStatus("not_approved");
          try {
            await supabase.auth.signOut();
          } catch (err) {
            console.error("[ArtistLogin] signOut failed:", err);
          }
          break;
        default:
          setApplicationStatus("pending");
          try {
            await supabase.auth.signOut();
          } catch (err) {
            console.error("[ArtistLogin] signOut failed:", err);
          }
      }
    } catch (error) {
      const anyErr = error as any;
      const name = String(anyErr?.name ?? "");
      const message = String(anyErr?.message ?? anyErr ?? "").toLowerCase();
      const benign =
        name === "AbortError" ||
        message.includes("signal is aborted") ||
        message.includes("request cancelled") ||
        message.includes("request canceled") ||
        message.includes("cancelled") ||
        message.includes("canceled");

      if (!benign) {
        console.error("[ArtistLogin] Unexpected login error:", error);
        toast.error("An error occurred. Please try again.");
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
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
            <Mic2 className="w-8 h-8 text-accent" />
          </div>

          <h1 className="font-display text-2xl font-bold text-foreground text-center mb-2">
            Artist Login
          </h1>
          
          <p className="text-muted-foreground text-center mb-6">
            Sign in to manage your music and connect with fans
          </p>

          {/* Application Status Messages */}
          {applicationStatus === "pending" && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-500 font-semibold text-sm">Application Under Review</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Your application is still being reviewed. We'll notify you once a decision is made.
                </p>
              </div>
            </div>
          )}

          {applicationStatus === "not_approved" && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-destructive font-semibold text-sm">Application Not Approved</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Unfortunately, your application was not approved at this time.
                </p>
              </div>
            </div>
          )}

          {applicationStatus === "no_application" && (
            <div className="mb-6 p-4 bg-muted/30 border border-border/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-foreground font-semibold text-sm">No Application Found</p>
                <p className="text-muted-foreground text-xs mt-1">
                  We couldn't find an artist application with this email. Please apply first.
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto mt-2 text-primary"
                  onClick={() => navigate("/artist/apply")}
                >
                  Apply to become an artist →
                </Button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                Email
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`bg-muted/30 ${errors.email ? "border-destructive" : ""}`}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-destructive text-xs mt-1">{errors.email}</p>
              )}
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
                className={`bg-muted/30 ${errors.password ? "border-destructive" : ""}`}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-destructive text-xs mt-1">{errors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              LOG IN
            </Button>
          </form>

          {/* Secondary Links */}
          <div className="mt-6 space-y-3 text-center">
            <div>
              <button
                type="button"
                onClick={() => navigate("/forgot-password?type=artist")}
                className="text-sm text-primary hover:underline"
              >
                Forgot your password?
              </button>
            </div>
            
            <div>
              <span className="text-muted-foreground text-sm">Applied but not approved yet? </span>
              <button
                type="button"
                onClick={() => navigate("/artist/application-status")}
                className="text-sm text-accent hover:underline"
              >
                Check status
              </button>
            </div>
            
            <div>
              <span className="text-muted-foreground text-sm">Need to set up your account? </span>
              <button
                type="button"
                onClick={() => navigate("/artist/setup-account")}
                className="text-sm text-accent hover:underline"
              >
                Complete setup
              </button>
            </div>
          </div>

          {/* Patent Pending Notice */}
          <p className="mt-6 text-center text-[10px] text-primary/60 font-display tracking-wider">
            Music Exclusive™ | Patent Pending
          </p>
        </GlowCard>
      </main>
    </div>
  );
};

export default ArtistLogin;
