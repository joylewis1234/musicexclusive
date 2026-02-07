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

export function UploadProgressBar({ step, progress, isTimedOut }: UploadProgressBarProps) {
  if (step === "idle") return null;

  const isSuccess = step === "success";
  const isError = step === "error";
  const currentIdx = stepIndex(step);

  return (
    <div className="space-y-4">
      {/* Overall progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className={isError ? "text-destructive font-medium" : isSuccess ? "text-green-500 font-medium" : "text-foreground font-medium"}>
            {isSuccess ? "Track published!" : isError ? "Upload failed" : "Uploading…"}
          </span>
          <span className="text-muted-foreground tabular-nums">{progress}%</span>
        </div>
        <Progress
          value={progress}
          className={`h-2.5 ${isError ? "[&>div]:bg-destructive" : isSuccess ? "[&>div]:bg-green-500" : ""}`}
        />
      </div>

      {/* Step checklist */}
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
              {isActive && s.key === "audio_upload" && (
                <span className="ml-auto text-primary tabular-nums">
                  {Math.max(0, Math.min(100, Math.round(((progress - 60) / 25) * 100)))}%
                </span>
              )}
              {isActive && s.key === "cover_upload" && (
                <span className="ml-auto text-primary tabular-nums">
                  {Math.max(0, Math.min(100, Math.round(((progress - 30) / 25) * 100)))}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Timeout warning */}
      {isTimedOut && !isSuccess && !isError && (
        <p className="text-xs text-amber-500 mt-1">
          Upload is taking longer than expected — don't close this page, it's still working.
        </p>
      )}
    </div>
  );
}
