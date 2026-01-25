import { Button } from "@/components/ui/button"
import { GlowCard } from "@/components/ui/GlowCard"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { Play, Lock, Headphones, Star } from "lucide-react"

const Index = () => {
  return (
    <div className="min-h-screen bg-background main-content">
      {/* Hero Section */}
      <section className="relative px-4 pt-16 pb-20 overflow-hidden">
        {/* Background Glow Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/20 rounded-full blur-[120px] -z-10" />
        <div className="absolute top-20 right-0 w-[300px] h-[300px] bg-secondary/15 rounded-full blur-[100px] -z-10" />
        
        <div className="container max-w-lg md:max-w-4xl mx-auto text-center">
          <StatusBadge variant="vault" size="lg" className="mb-6 animate-fade-up">
            The Vault is Open
          </StatusBadge>
          
          <h1 className="text-foreground mb-4 animate-fade-up [animation-delay:100ms] opacity-0">
            <span className="gradient-text">Music</span>{" "}
            <span className="text-glow">Exclusive</span>
          </h1>
          
          <p className="text-muted-foreground text-lg md:text-xl mb-8 font-body animate-fade-up [animation-delay:200ms] opacity-0 max-w-md mx-auto">
            Unlock unreleased tracks, behind-the-scenes content, and direct artist access.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up [animation-delay:300ms] opacity-0">
            <Button size="lg">
              <Play className="w-5 h-5" />
              Enter the Vault
            </Button>
            <Button variant="secondary" size="lg">
              <Lock className="w-5 h-5" />
              Become a Member
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-16 bg-background-elevated">
        <div className="container max-w-lg md:max-w-4xl mx-auto">
          <SectionHeader
            title="Exclusive Access"
            subtitle="Experience music like never before with premium features designed for true fans."
            align="center"
            glowColor="gradient"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            <GlowCard glowColor="primary" className="animate-fade-up opacity-0 [animation-delay:100ms]">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                  <Lock className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg mb-2 text-foreground">Vault Tracks</h3>
                <p className="text-muted-foreground text-sm font-body">
                  Access unreleased music and demos before anyone else.
                </p>
                <StatusBadge variant="exclusive" className="mt-4">
                  Exclusive
                </StatusBadge>
              </div>
            </GlowCard>

            <GlowCard glowColor="secondary" className="animate-fade-up opacity-0 [animation-delay:200ms]">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-xl bg-secondary/20 flex items-center justify-center mb-4">
                  <Headphones className="w-7 h-7 text-secondary" />
                </div>
                <h3 className="text-lg mb-2 text-foreground">Lossless Audio</h3>
                <p className="text-muted-foreground text-sm font-body">
                  Studio-quality sound with no compression artifacts.
                </p>
                <StatusBadge variant="member" className="mt-4">
                  Vault Member
                </StatusBadge>
              </div>
            </GlowCard>

            <GlowCard glowColor="accent" className="animate-fade-up opacity-0 [animation-delay:300ms]">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-xl bg-accent/20 flex items-center justify-center mb-4">
                  <Star className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-lg mb-2 text-foreground">Artist Access</h3>
                <p className="text-muted-foreground text-sm font-body">
                  Direct connection with your favorite artists.
                </p>
                <StatusBadge variant="superfan" className="mt-4">
                  Superfan
                </StatusBadge>
              </div>
            </GlowCard>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20">
        <div className="container max-w-lg md:max-w-2xl mx-auto text-center">
          <SectionHeader
            title="Ready to Join?"
            subtitle="Get instant access to the vault and unlock exclusive content."
            align="center"
            glowColor="accent"
          />
          
          <div className="mt-10 flex flex-col gap-4">
            <Button variant="primary" size="xl" className="w-full animate-glow-pulse">
              Unlock Full Access
            </Button>
            <Button variant="ghost" size="lg" className="w-full">
              Browse Free Content
            </Button>
          </div>
        </div>
      </section>

      {/* Mini Player Space Indicator (visual placeholder) */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-card/80 backdrop-blur-xl border-t border-border/50 flex items-center justify-center z-50">
        <p className="text-muted-foreground text-sm font-display uppercase tracking-wider">
          Mini Player Area
        </p>
      </div>
    </div>
  )
}

export default Index
