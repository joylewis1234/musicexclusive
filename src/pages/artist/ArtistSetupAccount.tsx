import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { GlowCard } from "@/components/ui/GlowCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Home, Mic2, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const setupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  agreeTerms: z.boolean().refine(val => val === true, "You must agree to the terms"),
  confirmRights: z.boolean().refine(val => val === true, "You must confirm music rights"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SetupFormData = z.infer<typeof setupSchema>;

const ArtistSetupAccount = () => {
  const navigate = useNavigate();
  const { refreshRole } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [lookupEmail, setLookupEmail] = useState("");
  const [isLookingUpEmail, setIsLookingUpEmail] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [resolvedApplicationId, setResolvedApplicationId] = useState<string | null>(null);
  const [applicationAuthUserId, setApplicationAuthUserId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [confirmRights, setConfirmRights] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof SetupFormData, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Get email from URL params or check for pending setup applications
  useEffect(() => {
    // Environment debug logging
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
    console.log("[ArtistSetupAccount] Supabase env:", supabaseUrl.replace(/^(https?:\/\/[^.]+).*/, "$1.***"));

    const checkApplication = async () => {
      const applicationId = searchParams.get("application_id");
      const emailParam = searchParams.get("email");

      // Prefer application_id lookup (deterministic), fall back to email
      const lookupBody: Record<string, string> = {};
      if (applicationId) {
        lookupBody.application_id = applicationId;
      } else if (emailParam) {
        lookupBody.email = emailParam;
      } else {
        // No identifier provided - allow manual lookup
        setApplicationStatus("no_email");
        setIsLoading(false);
        return;
      }

      console.log("[ArtistSetupAccount] Looking up application:", lookupBody);

      try {
        const { data, error } = await supabase.functions.invoke("lookup-artist-application", {
          body: lookupBody,
        });

        console.log("[ArtistSetupAccount] Lookup response:", { data, error });

        if (error) {
          console.error("[ArtistSetupAccount] Edge function error:", error);
          // Network / deployment error — let user try manual lookup
          setApplicationStatus("no_email");
          setLookupError(`Verification service error: ${error.message || "Network error"}. Please enter your email below.`);
          setIsLoading(false);
          return;
        }

        if (!data?.success) {
          console.warn("[ArtistSetupAccount] Lookup failed:", data);
          setApplicationStatus("not_found");
          setLookupError(data?.message || "No approved application found for this email.");
          setIsLoading(false);
          return;
        }

        if (!data?.found) {
          setApplicationStatus("not_found");
          setLookupError("No approved application record found for this identifier.");
          setIsLoading(false);
          return;
        }

        const status = String(data.status);
        const appId = data.application_id ?? null;
        const authUid = data.auth_user_id ?? null;
        setEmail(String(data.email ?? emailParam ?? ""));
        setLookupEmail(String(data.email ?? emailParam ?? ""));
        setResolvedApplicationId(appId);
        setApplicationAuthUserId(authUid);
        setApplicationStatus(status);

        // If application already linked to another user, block
        if (authUid) {
          console.warn("[ArtistSetupAccount] Application already linked to auth_user_id:", authUid);
          setApplicationStatus("already_linked");
        }
      } catch (err) {
        console.error("[ArtistSetupAccount] Unexpected lookup error:", err);
        setApplicationStatus("no_email");
        setLookupError("Could not reach verification service. Please enter your email below.");
      }

      setIsLoading(false);
    };

    checkApplication();
  }, [searchParams]);

  const handleLookupApprovedEmail = async () => {
    setLookupError(null);

    const trimmed = lookupEmail.trim();
    if (!trimmed) {
      setLookupError("Please enter the email you applied with.");
      return;
    }

    const parsed = z.string().email().safeParse(trimmed);
    if (!parsed.success) {
      setLookupError("Please enter a valid email address.");
      return;
    }

    setIsLookingUpEmail(true);
    try {
      console.log("[ArtistSetupAccount] Manual lookup for:", trimmed);

      const { data, error } = await supabase.functions.invoke("lookup-artist-application", {
        body: { email: trimmed },
      });

      console.log("[ArtistSetupAccount] Manual lookup response:", { data, error });

      if (error) {
        console.error("[ArtistSetupAccount] Edge function network error:", error);
        setLookupError(`Verification service error: ${error.message || "Network error"}. Please try again.`);
        return;
      }

      if (!data?.success) {
        setLookupError(`Verification failed: ${data?.message || "Unknown error"}. Please try again.`);
        return;
      }

      if (!data.found) {
        setLookupError("No approved application found for that email. Please check the email address or apply first.");
        return;
      }

      const status = String(data.status);
      setEmail(String(data.email ?? trimmed));
      setResolvedApplicationId(data.application_id ?? null);
      setApplicationAuthUserId(data.auth_user_id ?? null);
      setApplicationStatus(status);

      // Block if already linked
      if (data.auth_user_id) {
        setApplicationStatus("already_linked");
        setLookupError("This application is already linked to an account. Please log in instead.");
        return;
      }

      if (status === "approved" || status === "approved_pending_setup") {
        toast.success("Approved application found! Create your password to continue.");
      } else if (status === "pending") {
        setLookupError("Your application is still under review. You'll receive an email once it's approved.");
      } else if (status === "rejected") {
        setLookupError("Your application was not approved. You can re-apply anytime.");
      } else if (status === "active") {
        setLookupError("Your account is already set up. Please log in instead.");
      } else {
        console.warn("[ArtistSetupAccount] Unexpected status:", status);
        setLookupError(`Application status: "${status}". Please contact support if you believe this is an error.`);
      }
    } catch (err) {
      console.error("[ArtistSetupAccount] lookup error:", err);
      setLookupError("Something went wrong connecting to the server. Please try again.");
    } finally {
      setIsLookingUpEmail(false);
    }
  };

  const handleRetrySetup = () => {
    setSetupError(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSetupError(null);

    // Validate form
    const result = setupSchema.safeParse({
      email,
      password,
      confirmPassword,
      agreeTerms,
      confirmRights,
    });

    if (!result.success) {
      const fieldErrors: Partial<Record<keyof SetupFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof SetupFormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Create auth account (normalize email)
      const normalizedEmail = email.trim().toLowerCase();
      console.log("[ArtistSetupAccount] Step 1: Creating auth account for", normalizedEmail);
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: normalizedEmail.split("@")[0] },
        },
      });

      if (signUpError) {
        const msg = signUpError.message.toLowerCase();
        const code = (signUpError as any)?.code || "unknown";
        console.error("[ArtistSetupAccount] SignUp error:", { message: signUpError.message, code, status: (signUpError as any)?.status });
        
        if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("already exists")) {
          console.log("[ArtistSetupAccount] User already exists — auth user found for this email");
          setSetupError("ALREADY_REGISTERED");
          setIsSubmitting(false);
          return;
        }
        
        if (msg.includes("weak") || msg.includes("leaked") || msg.includes("compromised") || msg.includes("hibp")) {
          console.warn("[ArtistSetupAccount] Weak/leaked password:", signUpError.message);
          setSetupError("PASSWORD_WEAK");
          setIsSubmitting(false);
          return;
        }

        // Show the exact error from auth for debugging
        setSetupError(`AUTH_ERROR: ${signUpError.message} (code: ${code})`);
        setIsSubmitting(false);
        return;
      }

      console.log("[ArtistSetupAccount] Step 2: Auth account created, user ID:", signUpData.user?.id);

      // Step 2: Sign in to get a definitive session
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        console.error("[ArtistSetupAccount] Sign-in after signup failed:", signInError);
        setSetupError("Account created but sign-in failed. Please go to Artist Login to continue.");
        setIsSubmitting(false);
        return;
      }

      console.log("[ArtistSetupAccount] Step 3: Signed in, session user:", signInData.user?.id);

      // Step 3: Finalize artist setup (creates role + profile in DB)
      const accessToken = signInData.session?.access_token;
      if (!accessToken) {
        console.error("[ArtistSetupAccount] No access token after sign-in");
        setSetupError("Session error. Please go to Artist Login to continue.");
        setIsSubmitting(false);
        return;
      }

      const { data: finalizeData, error: finalizeError } = await supabase.functions.invoke(
        "finalize-artist-setup",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          body: { application_id: resolvedApplicationId },
        }
      );

      // The edge function is the SOLE authority for role + profile + link.
      // If it fails, we must block — no partial success states.
      if (finalizeData?.error_code === "ALREADY_LINKED") {
        setSetupError("This application is already linked to another account. Please log in or contact support.");
        setIsSubmitting(false);
        return;
      }

      if (finalizeData?.error_code === "NOT_APPROVED") {
        setSetupError("Your application has not been approved yet. Please wait for approval before creating an account.");
        setIsSubmitting(false);
        return;
      }

      if (finalizeError || !finalizeData?.success) {
        const errorMsg = finalizeData?.message || finalizeError?.message || "Unknown error";
        console.error("[ArtistSetupAccount] ❌ Finalize FAILED (hard block):", errorMsg);
        setSetupError(`Artist setup failed: ${errorMsg}. Please try again or contact support.`);
        setIsSubmitting(false);
        return;
      }

      console.log("[ArtistSetupAccount] ✅ Finalize succeeded — role, profile, and link all confirmed:", finalizeData);

      // Step 4: Refresh role in AuthContext so ProtectedRoute sees "artist"
      console.log("[ArtistSetupAccount] Step 5: Refreshing role in AuthContext...");
      const newRole = await refreshRole();
      console.log("[ArtistSetupAccount] Role after refresh:", newRole);

      if (!newRole) {
        console.warn("[ArtistSetupAccount] Role is still null after refresh, retrying once...");
        // Small delay to allow DB propagation, then retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryRole = await refreshRole();
        console.log("[ArtistSetupAccount] Role after retry:", retryRole);
        
        if (!retryRole) {
          setSetupError("Account created but role setup is taking longer than expected. Please go to Artist Login.");
          setIsSubmitting(false);
          return;
        }
      }

      // Step 5: Navigate to dashboard
      console.log("[ArtistSetupAccount] Step 6: Navigating to /artist/dashboard");
      toast.success("Account setup complete! Welcome aboard.");
      navigate("/artist/dashboard", { replace: true });
    } catch (error) {
      console.error("[ArtistSetupAccount] Unexpected setup error:", error);
      setSetupError("An unexpected error occurred. Please try again or go to Artist Login.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Setup error state - shown instead of infinite spinner
  if (setupError) {
    const isAlreadyRegistered = setupError === "ALREADY_REGISTERED";
    const isWeakPassword = setupError === "PASSWORD_WEAK";

    const errorTitle = isAlreadyRegistered
      ? "Account Already Exists"
      : isWeakPassword
      ? "Password Not Accepted"
      : "Setup Issue";

    const errorMessage = isAlreadyRegistered
      ? "An account with this email already exists. Please log in with your existing password, or reset it if you've forgotten it."
      : isWeakPassword
      ? "That password has appeared in a data breach and can't be used. Please choose a different, more secure password."
      : setupError;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
          <div className="container max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm uppercase tracking-wider">Back</span>
            </button>
            <button
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-8">
          <GlowCard className="max-w-md w-full p-8 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
              isAlreadyRegistered ? "bg-amber-500/10" : "bg-destructive/10"
            }`}>
              <AlertCircle className={`w-8 h-8 ${
                isAlreadyRegistered ? "text-amber-500" : "text-destructive"
              }`} />
            </div>
            <h1 className="font-display text-xl font-bold text-foreground mb-3">
              {errorTitle}
            </h1>
            <p className="text-muted-foreground mb-6">
              {errorMessage}
            </p>
            <div className="space-y-3">
              {isAlreadyRegistered ? (
                <>
                  <Button className="w-full" onClick={() => navigate("/artist/login")}>
                    Go to Artist Login
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => navigate(`/forgot-password?type=artist`)}>
                    Reset Password
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={handleRetrySetup} className="w-full">
                    Try Again
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => navigate("/artist/login")}>
                    Go to Artist Login
                  </Button>
                </>
              )}
            </div>
          </GlowCard>
        </main>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not found - no application record
  if (applicationStatus === "not_found") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
          <div className="container max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm uppercase tracking-wider">Back</span>
            </button>
            <button
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-8">
          <GlowCard className="max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="font-display text-xl font-bold text-foreground mb-3">
              No Approved Application Found
            </h1>
            <p className="text-muted-foreground mb-2">
              {lookupError || "We couldn't find an approved application matching this link."}
            </p>
            <p className="text-xs text-muted-foreground/70 mb-6">
              If you've already applied, check your email for the correct link or contact support.
            </p>
            <div className="space-y-3">
              <Button className="w-full" onClick={() => navigate("/artist/apply")}>
                Apply as Artist
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/artist/login")}>
                Already have an account? Login
              </Button>
            </div>
          </GlowCard>
        </main>
      </div>
    );
  }

  // Already linked to another account
  if (applicationStatus === "already_linked") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
          <div className="container max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm uppercase tracking-wider">Back</span>
            </button>
            <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
              <Home className="w-5 h-5" />
            </button>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-8">
          <GlowCard className="max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="font-display text-xl font-bold text-foreground mb-3">
              Account Already Created
            </h1>
            <p className="text-muted-foreground mb-6">
              This application is already linked to an existing account. Please log in with your existing credentials.
            </p>
            <div className="space-y-3">
              <Button className="w-full" onClick={() => navigate("/artist/login")}>
                Go to Artist Login
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => navigate("/")}>
                Return Home
              </Button>
            </div>
          </GlowCard>
        </main>
      </div>
    );
  }

  // Not approved - pending/rejected
  if (applicationStatus === "pending" || applicationStatus === "not_approved" || applicationStatus === "rejected") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
          <div className="container max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm uppercase tracking-wider">Back</span>
            </button>
            <button
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-8">
          <GlowCard className="max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
            <h1 className="font-display text-xl font-bold text-foreground mb-3">
              {applicationStatus === "rejected" ? "Application Not Approved" : "Application Under Review"}
            </h1>
            <p className="text-muted-foreground mb-6">
              {applicationStatus === "rejected"
                ? "Your application was not approved this time. You can re-apply anytime."
                : "Your application hasn't been approved yet. Please check your application status."}
            </p>
            <Button onClick={() => applicationStatus === "rejected" ? navigate("/artist/apply") : navigate("/artist/application-status")}>
              {applicationStatus === "rejected" ? "Re-Apply" : "Check Application Status"}
            </Button>
          </GlowCard>
        </main>
      </div>
    );
  }

  // Already active - they should log in instead
  if (applicationStatus === "active") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
          <div className="container max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm uppercase tracking-wider">Back</span>
            </button>
            <button
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-8">
          <GlowCard className="max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-xl font-bold text-foreground mb-3">
              Account Already Created
            </h1>
            <p className="text-muted-foreground mb-6">
              This artist account is already set up. Please log in to continue.
            </p>
            <Button onClick={() => navigate("/artist/login")}>Go to Artist Login</Button>
          </GlowCard>
        </main>
      </div>
    );
  }

  // No email provided or not found
  if (applicationStatus === "no_email" || applicationStatus === "not_found") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
          <div className="container max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm uppercase tracking-wider">Back</span>
            </button>
            <button
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-8">
          <GlowCard className="max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="font-display text-xl font-bold text-foreground mb-3">
              Create Your Account
            </h1>
            <p className="text-muted-foreground mb-6">
              Enter the email you applied with to continue setup.
            </p>

            <div className="space-y-3 text-left">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Application Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  className="bg-muted/30"
                  disabled={isLookingUpEmail}
                />
                {lookupError ? <p className="text-destructive text-xs mt-1">{lookupError}</p> : null}
              </div>

              <Button className="w-full" onClick={handleLookupApprovedEmail} disabled={isLookingUpEmail}>
                {isLookingUpEmail ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Continue
              </Button>
            </div>

            <div className="space-y-3">
              <Button variant="outline" className="w-full" onClick={() => navigate("/artist/login")}>
                Already have an account? Login
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => navigate("/artist/apply")}>
                Need to apply? Start here
              </Button>
            </div>
          </GlowCard>
        </main>
      </div>
    );
  }

  // Main setup form
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm uppercase tracking-wider">Back</span>
          </button>
          <button
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-8">
        <GlowCard className="max-w-md w-full p-8">
          {/* Success Badge */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-green-500 text-sm font-semibold uppercase tracking-wider">
              Application Approved
            </span>
          </div>

          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
            <Mic2 className="w-8 h-8 text-accent" />
          </div>

          <h1 className="font-display text-2xl font-bold text-foreground text-center mb-2">
            Create Your Account
          </h1>
          
          <p className="text-muted-foreground text-center mb-6">
            Create your login credentials to access your artist dashboard
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email (read-only) */}
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                Email
              </label>
              <Input
                type="email"
                value={email}
                readOnly
                className="bg-muted/50 text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This is the email from your application
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                Create Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`bg-muted/30 pr-10 ${errors.password ? "border-destructive" : ""}`}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-destructive text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`bg-muted/30 pr-10 ${errors.confirmPassword ? "border-destructive" : ""}`}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-destructive text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-border/30 pt-4" />

            {/* Terms Checkbox */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="agreeTerms"
                checked={agreeTerms}
                onCheckedChange={(checked) => setAgreeTerms(checked === true)}
                disabled={isSubmitting}
                className="mt-0.5"
              />
              <label 
                htmlFor="agreeTerms" 
                className={`text-sm leading-relaxed cursor-pointer ${errors.agreeTerms ? "text-destructive" : "text-muted-foreground"}`}
              >
                I agree to the Music Exclusive{" "}
                <Link 
                  to="/artist-agreement" 
                  target="_blank"
                  className="text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Artist Participation Agreement
                </Link>{" "}
                and confirm I own or control all rights to the Content I upload.
              </label>
            </div>

            {/* Rights Checkbox */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="confirmRights"
                checked={confirmRights}
                onCheckedChange={(checked) => setConfirmRights(checked === true)}
                disabled={isSubmitting}
                className="mt-0.5"
              />
              <label 
                htmlFor="confirmRights" 
                className={`text-sm leading-relaxed cursor-pointer ${errors.confirmRights ? "text-destructive" : "text-muted-foreground"}`}
              >
                I confirm the music I upload has not been released publicly yet OR I have the right to release it early on Music Exclusive.
              </label>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full mt-6" 
              disabled={isSubmitting || !agreeTerms || !confirmRights}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              COMPLETE SETUP
            </Button>
          </form>
        </GlowCard>
      </main>
    </div>
  );
};

export default ArtistSetupAccount;
