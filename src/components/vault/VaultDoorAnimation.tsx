import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import vaultPortal from "@/assets/vault-portal.png";
import vaultVideo from "@/assets/vault-door-animation.mp4";

interface VaultDoorAnimationProps {
  onComplete: (result: "winner" | "not_selected") => void;
  result: "winner" | "not_selected";
}

const SFX_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-sfx`;

const MECHANISM_PROMPT = "Heavy steel bank vault door mechanism turning, metallic gears grinding, deep mechanical clicks";
const MECHANISM_DURATION = 5;

// Session-level audio cache so we only generate the sound once
let cachedAudio: HTMLAudioElement | null = null;
let fetchPromise: Promise<HTMLAudioElement | null> | null = null;

function preloadMechanismSfx(): Promise<HTMLAudioElement | null> {
  if (cachedAudio) return Promise.resolve(cachedAudio);
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const resp = await fetch(SFX_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ prompt: MECHANISM_PROMPT, duration: MECHANISM_DURATION }),
      });
      if (!resp.ok) {
        console.warn("SFX fetch failed:", resp.status);
        return null;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      // Wait for the audio to be fully decodable before resolving
      await new Promise<void>((resolve) => {
        audio.addEventListener("canplaythrough", () => resolve(), { once: true });
        audio.load();
      });
      cachedAudio = audio;
      return audio;
    } catch (e) {
      console.warn("SFX error:", e);
      return null;
    }
  })();

  return fetchPromise;
}

/** Preload & play vault mechanism sound via ElevenLabs */
const useVaultSounds = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const readyRef = useRef(false);

  // Preload immediately on mount
  useEffect(() => {
    preloadMechanismSfx().then((audio) => {
      if (audio) {
        audioRef.current = audio;
        readyRef.current = true;
      }
    });
  }, []);

  const playMechanismSound = useCallback(() => {
    const audio = audioRef.current;
    if (audio && readyRef.current) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  }, []);

  return { playMechanismSound, isReady: readyRef };
};

export const VaultDoorAnimation = ({ onComplete, result }: VaultDoorAnimationProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<"idle" | "playing" | "result">("idle");
  const [videoReady, setVideoReady] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showSmoke, setShowSmoke] = useState(false);
  const { playMechanismSound } = useVaultSounds();
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
      playMechanismSound();

      if (!useFallback && videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => setUseFallback(true));
      }
    }, 1200);
    return () => clearTimeout(delay);
  }, [useFallback, playMechanismSound]);

  // Video timeupdate → freeze for lose, let play for win
  useEffect(() => {
    const video = videoRef.current;
    if (!video || useFallback) return;

    const onTimeUpdate = () => {
      // Show smoke at ~60% to cover the figure before it's fully visible
      if (video.currentTime >= video.duration * 0.55 && !showSmoke) {
        setShowSmoke(true);
      }
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

    // Haptic
    if (navigator.vibrate) {
      navigator.vibrate(result === "winner" ? 120 : 50);
    }

    // Transition to result screen after overlay flash
    setTimeout(() => {
      setShowOverlay(false);
      setTimeout(() => onComplete(result), 400);
    }, 600);
  }, [result, onComplete]);

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
          {phase === "playing" && "🎵 New Music Awaits..."}
          {phase === "result" && (isWin ? "🔓 The Vault Has Opened" : "🔒 Not This Time")}
        </h2>
        <p className="text-muted-foreground text-sm">
          {phase === "idle" && "Preparing the vault mechanism..."}
          {phase === "playing" && "Will you get inside?"}
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

          {/* Pink & blue smoke overlay to cover the figure */}
          {showSmoke && (
            <div
              className="absolute inset-0 z-10 pointer-events-none"
              style={{
                animation: "smokeIn 1.2s ease-out forwards",
              }}
            >
              {/* Layered smoke clouds */}
              <div
                className="absolute inset-0"
                style={{
                  background: "radial-gradient(ellipse at 50% 80%, hsl(300 70% 60% / 0.8) 0%, hsl(280 60% 50% / 0.4) 40%, transparent 70%)",
                  animation: "smokeRise 2s ease-out forwards",
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: "radial-gradient(ellipse at 40% 70%, hsl(220 70% 60% / 0.7) 0%, hsl(240 60% 50% / 0.3) 45%, transparent 75%)",
                  animation: "smokeRise 2.2s ease-out 0.1s forwards",
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: "radial-gradient(ellipse at 60% 75%, hsl(320 80% 65% / 0.6) 0%, hsl(300 50% 45% / 0.3) 40%, transparent 70%)",
                  animation: "smokeRise 1.8s ease-out 0.2s forwards",
                }}
              />
              {/* Center dense fog to fully obscure the figure */}
              <div
                className="absolute inset-0"
                style={{
                  background: "radial-gradient(circle at 50% 60%, hsl(280 50% 30% / 0.9) 0%, hsl(260 40% 20% / 0.6) 30%, transparent 60%)",
                  animation: "smokeRise 1.5s ease-out forwards",
                }}
              />
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
