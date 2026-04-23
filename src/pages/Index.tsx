import { useState } from "react"
import CashBonusFeed from "@/components/home/CashBonusFeed"
import ChartsTeaser from "@/components/home/ChartsTeaser"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/Header"
import { VaultLockedModal } from "@/components/vault/VaultLockedModal"
import Footer from "@/components/Footer"
import { ArtistCard } from "@/components/ArtistCard"
import { ArtistPreviewStrip } from "@/components/ArtistPreviewStrip"
import { ArtistCardCarousel } from "@/components/ArtistCardCarousel"
import { StepCard } from "@/components/StepCard"
import { BenefitCard } from "@/components/BenefitCard"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { KeyRound, Send, RotateCcw, ChevronDown } from "lucide-react"
import vaultPortal from "@/assets/vault-portal.png"
import artistNovaRae from "@/assets/artist-nova-rae.jpg"
import artistKairoBlaze from "@/assets/artist-kairo-blaze.jpg"
import artistSkyeMonroe from "@/assets/artist-skye-monroe.jpg"
import artistZionChase from "@/assets/artist-zion-chase.jpg"
import artistLunaVale from "@/assets/artist-luna-vale.jpg"
import artistEdenReign from "@/assets/artist-eden-reign.jpg"
import artistElectronic from "@/assets/artist-electronic.jpg"
import artistRavenCross from "@/assets/artist-raven-cross.jpg"
import artistLatinMale from "@/assets/artist-latin-male.jpg"
import artistCountryFemale from "@/assets/artist-country-female.jpg"
import artistJazz from "@/assets/artist-jazz.jpg"
import artistLofi from "@/assets/artist-lofi.jpg"

const artists = [
  { name: "Nova Rae", genre: "Alt Pop", imageUrl: artistNovaRae },
  { name: "Kairo Blaze", genre: "Afrobeats", imageUrl: artistKairoBlaze },
  { name: "Skye Monroe", genre: "R&B / Soul", imageUrl: artistSkyeMonroe },
  { name: "Zion Chase", genre: "Hip Hop", imageUrl: artistZionChase },
  { name: "Luna Vale", genre: "Indie Pop", imageUrl: artistLunaVale },
  { name: "Eden Reign", genre: "Christian", imageUrl: artistEdenReign },
  { name: "Axel Volt", genre: "Electronic", imageUrl: artistElectronic },
  { name: "Raven Cross", genre: "Rock", imageUrl: artistRavenCross },
  { name: "Marco Sol", genre: "Latin", imageUrl: artistLatinMale },
  { name: "Cassidy Lane", genre: "Country", imageUrl: artistCountryFemale },
  { name: "Miles Ivory", genre: "Jazz", imageUrl: artistJazz },
  { name: "Yuki Haze", genre: "Lo-Fi", imageUrl: artistLofi },
]

const steps = [
  {
    stepNumber: 1,
    title: "ENTER THE VAULT",
    description: "Enter your name and email to receive your Vault code.",
    icon: KeyRound,
  },
  {
    stepNumber: 2,
    title: "SUBMIT",
    description: "Enter your Vault code and attempt to unlock access.",
    icon: Send,
  },
  {
    stepNumber: 3,
    title: "GET INSIDE",
    description: "When your code is triggered, the Vault opens — revealing exclusive music and artist experiences. If not yet activated, you'll be notified by email as soon as your access is ready.",
    icon: RotateCcw,
  },
]

const benefits = [
  {
    number: 1,
    title: "Be the First",
    description: "Hear exclusive music before it's released to the world.",
  },
  {
    number: 2,
    title: "Support Artists Directly",
    description: "Every stream directly supports the artist you're listening to.",
  },
  {
    number: 3,
    title: "Exclusive Access",
    description: "Private releases, early drops, and Vault-only experiences.",
  },
]

const Index = () => {
  const navigate = useNavigate()
  const [vaultLocked, setVaultLocked] = useState(false)
  
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <Header />
      <VaultLockedModal open={vaultLocked} onOpenChange={setVaultLocked} />

      {/* Artist Preview Strip - Social Proof */}
      <section className="pt-20 pb-4 overflow-hidden">
        <ArtistPreviewStrip artists={artists} />
      </section>
      
      {/* Hero Section */}
      <section className="relative px-4 pt-4 pb-8 overflow-hidden text-center">
        <div className="container max-w-lg md:max-w-2xl mx-auto flex flex-col items-center gap-6">
          {/* Micro-Explainer */}
          <p 
            className="text-lg md:text-2xl font-display uppercase tracking-[0.3em] animate-fade-up opacity-0 gradient-text animate-glow-pulse"
            style={{ 
              textShadow: '0 0 10px hsl(var(--primary) / 0.8), 0 0 30px hsl(var(--primary) / 0.5), 0 0 60px hsl(var(--primary) / 0.3), 0 0 100px hsl(var(--primary) / 0.15)',
              filter: 'brightness(1.15)',
            }}
          >
            Music. Released here first.
          </p>
          
          {/* Hero Text */}
          <h1 className="text-foreground animate-fade-up [animation-delay:100ms] opacity-0">
            STEP INSIDE THE VAULT:
            <br />
            <span className="text-muted-foreground">THE FUTURE OF MUSIC IS HERE.</span>
          </h1>
          
          <div className="text-muted-foreground text-base md:text-lg font-body animate-fade-up [animation-delay:200ms] opacity-0 max-w-sm mx-auto space-y-3" style={{ textShadow: '0 0 20px hsl(var(--primary) / 0.3), 0 0 40px hsl(var(--primary) / 0.15)' }}>
            <p>First access. First listen.<br />Before anywhere else.</p>
            <p>Exclusive music from your favorite artists, only on Music Exclusive.</p>
          </div>

          {/* Vault Portal (moved under hero copy) */}
          <div className="w-full">
            {/* Get Access Now Header */}
            <div className="text-center mb-8">
              <p className="text-3xl md:text-4xl font-display font-black tracking-wider text-foreground mb-4 text-glow">
                TWO WAYS TO GET ACCESS
              </p>
              <div className="flex justify-center items-center gap-3">
                <ChevronDown className="w-8 h-8 text-primary animate-bounce" />
                <ChevronDown className="w-8 h-8 text-primary animate-bounce [animation-delay:150ms]" />
                <ChevronDown className="w-8 h-8 text-primary animate-bounce [animation-delay:300ms]" />
              </div>
            </div>

            {/* Vault Portal Image */}
            <div className="relative mx-auto w-full max-w-md md:max-w-lg aspect-square">
              {/* Neon pink trailing ring - needs absolute positioning within relative parent */}
              <div className="animate-vault-ring absolute inset-[35px] rounded-full" style={{ zIndex: 20 }} />

              {/* Animated glow orbs behind */}
              <div className="absolute inset-0 bg-secondary/40 blur-[120px] rounded-full scale-90 animate-pulse" />
              <div className="absolute inset-0 bg-accent/30 blur-[100px] rounded-full scale-100 animate-pulse [animation-delay:1s]" />
              <div className="absolute inset-0 bg-primary/30 blur-[90px] rounded-full scale-95 animate-pulse [animation-delay:0.5s]" />

              {/* Inner radial vignette to brighten background behind portal */}
              <div
                className="absolute inset-[10%] rounded-full"
                style={{
                  background: 'radial-gradient(circle, hsl(var(--primary) / 0.25) 0%, transparent 70%)',
                  filter: 'blur(40px)',
                }}
              />

              {/* Static vault portal image with breathing glow */}
              <div
                className="relative w-full h-full"
                style={{
                  maskImage: 'radial-gradient(circle at center, black 35%, transparent 72%)',
                  WebkitMaskImage: 'radial-gradient(circle at center, black 35%, transparent 72%)',
                }}
              >
                <img
                  src={vaultPortal}
                  alt="Vault Portal"
                  className="w-full h-full object-contain vault-glow mix-blend-screen"
                />
              </div>

              {/* Inner energy lightning effect - overlaid on top with blend mode */}
              <div className="absolute inset-[20%] rounded-full overflow-hidden pointer-events-none mix-blend-screen">
                <div className="absolute inset-0 animate-vault-lightning-1 opacity-70" />
                <div className="absolute inset-0 animate-vault-lightning-2 opacity-60" />
                <div className="absolute inset-0 animate-vault-lightning-3 opacity-50" />
              </div>

              {/* Center button overlay */}
              <Button
                variant="ghost"
                size="lg"
                onClick={() => navigate("/vault/enter")}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background/30 backdrop-blur-sm border border-primary/50 hover:bg-background/50 hover:border-primary text-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] transition-all duration-300 animate-glow-pulse"
              >
                Enter the Vault
              </Button>
            </div>
          </div>

          {/* Primary CTA */}
          <div className="flex flex-col gap-4 items-center animate-fade-up [animation-delay:300ms] opacity-0">
            {/* Superfan CTA */}
            <div className="relative w-full max-w-xs mx-auto mt-8 text-center">
              <p className="text-muted-foreground text-sm font-body text-center mb-2">or</p>
              <h2 className="text-foreground text-center mb-3">
                Become a superfan
              </h2>
              <p className="text-lg font-display font-bold text-foreground mb-1">
                Superfans don't wait.
              </p>
              <p className="text-muted-foreground text-sm font-body mb-4">
                Unlimited access to every exclusive release, starting now.
              </p>
              <Button 
                size="xl" 
                className="w-full animate-glow-pulse"
                onClick={() => navigate("/subscribe")}
              >
                Become a Superfan
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Vault Portal Section */}
      <section className="relative px-4 py-8 overflow-hidden">
        <div className="container max-w-lg md:max-w-4xl mx-auto">
          {/* MUSIC EXCLUSIVE Text */}
          <h2 className="text-center mt-4 text-3xl md:text-5xl font-display font-black tracking-[0.15em] gradient-text text-glow">
            MUSIC EXCLUSIVE<span className="text-muted-foreground text-xs md:text-sm align-super ml-1">™</span>
          </h2>
        </div>
      </section>

      {/* Artists Section */}
      <section className="py-12 overflow-hidden">
        <ArtistCardCarousel artists={artists} />
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="px-4 py-16 bg-background-elevated scroll-mt-20">
        <div className="container max-w-lg md:max-w-2xl mx-auto">
          <SectionHeader
            title="How It Works"
            align="left"
            framed
          />
          
          <div className="flex flex-col gap-4 mt-8">
            {steps.map((step) => (
              <StepCard
                key={step.stepNumber}
                stepNumber={step.stepNumber}
                title={step.title}
                description={step.description}
                icon={step.icon}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="px-4 py-16">
        <div className="container max-w-lg md:max-w-2xl mx-auto">
          <SectionHeader
            title="Benefits — For Fans"
            align="left"
            framed
          />
          
          <div className="flex flex-col gap-4 mt-8">
            {benefits.map((benefit) => (
              <BenefitCard
                key={benefit.number}
                number={benefit.number}
                title={benefit.title}
                description={benefit.description}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Cash Bonus Feed */}
      <section className="px-4 py-12">
        <div className="container max-w-lg md:max-w-2xl mx-auto text-center">
          <SectionHeader title="Your Streams Make a Difference" align="center" />
          <p className="text-muted-foreground text-sm font-body mt-4 max-w-md mx-auto leading-relaxed">
            Every time you stream on Music Exclusive, your support goes directly to the artist — not a faceless algorithm.
            Real fans funding real music. Here's what that looks like:
          </p>
        </div>
      </section>
      <CashBonusFeed />

      {/* Charts Teaser */}
      <ChartsTeaser />

      {/* Bottom CTA Section */}
      <section className="px-4 py-16">
        <div className="container max-w-lg md:max-w-md mx-auto text-center">
          <h2 className="text-foreground mb-4">
            Want a taste before entering the Vault?
          </h2>
          <p className="text-muted-foreground text-sm font-body mb-8">
            Listen to previews, then enter the Vault or join as a Superfan for instant access.
          </p>
          
          <div className="flex flex-col gap-3">
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full"
              onClick={() => navigate("/preview")}
            >
              Test Out Music Exclusive
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="w-full animate-glow-pulse"
              onClick={() => navigate("/vault/enter")}
            >
              Enter the Vault
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full h-auto py-3 whitespace-normal text-amber-400 border-amber-500/50 hover:border-amber-400 hover:bg-amber-500/10 shadow-[0_0_15px_rgba(251,191,36,0.3)] animate-glow-pulse"
              onClick={() => navigate("/founding-superfan")}
            >
              <span className="block text-center leading-tight">
                Want Access Now?<br />Become a Superfan
              </span>
            </Button>
          </div>

        </div>
      </section>

      {/* Are You an Artist? */}
      <section className="px-4 py-8 text-center">
        <p className="text-muted-foreground text-sm font-body mb-2">Are you an artist?</p>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary hover:text-primary/80"
          onClick={() => navigate("/artist-benefits")}
        >
          Learn how to earn on Music Exclusive →
        </Button>
      </section>

      {/* Footer */}
      <Footer />

    </div>
  )
}

export default Index
