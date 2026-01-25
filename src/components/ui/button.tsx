import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold font-display uppercase tracking-wide transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary CTA - Glowing gradient outline
        default:
          "relative bg-transparent border-0 text-foreground before:absolute before:inset-0 before:rounded-lg before:p-[2px] before:bg-gradient-neon before:-z-10 before:transition-opacity before:duration-300 after:absolute after:inset-[2px] after:rounded-[6px] after:bg-background after:-z-[5] hover:shadow-neon-md hover:before:opacity-100 active:scale-[0.98]",
        // Primary filled with glow
        primary:
          "bg-primary text-primary-foreground shadow-neon-sm hover:shadow-neon-md hover:bg-primary-glow active:scale-[0.98]",
        // Secondary - subtle glow effect
        secondary:
          "bg-muted text-foreground border border-border hover:border-primary/50 hover:shadow-neon-sm hover:bg-muted/80 active:scale-[0.98]",
        // Accent - cyan glow
        accent:
          "bg-accent text-accent-foreground shadow-cyan-glow hover:shadow-[0_0_30px_hsl(180_100%_50%/0.5)] active:scale-[0.98]",
        // Ghost
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-muted/50",
        // Destructive
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // Outline
        outline:
          "border border-border bg-transparent text-foreground hover:border-primary/50 hover:bg-muted/30",
        // Link style
        link:
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-14 px-8 text-base",
        xl: "h-16 px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
