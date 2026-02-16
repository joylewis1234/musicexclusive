import { Crown } from "lucide-react";

interface ExclusiveBadgeProps {
  className?: string;
  isNonExclusive?: boolean;
}

export const ExclusiveBadge = ({ className, isNonExclusive = false }: ExclusiveBadgeProps) => {
  if (isNonExclusive) {
    return (
      <div 
        className={`relative px-2 py-0.5 rounded-full flex-shrink-0 ${className || ""}`}
        style={{
          background: 'hsla(0, 0%, 50%, 0.12)',
          border: '1px solid hsla(0, 0%, 50%, 0.2)',
        }}
      >
        <span 
          className="text-[9px] font-display uppercase tracking-wider"
          style={{ color: 'hsl(0, 0%, 60%)' }}
        >
          Non-Exclusive
        </span>
      </div>
    );
  }

  return (
    <div 
      className={`relative px-2 py-0.5 rounded-full flex-shrink-0 ${className || ""}`}
      style={{
        background: 'hsla(280, 80%, 50%, 0.15)',
      }}
    >
      <Crown 
        className="absolute -top-1 -left-0.5 w-2.5 h-2.5 rotate-[-12deg]"
        style={{
          color: 'hsl(45, 90%, 55%)',
          filter: 'drop-shadow(0 0 2px hsla(45, 90%, 55%, 0.8))'
        }}
        fill="hsl(45, 90%, 55%)"
      />
      <span 
        className="text-[9px] font-display uppercase tracking-wider pl-1"
        style={{ color: 'hsl(280, 80%, 70%)' }}
      >
        Exclusive
      </span>
    </div>
  );
};
