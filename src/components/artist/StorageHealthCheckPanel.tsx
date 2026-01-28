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
        <Row
          label="list buckets"
          value={
            result
              ? result.listBuckets.ok
                ? `ok (${result.listBuckets.buckets?.length ?? 0})`
                : "failed"
              : isRunning
                ? "checking…"
                : "—"
          }
        />
        <Row
          label="test upload (1KB)"
          value={
            result
              ? result.testUpload.ok
                ? "ok"
                : result.testUpload.skipped
                  ? `skipped (${result.testUpload.reason ?? ""})`
                  : "failed"
              : isRunning
                ? "checking…"
                : "—"
          }
        />

        {(error || (result && (!result.listBuckets.ok || !result.testUpload.ok))) && (
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground mb-2">Details</p>
            <pre className="text-xs whitespace-pre-wrap break-words text-foreground/90">
              {error
                ? error
                : safeStringify({
                    session: result?.session,
                    artistProfile: result?.artistProfile,
                    listBuckets: result?.listBuckets,
                    testUpload: result?.testUpload,
                  })}
            </pre>
          </div>
        )}
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
