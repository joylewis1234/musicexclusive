import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { GlowCard } from "@/components/ui/GlowCard"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { ArrowLeft, Home, Clock, CheckCircle, XCircle, Sparkles } from "lucide-react"

type ApplicationStatus = "pending" | "approved" | "rejected"

const ArtistApplicationStatus = () => {
  const navigate = useNavigate()
  const { state } = useLocation()
  const artistName = state?.artistName || "Artist"
  
  // In production, this would come from the database
  // For now, we use navigation state or default to pending
  const status: ApplicationStatus = state?.status || "pending"

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-lg md:max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Go home"
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
          
          {/* Pending State */}
          {status === "pending" && (
            <>
              <div className="text-center mb-8">
                <SectionHeader title="Application Received" align="center" framed />
              </div>

              <GlowCard className="p-6 text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-amber-500" />
                </div>
                
                <h2 className="font-display text-lg font-bold text-foreground mb-3">
                  Thanks for Applying, {artistName}
                </h2>
                
                <p className="text-muted-foreground text-sm font-body mb-4 leading-relaxed">
                  Thanks for applying to Music Exclusive.
                  <br />
                  Our team is reviewing your submission.
                </p>

                {/* Status Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 mb-4">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-amber-500 text-sm font-display uppercase tracking-wider">
                    Pending Review
                  </span>
                </div>

                <p className="text-muted-foreground text-xs font-body">
                  This process typically takes 3–5 business days.
                </p>
              </GlowCard>

              {/* What's Next */}
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
                      Our team listens to your music and reviews your profile
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

              <Button
                size="lg"
                variant="secondary"
                className="w-full"
                onClick={() => navigate("/")}
              >
                Return to Home
              </Button>
            </>
          )}

          {/* Approved State */}
          {status === "approved" && (
            <>
              <div className="text-center mb-8">
                <SectionHeader title="You're Approved" align="center" framed />
              </div>

              <GlowCard className="p-6 text-center mb-6" unlocking>
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                  🎉 Congratulations!
                </h2>
                
                <p className="text-muted-foreground text-sm font-body mb-6 leading-relaxed max-w-xs mx-auto">
                  Welcome to Music Exclusive.
                  <br />
                  You've been selected to release music early to a dedicated fanbase.
                </p>

                {/* Status Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span className="text-primary text-sm font-display uppercase tracking-wider">
                    Approved
                  </span>
                </div>
              </GlowCard>

              {/* What You Get */}
              <GlowCard className="p-5 mb-6">
                <h3 className="font-display text-xs uppercase tracking-widest text-primary mb-4">
                  What's Included
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-muted-foreground text-sm font-body">
                      Your own Artist Profile on Music Exclusive
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-muted-foreground text-sm font-body">
                      Upload and release music before it goes public
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-muted-foreground text-sm font-body">
                      Direct connection to your most dedicated fans
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-muted-foreground text-sm font-body">
                      Real-time analytics and earnings tracking
                    </p>
                  </li>
                </ul>
              </GlowCard>

              <Button
                size="lg"
                className="w-full"
                onClick={() => navigate("/artist/profile")}
              >
                Set Up Artist Profile
              </Button>
            </>
          )}

          {/* Rejected State */}
          {status === "rejected" && (
            <>
              <div className="text-center mb-8">
                <SectionHeader title="Application Update" align="center" framed />
              </div>

              <GlowCard className="p-6 text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                
                <h2 className="font-display text-lg font-bold text-foreground mb-3">
                  Application Not Approved
                </h2>
                
                <p className="text-muted-foreground text-sm font-body mb-4 leading-relaxed max-w-xs mx-auto">
                  Thanks for applying.
                  <br />
                  At this time, your application wasn't selected.
                </p>

                {/* Status Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/20 border border-border/50">
                  <XCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground text-sm font-display uppercase tracking-wider">
                    Not Selected
                  </span>
                </div>
              </GlowCard>

              {/* Encouragement */}
              <div className="bg-muted/20 border border-border/30 rounded-xl p-5 mb-6 text-center">
                <p className="text-muted-foreground text-sm font-body leading-relaxed">
                  This doesn't mean never — keep building your fanbase and refining your sound. 
                  We'd love to hear from you again in the future.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full"
                  onClick={() => navigate("/artist/apply")}
                >
                  Review Requirements
                </Button>
                
                <Button
                  size="lg"
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate("/")}
                >
                  Return to Home
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default ArtistApplicationStatus
