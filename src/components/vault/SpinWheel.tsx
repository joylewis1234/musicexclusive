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

      const now = audioContext.currentTime;
      
      // Price Is Right style clicking pegs - starts fast, slows down
      const totalDuration = 4;
      const numSegments = 8;
      
      // Calculate click times with deceleration curve
      const clicks: number[] = [];
      let time = 0;
      let interval = 0.04; // Start very fast
      const deceleration = 1.08; // Each click takes longer
      
      while (time < totalDuration - 0.3) {
        clicks.push(time);
        time += interval;
        interval *= deceleration;
      }
      // Add final slow clicks
      clicks.push(time);
      clicks.push(time + 0.15);
      clicks.push(time + 0.35);
      
      // Schedule each click
      clicks.forEach((clickTime, index) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        // Alternating pitch for musical feel (like hitting different pegs)
        const basePitch = index % 2 === 0 ? 800 : 1000;
        const pitchVariation = Math.sin(index * 0.7) * 100;
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(basePitch + pitchVariation, now + clickTime);
        osc.frequency.exponentialRampToValueAtTime(400, now + clickTime + 0.03);
        
        // Sharper filter for that plastic peg sound
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, now + clickTime);
        filter.Q.setValueAtTime(2, now + clickTime);
        
        // Quick attack/decay for click sound
        const volume = 0.08 + (clickTime / totalDuration) * 0.04; // Gets slightly louder as it slows
        gain.gain.setValueAtTime(0, now + clickTime);
        gain.gain.linearRampToValueAtTime(volume, now + clickTime + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, now + clickTime + 0.05);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.start(now + clickTime);
        osc.stop(now + clickTime + 0.06);
      });
      
      // Add underlying whoosh/rumble for wheel momentum
      const rumbleOsc = audioContext.createOscillator();
      const rumbleGain = audioContext.createGain();
      const rumbleFilter = audioContext.createBiquadFilter();
      
      rumbleOsc.type = 'sawtooth';
      rumbleOsc.frequency.setValueAtTime(60, now);
      rumbleOsc.frequency.exponentialRampToValueAtTime(120, now + 1);
      rumbleOsc.frequency.exponentialRampToValueAtTime(40, now + 4);
      
      rumbleFilter.type = 'lowpass';
      rumbleFilter.frequency.setValueAtTime(150, now);
      
      rumbleGain.gain.setValueAtTime(0.001, now);
      rumbleGain.gain.linearRampToValueAtTime(0.03, now + 0.5);
      rumbleGain.gain.setValueAtTime(0.03, now + 2);
      rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 4);
      
      rumbleOsc.connect(rumbleFilter);
      rumbleFilter.connect(rumbleGain);
      rumbleGain.connect(audioContext.destination);
      
      rumbleOsc.start(now);
      rumbleOsc.stop(now + 4.1);
      
      rumbleOsc.onended = cleanup;
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
