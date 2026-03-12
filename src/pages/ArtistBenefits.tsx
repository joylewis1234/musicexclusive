import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/Header"
import { GlowCard } from "@/components/ui/GlowCard"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { 
  DollarSign, 
  FlaskConical, 
  Users, 
  ArrowRight, 
  Zap, 
  BarChart3, 
  MessageSquare,
  Eye,
  Sparkles,
  Crown,
  ChevronDown,
  Trophy,
  Target,
  Gift,
  Music
} from "lucide-react"

const ArtistBenefits = () => {
  const navigate = useNavigate()

  const scrollToEarnings = () => {
    const element = document.getElementById("earnings-example")
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* SECTION 1 — HERO */}
      <section className="relative px-4 pt-24 pb-16 overflow-hidden">
        <div className="container max-w-lg md:max-w-2xl mx-auto text-center">
          {/* Animated glow background */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-secondary/20 blur-[80px] rounded-full animate-pulse [animation-delay:1s]" />
          </div>

          <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight text-foreground mb-6 animate-fade-up">
            Turn Your Pre-Release Into{" "}
            <span className="gradient-text">Real Weekly Income.</span>
          </h1>

          <p className="text-muted-foreground text-lg md:text-xl font-body mb-10 max-w-md mx-auto animate-fade-up [animation-delay:100ms]">
            Drop exclusive music first on Music Exclusive and get paid more per stream — before you release everywhere else.
          </p>

          <div className="flex flex-col gap-4 items-center animate-fade-up [animation-delay:200ms]">
            <Button 
              size="lg" 
              className="w-full max-w-xs text-base animate-glow-pulse"
              onClick={() => navigate("/artist/apply")}
            >
              <Crown className="w-5 h-5 mr-2" />
              Apply as an Exclusive Artist
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full max-w-xs"
              onClick={scrollToEarnings}
            >
              See Earnings Example
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* SECTION 2 — WHY THIS WORKS */}
      <section className="px-4 py-16 bg-background-elevated">
        <div className="container max-w-lg md:max-w-3xl mx-auto">
          <SectionHeader title="Why This Works" align="center" />

          <div className="grid gap-4 mt-8">
            {/* Card 1 */}
            <GlowCard glowColor="primary" className="w-full">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 border border-primary/40">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-foreground font-bold mb-2">
                      Get Paid More Per Stream
                    </h3>
                    <p className="text-muted-foreground text-sm font-body leading-relaxed">
                      Every stream on Music Exclusive is valued higher — because fans are here for YOU, not background listening.
                    </p>
                  </div>
                </div>
              </div>
            </GlowCard>

            {/* Card 2 */}
            <GlowCard glowColor="secondary" className="w-full">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center flex-shrink-0 border border-secondary/40">
                    <FlaskConical className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-foreground font-bold mb-2">
                      Use It As A Testing Ground
                    </h3>
                    <p className="text-muted-foreground text-sm font-body leading-relaxed">
                      Test hooks, track order, artwork, and fan reactions before you drop on Spotify/Apple.
                    </p>
                  </div>
                </div>
              </div>
            </GlowCard>

            {/* Card 3 */}
            <GlowCard glowColor="accent" className="w-full">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0 border border-accent/40">
                    <Users className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-foreground font-bold mb-2">
                      Build An Exclusive Fan Club
                    </h3>
                    <p className="text-muted-foreground text-sm font-body leading-relaxed">
                      Give your real fans early access, private drops, and a reason to come directly to you.
                    </p>
                  </div>
                </div>
              </div>
            </GlowCard>
          </div>
        </div>
      </section>

      {/* SECTION 3 — FAN CONVERSION VISUAL */}
      <section id="earnings-example" className="px-4 py-16 scroll-mt-20">
        <div className="container max-w-lg md:max-w-3xl mx-auto">
          <SectionHeader title="Here's How Fast This Can Add Up…" align="center" />

          {/* Funnel Visual */}
          <div className="mt-10 space-y-6">
            {/* Top funnel - Social fans */}
            <GlowCard glowColor="subtle" className="w-full">
              <div className="p-6 text-center">
                <div className="flex justify-center mb-3">
                  <div className="flex -space-x-1">
                    {[...Array(8)].map((_, i) => (
                      <div 
                        key={i} 
                        className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center"
                      >
                        <Users className="w-3 h-3 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-3xl font-display font-black text-foreground">10,000</p>
                <p className="text-muted-foreground text-sm uppercase tracking-wider">Social Fans</p>
              </div>
            </GlowCard>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="flex flex-col items-center gap-1">
                <ArrowRight className="w-6 h-6 text-primary rotate-90" />
                <span className="text-xs text-primary font-display uppercase tracking-wider">1% Convert</span>
              </div>
            </div>

            {/* Converted fans */}
            <GlowCard glowColor="primary" className="w-full">
              <div className="p-6 text-center">
                <div className="flex justify-center mb-3">
                  <div className="flex -space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <div 
                        key={i} 
                        className="w-8 h-8 rounded-full bg-primary/30 border-2 border-primary/50 flex items-center justify-center"
                      >
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-3xl font-display font-black text-primary">100</p>
                <p className="text-muted-foreground text-sm uppercase tracking-wider">Fans Inside Music Exclusive</p>
              </div>
            </GlowCard>

            {/* Math breakdown */}
            <GlowCard glowColor="gradient" className="w-full" variant="elevated">
              <div className="p-6">
                <div className="space-y-3 text-sm font-body">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fans converted:</span>
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
                      <span className="text-foreground font-display uppercase tracking-wider">Weekly Earnings:</span>
                      <span className="text-2xl font-display font-black gradient-text">$100/week</span>
                    </div>
                  </div>
                </div>
              </div>
            </GlowCard>
          </div>

          {/* Now imagine THIS booster */}
          <div className="mt-10">
            <p className="text-center text-primary font-display uppercase tracking-widest text-sm mb-4 animate-pulse">
              ✨ Now imagine THIS…
            </p>
            
            <GlowCard glowColor="primary" className="w-full" variant="elevated">
              <div className="p-6 bg-primary/5">
                <div className="space-y-3 text-sm font-body">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Convert 3% (300 fans)</span>
                    <span className="text-foreground font-semibold">300 fans</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Each streams 20 songs/week:</span>
                    <span className="text-foreground font-semibold">6,000 streams</span>
                  </div>
                  <div className="border-t border-primary/30 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-foreground font-display uppercase tracking-wider">Weekly Earnings:</span>
                      <span className="text-3xl font-display font-black text-primary text-glow">$600/week</span>
                    </div>
                  </div>
                </div>
                <p className="text-center text-primary/80 text-xs font-display uppercase tracking-wider mt-4">
                  That's BEFORE Spotify. BEFORE Apple. This is your pre-release income.
                </p>
              </div>
            </GlowCard>
          </div>

          {/* Fan binge scenario */}
          <div className="mt-6">
            <GlowCard glowColor="secondary" className="w-full">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-secondary" />
                  <span className="font-display text-sm uppercase tracking-wider text-secondary">Fan Binge Scenario</span>
                </div>
                <div className="space-y-2 text-sm font-body">
                  <p className="text-muted-foreground">100 fans × 30 streams/week = <span className="text-foreground font-semibold">3,000 streams</span></p>
                  <p className="text-2xl font-display font-bold text-foreground">$300/week</p>
                </div>
                <p className="text-secondary/80 text-xs font-display uppercase tracking-wider mt-3">
                  When fans get exclusive access, they binge. That's the point.
                </p>
              </div>
            </GlowCard>
          </div>
        </div>
      </section>

      {/* SECTION 4 — THE $1,000/WEEK MOMENT */}
      <section className="px-4 py-16 bg-background-elevated">
        <div className="container max-w-lg md:max-w-3xl mx-auto">
          <SectionHeader 
            title="$1,000/Week From A Small Fan Base" 
            align="center" 
          />
          <p className="text-center text-primary font-display text-sm uppercase tracking-widest mt-2 mb-8">
            (Yes, Really)
          </p>

          {/* Big funnel visual */}
          <div className="space-y-4">
            <GlowCard glowColor="subtle" className="w-full">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Users className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <span className="text-muted-foreground text-sm">10,000 Social Fans</span>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </GlowCard>

            <GlowCard glowColor="primary" className="w-full">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-foreground text-sm font-semibold">Convert 5% = 500 fans</span>
                </div>
                <ArrowRight className="w-5 h-5 text-primary" />
              </div>
            </GlowCard>

            <GlowCard glowColor="gradient" variant="elevated" className="w-full">
              <div className="p-6 text-center">
                <p className="text-muted-foreground text-sm mb-2">500 fans × 20 streams/week = 10,000 streams</p>
                <p className="text-muted-foreground text-sm mb-4">10,000 × $0.10 = </p>
                <p className="text-4xl md:text-6xl font-display font-black gradient-text text-glow">
                  $1,000/week
                </p>
                <p className="text-muted-foreground text-sm mt-4 font-body">
                  to the artist
                </p>
              </div>
            </GlowCard>
          </div>

          {/* Hype copy */}
          <div className="mt-8 text-center space-y-4">
            <p className="text-foreground font-body text-base">
              That's real weekly income from your pre-release drops — <span className="text-primary font-semibold">BEFORE Spotify. BEFORE Apple. BEFORE the world hears it.</span>
            </p>
            
            <GlowCard glowColor="primary" className="w-full mt-6">
              <div className="p-5 text-center">
                <p className="text-foreground font-display text-sm uppercase tracking-wider leading-relaxed">
                  There is <span className="text-primary font-bold">NO</span> other streaming platform where a serious artist can earn this much in one week from a small group of real fans.
                </p>
              </div>
            </GlowCard>

            <div className="bg-primary/10 border border-primary/30 rounded-xl p-5 mt-6">
              <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-foreground font-body text-sm italic">
                "This is what happens when fans stream with intention — and artists get paid what they deserve."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — WHY FANS WILL FOLLOW */}
      <section className="px-4 py-16">
        <div className="container max-w-lg md:max-w-2xl mx-auto">
          <SectionHeader 
            title="Getting Fans To Move Over Is Easier Than You Think." 
            align="left" 
            framed 
          />

          <ul className="mt-8 space-y-4">
            {[
              "Exclusive music they can't hear anywhere else (for 3 weeks or more)",
              "They feel like insiders — like a private listening party",
              "They're supporting you directly just by listening",
              "You can send them a 'Vault Invite' with one link"
            ].map((item, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-xs font-bold">✓</span>
                </div>
                <p className="text-foreground font-body text-sm leading-relaxed">{item}</p>
              </li>
            ))}
          </ul>

          <GlowCard glowColor="secondary" className="w-full mt-8">
            <div className="p-5 text-center">
              <p className="text-foreground font-display text-sm uppercase tracking-wider">
                You're not competing with playlists. You're building your own lane.
              </p>
            </div>
          </GlowCard>
        </div>
      </section>

      {/* SECTION 6 — MORE BENEFITS */}
      <section className="px-4 py-16 bg-background-elevated">
        <div className="container max-w-lg md:max-w-2xl mx-auto">
          <SectionHeader 
            title="More Ways Artists Win Here" 
            align="left" 
            framed 
          />

          <div className="mt-8 grid gap-3">
            {[
              { icon: DollarSign, text: "Pre-release income before DSP release" },
              { icon: MessageSquare, text: "Instant feedback loop: see which songs hit" },
              { icon: Zap, text: "Higher engagement from real fans" },
              { icon: BarChart3, text: "Better data: track what fans replay" },
              { icon: Eye, text: "Exclusive positioning: you're not buried under 100k uploads/day" },
            ].map((item, index) => (
              <GlowCard key={index} glowColor="subtle" className="w-full">
                <div className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-foreground font-body text-sm">{item.text}</p>
                </div>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7 — CASH BONUS PROGRAM */}
      <section className="px-4 py-16">
        <div className="container max-w-lg md:max-w-3xl mx-auto">
          <SectionHeader title="Earn Up To $300 In Cash Bonuses" align="center" />

          <p className="text-center text-muted-foreground font-body text-base mt-2 mb-8 max-w-md mx-auto">
            On top of your streaming income, hit verified milestones and unlock <span className="text-primary font-semibold">real cash bonuses</span> paid straight to your account.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {[
              { streams: "1,000", bonus: "$25", icon: Target },
              { streams: "2,500", bonus: "$50", icon: Target },
              { streams: "5,000", bonus: "$100", icon: Gift },
              { streams: "10,000", bonus: "$125", icon: Gift },
            ].map((m, i) => (
              <GlowCard key={i} glowColor="primary" className="w-full">
                <div className="p-4 text-center">
                  <m.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{m.streams} streams</p>
                  <p className="text-2xl font-display font-black text-foreground mt-1">{m.bonus}</p>
                </div>
              </GlowCard>
            ))}
          </div>

          <GlowCard glowColor="gradient" variant="elevated" className="w-full mt-6">
            <div className="p-6 text-center">
              <Sparkles className="w-7 h-7 text-primary mx-auto mb-2" />
              <p className="text-3xl font-display font-black gradient-text">$300 Total</p>
              <p className="text-muted-foreground text-sm font-body mt-2">
                Earned on top of every cent you make from streams.
              </p>
            </div>
          </GlowCard>

          <div className="mt-6 space-y-2">
            {[
              "Milestones unlock sequentially — hit one to unlock the next",
              "Bonuses are paid via your weekly payout schedule",
              "One-time per artist — stack them all to $300",
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-[10px] font-bold">✓</span>
                </div>
                <p className="text-muted-foreground text-sm font-body">{rule}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 8 — EXCLUSIVE CHARTS BONUS PROGRAM */}
      <section className="px-4 py-16 bg-background-elevated">
        <div className="container max-w-lg md:max-w-3xl mx-auto">
          <SectionHeader title="Compete For Annual Chart Prizes" align="center" />

          <p className="text-center text-muted-foreground font-body text-base mt-2 mb-4 max-w-md mx-auto">
            After you complete all four Cash Bonus milestones, you unlock eligibility for the <span className="text-primary font-semibold">Exclusive Charts</span> — an annual competition with real prize money.
          </p>

          <div className="space-y-3 mt-8">
            {[
              { place: "1st Place", prize: "$500", icon: Crown, color: "primary" as const },
              { place: "2nd Place", prize: "$250", icon: Trophy, color: "secondary" as const },
              { place: "3rd Place", prize: "$100", icon: Trophy, color: "accent" as const },
            ].map((tier, i) => (
              <GlowCard key={i} glowColor={tier.color} className="w-full">
                <div className="p-5 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-${tier.color}/20 flex items-center justify-center flex-shrink-0 border border-${tier.color}/40`}>
                    <tier.icon className={`w-6 h-6 text-${tier.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-display text-lg text-foreground font-bold">{tier.place}</p>
                    <p className="text-muted-foreground text-sm">per genre, per year</p>
                  </div>
                  <p className="text-2xl font-display font-black gradient-text">{tier.prize}</p>
                </div>
              </GlowCard>
            ))}
          </div>

          <div className="mt-8">
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-display mb-3 text-center">Eligible Genres</p>
            <div className="grid grid-cols-2 gap-2">
              {["Pop", "Hip-Hop / Rap", "Latin Music", "Country", "EDM", "Rock", "Phonk & Trap", "K-Pop", "Alternative / Indie", "R&B"].map((genre) => (
                <div key={genre} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                  <Music className="w-3.5 h-3.5 text-primary" />
                  <span className="text-foreground text-sm font-body">{genre}</span>
                </div>
              ))}
            </div>
          </div>

          <GlowCard glowColor="primary" className="w-full mt-8">
            <div className="p-5 text-center">
              <p className="text-foreground font-display text-sm uppercase tracking-wider leading-relaxed">
                Compete in multiple genres. <span className="text-primary font-bold">Get paid in all of them.</span>
              </p>
              <p className="text-muted-foreground text-xs mt-2 font-body">
                Once you qualify, you're eligible for life — no re-enrollment needed.
              </p>
            </div>
          </GlowCard>
        </div>
      </section>

      {/* SECTION 9 — CTA (Strong Close) */}
      <section className="px-4 py-20">
        <div className="container max-w-lg md:max-w-md mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-display font-black text-foreground mb-6">
            Your Next Release Should{" "}
            <span className="gradient-text">Pay You Twice.</span>
          </h2>

          <div className="flex flex-col gap-4">
            <Button 
              size="lg" 
              className="w-full animate-glow-pulse"
              onClick={() => navigate("/artist/apply")}
            >
              <Crown className="w-5 h-5 mr-2" />
              Apply as an Exclusive Artist
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full"
              onClick={() => navigate("/")}
            >
              Back to Home
            </Button>
          </div>

          <p className="text-muted-foreground text-xs font-display uppercase tracking-wider mt-8">
            Early access is limited. We accept serious artists only.
          </p>
        </div>
      </section>

      {/* Spacer */}
      <div className="h-12" />
    </div>
  )
}

export default ArtistBenefits
