import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import vaultPortal from "@/assets/vault-portal.png";

interface SpinWheelProps {
  onComplete: (result: "winner" | "not_selected") => void;
  result: "winner" | "not_selected";
}

// Space vault themed segments
const SEGMENTS = [
  { label: "🌟", isWin: true },
  { label: "🔮", isWin: false },
  { label: "✨", isWin: true },
  { label: "🌙", isWin: false },
  { label: "💫", isWin: true },
  { label: "🔒", isWin: false },
  { label: "⭐", isWin: true },
  { label: "🌌", isWin: false },
];

export const SpinWheel = ({ onComplete, result }: SpinWheelProps) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  const startSpin = useCallback(() => {
    if (isSpinning || hasStarted) return;
    
    setIsSpinning(true);
    setHasStarted(true);

    const segmentAngle = 360 / SEGMENTS.length;
    const winningIndex = result === "winner" ? 0 : 5; // 🌟 for win, 🔒 for not selected
    const targetAngle = winningIndex * segmentAngle;
    
    const fullSpins = 5 + Math.random() * 2;
    const finalRotation = fullSpins * 360 + (360 - targetAngle);
    
    setRotation(finalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setTimeout(() => {
        onComplete(result);
      }, 800);
    }, 4000);
  }, [isSpinning, hasStarted, result, onComplete]);

  useEffect(() => {
    const timer = setTimeout(startSpin, 500);
    return () => clearTimeout(timer);
  }, [startSpin]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in relative">
      {/* Starfield background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.3 + Math.random() * 0.5,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="text-center mb-8 relative z-10">
        <h2 
          className="font-display text-xl md:text-2xl uppercase tracking-[0.12em] text-foreground mb-2"
          style={{
            textShadow: "0 0 30px hsl(280 80% 60% / 0.6), 0 0 60px hsl(var(--primary) / 0.3)"
          }}
        >
          {isSpinning ? "🌌 Unlocking..." : hasStarted ? "✨ Revealing..." : "🔮 The Vault Awaits"}
        </h2>
        <p className="text-muted-foreground text-sm">
          {isSpinning ? "The cosmos decides your fate..." : "Your destiny is being revealed..."}
        </p>
      </div>

      {/* Wheel Container */}
      <div className="relative z-10">
        {/* Outer cosmic ring glow */}
        <div 
          className={cn(
            "absolute -inset-8 rounded-full transition-opacity duration-500",
            isSpinning ? "opacity-100" : "opacity-60"
          )}
          style={{
            background: "conic-gradient(from 0deg, hsl(280 80% 50% / 0.4), hsl(var(--primary) / 0.3), hsl(320 80% 50% / 0.3), hsl(280 80% 50% / 0.4))",
            filter: "blur(30px)",
            animation: isSpinning ? "spin 8s linear infinite reverse" : "none"
          }}
        />

        {/* Inner nebula glow */}
        <div 
          className={cn(
            "absolute -inset-4 rounded-full transition-opacity duration-500",
            isSpinning ? "opacity-90 animate-pulse" : "opacity-50"
          )}
          style={{
            background: "radial-gradient(circle, hsl(280 70% 50% / 0.5), hsl(var(--primary) / 0.3), transparent 70%)"
          }}
        />

        {/* Pointer - crystal/gem style */}
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20">
          <div 
            className="w-0 h-0 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent"
            style={{
              borderTopColor: "hsl(280 80% 60%)",
              filter: "drop-shadow(0 0 15px hsl(280 80% 60%)) drop-shadow(0 0 30px hsl(var(--primary) / 0.5))"
            }}
          />
        </div>

        {/* Wheel - space portal style */}
        <div 
          className={cn(
            "relative w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden"
          )}
          style={{
            boxShadow: `
              0 0 0 3px hsl(280 70% 50% / 0.6),
              0 0 30px hsl(280 80% 50% / 0.4),
              0 0 60px hsl(var(--primary) / 0.3),
              inset 0 0 40px hsl(280 60% 30% / 0.3)
            `,
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning 
              ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" 
              : "none"
          }}
        >
          {/* SVG Wheel */}
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              {/* Gradient for win segments */}
              <radialGradient id="winGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(280 70% 35%)" />
                <stop offset="100%" stopColor="hsl(280 60% 20%)" />
              </radialGradient>
              {/* Gradient for non-win segments */}
              <radialGradient id="loseGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(220 30% 15%)" />
                <stop offset="100%" stopColor="hsl(220 20% 8%)" />
              </radialGradient>
            </defs>
            
            {SEGMENTS.map((segment, index) => {
              const segmentAngle = 360 / SEGMENTS.length;
              const startAngle = index * segmentAngle - 90;
              const endAngle = startAngle + segmentAngle;
              
              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;
              
              const x1 = 50 + 50 * Math.cos(startRad);
              const y1 = 50 + 50 * Math.sin(startRad);
              const x2 = 50 + 50 * Math.cos(endRad);
              const y2 = 50 + 50 * Math.sin(endRad);
              
              const pathD = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;
              
              const midAngle = ((startAngle + endAngle) / 2) * Math.PI / 180;
              const labelX = 50 + 33 * Math.cos(midAngle);
              const labelY = 50 + 33 * Math.sin(midAngle);
              
              return (
                <g key={index}>
                  <path
                    d={pathD}
                    fill={segment.isWin ? "url(#winGradient)" : "url(#loseGradient)"}
                    stroke="hsl(280 60% 50% / 0.4)"
                    strokeWidth="0.3"
                  />
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontSize: "9px" }}
                  >
                    {segment.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Center hub - vault portal image */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div 
              className={cn(
                "w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center overflow-hidden"
              )}
              style={{
                background: "radial-gradient(circle, hsl(280 50% 15%), hsl(var(--background)))",
                boxShadow: `
                  0 0 0 2px hsl(280 60% 50% / 0.7),
                  0 0 20px hsl(280 80% 50% / 0.5),
                  inset 0 0 20px hsl(280 60% 30% / 0.4)
                `
              }}
            >
              <img 
                src={vaultPortal} 
                alt="Vault" 
                className={cn(
                  "w-14 h-14 md:w-16 md:h-16 object-contain",
                  isSpinning && "animate-pulse"
                )}
                style={{
                  filter: "drop-shadow(0 0 10px hsl(var(--primary) / 0.6))"
                }}
              />
            </div>
          </div>
        </div>

        {/* Orbiting particles during spin */}
        {isSpinning && (
          <>
            <div 
              className="absolute w-2 h-2 rounded-full bg-purple-400"
              style={{
                top: "10%",
                right: "5%",
                boxShadow: "0 0 10px hsl(280 80% 60%)",
                animation: "bounce 0.8s ease-in-out infinite"
              }}
            />
            <div 
              className="absolute w-1.5 h-1.5 rounded-full bg-cyan-400"
              style={{
                bottom: "15%",
                left: "5%",
                boxShadow: "0 0 8px hsl(var(--primary))",
                animation: "bounce 0.6s ease-in-out infinite",
                animationDelay: "0.2s"
              }}
            />
            <div 
              className="absolute w-1 h-1 rounded-full bg-pink-400"
              style={{
                top: "50%",
                right: "-5%",
                boxShadow: "0 0 6px hsl(320 80% 60%)",
                animation: "bounce 0.7s ease-in-out infinite",
                animationDelay: "0.4s"
              }}
            />
            <span className="absolute -top-3 left-1/4 text-lg animate-pulse">✨</span>
            <span className="absolute -bottom-3 right-1/4 text-lg animate-pulse" style={{ animationDelay: "0.3s" }}>💫</span>
          </>
        )}
      </div>

      {/* Suspense text */}
      <p 
        className={cn(
          "mt-10 text-sm text-muted-foreground/70 italic transition-opacity duration-500 relative z-10",
          isSpinning ? "opacity-100" : "opacity-0"
        )}
      >
        ✨ Only the chosen few unlock the vault...
      </p>
    </div>
  );
};
