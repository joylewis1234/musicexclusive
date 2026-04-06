import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Home } from "lucide-react";

const benefits = [
  "Lifetime access",
  "Permanent Vault bypass",
  "Early platform entry",
  "Access to exclusive music",
  "Founding Superfan recognition",
];

const FoundingSuperfanConfirmed = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="pt-24 pb-20 px-4">
        <div className="container max-w-lg mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-6">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>

          <h1 className="text-foreground mb-2">
            You're On the Founding Superfan List.
          </h1>
          <p className="text-lg text-muted-foreground font-body mb-8">
            Your lifetime access is reserved.
          </p>

          <GlowCard className="p-6 text-left mb-8">
            <p className="text-sm text-muted-foreground font-body mb-4">
              Music Exclusive launches in 2026.
              <br />
              Because you joined early, you will receive:
            </p>
            <ul className="space-y-2.5 mb-6">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-foreground">{b}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              We'll notify you before launch with your activation details.
            </p>
          </GlowCard>

          <p className="text-primary font-display text-sm uppercase tracking-widest mb-8 text-glow">
            The Vault opens soon.
          </p>

          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            onClick={() => navigate("/")}
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FoundingSuperfanConfirmed;
