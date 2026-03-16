import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlowCard } from "@/components/ui/GlowCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, Mic2, AlertCircle, FileText } from "lucide-react";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SUPABASE_URL } from "@/config/supabase";
import { toast } from "sonner";

const normalizeEmail = (e: string) => e.trim().toLowerCase();

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const ArtistLogin = () => {
  const navigate = useNavigate();
  const { signIn, refreshRole, setActiveRole } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  // Masked Supabase URL for debug
  const maskedUrl = (SUPABASE_URL || "").replace(/^(https?:\/\/[^.]+).*/, "$1.***");

  /**
   * Lookup application via the edge function (uses service_role, bypasses RLS).
   * Supports lookup by auth_user_id OR email.
   */
  const lookupApplication = async (params: { auth_user_id?: string; email?: string }) => {
    const body: Record<string, string> = {};
    if (params.auth_user_id) body.auth_user_id = params.auth_user_id;
    if (params.email) body.email = params.email;

    console.log("[ArtistLogin] Edge fn lookup-artist-application body:", body);

    const { data, error } = await supabase.functions.invoke("lookup-artist-application", { body });

    if (error) {
      console.error("[ArtistLogin] lookup-artist-application invoke error:", error);
      return null;
    }

    console.log("[ArtistLogin] lookup-artist-application result:", data);
    return data as {
      success: boolean;
      found: boolean;
      status?: string;
      email?: string;
      application_id?: string;
      artist_name?: string;
      auth_user_id?: string;
      message?: string;
    } | null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // prevent double-submit
    setErrors({});
    setApplicationStatus(null);
    setDebugInfo(null);

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

    const normalizedEmail = normalizeEmail(email);
    console.log("[ArtistLogin] Attempting login for:", normalizedEmail);
    console.log("[ArtistLogin] Supabase env:", maskedUrl);

    setIsLoading(true);

    // Safety timeout: if the login flow hangs for 30s, reset the button
    const safetyTimer = setTimeout(() => {
      console.warn("[ArtistLogin] Safety timeout: resetting isLoading after 30s");
      setIsLoading(false);
    }, 30_000);

    try {
      // Pre-check via edge function (bypasses RLS, works before sign-in)
      try {
        const preCheck = await lookupApplication({ email: normalizedEmail });
        console.log("[ArtistLogin] Pre-check result:", preCheck);

        if (preCheck?.found && preCheck.status === "approved_pending_setup") {
          toast.success("Your application is approved! Complete your account setup.");
          navigate(`/artist/setup-account?email=${encodeURIComponent(normalizedEmail)}`, { replace: true });
          setIsLoading(false);
          return;
        }
      } catch (preCheckErr) {
        console.warn("[ArtistLogin] Pre-check exception (non-blocking):", preCheckErr);
      }

      // Sign in
      const { error: signInError } = await signIn(normalizedEmail, password);
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

      console.log("[ArtistLogin] Sign-in successful for:", normalizedEmail);

      // Finalize artist setup (ensures role + profile exist + links auth_user_id)
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (accessToken) {
          console.log("[ArtistLogin] Calling finalize-artist-setup...");
          const { data: finalizeResult, error: finalizeErr } = await supabase.functions.invoke("finalize-artist-setup", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (finalizeErr) {
            console.warn("[ArtistLogin] finalize-artist-setup error:", finalizeErr);
          } else {
            console.log("[ArtistLogin] finalize-artist-setup result:", finalizeResult);
          }
        }
      } catch (finalizeErr) {
        console.warn("[ArtistLogin] finalize-artist-setup exception:", finalizeErr);
      }

      // Refresh role so ProtectedRoute sees "artist"
      const newRole = await refreshRole();
      console.log("[ArtistLogin] Role after refresh:", newRole);

      // If role is artist (or user has artist role), go straight to dashboard
      if (newRole === "artist") {
        setActiveRole("artist");
        toast.success("Welcome back, artist!");
        navigate("/artist/dashboard", { replace: true });
        return;
      }

      // Role is not artist — lookup application via edge function
      console.log("[ArtistLogin] Role is not 'artist' (got:", newRole, "). Looking up application via edge function...");

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      let application: { status: string; found: boolean } | null = null;

      // Priority 1: lookup by auth_user_id
      if (currentUser?.id) {
        const lookupById = await lookupApplication({ auth_user_id: currentUser.id });
        if (lookupById?.found) {
          application = { status: lookupById.status!, found: true };
          console.log("[ArtistLogin] Found application by auth_user_id:", lookupById);
        }
      }

      // Priority 2: lookup by normalized email
      if (!application) {
        const lookupByEmail = await lookupApplication({ email: normalizedEmail });
        if (lookupByEmail?.found) {
          application = { status: lookupByEmail.status!, found: true };
          console.log("[ArtistLogin] Found application by email:", lookupByEmail);
        } else {
          console.log("[ArtistLogin] No application found by email:", lookupByEmail);
        }
      }

      if (!application) {
        setApplicationStatus("no_application");
        setDebugInfo(
          `Queried email: ${normalizedEmail} | Role: ${newRole ?? "none"} | User ID: ${currentUser?.id ?? "unknown"} | Supabase: ${maskedUrl} | Lookup: edge function (service_role)`
        );
        setIsLoading(false);
        return;
      }

      // Route based on application status
      switch (application.status) {
        case "active":
        case "approved":
          toast.success("Welcome back!");
          navigate("/artist/dashboard", { replace: true });
          break;
        case "approved_pending_setup":
          toast.success("Complete your account setup to get started.");
          navigate(`/artist/setup-account?email=${encodeURIComponent(normalizedEmail)}`, { replace: true });
          break;
        case "pending":
          setApplicationStatus("pending");
          break;
        case "rejected":
        case "not_approved":
          setApplicationStatus("not_approved");
          break;
        default:
          setApplicationStatus("pending");
      }
    } catch (error) {
      const anyErr = error as any;
      const name = String(anyErr?.name ?? "");
      const message = String(anyErr?.message ?? anyErr ?? "").toLowerCase();
      const benign =
        name === "AbortError" ||
        message.includes("signal is aborted") ||
        message.includes("cancelled") ||
        message.includes("canceled");

      if (!benign) {
        console.error("[ArtistLogin] Unexpected login error:", error);
        toast.error("An error occurred. Please try again.");
      }
    } finally {
      clearTimeout(safetyTimer);
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
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto mt-2 text-primary"
                  onClick={() => navigate("/artist/apply")}
                >
                  Re-apply →
                </Button>
              </div>
            </div>
          )}

          {applicationStatus === "no_application" && (
            <div className="mb-6 p-4 bg-muted/30 border border-border/30 rounded-lg">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-foreground font-semibold text-sm">No Application Found</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    We couldn't find an artist application for this email. You're signed in, but you need an approved application to access the artist dashboard.
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Button
                  className="w-full"
                  onClick={() => navigate(`/artist/apply?email=${encodeURIComponent(normalizeEmail(email))}`)}
                >
                  Start Application with This Email
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.href = "mailto:support@musicexclusive.co"}
                >
                  Contact Support
                </Button>
              </div>
              {debugInfo && (
                <p className="text-[10px] text-muted-foreground/50 mt-3 font-mono break-all">
                  Debug: {debugInfo}
                </p>
              )}
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
              <PasswordInput
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
