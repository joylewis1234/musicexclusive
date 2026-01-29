import { useStorageHealthCheck } from "@/hooks/useStorageHealthCheck";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { Info, Loader2 } from "lucide-react";

export const StorageHealthCheckPanel = () => {
  const { isRunning, result, error, run, safeStringify } = useStorageHealthCheck();

  return (
    <GlowCard className="p-4" >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-sm uppercase tracking-widest text-foreground flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Storage health check
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Preflight validation for session + storage + permissions.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={run} disabled={isRunning}>
          {isRunning ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Running
            </span>
          ) : (
            "Re-run"
          )}
        </Button>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <Row label="auth session exists?" value={result ? String(result.session.ok) : isRunning ? "checking…" : "—"} />
        <Row label="storage base URL" value={result?.storageBaseUrl ?? "—"} monospace />

        <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-2">listBuckets()</p>
            <pre className="text-xs whitespace-pre-wrap break-words text-foreground/90">
              {result ? safeStringify(result.listBuckets) : isRunning ? "checking…" : "—"}
            </pre>
          </div>
          <div className="h-px bg-border/40" />
          <div>
            <p className="text-xs text-muted-foreground mb-2">test upload (1KB) → track_covers/test.txt</p>
            <pre className="text-xs whitespace-pre-wrap break-words text-foreground/90">
              {result ? safeStringify(result.testUpload) : isRunning ? "checking…" : "—"}
            </pre>
          </div>
          {(error || (result && (!result.session.ok || !result.listBuckets.ok || !result.testUpload.ok))) && (
            <>
              <div className="h-px bg-border/40" />
              <div>
                <p className="text-xs text-muted-foreground mb-2">Top-level error</p>
                <pre className="text-xs whitespace-pre-wrap break-words text-foreground/90">
                  {error ? error : "—"}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </GlowCard>
  );
};

function Row({ label, value, monospace }: { label: string; value: string; monospace?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={monospace ? "text-foreground font-mono text-xs break-all" : "text-foreground"}>{value}</span>
    </div>
  );
}
