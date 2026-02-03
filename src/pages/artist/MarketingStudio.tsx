import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  ChevronLeft,
  Download,
  Share2,
  Loader2,
  Image as ImageIcon,
  Megaphone,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useMarketingStudio } from "@/hooks/useMarketingStudio";
import { TemplateSelector, BadgeSelector } from "@/components/marketing/PromoTemplates";
import { PromoCanvas, canvasToBlob } from "@/components/marketing/PromoCanvas";
import { CaptionBuilder } from "@/components/marketing/CaptionBuilder";
import { RecentAssetsList } from "@/components/marketing/RecentAssetsList";
import { MarketingHelpModal } from "@/components/marketing/MarketingHelpModal";
import browserImageCompression from "browser-image-compression";

const MarketingStudio = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const {
    artistInfo,
    tracks,
    recentAssets,
    isLoading,
    dailyCount,
    dailyLimit,
    canCreate,
    saveAsset,
    deleteAsset,
  } = useMarketingStudio();

  // Form state
  const [selectedTrackId, setSelectedTrackId] = useState<string>("");
  const [format, setFormat] = useState<"story" | "reel">("story");
  const [templateId, setTemplateId] = useState("neon-purple");
  const [selectedBadges, setSelectedBadges] = useState<string[]>(["exclusive-drop"]);
  const [showSafeZones, setShowSafeZones] = useState(true);
  const [showCta, setShowCta] = useState(true);
  const [ctaText, setCtaText] = useState("Stream on Music Exclusive");
  
  // Editable fields
  const [trackTitle, setTrackTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [genre, setGenre] = useState("");
  const [coverArtUrl, setCoverArtUrl] = useState<string | null>(null);
  const [customCoverFile, setCustomCoverFile] = useState<File | null>(null);
  
  // Caption state
  const [savedCaption, setSavedCaption] = useState<string | null>(null);
  
  // UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId);

  // Handle track selection
  const handleTrackSelect = (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (track) {
      setSelectedTrackId(trackId);
      setTrackTitle(track.title);
      setGenre(track.genre || artistInfo?.genre || "");
      setCoverArtUrl(track.artwork_url);
      setCustomCoverFile(null);
    }
  };

  // Initialize artist name when loaded
  if (artistInfo && !artistName) {
    setArtistName(artistInfo.artist_name);
    setGenre(artistInfo.genre || "");
  }

  // Handle badge toggle
  const toggleBadge = (badgeId: string) => {
    setSelectedBadges((prev) =>
      prev.includes(badgeId)
        ? prev.filter((b) => b !== badgeId)
        : [...prev, badgeId]
    );
  };

  // Handle custom cover upload with compression
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingStatus("Optimizing image...");
    setIsProcessing(true);

    try {
      const compressed = await browserImageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 2048,
        useWebWorker: true,
        fileType: "image/jpeg",
      });

      const url = URL.createObjectURL(compressed);
      setCoverArtUrl(url);
      setCustomCoverFile(compressed as File);
      toast.success("Image optimized!");
    } catch (error) {
      console.error("Compression error:", error);
      toast.error("Failed to process image");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  // Handle canvas render
  const handleCanvasRender = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
  }, []);

  // Share/Download handlers
  const handleShare = async () => {
    if (!canvasRef.current || !selectedTrackId) {
      toast.error("Please select a track first");
      return;
    }

    if (!canCreate) {
      toast.error("You've hit today's promo limit—try again tomorrow.");
      return;
    }

    setIsProcessing(true);
    setProcessingStatus("Generating preview...");

    try {
      const blob = await canvasToBlob(canvasRef.current);
      const file = new File([blob], `promo-${format}.png`, { type: "image/png" });

      // Save to database first
      setProcessingStatus("Saving promo...");
      const savedUrl = await saveAsset(
        selectedTrackId,
        format,
        templateId,
        blob,
        savedCaption,
        selectedBadges
      );

      if (!savedUrl) {
        throw new Error("Failed to save");
      }

      // Try native share
      setProcessingStatus("Preparing share...");
      if (navigator.canShare?.({ files: [file] })) {
        const shareText = savedCaption || 
          `Exclusive music before the world hears it. Stream my new drop on Music Exclusive. musicexclusive.co`;
        
        await navigator.share({
          files: [file],
          title: trackTitle,
          text: shareText,
        });
        toast.success("Shared successfully!");
      } else {
        // Fallback to download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `promo-${format}-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Downloaded! Share not supported on this device.");
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Share error:", error);
        toast.error("Share failed. Please try again.");
      }
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  const handleDownload = async () => {
    if (!canvasRef.current || !selectedTrackId) {
      toast.error("Please select a track first");
      return;
    }

    if (!canCreate) {
      toast.error("You've hit today's promo limit—try again tomorrow.");
      return;
    }

    setIsProcessing(true);
    setProcessingStatus("Generating image...");

    try {
      const blob = await canvasToBlob(canvasRef.current);

      // Save to database
      setProcessingStatus("Saving promo...");
      const savedUrl = await saveAsset(
        selectedTrackId,
        format,
        templateId,
        blob,
        savedCaption,
        selectedBadges
      );

      if (!savedUrl) {
        throw new Error("Failed to save");
      }

      // Download
      setProcessingStatus("Preparing download...");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `promo-${format}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Downloaded!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Download failed. Please try again.");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 px-4 py-4 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="w-full max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/artist/dashboard")}
            className="flex items-center gap-1.5 text-foreground/80 hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {dailyCount}/{dailyLimit} today
            </span>
            <MarketingHelpModal />
          </div>
        </div>
      </header>

      <main className="pt-20 px-4">
        <div className="w-full max-w-lg mx-auto space-y-6">
          {/* Title */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-2">
              <Megaphone className="w-5 h-5 text-primary" />
              <h1 className="font-display text-xl font-bold">Marketing Studio</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Create promo assets for Instagram Stories & Reels
            </p>
          </div>

          {/* Rate limit warning */}
          {!canCreate && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">
                You've hit today's promo limit ({dailyLimit}). Try again tomorrow!
              </p>
            </div>
          )}

          {/* Track Selection */}
          <GlowCard className="p-4 space-y-4">
            <SectionHeader title="Select Track" align="left" />
            
            <Select value={selectedTrackId} onValueChange={handleTrackSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a song to promote" />
              </SelectTrigger>
              <SelectContent>
                {tracks.map((track) => (
                  <SelectItem key={track.id} value={track.id}>
                    <div className="flex items-center gap-2">
                      {track.artwork_url && (
                        <img
                          src={track.artwork_url}
                          alt=""
                          className="w-6 h-6 rounded object-cover"
                        />
                      )}
                      <span>{track.title}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedTrackId && (
              <div className="grid gap-3 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Song Title</Label>
                  <Input
                    value={trackTitle}
                    onChange={(e) => setTrackTitle(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Artist Name</Label>
                  <Input
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Genre</Label>
                  <Input
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cover Art</Label>
                  <div className="flex items-center gap-3">
                    {coverArtUrl && (
                      <img
                        src={coverArtUrl}
                        alt="Cover"
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    <label className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        asChild
                      >
                        <span>
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Replace Cover
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </GlowCard>

          {/* Format Toggle */}
          <GlowCard className="p-4 space-y-4">
            <SectionHeader title="Format" align="left" />
            
            <div className="flex gap-2">
              <Button
                variant={format === "story" ? "default" : "outline"}
                onClick={() => setFormat("story")}
                className="flex-1 rounded-full"
              >
                Instagram Story
              </Button>
              <Button
                variant={format === "reel" ? "default" : "outline"}
                onClick={() => setFormat("reel")}
                className="flex-1 rounded-full"
              >
                Instagram Reel
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm">Show Safe Zones</Label>
              <Switch
                checked={showSafeZones}
                onCheckedChange={setShowSafeZones}
              />
            </div>
          </GlowCard>

          {/* Template Selector */}
          <GlowCard className="p-4 space-y-4">
            <SectionHeader title="Template" align="left" />
            <TemplateSelector
              selectedTemplate={templateId}
              onSelect={setTemplateId}
            />
          </GlowCard>

          {/* Badges */}
          <GlowCard className="p-4 space-y-4">
            <SectionHeader title="Badges (max 3)" align="left" />
            <BadgeSelector
              selectedBadges={selectedBadges}
              onToggle={toggleBadge}
              maxBadges={3}
            />
          </GlowCard>

          {/* CTA Strip */}
          <GlowCard className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <SectionHeader title="Call-to-Action" align="left" />
              <Switch checked={showCta} onCheckedChange={setShowCta} />
            </div>
            {showCta && (
              <Input
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="Stream on Music Exclusive"
                className="h-9"
              />
            )}
          </GlowCard>

          {/* Preview */}
          {selectedTrackId && (
            <GlowCard className="p-4 space-y-4">
              <SectionHeader title="Preview" align="left" />
              <PromoCanvas
                format={format}
                templateId={templateId}
                trackTitle={trackTitle}
                artistName={artistName}
                genre={genre}
                coverArtUrl={coverArtUrl}
                selectedBadges={selectedBadges}
                showSafeZones={showSafeZones}
                showCta={showCta}
                ctaText={ctaText}
                onRender={handleCanvasRender}
              />

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleShare}
                  disabled={isProcessing || !canCreate}
                  className="flex-1 rounded-full md:hidden"
                  style={{
                    background: "linear-gradient(135deg, hsl(280, 80%, 50%), hsl(280, 80%, 40%))",
                  }}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {processingStatus}
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleDownload}
                  disabled={isProcessing || !canCreate}
                  variant="outline"
                  className="flex-1 rounded-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {processingStatus}
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </>
                  )}
                </Button>
              </div>
            </GlowCard>
          )}

          {/* AI Caption Builder */}
          {selectedTrackId && (
            <GlowCard className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <SectionHeader title="AI Caption Builder" align="left" />
              </div>
              <CaptionBuilder
                trackTitle={trackTitle}
                artistName={artistName}
                genre={genre}
                onSaveCaption={setSavedCaption}
              />
            </GlowCard>
          )}

          {/* Recent Assets */}
          <GlowCard className="p-4 space-y-4">
            <SectionHeader title="Recent Promos" align="left" />
            <RecentAssetsList assets={recentAssets} onDelete={deleteAsset} />
          </GlowCard>
        </div>
      </main>
    </div>
  );
};

export default MarketingStudio;
