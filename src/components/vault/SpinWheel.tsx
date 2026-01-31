import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import vaultPortal from "@/assets/vault-portal.png";

interface SpinWheelProps {
  onComplete: (result: "winner" | "not_selected") => void;
  result: "winner" | "not_selected";
}

// Hook for wheel sound effects
const useWheelSounds = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const spinOscillatorRef = useRef<OscillatorNode | null>(null);

  const cleanup = useCallback(() => {
    if (spinOscillatorRef.current) {
      try {
        spinOscillatorRef.current.stop();
        spinOscillatorRef.current.disconnect();
      } catch (e) { /* Already stopped */ }
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const playSpinSound = useCallback(() => {
    try {
      cleanup();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Resume context for mobile browsers
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const now = audioContext.currentTime;
      const spinDuration = 4; // Match wheel animation duration
      const numSegments = 8;
      
      // Calculate total rotation (5-7 full spins = ~40-56 segment passes)
      const fullSpins = 6; // Average spins
      const totalSegmentPasses = fullSpins * numSegments;
      
      // Generate tick times using the same easing as the wheel: cubic-bezier(0.17, 0.67, 0.12, 0.99)
      // This creates fast ticks at start, slowing down dramatically at the end
      const ticks: number[] = [];
      
      // Approximate the cubic-bezier curve for progress over time
      const easeOut = (t: number): number => {
        // Approximation of cubic-bezier(0.17, 0.67, 0.12, 0.99)
        return 1 - Math.pow(1 - t, 4);
      };
      
      // Find tick times by inverting the easing
      for (let i = 0; i <= totalSegmentPasses; i++) {
        const targetProgress = i / totalSegmentPasses;
        
        // Binary search to find time for this progress
        let low = 0, high = 1, mid = 0.5;
        for (let j = 0; j < 20; j++) {
          mid = (low + high) / 2;
          const progress = easeOut(mid);
          if (progress < targetProgress) low = mid;
          else high = mid;
        }
        
        const tickTime = mid * spinDuration;
        if (tickTime < spinDuration - 0.1) { // Don't add ticks right at the end
          ticks.push(tickTime);
        }
      }
      
      // Add final slow ticks near the end
      const lastTick = ticks[ticks.length - 1] || 3.5;
      if (lastTick < 3.6) ticks.push(lastTick + 0.15);
      if (lastTick < 3.4) ticks.push(lastTick + 0.35);
      
      // Schedule each tick - wooden/plastic peg sound
      ticks.forEach((tickTime, index) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        // Alternating pitch for that "different pegs" feel
        const isHigh = index % 2 === 0;
        const basePitch = isHigh ? 600 : 480;
        // Add slight random variation for organic feel
        const variation = (Math.sin(index * 1.7) * 40);
        
        // Triangle wave for softer, more wooden sound
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(basePitch + variation, now + tickTime);
        osc.frequency.exponentialRampToValueAtTime(200, now + tickTime + 0.04);
        
        // Bandpass filter for that plastic/wooden clack
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, now + tickTime);
        filter.Q.setValueAtTime(1.5, now + tickTime);
        
        // Quick attack, fast decay - classic tick sound
        // Volume increases slightly as it slows (more noticeable individual ticks)
        const progressRatio = tickTime / spinDuration;
        const volume = 0.06 + progressRatio * 0.03; // 0.06 to 0.09
        
        gain.gain.setValueAtTime(0, now + tickTime);
        gain.gain.linearRampToValueAtTime(volume, now + tickTime + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.001, now + tickTime + 0.035);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.start(now + tickTime);
        osc.stop(now + tickTime + 0.04);
      });
      
      // Subtle underlying whoosh for momentum feel
      const whoosh = audioContext.createOscillator();
      const whooshGain = audioContext.createGain();
      const whooshFilter = audioContext.createBiquadFilter();
      
      whoosh.type = 'sawtooth';
      whoosh.frequency.setValueAtTime(50, now);
      whoosh.frequency.linearRampToValueAtTime(80, now + 0.5);
      whoosh.frequency.exponentialRampToValueAtTime(30, now + 4);
      
      whooshFilter.type = 'lowpass';
      whooshFilter.frequency.setValueAtTime(120, now);
      
      whooshGain.gain.setValueAtTime(0.001, now);
      whooshGain.gain.linearRampToValueAtTime(0.015, now + 0.3);
      whooshGain.gain.setValueAtTime(0.015, now + 1.5);
      whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 3.8);
      
      whoosh.connect(whooshFilter);
      whooshFilter.connect(whooshGain);
      whooshGain.connect(audioContext.destination);
      
      whoosh.start(now);
      whoosh.stop(now + 4);
      
      whoosh.onended = cleanup;
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }, [cleanup]);

  const playLandSound = useCallback((isWinner: boolean) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioContext.currentTime;
      
      if (isWinner) {
        // Triumphant chord (major triad with shimmer)
        const frequencies = [261.63, 329.63, 392.00, 523.25]; // C major + octave
        
        frequencies.forEach((freq, i) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.exponentialRampToValueAtTime(0.08 / (i + 1), now + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
          
          osc.connect(gain);
          gain.connect(audioContext.destination);
          
          osc.start(now + i * 0.05);
          osc.stop(now + 1);
        });
      } else {
        // Soft descending tone (not harsh, just conclusive)
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.4);
        
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.start(now);
        osc.stop(now + 0.6);
      }
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }, []);

  return { playSpinSound, playLandSound };
};

// Music themed segments with neon aesthetic
const SEGMENTS = [
  { label: "🎉", isWin: true },
  { label: "🎵", isWin: false },
  { label: "🎤", isWin: true },
  { label: "🎧", isWin: false },
  { label: "🎸", isWin: true },
  { label: "🔒", isWin: false },
  { label: "🎹", isWin: true },
  { label: "🎶", isWin: false },
];

export const SpinWheel = ({ onComplete, result }: SpinWheelProps) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const { playSpinSound, playLandSound } = useWheelSounds();

  const startSpin = useCallback(() => {
    if (isSpinning || hasStarted) return;
    
    setIsSpinning(true);
    setHasStarted(true);
    
    // Play spin sound
    playSpinSound();

    const segmentAngle = 360 / SEGMENTS.length;
    const winningIndex = result === "winner" ? 0 : 5; // 🎉 for win, 🔒 for not selected
    const targetAngle = winningIndex * segmentAngle;
    
    const fullSpins = 5 + Math.random() * 2;
    const finalRotation = fullSpins * 360 + (360 - targetAngle);
    
    setRotation(finalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      // Play land sound
      playLandSound(result === "winner");
      setTimeout(() => {
        onComplete(result);
      }, 800);
    }, 4000);
  }, [isSpinning, hasStarted, result, onComplete, playSpinSound, playLandSound]);

  useEffect(() => {
    const timer = setTimeout(startSpin, 500);
    return () => clearTimeout(timer);
  }, [startSpin]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in relative">
      {/* Header */}
      <div className="text-center mb-8 relative z-10">
        <h2 
          className="font-display text-xl md:text-2xl uppercase tracking-[0.12em] text-foreground mb-2"
          style={{
            textShadow: "0 0 30px hsl(280 80% 60% / 0.6), 0 0 60px hsl(320 80% 60% / 0.3)"
          }}
        >
          {isSpinning ? "🎵 Spinning..." : hasStarted ? "🎤 Revealing..." : "🎧 The Vault Awaits"}
        </h2>
        <p className="text-muted-foreground text-sm">
          {isSpinning ? "Your musical destiny awaits..." : "Get ready for the drop..."}
        </p>
      </div>

      {/* Wheel Container */}
      <div className="relative z-10">
        {/* Outer neon glow ring - purple/pink/blue with idle animation */}
        <div 
          className={cn(
            "absolute -inset-8 rounded-full transition-opacity duration-500",
            isSpinning ? "opacity-100" : "opacity-60"
          )}
          style={{
            background: "conic-gradient(from 0deg, hsl(280 80% 50% / 0.5), hsl(320 80% 50% / 0.4), hsl(220 80% 50% / 0.4), hsl(280 80% 50% / 0.5))",
            filter: "blur(25px)",
            animation: isSpinning 
              ? "spin 6s linear infinite reverse" 
              : "spin 20s linear infinite, pulse 3s ease-in-out infinite"
          }}
        />

        {/* Inner neon glow - pink/purple with breathing effect */}
        <div 
          className="absolute -inset-4 rounded-full transition-opacity duration-500"
          style={{
            background: "radial-gradient(circle, hsl(320 70% 50% / 0.4), hsl(280 70% 40% / 0.3), transparent 70%)",
            opacity: isSpinning ? 0.9 : 0.5,
            animation: isSpinning ? "pulse 0.5s ease-in-out infinite" : "pulse 4s ease-in-out infinite"
          }}
        />

        {/* Pointer - neon triangle */}
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20">
          <div 
            className="w-0 h-0 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent"
            style={{
              borderTopColor: "hsl(320 80% 60%)",
              filter: "drop-shadow(0 0 12px hsl(320 80% 60%)) drop-shadow(0 0 24px hsl(280 80% 50% / 0.5))"
            }}
          />
        </div>

        {/* Wheel */}
        <div 
          className={cn(
            "relative w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden"
          )}
          style={{
            boxShadow: `
              0 0 0 3px hsl(280 70% 50% / 0.7),
              0 0 20px hsl(320 80% 50% / 0.4),
              0 0 40px hsl(220 80% 50% / 0.3),
              inset 0 0 30px hsl(280 60% 20% / 0.4)
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
              {/* Gradient for win segments - purple/pink */}
              <radialGradient id="winGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(280 70% 35%)" />
                <stop offset="100%" stopColor="hsl(320 60% 20%)" />
              </radialGradient>
              {/* Gradient for non-win segments - blue/black */}
              <radialGradient id="loseGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(220 50% 20%)" />
                <stop offset="100%" stopColor="hsl(240 30% 8%)" />
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
                    stroke="hsl(280 60% 40% / 0.5)"
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
              className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center overflow-hidden"
              style={{
                background: "radial-gradient(circle, hsl(280 40% 12%), hsl(0 0% 0%))",
                boxShadow: `
                  0 0 0 2px hsl(320 60% 50% / 0.7),
                  0 0 15px hsl(280 80% 50% / 0.5),
                  inset 0 0 15px hsl(320 60% 30% / 0.4)
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
                  filter: "drop-shadow(0 0 8px hsl(280 80% 60% / 0.6))"
                }}
              />
            </div>
          </div>
        </div>

        {/* Floating music notes during spin */}
        {isSpinning && (
          <>
            <span 
              className="absolute text-xl animate-bounce"
              style={{
                top: "5%",
                right: "0%",
                color: "hsl(320 80% 70%)",
                textShadow: "0 0 10px hsl(320 80% 60%)",
                animationDuration: "0.6s"
              }}
            >
              🎵
            </span>
            <span 
              className="absolute text-lg animate-bounce"
              style={{
                bottom: "10%",
                left: "0%",
                color: "hsl(280 80% 70%)",
                textShadow: "0 0 10px hsl(280 80% 60%)",
                animationDuration: "0.8s",
                animationDelay: "0.2s"
              }}
            >
              🎶
            </span>
            <span 
              className="absolute text-base animate-bounce"
              style={{
                top: "50%",
                right: "-8%",
                color: "hsl(220 80% 70%)",
                textShadow: "0 0 8px hsl(220 80% 60%)",
                animationDuration: "0.7s",
                animationDelay: "0.4s"
              }}
            >
              🎤
            </span>
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
        🎧 Only the chosen few unlock the vault...
      </p>
    </div>
  );
};
