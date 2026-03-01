import { Play, Pause, Lock, Loader2, AlertCircle, Heart } from "lucide-react";
import { usePublicSignedArtwork } from "@/hooks/usePublicSignedArtwork";
import artist1 from "@/assets/artist-1.jpg";

interface PreviewTrack {
  id: string;
  title: string;
  artist_id: string;
  genre: string | null;
  artwork_url: string | null;
  has_preview: boolean;
  like_count: number;
  preview_start_seconds: number;
  artist_name: string | null;
  artist_avatar_url: string | null;
}

interface PreviewTrackCardProps {
  track: PreviewTrack;
  isPreviewPlaying: boolean;
  isPreviewLoading: boolean;
  previewProgress: number;
  previewError: string | null;
  onPreview: () => void;
  onGetAccess: () => void;
}

export type { PreviewTrack };

export const PreviewTrackCard = ({
  track,
  isPreviewPlaying,
  isPreviewLoading,
  previewProgress,
  previewError,
  onPreview,
  onGetAccess,
}: PreviewTrackCardProps) => {
  const artistName = track.artist_name || "Artist";
  const hasPreviewAudio = track.has_preview;
  const showError = previewError && !isPreviewPlaying && !isPreviewLoading;
  const isPreviewDisabled = !hasPreviewAudio && !isPreviewPlaying;

  const { url: signedArtworkUrl } = usePublicSignedArtwork(track.id);
  const artworkSrc = signedArtworkUrl || track.artwork_url || artist1;

  return (
    <div
      className="group relative rounded-xl overflow-hidden bg-card/40 border border-border/30 transition-all duration-300 hover:border-primary/40"
      style={{
        boxShadow: isPreviewPlaying
          ? "0 0 24px hsl(var(--primary) / 0.25), inset 0 0 12px hsl(var(--primary) / 0.05)"
          : "0 0 8px hsl(var(--primary) / 0.06)",
      }}
    >
      {/* Artwork */}
      <div
        className="relative aspect-square overflow-hidden cursor-pointer"
        onClick={hasPreviewAudio && !isPreviewDisabled ? onPreview : undefined}
      >
        <img
          src={artworkSrc}
          alt={track.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            if (e.currentTarget.src !== artist1) {
              e.currentTarget.src = artist1;
            }
          }}
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
          {isPreviewLoading ? (
            <div
              className="w-12 h-12 rounded-full bg-primary/30 backdrop-blur-sm flex items-center justify-center opacity-100"
              style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.5)" }}
            >
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : isPreviewPlaying ? (
            <div
              className="w-12 h-12 rounded-full bg-primary/30 backdrop-blur-sm flex items-center justify-center opacity-100"
              style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.5)" }}
            >
              <Pause className="w-6 h-6 text-primary" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Play className="w-6 h-6 text-white ml-0.5" />
            </div>
          )}
        </div>

        {/* Progress bar */}
        {(isPreviewPlaying || isPreviewLoading) && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
            <div
              className="h-full bg-primary transition-all duration-100"
              style={{ width: `${previewProgress}%` }}
            />
          </div>
        )}

        {/* Genre tag */}
        {track.genre && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-display uppercase tracking-wider bg-black/50 backdrop-blur-sm text-white/90 border border-white/10">
              {track.genre}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-display text-sm font-bold text-foreground tracking-wide line-clamp-1 mb-0.5">
          {track.title}
        </h3>
        <p className="text-xs text-muted-foreground font-display tracking-wide truncate">
          {artistName}
        </p>

        {/* Bottom row */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Heart className="w-3 h-3 text-pink-400/70" />
            <span className="text-[10px]">{track.like_count}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview();
              }}
              disabled={isPreviewDisabled}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-display uppercase tracking-wider font-semibold text-accent border border-accent/40 bg-accent/10 hover:bg-accent/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPreviewLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : isPreviewPlaying ? (
                <Pause className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              {isPreviewPlaying ? "Stop" : "Preview"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGetAccess();
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-display uppercase tracking-wider font-semibold text-primary border border-primary/40 bg-primary/10 hover:bg-primary/20 transition-all"
              style={{
                boxShadow: "0 0 8px hsl(var(--primary) / 0.15)",
              }}
            >
              <Lock className="w-3 h-3" />
              Get Access
            </button>
          </div>
        </div>

        {/* Error / no preview state */}
        {(showError || isPreviewDisabled) && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-2 p-1.5 rounded bg-muted/20 border border-border/30">
            <AlertCircle className="w-3 h-3 text-accent flex-shrink-0" />
            <span className="line-clamp-1">
              {previewError || "Preview not available yet."}
            </span>
          </div>
        )}
      </div>

      {/* Hover glow */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          boxShadow:
            "inset 0 0 0 1px hsl(var(--primary) / 0.25), 0 0 12px hsl(var(--primary) / 0.1)",
        }}
      />
    </div>
  );
};
