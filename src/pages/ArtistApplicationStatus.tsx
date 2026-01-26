import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { GlowCard } from "@/components/ui/GlowCard"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { ArrowLeft, Home, Clock, CheckCircle, Mail } from "lucide-react"

const ArtistApplicationStatus = () => {
  const navigate = useNavigate()
  const { state } = useLocation()
  const artistName = state?.artistName || "Artist"
  const contactEmail = state?.contactEmail || "your email"

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-lg md:max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
            Application Status
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
            <SectionHeader title="Application Received" align="center" framed />
          </div>

          {/* Success Card */}
          <GlowCard className="p-6 text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            
            <h2 className="font-display text-xl font-bold text-foreground mb-2">
              Thank You, {artistName}!
            </h2>
            
            <p className="text-muted-foreground text-sm font-body mb-6">
              Your application has been successfully submitted and is now under review.
            </p>

            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-amber-500 text-sm font-display uppercase tracking-wider">
                Pending Review
              </span>
            </div>
          </GlowCard>

          {/* What's Next Card */}
          <GlowCard className="p-5 mb-6">
            <h3 className="font-display text-xs uppercase tracking-widest text-primary mb-4">
              What Happens Next
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs text-muted-foreground">1</span>
                </div>
                <p className="text-muted-foreground text-sm font-body">
                  Our team reviews your music and profile (typically 3-5 business days)
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs text-muted-foreground">2</span>
                </div>
                <p className="text-muted-foreground text-sm font-body">
                  We'll notify you via email about your application status
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs text-muted-foreground">3</span>
                </div>
                <p className="text-muted-foreground text-sm font-body">
                  If approved, you'll receive access to your Artist Dashboard
                </p>
              </li>
            </ul>
          </GlowCard>

          {/* Email Notice */}
          <div className="bg-muted/20 border border-border/30 rounded-xl p-4 mb-8 flex items-start gap-3">
            <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-muted-foreground text-xs font-body leading-relaxed">
              A confirmation email has been sent to <span className="text-foreground">{contactEmail}</span>. 
              Please check your spam folder if you don't see it.
            </p>
          </div>

          {/* CTA */}
          <Button
            size="lg"
            variant="secondary"
            className="w-full"
            onClick={() => navigate("/")}
          >
            Return to Home
          </Button>
        </div>
      </main>
    </div>
  )
}

export default ArtistApplicationStatus
