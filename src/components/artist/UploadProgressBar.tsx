import { useState, useEffect, useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Loader2 } from "lucide-react";
import type { UploadStep } from "@/hooks/useTrackUpload";

interface UploadProgressBarProps {
  step: UploadStep;
  progress: number;
  isTimedOut: boolean;
}

const STEPS: { key: UploadStep; label: string }[] = [
  { key: "session_check", label: "Verifying session" },
  { key: "db_insert", label: "Creating track" },
  { key: "cover_upload", label: "Uploading cover art" },
  { key: "audio_upload", label: "Uploading audio" },
  { key: "preview_upload", label: "Uploading preview" },
  { key: "db_update", label: "Finalizing" },
];

function stepIndex(step: UploadStep): number {
  const idx = STEPS.findIndex((s) => s.key === step);
  return idx === -1 ? -1 : idx;
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return "";
  if (bytesPerSec < 1024) return `${Math.round(bytesPerSec)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

function formatEta(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) return "";
  if (seconds < 60) return `~${Math.ceil(seconds)}s left`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return `~${m}m ${s}s left`;
}

export function UploadProgressBar({ step, progress, isTimedOut }: UploadProgressBarProps) {
  const isSuccess = step === "success";
  const isError = step === "error";
  const currentIdx = stepIndex(step);
  const isUploading = step === "cover_upload" || step === "audio_upload" || step === "preview_upload";

  const startRef = useRef<{ time: number; progress: number } | null>(null);
  const [speed, setSpeed] = useState("");
  const [eta, setEta] = useState("");

  useEffect(() => {
    if (isUploading && progress > 15) {
      if (!startRef.current) {
        startRef.current = { time: Date.now(), progress };
      }
      const elapsed = (Date.now() - startRef.current.time) / 1000;
      const progressDelta = progress - startRef.current.progress;
      if (elapsed > 1 && progressDelta > 0) {
        const pctPerSec = progressDelta / elapsed;
        const remaining = (100 - progress) / pctPerSec;
        setEta(formatEta(remaining));
        const estTotalBytes = 20 * 1024 * 1024;
        const bytesPerSec = (progressDelta / 70) * estTotalBytes / elapsed;
        setSpeed(formatSpeed(bytesPerSec));
      }
    } else {
      startRef.current = null;
      setSpeed("");
      setEta("");
    }
  }, [progress, isUploading]);

  if (step === "idle") return null;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className={isError ? "text-destructive font-medium" : isSuccess ? "text-green-500 font-medium" : "text-foreground font-medium"}>
            {isSuccess ? "Track published!" : isError ? "Upload failed" : "Uploading…"}
          </span>
          <div className="flex items-center gap-3">
            {isUploading && speed && (
              <span className="text-xs text-muted-foreground">{speed}</span>
            )}
            {isUploading && eta && (
              <span className="text-xs text-muted-foreground">{eta}</span>
            )}
            <span className="text-muted-foreground tabular-nums">{progress}%</span>
          </div>
        </div>
        <Progress
          value={progress}
          className={`h-2.5 ${isError ? "[&>div]:bg-destructive" : isSuccess ? "[&>div]:bg-green-500" : ""}`}
        />
      </div>

      <div className="space-y-1.5">
        {STEPS.map((s, idx) => {
          const isDone = isSuccess || currentIdx > idx;
          const isActive = !isSuccess && !isError && currentIdx === idx;
          const isPending = !isDone && !isActive;

          return (
            <div
              key={s.key}
              className={`flex items-center gap-2 text-xs py-1 px-2 rounded transition-colors ${
                isActive ? "bg-primary/10 text-foreground" : isDone ? "text-muted-foreground" : "text-muted-foreground/50"
              }`}
            >
              {isDone && <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />}
              {isActive && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />}
              {isPending && <div className="h-3.5 w-3.5 rounded-full border border-border shrink-0" />}
              <span>{s.label}</span>
              {isActive && (s.key === "audio_upload" || s.key === "cover_upload") && (
                <span className="ml-auto text-primary tabular-nums">
                  {Math.max(0, Math.min(100, Math.round(((progress - 20) / 70) * 100)))}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {isTimedOut && !isSuccess && !isError && (
        <p className="text-xs text-amber-500 mt-1">
          Upload is taking longer than expected — don't close this page, it's still working.
        </p>
      )}
    </div>
  );
}
