import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Shield, Loader2, LogOut } from "lucide-react";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { toast } from "sonner";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, role, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const nextUrl = searchParams.get("next") || "/admin";

  console.log("[AdminLogin] Rendered. user:", user?.id?.slice(0, 8), "role:", role, "next:", nextUrl);

  // If user is logged in as non-admin, show "switch to admin" prompt
  const isLoggedInAsNonAdmin = user && role && role !== "admin";

  const handleSignOutAndStay = async () => {
    setIsSigningOut(true);
    console.log("[AdminLogin] Signing out non-admin user to switch to admin login");
    try {
      await supabase.auth.signOut();
      toast.success("Signed out. Please log in with your admin credentials.");
    } catch (err) {
      console.error("[AdminLogin] Sign out failed:", err);
      toast.error("Failed to sign out");
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        toast.error(error.message || "Invalid credentials");
        setIsLoading(false);
        return;
      }

      console.log("[AdminLogin] Login successful, redirecting to:", nextUrl);
      toast.success("Welcome back, Admin!");
      navigate(nextUrl);
    } catch (err) {
      toast.error("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
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

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-8">
        <div className="max-w-md w-full">
          <GlowCard className="p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary" />
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                Admin Access
              </h1>
              <p className="text-muted-foreground text-sm">
                Sign in to access the admin dashboard
              </p>
            </div>

            {/* Non-admin user is logged in — show switch prompt */}
            {isLoggedInAsNonAdmin ? (
              <div className="space-y-4">
                <div className="bg-muted/20 border border-border/30 rounded-xl p-4 text-center">
                  <p className="text-muted-foreground text-sm mb-1">
                    You're currently signed in as a <strong className="text-foreground">{role}</strong>.
                  </p>
                  <p className="text-muted-foreground text-xs">
                    To access admin features, please sign out and log in with your admin credentials.
                  </p>
                </div>
                <Button
                  onClick={handleSignOutAndStay}
                  disabled={isSigningOut}
                  className="w-full"
                  variant="outline"
                >
                  {isSigningOut ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing out...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4 mr-2" />
                      Log Out and Continue to Admin Login
                    </>
                  )}
                </Button>
              </div>
            ) : (
              /* Standard login form */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <PasswordInput
                    id="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="flex justify-end">
                  <Link
                    to="/forgot-password?type=admin"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            )}

            {/* Footer */}
            <p className="text-center text-muted-foreground text-xs mt-6">
              This area is restricted to platform administrators only.
            </p>
          </GlowCard>
        </div>
      </main>
    </div>
  );
};

export default AdminLogin;
