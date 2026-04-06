import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  Star,
  Shield,
  Music,
  Crown,
  Zap,
  Check,
  ArrowDown,
} from "lucide-react";

const benefits = [
  "Lifetime access to Music Exclusive",
  "Permanent Vault bypass",
  "Early entry at launch",
  "Access to exclusive releases",
  "Founding Superfan recognition badge",
  "Priority announcements and drops",
];

const FoundingSuperfan = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [favoriteGenre, setFavoriteGenre] = useState("");
  const [favoriteArtist, setFavoriteArtist] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const scrollToForm = () => {
    document.getElementById("founding-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !email.trim()) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-fan-waitlist", {
        body: {
          first_name: firstName.trim(),
          email: email.trim(),
          favorite_genre: favoriteGenre.trim() || null,
          favorite_artist: favoriteArtist.trim() || null,
        },
      });

      if (error) throw error;

      // Check for non-200 responses
      if (data?.error) {
        if (data.error.includes("already registered")) {
          toast({
            title: "Already Registered",
            description: "This email is already on the Founding Superfan list.",
            variant: "destructive",
          });
        } else {
          toast({ title: "Error", description: data.error, variant: "destructive" });
        }
        setSubmitting(false);
        return;
      }

      navigate("/founding-superfan/confirmed");
    } catch (err: any) {
      console.error("Submit error:", err);
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="pt-24 pb-16 px-4 text-center">
        <div className="container max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-display uppercase tracking-widest mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Founding Superfan
          </div>

          <h1 className="text-foreground mb-4">
            Become a Founding Superfan.
          </h1>
          <p className="text-lg text-muted-foreground font-body mb-6 max-w-lg mx-auto">
            Secure lifetime access to Music Exclusive before the Vault opens in 2026.
          </p>

          <div className="text-sm text-muted-foreground font-body space-y-3 max-w-md mx-auto mb-8 text-left">
            <p className="text-foreground font-semibold text-center">
              Music Exclusive is redefining streaming.
            </p>
            <p>Inside the Vault, fans unlock:</p>
            <ul className="space-y-1.5 pl-4">
              <li className="flex items-start gap-2">
                <Music className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                Exclusive music releases
              </li>
              <li className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                Direct artist support through paid streams
              </li>
              <li className="flex items-start gap-2">
                <Star className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                Superfan recognition
              </li>
              <li className="flex items-start gap-2">
                <Crown className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                Priority access to live sessions
              </li>
              <li className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                A closer connection to the artists they love
              </li>
            </ul>
            <p className="text-center pt-2">
              We're launching in 2026.
              <br />
              <span className="text-primary font-medium">
                And early supporters will never need to compete for access.
              </span>
            </p>
          </div>

          <Button size="lg" className="gap-2" onClick={scrollToForm}>
            <Sparkles className="w-4 h-4" />
            Secure My Lifetime Access
          </Button>
        </div>
      </section>

      {/* What Makes This Different */}
      <section className="px-4 py-16 bg-background-elevated">
        <div className="container max-w-2xl mx-auto">
          <SectionHeader title="Why Music Exclusive Is Different" align="left" framed />
          <div className="mt-8 space-y-4 text-sm text-muted-foreground font-body leading-relaxed">
            <p>Traditional streaming platforms prioritize algorithms.</p>
            <p className="text-foreground font-medium">
              Music Exclusive prioritizes artists — and the superfans who truly support them.
            </p>
            <GlowCard className="p-5 mt-6">
              <p className="text-foreground font-semibold text-sm mb-3">Inside the Vault:</p>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  Every stream directly supports artists
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  Superfans unlock exclusive music
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  Access is curated, not crowded
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  Early supporters are recognized permanently
                </li>
              </ul>
            </GlowCard>
            <p className="text-center pt-4 text-foreground font-medium">
              This isn't open to everyone.
              <br />
              It's built for those who move early.
            </p>
          </div>
        </div>
      </section>

      {/* Lifetime Access Benefits */}
      <section className="px-4 py-16">
        <div className="container max-w-2xl mx-auto">
          <SectionHeader title="Your Founding Superfan Benefits" align="left" framed />
          <div className="mt-8">
            <GlowCard className="p-6">
              <ul className="space-y-3">
                {benefits.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-foreground">{b}</span>
                  </li>
                ))}
              </ul>
            </GlowCard>
            <p className="text-center text-sm text-muted-foreground mt-6">
              When the Vault opens, you won't be waiting.
              <br />
              <span className="text-primary font-semibold">You'll already be inside.</span>
            </p>

            <div className="flex justify-center mt-6">
              <Button variant="outline" className="gap-2" onClick={scrollToForm}>
                <ArrowDown className="w-4 h-4" />
                Join the Founding Superfan List
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Form */}
      <section id="founding-form" className="px-4 py-16 bg-background-elevated scroll-mt-20">
        <div className="container max-w-md mx-auto">
          <SectionHeader title="Reserve Your Spot" align="center" />
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <GlowCard className="p-6 space-y-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Your first name"
                  required
                  maxLength={100}
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  maxLength={255}
                />
              </div>
              <div>
                <Label htmlFor="genre">Favorite Genre (optional)</Label>
                <Input
                  id="genre"
                  value={favoriteGenre}
                  onChange={(e) => setFavoriteGenre(e.target.value)}
                  placeholder="e.g. R&B, Hip Hop, Pop"
                  maxLength={100}
                />
              </div>
              <div>
                <Label htmlFor="artist">Favorite Artist (optional)</Label>
                <Input
                  id="artist"
                  value={favoriteArtist}
                  onChange={(e) => setFavoriteArtist(e.target.value)}
                  placeholder="e.g. SZA, Drake, Billie Eilish"
                  maxLength={100}
                />
              </div>
              <Button type="submit" size="lg" className="w-full gap-2" disabled={submitting}>
                <Sparkles className="w-4 h-4" />
                {submitting ? "Reserving..." : "Reserve My Lifetime Access"}
              </Button>
            </GlowCard>
          </form>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FoundingSuperfan;
