import * as React from "react"
import { cn } from "@/lib/utils"

interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glowColor?: "primary" | "secondary" | "accent" | "gradient" | "subtle"
  hover?: boolean
  unlocking?: boolean
  variant?: "default" | "elevated" | "flat"
}

const GlowCard = React.forwardRef<HTMLDivElement, GlowCardProps>(
  ({ className, glowColor = "subtle", hover = true, unlocking = false, variant = "default", children, ...props }, ref) => {
    const glowStyles = {
      primary: "from-primary via-purple-500 to-pink-500",
      secondary: "from-secondary via-primary to-accent",
      accent: "from-accent via-primary to-purple-500",
      gradient: "from-primary via-purple-500 to-pink-500",
      subtle: "from-primary/40 via-purple-500/30 to-pink-500/40",
    }

    const variantStyles = {
      default: "bg-card",
      elevated: "bg-card shadow-lg shadow-primary/5",
      flat: "bg-card/80 backdrop-blur-sm",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-2xl transition-all duration-300 group",
          hover && "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10",
          className
        )}
        {...props}
      >
        {/* Soft outer glow - more subtle */}
        <div 
          className={cn(
            "absolute -inset-[0.5px] rounded-2xl bg-gradient-to-r blur-[2px] transition-opacity duration-300",
            glowStyles[glowColor],
            hover && "group-hover:opacity-50",
            unlocking ? "animate-frame-glow-pulse opacity-40" : "opacity-20"
          )}
          aria-hidden="true"
        />
        {/* Thin gradient border */}
        <div 
          className={cn(
            "absolute inset-0 rounded-2xl bg-gradient-to-r transition-opacity duration-300 p-[1px]",
            glowStyles[glowColor],
            hover && "group-hover:opacity-70",
            unlocking ? "animate-frame-border-pulse opacity-50" : "opacity-30"
          )}
          aria-hidden="true"
        />
        {/* Inner content */}
        <div className={cn("relative rounded-2xl h-full", variantStyles[variant])}>
          {children}
        </div>
      </div>
    )
  }
)
GlowCard.displayName = "GlowCard"

export { GlowCard }
