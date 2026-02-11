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

      // Heavy vault bolt slides — deep, chunky metallic thuds
      const boltTimes = [0.2, 0.8, 1.5, 2.1, 2.6];
      boltTimes.forEach((t) => {
        // Impact thud (low freq burst)
        const thud = ctx.createOscillator();
        const thudGain = ctx.createGain();
        const thudFilter = ctx.createBiquadFilter();
        thud.type = "triangle";
        thud.frequency.setValueAtTime(120, now + t);
        thud.frequency.exponentialRampToValueAtTime(45, now + t + 0.12);
        thudFilter.type = "lowpass";
        thudFilter.frequency.setValueAtTime(200, now + t);
        thudGain.gain.setValueAtTime(0, now + t);
        thudGain.gain.linearRampToValueAtTime(0.1, now + t + 0.005);
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.15);
        thud.connect(thudFilter);
        thudFilter.connect(thudGain);
        thudGain.connect(ctx.destination);
        thud.start(now + t);
        thud.stop(now + t + 0.2);

        // Metal-on-metal scrape overtone
        const scrape = ctx.createOscillator();
        const scrapeGain = ctx.createGain();
        const scrapeFilter = ctx.createBiquadFilter();
        scrape.type = "sawtooth";
        scrape.frequency.setValueAtTime(600 + Math.random() * 200, now + t);
        scrape.frequency.exponentialRampToValueAtTime(200, now + t + 0.08);
        scrapeFilter.type = "bandpass";
        scrapeFilter.frequency.setValueAtTime(500, now + t);
        scrapeFilter.Q.setValueAtTime(5, now + t);
        scrapeGain.gain.setValueAtTime(0, now + t);
        scrapeGain.gain.linearRampToValueAtTime(0.025, now + t + 0.003);
        scrapeGain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.07);
        scrape.connect(scrapeFilter);
        scrapeFilter.connect(scrapeGain);
        scrapeGain.connect(ctx.destination);
        scrape.start(now + t);
        scrape.stop(now + t + 0.1);
      });

      // Deep vault rumble — massive steel door vibration
      const rumble = ctx.createOscillator();
      const rumbleGain = ctx.createGain();
      const rumbleFilter = ctx.createBiquadFilter();
      rumble.type = "sawtooth";
      rumble.frequency.setValueAtTime(28, now);
      rumble.frequency.linearRampToValueAtTime(35, now + 1.5);
      rumble.frequency.exponentialRampToValueAtTime(22, now + 3.2);
      rumbleFilter.type = "lowpass";
      rumbleFilter.frequency.setValueAtTime(60, now);
      rumbleGain.gain.setValueAtTime(0.001, now);
      rumbleGain.gain.linearRampToValueAtTime(0.035, now + 0.8);
      rumbleGain.gain.setValueAtTime(0.035, now + 2.0);
      rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 3.5);
      rumble.connect(rumbleFilter);
      rumbleFilter.connect(rumbleGain);
      rumbleGain.connect(ctx.destination);
      rumble.start(now);
      rumble.stop(now + 3.8);

      // Dial spin whirr — mechanical rotation
      const whirr = ctx.createOscillator();
      const whirrGain = ctx.createGain();
      const whirrFilter = ctx.createBiquadFilter();
      whirr.type = "square";
      whirr.frequency.setValueAtTime(80, now + 0.3);
      whirr.frequency.linearRampToValueAtTime(160, now + 1.5);
      whirr.frequency.exponentialRampToValueAtTime(60, now + 2.8);
      whirrFilter.type = "bandpass";
      whirrFilter.frequency.setValueAtTime(120, now);
      whirrFilter.Q.setValueAtTime(8, now);
      whirrGain.gain.setValueAtTime(0.001, now + 0.3);
      whirrGain.gain.linearRampToValueAtTime(0.015, now + 0.8);
      whirrGain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);
      whirr.connect(whirrFilter);
      whirrFilter.connect(whirrGain);
      whirrGain.connect(ctx.destination);
      whirr.start(now + 0.3);
      whirr.stop(now + 3.2);
    } catch {
      console.warn("Web Audio not supported");
    }
  }, [cleanup]);

  const playResultSound = useCallback((isWinner: boolean) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = ctx.currentTime;

      if (isWinner) {
        // Massive vault door swing open — deep resonant boom + metallic echo
        const boom = ctx.createOscillator();
        const boomGain = ctx.createGain();
        const boomFilter = ctx.createBiquadFilter();
        boom.type = "sine";
        boom.frequency.setValueAtTime(60, now);
        boom.frequency.exponentialRampToValueAtTime(35, now + 0.6);
        boomFilter.type = "lowpass";
        boomFilter.frequency.setValueAtTime(80, now);
        boomGain.gain.setValueAtTime(0.001, now);
        boomGain.gain.linearRampToValueAtTime(0.12, now + 0.01);
        boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        boom.connect(boomFilter);
        boomFilter.connect(boomGain);
        boomGain.connect(ctx.destination);
        boom.start(now);
        boom.stop(now + 1.0);

        // Shimmering release — airy high tone (vault interior revealed)
        const shimmer = ctx.createOscillator();
        const shimmerGain = ctx.createGain();
        shimmer.type = "sine";
        shimmer.frequency.setValueAtTime(880, now + 0.15);
        shimmer.frequency.linearRampToValueAtTime(1320, now + 0.8);
        shimmerGain.gain.setValueAtTime(0.001, now + 0.15);
        shimmerGain.gain.linearRampToValueAtTime(0.04, now + 0.3);
        shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        shimmer.connect(shimmerGain);
        shimmerGain.connect(ctx.destination);
        shimmer.start(now + 0.15);
        shimmer.stop(now + 1.2);
      } else {
        // Heavy bolt lock snap — sharp impact + deadbolt thud
        const snap = ctx.createOscillator();
        const snapGain = ctx.createGain();
        const snapFilter = ctx.createBiquadFilter();
        snap.type = "square";
        snap.frequency.setValueAtTime(400, now);
        snap.frequency.exponentialRampToValueAtTime(60, now + 0.15);
        snapFilter.type = "lowpass";
        snapFilter.frequency.setValueAtTime(300, now);
        snapFilter.frequency.exponentialRampToValueAtTime(80, now + 0.15);
        snapGain.gain.setValueAtTime(0.001, now);
        snapGain.gain.linearRampToValueAtTime(0.1, now + 0.005);
        snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        snap.connect(snapFilter);
        snapFilter.connect(snapGain);
        snapGain.connect(ctx.destination);
        snap.start(now);
        snap.stop(now + 0.4);

        // Deadbolt resonance
        const dead = ctx.createOscillator();
        const deadGain = ctx.createGain();
        dead.type = "sine";
        dead.frequency.setValueAtTime(45, now + 0.05);
        dead.frequency.exponentialRampToValueAtTime(30, now + 0.4);
        deadGain.gain.setValueAtTime(0.001, now + 0.05);
        deadGain.gain.linearRampToValueAtTime(0.06, now + 0.08);
        deadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        dead.connect(deadGain);
        deadGain.connect(ctx.destination);
        dead.start(now + 0.05);
        dead.stop(now + 0.6);
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
