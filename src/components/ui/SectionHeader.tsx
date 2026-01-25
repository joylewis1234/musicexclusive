import * as React from "react"
import { cn } from "@/lib/utils"

interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
  align?: "left" | "center"
  glowColor?: "primary" | "accent" | "gradient"
}

const SectionHeader = React.forwardRef<HTMLDivElement, SectionHeaderProps>(
  ({ className, title, subtitle, align = "left", glowColor = "gradient", ...props }, ref) => {
    const underlineStyles = {
      primary: "bg-primary shadow-neon-sm",
      accent: "bg-accent shadow-cyan-glow",
      gradient: "bg-gradient-neon shadow-neon-sm",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "mb-6",
          align === "center" && "text-center",
          className
        )}
        {...props}
      >
        <h2 className="relative inline-block pb-3 text-foreground">
          {title}
          <span
            className={cn(
              "absolute bottom-0 left-0 h-0.5 rounded-full transition-all duration-300",
              align === "center" ? "left-1/2 -translate-x-1/2 w-1/2" : "w-2/3",
              underlineStyles[glowColor]
            )}
          />
        </h2>
        {subtitle && (
          <p className="mt-3 text-muted-foreground text-sm md:text-base font-body max-w-lg">
            {subtitle}
          </p>
        )}
      </div>
    )
  }
)
SectionHeader.displayName = "SectionHeader"

export { SectionHeader }
