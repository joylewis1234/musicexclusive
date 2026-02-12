import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDebugLogs } from "@/hooks/useDebugLogs";
import { clearDebugLines } from "@/utils/debugLog";
import { useToast } from "@/hooks/use-toast";

export function UploadDebugConsole() {
  const lines = useDebugLogs();
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines.length, open]);

  const handleCopy = () => {
    const text = lines
      .map((l) => `[${l.ts}] ${l.msg}`)
      .join("\n");
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied", description: `${lines.length} log lines copied to clipboard.` });
    }).catch(() => {
      toast({ title: "Copy failed", description: "Please copy manually.", variant: "destructive" });
    });
  };

  return (
    <div className="mt-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-center gap-2 text-muted-foreground"
      >
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {open ? "Hide" : "Show"} Upload Debug ({lines.length})
      </Button>

      {open && (
        <div className="mt-2 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">Debug Console</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2 text-xs">
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
              <Button variant="ghost" size="sm" onClick={clearDebugLines} className="h-7 px-2 text-xs text-muted-foreground">
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="max-h-60 overflow-y-auto font-mono text-[10px] leading-4 bg-muted/30 rounded p-2 space-y-0"
          >
            {lines.length === 0 ? (
              <p className="text-muted-foreground">No logs yet.</p>
            ) : (
              lines.map((line, i) => {
                const timeStr = line.ts.split("T")[1]?.slice(0, 12) || line.ts;
                const isError = line.msg.includes("ERROR") || line.msg.includes("onerror") || line.msg.includes("❌") || line.msg.includes("FAILED");
                const isWarn = line.msg.includes("WARN") || line.msg.includes("timeout") || line.msg.includes("⏭️");
                return (
                  <div
                    key={i}
                    className={`whitespace-pre-wrap break-all ${
                      isError ? "text-destructive" : isWarn ? "text-amber-500" : "text-muted-foreground"
                    }`}
                  >
                    <span className="text-muted-foreground/60">{timeStr}</span> {line.msg}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
