import { Button } from "@/components/ui/button"
import { Header } from "@/components/Header"
import { ArtistCard } from "@/components/ArtistCard"
import { StepCard } from "@/components/StepCard"
import { SectionHeader } from "@/components/ui/SectionHeader"
import vaultPortal from "@/assets/vault-portal.png"
import artist1 from "@/assets/artist-1.jpg"
import artist2 from "@/assets/artist-2.jpg"
import artist3 from "@/assets/artist-3.jpg"

const artists = [
  { name: "Maranda B.", genre: "Hip Hop", imageUrl: artist1 },
  { name: "Rico Flames", genre: "Trap", imageUrl: artist2 },
  { name: "DJ Kyra", genre: "Electronic", imageUrl: artist3 },
]

const steps = [
  {
    stepNumber: 1,
    title: "ENTER THE VAULT",
    description: "Enter your name & email to receive your vault code.",
  },
  {
    stepNumber: 2,
    title: "UNLOCK TRACKS",
    description: "Use your code to access exclusive unreleased music.",
  },
  {
    stepNumber: 3,
    title: "BECOME A SUPERFAN",
    description: "Upgrade for direct artist access and VIP perks.",
  },
]

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative px-4 pt-24 pb-8 overflow-hidden text-center">
        <div className="container max-w-lg md:max-w-2xl mx-auto">
          {/* Hero Text */}
          <h1 className="text-foreground mb-4 animate-fade-up opacity-0">
            <span className="text-foreground">Step Inside the</span>
            <br />
            <span className="text-foreground">Vault: </span>
            <span className="text-muted-foreground">The Future</span>
            <br />
            <span className="text-muted-foreground">of Music is Here.</span>
          </h1>
          
          <p className="text-muted-foreground text-base md:text-lg mb-6 font-body animate-fade-up [animation-delay:100ms] opacity-0 max-w-sm mx-auto">
            Unlock early access to exclusive music, before the world hears it.
          </p>
          
          {/* Primary CTA */}
          <div className="flex flex-col gap-4 items-center animate-fade-up [animation-delay:200ms] opacity-0">
            <Button size="lg" className="w-full max-w-xs">
              Try Your Luck – Enter the Vault
            </Button>
            
            <p className="text-muted-foreground text-sm font-body mt-2">
              Want guaranteed access?
              <br />
              Skip the line and become a<br />
              Superfan today
            </p>
            
            <Button variant="secondary" size="default" className="w-full max-w-xs">
              Unlock Superfan Access
            </Button>
          </div>
        </div>
      </section>

      {/* Vault Portal Section */}
      <section className="relative px-4 py-8 overflow-hidden">
        <div className="container max-w-lg md:max-w-4xl mx-auto">
          {/* Vault Portal Image */}
          <div className="relative mx-auto w-full max-w-md aspect-square">
            {/* Animated glow orbs behind */}
            <div className="absolute inset-0 bg-secondary/30 blur-[80px] rounded-full scale-75 animate-pulse" />
            <div className="absolute inset-0 bg-accent/20 blur-[60px] rounded-full scale-90 animate-pulse [animation-delay:1s]" />
            <div className="absolute inset-0 bg-primary/20 blur-[70px] rounded-full scale-80 animate-pulse [animation-delay:0.5s]" />
            
            {/* Breathing vault portal */}
            <img
              src={vaultPortal}
              alt="Vault Portal"
              className="relative w-full h-full object-contain vault-glow"
            />
          </div>
          
          {/* MUSIC EXCLUSIVE Text */}
          <h2 className="text-center mt-4 text-3xl md:text-5xl font-display font-black tracking-[0.15em] gradient-text text-glow">
            MUSIC EXCLUSIVE
          </h2>
        </div>
      </section>

      {/* Artists Section */}
      <section className="py-12 overflow-hidden">
        <div className="container max-w-lg md:max-w-4xl mx-auto px-4 mb-6">
          {/* No header needed - just the carousel */}
        </div>
        
        {/* Horizontal Scroll */}
        <div className="relative">
          <div className="flex gap-4 px-4 overflow-x-auto scrollbar-hide pb-4">
            {/* Add padding spacer for centering on mobile */}
            <div className="flex-shrink-0 w-2 md:w-[calc((100vw-768px)/2)]" />
            
            {artists.map((artist, index) => (
              <ArtistCard
                key={artist.name}
                name={artist.name}
                genre={artist.genre}
                imageUrl={artist.imageUrl}
              />
            ))}
            
            {/* Duplicate for more cards */}
            {artists.map((artist, index) => (
              <ArtistCard
                key={`${artist.name}-2`}
                name={artist.name}
                genre={artist.genre}
                imageUrl={artist.imageUrl}
              />
            ))}
            
            <div className="flex-shrink-0 w-4" />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 py-16 bg-background-elevated">
        <div className="container max-w-lg md:max-w-2xl mx-auto">
          <SectionHeader
            title="How It Works"
            align="left"
            glowColor="gradient"
          />
          
          <div className="flex flex-col gap-4 mt-8">
            {steps.map((step) => (
              <StepCard
                key={step.stepNumber}
                stepNumber={step.stepNumber}
                title={step.title}
                description={step.description}
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
            <Button size="lg" className="w-full animate-glow-pulse">
              Enter the Vault
            </Button>
            <Button variant="ghost" size="default" className="w-full">
              Learn More
            </Button>
          </div>
        </div>
      </section>

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
