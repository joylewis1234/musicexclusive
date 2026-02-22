import { useSignedArtworkUrl } from "@/hooks/useSignedArtworkUrl";
import { cn } from "@/lib/utils";
import { Music } from "lucide-react";

interface SignedArtworkProps {
  trackId: string | null | undefined;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  loading?: "lazy" | "eager";
}

/**
 * Drop-in replacement for `<img src={artwork_url}>`.
 * Fetches a short-lived signed URL from the backend and renders the image.
 * Shows a placeholder while loading or on error.
 */
export const SignedArtwork = ({
  trackId,
  alt,
  fallbackSrc,
  className,
  loading = "lazy",
}: SignedArtworkProps) => {
  const { url, isLoading, error } = useSignedArtworkUrl(trackId);

  const src = url || fallbackSrc;

  if (!src && (isLoading || error || !trackId)) {
    return (
      <div className={cn("flex items-center justify-center bg-muted/20", className)}>
        <Music className="w-1/3 h-1/3 text-muted-foreground/40" />
      </div>
    );
  }

  return (
    <img
      src={src || undefined}
      alt={alt}
      className={className}
      loading={loading}
      onError={(e) => {
        if (fallbackSrc && e.currentTarget.src !== fallbackSrc) {
          e.currentTarget.src = fallbackSrc;
        }
      }}
    />
  );
};
