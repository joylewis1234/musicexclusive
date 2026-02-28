import { Music, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface PreviewStreamModalProps {
  open: boolean;
  trackTitle: string;
  artistName: string;
  onStream: () => void;
  onDismiss: () => void;
}

export const PreviewStreamModal = ({
  open,
  trackTitle,
  artistName,
  onStream,
  onDismiss,
}: PreviewStreamModalProps) => {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onDismiss(); }}>
      <DialogContent
        className="sm:max-w-md bg-background/95 backdrop-blur-md border-border shadow-[0_0_40px_hsl(var(--primary)/0.15)] rounded-xl"
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary" />
            <DialogTitle className="font-display uppercase tracking-wider text-lg">
              Want to stream this track?
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground mt-2 font-display tracking-wide">
            You've been previewing&nbsp;
            <span className="text-foreground font-semibold">{trackTitle}</span>
            &nbsp;by&nbsp;
            <span className="text-foreground font-semibold">{artistName}</span>.
            Stream the full track inside the Vault.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button
            size="lg"
            className="w-full shadow-[0_0_16px_hsl(var(--primary)/0.3)]"
            onClick={onStream}
          >
            <Music className="w-4 h-4 mr-2" />
            Stream this track
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={onDismiss}
          >
            Not now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
