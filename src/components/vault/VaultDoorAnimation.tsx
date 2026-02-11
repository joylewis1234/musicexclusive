import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import vaultPortal from "@/assets/vault-portal.png";
import vaultVideo from "@/assets/vault-door-animation.mp4";

interface VaultDoorAnimationProps {
  onComplete: (result: "winner" | "not_selected") => void;
  result: "winner" | "not_selected";
}

/** Web Audio sounds for the vault door animation */
const useVaultSounds = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const cleanup = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const playMetallicClicks = useCallback(() => {
    try {
      cleanup();
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      if (ctx.state === "suspended") ctx.resume();

      const now = ctx.currentTime;

      // Sequence of metallic tumbler clicks over ~3s
      const clickTimes = [0.3, 0.7, 1.1, 1.6, 2.0, 2.4, 2.7];
      clickTimes.forEach((t) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = "square";
        osc.frequency.setValueAtTime(1200 + Math.random() * 400, now + t);
        osc.frequency.exponentialRampToValueAtTime(300, now + t + 0.05);

        filter.type = "bandpass";
        filter.frequency.setValueAtTime(900, now + t);
        filter.Q.setValueAtTime(3, now + t);

        gain.gain.setValueAtTime(0, now + t);
        gain.gain.linearRampToValueAtTime(0.07, now + t + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.06);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + t);
        osc.stop(now + t + 0.08);
      });

      // Low rumble undertone
      const rumble = ctx.createOscillator();
      const rumbleGain = ctx.createGain();
      const rumbleFilter = ctx.createBiquadFilter();
      rumble.type = "sawtooth";
      rumble.frequency.setValueAtTime(40, now);
      rumble.frequency.linearRampToValueAtTime(60, now + 1.5);
      rumble.frequency.exponentialRampToValueAtTime(30, now + 3);
      rumbleFilter.type = "lowpass";
      rumbleFilter.frequency.setValueAtTime(100, now);
      rumbleGain.gain.setValueAtTime(0.001, now);
      rumbleGain.gain.linearRampToValueAtTime(0.02, now + 0.5);
      rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 3);
      rumble.connect(rumbleFilter);
      rumbleFilter.connect(rumbleGain);
      rumbleGain.connect(ctx.destination);
      rumble.start(now);
      rumble.stop(now + 3.5);
    } catch {
      console.warn("Web Audio not supported");
    }
  }, [cleanup]);

  const playResultSound = useCallback((isWinner: boolean) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = ctx.currentTime;

      if (isWinner) {
        // Triumphant chord
        [261.63, 329.63, 392.0, 523.25].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.exponentialRampToValueAtTime(0.08 / (i + 1), now + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.05);
          osc.stop(now + 1);
        });
      } else {
        // Metallic clank + descending tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.5);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(600, now);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.7);
      }
    } catch {
      console.warn("Web Audio not supported");
    }
  }, []);

  return { playMetallicClicks, playResultSound };
};

export const VaultDoorAnimation = ({ onComplete, result }: VaultDoorAnimationProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<"idle" | "playing" | "result">("idle");
  const [videoReady, setVideoReady] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const { playMetallicClicks, playResultSound } = useVaultSounds();
  const hasStartedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Race: video load vs 3s timeout → fallback
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!videoReady) setUseFallback(true);
    }, 3000);
    timeoutRef.current = timeout;
    return () => clearTimeout(timeout);
  }, [videoReady]);

  const handleVideoReady = useCallback(() => {
    setVideoReady(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  // Auto-start after brief idle
  useEffect(() => {
    if (hasStartedRef.current) return;
    const delay = setTimeout(() => {
      hasStartedRef.current = true;
      setPhase("playing");
      playMetallicClicks();

      if (!useFallback && videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => setUseFallback(true));
      }
    }, 1200);
    return () => clearTimeout(delay);
  }, [useFallback, playMetallicClicks]);

  // Video timeupdate → freeze for lose, let play for win
  useEffect(() => {
    const video = videoRef.current;
    if (!video || useFallback) return;

    const onTimeUpdate = () => {
      if (result === "not_selected" && video.currentTime >= video.duration * 0.5) {
        video.pause();
        finishSequence();
      }
    };

    const onEnded = () => {
      if (result === "winner") finishSequence();
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, useFallback]);

  // Fallback animation timer (matches ~3.5s total)
  useEffect(() => {
    if (!useFallback || phase !== "playing") return;
    const timer = setTimeout(() => finishSequence(), 3500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useFallback, phase]);

  const finishSequence = useCallback(() => {
    setPhase("result");
    setShowOverlay(true);
    playResultSound(result === "winner");

    // Haptic
    if (navigator.vibrate) {
      navigator.vibrate(result === "winner" ? 120 : 50);
    }

    // Transition to result screen after overlay flash
    setTimeout(() => {
      setShowOverlay(false);
      setTimeout(() => onComplete(result), 400);
    }, 600);
  }, [result, onComplete, playResultSound]);

  const isWin = result === "winner";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in relative">
      {/* Result overlay flash */}
      <div
        className={cn(
          "fixed inset-0 pointer-events-none z-50 transition-opacity duration-300",
          showOverlay ? "opacity-100" : "opacity-0"
        )}
        style={{
          background: isWin
            ? "radial-gradient(circle, hsl(var(--primary) / 0.3), transparent 70%)"
            : "radial-gradient(circle, hsl(0 70% 50% / 0.25), transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Header text */}
      <div className="text-center mb-8 relative z-10">
        <h2
          className="font-display text-xl md:text-2xl uppercase tracking-[0.12em] text-foreground mb-2"
          style={{
            textShadow:
              "0 0 30px hsl(280 80% 60% / 0.6), 0 0 60px hsl(320 80% 60% / 0.3)",
          }}
        >
          {phase === "idle" && "🔒 The Vault Awaits"}
          {phase === "playing" && "⚙️ Determining Your Fate..."}
          {phase === "result" && (isWin ? "🔓 The Vault Has Opened" : "🔒 Not This Time")}
        </h2>
        <p className="text-muted-foreground text-sm">
          {phase === "idle" && "Preparing the vault mechanism..."}
          {phase === "playing" && "Tumblers falling into place..."}
          {phase === "result" &&
            (isWin ? "Welcome inside." : "But you're getting closer...")}
        </p>
      </div>

      {/* Vault door container */}
      <div className="relative z-10">
        {/* Outer glow */}
        <div
          className={cn(
            "absolute -inset-8 rounded-2xl transition-all duration-700",
            phase === "playing" ? "opacity-100" : "opacity-50"
          )}
          style={{
            background:
              "conic-gradient(from 0deg, hsl(280 80% 50% / 0.4), hsl(320 80% 50% / 0.3), hsl(220 80% 50% / 0.3), hsl(280 80% 50% / 0.4))",
            filter: "blur(30px)",
            animation:
              phase === "playing"
                ? "pulse 1.5s ease-in-out infinite"
                : "pulse 4s ease-in-out infinite",
          }}
        />

        {/* Video / fallback frame */}
        <div
          className="relative w-72 h-72 md:w-80 md:h-80 rounded-2xl overflow-hidden"
          style={{
            boxShadow: `
              0 0 0 2px hsl(280 70% 50% / 0.6),
              0 0 20px hsl(320 80% 50% / 0.3),
              0 0 40px hsl(220 80% 50% / 0.2),
              inset 0 0 40px hsl(0 0% 0% / 0.5)
            `,
          }}
        >
          {!useFallback ? (
            <video
              ref={videoRef}
              src={vaultVideo}
              muted
              playsInline
              preload="auto"
              onCanPlayThrough={handleVideoReady}
              onError={() => setUseFallback(true)}
              className="w-full h-full object-cover"
              style={{
                filter:
                  phase === "result" && !isWin
                    ? "brightness(0.5) saturate(0.3)"
                    : undefined,
                transition: "filter 0.4s ease",
              }}
            />
          ) : (
            /* CSS-only fallback */
            <div className="w-full h-full bg-background flex items-center justify-center relative">
              <img
                src={vaultPortal}
                alt="Vault"
                className="w-32 h-32 object-contain"
                style={{
                  filter: "drop-shadow(0 0 15px hsl(280 80% 60% / 0.6))",
                }}
              />
              {/* Rotating lock icon */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  animation:
                    phase === "playing"
                      ? "spin 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)"
                      : undefined,
                }}
              >
                <Lock
                  className={cn(
                    "w-16 h-16 transition-colors duration-300",
                    phase === "result" && isWin
                      ? "text-primary"
                      : phase === "result"
                      ? "text-destructive"
                      : "text-muted-foreground"
                  )}
                  style={{
                    filter: "drop-shadow(0 0 10px currentColor)",
                  }}
                />
              </div>
              {/* Pulsing glow rings */}
              {phase === "playing" && (
                <>
                  <div
                    className="absolute inset-4 rounded-full border border-primary/30"
                    style={{ animation: "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite" }}
                  />
                  <div
                    className="absolute inset-8 rounded-full border border-primary/20"
                    style={{
                      animation: "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
                      animationDelay: "0.5s",
                    }}
                  />
                </>
              )}
            </div>
          )}

          {/* Lose red tint overlay */}
          {phase === "result" && !isWin && (
            <div
              className="absolute inset-0 bg-destructive/20 animate-pulse"
              style={{ animationDuration: "0.4s", animationIterationCount: "2" }}
            />
          )}
        </div>
      </div>

      {/* Suspense text */}
      <p
        className={cn(
          "mt-10 text-sm text-muted-foreground/70 italic transition-opacity duration-500 relative z-10",
          phase === "playing" ? "opacity-100" : "opacity-0"
        )}
      >
        🔐 Only the chosen few unlock the vault...
      </p>
    </div>
  );
};
