import { useCallback, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { toast } from "sonner";

interface ExportOptions {
  width?: number;
  height?: number;
  fileName?: string;
}

export const useTemplateExport = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportPng = useCallback(async (options?: ExportOptions) => {
    if (!canvasRef.current) return;
    const w = options?.width ?? 1080;
    const h = options?.height ?? 1080;
    const fileName = options?.fileName ?? `music-exclusive-promo-${w}x${h}.png`;

    setIsExporting(true);
    try {
      const blob = await toBlob(canvasRef.current, {
        width: w,
        height: h,
        pixelRatio: 2,
        cacheBust: true,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
      });

      if (!blob) throw new Error("Export produced empty result");

      // Use blob URL + anchor for reliable mobile download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();

      // Clean up after a delay to allow download to start
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 1000);

      toast.success("PNG downloaded!");
    } catch (err) {
      console.error("[useTemplateExport] Export failed:", err);
      toast.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { canvasRef, exportPng, isExporting };
};
