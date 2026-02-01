import { useNavigate } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { ArrowLeft, Music, Mic2, Shield } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();

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
        <div className="max-w-md w-full space-y-6">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">
              Welcome to Music Exclusive
            </h1>
            <p className="text-muted-foreground">
              Choose how you want to sign in
            </p>
          </div>

          {/* Fan Login Option */}
          <button
            onClick={() => navigate("/auth/fan")}
            className="w-full text-left group"
          >
            <GlowCard className="p-6 transition-all duration-300 hover:border-primary/50 group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.2)]">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Music className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="font-display text-lg font-bold text-foreground mb-1">
                    Fan Login
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Access exclusive music and discover new artists
                  </p>
                </div>
              </div>
            </GlowCard>
          </button>

          {/* Artist Login Option */}
          <button
            onClick={() => navigate("/artist/login")}
            className="w-full text-left group"
          >
            <GlowCard className="p-6 transition-all duration-300 hover:border-accent/50 group-hover:shadow-[0_0_20px_hsl(var(--accent)/0.2)]">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Mic2 className="w-7 h-7 text-accent" />
                </div>
                <div className="flex-1">
                  <h2 className="font-display text-lg font-bold text-foreground mb-1">
                    Artist Login
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Manage your music and connect with fans
                  </p>
                </div>
              </div>
            </GlowCard>
          </button>

          {/* Admin Login Option */}
          <button
            onClick={() => navigate("/admin/login")}
            className="w-full text-left group"
          >
            <GlowCard className="p-6 transition-all duration-300 hover:border-muted-foreground/50 group-hover:shadow-[0_0_20px_hsl(var(--muted-foreground)/0.2)]">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Shield className="w-7 h-7 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h2 className="font-display text-lg font-bold text-foreground mb-1">
                    Admin Login
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Platform administration access
                  </p>
                </div>
              </div>
            </GlowCard>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-border/50" />
            <span className="text-muted-foreground text-xs uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          {/* New User Links */}
          <div className="text-center space-y-2">
            <p className="text-muted-foreground text-sm">
              New to Music Exclusive?
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => navigate("/vault/enter")}
                className="text-primary text-sm hover:underline"
              >
                Enter the Vault
              </button>
              <span className="text-muted-foreground">•</span>
              <button
                onClick={() => navigate("/artist/apply")}
                className="text-accent text-sm hover:underline"
              >
                Apply as Artist
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
