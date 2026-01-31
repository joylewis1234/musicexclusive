import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface SpinWheelProps {
  onComplete: (result: "winner" | "not_selected") => void;
  result: "winner" | "not_selected";
}

const SEGMENTS = [
  { label: "✨", color: "from-primary to-purple-500" },
  { label: "🔒", color: "from-muted to-muted-foreground/20" },
  { label: "✨", color: "from-primary to-purple-500" },
  { label: "🔒", color: "from-muted to-muted-foreground/20" },
  { label: "✨", color: "from-primary to-purple-500" },
  { label: "🔒", color: "from-muted to-muted-foreground/20" },
  { label: "✨", color: "from-primary to-purple-500" },
  { label: "🔒", color: "from-muted to-muted-foreground/20" },
];

export const SpinWheel = ({ onComplete, result }: SpinWheelProps) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  const startSpin = useCallback(() => {
    if (isSpinning || hasStarted) return;
    
    setIsSpinning(true);
    setHasStarted(true);

    // Calculate final rotation based on result
    // Winner lands on ✨ (index 0, 2, 4, 6), not_selected lands on 🔒 (index 1, 3, 5, 7)
    const segmentAngle = 360 / SEGMENTS.length; // 45 degrees per segment
    const winningIndex = result === "winner" ? 0 : 1;
    const targetAngle = winningIndex * segmentAngle;
    
    // Add multiple full rotations for dramatic effect (5-7 spins)
    const fullSpins = 5 + Math.random() * 2;
    const finalRotation = fullSpins * 360 + (360 - targetAngle);
    
    setRotation(finalRotation);

    // Complete after spin animation (4 seconds)
    setTimeout(() => {
      setIsSpinning(false);
      setTimeout(() => {
        onComplete(result);
      }, 800); // Brief pause before reveal
    }, 4000);
  }, [isSpinning, hasStarted, result, onComplete]);

  // Auto-start spin after mount
  useEffect(() => {
    const timer = setTimeout(startSpin, 500);
    return () => clearTimeout(timer);
  }, [startSpin]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 
          className="font-display text-xl md:text-2xl uppercase tracking-[0.12em] text-foreground mb-2"
          style={{
            textShadow: "0 0 20px rgba(0, 255, 255, 0.4), 0 0 40px rgba(0, 255, 255, 0.2)"
          }}
        >
          {isSpinning ? "Spinning..." : hasStarted ? "Revealing..." : "The Vault Awaits"}
        </h2>
        <p className="text-muted-foreground text-sm">
          {isSpinning ? "Will the vault open for you?" : "Your fate is being decided..."}
        </p>
      </div>

      {/* Wheel Container */}
      <div className="relative">
        {/* Outer glow ring */}
        <div 
          className={cn(
            "absolute -inset-4 rounded-full blur-xl transition-opacity duration-500",
            isSpinning ? "opacity-80 animate-pulse" : "opacity-40"
          )}
          style={{
            background: "radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)"
          }}
        />

        {/* Pointer/Indicator */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
          <div 
            className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary drop-shadow-[0_0_10px_hsl(var(--primary))]"
          />
        </div>

        {/* Wheel */}
        <div 
          className={cn(
            "relative w-56 h-56 md:w-72 md:h-72 rounded-full overflow-hidden",
            "border-4 border-primary/50 shadow-[0_0_30px_hsl(var(--primary)/0.3)]"
          )}
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning 
              ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" 
              : "none"
          }}
        >
          {/* Segments */}
          {SEGMENTS.map((segment, index) => {
            const segmentAngle = 360 / SEGMENTS.length;
            const startAngle = index * segmentAngle;
            
            return (
              <div
                key={index}
                className="absolute inset-0 origin-center"
                style={{
                  transform: `rotate(${startAngle}deg)`,
                  clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.tan((segmentAngle * Math.PI) / 360)}% 0%, 50% 50%)`
                }}
              >
                <div 
                  className={cn(
                    "absolute inset-0 bg-gradient-to-br",
                    segment.color
                  )}
                />
                <span 
                  className="absolute text-2xl"
                  style={{
                    top: "15%",
                    left: "50%",
                    transform: `translateX(-50%) rotate(${segmentAngle / 2}deg)`
                  }}
                >
                  {segment.label}
                </span>
              </div>
            );
          })}

          {/* Center hub */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className={cn(
                "w-16 h-16 md:w-20 md:h-20 rounded-full bg-background",
                "border-2 border-primary/60 flex items-center justify-center",
                "shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
              )}
            >
              <Sparkles 
                className={cn(
                  "w-8 h-8 text-primary",
                  isSpinning && "animate-pulse"
                )} 
              />
            </div>
          </div>

          {/* Radial lines */}
          {SEGMENTS.map((_, index) => (
            <div
              key={`line-${index}`}
              className="absolute inset-0 origin-center"
              style={{ transform: `rotate(${index * (360 / SEGMENTS.length)}deg)` }}
            >
              <div className="absolute top-0 left-1/2 w-px h-1/2 bg-primary/30" />
            </div>
          ))}
        </div>

        {/* Sparkle effects during spin */}
        {isSpinning && (
          <>
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-primary/80 animate-pulse" />
            <Sparkles className="absolute -bottom-2 -left-2 w-5 h-5 text-purple-400/80 animate-pulse delay-150" />
            <Sparkles className="absolute top-1/2 -right-4 w-4 h-4 text-pink-400/70 animate-pulse delay-300" />
          </>
        )}
      </div>

      {/* Suspense text */}
      <p 
        className={cn(
          "mt-8 text-sm text-muted-foreground/60 italic transition-opacity duration-500",
          isSpinning ? "opacity-100" : "opacity-0"
        )}
      >
        Only a select few gain access...
      </p>
    </div>
  );
};
