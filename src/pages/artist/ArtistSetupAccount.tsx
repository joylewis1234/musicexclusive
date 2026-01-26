import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/GlowCard";
import { ArrowLeft, Home, Mic2, CheckCircle2 } from "lucide-react";

const ArtistSetupAccount = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
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
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-12 px-4">
        <div className="container max-w-lg mx-auto">
          <GlowCard className="p-8 text-center">
            {/* Icon */}
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
              <Mic2 className="w-10 h-10 text-accent" />
            </div>

            <h1 className="font-display text-2xl font-bold text-foreground mb-3">
              Complete Your Setup
            </h1>
            
            <p className="text-muted-foreground mb-8">
              Congratulations on being approved! Let's finish setting up your artist account.
            </p>

            {/* Setup Steps */}
            <div className="space-y-4 text-left mb-8">
              <div className="flex items-start gap-3 p-4 bg-muted/20 rounded-lg border border-border/30">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-foreground font-semibold text-sm">Application Approved</p>
                  <p className="text-muted-foreground text-xs">Your artist application has been accepted</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-muted/20 rounded-lg border border-accent/30">
                <div className="w-5 h-5 rounded-full border-2 border-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-accent text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="text-foreground font-semibold text-sm">Complete Profile</p>
                  <p className="text-muted-foreground text-xs">Add your bio, profile photo, and social links</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-muted/10 rounded-lg border border-border/20">
                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-muted-foreground/50 text-xs font-bold">3</span>
                </div>
                <div>
                  <p className="text-muted-foreground font-semibold text-sm">Upload Your First Track</p>
                  <p className="text-muted-foreground/70 text-xs">Share exclusive music with Vault members</p>
                </div>
              </div>
            </div>

            <Button 
              size="lg" 
              className="w-full"
              onClick={() => navigate("/artist/profile/edit")}
            >
              Continue Setup
            </Button>

            <p className="text-muted-foreground text-xs mt-4">
              You can complete this later from your dashboard
            </p>
          </GlowCard>
        </div>
      </main>
    </div>
  );
};

export default ArtistSetupAccount;
