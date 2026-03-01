import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  Crown,
  DollarSign,
  Star,
  Sparkles,
  Users,
  ArrowRight,
  Shield,
  Zap,
  Eye,
  Music,
} from "lucide-react";

const ArtistWaitlist = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* HERO */}
      <section className="relative px-4 pt-24 pb-16 overflow-hidden">
        <div className="container max-w-lg md:max-w-2xl mx-auto text-center">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-secondary/20 blur-[80px] rounded-full animate-pulse [animation-delay:1s]" />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-xs font-display uppercase tracking-widest text-primary">Founding Artist Program</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight text-foreground mb-6 animate-fade-up">
            Become a{" "}
            <span className="gradient-text">Founding Artist.</span>
          </h1>

          <p className="text-muted-foreground text-lg md:text-xl font-body mb-10 max-w-md mx-auto animate-fade-up [animation-delay:100ms]">
            Join Music Exclusive before launch. Get early access, priority placement, and earn more per stream than any other platform.
          </p>

          <Button
            size="lg"
            className="w-full max-w-xs text-base animate-glow-pulse"
            onClick={() => navigate("/artist-waitlist/apply")}
          >
            <Crown className="w-5 h-5 mr-2" />
            Apply to Join the Waitlist
          </Button>
        </div>
      </section>

      {/* WHAT IS MUSIC EXCLUSIVE */}
      <section className="px-4 py-16 bg-background-elevated">
        <div className="container max-w-lg md:max-w-3xl mx-auto">
          <SectionHeader title="What Is Music Exclusive?" align="center" />

          <div className="grid gap-4 mt-8">
            <GlowCard glowColor="primary" className="w-full">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 border border-primary/40">
                    <Music className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-foreground font-bold mb-2">Artist-First Streaming</h3>
                    <p className="text-muted-foreground text-sm font-body leading-relaxed">
                      An exclusive pre-release music platform where fans stream your music before it's available anywhere else.
                    </p>
                  </div>
                </div>
              </div>
            </GlowCard>

            <GlowCard glowColor="secondary" className="w-full">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center flex-shrink-0 border border-secondary/40">
                    <DollarSign className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-foreground font-bold mb-2">$0.10 Per Stream — To You</h3>
                    <p className="text-muted-foreground text-sm font-body leading-relaxed">
                      Superfans pay $0.20 per stream. You earn $0.10 directly. No ad-based pennies, no algorithm lottery.
                    </p>
                  </div>
                </div>
              </div>
            </GlowCard>

            <GlowCard glowColor="accent" className="w-full">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0 border border-accent/40">
                    <Users className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-foreground font-bold mb-2">Direct Fan Monetization</h3>
                    <p className="text-muted-foreground text-sm font-body leading-relaxed">
                      Build stronger fan relationships. Your most dedicated listeners support you directly just by streaming.
                    </p>
                  </div>
                </div>
              </div>
            </GlowCard>
          </div>
        </div>
      </section>

      {/* EARNINGS VISUAL */}
      <section className="px-4 py-16">
        <div className="container max-w-lg md:max-w-3xl mx-auto">
          <SectionHeader title="Your Earning Potential" align="center" />

          <div className="grid gap-6 md:grid-cols-2 mt-10">
            {/* Scenario 1 */}
            <GlowCard glowColor="gradient" className="w-full" variant="elevated">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="font-display text-sm uppercase tracking-wider text-primary">Scenario 1</span>
                </div>
                <div className="space-y-3 text-sm font-body">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fans:</span>
                    <span className="text-foreground font-semibold">100 fans</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Streams per fan/week:</span>
                    <span className="text-foreground font-semibold">10 streams</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total weekly streams:</span>
                    <span className="text-foreground font-semibold">1,000 streams</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Artist rate per stream:</span>
                    <span className="text-primary font-semibold">$0.10</span>
                  </div>
                  <div className="border-t border-border pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-foreground font-display uppercase tracking-wider text-xs">Weekly:</span>
                      <span className="text-2xl font-display font-black text-green-400">$100</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-foreground font-display uppercase tracking-wider text-xs">Monthly:</span>
                      <span className="text-2xl font-display font-black text-green-400">$400</span>
                    </div>
                  </div>
                </div>
              </div>
            </GlowCard>

            {/* Scenario 2 */}
            <GlowCard glowColor="primary" className="w-full" variant="elevated">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-primary" />
                  <span className="font-display text-sm uppercase tracking-wider text-primary">Scenario 2</span>
                </div>
                <div className="space-y-3 text-sm font-body">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fans:</span>
                    <span className="text-foreground font-semibold">600 fans</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Streams per fan/week:</span>
                    <span className="text-foreground font-semibold">10 streams</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total weekly streams:</span>
                    <span className="text-foreground font-semibold">6,000 streams</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Artist rate per stream:</span>
                    <span className="text-primary font-semibold">$0.10</span>
                  </div>
                  <div className="border-t border-border pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-foreground font-display uppercase tracking-wider text-xs">Weekly:</span>
                      <span className="text-2xl font-display font-black text-green-400">$600</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-foreground font-display uppercase tracking-wider text-xs">Monthly:</span>
                      <span className="text-3xl font-display font-black text-green-400 text-glow">$2,400</span>
                    </div>
                  </div>
                </div>
              </div>
            </GlowCard>
          </div>

          <GlowCard glowColor="primary" className="w-full mt-6">
            <div className="p-5 text-center">
              <p className="text-foreground font-display text-sm uppercase tracking-wider leading-relaxed">
                This is <span className="text-primary font-bold">BEFORE</span> Spotify. <span className="text-primary font-bold">BEFORE</span> Apple. This is your pre-release income.
              </p>
            </div>
          </GlowCard>
        </div>
      </section>

      {/* FOUNDING ARTIST BENEFITS */}
      <section className="px-4 py-16 bg-background-elevated">
        <div className="container max-w-lg md:max-w-3xl mx-auto">
          <SectionHeader title="Founding Artist Benefits" align="center" />
          <p className="text-center text-primary font-display text-sm uppercase tracking-widest mt-2 mb-8">
            Launching in 2026 — Artists accepted in waves
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              { icon: Star, title: "Early Access", desc: "Be among the first artists on the platform before public launch." },
              { icon: Crown, title: "Founding Artist Badge", desc: "Exclusive badge displayed on your profile permanently." },
              { icon: Eye, title: "Priority Discovery", desc: "Featured placement in discovery feeds and recommendations." },
              { icon: DollarSign, title: "Early Monetization", desc: "Start earning before the platform opens to all artists." },
              { icon: Sparkles, title: "Exclusive Releases", desc: "Priority access to exclusive release opportunities." },
              { icon: Shield, title: "Direct Support", desc: "Dedicated onboarding support from our team." },
            ].map((benefit, i) => (
              <GlowCard key={i} glowColor="subtle" className="w-full">
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 border border-primary/40">
                      <benefit.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display text-sm text-foreground font-bold mb-1">{benefit.title}</h3>
                      <p className="text-muted-foreground text-xs font-body leading-relaxed">{benefit.desc}</p>
                    </div>
                  </div>
                </div>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16">
        <div className="container max-w-lg md:max-w-md mx-auto text-center">
          <h2 className="text-foreground mb-4 text-2xl font-display font-black">
            Ready to join?
          </h2>
          <p className="text-muted-foreground text-sm font-body mb-8">
            Founding spots are limited. Apply now and secure your place.
          </p>
          <Button
            size="lg"
            className="w-full max-w-xs text-base animate-glow-pulse"
            onClick={() => navigate("/artist-waitlist/apply")}
          >
            <Crown className="w-5 h-5 mr-2" />
            Apply to Join the Waitlist
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ArtistWaitlist;
