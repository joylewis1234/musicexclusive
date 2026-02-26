import { useCallback, useState } from "react";
import { toast } from "sonner";

interface VideoExportParams {
  width: number;
  height: number;
  template: "artist-photo" | "cover-art";
  imageUrl: string | null;
  artistName: string;
  trackTitle: string;
  releaseDate?: string;
  ctaLine: string;
  imagePosition?: { scale: number; objectPosition: string };
  durationSeconds?: number;
}

export const useVideoExport = () => {
  const [isExportingVideo, setIsExportingVideo] = useState(false);

  const exportVideo = useCallback(async (params: VideoExportParams) => {
    if (!params.imageUrl) {
      toast.error("Please upload an image first");
      return;
    }

    setIsExportingVideo(true);
    toast.info("Recording video… this takes a few seconds.");

    try {
      const {
        width: W, height: H, template, imageUrl, artistName, trackTitle,
        releaseDate, ctaLine, imagePosition, durationSeconds = 6,
      } = params;

      const img = await loadImage(imageUrl);

      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      const done = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });

      recorder.start();

      const isRed = template === "artist-photo";
      const accentHue = isRed ? 0 : 210;

      const imgScale = imagePosition?.scale ?? 1;
      const posMatch = imagePosition?.objectPosition?.match(/(\d+)%\s+(\d+)%/);
      const imgOffX = posMatch ? parseInt(posMatch[1]) / 100 : 0.5;
      const imgOffY = posMatch ? parseInt(posMatch[2]) / 100 : 0.5;

      const drawParams = { W, H, isRed, accentHue, img, artistName, trackTitle, releaseDate, ctaLine, imgScale, imgOffX, imgOffY };

      const startTime = performance.now();
      const duration = durationSeconds * 1000;

      await new Promise<void>((resolve) => {
        function animate() {
          const elapsed = performance.now() - startTime;
          if (elapsed >= duration) {
            recorder.stop();
            resolve();
            return;
          }
          const t = elapsed / 1000;
          drawFrame(ctx, { ...drawParams, t });
          requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);
      });

      const blob = await done;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeName = `${(artistName || "promo").replace(/\s+/g, "-")}-${(trackTitle || "track").replace(/\s+/g, "-")}`.toLowerCase();
      link.download = `${safeName}-${W}x${H}.webm`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 1000);

      toast.success("Video downloaded!");
    } catch (err) {
      console.error("[useVideoExport] Export failed:", err);
      toast.error("Video export failed. Please try again.");
    } finally {
      setIsExportingVideo(false);
    }
  }, []);

  return { exportVideo, isExportingVideo };
};

/* ── helpers ── */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

interface DrawParams {
  W: number; H: number; isRed: boolean; accentHue: number;
  img: HTMLImageElement; artistName: string; trackTitle: string;
  releaseDate?: string; ctaLine: string;
  imgScale: number; imgOffX: number; imgOffY: number; t: number;
}

function drawFrame(ctx: CanvasRenderingContext2D, p: DrawParams) {
  const { W, H, isRed, accentHue, img, artistName, trackTitle, releaseDate, ctaLine, imgScale, imgOffX, imgOffY, t } = p;

  // Animated values
  const glowPulse = 0.5 + 0.5 * Math.sin(t * 1.5);
  const ctaGlow = 0.5 + 0.5 * Math.sin(t * 2.0 + 1);
  const badgeGlow = 0.4 + 0.4 * Math.sin(t * 1.2 + 0.5);

  // ── Background ──
  const bgGrad = ctx.createRadialGradient(W / 2, 0, 0, W / 2, H / 2, W);
  bgGrad.addColorStop(0, isRed ? "hsl(30, 20%, 8%)" : "hsl(220, 20%, 8%)");
  bgGrad.addColorStop(0.6, isRed ? "hsl(0, 0%, 3%)" : "hsl(220, 10%, 3%)");
  bgGrad.addColorStop(1, "hsl(0, 0%, 0%)");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Atmospheric smoke ──
  drawSmoke(ctx, W * 0.3, H * 0.25, W * 0.5, H * 0.4, `hsla(${accentHue}, 60%, 30%, 0.15)`);
  drawSmoke(ctx, W * 0.7, H * 0.3, W * 0.45, H * 0.35, `hsla(${accentHue}, 60%, 28%, 0.12)`);
  drawSmoke(ctx, W * 0.5, H * 0.7, W * 0.5, H * 0.3, `hsla(${accentHue}, 55%, 25%, 0.10)`);

  // ── Gold light burst behind image (ANIMATED) ──
  const burstAlpha = 0.12 + 0.18 * glowPulse;
  const burst = ctx.createRadialGradient(W / 2, 280, 0, W / 2, 280, 420);
  burst.addColorStop(0, `hsla(42, 80%, 50%, ${burstAlpha})`);
  burst.addColorStop(0.5, `hsla(42, 70%, 40%, ${burstAlpha * 0.35})`);
  burst.addColorStop(1, "transparent");
  ctx.fillStyle = burst;
  ctx.fillRect(0, 0, W, H);

  // ── Image ──
  const imgSize = 440;
  const imgX = (W - imgSize) / 2;
  const imgY = 110;

  // Animated glow ring behind image
  ctx.save();
  ctx.shadowColor = `hsla(42, 80%, 50%, ${0.15 + 0.25 * glowPulse})`;
  ctx.shadowBlur = 50 + 40 * glowPulse;
  ctx.fillStyle = "rgba(0,0,0,0.01)";
  roundRect(ctx, imgX - 6, imgY - 6, imgSize + 12, imgSize + 12, 18);
  ctx.fill();
  ctx.restore();

  // Draw image clipped
  ctx.save();
  roundRect(ctx, imgX, imgY, imgSize, imgSize, 16);
  ctx.clip();

  const iw = img.width, ih = img.height;
  const coverScale = Math.max(imgSize / iw, imgSize / ih) * imgScale;
  const sw = imgSize / coverScale;
  const sh = imgSize / coverScale;
  const sx = (iw - sw) * imgOffX;
  const sy = (ih - sh) * imgOffY;
  ctx.drawImage(img, sx, sy, sw, sh, imgX, imgY, imgSize, imgSize);
  ctx.restore();

  // Image border
  ctx.strokeStyle = `hsla(42, 70%, 50%, ${0.4 + 0.2 * glowPulse})`;
  ctx.lineWidth = 3;
  roundRect(ctx, imgX, imgY, imgSize, imgSize, 16);
  ctx.stroke();

  // ── Badge at top (ANIMATED glow) ──
  const badgeText = "EXCLUSIVE MUSIC RELEASE";
  ctx.font = "bold 26px Georgia, serif";
  ctx.textAlign = "center";
  const badgeW = 720;
  const badgeH = 54;
  const badgeX = (W - badgeW) / 2;
  const badgeY = 24;

  ctx.save();
  ctx.shadowColor = `hsla(42, 80%, 55%, ${badgeGlow * 0.5})`;
  ctx.shadowBlur = 15 + 20 * badgeGlow;
  ctx.fillStyle = "hsla(0, 0%, 0%, 0.6)";
  ctx.strokeStyle = `hsla(42, 70%, 50%, ${0.35 + 0.35 * badgeGlow})`;
  ctx.lineWidth = 2;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 4);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = `hsl(42, 75%, 55%)`;
  ctx.font = "bold 26px Georgia, serif";
  ctx.fillText("🔥   " + badgeText, W / 2, badgeY + 36);

  // ── Text block ──
  const textBaseY = imgY + imgSize + 30;

  // "Now Streaming On"
  ctx.fillStyle = "hsl(42, 55%, 65%)";
  ctx.font = "italic 600 28px Georgia, serif";
  ctx.fillText("Now Streaming On", W / 2, textBaseY);

  // "MUSIC EXCLUSIVE"
  ctx.save();
  ctx.fillStyle = "hsl(0, 0%, 96%)";
  ctx.font = "800 68px Georgia, serif";
  ctx.shadowColor = "hsla(42, 70%, 50%, 0.35)";
  ctx.shadowBlur = 40;
  ctx.fillText("MUSIC EXCLUSIVE", W / 2, textBaseY + 68);
  ctx.restore();

  // Artist name
  ctx.save();
  ctx.fillStyle = "hsl(42, 65%, 62%)";
  ctx.font = "italic 800 44px Georgia, serif";
  ctx.shadowColor = "hsla(42, 70%, 50%, 0.25)";
  ctx.shadowBlur = 20;
  ctx.fillText((artistName || "Artist Name").toUpperCase(), W / 2, textBaseY + 118);
  ctx.restore();

  // Track title
  ctx.save();
  ctx.fillStyle = "hsl(0, 0%, 100%)";
  ctx.font = "800 48px Georgia, serif";
  ctx.shadowColor = "hsla(0, 0%, 0%, 0.6)";
  ctx.shadowBlur = 10;
  ctx.fillText((trackTitle || "Track Title").toUpperCase(), W / 2, textBaseY + 170);
  ctx.restore();

  let nextY = textBaseY + 185;

  // Release date
  if (releaseDate) {
    ctx.fillStyle = `hsl(${accentHue}, 70%, 50%)`;
    ctx.font = "italic bold 30px Georgia, serif";
    ctx.fillText(releaseDate, W / 2, nextY + 25);
    nextY += 40;
  }

  // ── Accent line ──
  nextY += 8;
  const lineGrad = ctx.createLinearGradient(W / 2 - 300, 0, W / 2 + 300, 0);
  lineGrad.addColorStop(0, "transparent");
  lineGrad.addColorStop(0.3, `hsla(${accentHue}, 70%, 45%, 0.6)`);
  lineGrad.addColorStop(0.5, `hsla(${accentHue}, 70%, 45%, 0.8)`);
  lineGrad.addColorStop(0.7, `hsla(${accentHue}, 70%, 45%, 0.6)`);
  lineGrad.addColorStop(1, "transparent");
  ctx.fillStyle = lineGrad;
  ctx.fillRect(W / 2 - 300, nextY, 600, 2);
  nextY += 14;

  // ── Footer brand ──
  ctx.fillStyle = "hsl(0, 0%, 92%)";
  ctx.font = "800 28px Georgia, serif";
  ctx.fillText("♛  MUSIC EXCLUSIVE  ♛", W / 2, nextY + 24);
  nextY += 42;

  // ── CTA badge (ANIMATED glow) ──
  const ctaText = (ctaLine || "Available Now").toUpperCase();
  ctx.font = "800 26px Georgia, serif";
  const ctaW = 420;
  const ctaH = 46;
  const ctaX = (W - ctaW) / 2;

  ctx.save();
  ctx.shadowColor = `hsla(${accentHue}, 70%, 50%, ${ctaGlow * 0.45})`;
  ctx.shadowBlur = 12 + 22 * ctaGlow;
  ctx.fillStyle = "hsla(0, 0%, 0%, 0.5)";
  ctx.strokeStyle = `hsla(42, 70%, 50%, ${0.3 + 0.35 * ctaGlow})`;
  ctx.lineWidth = 2;
  roundRect(ctx, ctaX, nextY, ctaW, ctaH, 4);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = `hsl(${accentHue}, 70%, 50%)`;
  ctx.font = "800 26px Georgia, serif";
  ctx.fillText(ctaText, W / 2, nextY + 32);
  nextY += ctaH + 12;

  // ── Domain line ──
  ctx.fillStyle = "hsl(0, 0%, 55%)";
  ctx.font = "bold 20px Georgia, serif";
  ctx.fillText("ONLY EXCLUSIVELY RELEASED ON", W / 2, nextY + 18);

  ctx.fillStyle = "hsl(0, 0%, 93%)";
  ctx.font = "800 30px Georgia, serif";
  ctx.fillText("🌐  www.TheMusicIsExclusive.com", W / 2, nextY + 52);

  // ── Vignette ──
  const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.7);
  vig.addColorStop(0, "transparent");
  vig.addColorStop(1, "hsla(0, 0%, 0%, 0.55)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

function drawSmoke(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string) {
  ctx.save();
  const ratio = ry / rx;
  ctx.translate(0, cy - cy * (rx / ry));
  ctx.scale(1, ratio);
  const grad = ctx.createRadialGradient(cx, cy / ratio, 0, cx, cy / ratio, rx);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.fillRect(cx - rx, cy / ratio - rx, rx * 2, rx * 2);
  ctx.restore();
}
