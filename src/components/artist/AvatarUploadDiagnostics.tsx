import { GlowCard } from "@/components/ui/GlowCard";
import type { AvatarUploadError, AvatarUploadMeta } from "@/hooks/useAvatarUpload";
import { formatFileSize } from "@/utils/imageProcessing";

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
          <Row label="file.size" value={meta?.file?.size != null ? formatFileSize(meta.file.size) : undefined} />
          
          {meta?.original && (
            <>
              <div className="border-t border-border/30 my-1" />
              <Row label="original name" value={meta.original.name} />
              <Row label="original size" value={formatFileSize(meta.original.size)} />
            </>
          )}
          
          {meta?.compression && (
            <>
              <div className="border-t border-border/30 my-1" />
              <Row label="compression" value={`${formatFileSize(meta.compression.originalSize)} → ${formatFileSize(meta.compression.compressedSize)}`} />
              <Row label="saved" value={meta.compression.ratio} />
            </>
          )}
        </div>

        {error ? (
          <div className="mt-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-xs font-medium text-foreground">Upload error @ {error.step || "unknown"}</p>
            <p className="text-xs text-muted-foreground font-mono break-words mt-1">
              {error.name ? `${error.name}: ` : ""}
              {error.message}
              {typeof error.status === "number" ? ` (status ${error.status})` : ""}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center">No upload error.</p>
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
