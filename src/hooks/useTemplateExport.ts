import { useCallback, useRef, useState } from "react";
import { toPng } from "html-to-image";

export const useTemplateExport = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportPng = useCallback(async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(canvasRef.current, {
        width: 1080,
        height: 1080,
        pixelRatio: 3,
        cacheBust: true,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
      });
      const link = document.createElement("a");
      link.download = "music-exclusive-promo.png";
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
