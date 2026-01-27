import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface FanCommentBubbleProps {
  name: string;
  comment: string;
  avatarUrl?: string;
  rating?: number;
  position: "top-left" | "top-right" | "left" | "right" | "bottom-left" | "bottom-right" | "top-center";
  delay?: number;
  className?: string;
}

/**
 * Floating fan comment bubble component
 * Displays fan testimonials around the vault portal
 * with avatar, name, star rating, and comment
 */
const FanCommentBubble = ({
  name,
  comment,
  avatarUrl,
  rating = 5,
  position,
  delay = 0,
  className,
}: FanCommentBubbleProps) => {
  // Position classes for absolute positioning around the vault
  // Position classes - adjusted to keep bubbles within viewport
  const positionClasses: Record<string, string> = {
    "top-left": "top-[5%] left-[5%]",
    "top-right": "top-[5%] right-[5%]",
    "top-center": "top-[2%] left-1/2 -translate-x-1/2",
    "left": "top-1/2 left-[2%] -translate-y-1/2",
    "right": "top-1/2 right-[2%] -translate-y-1/2",
    "bottom-left": "bottom-[5%] left-[5%]",
    "bottom-right": "bottom-[5%] right-[5%]",
  };

  // Generate initials from name for fallback avatar
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        "absolute z-20 animate-fade-in",
        positionClasses[position],
        className
      )}
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: "backwards",
      }}
    >
      {/* Bubble container with glass effect */}
      <div
        className="relative bg-card/90 backdrop-blur-md rounded-2xl p-2 md:p-3 shadow-lg border border-border/50 max-w-[130px] md:max-w-[160px] animate-float"
        style={{
          animationDelay: `${delay + 500}ms`,
          boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3), 0 0 25px rgba(139, 92, 246, 0.15)",
        }}
      >
        {/* Header with avatar and name */}
        <div className="flex items-center gap-2 mb-2">
          {/* Avatar */}
          <div className="relative w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary/50 to-accent/50 flex items-center justify-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs md:text-sm font-bold text-foreground">
                {initials}
              </span>
            )}
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-full ring-2 ring-primary/30" />
          </div>

          {/* Name and rating */}
          <div className="flex-1 min-w-0">
            <p className="font-display text-xs md:text-sm font-semibold text-foreground truncate">
              {name}
            </p>
            {/* Star rating */}
            <div className="flex gap-0.5">
              {Array.from({ length: rating }).map((_, i) => (
                <Star
                  key={i}
                  className="w-2.5 h-2.5 md:w-3 md:h-3 fill-primary text-primary"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Comment text */}
        <p className="text-xs md:text-sm text-muted-foreground font-body leading-snug">
          "{comment}"
        </p>
      </div>
    </div>
  );
};

export { FanCommentBubble };
