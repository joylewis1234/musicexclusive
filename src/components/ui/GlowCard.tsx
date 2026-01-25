import * as React from "react"
import { cn } from "@/lib/utils"

interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glowColor?: "primary" | "secondary" | "accent" | "gradient"
  hover?: boolean
  unlocking?: boolean
}

const GlowCard = React.forwardRef<HTMLDivElement, GlowCardProps>(
  ({ className, glowColor = "gradient", hover = true, unlocking = false, children, ...props }, ref) => {
    const glowStyles = {
      primary: "from-primary via-purple-500 to-pink-500",
      secondary: "from-secondary via-primary to-accent",
      accent: "from-accent via-primary to-purple-500",
      gradient: "from-primary via-purple-500 to-pink-500",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-xl transition-all duration-300",
          hover && "hover:-translate-y-1",
          className
        )}
        {...props}
      >
        {/* Soft outer glow */}
        <div 
          className={cn(
            "absolute -inset-[2px] rounded-xl bg-gradient-to-r blur-md transition-opacity duration-300",
            glowStyles[glowColor],
            hover && "group-hover:opacity-60",
            unlocking ? "animate-frame-glow-pulse" : "opacity-40"
          )}
          aria-hidden="true"
        />
        {/* Crisp gradient border */}
        <div 
          className={cn(
            "absolute -inset-[1px] rounded-xl bg-gradient-to-r transition-opacity duration-300",
            glowStyles[glowColor],
            hover && "group-hover:opacity-90",
            unlocking ? "animate-frame-border-pulse" : "opacity-60"
          )}
          aria-hidden="true"
        />
        {/* Inner content */}
        <div className="relative rounded-xl bg-card h-full">
          {children}
        </div>
      </div>
    )
  }
)
GlowCard.displayName = "GlowCard"

export { GlowCard }
