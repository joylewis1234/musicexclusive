import { useCallback, useRef, useState } from "react";
import { toPng } from "html-to-image";

interface ExportOptions {
  width?: number;
  height?: number;
}

export const useTemplateExport = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportPng = useCallback(async (options?: ExportOptions) => {
    if (!canvasRef.current) return;
    const w = options?.width ?? 1080;
    const h = options?.height ?? 1080;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(canvasRef.current, {
        width: w,
        height: h,
        pixelRatio: 3,
        cacheBust: true,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
      });
      const link = document.createElement("a");
      link.download = `music-exclusive-promo-${w}x${h}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("[useTemplateExport] Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { canvasRef, exportPng, isExporting };
};
