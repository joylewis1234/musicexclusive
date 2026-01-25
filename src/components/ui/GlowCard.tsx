import * as React from "react"
import { cn } from "@/lib/utils"

interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glowColor?: "primary" | "secondary" | "accent" | "gradient"
  hover?: boolean
}

const GlowCard = React.forwardRef<HTMLDivElement, GlowCardProps>(
  ({ className, glowColor = "gradient", hover = true, children, ...props }, ref) => {
    const glowStyles = {
      primary: "before:bg-primary hover:shadow-cyan-md",
      secondary: "before:bg-secondary hover:shadow-blue-glow",
      accent: "before:bg-accent hover:shadow-neon-md",
      gradient: "before:bg-gradient-frame hover:shadow-cyan-md",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-xl bg-card overflow-hidden transition-all duration-300",
          "before:absolute before:inset-0 before:rounded-xl before:p-[2px] before:opacity-50 before:transition-opacity before:duration-300",
          "before:-z-10 before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:[mask-composite:exclude]",
          hover && "hover:before:opacity-90 hover:-translate-y-1",
          glowStyles[glowColor],
          className
        )}
        {...props}
      >
        <div className="relative rounded-xl bg-card h-full">
          {children}
        </div>
      </div>
    )
  }
)
GlowCard.displayName = "GlowCard"

export { GlowCard }
