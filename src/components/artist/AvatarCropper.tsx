import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Check, X } from "lucide-react";

interface AvatarCropperProps {
  /** Raw image file selected by the user */
  imageFile: File;
  /** Called with the cropped circular image as a File */
  onCrop: (croppedFile: File) => void;
  /** Called when the user cancels cropping */
  onCancel: () => void;
}

const VIEWPORT_SIZE = 256; // px – the visible circle diameter
const OUTPUT_SIZE = 1024; // px – exported crop resolution
const MIN_SCALE = 1;
const MAX_SCALE = 3;

export function AvatarCropper({ imageFile, onCrop, onCancel }: AvatarCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Image state
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Transform state
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Drag tracking
  const dragRef = useRef<{ startX: number; startY: number; startOx: number; startOy: number } | null>(null);

  // Pinch tracking
  const pinchRef = useRef<{ initialDist: number; initialScale: number } | null>(null);

  // Load the image
  useEffect(() => {
    const url = URL.createObjectURL(imageFile);
    setImgSrc(url);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      // Fit image so shortest side fills the viewport
      const minDim = Math.min(img.naturalWidth, img.naturalHeight);
      const fitScale = VIEWPORT_SIZE / minDim;
      setScale(fitScale);
      // Centre the image
      setOffset({
        x: (VIEWPORT_SIZE - img.naturalWidth * fitScale) / 2,
        y: (VIEWPORT_SIZE - img.naturalHeight * fitScale) / 2,
      });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // --- Pointer (mouse + touch) drag ---
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Don't start drag on multi-touch (handled by touch events for pinch)
      if (e.pointerType === "touch") return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = { startX: e.clientX, startY: e.clientY, startOx: offset.x, startOy: offset.y };
    },
    [offset],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      e.preventDefault();
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setOffset({ x: dragRef.current.startOx + dx, y: dragRef.current.startOy + dy });
    },
    [],
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // --- Touch events for drag + pinch ---
  const touchStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        touchStartRef.current = { x: t.clientX, y: t.clientY, ox: offset.x, oy: offset.y };
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY,
        );
        pinchRef.current = { initialDist: dist, initialScale: scale };
        touchStartRef.current = null;
      }
    },
    [offset, scale],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && touchStartRef.current) {
        const t = e.touches[0];
        const dx = t.clientX - touchStartRef.current.x;
        const dy = t.clientY - touchStartRef.current.y;
        setOffset({ x: touchStartRef.current.ox + dx, y: touchStartRef.current.oy + dy });
      } else if (e.touches.length === 2 && pinchRef.current) {
        const dist = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY,
        );
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE * 0.5, pinchRef.current.initialScale * (dist / pinchRef.current.initialDist)));
        setScale(newScale);
      }
    },
    [],
  );

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
    pinchRef.current = null;
  }, []);

  // --- Zoom buttons ---
  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, s * 1.2));
  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE * 0.5, s / 1.2));

  // --- Confirm crop ---
  const handleConfirm = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Map viewport coordinates to output canvas
    const ratio = OUTPUT_SIZE / VIEWPORT_SIZE;
    const drawX = offset.x * ratio;
    const drawY = offset.y * ratio;
    const drawW = img.naturalWidth * scale * ratio;
    const drawH = img.naturalHeight * scale * ratio;

    // Clip to circle
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `avatar-cropped-${Date.now()}.jpg`, { type: "image/jpeg" });
        onCrop(file);
      },
      "image/jpeg",
      0.92,
    );
  }, [offset, scale, onCrop]);

  if (!imgSrc) return null;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">Drag to reposition · Pinch or use buttons to zoom</p>

      {/* Crop viewport */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-full cursor-grab active:cursor-grabbing"
        style={{
          width: VIEWPORT_SIZE,
          height: VIEWPORT_SIZE,
          border: "3px solid hsl(var(--primary) / 0.5)",
          boxShadow: "0 0 20px hsl(var(--primary) / 0.2)",
          touchAction: "none",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={imgSrc}
          alt="Crop preview"
          draggable={false}
          className="absolute pointer-events-none select-none"
          style={{
            left: offset.x,
            top: offset.y,
            width: imgRef.current ? imgRef.current.naturalWidth * scale : "auto",
            height: imgRef.current ? imgRef.current.naturalHeight * scale : "auto",
            maxWidth: "none",
          }}
        />
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={zoomOut} className="h-9 w-9 rounded-full">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground w-12 text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button variant="outline" size="icon" onClick={zoomIn} className="h-9 w-9 rounded-full">
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button variant="outline" size="sm" onClick={onCancel} className="rounded-full">
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleConfirm}
          className="rounded-full"
          style={{ background: "hsl(280, 80%, 50%)" }}
        >
          <Check className="h-4 w-4 mr-1" />
          Use This Crop
        </Button>
      </div>
    </div>
  );
}
