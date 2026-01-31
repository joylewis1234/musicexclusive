import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LegalPageLayoutProps {
  title: string;
  effectiveDate?: string;
  summary?: string;
  children: React.ReactNode;
  showAgreeButton?: boolean;
  onAgree?: () => void;
  agreeButtonText?: string;
  isAgreeDisabled?: boolean;
}

const LegalPageLayout = ({
  title,
  effectiveDate,
  summary,
  children,
  showAgreeButton = false,
  onAgree,
  agreeButtonText = "Agree & Continue",
  isAgreeDisabled = false,
}: LegalPageLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Check if we have navigation history
  const canGoBack = window.history.length > 1 && location.key !== "default";

  const handleBack = () => {
    if (canGoBack) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      
      setScrollProgress(progress);
      setShowBackToTop(progress > 25);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-border/20">
        <div 
          className="h-full bg-primary/70 transition-all duration-150 ease-out shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Subtle page background gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-muted/30 via-background to-background pointer-events-none" />
      
      {/* Minimal Header */}
      <header className="sticky top-0.5 z-20 bg-background/95 backdrop-blur-sm border-b border-border/30">
        <div className="max-w-[680px] mx-auto w-full px-5 md:px-7 py-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-5 md:px-7 py-8 md:py-12 pb-28">
        <div className="max-w-[680px] mx-auto w-full">
          {/* Document Header */}
          <div className="mb-8">
            {/* Document Icon + Title */}
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-[26px] md:text-[30px] font-display font-bold tracking-tight text-foreground leading-tight">
                  {title}
                </h1>
                {effectiveDate && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Effective: {effectiveDate}
                  </p>
                )}
              </div>
            </div>
            
            {/* Summary Strip */}
            {summary && (
              <div className="mt-5 p-4 rounded-lg bg-muted/50 border border-border/40">
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {summary}
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-border/50 mb-8" />

          {/* Legal Content - Clean document style */}
          <article className="space-y-8">
            {children}
          </article>
        </div>
      </main>

      {/* Floating Back to Top Button */}
      <button
        onClick={scrollToTop}
        className={cn(
          "fixed bottom-24 right-4 md:right-8 z-30 p-3 rounded-full",
          "bg-background/80 backdrop-blur-sm border border-primary/30",
          "text-primary/70 hover:text-primary hover:border-primary/50",
          "shadow-[0_0_15px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)]",
          "transition-all duration-300",
          showBackToTop 
            ? "opacity-100 translate-y-0" 
            : "opacity-0 translate-y-4 pointer-events-none"
        )}
        aria-label="Back to top"
      >
        <ChevronUp className="w-5 h-5" />
      </button>

      {/* Sticky Bottom Bar */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-t border-border/30",
        "px-5 md:px-7 py-4"
      )}>
        <div className="max-w-[680px] mx-auto w-full flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          
          {showAgreeButton && onAgree && (
            <Button
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
