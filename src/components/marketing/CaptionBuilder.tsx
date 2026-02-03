import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Copy, Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CaptionBuilderProps {
  trackTitle: string;
  artistName: string;
  genre: string;
  onSaveCaption?: (caption: string) => void;
}

interface GeneratedContent {
  captions: { text: string; length: "short" | "medium" | "long" }[];
  hashtags: string[];
  storyOverlays: string[];
}

const VIBES = [
  { value: "hype", label: "🔥 Hype" },
  { value: "mysterious", label: "🌙 Mysterious" },
  { value: "emotional", label: "💕 Emotional" },
  { value: "faith", label: "✝️ Faith-based" },
  { value: "luxury", label: "💎 Luxury" },
  { value: "punchy", label: "⚡ Short & Punchy" },
];

const CTA_STYLES = [
  { value: "vault", label: "Join the Vault" },
  { value: "stream", label: "Stream Exclusive" },
];

export const CaptionBuilder = ({
  trackTitle,
  artistName,
  genre,
  onSaveCaption,
}: CaptionBuilderProps) => {
  const [vibe, setVibe] = useState("hype");
  const [keywords, setKeywords] = useState("");
  const [ctaStyle, setCtaStyle] = useState("vault");
  const [isGenerating, setIsGenerating] = useState(false);
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-promo-captions", {
        body: {
          trackTitle,
          artistName,
          genre,
          vibe,
          keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
          ctaStyle,
        },
      });

      if (error) throw error;

      setContent(data);
      toast.success("Captions generated!");
    } catch (error: any) {
      console.error("Error generating captions:", error);
      toast.error("Failed to generate captions. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Vibe</Label>
          <Select value={vibe} onValueChange={setVibe}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIBES.map((v) => (
                <SelectItem key={v.value} value={v.value}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>CTA Style</Label>
          <Select value={ctaStyle} onValueChange={setCtaStyle}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CTA_STYLES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Keywords (optional, comma-separated)</Label>
        <Textarea
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="e.g., summer vibes, new single, exclusive..."
          className="h-20 resize-none"
        />
      </div>

      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full rounded-full"
        style={{
          background: "linear-gradient(135deg, hsl(280, 80%, 50%), hsl(280, 80%, 40%))",
        }}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Captions
          </>
        )}
      </Button>

      {content && (
        <div className="space-y-6 animate-fade-in">
          {/* Captions */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              Captions
            </h4>
            {content.captions.map((caption, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-card/50 border border-border/30 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs text-muted-foreground capitalize">
                    {caption.length}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => copyToClipboard(caption.text, i)}
                    >
                      {copiedIndex === i ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                    {onSaveCaption && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => onSaveCaption(caption.text)}
                      >
                        Save
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm">{caption.text}</p>
              </div>
            ))}
          </div>

          {/* Hashtags */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                Hashtags
              </h4>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={() =>
                  copyToClipboard(content.hashtags.join(" "), 100)
                }
              >
                {copiedIndex === 100 ? (
                  <Check className="w-3.5 h-3.5 text-green-500 mr-1" />
                ) : (
                  <Copy className="w-3.5 h-3.5 mr-1" />
                )}
                Copy All
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {content.hashtags.map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Story Overlays */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              Story Text Overlays
            </h4>
            <div className="grid gap-2">
              {content.storyOverlays.map((overlay, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-lg bg-card/50 border border-border/30"
                >
                  <span className="text-sm font-medium">{overlay}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => copyToClipboard(overlay, 200 + i)}
                  >
                    {copiedIndex === 200 + i ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
