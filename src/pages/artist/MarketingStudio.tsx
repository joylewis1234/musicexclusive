import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TemplateCanvas, TemplateType, TEMPLATE_DIMENSIONS } from "@/components/artist/marketing/TemplateCanvas";
import { useTemplateExport } from "@/hooks/useTemplateExport";
import { useArtistProfile } from "@/hooks/useArtistProfile";
import { Download, Upload, Sparkles, Image, Lock, ShieldCheck, Crown, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const TEMPLATES: { id: TemplateType; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "artist-photo", label: "Cinematic Photo", icon: <Image className="w-5 h-5" />, desc: "Artist portrait with bokeh glow" },
  { id: "cover-art", label: "Cover Art", icon: <Layers className="w-5 h-5" />, desc: "Album cover cinematic layout" },
  { id: "vault-glow", label: "Vault Glow", icon: <ShieldCheck className="w-5 h-5" />, desc: "Vault lighting & gold ring" },
  { id: "minimal-luxury", label: "Minimal Luxury", icon: <Crown className="w-5 h-5" />, desc: "Clean black & gold elegance" },
  { id: "story-format", label: "Story Format", icon: <Lock className="w-5 h-5" />, desc: "1080×1920 Instagram Story" },
];

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
    const url = URL.createObjectURL(file);
    setLocalImageUrl(url);
  }, []);

  const dims = TEMPLATE_DIMENSIONS[template];
  const previewMaxW = 400;
  const previewScale = previewMaxW / dims.width;

  const handleExport = useCallback(() => {
    exportPng({ width: dims.width, height: dims.height });
  }, [exportPng, dims]);

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

      {/* Template Selector — thumbnail cards */}
      <div className="px-4 mb-6">
        <Label className="mb-2 block">Template</Label>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTemplate(t.id)}
              className={cn(
                "flex-shrink-0 w-[140px] rounded-xl border p-3 text-left transition-all",
                template === t.id
                  ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                  : "border-border bg-card hover:border-muted-foreground/30"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center mb-2",
                template === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {t.icon}
              </div>
              <p className="text-xs font-semibold text-foreground truncate">{t.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{t.desc}</p>
              <div className="mt-2 text-[9px] text-muted-foreground/70">
                {TEMPLATE_DIMENSIONS[t.id].width}×{TEMPLATE_DIMENSIONS[t.id].height}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 flex flex-col lg:flex-row gap-6">
        {/* Left: Controls */}
        <div className="lg:w-[360px] space-y-5 flex-shrink-0">
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
            onClick={handleExport}
            disabled={isExporting || !localImageUrl}
            className="w-full gap-2"
            size="lg"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Exporting…" : `Download PNG (${dims.width}×${dims.height})`}
          </Button>
        </div>

        {/* Right: Live Preview */}
        <div className="flex-1 flex flex-col items-center">
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Live Preview</p>
          <div
            className="rounded-xl overflow-hidden border border-border shadow-xl"
            style={{
              width: dims.width * previewScale,
              height: dims.height * previewScale,
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
