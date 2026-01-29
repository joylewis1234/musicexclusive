import { CheckCircle, XCircle, Loader2, Clock } from "lucide-react";
import { GlowCard } from "@/components/ui/GlowCard";
import type { DiagnosticLog, UploadStep } from "@/hooks/useTrackUpload";

interface UploadDiagnosticsPanelProps {
  diagnostics: DiagnosticLog[];
  isVisible: boolean;
  isTimedOut: boolean;
}

const stepLabels: Record<UploadStep, string> = {
  idle: "Idle",
  preflight: "Preflight Check",
  session_check: "Session Check",
  cover_upload: "Cover Upload",
  audio_upload: "Audio Upload",
  db_insert: "Database Insert",
  db_update: "Database Update",
  success: "Complete",
  error: "Error",
};

export function UploadDiagnosticsPanel({ diagnostics, isVisible, isTimedOut }: UploadDiagnosticsPanelProps) {
  if (!isVisible || diagnostics.length === 0) return null;

  return (
    <GlowCard className="p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Upload Diagnostics</h3>
        {isTimedOut && (
          <div className="flex items-center gap-1 text-amber-500 text-xs">
            <Clock className="h-3 w-3" />
            <span>Taking longer than expected...</span>
          </div>
        )}
      </div>
      
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {diagnostics.map((log, index) => {
          const ts =
            log.timestamp instanceof Date
              ? log.timestamp
              : new Date((log as any).timestamp ?? Date.now());

          return (
          <div 
            key={index} 
            className={`text-xs p-2 rounded border ${
              log.status === "error" 
                ? "bg-destructive/10 border-destructive/30" 
                : log.status === "success"
                ? "bg-green-500/10 border-green-500/30"
                : log.status === "retry"
                ? "bg-amber-500/10 border-amber-500/30"
                : "bg-muted/50 border-border/50"
            }`}
          >
            <div className="flex items-center gap-2">
              {log.status === "pending" && (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              )}
              {log.status === "retry" && (
                <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
              )}
              {log.status === "success" && (
                <CheckCircle className="h-3 w-3 text-green-500" />
              )}
              {log.status === "error" && (
                <XCircle className="h-3 w-3 text-destructive" />
              )}
              <span className="font-medium">{stepLabels[log.step]}</span>
              <span className="text-muted-foreground ml-auto">
                {ts.toLocaleTimeString()}
              </span>
            </div>
            <p className="mt-1 text-muted-foreground">{log.message}</p>
            {log.details && (
              <pre className="mt-1 text-[10px] bg-muted/50 p-1 rounded overflow-x-auto whitespace-pre-wrap break-all">
                {log.details}
              </pre>
            )}
          </div>
        );
        })}
      </div>
    </GlowCard>
  );
}
