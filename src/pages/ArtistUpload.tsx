import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home, Upload, Music, X, Check, Loader2, Info, Lock, Play, Pause, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PreviewTimeSelector } from "@/components/artist/PreviewTimeSelector";

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

const EXCLUSIVE_PERIODS = [
  { value: "3", label: "3 Weeks (Minimum)" },
  { value: "4", label: "4 Weeks" },
  { value: "6", label: "6 Weeks" },
  { value: "8", label: "8 Weeks" },
  { value: "12", label: "12 Weeks" },
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

interface UploadedFile {
  file: File;
  name: string;
  objectUrl?: string;
}

interface UploadedImage {
  file: File;
  name: string;
  previewUrl: string;
}

const ArtistUpload = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Section 1: Track Details
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  
  // Section 2: Cover Art
  const [coverArt, setCoverArt] = useState<UploadedImage | null>(null);
  const coverArtInputRef = useRef<HTMLInputElement>(null);
  
  // Section 3: Audio File
  const [fullTrack, setFullTrack] = useState<UploadedFile | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [previewStartSeconds, setPreviewStartSeconds] = useState(0);
  
  // Full track player state
  const [isFullTrackPlaying, setIsFullTrackPlaying] = useState(false);
  const fullTrackAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Section 3: Release Settings
  const [exclusivePeriod, setExclusivePeriod] = useState("3");
  
  // Section 4: Rights Confirmation
  const [ownsRights, setOwnsRights] = useState(false);
  const [hasExclusiveRights, setHasExclusiveRights] = useState(false);
  const [agreesToTerms, setAgreesToTerms] = useState(false);
  
  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fullTrackInputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (fullTrack?.objectUrl) {
        URL.revokeObjectURL(fullTrack.objectUrl);
      }
      if (coverArt?.previewUrl) {
        URL.revokeObjectURL(coverArt.previewUrl);
      }
      if (fullTrackAudioRef.current) {
        fullTrackAudioRef.current.pause();
        fullTrackAudioRef.current = null;
      }
    };
  }, []);

  const validateFullTrack = (file: File): string | null => {
    if (!file.name.toLowerCase().endsWith('.wav')) {
      return "Please upload a .WAV file for the full track";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File size must be less than 100MB";
    }
    return null;
  };

  const validateCoverArt = (file: File): string | null => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return "Please upload a JPG, PNG, or WEBP image";
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return "Image size must be less than 10MB";
    }
    return null;
  };

  const handleCoverArtSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateCoverArt(file);
    if (error) {
      toast({ title: "Invalid file", description: error, variant: "destructive" });
      return;
    }

    try {
      // Revoke old preview URL if exists
      if (coverArt?.previewUrl) {
        URL.revokeObjectURL(coverArt.previewUrl);
      }

      const previewUrl = URL.createObjectURL(file);
      
      // Verify the image can be loaded before setting state
      const img = new Image();
      img.onload = () => {
        setCoverArt({ file, name: file.name, previewUrl });
      };
      img.onerror = () => {
        URL.revokeObjectURL(previewUrl);
        toast({ title: "Invalid image", description: "Could not load the selected image", variant: "destructive" });
      };
      img.src = previewUrl;
    } catch (err) {
      console.error("Error handling cover art:", err);
      toast({ title: "Error", description: "Failed to process image", variant: "destructive" });
    }
  };

  const handleRemoveCoverArt = () => {
    if (coverArt?.previewUrl) {
      URL.revokeObjectURL(coverArt.previewUrl);
    }
    setCoverArt(null);
    if (coverArtInputRef.current) {
      coverArtInputRef.current.value = "";
    }
  };

  const handleFullTrackSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFullTrack(file);
    if (error) {
      toast({ title: "Invalid file", description: error, variant: "destructive" });
      return;
    }

    // Revoke old object URL if exists
    if (fullTrack?.objectUrl) {
      URL.revokeObjectURL(fullTrack.objectUrl);
    }

    // Create object URL for playback
    const objectUrl = URL.createObjectURL(file);
    setFullTrack({ file, name: file.name, objectUrl });
    setPreviewStartSeconds(0);

    // Get audio duration
    const audio = new Audio(objectUrl);
    audio.addEventListener("loadedmetadata", () => {
      setAudioDuration(Math.floor(audio.duration));
    });
  };

  const handleRemoveFullTrack = () => {
    if (fullTrack?.objectUrl) {
      URL.revokeObjectURL(fullTrack.objectUrl);
    }
    if (fullTrackAudioRef.current) {
      fullTrackAudioRef.current.pause();
      fullTrackAudioRef.current = null;
    }
    setFullTrack(null);
    setAudioDuration(0);
    setPreviewStartSeconds(0);
    setIsFullTrackPlaying(false);
  };

  const toggleFullTrackPlay = () => {
    if (!fullTrack?.objectUrl) return;

    if (isFullTrackPlaying) {
      fullTrackAudioRef.current?.pause();
      setIsFullTrackPlaying(false);
    } else {
      if (!fullTrackAudioRef.current) {
        fullTrackAudioRef.current = new Audio(fullTrack.objectUrl);
        fullTrackAudioRef.current.addEventListener("ended", () => {
          setIsFullTrackPlaying(false);
        });
      }
      fullTrackAudioRef.current.play();
      setIsFullTrackPlaying(true);
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("audio")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data: urlData } = supabase.storage.from("audio").getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const isFormValid = 
    title.trim() && 
    genre && 
    coverArt &&
    fullTrack && 
    ownsRights && 
    hasExclusiveRights && 
    agreesToTerms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      toast({
        title: "Missing Required Fields",
        description: "Please complete all required fields and confirm the rights checkboxes.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const timestamp = Date.now();
      const artistId = user?.email || "unknown";
      const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "-");

      // Upload cover art
      setUploadProgress(20);
      const coverArtExt = coverArt!.file.name.split('.').pop();
      const coverArtPath = `artwork/${artistId}/${sanitizedTitle}-cover-${timestamp}.${coverArtExt}`;
      const artworkUrl = await uploadFile(coverArt!.file, coverArtPath);

      if (!artworkUrl) {
        throw new Error("Failed to upload cover art");
      }

      // Upload full track
      setUploadProgress(45);
      const fullTrackExt = fullTrack!.file.name.split('.').pop();
      const fullTrackPath = `tracks/${artistId}/${sanitizedTitle}-full-${timestamp}.${fullTrackExt}`;
      const fullAudioUrl = await uploadFile(fullTrack!.file, fullTrackPath);

      if (!fullAudioUrl) {
        throw new Error("Failed to upload full track");
      }

      setUploadProgress(70);

      // Save to database with all fields
      const { error: dbError } = await supabase.from("tracks").insert({
        artist_id: artistId,
        title: title.trim(),
        genre: genre,
        duration: audioDuration,
        artwork_url: artworkUrl,
        full_audio_url: fullAudioUrl,
        preview_audio_url: fullAudioUrl, // Use same URL, fans will seek to preview_start_seconds
        preview_start_seconds: previewStartSeconds,
      });

      if (dbError) {
        throw new Error("Failed to save track record");
      }

      setUploadProgress(100);

      toast({
        title: "🎉 Track Published!",
        description: "Your exclusive track is now live on Music Exclusive.",
      });

      // Navigate to dashboard after short delay
      setTimeout(() => navigate("/artist/dashboard"), 1500);

    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-lg md:max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
            Upload Track
          </span>

          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Go home"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-12 px-4">
        <div className="container max-w-lg md:max-w-xl mx-auto">
          
          {/* Page Header */}
          <div className="text-center mb-8">
            <SectionHeader title="Upload New Track" align="center" framed />
            <p className="text-muted-foreground text-sm font-body mt-4">
              Share your exclusive music with fans inside the Vault.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* SECTION 1: Track Details */}
            <GlowCard className="p-4 md:p-5">
              <h3 className="font-display text-sm uppercase tracking-widest text-primary mb-5 text-center">
                Track Details
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm">Track Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter your track title"
                    className="h-12 text-base"
                    maxLength={100}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Genre *</Label>
                  <Select value={genre} onValueChange={setGenre}>
                    <SelectTrigger className="bg-card h-12 text-base">
                      <SelectValue placeholder="Select genre" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border z-50">
                      {GENRES.map((g) => (
                        <SelectItem key={g} value={g} className="text-base py-3">
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm">Short Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell fans about this track..."
                    className="min-h-[80px] text-base resize-none"
                    maxLength={280}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {description.length}/280
                  </p>
                </div>
              </div>
            </GlowCard>

            {/* SECTION 2: Cover Art */}
            <GlowCard className="p-4 md:p-5">
              <h3 className="font-display text-sm uppercase tracking-widest text-primary mb-5 text-center">
                Cover Art
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    <Label className="text-sm">Upload Cover Art *</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Square image, 1500×1500 or higher recommended. JPG, PNG, or WEBP.
                  </p>

                  <input
                    ref={coverArtInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleCoverArtSelect}
                    className="hidden"
                  />

                  {coverArt ? (
                    <div className="space-y-3">
                      {/* Image preview */}
                      <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-xl overflow-hidden border border-primary/30">
                        <img
                          src={coverArt.previewUrl}
                          alt="Cover art preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error("Image failed to load");
                            e.currentTarget.src = "/placeholder.svg";
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleRemoveCoverArt}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 text-foreground hover:bg-background transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* File info */}
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary" />
                        <span className="truncate max-w-[200px]">{coverArt.name}</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => coverArtInputRef.current?.click()}
                      className="w-full aspect-square max-w-[200px] mx-auto rounded-xl border-2 border-dashed border-border/50 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <ImageIcon className="w-10 h-10" />
                      <span className="text-sm">Click to upload</span>
                    </button>
                  )}
                </div>
              </div>
            </GlowCard>

            {/* SECTION 3: Audio Upload & Preview Selection */}
            <GlowCard className="p-4 md:p-5">
              <h3 className="font-display text-sm uppercase tracking-widest text-primary mb-5 text-center">
                Audio File
              </h3>
              
              <div className="space-y-5">
                {/* Full Track Upload */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Music className="w-5 h-5 text-primary" />
                    <Label className="text-sm">Upload Full Track (.WAV only) *</Label>
                  </div>

                  <input
                    ref={fullTrackInputRef}
                    type="file"
                    accept=".wav"
                    onChange={handleFullTrackSelect}
                    className="hidden"
                  />

                  {fullTrack ? (
                    <div className="space-y-3">
                      {/* File info + remove */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/30">
                        <div className="flex items-center gap-2 min-w-0">
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-sm text-foreground truncate">{fullTrack.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveFullTrack}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Full track player */}
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/30">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={toggleFullTrackPlay}
                          className="h-10 w-10 flex-shrink-0"
                        >
                          {isFullTrackPlaying ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">Full Track Preview</p>
                          <p className="text-xs text-muted-foreground">
                            Duration: {formatDuration(audioDuration)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fullTrackInputRef.current?.click()}
                      className="w-full p-6 rounded-lg border-2 border-dashed border-border/50 hover:border-primary/50 transition-colors flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <Upload className="w-8 h-8" />
                      <span className="text-sm">Click to upload .WAV file</span>
                      <span className="text-xs text-muted-foreground">High-quality production required</span>
                    </button>
                  )}
                </div>

                {/* Preview Selection (only show after track upload) */}
                {fullTrack && audioDuration > 0 && (
                  <div className="pt-4 border-t border-border/30">
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20 mb-4">
                      <Info className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground">
                        Select the best 15-second hook for Discovery. Fans will hear this preview before unlocking the full track.
                      </p>
                    </div>

                    <PreviewTimeSelector
                      audioUrl={fullTrack.objectUrl || null}
                      audioDuration={audioDuration}
                      previewStartSeconds={previewStartSeconds}
                      onPreviewStartChange={setPreviewStartSeconds}
                    />
                  </div>
                )}
              </div>
            </GlowCard>

            {/* SECTION 3: Exclusive Release Settings */}
            <GlowCard className="p-4 md:p-5">
              <h3 className="font-display text-sm uppercase tracking-widest text-primary mb-5 text-center">
                Exclusive Release Settings
              </h3>
              
              <div className="space-y-4">
                {/* Release Type Badge */}
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30">
                    <Lock className="w-4 h-4 text-primary" />
                    <span className="text-primary text-sm font-display uppercase tracking-wider">
                      Exclusive Release
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Exclusive Period</Label>
                  <Select value={exclusivePeriod} onValueChange={setExclusivePeriod}>
                    <SelectTrigger className="bg-card h-12 text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border z-50">
                      {EXCLUSIVE_PERIODS.map((period) => (
                        <SelectItem key={period.value} value={period.value} className="text-base py-3">
                          {period.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Helper text */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border/30">
                  <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    During this period, your music is only available on Music Exclusive.
                  </p>
                </div>
              </div>
            </GlowCard>

            {/* SECTION 4: Rights Confirmation */}
            <GlowCard className="p-4 md:p-5">
              <h3 className="font-display text-sm uppercase tracking-widest text-primary mb-5 text-center">
                Rights Confirmation
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Checkbox
                    id="ownsRights"
                    checked={ownsRights}
                    onCheckedChange={(checked) => setOwnsRights(checked as boolean)}
                    className="mt-0.5 h-5 w-5"
                  />
                  <Label htmlFor="ownsRights" className="text-sm font-normal leading-relaxed cursor-pointer">
                    I own or control all rights to this music *
                  </Label>
                </div>

                <div className="flex items-start gap-4">
                  <Checkbox
                    id="hasExclusiveRights"
                    checked={hasExclusiveRights}
                    onCheckedChange={(checked) => setHasExclusiveRights(checked as boolean)}
                    className="mt-0.5 h-5 w-5"
                  />
                  <Label htmlFor="hasExclusiveRights" className="text-sm font-normal leading-relaxed cursor-pointer">
                    I have the right to release this music exclusively *
                  </Label>
                </div>

                <div className="flex items-start gap-4">
                  <Checkbox
                    id="agreesToTerms"
                    checked={agreesToTerms}
                    onCheckedChange={(checked) => setAgreesToTerms(checked as boolean)}
                    className="mt-0.5 h-5 w-5"
                  />
                  <Label htmlFor="agreesToTerms" className="text-sm font-normal leading-relaxed cursor-pointer">
                    I agree to the Artist Terms of Service *
                  </Label>
                </div>
              </div>
            </GlowCard>

            {/* Upload Progress */}
            {isUploading && (
              <GlowCard className="p-4" unlocking>
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-sm font-display uppercase tracking-wider text-foreground">
                    Publishing your track...
                  </span>
                </div>
                <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </GlowCard>
            )}

            {/* Primary CTA */}
            <Button
              type="submit"
              size="lg"
              className="w-full h-14 font-display uppercase tracking-wider"
              disabled={isUploading || !isFormValid}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Publishing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Publish Exclusive Track
                </>
              )}
            </Button>

          </form>
        </div>
      </main>
    </div>
  );
};

export default ArtistUpload;
