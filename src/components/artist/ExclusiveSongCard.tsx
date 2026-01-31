import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
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
import { Eye, Trash2, Lock, Loader2, Music, Clock, Share2 } from "lucide-react";
import { PreviewTimeSelector } from "@/components/artist/PreviewTimeSelector";

export interface ExclusiveSong {
  id: string;
  title: string;
  artwork_url: string | null;
  full_audio_url: string | null;
  genre: string | null;
  created_at: string;
  preview_start_seconds?: number;
  duration?: number;
}

// Helper to extract storage path and bucket from Supabase URL
const getStorageInfoFromUrl = (url: string | null): { bucket: string; path: string } | null => {
  if (!url) return null;
  try {
    // URLs look like: https://xyz.supabase.co/storage/v1/object/public/{bucket}/{path}
    const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (match) {
      return { bucket: match[1], path: match[2] };
    }
    return null;
  } catch {
    return null;
  }
};

interface ExclusiveSongCardProps {
  song: ExclusiveSong;
  artistId: string;
  artistName?: string;
  onDeleted: () => void;
}

export const ExclusiveSongCard = ({ song, artistId, artistName, onDeleted }: ExclusiveSongCardProps) => {
  const navigate = useNavigate();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPreviewEditOpen, setIsPreviewEditOpen] = useState(false);
  const [previewStartSeconds, setPreviewStartSeconds] = useState(song.preview_start_seconds || 0);
  const [isSavingPreview, setIsSavingPreview] = useState(false);

  const handleShare = async () => {
    // Build the shareable URL to the artist profile with track highlighted
    const shareUrl = `${window.location.origin}/artist/${encodeURIComponent(artistId)}?track=${song.id}`;
    const shareTitle = `${song.title} by ${artistName || "Exclusive Artist"}`;
    const shareText = `Check out this exclusive track on Music Exclusive™`;

    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        toast.success("Shared successfully!");
        return;
      } catch (err) {
        // User cancelled or share failed, fall back to clipboard
        if ((err as Error).name !== "AbortError") {
          console.log("Share API failed, falling back to clipboard");
        }
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Soft delete: Update status to 'disabled' instead of hard delete
      // This hides the track from the artist's page but preserves it for ledger/audit purposes
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

  const handleView = () => {
    // Navigate to artist's public profile in fan view mode with this track highlighted
    navigate(`/artist/view/${encodeURIComponent(artistId)}?view=fan&track=${song.id}`);
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
                {song.artwork_url ? (
                  <img
                    src={song.artwork_url}
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
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-primary/15 text-primary/90 border border-primary/20">
                  <Lock className="w-2 h-2" />
                  Exclusive
                </span>
                {song.genre && !song.genre.startsWith("[") && (
                  <span className="text-[11px] text-muted-foreground/70">{song.genre}</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                Uploaded {format(new Date(song.created_at), "MMM d, yyyy")}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1.5 flex-shrink-0 justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleView}
                className="h-7 px-2.5 text-[11px] rounded-lg bg-white/[0.04] hover:bg-primary/15 hover:text-primary border border-white/[0.06] transition-colors"
              >
                <Eye className="w-3 h-3 mr-1" />
                View
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="h-7 px-2.5 text-[11px] rounded-lg bg-white/[0.04] hover:bg-accent/15 hover:text-accent border border-white/[0.06] transition-colors"
              >
                <Share2 className="w-3 h-3 mr-1" />
                Share
              </Button>
              {song.full_audio_url && (song.duration ?? 0) > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPreviewEditOpen(true)}
                  className="h-7 px-2.5 text-[11px] rounded-lg bg-white/[0.04] hover:bg-purple-500/15 hover:text-purple-400 border border-white/[0.06] transition-colors"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  Hook
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDeleteOpen(true)}
                className="h-7 px-2.5 text-[11px] rounded-lg bg-white/[0.04] text-muted-foreground/70 hover:bg-destructive/15 hover:text-destructive border border-white/[0.06] transition-colors"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
            </div>
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
              audioUrl={song.full_audio_url}
              audioDuration={song.duration || 0}
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
