import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { GlowCard } from "@/components/ui/GlowCard";
import { supabase } from "@/integrations/supabase/client";
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
  const [searchParams] = useSearchParams();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [lookupEmail, setLookupEmail] = useState("");
  const [isLookingUpEmail, setIsLookingUpEmail] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [confirmRights, setConfirmRights] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof SetupFormData, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Get email from URL params or check for pending setup applications
  useEffect(() => {
    const checkApplication = async () => {
      const emailParam = searchParams.get("email");
      
      if (emailParam) {
        // Use backend lookup to bypass RLS (artist_applications is not publicly readable)
        const { data, error } = await supabase.functions.invoke("lookup-artist-application", {
          body: { email: emailParam },
        });

        if (error || !data?.success) {
          console.warn("[ArtistSetupAccount] lookup failed:", error || data);
          setApplicationStatus("not_found");
          setIsLoading(false);
          return;
        }

        if (!data.found) {
          setApplicationStatus("not_found");
          setIsLoading(false);
          return;
        }

        setEmail(String(data.email ?? emailParam));
        setLookupEmail(String(data.email ?? emailParam));
        setApplicationStatus(String(data.status));
      } else {
        // No email provided - allow manual lookup (some email clients strip query params)
        setApplicationStatus("no_email");
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
      const { data, error } = await supabase.functions.invoke("lookup-artist-application", {
        body: { email: trimmed },
      });

      if (error || !data?.success) {
        console.warn("[ArtistSetupAccount] lookup failed:", error || data);
        setLookupError("We couldn't verify that email right now. Please try again shortly.");
        return;
      }

      if (!data.found) {
        setLookupError("We couldn't find an application for that email. Please check the email address and try again.");
        return;
      }

      const status = String(data.status);
      setEmail(String(data.email ?? trimmed));
      setApplicationStatus(status);

      if (status === "approved" || status === "approved_pending_setup") {
        toast.success("Approved application found. Create your password to continue.");
      } else if (status === "pending") {
        setLookupError("Your application is still under review. You'll receive an email once it's approved.");
      } else if (status === "rejected") {
        setLookupError("Your application was not approved. You can re-apply anytime at the Artist Apply page.");
      } else if (status === "active") {
        setLookupError("Your account is already set up. Please log in instead.");
      }
    } catch (err) {
      console.error("[ArtistSetupAccount] lookup error:", err);
      setLookupError("Something went wrong. Please try again.");
    } finally {
      setIsLookingUpEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

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
      // First try to create the auth account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            display_name: email.split("@")[0],
          },
        },
      });

      if (signUpError) {
        // If user already exists, try to sign them in instead
        if (signUpError.message.includes("already registered") || 
            signUpError.message.includes("already been registered")) {
          console.log("User already exists, attempting sign in...");
          
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            toast.error("This email is already registered. Please try logging in at /artist/login or use 'Forgot Password' if needed.");
            setIsSubmitting(false);
            return;
          }

          // User signed in successfully - finalize and redirect
          const accessToken = signInData.session?.access_token;
          if (accessToken) {
            await supabase.functions.invoke("finalize-artist-setup", {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
          }

          toast.success("Welcome back!");
          navigate("/artist/dashboard", { replace: true });
          return;
        } else {
          toast.error(signUpError.message);
          setIsSubmitting(false);
          return;
        }
      }

      // New signup successful - with auto-confirm, we should have a session
      // But to be safe, sign in explicitly to ensure we have a valid session
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error("Sign in after signup failed:", signInError);
        // The account was created but we couldn't sign in - this shouldn't happen with auto-confirm
        toast.error("Account created! Please log in with your new credentials.");
        navigate("/artist/login", { replace: true });
        return;
      }

      // Now we definitely have a session - call finalize
      const accessToken = signInData.session?.access_token;
      if (accessToken) {
        const { error: finalizeError } = await supabase.functions.invoke(
          "finalize-artist-setup",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (finalizeError) {
          console.error("Error finalizing artist setup:", finalizeError);
          // Continue anyway - login fallback will handle it
        }
      }

      toast.success("Account setup complete!");
      navigate("/artist/dashboard", { replace: true });
    } catch (error) {
      console.error("Setup error:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not approved - redirect
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
              Application Under Review
            </h1>
            <p className="text-muted-foreground mb-6">
              Your application hasn't been approved yet. Please check your application status.
            </p>
            <Button onClick={() => navigate("/artist/application-status")}>
              Check Application Status
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
