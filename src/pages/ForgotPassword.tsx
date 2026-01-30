import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlowCard } from "@/components/ui/GlowCard";
import { ArrowLeft, Mail, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [searchParams] = useSearchParams();
  const userType = searchParams.get("type") || "fan";
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-password-reset", {
        body: { email, userType },
      });

      if (error) throw error;

      setIsSuccess(true);
      toast.success("Check your email for the reset link");
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const backLink = userType === "artist" ? "/artist/login" : "/auth/fan";
  const title = userType === "artist" ? "Artist Password Reset" : "Fan Password Reset";

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-purple-950/20 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <GlowCard className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">Check Your Email</h1>
            <p className="text-muted-foreground mb-6">
              We've sent a password reset link to <span className="text-primary font-medium">{email}</span>
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              Click the link in the email to reset your password. The link expires in 1 hour.
            </p>
            <Link to={backLink}>
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </Link>
          </GlowCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-purple-950/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link 
          to={backLink} 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>

        <GlowCard className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-muted-foreground mt-2">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background/50"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Remember your password?{" "}
            <Link to={backLink} className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </GlowCard>
      </div>
    </div>
  );
};

export default ForgotPassword;
