import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Music, Headphones } from "lucide-react";

interface SpinWheelProps {
  onComplete: (result: "winner" | "not_selected") => void;
  result: "winner" | "not_selected";
}

// Music-themed segments with celebration and vault elements
const SEGMENTS = [
  { label: "🎉", isWin: true },
  { label: "🎵", isWin: false },
  { label: "🎤", isWin: true },
  { label: "🎧", isWin: false },
  { label: "🎸", isWin: true },
  { label: "🎹", isWin: false },
  { label: "🎶", isWin: true },
  { label: "🔐", isWin: false },
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
    // Winner lands on 🎉 (index 0), not_selected lands on 🔐 (index 7)
    const segmentAngle = 360 / SEGMENTS.length; // 45 degrees per segment
    const winningIndex = result === "winner" ? 0 : 7;
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
            textShadow: "0 0 20px hsl(var(--primary) / 0.4), 0 0 40px hsl(var(--primary) / 0.2)"
          }}
        >
          {isSpinning ? "🎰 Spinning..." : hasStarted ? "✨ Revealing..." : "🎵 The Vault Awaits"}
        </h2>
        <p className="text-muted-foreground text-sm">
          {isSpinning ? "Will the vault open for you?" : "Your fate is being decided..."}
        </p>
      </div>

      {/* Wheel Container */}
      <div className="relative">
        {/* Outer glow ring - pulsing neon effect */}
        <div 
          className={cn(
            "absolute -inset-6 rounded-full blur-2xl transition-opacity duration-500",
            isSpinning ? "opacity-90 animate-pulse" : "opacity-50"
          )}
          style={{
            background: "conic-gradient(from 0deg, hsl(var(--primary) / 0.5), hsl(280 80% 60% / 0.4), hsl(var(--primary) / 0.5))"
          }}
        />

        {/* Secondary glow */}
        <div 
          className={cn(
            "absolute -inset-3 rounded-full blur-xl transition-opacity duration-500",
            isSpinning ? "opacity-80" : "opacity-40"
          )}
          style={{
            background: "radial-gradient(circle, hsl(var(--primary) / 0.6), transparent 70%)"
          }}
        />

        {/* Pointer/Indicator - music note style */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
          <div className="relative">
            <div 
              className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent"
              style={{
                borderTopColor: "hsl(var(--primary))",
                filter: "drop-shadow(0 0 12px hsl(var(--primary)))"
              }}
            />
            <Music className="absolute -top-7 left-1/2 -translate-x-1/2 w-5 h-5 text-primary" />
          </div>
        </div>

        {/* Wheel */}
        <div 
          className={cn(
            "relative w-60 h-60 md:w-80 md:h-80 rounded-full overflow-hidden",
            "border-[3px] shadow-[0_0_40px_hsl(var(--primary)/0.4),inset_0_0_30px_hsl(var(--primary)/0.1)]"
          )}
          style={{
            borderColor: "hsl(var(--primary) / 0.7)",
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning 
              ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" 
              : "none"
          }}
        >
          {/* SVG Wheel for perfect segments */}
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {SEGMENTS.map((segment, index) => {
              const segmentAngle = 360 / SEGMENTS.length;
              const startAngle = index * segmentAngle - 90; // -90 to start from top
              const endAngle = startAngle + segmentAngle;
              
              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;
              
              const x1 = 50 + 50 * Math.cos(startRad);
              const y1 = 50 + 50 * Math.sin(startRad);
              const x2 = 50 + 50 * Math.cos(endRad);
              const y2 = 50 + 50 * Math.sin(endRad);
              
              const largeArc = segmentAngle > 180 ? 1 : 0;
              
              const pathD = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`;
              
              // Alternate colors - win segments get accent glow, others get muted
              const fillColor = segment.isWin 
                ? "hsl(280 70% 25%)" // Purple-ish for win
                : "hsl(220 20% 12%)"; // Dark muted for non-win
              
              // Label position - center of segment
              const midAngle = ((startAngle + endAngle) / 2) * Math.PI / 180;
              const labelX = 50 + 32 * Math.cos(midAngle);
              const labelY = 50 + 32 * Math.sin(midAngle);
              
              return (
                <g key={index}>
                  <path
                    d={pathD}
                    fill={fillColor}
                    stroke="hsl(var(--primary) / 0.3)"
                    strokeWidth="0.5"
                  />
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[10px] md:text-[8px]"
                    style={{ fontSize: "10px" }}
                  >
                    {segment.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Center hub */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div 
              className={cn(
                "w-16 h-16 md:w-20 md:h-20 rounded-full bg-background",
                "border-2 flex items-center justify-center",
                "shadow-[0_0_25px_hsl(var(--primary)/0.5)]"
              )}
              style={{
                borderColor: "hsl(var(--primary) / 0.8)",
                background: "linear-gradient(135deg, hsl(var(--background)), hsl(var(--background-elevated)))"
              }}
            >
              <Headphones 
                className={cn(
                  "w-8 h-8 md:w-10 md:h-10 text-primary",
                  isSpinning && "animate-pulse"
                )} 
              />
            </div>
          </div>
        </div>

        {/* Floating music notes during spin */}
        {isSpinning && (
          <>
            <span className="absolute -top-2 -right-3 text-2xl animate-bounce" style={{ animationDelay: "0s" }}>🎵</span>
            <span className="absolute -bottom-2 -left-3 text-xl animate-bounce" style={{ animationDelay: "0.2s" }}>🎶</span>
            <span className="absolute top-1/2 -right-5 text-lg animate-bounce" style={{ animationDelay: "0.4s" }}>✨</span>
            <span className="absolute top-1/3 -left-4 text-lg animate-bounce" style={{ animationDelay: "0.3s" }}>🎤</span>
          </>
        )}
      </div>

      {/* Suspense text */}
      <p 
        className={cn(
          "mt-8 text-sm text-muted-foreground/70 italic transition-opacity duration-500",
          isSpinning ? "opacity-100" : "opacity-0"
        )}
      >
        🎧 Only a select few gain access to exclusive music...
      </p>
    </div>
  );
};
