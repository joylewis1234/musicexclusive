import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { format, addWeeks } from "date-fns";
import {
  MoreVertical,
  Eye,
  Pencil,
  Headphones,
  EyeOff,
  Calendar,
  Upload,
  Check,
  X,
  Loader2,
  Lock,
  Info,
} from "lucide-react";

const GENRES = [
  "Hip-Hop",
  "R&B",
  "Pop",
  "Rock",
  "Electronic",
  "Country",
  "Latin",
  "Jazz",
  "Classical",
  "Indie",
  "Alternative",
  "Soul",
  "Funk",
  "Reggae",
  "Other",
];

export interface Track {
  id: string;
  title: string;
  genre: string | null;
  created_at: string;
  preview_audio_url: string | null;
  full_audio_url: string | null;
  status: "exclusive" | "scheduled" | "ended" | "disabled";
  exclusive_weeks?: number;
}

interface TrackManagementCardProps {
  track: Track;
  onTrackUpdated: () => void;
}

export const TrackManagementCard = ({ track, onTrackUpdated }: TrackManagementCardProps) => {
  const navigate = useNavigate();
  
  // Edit dialog state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(track.title);
  const [editGenre, setEditGenre] = useState(track.genre || "");
  const [editDescription, setEditDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Replace hook preview state
  const [isReplaceHookOpen, setIsReplaceHookOpen] = useState(false);
  const [newHookFile, setNewHookFile] = useState<File | null>(null);
  const [isUploadingHook, setIsUploadingHook] = useState(false);
  const hookInputRef = useRef<HTMLInputElement>(null);
  
  // Disable dialog state
  const [isDisableOpen, setIsDisableOpen] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  // Calculate exclusive dates (3 weeks default)
  const exclusiveWeeks = track.exclusive_weeks || 3;
  const startDate = new Date(track.created_at);
  const endDate = addWeeks(startDate, exclusiveWeeks);
  const isActive = track.status !== "disabled";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "exclusive":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">
            <Lock className="w-3 h-3" />
            Exclusive
          </span>
        );
      case "scheduled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-500 border border-amber-500/30">
            <Calendar className="w-3 h-3" />
            Scheduled
          </span>
        );
      case "ended":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground border border-border/50">
            Period Ended
          </span>
        );
      case "disabled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/20 text-destructive border border-destructive/30">
            <EyeOff className="w-3 h-3" />
            Disabled
          </span>
        );
      default:
        return null;
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      toast.error("Track title is required");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("tracks")
        .update({
          title: editTitle.trim(),
          genre: editGenre || null,
        })
        .eq("id", track.id);

      if (error) throw error;

      toast.success("Track details updated");
      setIsEditOpen(false);
      onTrackUpdated();
    } catch (error) {
      console.error("Error updating track:", error);
      toast.error("Failed to update track");
    } finally {
      setIsSaving(false);
    }
  };

  const handleHookFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.wav') && !ext.endsWith('.mp3')) {
      toast.error("Please upload a .WAV or .MP3 file");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be less than 50MB");
      return;
    }

    setNewHookFile(file);
  };

  const handleReplaceHook = async () => {
    if (!newHookFile) return;

    setIsUploadingHook(true);
    try {
      const timestamp = Date.now();
      const ext = newHookFile.name.split('.').pop();
      const path = `tracks/hook-replacement-${track.id}-${timestamp}.${ext}`;

      const { data, error: uploadError } = await supabase.storage
        .from("audio")
        .upload(path, newHookFile, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("audio").getPublicUrl(data.path);

      const { error: updateError } = await supabase
        .from("tracks")
        .update({ preview_audio_url: urlData.publicUrl })
        .eq("id", track.id);

      if (updateError) throw updateError;

      toast.success("Hook preview updated successfully");
      setIsReplaceHookOpen(false);
      setNewHookFile(null);
      onTrackUpdated();
    } catch (error) {
      console.error("Error replacing hook:", error);
      toast.error("Failed to replace hook preview");
    } finally {
      setIsUploadingHook(false);
    }
  };

  const handleDisableTrack = async () => {
    setIsDisabling(true);
    try {
      // For now, we'll use a soft delete by setting a flag
      // Since we don't have a disabled column, we'll update the genre to include [DISABLED]
      // In production, you'd add a proper status column
      const { error } = await supabase
        .from("tracks")
        .update({
          genre: isActive ? `[DISABLED] ${track.genre || ""}` : (track.genre || "").replace("[DISABLED] ", ""),
        })
        .eq("id", track.id);

      if (error) throw error;

      toast.success(isActive ? "Track disabled" : "Track re-enabled");
      setIsDisableOpen(false);
      onTrackUpdated();
    } catch (error) {
      console.error("Error toggling track:", error);
      toast.error("Failed to update track status");
    } finally {
      setIsDisabling(false);
    }
  };

  return (
    <>
      <GlowCard className="p-4">
        <div className="flex flex-col gap-3">
          {/* Top Row: Title + Actions */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-base font-semibold text-foreground truncate">
                {track.title}
              </h3>
              {track.genre && !track.genre.startsWith("[DISABLED]") && (
                <p className="text-muted-foreground text-xs mt-0.5">{track.genre}</p>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {getStatusBadge(track.status)}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border-border z-50">
                  <DropdownMenuItem onClick={() => navigate("/artist/profile")}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Track
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Track Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsReplaceHookOpen(true)}>
                    <Headphones className="w-4 h-4 mr-2" />
                    Replace Hook Preview
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setIsDisableOpen(true)}
                    className={isActive ? "text-destructive focus:text-destructive" : "text-primary focus:text-primary"}
                  >
                    <EyeOff className="w-4 h-4 mr-2" />
                    {isActive ? "Disable Track" : "Re-enable Track"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Bottom Row: Dates */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Started: {format(startDate, "MMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Ends: {format(endDate, "MMM d, yyyy")}</span>
            </div>
          </div>
        </div>
      </GlowCard>

      {/* Edit Track Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Track Details</DialogTitle>
            <DialogDescription>
              Update the title and genre for this track.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Track Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Enter track title"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label>Genre</Label>
              <Select value={editGenre} onValueChange={setEditGenre}>
                <SelectTrigger className="h-11 bg-background">
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  {GENRES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Tell fans about this track..."
                className="min-h-[80px] resize-none"
                maxLength={280}
              />
            </div>

            {/* Info about full audio */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border/30">
              <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Full track audio cannot be replaced once published. Use "Replace Hook Preview" to update the discovery preview.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace Hook Preview Dialog */}
      <Dialog open={isReplaceHookOpen} onOpenChange={setIsReplaceHookOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Replace Hook Preview</DialogTitle>
            <DialogDescription>
              Upload a new 15-second hook preview for Discovery.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <input
              ref={hookInputRef}
              type="file"
              accept=".wav,.mp3"
              onChange={handleHookFileSelect}
              className="hidden"
            />

            {newHookFile ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-accent/10 border border-accent/30">
                <div className="flex items-center gap-2 min-w-0">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-sm text-foreground truncate">{newHookFile.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNewHookFile(null)}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => hookInputRef.current?.click()}
                className="w-full p-6 rounded-lg border-2 border-dashed border-border/50 hover:border-accent/50 transition-colors flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Upload className="w-8 h-8" />
                <span className="text-sm">.WAV or .MP3 — ~15 seconds</span>
                <span className="text-xs text-muted-foreground">This preview plays on Discovery</span>
              </button>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => { setIsReplaceHookOpen(false); setNewHookFile(null); }}>
              Cancel
            </Button>
            <Button onClick={handleReplaceHook} disabled={!newHookFile || isUploadingHook}>
              {isUploadingHook ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Replace Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Track Confirmation */}
      <AlertDialog open={isDisableOpen} onOpenChange={setIsDisableOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isActive ? "Disable this track?" : "Re-enable this track?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isActive 
                ? "This will hide the track from fans on Discovery and your profile. You can re-enable it at any time."
                : "This will make the track visible again to fans on Discovery and your profile."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDisableTrack}
              className={isActive ? "bg-destructive hover:bg-destructive/90" : ""}
              disabled={isDisabling}
            >
              {isDisabling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isActive ? "Disable Track" : "Re-enable Track"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
