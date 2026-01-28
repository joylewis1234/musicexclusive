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
  genre: string | null;
  created_at: string;
}

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
      // Soft delete by marking genre with [DELETED] prefix
      const { error } = await supabase
        .from("tracks")
        .update({
          genre: `[DELETED] ${song.genre || ""}`,
        })
        .eq("id", song.id);

      if (error) throw error;

      toast.success("Song removed from Discovery");
      setIsDeleteOpen(false);
      onDeleted();
    } catch (error) {
      console.error("Error deleting song:", error);
      toast.error("Failed to delete song");
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
            <AlertDialogTitle className="font-display">Delete this song?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This removes it from Discovery and the artist profile. Fans will no longer be able to find or play this track.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 rounded-xl"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Song
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
