import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Home, Crown, Coins } from "lucide-react";

type AccessType = "superfan" | "credits" | null;

const AccessChoice = () => {
  const navigate = useNavigate();
  const [selectedAccess, setSelectedAccess] = useState<AccessType>(null);

  const handleContinue = () => {
    if (selectedAccess) {
      navigate("/fan/payment", { state: { accessType: selectedAccess } });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation Header */}
      <header className="p-4 flex items-center justify-between max-w-2xl mx-auto w-full">
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
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Framed Header */}
          <div className="flex justify-center mb-8">
            <SectionHeader 
              title="Choose Your Access" 
              align="center" 
              framed 
            />
          </div>

          <p className="text-muted-foreground text-center mb-8 text-sm md:text-base">
            Select how you want to experience exclusive music.
          </p>

          <div className="space-y-4">
            {/* Option A: Superfan */}
            <GlowCard 
              glowColor={selectedAccess === "superfan" ? "primary" : "gradient"} 
              hover
              className={`cursor-pointer transition-all duration-300 ${
                selectedAccess === "superfan" 
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background" 
                  : ""
              }`}
              onClick={() => setSelectedAccess("superfan")}
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary/20 text-primary">
                    <Crown className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-display uppercase tracking-wider text-foreground mb-2">
                      Become a Superfan
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Get guaranteed access, included listening credits, and exclusive perks.
                    </p>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-primary">$5</span>
                      <span className="text-sm text-muted-foreground">/month</span>
                    </div>
                  </div>
                </div>
              </div>
            </GlowCard>

            {/* Option B: Pay As You Go */}
            <GlowCard 
              glowColor={selectedAccess === "credits" ? "primary" : "gradient"} 
              hover
              className={`cursor-pointer transition-all duration-300 ${
                selectedAccess === "credits" 
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background" 
                  : ""
              }`}
              onClick={() => setSelectedAccess("credits")}
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-accent/20 text-accent">
                    <Coins className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-display uppercase tracking-wider text-foreground mb-2">
                      Pay As You Go
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Load credits and listen to exclusive music until your balance runs out.
                    </p>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-accent">$5</span>
                      <span className="text-sm text-muted-foreground">starting credits</span>
                    </div>
                  </div>
                </div>
              </div>
            </GlowCard>
          </div>

          {/* CTA Button */}
          <div className="mt-8">
            <Button
              onClick={handleContinue}
              disabled={!selectedAccess}
              className="w-full"
              variant="primary"
              size="lg"
            >
              {selectedAccess === "superfan" 
                ? "Continue as Superfan" 
                : selectedAccess === "credits"
                ? "Load Credits"
                : "Select an Option"}
            </Button>

            {!selectedAccess && (
              <p className="text-xs text-muted-foreground text-center mt-4">
                Please select how you want to listen
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AccessChoice;
