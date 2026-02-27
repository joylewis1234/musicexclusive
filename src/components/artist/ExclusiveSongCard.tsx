import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ExclusivityBanner } from "@/components/artist/ExclusivityBanner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Trash2, Lock, Loader2, Music, Clock, Play, Square, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { PreviewTimeSelector } from "@/components/artist/PreviewTimeSelector";
import { getAudioDurationFromUrl } from "@/utils/audioDuration";
import { SignedArtwork } from "@/components/ui/SignedArtwork";

export interface ExclusiveSong {
  id: string;
  title: string;
  artwork_url: string | null;
  full_audio_url: string | null;
  artwork_key: string | null;
  full_audio_key: string | null;
  genre: string | null;
  created_at: string;
  updated_at?: string;
  preview_start_seconds?: number;
  duration?: number;
  status?: string;
  processing_error?: string | null;
  exclusivity_expires_at?: string;
  exclusivity_decision?: string | null;
}

interface ExclusiveSongCardProps {
  song: ExclusiveSong;
  artistId: string;
  artistName?: string;
  onDeleted: () => void;
}

export const ExclusiveSongCard = ({ song, artistId, artistName, onDeleted }: ExclusiveSongCardProps) => {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPreviewEditOpen, setIsPreviewEditOpen] = useState(false);
  const [previewStartSeconds, setPreviewStartSeconds] = useState(song.preview_start_seconds || 0);
  const [isSavingPreview, setIsSavingPreview] = useState(false);
  const [detectedDuration, setDetectedDuration] = useState<number>(song.duration || 180);
  const [showDebug, setShowDebug] = useState(false);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);

  // Audio readiness state
  const [audioReady, setAudioReady] = useState<boolean | null>(null);
  const [audioChecking, setAudioChecking] = useState(false);

  const isFailed = song.status === "failed";
  const isProcessing = song.status === "processing";
  const isFinalizing = (!isFailed && !isProcessing) && (song.status !== "ready" || !song.full_audio_key || !song.artwork_key);

  // --- Local playback state ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hookTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPlayingFull, setIsPlayingFull] = useState(false);
  const [isPlayingHook, setIsPlayingHook] = useState(false);

  // Signed URL helper
  const getSignedAudioUrl = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("mint-playback-url", {
      body: { trackId: song.id, fileType: "audio" },
    });
    if (error || !data?.url) {
      console.error("[ExclusiveSongCard] mint-playback-url failed:", error);
      toast.error("Failed to fetch playback URL");
      return null;
    }
    return data.url as string;
  }, [song.id]);

  // Audio readiness: trust key presence (signed URLs are minted fresh at play time)
  useEffect(() => {
    if (!song.full_audio_key || isFinalizing) {
      setAudioReady(false);
    } else {
      setAudioReady(true);
    }
    setAudioChecking(false);
  }, [song.full_audio_key, isFinalizing]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (hookTimerRef.current) clearTimeout(hookTimerRef.current);
    };
  }, []);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (hookTimerRef.current) {
      clearTimeout(hookTimerRef.current);
      hookTimerRef.current = null;
    }
    setIsPlayingFull(false);
    setIsPlayingHook(false);
  }, []);

  const canPlay = !!song.full_audio_key && audioReady === true && !isFinalizing;

  const handlePlayFull = async () => {
    if (isPlayingFull) {
      stopPlayback();
      return;
    }
    if (!canPlay) {
      if (isFinalizing) toast.info("Track still finalizing…");
      else toast.error("Audio not ready — retry in a moment.");
      return;
    }
    stopPlayback();

    const audio = new Audio();
    audioRef.current = audio;

    const signedUrl = await getSignedAudioUrl();
    if (!signedUrl) {
      setIsPlayingFull(false);
      return;
    }

    audio.src = signedUrl;
    audio.onended = () => setIsPlayingFull(false);
    audio.onerror = () => {
      toast.error("Failed to load audio");
      setIsPlayingFull(false);
    };
    audio.play()
      .then(() => setIsPlayingFull(true))
      .catch(() => toast.error("Playback failed"));
  };

  const handlePlayHook = async () => {
    if (isPlayingHook) {
      stopPlayback();
      return;
    }
    if (!canPlay) {
      if (isFinalizing) toast.info("Track still finalizing…");
      else toast.error("Audio not ready — retry in a moment.");
      return;
    }
    stopPlayback();

    const start = song.preview_start_seconds || 0;
    const audio = new Audio();
    audioRef.current = audio;

    const signedUrl = await getSignedAudioUrl();
    if (!signedUrl) {
      setIsPlayingHook(false);
      return;
    }

    audio.src = signedUrl;
    audio.onloadedmetadata = () => {
      audio.currentTime = start;
    };
    audio.onerror = () => {
      toast.error("Failed to load audio");
      setIsPlayingHook(false);
    };
    audio.play().then(() => {
      setIsPlayingHook(true);
      hookTimerRef.current = setTimeout(() => {
        audio.pause();
        setIsPlayingHook(false);
      }, 15000);
    }).catch(() => toast.error("Playback failed"));
  };

  // Duration detection via signed URL
  useEffect(() => {
    if (!isPreviewEditOpen || !song.full_audio_key) return;

    let cancelled = false;
    (async () => {
      const signedUrl = await getSignedAudioUrl();
      if (!signedUrl || cancelled) return;

      const dur = await getAudioDurationFromUrl(signedUrl, song.duration || 180);
      if (!cancelled && dur > 0) {
        setDetectedDuration(dur);
        if (dur !== (song.duration || 180)) {
          supabase
            .from("tracks")
            .update({ duration: dur } as any)
            .eq("id", song.id)
            .then(({ error }) => {
              if (error) console.warn("[Hook] Failed to update duration:", error);
            });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [isPreviewEditOpen, song.full_audio_key, song.duration, song.id, getSignedAudioUrl]);

  // Fetch signed URL for PreviewTimeSelector when dialog opens
  useEffect(() => {
    if (!isPreviewEditOpen) return;
    let cancelled = false;
    (async () => {
      const signedUrl = await getSignedAudioUrl();
      if (!cancelled) setPreviewAudioUrl(signedUrl);
    })();
    return () => { cancelled = true; };
  }, [isPreviewEditOpen, getSignedAudioUrl]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error: updateError } = await supabase
        .from("tracks")
        .update({ status: "disabled" })
        .eq("id", song.id);

      if (updateError) throw updateError;

      toast.success("Song removed from your profile");
      setIsDeleteOpen(false);
      onDeleted();
    } catch (error) {
      console.error("Error disabling song:", error);
      toast.error(`Failed to remove song: ${(error as Error).message || "Unknown error"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSavePreviewTime = async () => {
    setIsSavingPreview(true);
    try {
      const { error } = await supabase
        .from("tracks")
        .update({ preview_start_seconds: previewStartSeconds })
        .eq("id", song.id);

      if (error) throw error;

      toast.success("Hook preview time updated");
      setIsPreviewEditOpen(false);
      onDeleted(); // Refresh the list
    } catch (error) {
      console.error("Error updating preview time:", error);
      toast.error("Failed to update preview time");
    } finally {
      setIsSavingPreview(false);
    }
  };

  const isPlaying = isPlayingFull || isPlayingHook;

  return (
    <>
      {/* Glassmorphism Track Card */}
      <div 
        className={cn(
          "group relative rounded-[20px] overflow-hidden transition-all duration-200",
          "active:scale-[0.99]",
          "hover:shadow-lg hover:shadow-primary/5"
        )}
      >
        {/* Subtle gradient border */}
        <div className="absolute inset-0 rounded-[20px] p-[1px] bg-gradient-to-r from-primary/20 via-purple-500/10 to-primary/20 opacity-60 group-hover:opacity-80 transition-opacity" />
        
        {/* Glass background */}
        <div className="relative rounded-[19px] bg-[rgba(10,10,15,0.75)] backdrop-blur-xl border border-white/[0.06]">
          <div className="flex gap-4 p-4 md:p-5">
            {/* Left accent bar */}
            <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-gradient-to-b from-primary via-purple-500 to-primary/50 opacity-70" />
            
            {/* Cover Art Thumbnail with subtle glow */}
            <div className="relative flex-shrink-0 ml-2">
              <div className="absolute -inset-1 rounded-xl bg-primary/20 blur-md opacity-0 group-hover:opacity-50 transition-opacity" />
              <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden bg-muted/20 border border-white/[0.08] shadow-lg">
                {song.artwork_key ? (
                  <SignedArtwork
                    trackId={song.id}
                    alt={song.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10">
                    <Music className="w-5 h-5 text-muted-foreground/60" />
                  </div>
                )}
              </div>
            </div>

            {/* Song Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
              <h3 className="font-display text-sm md:text-base font-semibold text-foreground truncate leading-tight">
                {song.title}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {song.exclusivity_decision === "keep" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-muted/30 text-muted-foreground/80 border border-muted-foreground/20">
                    Non-Exclusive
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-primary/15 text-primary/90 border border-primary/20">
                    <Lock className="w-2 h-2" />
                    🔥 Exclusive
                  </span>
                )}
                {song.genre && !song.genre.startsWith("[") && (
                  <span className="text-[11px] text-muted-foreground/70">{song.genre}</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                {isFailed ? (
                  <span className="text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Failed
                  </span>
                ) : isProcessing || isFinalizing ? (
                  <span className="text-amber-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Processing…
                  </span>
                ) : (
                  <>Uploaded {format(new Date(song.created_at), "MMM d, yyyy")}</>
                )}
              </p>
              {isFailed && song.processing_error && (
                <p className="text-[10px] text-destructive/80 mt-1 leading-tight">
                  {song.processing_error}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1.5 flex-shrink-0 justify-center">
              {/* Play Full Track */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePlayFull}
                disabled={!canPlay && !isPlayingFull}
                className={cn(
                  "h-7 px-2.5 text-[11px] rounded-lg border border-white/[0.06] transition-colors",
                  isPlayingFull
                    ? "bg-primary/20 text-primary hover:bg-primary/25"
                    : canPlay
                    ? "bg-white/[0.04] hover:bg-primary/15 hover:text-primary"
                    : "bg-white/[0.02] text-muted-foreground/40 cursor-not-allowed"
                )}
              >
                {isPlayingFull ? <Square className="w-3 h-3 mr-1" /> : audioChecking ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
                {isPlayingFull ? "Stop" : isFinalizing ? "Finalizing…" : audioChecking ? "Checking…" : audioReady === false ? "Retry" : "Play"}
              </Button>
              {/* Play Hook */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePlayHook}
                disabled={!canPlay && !isPlayingHook}
                className={cn(
                  "h-7 px-2.5 text-[11px] rounded-lg border border-white/[0.06] transition-colors",
                  isPlayingHook
                    ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/25"
                    : canPlay
                    ? "bg-white/[0.04] hover:bg-purple-500/15 hover:text-purple-400"
                    : "bg-white/[0.02] text-muted-foreground/40 cursor-not-allowed"
                )}
              >
                {isPlayingHook ? <Square className="w-3 h-3 mr-1" /> : <Music className="w-3 h-3 mr-1" />}
                {isPlayingHook ? "Stop" : "Hook"}
              </Button>
              {canPlay && (song.duration ?? 0) > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { stopPlayback(); setIsPreviewEditOpen(true); }}
                  className="h-7 px-2.5 text-[11px] rounded-lg bg-white/[0.04] hover:bg-purple-500/15 hover:text-purple-400 border border-white/[0.06] transition-colors"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  Edit Hook
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { stopPlayback(); setIsDeleteOpen(true); }}
                className="h-7 px-2.5 text-[11px] rounded-lg bg-white/[0.04] text-muted-foreground/70 hover:bg-destructive/15 hover:text-destructive border border-white/[0.06] transition-colors"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
            </div>
          </div>

          {/* Exclusivity Countdown Banner */}
          {song.exclusivity_expires_at && (
            <div className="px-4 pb-1">
              <ExclusivityBanner
                trackId={song.id}
                trackTitle={song.title}
                exclusivityExpiresAt={song.exclusivity_expires_at}
                exclusivityDecision={song.exclusivity_decision || null}
                onDecisionMade={onDeleted}
              />
            </div>
          )}

          <div className="px-4 pb-2">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="text-[9px] text-muted-foreground/40 hover:text-muted-foreground/60 flex items-center gap-1"
            >
              {showDebug ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Debug
            </button>
            {showDebug && (
              <div className="mt-1 p-2 rounded-lg bg-black/30 text-[9px] text-muted-foreground/60 font-mono space-y-0.5 break-all">
                <p>trackId: {song.id}</p>
                <p>status: {song.status || "unknown"}</p>
                <p>artwork_key: {song.artwork_key || "null"}</p>
                <p>full_audio_key: {song.full_audio_key || "null"}</p>
                <p>audioReady: {String(audioReady)} | checking: {String(audioChecking)}</p>
                <p>isFinalizing: {String(isFinalizing)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="bg-card border-border max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-destructive">
              Remove this song?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will hide the song from Discovery and your Artist Profile.{" "}
              <span className="text-foreground font-medium">Your earnings history will be preserved.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 rounded-xl uppercase tracking-wider font-semibold"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove Song
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hook Preview Time Edit Dialog */}
      <Dialog open={isPreviewEditOpen} onOpenChange={setIsPreviewEditOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Set Hook Preview Time</DialogTitle>
            <DialogDescription>
              Choose which 15-second section fans hear on Discovery.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <PreviewTimeSelector
              audioUrl={previewAudioUrl}
              audioDuration={detectedDuration}
              previewStartSeconds={previewStartSeconds}
              onPreviewStartChange={setPreviewStartSeconds}
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsPreviewEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreviewTime} disabled={isSavingPreview}>
              {isSavingPreview ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Hook Time
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
