import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StartHereButtonProps {
  onClick: () => void;
  variant?: 'floating' | 'inline';
  className?: string;
}

export const StartHereButton = ({ onClick, variant = 'floating', className }: StartHereButtonProps) => {
  if (variant === 'inline') {
    return (
      <button
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
          "bg-primary/20 text-primary border border-primary/30",
          "hover:bg-primary/30 hover:border-primary/50 transition-all duration-300",
          "animate-pulse-glow",
          className
        )}
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>New? Start Here</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-40 right-4 z-40 md:bottom-28",
        "flex items-center gap-2 px-5 py-3 rounded-full",
        "text-sm font-semibold text-white",
        "transition-all duration-300 hover:scale-105 active:scale-95",
        "animate-pulse-glow",
        className
      )}
      style={{
        background: 'linear-gradient(135deg, hsl(280, 80%, 50%), hsl(265, 90%, 60%))',
        boxShadow: `
          0 0 20px hsla(280, 80%, 50%, 0.5),
          0 0 40px hsla(280, 80%, 50%, 0.3),
          0 4px 15px rgba(0, 0, 0, 0.3)
        `,
      }}
    >
      <Sparkles className="w-4 h-4" />
      <span>Start Here</span>
    </button>
  );
};
