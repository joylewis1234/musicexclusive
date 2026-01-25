import { useNavigate, useLocation } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Crown, Zap, Star, Users, CreditCard, Home } from "lucide-react";

interface LocationState {
  email?: string;
  name?: string;
}

const ChooseAccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const handleSuperfan = () => {
    // TODO: Route to Stripe subscription flow
    navigate("/subscribe", { state });
  };

  const handlePayAsYouGo = () => {
    // TODO: Route to wallet top-up flow
    navigate("/load-credits", { state });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation Header */}
      <header className="p-4 flex items-center justify-between max-w-4xl mx-auto w-full">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">Back</span>
        </button>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">Home</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-4xl">
          {/* Framed Header */}
          <div className="flex justify-center mb-4">
            <SectionHeader 
              title="Choose Your Access" 
              align="center" 
              framed 
            />
          </div>

          <p className="text-muted-foreground text-center mb-10 text-sm md:text-base max-w-md mx-auto">
            Select how you want to experience Music Exclusive.
          </p>

          {/* Options Grid */}
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            
            {/* SUPERFAN Card */}
            <div className="relative group">
              {/* Popular badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                <span className="bg-gradient-to-r from-primary to-purple-500 text-primary-foreground text-xs uppercase tracking-wider px-4 py-1 rounded-full font-medium shadow-lg">
                  Most Popular
                </span>
              </div>
              
              <GlowCard glowColor="gradient" className="h-full">
                <div className="p-6 md:p-8 flex flex-col h-full">
                  {/* Icon */}
                  <div className="flex justify-center mb-4">
                    <div 
                      className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center"
                      style={{ boxShadow: '0 0 30px rgba(138, 43, 226, 0.3)' }}
                    >
                      <Crown className="w-8 h-8 text-primary" />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 
                    className="text-2xl md:text-3xl font-display uppercase tracking-wider text-center mb-2 text-foreground"
                    style={{ textShadow: '0 0 20px rgba(138, 43, 226, 0.5)' }}
                  >
                    Superfan
                  </h3>

                  {/* Price */}
                  <div className="text-center mb-6">
                    <span className="text-4xl font-display text-foreground">$5</span>
                    <span className="text-muted-foreground text-sm">/month</span>
                  </div>

                  {/* Benefits */}
                  <ul className="space-y-4 mb-8 flex-1">
                    <li className="flex items-start gap-3">
                      <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground text-sm">
                        <strong className="text-foreground">Included listening credits</strong> each month
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Star className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground text-sm">
                        <strong className="text-foreground">Early access</strong> to new releases
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Crown className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground text-sm">
                        <strong className="text-foreground">Exclusive status badge</strong> on your profile
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Users className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground text-sm">
                        <strong className="text-foreground">Monthly friend bypass</strong> — invite someone directly
                      </span>
                    </li>
                  </ul>

                  {/* CTA */}
                  <Button
                    onClick={handleSuperfan}
                    variant="primary"
                    size="lg"
                    className="w-full"
                  >
                    Become a Superfan
                  </Button>
                </div>
              </GlowCard>
            </div>

            {/* PAY AS YOU GO Card */}
            <GlowCard glowColor="secondary" hover={false} className="h-full">
              <div className="p-6 md:p-8 flex flex-col h-full">
                {/* Icon */}
                <div className="flex justify-center mb-4 mt-3">
                  <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center border border-secondary/30">
                    <CreditCard className="w-8 h-8 text-secondary-foreground/70" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl md:text-3xl font-display uppercase tracking-wider text-center mb-2 text-foreground">
                  Pay As You Go
                </h3>

                {/* Price indicator */}
                <div className="text-center mb-6">
                  <span className="text-4xl font-display text-foreground">$5</span>
                  <span className="text-muted-foreground text-sm"> to start</span>
                </div>

                {/* Description */}
                <div className="flex-1 flex flex-col justify-center mb-8">
                  <p className="text-muted-foreground text-center text-sm md:text-base leading-relaxed">
                    Load <strong className="text-foreground">$5 in credits</strong> and listen freely until you run out. 
                    Top up whenever you need more.
                  </p>
                  
                  <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-xs text-muted-foreground text-center">
                      No commitment. No subscription. <br />
                      Just pay for what you play.
                    </p>
                  </div>
                </div>

                {/* CTA */}
                <Button
                  onClick={handlePayAsYouGo}
                  variant="outline"
                  size="lg"
                  className="w-full border-border/50 hover:border-primary/50 hover:bg-primary/5"
                >
                  Load Credits
                </Button>
              </div>
            </GlowCard>
          </div>

          {/* Footer note */}
          <p className="text-xs text-muted-foreground text-center mt-8 max-w-md mx-auto">
            Both options support artists directly. You can switch between plans anytime.
          </p>
        </div>
      </main>
    </div>
  );
};

export default ChooseAccess;
