import { GlowCard } from "@/components/ui/GlowCard";
import type { AvatarUploadError, AvatarUploadMeta } from "@/hooks/useAvatarUpload";

type Props = {
  userId?: string | null;
  meta: AvatarUploadMeta | null;
  error: AvatarUploadError | null;
};

export const AvatarUploadDiagnostics = ({ userId, meta, error }: Props) => {
  // Only render in dev mode
  if (!import.meta.env.DEV) return null;

  return (
    <GlowCard className="p-4">
      <div className="space-y-2">
        <p className="text-xs font-display uppercase tracking-widest text-muted-foreground text-center">
          Upload Diagnostics (dev)
        </p>

        <div className="grid grid-cols-1 gap-1 text-xs">
          <Row label="auth.uid()" value={userId} />
          <Row label="bucket" value="avatars" />
          <Row label="upload path" value={meta?.displayPath} />
          <Row label="file.type" value={meta?.file?.type} />
          <Row label="file.size" value={meta?.file?.size != null ? String(meta.file.size) : undefined} />
        </div>

        {error ? (
          <div className="mt-2 rounded-lg border border-border/50 bg-muted/20 p-3">
            <p className="text-xs font-medium text-foreground">Last upload error</p>
            <p className="text-xs text-muted-foreground font-mono break-words mt-1">
              {error.name ? `${error.name}: ` : ""}
              {error.message}
              {typeof error.status === "number" ? ` (status ${error.status})` : ""}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center">No upload error yet.</p>
        )}
      </div>
    </GlowCard>
  );
};

const Row = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-mono text-foreground truncate max-w-[60%]">{value || "(none)"}</span>
  </div>
);
