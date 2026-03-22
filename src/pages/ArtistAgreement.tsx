import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import AgreementTextContent from "@/components/artist/agreement/AgreementTextContent";
import { cn } from "@/lib/utils";

const ArtistAgreement = () => {
  const navigate = useNavigate();
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[780px] mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Artist Participation Agreement
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Music Exclusive LLC | musicexclusive.co
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Badge variant="secondary" className="text-xs">Version 1.0</Badge>
            <Badge variant="secondary" className="text-xs">Effective 2025</Badge>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-sm text-muted-foreground">
            Read before signing up as an artist
          </p>
          <Button size="sm" onClick={() => navigate("/artist/application-form")}>
            Become an Artist
          </Button>
        </div>

        {/* Agreement Content */}
        <div className="text-[15px] leading-[1.8]">
          <AgreementTextContent />
        </div>

        {/* Footer Note */}
        <div className="mt-12 pt-8 border-t border-border/30 text-center">
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            This agreement governs all artist accounts on musicexclusive.co.
            Questions or concerns? Contact us at support@musicexclusive.co
          </p>
          <a href="mailto:support@musicexclusive.co">
            <Button variant="secondary" size="sm" className="mt-4">
              Contact Support
            </Button>
          </a>
        </div>
      </div>

      {/* Back to Top */}
      <button
        onClick={scrollToTop}
        className={cn(
          "fixed bottom-8 right-6 z-30 p-3 rounded-full",
          "bg-card border border-border text-muted-foreground",
          "hover:text-foreground hover:border-primary/50",
          "transition-all duration-300",
          showBackToTop
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        )}
        aria-label="Back to top"
      >
        <ChevronUp className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ArtistAgreement;
