import { useState } from "react";
import { differenceInDays, differenceInHours, format } from "date-fns";
import { AlertTriangle, Clock, CheckCircle2, Trash2, Loader2, ShieldCheck } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/custom-client";
import { toast } from "sonner";

interface ExclusivityBannerProps {
  trackId: string;
  trackTitle: string;
  exclusivityExpiresAt: string;
  exclusivityDecision: string | null;
  onDecisionMade: () => void;
}

type WarningLevel = "safe" | "one_week" | "two_days" | "today" | "expired";

function getWarningLevel(expiresAt: Date): WarningLevel {
  const now = new Date();
  const daysLeft = differenceInDays(expiresAt, now);

  if (daysLeft > 7) return "safe";
  if (daysLeft > 2) return "one_week";
  if (daysLeft > 0) return "two_days";
  
  const hoursLeft = differenceInHours(expiresAt, now);
  if (hoursLeft > 0) return "today";
  return "expired";
}

function getCountdownText(expiresAt: Date): string {
  const now = new Date();
  const daysLeft = differenceInDays(expiresAt, now);
  const hoursLeft = differenceInHours(expiresAt, now);

  if (daysLeft > 1) return `${daysLeft} days remaining`;
  if (hoursLeft > 1) return `${hoursLeft} hours remaining`;
  if (hoursLeft > 0) return "Less than 1 hour remaining";
  return "Exclusivity period ended";
}

export const ExclusivityBanner = ({
  trackId,
  trackTitle,
  exclusivityExpiresAt,
  exclusivityDecision,
  onDecisionMade,
}: ExclusivityBannerProps) => {
  const [isKeepDialogOpen, setIsKeepDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const expiresAt = new Date(exclusivityExpiresAt);
  const warningLevel = getWarningLevel(expiresAt);

  // If artist already decided "keep", show a subtle confirmation
  if (exclusivityDecision === "keep") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
        <ShieldCheck className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
        <p className="text-[11px] text-green-300/90">
          Kept on platform — free to release elsewhere. Royalties continue.
        </p>
      </div>
    );
  }

  // If artist chose "deleted", show nothing (card will be hidden by status=disabled)
  if (exclusivityDecision === "deleted") return null;

  // During safe period, show a subtle countdown (ceil days to align with check-exclusivity edge function)
  if (warningLevel === "safe") {
    const daysLeft = Math.ceil(
      (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return (
      <div 
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/[0.06] border border-amber-400/25"
        style={{
          boxShadow: '0 0 12px hsla(40, 90%, 50%, 0.15), inset 0 0 8px hsla(40, 90%, 50%, 0.05)',
        }}
      >
        <Clock className="w-3.5 h-3.5 text-amber-400/80 flex-shrink-0" />
        <p className="text-[11px] text-amber-300/80">
          🔥 Exclusive for {daysLeft} more days · Ends {format(expiresAt, "MMM d, yyyy")}
        </p>
      </div>
    );
  }

  // Warning/expired states — show action buttons
  const handleKeep = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("tracks")
        .update({ exclusivity_decision: "keep" } as any)
        .eq("id", trackId);
      if (error) throw error;
      toast.success("Track will stay on Music Exclusive. You're free to release it elsewhere now!");
      setIsKeepDialogOpen(false);
      onDecisionMade();
    } catch (err) {
      console.error("Error keeping track:", err);
      toast.error("Failed to update. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("tracks")
        .update({ status: "disabled", exclusivity_decision: "deleted" } as any)
        .eq("id", trackId);
      if (error) throw error;
      toast.success("Track removed. You will no longer receive royalties for this song.");
      setIsDeleteDialogOpen(false);
      onDecisionMade();
    } catch (err) {
      console.error("Error deleting track:", err);
      toast.error("Failed to remove. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const warningConfig = {
    one_week: {
      bg: "bg-amber-500/10 border-amber-500/25",
      iconColor: "text-amber-400",
      textColor: "text-amber-300/90",
      label: "Your exclusive release is expiring soon",
    },
    two_days: {
      bg: "bg-orange-500/15 border-orange-500/30",
      iconColor: "text-orange-400",
      textColor: "text-orange-300/90",
      label: "Your exclusive release expires in 2 days",
    },
    today: {
      bg: "bg-red-500/15 border-red-500/30",
      iconColor: "text-red-400",
      textColor: "text-red-300/90",
      label: "Your exclusive release expires today",
    },
    expired: {
      bg: "bg-red-500/20 border-red-500/35",
      iconColor: "text-red-400",
      textColor: "text-red-300/90",
      label: "Your 3-week exclusivity period has ended",
    },
  };

  const config = warningConfig[warningLevel as keyof typeof warningConfig];

  return (
    <>
      <div className={`rounded-lg border p-3 space-y-2.5 ${config.bg}`}>
        <div className="flex items-start gap-2">
          <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-[11px] font-semibold ${config.textColor}`}>
              {config.label}
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              {getCountdownText(expiresAt)} · Would you like to keep this track on Music Exclusive?
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => setIsKeepDialogOpen(true)}
            className="flex-1 h-8 text-[11px] rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30"
            variant="ghost"
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Keep on Platform
          </Button>
          <Button
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="flex-1 h-8 text-[11px] rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30"
            variant="ghost"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Remove Track
          </Button>
        </div>
      </div>

      {/* Keep Confirmation */}
      <AlertDialog open={isKeepDialogOpen} onOpenChange={setIsKeepDialogOpen}>
        <AlertDialogContent className="bg-card border-border max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-foreground">
              Keep "{trackTitle}" on Music Exclusive?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground space-y-2">
              <span className="block">
                Your 3-week exclusivity period has ended. You are now free to release this track on other platforms.
              </span>
              <span className="block text-green-400 font-medium">
                ✓ Your track will continue earning royalties on Music Exclusive.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={isProcessing}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleKeep}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700 rounded-xl font-semibold"
            >
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> Keep Track</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-destructive">
              Remove "{trackTitle}" from Music Exclusive?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground space-y-2">
              <span className="block">
                This will permanently remove your track from Discovery and your Artist Profile.
              </span>
              <span className="block text-red-400 font-semibold">
                ⚠ You will no longer receive royalties for this song.
              </span>
              <span className="block text-muted-foreground/80 text-xs">
                Your past earnings history will be preserved.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={isProcessing}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isProcessing}
              className="bg-destructive hover:bg-destructive/90 rounded-xl font-semibold"
            >
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Removing...</>
              ) : (
                <><Trash2 className="w-4 h-4 mr-2" /> Remove Track</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
