import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold font-display uppercase tracking-wider transition-all duration-300",
  {
    variants: {
      variant: {
        exclusive:
          "bg-primary/20 text-primary border border-primary/40 shadow-cyan-sm",
        vault:
          "bg-gradient-cyan text-primary-foreground shadow-cyan-sm",
        superfan:
          "bg-accent/20 text-accent border border-accent/40 shadow-neon-sm",
        member:
          "bg-secondary/20 text-secondary border border-secondary/40 shadow-blue-glow",
        default:
          "bg-muted text-muted-foreground border border-border",
      },
      size: {
        sm: "text-[10px] px-2 py-0.5",
        default: "text-xs px-3 py-1",
        lg: "text-sm px-4 py-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, className }))}
        {...props}
      />
    )
  }
)
StatusBadge.displayName = "StatusBadge"

export { StatusBadge, badgeVariants }
