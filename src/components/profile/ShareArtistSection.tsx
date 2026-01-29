import { Share2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShareArtistSectionProps {
  artistName: string;
  onShareToInbox: () => void;
}

export const ShareArtistSection = ({ artistName, onShareToInbox }: ShareArtistSectionProps) => {
  return (
    <section className="px-5 py-6 border-t border-border/30">
      <div className="flex items-center gap-3 mb-4">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            background: 'hsla(280, 80%, 50%, 0.12)',
          }}
        >
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">
            Share with Friends
          </h3>
          <p className="text-xs text-muted-foreground">
            Send {artistName}'s profile to other fans
          </p>
        </div>
      </div>
      
      <Button
        onClick={onShareToInbox}
        variant="outline"
        className="w-full gap-2 rounded-xl border-primary/30 text-primary hover:bg-primary/10 hover:text-primary hover:border-primary/50"
      >
        <Share2 className="w-4 h-4" />
        Share to Inbox
      </Button>
    </section>
  );
};
