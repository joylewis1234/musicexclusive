import * as React from "react"
import { cn } from "@/lib/utils"

interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
  align?: "left" | "center"
  framed?: boolean
}

const SectionHeader = React.forwardRef<HTMLDivElement, SectionHeaderProps>(
  ({ className, title, subtitle, align = "left", framed = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "mb-8",
          align === "center" && "flex flex-col items-center",
          className
        )}
        {...props}
      >
        {framed ? (
          /* Framed neon style */
          <div className="relative inline-block">
            {/* Gradient border with blur glow */}
            <div 
              className="absolute -inset-[2px] rounded-lg bg-gradient-to-r from-primary via-purple-500 to-pink-500 blur-sm opacity-75"
              aria-hidden="true"
            />
            {/* Inner border for crisp edge */}
            <div 
              className="absolute -inset-[1px] rounded-lg bg-gradient-to-r from-primary via-purple-500 to-pink-500"
              aria-hidden="true"
            />
            {/* Content container */}
            <div className="relative bg-background rounded-lg px-8 py-3">
              <h2 
                className="font-display text-xl md:text-2xl lg:text-3xl uppercase tracking-[0.2em] text-foreground"
                style={{
                  textShadow: '0 0 20px rgba(255, 255, 255, 0.4), 0 0 40px rgba(255, 255, 255, 0.2)'
                }}
              >
                {title}
              </h2>
            </div>
          </div>
        ) : (
          /* Standard underline style */
          <h2 className="relative inline-block pb-3 text-foreground uppercase tracking-widest">
            {title}
            <span
              className={cn(
                "absolute bottom-0 left-0 h-0.5 rounded-full bg-gradient-to-r from-primary to-purple-500 shadow-neon-sm transition-all duration-300",
                align === "center" ? "left-1/2 -translate-x-1/2 w-1/2" : "w-2/3"
              )}
            />
          </h2>
        )}
        {subtitle && (
          <p className="mt-4 text-muted-foreground text-sm md:text-base font-body max-w-lg">
            {subtitle}
          </p>
        )}
      </div>
    )
  }
)
SectionHeader.displayName = "SectionHeader"

export { SectionHeader }
