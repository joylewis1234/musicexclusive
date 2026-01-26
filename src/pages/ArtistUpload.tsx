import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Upload, Music, Headphones, X, Check, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const ACCEPTED_AUDIO_TYPES = ["audio/mpeg", "audio/mp4", "audio/aac", "audio/x-m4a"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const trackSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  album: z.string().trim().max(100, "Album must be less than 100 characters").optional(),
  artistId: z.string().min(1, "Artist ID is required"),
});

interface UploadedFile {
  file: File;
  name: string;
}

const ArtistUpload = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [title, setTitle] = useState("");
  const [album, setAlbum] = useState("");
  const [artistId] = useState("nova"); // Mock artist ID - would come from auth
  
  const [fullTrack, setFullTrack] = useState<UploadedFile | null>(null);
  const [previewTrack, setPreviewTrack] = useState<UploadedFile | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fullTrackInputRef = useRef<HTMLInputElement>(null);
  const previewTrackInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_AUDIO_TYPES.includes(file.type)) {
      return "Please upload an MP3 or AAC file";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File size must be less than 50MB";
    }
    return null;
  };

  const handleFullTrackSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      toast({ title: "Invalid file", description: error, variant: "destructive" });
      return;
    }

    setFullTrack({ file, name: file.name });
  };

  const handlePreviewTrackSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      toast({ title: "Invalid file", description: error, variant: "destructive" });
      return;
    }

    setPreviewTrack({ file, name: file.name });
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

    // Get public URL
    const { data: urlData } = supabase.storage.from("audio").getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validation = trackSchema.safeParse({ title, album, artistId });
    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0]?.message || "Please check your inputs",
        variant: "destructive",
      });
      return;
    }

    if (!fullTrack) {
      toast({
        title: "Full Track Required",
        description: "Please upload your full track file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const timestamp = Date.now();
      const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "-");

      // Upload full track
      setUploadProgress(20);
      const fullTrackPath = `${artistId}/${sanitizedTitle}-full-${timestamp}.mp3`;
      const fullAudioUrl = await uploadFile(fullTrack.file, fullTrackPath);

      if (!fullAudioUrl) {
        throw new Error("Failed to upload full track");
      }

      setUploadProgress(50);

      // Upload preview if provided
      let previewAudioUrl: string | null = null;
      if (previewTrack) {
        setUploadProgress(60);
        const previewPath = `${artistId}/${sanitizedTitle}-preview-${timestamp}.mp3`;
        previewAudioUrl = await uploadFile(previewTrack.file, previewPath);
        
        if (!previewAudioUrl) {
          console.warn("Preview upload failed, continuing without preview");
        }
      }

      setUploadProgress(80);

      // Get audio duration (approximate from file size for now)
      const estimatedDuration = Math.floor(fullTrack.file.size / 16000); // Rough estimate

      // Save to database
      const { error: dbError } = await supabase.from("tracks").insert({
        artist_id: artistId,
        title: title.trim(),
        album: album.trim() || null,
        duration: estimatedDuration,
        full_audio_url: fullAudioUrl,
        preview_audio_url: previewAudioUrl,
      });

      if (dbError) {
        throw new Error("Failed to save track record");
      }

      setUploadProgress(100);

      toast({
        title: "Track Uploaded!",
        description: previewAudioUrl 
          ? "Your track and preview are now live." 
          : "Your track is now live. Consider adding a preview next time!",
      });

      // Reset form
      setTitle("");
      setAlbum("");
      setFullTrack(null);
      setPreviewTrack(null);

      // Navigate to discovery after short delay
      setTimeout(() => navigate("/discovery"), 1500);

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

  return (
    <div className="min-h-screen bg-background flex flex-col px-4 py-6">
      {/* Header */}
      <header className="w-full max-w-lg mx-auto mb-8 flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">Back</span>
        </button>
      </header>

      <div className="flex-1 w-full max-w-lg mx-auto">
        {/* Page Title */}
        <section className="text-center mb-8 animate-fade-in">
          <h1 
            className="font-display text-2xl uppercase tracking-[0.1em] text-foreground font-bold mb-2"
            style={{
              textShadow: "0 0 30px hsl(var(--primary) / 0.4)"
            }}
          >
            Upload New Track
          </h1>
          <p className="text-muted-foreground text-sm">
            Share your music with the Vault
          </p>
        </section>

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in" style={{ animationDelay: "100ms" }}>
          {/* Track Details */}
          <div className="space-y-4 p-4 rounded-xl bg-card/50 border border-border/50">
            <div>
              <Label htmlFor="title" className="text-sm font-display uppercase tracking-wider text-foreground">
                Track Title *
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter track title"
                className="mt-2 bg-background border-border/50 focus:border-primary/50"
                maxLength={100}
                required
              />
            </div>

            <div>
              <Label htmlFor="album" className="text-sm font-display uppercase tracking-wider text-foreground">
                Album (Optional)
              </Label>
              <Input
                id="album"
                value={album}
                onChange={(e) => setAlbum(e.target.value)}
                placeholder="Enter album name"
                className="mt-2 bg-background border-border/50 focus:border-primary/50"
                maxLength={100}
              />
            </div>
          </div>

          {/* Full Track Upload */}
          <div className="p-4 rounded-xl bg-card/50 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Music className="w-5 h-5 text-primary" />
              <Label className="text-sm font-display uppercase tracking-wider text-foreground">
                Full Track *
              </Label>
            </div>

            <input
              ref={fullTrackInputRef}
              type="file"
              accept=".mp3,.m4a,.aac,audio/mpeg,audio/mp4,audio/aac"
              onChange={handleFullTrackSelect}
              className="hidden"
            />

            {fullTrack ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/30">
                <div className="flex items-center gap-2 min-w-0">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground truncate">{fullTrack.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFullTrack(null)}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fullTrackInputRef.current?.click()}
                className="w-full p-6 rounded-lg border-2 border-dashed border-border/50 hover:border-primary/50 transition-colors flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Upload className="w-8 h-8" />
                <span className="text-sm">Click to upload MP3 or AAC</span>
                <span className="text-xs text-muted-foreground">Max 50MB</span>
              </button>
            )}
          </div>

          {/* Hook Preview Upload */}
          <div className="p-4 rounded-xl bg-card/50 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Headphones className="w-5 h-5 text-accent" />
              <Label className="text-sm font-display uppercase tracking-wider text-foreground">
                Upload 15s Hook Preview
              </Label>
              <span className="text-xs text-muted-foreground">(Recommended)</span>
            </div>

            {/* Helper text */}
            <div className="flex items-start gap-2 mb-3 p-2 rounded-lg bg-accent/10 border border-accent/20">
              <Info className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs text-foreground font-medium">
                  Choose your strongest 15 seconds — the hook fans will hear on Discovery.
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Preview should be ~15 seconds. MP3/AAC supported.
                </p>
              </div>
            </div>

            <input
              ref={previewTrackInputRef}
              type="file"
              accept=".mp3,.m4a,.aac,audio/mpeg,audio/mp4,audio/aac"
              onChange={handlePreviewTrackSelect}
              className="hidden"
            />

            {previewTrack ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-accent/10 border border-accent/30">
                <div className="flex items-center gap-2 min-w-0">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-sm text-foreground truncate">{previewTrack.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewTrack(null)}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => previewTrackInputRef.current?.click()}
                className="w-full p-6 rounded-lg border-2 border-dashed border-border/50 hover:border-accent/50 transition-colors flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Upload className="w-8 h-8" />
                <span className="text-sm font-medium">Upload your hook preview</span>
                <span className="text-xs text-muted-foreground">The 15 seconds fans hear first</span>
              </button>
            )}
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="p-4 rounded-xl bg-card/50 border border-primary/30">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-sm font-display uppercase tracking-wider text-foreground">
                  Uploading...
                </span>
              </div>
              <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="accent"
            size="lg"
            className="w-full gap-2 font-display uppercase tracking-wider"
            disabled={isUploading || !fullTrack || !title.trim()}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Publish Track
              </>
            )}
          </Button>

          {!previewTrack && fullTrack && (
            <p className="text-center text-xs text-muted-foreground">
              💡 Tip: Adding a preview increases discovery by 40%
            </p>
          )}
        </form>
      </div>

      {/* Bottom spacing */}
      <div className="h-8" />
    </div>
  );
};

export default ArtistUpload;
