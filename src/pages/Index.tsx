import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/Header"
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
import artistRockFemale from "@/assets/artist-rock-female.jpg"
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
  { name: "Raven Cross", genre: "Rock", imageUrl: artistRockFemale },
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
    title: "TRY AGAIN TOMORROW",
    description: "If you win, the Vault opens — revealing exclusive music and artist experiences. If you lose, you're automatically re-entered for the next draw.",
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
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Artist Preview Strip - Social Proof */}
      <section className="pt-20 pb-4 overflow-hidden">
        <ArtistPreviewStrip artists={artists} />
      </section>
      
      {/* Hero Section */}
      <section className="relative px-4 pt-4 pb-8 overflow-hidden text-center">
        <div className="container max-w-lg md:max-w-2xl mx-auto">
          {/* Micro-Explainer */}
          <p 
            className="text-lg md:text-2xl font-display uppercase tracking-[0.3em] mb-6 animate-fade-up opacity-0 gradient-text animate-glow-pulse"
            style={{ 
              textShadow: '0 0 10px hsl(var(--primary) / 0.8), 0 0 30px hsl(var(--primary) / 0.5), 0 0 60px hsl(var(--primary) / 0.3), 0 0 100px hsl(var(--primary) / 0.15)',
              filter: 'brightness(1.15)',
            }}
          >
            Music. Released here first.
          </p>
          
          {/* Hero Text */}
          <h1 className="text-foreground mb-6 animate-fade-up [animation-delay:100ms] opacity-0">
            STEP INSIDE THE VAULT:
            <br />
            <span className="text-muted-foreground">THE FUTURE OF MUSIC IS HERE.</span>
          </h1>
          
          <div className="text-muted-foreground text-base md:text-lg mb-4 font-body animate-fade-up [animation-delay:200ms] opacity-0 max-w-sm mx-auto space-y-3" style={{ textShadow: '0 0 20px hsl(var(--primary) / 0.3), 0 0 40px hsl(var(--primary) / 0.15)' }}>
            <p>First access. First listen. Before anywhere else.</p>
            <p>Exclusive music from your favorite artists, only on Music Exclusive.</p>
          </div>
          
          {/* Primary CTA */}
          <div className="flex flex-col gap-4 items-center animate-fade-up [animation-delay:300ms] opacity-0">
            <Button 
              size="lg" 
              className="w-full max-w-xs"
              onClick={() => navigate("/preview")}
            >
              Preview Exclusive Music
            </Button>
            <Button 
              size="lg" 
              className="w-full max-w-xs text-sm md:text-base whitespace-normal h-auto py-3"
              onClick={() => navigate("/vault/enter")}
            >
              Try Your Luck, Enter the Lottery Vault
            </Button>
            
            {/* Superfan CTA with skip-lottery highlight */}
            <div className="relative w-full max-w-xs">
              <Button 
                variant="secondary" 
                size="lg" 
                className="w-full"
                onClick={() => navigate("/auth/fan", { state: { flow: "superfan" } })}
              >
                Unlock Superfan Access
              </Button>
              <p className="text-primary text-xs font-display uppercase tracking-wider mt-2 text-center animate-pulse">
                ✨ Skip the lottery — guaranteed access
              </p>
            </div>
            
          </div>
        </div>
      </section>

      {/* Vault Portal Section */}
      <section className="relative px-4 py-8 overflow-hidden">
        <div className="container max-w-lg md:max-w-4xl mx-auto">
          {/* Try Your Luck Header */}
          <div className="text-center mb-8">
            <p className="text-3xl md:text-4xl font-display font-black tracking-wider text-foreground mb-4 text-glow">
              TRY YOUR LUCK
            </p>
            <div className="flex justify-center items-center gap-3">
              <ChevronDown className="w-8 h-8 text-primary animate-bounce" />
              <ChevronDown className="w-8 h-8 text-primary animate-bounce [animation-delay:150ms]" />
              <ChevronDown className="w-8 h-8 text-primary animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
          
          {/* Vault Portal Image */}
          <div className="relative mx-auto w-full max-w-md aspect-square">
            {/* Neon pink trailing ring - needs absolute positioning within relative parent */}
            <div className="animate-vault-ring absolute inset-[35px] rounded-full" style={{ zIndex: 20 }} />
            
            {/* Animated glow orbs behind */}
            <div className="absolute inset-0 bg-secondary/30 blur-[80px] rounded-full scale-75 animate-pulse" />
            <div className="absolute inset-0 bg-accent/20 blur-[60px] rounded-full scale-90 animate-pulse [animation-delay:1s]" />
            <div className="absolute inset-0 bg-primary/20 blur-[70px] rounded-full scale-80 animate-pulse [animation-delay:0.5s]" />
            
            {/* Static vault portal image with breathing glow */}
            <img
              src={vaultPortal}
              alt="Vault Portal"
              className="relative w-full h-full object-contain vault-glow"
            />
            
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

      {/* Second Vault Portal Section */}
      <section className="relative px-4 py-8 overflow-hidden">
        <div className="container max-w-lg md:max-w-4xl mx-auto">
          {/* Try Your Luck Header */}
          <div className="text-center mb-8">
            <p className="text-3xl md:text-4xl font-display font-black tracking-wider text-foreground mb-4 text-glow">
              TRY YOUR LUCK
            </p>
            <div className="flex justify-center items-center gap-3">
              <ChevronDown className="w-8 h-8 text-primary animate-bounce" />
              <ChevronDown className="w-8 h-8 text-primary animate-bounce [animation-delay:150ms]" />
              <ChevronDown className="w-8 h-8 text-primary animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
          
          {/* Vault Portal Image */}
          <div className="relative mx-auto w-full max-w-md aspect-square">
            {/* Neon pink trailing ring - needs absolute positioning within relative parent */}
            <div className="animate-vault-ring absolute inset-[35px] rounded-full" style={{ zIndex: 20 }} />
            
            {/* Animated glow orbs behind */}
            <div className="absolute inset-0 bg-secondary/30 blur-[80px] rounded-full scale-75 animate-pulse" />
            <div className="absolute inset-0 bg-accent/20 blur-[60px] rounded-full scale-90 animate-pulse [animation-delay:1s]" />
            <div className="absolute inset-0 bg-primary/20 blur-[70px] rounded-full scale-80 animate-pulse [animation-delay:0.5s]" />
            
            {/* Static vault portal image with breathing glow */}
            <img
              src={vaultPortal}
              alt="Vault Portal"
              className="relative w-full h-full object-contain vault-glow"
            />
            
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
          
          {/* Superfan CTA under second vault */}
          <div className="relative w-full max-w-xs mx-auto mt-8">
            <Button 
              variant="secondary" 
              size="lg" 
              className="w-full"
              onClick={() => navigate("/auth/fan", { state: { flow: "superfan" } })}
            >
              Unlock Superfan Access
            </Button>
            <p className="text-primary text-xs font-display uppercase tracking-wider mt-2 text-center animate-pulse">
              ✨ Skip the lottery — guaranteed access
            </p>
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


      {/* Bottom CTA Section */}
      <section className="px-4 py-16">
        <div className="container max-w-lg md:max-w-md mx-auto text-center">
          <h2 className="text-foreground mb-4">
            Want a taste before entering the Vault?
          </h2>
          <p className="text-muted-foreground text-sm font-body mb-8">
            Listen to previews, then enter the Vault Lottery or join as a Superfan for instant access.
          </p>
          
          <div className="flex flex-col gap-3">
            <Button 
              size="lg" 
              className="w-full"
              onClick={() => navigate("/preview")}
            >
              Preview Exclusive Music
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
              onClick={() => navigate("/auth/fan", { state: { flow: "superfan" } })}
            >
              <span className="block text-center leading-tight">
                Want Access Now?<br />Become a Superfan
              </span>
            </Button>
            
            {/* Artist CTA */}
            <Button 
              variant="outline" 
              size="default" 
              className="mt-4 text-xs tracking-widest"
              onClick={() => navigate("/artist/apply")}
            >
              Music Artists Apply Here
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

    </div>
  )
}

export default Index
