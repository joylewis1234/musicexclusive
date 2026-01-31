import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LegalPageLayoutProps {
  title: string;
  subtitle?: string;
  version?: string;
  effectiveDate?: string;
  children: React.ReactNode;
  showAgreeButton?: boolean;
  onAgree?: () => void;
  agreeButtonText?: string;
  isAgreeDisabled?: boolean;
}

const LegalPageLayout = ({
  title,
  subtitle,
  version,
  effectiveDate,
  children,
  showAgreeButton = false,
  onAgree,
  agreeButtonText = "Agree & Continue",
  isAgreeDisabled = false,
}: LegalPageLayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-b from-primary/[0.02] via-transparent to-transparent pointer-events-none" />
      
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-border/40">
        <div className="max-w-[680px] mx-auto w-full px-5 md:px-7 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
          
          {version && effectiveDate && (
            <span className="text-xs text-muted-foreground/70">
              v{version} • {effectiveDate}
            </span>
          )}
        </div>
      </header>

      {/* Main Content - Natural flow, no fixed height */}
      <main className="relative z-10 px-5 md:px-7 py-8 md:py-12 pb-24">
        <div className="max-w-[680px] mx-auto w-full">
          {/* Title Section */}
          <div className="mb-8 md:mb-10">
            <h1 className="text-[26px] md:text-[30px] font-display font-bold tracking-tight text-foreground mb-2">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground/80">
                {subtitle}
              </p>
            )}
          </div>

          {/* Legal Content - Subtle card with thin border */}
          <div className="relative rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm p-6 md:p-8">
            {/* Subtle gradient glow behind the card */}
            <div className="absolute -inset-px rounded-xl bg-gradient-to-b from-primary/5 via-transparent to-transparent -z-10 opacity-50" />
            
            <div className="space-y-6">
              {children}
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Bar */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-20 bg-background/90 backdrop-blur-md border-t border-border/40",
        "px-5 md:px-7 py-4"
      )}>
        <div className="max-w-[680px] mx-auto w-full flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          
          {showAgreeButton && onAgree && (
            <Button
              variant="accent"
              onClick={onAgree}
              disabled={isAgreeDisabled}
              className="min-w-[140px]"
            >
              {agreeButtonText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LegalPageLayout;
