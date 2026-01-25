import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold font-display uppercase tracking-wider transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary CTA - Gradient outline with dark fill
        default:
          "relative bg-card text-foreground active:scale-[0.98] before:absolute before:-inset-[1px] before:rounded-full before:bg-gradient-to-r before:from-primary before:via-purple-500 before:to-pink-500 before:-z-10 before:transition-opacity before:duration-300 hover:before:opacity-100 before:opacity-70 after:absolute after:-inset-[2px] after:rounded-full after:bg-gradient-to-r after:from-primary after:via-purple-500 after:to-pink-500 after:blur-sm after:-z-20 after:opacity-0 hover:after:opacity-50 after:transition-opacity after:duration-300",
        // Primary filled
        primary:
          "relative bg-card text-foreground active:scale-[0.98] before:absolute before:-inset-[1px] before:rounded-full before:bg-gradient-to-r before:from-primary before:via-purple-500 before:to-pink-500 before:-z-10 before:transition-opacity before:duration-300 hover:before:opacity-100 before:opacity-70 after:absolute after:-inset-[2px] after:rounded-full after:bg-gradient-to-r after:from-primary after:via-purple-500 after:to-pink-500 after:blur-sm after:-z-20 after:opacity-0 hover:after:opacity-50 after:transition-opacity after:duration-300",
        // Secondary - Dark with border
        secondary:
          "bg-card text-foreground border border-border hover:border-muted-foreground hover:bg-card-hover active:scale-[0.98]",
        // Outline - transparent with border
        outline:
          "bg-transparent text-foreground border border-border hover:border-primary/50 hover:bg-muted/20 active:scale-[0.98]",
        // Ghost
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-muted/30",
        // Destructive
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // Link style
        link:
          "text-primary underline-offset-4 hover:underline",
        // Accent - Solid filled cyan
        accent:
          "bg-primary text-primary-foreground shadow-cyan-sm hover:shadow-cyan-md hover:bg-primary-glow active:scale-[0.98]",
      },
      size: {
        default: "h-12 px-7 py-2",
        sm: "h-10 px-5 text-xs",
        lg: "h-14 px-9 text-base",
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
