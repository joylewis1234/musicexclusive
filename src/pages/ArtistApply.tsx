import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { GlowCard } from "@/components/ui/GlowCard"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { ArrowLeft, Home, Users, Music, FileAudio, Shield, Disc } from "lucide-react"

const qualifications = [
  {
    icon: Users,
    text: "Have an existing fanbase (1,000+ followers across social platforms)",
  },
  {
    icon: Music,
    text: "Have released music on Spotify and/or Apple Music",
  },
  {
    icon: FileAudio,
    text: "Submit professionally produced music (MP3 or WAV format)",
  },
  {
    icon: Shield,
    text: "Own or control the rights to their music",
  },
  {
    icon: Disc,
    text: "Be actively releasing music or preparing an upcoming release",
  },
]

const ArtistApply = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-lg md:max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
            Artist Applications
          </span>

          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Go home"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-12 px-4">
        <div className="container max-w-lg md:max-w-xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <SectionHeader title="Artist Applications" align="center" framed />
            <p className="text-muted-foreground text-sm font-body mt-4 max-w-sm mx-auto">
              Music Exclusive is a curated, pre-release platform. Not all applications are accepted.
            </p>
          </div>

          {/* Qualification Card */}
          <GlowCard className="p-5 mb-8">
            <h3 className="font-display text-base uppercase tracking-widest text-foreground mb-8 text-center">
              To Apply, Artists Must:
            </h3>

            <ul className="space-y-6">
              {qualifications.map((qual, index) => (
                <li key={index} className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <qual.icon className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-muted-foreground text-base font-body leading-relaxed">
                    {qual.text}
                  </p>
                </li>
              ))}
            </ul>
          </GlowCard>

          {/* Disclaimer */}
          <div className="bg-muted/20 border border-border/30 rounded-xl p-5 mb-8">
            <p className="text-muted-foreground text-sm font-body text-center leading-relaxed">
              We review every application carefully to maintain quality and fairness for artists and fans.
            </p>
          </div>

          {/* CTA Section */}
          <div className="space-y-4 text-center">
            <Button
              size="lg"
              className="w-full"
              onClick={() => navigate("/artist/application-form")}
            >
              I Meet the Requirements – Apply
            </Button>

            <p className="text-muted-foreground text-xs font-body max-w-xs mx-auto">
              If you're not quite there yet, keep building — we'd love to hear from you in the future.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ArtistApply
