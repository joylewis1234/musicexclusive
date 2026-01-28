import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Eye, Trash2, Lock, Loader2, Music } from "lucide-react";

export interface ExclusiveSong {
  id: string;
  title: string;
  artwork_url: string | null;
  full_audio_url: string | null;
  genre: string | null;
  created_at: string;
}

// Helper to extract storage path from Supabase URL
const getStoragePathFromUrl = (url: string | null): string | null => {
  if (!url) return null;
  try {
    // URLs look like: https://xyz.supabase.co/storage/v1/object/public/audio/artwork/filename.jpg
    const match = url.match(/\/storage\/v1\/object\/public\/audio\/(.+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

interface ExclusiveSongCardProps {
  song: ExclusiveSong;
  artistId: string;
  onDeleted: () => void;
}

export const ExclusiveSongCard = ({ song, artistId, onDeleted }: ExclusiveSongCardProps) => {
  const navigate = useNavigate();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // 1. Delete associated likes first (foreign key constraint)
      const { error: likesError } = await supabase
        .from("track_likes")
        .delete()
        .eq("track_id", song.id);

      if (likesError) {
        console.warn("Error deleting likes (may not exist):", likesError);
        // Continue anyway - likes might not exist
      }

      // 2. Delete storage files
      const filesToDelete: string[] = [];
      
      const artworkPath = getStoragePathFromUrl(song.artwork_url);
      if (artworkPath) filesToDelete.push(artworkPath);
      
      const audioPath = getStoragePathFromUrl(song.full_audio_url);
      if (audioPath) filesToDelete.push(audioPath);

      if (filesToDelete.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("audio")
          .remove(filesToDelete);

        if (storageError) {
          console.warn("Error deleting storage files:", storageError);
          // Continue anyway - files might not exist or already deleted
        }
      }

      // 3. Hard delete the track record
      const { error: deleteError } = await supabase
        .from("tracks")
        .delete()
        .eq("id", song.id);

      if (deleteError) throw deleteError;

      toast.success("Song permanently deleted");
      setIsDeleteOpen(false);
      onDeleted();
    } catch (error) {
      console.error("Error deleting song:", error);
      toast.error(`Failed to delete song: ${(error as Error).message || "Unknown error"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleView = () => {
    // Navigate to the public artist profile with this track highlighted
    navigate(`/artist/${encodeURIComponent(artistId)}?track=${song.id}`);
  };

  return (
    <>
      <GlowCard variant="flat" className="p-4 group">
        <div className="flex gap-4">
          {/* Cover Art Thumbnail */}
          <div className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0 rounded-xl overflow-hidden bg-muted/30 border border-border/20">
            {song.artwork_url ? (
              <img
                src={song.artwork_url}
                alt={song.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Song Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div>
              <h3 className="font-display text-sm md:text-base font-semibold text-foreground truncate">
                {song.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Uploaded {format(new Date(song.created_at), "MMM d, yyyy")}
              </p>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
                <Lock className="w-2.5 h-2.5" />
                Exclusive
              </span>
              {song.genre && !song.genre.startsWith("[") && (
                <span className="text-xs text-muted-foreground">{song.genre}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleView}
              className="h-8 px-3 text-xs rounded-lg hover:bg-primary/10 hover:text-primary"
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              View
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteOpen(true)}
              className="h-8 px-3 text-xs rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
        </div>
      </GlowCard>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="bg-card border-border max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-destructive">
              Delete this song permanently?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will remove it from Discovery and your Artist Profile.{" "}
              <span className="text-foreground font-medium">This cannot be undone.</span>
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
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
