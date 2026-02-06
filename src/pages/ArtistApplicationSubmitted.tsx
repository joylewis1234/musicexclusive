import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ArrowLeft, Home, Clock, Mail } from "lucide-react";

const ArtistApplicationSubmitted = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const artistName = state?.artistName || "Artist";
  const applicationId = state?.applicationId || null;

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-lg md:max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Go home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
            Application Submitted
          </span>

          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Go home"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-12 px-4">
        <div className="container max-w-lg md:max-w-xl mx-auto">
          <div className="text-center mb-8">
            <SectionHeader title="Application Received" align="center" framed />
          </div>

          <GlowCard className="p-6 text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            
            <h2 className="font-display text-xl font-bold text-foreground mb-3">
              Thanks for Applying, {artistName}!
            </h2>
            
            <p className="text-muted-foreground text-sm font-body mb-4 leading-relaxed">
              Your application is under review.
              <br />
              You will receive an email once approved.
            </p>

            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-4">
              <Mail className="w-4 h-4 text-primary" />
              <span className="text-primary text-sm font-display uppercase tracking-wider">
                Check Your Inbox
              </span>
            </div>

            <p className="text-muted-foreground text-xs font-body">
              Review typically takes 3-5 business days.
            </p>

            {/* Debug: Application ID */}
            {applicationId && (
              <div className="mt-4 p-2 bg-muted/20 rounded-lg border border-border/30">
                <p className="text-[10px] text-muted-foreground/60 font-mono break-all">
                  Application ID: {applicationId}
                </p>
              </div>
            )}
          </GlowCard>

          {/* What Happens Next */}
          <GlowCard className="p-5 mb-6">
            <h3 className="font-display text-xs uppercase tracking-widest text-primary mb-4">
              What Happens Next
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs text-muted-foreground">1</span>
                </div>
                <p className="text-muted-foreground text-sm font-body">
                  Our team reviews your music and profile
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs text-muted-foreground">2</span>
                </div>
                <p className="text-muted-foreground text-sm font-body">
                  You receive an email with your approval status
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs text-muted-foreground">3</span>
                </div>
                <p className="text-muted-foreground text-sm font-body">
                  If approved, click the link in the email to create your artist account
                </p>
              </li>
            </ul>
          </GlowCard>

          <Button
            size="lg"
            variant="secondary"
            className="w-full"
            onClick={() => navigate("/")}
          >
            Return to Home
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ArtistApplicationSubmitted;
