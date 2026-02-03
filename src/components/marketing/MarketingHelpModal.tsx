import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, Smartphone, Monitor, Target, Sparkles, Share2 } from "lucide-react";

export const MarketingHelpModal = () => {
  const tips = [
    {
      icon: Target,
      title: "Use Safe Zones",
      description:
        "Keep important text away from edges. Story/Reel UI elements can cover content at the top, bottom, and right side.",
    },
    {
      icon: Smartphone,
      title: "Mobile-First Sharing",
      description:
        "On mobile, tap 'Share' to open your device's share sheet. You can post directly to Instagram, TikTok, or save to camera roll.",
    },
    {
      icon: Monitor,
      title: "Desktop Download",
      description:
        "On desktop, click 'Download' to save the image, then upload it manually to your preferred platform.",
    },
    {
      icon: Sparkles,
      title: "AI Captions",
      description:
        "Use the caption builder to generate engaging text. Always mention exclusivity to drive fans to your Music Exclusive profile!",
    },
    {
      icon: Share2,
      title: "Convert Fans",
      description:
        "Include your Music Exclusive link in your bio and captions. Remind fans they hear it here first, before Spotify or Apple Music.",
    },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
          <HelpCircle className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Marketing Studio Tips
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {tips.map((tip, i) => (
            <div key={i} className="flex gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "hsla(280, 80%, 50%, 0.15)",
                }}
              >
                <tip.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-sm">{tip.title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {tip.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-xs text-center text-muted-foreground">
            <strong className="text-primary">Pro Tip:</strong> Post consistently and
            always link back to Music Exclusive. Your Superfans want exclusive access!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
