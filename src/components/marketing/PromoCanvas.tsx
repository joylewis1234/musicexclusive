import { useRef, useEffect, useCallback, useState } from "react";
import { PROMO_TEMPLATES, PROMO_BADGES } from "./PromoTemplates";
import { Crown } from "lucide-react";

interface PromoCanvasProps {
  format: "story" | "reel";
  templateId: string;
  trackTitle: string;
  artistName: string;
  genre: string;
  coverArtUrl: string | null;
  selectedBadges: string[];
  showSafeZones: boolean;
  showCta: boolean;
  ctaText: string;
  onRender?: (canvas: HTMLCanvasElement) => void;
}

// Safe zone constants (in pixels for 1080x1920)
const SAFE_ZONES = {
  story: {
    top: 120,
    bottom: 200,
    left: 40,
    right: 40,
  },
  reel: {
    top: 120,
    bottom: 280,
    left: 40,
    right: 180, // Account for icon stack
  },
};

export const PromoCanvas = ({
  format,
  templateId,
  trackTitle,
  artistName,
  genre,
  coverArtUrl,
  selectedBadges,
  showSafeZones,
  showCta,
  ctaText,
  onRender,
}: PromoCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(false);

  const template = PROMO_TEMPLATES.find((t) => t.id === templateId) || PROMO_TEMPLATES[0];
  const safeZone = SAFE_ZONES[format];

  const loadImage = useCallback((src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }, []);

  const renderCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsRendering(true);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 1080;
    const height = 1920;
    canvas.width = width;
    canvas.height = height;

    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    if (template.style === "gradient" || template.id === "sunset-gradient") {
      gradient.addColorStop(0, "#581c87");
      gradient.addColorStop(0.3, "#9333ea");
      gradient.addColorStop(1, "#f97316");
    } else if (template.id === "neon-purple") {
      gradient.addColorStop(0, "#1a0a2e");
      gradient.addColorStop(0.5, "#2d1b4e");
      gradient.addColorStop(1, "#1a0a2e");
    } else if (template.id === "cyber-blue") {
      gradient.addColorStop(0, "#0c1929");
      gradient.addColorStop(0.5, "#1a365d");
      gradient.addColorStop(1, "#0c1929");
    } else if (template.id === "gold-luxury") {
      gradient.addColorStop(0, "#0a0a0a");
      gradient.addColorStop(0.5, "#1a1a1a");
      gradient.addColorStop(1, "#0a0a0a");
    } else {
      gradient.addColorStop(0, "#0f0f0f");
      gradient.addColorStop(0.5, "#1a1a1a");
      gradient.addColorStop(1, "#0f0f0f");
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add subtle noise/texture
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < 5000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#000000";
      ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
    }
    ctx.globalAlpha = 1;

    // Draw cover art with glow
    const coverSize = 480;
    const coverX = (width - coverSize) / 2;
    const coverY = 380;

    if (coverArtUrl) {
      try {
        const img = await loadImage(coverArtUrl);
        
        // Glow effect
        ctx.shadowColor = template.accentColor;
        ctx.shadowBlur = 60;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Rounded rectangle for cover
        const radius = 32;
        ctx.beginPath();
        ctx.roundRect(coverX, coverY, coverSize, coverSize, radius);
        ctx.clip();
        ctx.drawImage(img, coverX, coverY, coverSize, coverSize);
        ctx.restore();
        ctx.save();
        
        // Reset shadow
        ctx.shadowBlur = 0;
      } catch (e) {
        // Draw placeholder
        ctx.fillStyle = "#333333";
        ctx.beginPath();
        ctx.roundRect(coverX, coverY, coverSize, coverSize, 32);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = "#333333";
      ctx.beginPath();
      ctx.roundRect(coverX, coverY, coverSize, coverSize, 32);
      ctx.fill();
    }

    // Draw badges
    let badgeY = coverY - 80;
    selectedBadges.forEach((badgeId) => {
      const badge = PROMO_BADGES.find((b) => b.id === badgeId);
      if (!badge) return;

      ctx.font = "bold 28px system-ui, sans-serif";
      const text = badge.label;
      const textWidth = ctx.measureText(text).width;
      const badgeWidth = textWidth + 60;
      const badgeHeight = 48;
      const badgeX = (width - badgeWidth) / 2;

      // Badge background with glow
      ctx.shadowColor = badge.glowColor;
      ctx.shadowBlur = 20;
      ctx.fillStyle = badge.bgColor;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 24);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Badge text
      ctx.fillStyle = badge.textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, width / 2, badgeY + badgeHeight / 2);

      badgeY -= 60;
    });

    // Track title
    ctx.font = "bold 64px system-ui, sans-serif";
    ctx.fillStyle = template.textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    
    // Word wrap for long titles
    const maxWidth = width - 120;
    const titleY = coverY + coverSize + 60;
    const words = trackTitle.split(" ");
    let line = "";
    let y = titleY;
    
    for (const word of words) {
      const testLine = line + word + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line !== "") {
        ctx.fillText(line.trim(), width / 2, y);
        line = word + " ";
        y += 72;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), width / 2, y);

    // Artist name
    ctx.font = "500 40px system-ui, sans-serif";
    ctx.fillStyle = template.accentColor;
    ctx.fillText(artistName, width / 2, y + 90);

    // Genre tag
    if (genre) {
      ctx.font = "600 24px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.fillText(genre.toUpperCase(), width / 2, y + 150);
    }

    // CTA strip
    if (showCta) {
      const ctaY = height - 320;
      const ctaHeight = 64;
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fillRect(0, ctaY, width, ctaHeight);
      
      ctx.font = "600 28px system-ui, sans-serif";
      ctx.fillStyle = template.textColor;
      ctx.fillText(ctaText, width / 2, ctaY + ctaHeight / 2 + 2);
    }

    // Music Exclusive branding
    const brandingY = height - 180;
    
    // Wordmark
    ctx.font = "bold 32px system-ui, sans-serif";
    ctx.fillStyle = template.textColor;
    ctx.letterSpacing = "4px";
    ctx.fillText("MUSIC EXCLUSIVE™", width / 2, brandingY);
    
    // Tagline
    ctx.font = "400 20px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fillText("Where Every Stream Counts", width / 2, brandingY + 45);

    // Safe zone overlay (for preview only)
    if (showSafeZones) {
      ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      
      // Top safe zone
      ctx.strokeRect(safeZone.left, safeZone.top, width - safeZone.left - safeZone.right, 2);
      // Bottom safe zone
      ctx.strokeRect(safeZone.left, height - safeZone.bottom, width - safeZone.left - safeZone.right, 2);
      // Right safe zone (for reels)
      if (format === "reel") {
        ctx.strokeRect(width - safeZone.right, safeZone.top, 2, height - safeZone.top - safeZone.bottom);
      }
      
      ctx.setLineDash([]);
    }

    setIsRendering(false);
    onRender?.(canvas);
  }, [format, templateId, trackTitle, artistName, genre, coverArtUrl, selectedBadges, showSafeZones, showCta, ctaText, template, safeZone, loadImage, onRender]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  return (
    <div className="relative w-full max-w-[270px] mx-auto">
      <div className="relative aspect-[9/16] rounded-xl overflow-hidden shadow-2xl">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ imageRendering: "crisp-edges" }}
        />
        {isRendering && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </div>
      {showSafeZones && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Red dashed lines = safe zones
        </p>
      )}
    </div>
  );
};

// Utility to export canvas as blob
export const canvasToBlob = (canvas: HTMLCanvasElement, quality = 0.92): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          // Check size and reduce quality if needed
          if (blob.size > 1.5 * 1024 * 1024) {
            canvas.toBlob(
              (smallerBlob) => {
                if (smallerBlob) resolve(smallerBlob);
                else reject(new Error("Failed to compress image"));
              },
              "image/jpeg",
              0.8
            );
          } else {
            resolve(blob);
          }
        } else {
          reject(new Error("Failed to create blob"));
        }
      },
      "image/png",
      quality
    );
  });
};
