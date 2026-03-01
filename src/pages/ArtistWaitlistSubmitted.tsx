import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { GlowCard } from "@/components/ui/GlowCard";
import { Crown, CheckCircle } from "lucide-react";

const ArtistWaitlistSubmitted = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16 px-4">
        <div className="container max-w-lg mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border border-primary/40">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-display font-black text-foreground mb-4">
            You're on the list.
          </h1>

          <GlowCard className="p-6 mb-6">
            <div className="space-y-4 text-sm text-muted-foreground font-body">
              <p>
                Thank you for applying to become a <span className="text-primary font-semibold">Founding Artist</span> on Music Exclusive.
              </p>
              <p>
                We review applications in waves. When you're approved, you'll receive an email with instructions to complete your full artist onboarding.
              </p>
              <p className="text-primary/80 font-display uppercase tracking-wider text-xs">
                Founding spots are limited — launching 2026.
              </p>
            </div>
          </GlowCard>

          <p className="text-xs text-muted-foreground mb-6">
            Check your email for a confirmation message.
          </p>

          <Button variant="outline" onClick={() => navigate("/")} className="w-full max-w-xs">
            Back to Home
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ArtistWaitlistSubmitted;
