import { useNavigate, Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/Header"
import { ArtistCard } from "@/components/ArtistCard"
import { ArtistPreviewStrip } from "@/components/ArtistPreviewStrip"
import { StepCard } from "@/components/StepCard"
import { BenefitCard } from "@/components/BenefitCard"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { KeyRound, Send, RotateCcw, FileText, ChevronDown } from "lucide-react"
import vaultPortal from "@/assets/vault-portal.png"
import artistNovaRae from "@/assets/artist-nova-rae.jpg"
import artistKairoBlaze from "@/assets/artist-kairo-blaze.jpg"
import artistSkyeMonroe from "@/assets/artist-skye-monroe.jpg"
import artistZionChase from "@/assets/artist-zion-chase.jpg"
import artistLunaVale from "@/assets/artist-luna-vale.jpg"
import artistEdenReign from "@/assets/artist-eden-reign.jpg"

const artists = [
  { name: "Nova Rae", genre: "Alt Pop", imageUrl: artistNovaRae },
  { name: "Kairo Blaze", genre: "Afrobeats", imageUrl: artistKairoBlaze },
  { name: "Skye Monroe", genre: "R&B / Soul", imageUrl: artistSkyeMonroe },
  { name: "Zion Chase", genre: "Hip Hop", imageUrl: artistZionChase },
  { name: "Luna Vale", genre: "Indie Pop", imageUrl: artistLunaVale },
  { name: "Eden Reign", genre: "Christian", imageUrl: artistEdenReign },
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
            className="text-base md:text-lg font-display uppercase tracking-[0.25em] mb-6 animate-fade-up opacity-0 gradient-text"
            style={{ textShadow: '0 0 40px hsl(var(--primary) / 0.5)' }}
          >
            Music. Released here first.
          </p>
          
          {/* Hero Text */}
          <h1 className="text-foreground mb-6 animate-fade-up [animation-delay:100ms] opacity-0">
            STEP INSIDE THE VAULT:
            <br />
            <span className="text-muted-foreground">THE FUTURE OF MUSIC IS HERE.</span>
          </h1>
          
          <p className="text-muted-foreground text-base md:text-lg mb-8 font-body animate-fade-up [animation-delay:200ms] opacity-0 max-w-sm mx-auto">
            Unlock early access to exclusive music before it hits Spotify and Apple Music.
          </p>
          
          {/* Primary CTA */}
          <div className="flex flex-col gap-4 items-center animate-fade-up [animation-delay:300ms] opacity-0">
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
            {/* Neon pink trailing ring */}
            <div className="animate-vault-ring" />
            
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
        <div className="container max-w-lg md:max-w-4xl mx-auto px-4 mb-6">
          {/* No header needed - just the carousel */}
        </div>
        
        {/* Continuous Scrolling Carousel */}
        <div className="relative overflow-hidden">
          <div className="flex gap-6 animate-scroll-cards hover:[animation-play-state:paused]">
            {/* First set */}
            {artists.map((artist) => (
              <ArtistCard
                key={artist.name}
                name={artist.name}
                genre={artist.genre}
                imageUrl={artist.imageUrl}
              />
            ))}
            {/* Duplicate set for seamless loop */}
            {artists.map((artist) => (
              <ArtistCard
                key={`${artist.name}-dup`}
                name={artist.name}
                genre={artist.genre}
                imageUrl={artist.imageUrl}
              />
            ))}
          </div>
        </div>
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
            {/* Neon pink trailing ring */}
            <div className="animate-vault-ring" />
            
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
          <div className="flex flex-col items-center mt-8 animate-fade-up">
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full max-w-xs h-auto py-3 whitespace-normal text-amber-400 border-amber-500/50 hover:border-amber-400 hover:bg-amber-500/10 shadow-[0_0_20px_rgba(251,191,36,0.4)] animate-glow-pulse"
              onClick={() => navigate("/auth/fan", { state: { flow: "superfan" } })}
            >
              <span className="block text-center leading-tight font-display tracking-wider">
                Unlock Superfan Access
              </span>
            </Button>
            <p className="text-amber-400/80 text-xs font-display uppercase tracking-wider mt-3 text-center animate-pulse">
              ✨ Skip the lottery — guaranteed instant access ✨
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
            Ready to Enter?
          </h2>
          <p className="text-muted-foreground text-sm font-body mb-8">
            Get instant access to the vault and unlock exclusive content from top artists.
          </p>
          
          <div className="flex flex-col gap-3">
            <Button 
              size="lg" 
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
      <footer className="px-4 py-12 border-t border-border/30">
        <div className="container max-w-lg md:max-w-xl mx-auto">
          {/* Legal Section */}
          <div className="text-center mb-8">
            <p className="text-primary/80 text-[11px] font-display uppercase tracking-[0.2em] mb-6">
              Legal
            </p>
            
            {/* 2-Column Grid of Legal Links */}
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mb-6">
              <Link 
                to="/terms" 
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-muted/30 border border-border/40 hover:border-primary/40 hover:bg-muted/50 transition-all group"
              >
                <FileText className="w-3.5 h-3.5 text-primary/70 group-hover:text-primary transition-colors" />
                <span className="text-foreground/90 text-xs font-medium">Terms of Use</span>
              </Link>
              <Link 
                to="/privacy" 
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-muted/30 border border-border/40 hover:border-primary/40 hover:bg-muted/50 transition-all group"
              >
                <FileText className="w-3.5 h-3.5 text-primary/70 group-hover:text-primary transition-colors" />
                <span className="text-foreground/90 text-xs font-medium">Privacy Policy</span>
              </Link>
              <Link 
                to="/dmca" 
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-muted/30 border border-border/40 hover:border-primary/40 hover:bg-muted/50 transition-all group"
              >
                <FileText className="w-3.5 h-3.5 text-primary/70 group-hover:text-primary transition-colors" />
                <span className="text-foreground/90 text-xs font-medium">Copyright & DMCA</span>
              </Link>
              <Link 
                to="/refunds" 
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-muted/30 border border-border/40 hover:border-primary/40 hover:bg-muted/50 transition-all group"
              >
                <FileText className="w-3.5 h-3.5 text-primary/70 group-hover:text-primary transition-colors" />
                <span className="text-foreground/90 text-xs font-medium">Refund Policy</span>
              </Link>
            </div>
            
            {/* Artist Agreement - Full Width */}
            <Link 
              to="/artist-agreement" 
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-muted/30 border border-border/40 hover:border-primary/40 hover:bg-muted/50 transition-all group max-w-sm mx-auto"
            >
              <FileText className="w-3.5 h-3.5 text-primary/70 group-hover:text-primary transition-colors" />
              <span className="text-foreground/90 text-xs font-medium">Artist Participation Agreement</span>
            </Link>
          </div>
          
          {/* Divider */}
          <div className="h-px bg-border/30 mb-6" />
          
          {/* Agreement Notice */}
          <p className="text-muted-foreground text-[11px] text-center mb-4 leading-relaxed">
            By using Music Exclusive, you agree to our Terms and Policies.
          </p>
          
          {/* Copyright */}
          <p className="text-muted-foreground/70 text-[10px] font-body text-center">
            © {new Date().getFullYear()} Music Exclusive™. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Spacer for mini player */}
      <div className="h-24" />

      {/* Mini Player Space Placeholder */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-card/95 backdrop-blur-xl border-t border-border/40 flex items-center justify-center z-50 shadow-card">
        <p className="text-muted-foreground text-xs font-display uppercase tracking-widest">
          Mini Player Area
        </p>
      </div>
    </div>
  )
}

export default Index
