import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TemplateCanvas, TemplateType } from "@/components/artist/marketing/TemplateCanvas";
import { useTemplateExport } from "@/hooks/useTemplateExport";
import { useArtistProfile } from "@/hooks/useArtistProfile";
import { Download, Upload, Image, Sparkles } from "lucide-react";

const MarketingStudio = () => {
  const { artistProfile } = useArtistProfile();
  const { canvasRef, exportPng, isExporting } = useTemplateExport();

  const [template, setTemplate] = useState<TemplateType>("artist-photo");
  const [artistName, setArtistName] = useState(artistProfile?.artist_name || "");
  const [trackTitle, setTrackTitle] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [ctaLine, setCtaLine] = useState("Available Now");
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);

  // Pre-fill artist name when profile loads
  useState(() => {
    if (artistProfile?.artist_name && !artistName) {
      setArtistName(artistProfile.artist_name);
    }
  });

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Local preview only — no R2 upload needed for marketing images
    const url = URL.createObjectURL(file);
    setLocalImageUrl(url);
  }, []);

  // Scale factor for preview (1080 → fit in ~400px)
  const previewScale = 400 / 1080;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Marketing Studio</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Create branded social posts for your exclusive releases
        </p>
      </div>

      <div className="px-4 flex flex-col lg:flex-row gap-6">
        {/* Left: Controls */}
        <div className="lg:w-[360px] space-y-5 flex-shrink-0">
          {/* Template selector */}
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={template} onValueChange={(v) => setTemplate(v as TemplateType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="artist-photo">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4" /> Cinematic Artist Photo
                  </div>
                </SelectItem>
                <SelectItem value="cover-art">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4" /> Cinematic Cover Art
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Upload Image */}
          <div className="space-y-2">
            <Label>Upload Image *</Label>
            <div className="relative">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <Button variant="outline" className="w-full gap-2 pointer-events-none">
                <Upload className="w-4 h-4" />
                {localImageUrl ? "Change Image" : "Choose Image"}
              </Button>
            </div>
            {localImageUrl && (
              <img src={localImageUrl} alt="Preview" className="w-20 h-20 rounded-lg object-cover border border-border" />
            )}
          </div>

          {/* Artist Name */}
          <div className="space-y-2">
            <Label>Artist Name *</Label>
            <Input
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="Your artist name"
            />
          </div>

          {/* Track Title */}
          <div className="space-y-2">
            <Label>Track Title *</Label>
            <Input
              value={trackTitle}
              onChange={(e) => setTrackTitle(e.target.value)}
              placeholder="Your track title"
            />
          </div>

          {/* Release Date */}
          <div className="space-y-2">
            <Label>Release Date (optional)</Label>
            <Input
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
              placeholder="e.g. March 2026"
            />
          </div>

          {/* CTA Line */}
          <div className="space-y-2">
            <Label>Footer Text</Label>
            <Input
              value={ctaLine}
              onChange={(e) => setCtaLine(e.target.value)}
              placeholder="Available Now"
            />
          </div>

          {/* Download */}
          <Button
            onClick={exportPng}
            disabled={isExporting || !localImageUrl}
            className="w-full gap-2"
            size="lg"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Exporting…" : "Download PNG (1080×1080)"}
          </Button>
        </div>

        {/* Right: Live Preview */}
        <div className="flex-1 flex flex-col items-center">
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Live Preview</p>
          <div
            className="rounded-xl overflow-hidden border border-border shadow-xl"
            style={{
              width: 1080 * previewScale,
              height: 1080 * previewScale,
            }}
          >
            <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top left" }}>
              <TemplateCanvas
                ref={canvasRef}
                template={template}
                imageUrl={localImageUrl}
                artistName={artistName}
                trackTitle={trackTitle}
                releaseDate={releaseDate || undefined}
                ctaLine={ctaLine}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketingStudio;
