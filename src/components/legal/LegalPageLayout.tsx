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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-b from-primary/[0.02] via-transparent to-transparent pointer-events-none" />
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/30">
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

        {/* Content Area */}
        <div className="flex-1 px-5 md:px-7 py-8 md:py-12">
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

            {/* Legal Content */}
            <div className="legal-content">
              {children}
            </div>
          </div>
        </div>

        {/* Sticky Bottom Bar */}
        <div className={cn(
          "sticky bottom-0 z-20 bg-background/90 backdrop-blur-md border-t border-border/30",
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
      </main>
    </div>
  );
};

export default LegalPageLayout;
