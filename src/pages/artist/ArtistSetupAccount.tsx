import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { GlowCard } from "@/components/ui/GlowCard";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Home, Mic2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [confirmRights, setConfirmRights] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof SetupFormData, string>>>({});

  // Get email from URL params or check for pending setup applications
  useEffect(() => {
    const checkApplication = async () => {
      const emailParam = searchParams.get("email");
      
      if (emailParam) {
        // Verify this email has an approved application
        const { data, error } = await supabase
          .from("artist_applications")
          .select("status, contact_email")
          .eq("contact_email", emailParam)
          .maybeSingle();

        if (error || !data) {
          setApplicationStatus("not_found");
          setIsLoading(false);
          return;
        }

        if (data.status !== "approved" && data.status !== "approved_pending_setup") {
          setApplicationStatus(data.status);
          setIsLoading(false);
          return;
        }

        setEmail(data.contact_email);
        setApplicationStatus(data.status);
      } else {
        // No email provided - show error
        setApplicationStatus("no_email");
      }
      
      setIsLoading(false);
    };

    checkApplication();
  }, [searchParams]);

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
      // Create the auth account
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
        toast.error(signUpError.message);
        setIsSubmitting(false);
        return;
      }

      if (!signUpData.user) {
        toast.error("Failed to create account");
        setIsSubmitting(false);
        return;
      }

      // Insert artist role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: signUpData.user.id, role: "artist" });

      if (roleError) {
        console.error("Error inserting role:", roleError);
        // Continue anyway - role can be fixed later
      }

      // Update application status to active
      const { error: updateError } = await supabase
        .from("artist_applications")
        .update({ status: "active" })
        .eq("contact_email", email);

      if (updateError) {
        console.error("Error updating application status:", updateError);
      }

      toast.success("Account created successfully!");
      navigate("/artist/dashboard", { replace: true });
    } catch (error) {
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
              Setup Link Required
            </h1>
            <p className="text-muted-foreground mb-6">
              Please use the setup link from your approval email to complete your account setup.
            </p>
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
            Complete Your Setup
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
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`bg-muted/30 ${errors.password ? "border-destructive" : ""}`}
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="text-destructive text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                Confirm Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`bg-muted/30 ${errors.confirmPassword ? "border-destructive" : ""}`}
                disabled={isSubmitting}
              />
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
