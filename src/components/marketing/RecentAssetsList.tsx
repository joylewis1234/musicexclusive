import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Download, Share2, Copy, Trash2 } from "lucide-react";
import { MarketingAsset } from "@/hooks/useMarketingStudio";
import { toast } from "sonner";

interface RecentAssetsListProps {
  assets: MarketingAsset[];
  onDelete: (id: string) => void;
}

export const RecentAssetsList = ({ assets, onDelete }: RecentAssetsListProps) => {
  const handleDownload = async (asset: MarketingAsset) => {
    try {
      const response = await fetch(asset.promo_image_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `promo-${asset.format}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Downloaded!");
    } catch (error) {
      toast.error("Download failed");
    }
  };

  const handleShare = async (asset: MarketingAsset) => {
    try {
      const response = await fetch(asset.promo_image_url);
      const blob = await response.blob();
      const file = new File([blob], `promo-${asset.format}.png`, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: asset.track?.title || "Promo",
          text: asset.chosen_caption || "Check out my exclusive track on Music Exclusive!",
        });
        toast.success("Shared!");
      } else {
        // Fallback to copy link
        await navigator.clipboard.writeText(asset.promo_image_url);
        toast.success("Link copied to clipboard!");
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        toast.error("Share failed");
      }
    }
  };

  const handleCopyCaption = async (caption: string | null) => {
    if (!caption) {
      toast.info("No caption saved for this promo");
      return;
    }
    try {
      await navigator.clipboard.writeText(caption);
      toast.success("Caption copied!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (assets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No promos created yet</p>
        <p className="text-sm mt-1">Create your first promo above!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {assets.map((asset) => (
        <div
          key={asset.id}
          className="flex gap-3 p-3 rounded-xl bg-card/50 border border-border/30"
        >
          {/* Thumbnail */}
          <div className="w-16 h-28 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
            <img
              src={asset.promo_image_url}
              alt="Promo"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">
              {asset.track?.title || "Untitled"}
            </h4>
            <p className="text-xs text-muted-foreground capitalize">
              {asset.format} • {asset.template_id.replace("-", " ")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(asset.created_at), "MMM d, h:mm a")}
            </p>

            {/* Actions */}
            <div className="flex gap-1 mt-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => handleDownload(asset)}
                title="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => handleShare(asset)}
                title="Share"
              >
                <Share2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => handleCopyCaption(asset.chosen_caption)}
                title="Copy Caption"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={() => onDelete(asset.id)}
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
