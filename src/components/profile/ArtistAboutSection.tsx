import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArtistAboutSectionProps {
  bio: string;
  maxLines?: number;
}

export const ArtistAboutSection = ({ bio, maxLines = 3 }: ArtistAboutSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Check if bio is long enough to need collapsing
  const needsCollapse = bio.length > 150;

  return (
    <section className="px-5 py-4">
      <h2 className="font-display text-lg font-semibold text-foreground mb-3">
        About
      </h2>
      
      <div className="relative">
        <p 
          className={cn(
            "text-muted-foreground text-sm leading-relaxed transition-all duration-300",
            !isExpanded && needsCollapse && "line-clamp-3"
          )}
        >
          {bio}
        </p>
        
        {needsCollapse && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 flex items-center gap-1 text-primary text-sm font-medium hover:text-primary/80 transition-colors"
          >
            {isExpanded ? (
              <>
                Show less
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                Read more
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </section>
  );
};
