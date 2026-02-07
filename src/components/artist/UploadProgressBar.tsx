import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import type { UploadStep } from "@/hooks/useTrackUpload";

interface UploadProgressBarProps {
  step: UploadStep;
  progress: number;
  isTimedOut: boolean;
}

const stepMessages: Record<UploadStep, string> = {
  idle: "",
  session_check: "Verifying session...",
  cover_upload: "Uploading cover art...",
  audio_upload: "Uploading audio file...",
  preview_upload: "Uploading preview clip...",
  db_insert: "Saving track...",
  db_update: "Finalizing track...",
  success: "Track published!",
  error: "Upload failed",
};

export function UploadProgressBar({ step, progress, isTimedOut }: UploadProgressBarProps) {
  if (step === "idle") return null;

  const isUploading = ["session_check", "cover_upload", "audio_upload", "db_insert", "db_update"].includes(step);
  const isSuccess = step === "success";
  const isError = step === "error";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {isUploading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          <span className={isError ? "text-destructive" : isSuccess ? "text-green-500" : "text-foreground"}>
            {stepMessages[step]}
          </span>
        </div>
        <span className="text-muted-foreground">{progress}%</span>
      </div>
      
      <Progress 
        value={progress} 
        className={`h-2 ${isError ? "[&>div]:bg-destructive" : isSuccess ? "[&>div]:bg-green-500" : ""}`} 
      />
      
      {isTimedOut && isUploading && (
        <p className="text-xs text-amber-500">
          Upload is taking longer than expected. Please check your connection.
        </p>
      )}
    </div>
  );
}
