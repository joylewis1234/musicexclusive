import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import vaultPortalStatic from "@/assets/vault-portal.png";
import vaultPortalVideo from "@/assets/vault-portal-loop.mp4";

interface VaultPortalProps {
  size?: "sm" | "md" | "lg" | "xl";
  /** Intensify glow briefly (e.g., on WIN state) */
  intensify?: boolean;
  className?: string;
  /** Show unlock icon overlay */
  showUnlockIcon?: boolean;
  children?: React.ReactNode;
}

const sizeClasses = {
  sm: "w-32 h-32 md:w-40 md:h-40",
  md: "w-36 h-36 md:w-44 md:h-44",
  lg: "w-full max-w-sm aspect-square",
  xl: "w-full max-w-md aspect-square",
};

export const VaultPortal = ({
  size = "lg",
  intensify = false,
  className,
  showUnlockIcon = false,
  children,
}: VaultPortalProps) => {
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Attempt to play video on mount
  useEffect(() => {
    const video = videoRef.current;
    if (video && !videoFailed) {
      video.play().catch(() => {
        // Video autoplay failed, fallback to static
        setVideoFailed(true);
      });
    }
  }, [videoFailed]);

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      {/* Focus framing - vignette/halo effect */}
      <div 
        className="absolute inset-[-50%] pointer-events-none z-0"
        style={{
          background: "radial-gradient(circle at center, transparent 20%, hsl(var(--background)) 70%)",
        }}
        aria-hidden="true"
      />

      {/* Energy pulse layers - expanding radial glow */}
      <div 
        className={cn(
          "absolute inset-[-20%] rounded-full blur-[60px] opacity-30 animate-vault-energy-pulse",
          intensify && "animate-vault-intensify-pulse"
        )}
        style={{
          background: "radial-gradient(circle, hsl(var(--secondary)) 0%, hsl(var(--accent)) 50%, transparent 70%)",
        }}
        aria-hidden="true"
      />
      
      {/* Glow breathing layer */}
      <div 
        className={cn(
          "absolute inset-[-10%] rounded-full blur-[40px] opacity-40 animate-vault-glow-breathe",
          intensify && "animate-vault-intensify-glow"
        )}
        style={{
          background: "radial-gradient(circle, hsl(var(--primary)) 0%, hsl(var(--secondary) / 0.5) 60%, transparent 80%)",
        }}
        aria-hidden="true"
      />

      {/* Slow rotating outer ring glow */}
      <div 
        className="absolute inset-[-5%] animate-vault-rotate opacity-50"
        style={{
          background: "conic-gradient(from 0deg, hsl(var(--primary) / 0.6), hsl(var(--accent) / 0.4), hsl(var(--secondary) / 0.6), hsl(var(--primary) / 0.6))",
          borderRadius: "50%",
          filter: "blur(20px)",
        }}
        aria-hidden="true"
      />

      {/* Main portal container with subtle rotation */}
      <div className="relative w-full h-full animate-vault-inner-rotate">
        {/* Video or Static Image */}
        {!videoFailed ? (
          <video
            ref={videoRef}
            src={vaultPortalVideo}
            muted
            loop
            playsInline
            autoPlay
            className={cn(
              "w-full h-full object-contain relative z-10",
              "drop-shadow-[0_0_30px_hsl(var(--primary)/0.5)]",
              intensify && "animate-vault-intensify-scale"
            )}
            onError={() => setVideoFailed(true)}
            aria-label="Vault Portal"
          />
        ) : (
          <img
            src={vaultPortalStatic}
            alt="Vault Portal"
            className={cn(
              "w-full h-full object-contain relative z-10",
              "drop-shadow-[0_0_30px_hsl(var(--primary)/0.5)]",
              intensify && "animate-vault-intensify-scale"
            )}
          />
        )}

        {/* Center content overlay (e.g., unlock icon) */}
        {children && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};
