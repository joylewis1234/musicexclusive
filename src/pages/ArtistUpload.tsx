import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Music, ImageIcon, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { GlowCard } from "@/components/ui/GlowCard";
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
import { sanitizeFilename, validateCoverImage, getImageContentType } from "@/utils/imageProcessing";

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

type UploadStatus = "idle" | "uploading_cover" | "uploading_audio" | "saving_track" | "success" | "error";

const ArtistUpload = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Form fields
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [agreesToTerms, setAgreesToTerms] = useState(false);

  // Files
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  // Upload state
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs
  const coverInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (coverPreview) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [coverPreview]);

  const isFormValid = title.trim() && genre && coverFile && audioFile && agreesToTerms;

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate the cover image
    const validationError = validateCoverImage(file);
    if (validationError) {
      toast({ 
        title: "Invalid cover image", 
        description: validationError, 
        variant: "destructive" 
      });
      e.target.value = "";
      return;
    }

    // Clean up old preview
    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "mp3") {
      toast({ 
        title: "Invalid file", 
        description: "Please upload an MP3 file", 
        variant: "destructive" 
      });
      e.target.value = "";
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({ 
        title: "File too large", 
        description: "Audio must be under 50MB", 
        variant: "destructive" 
      });
      e.target.value = "";
      return;
    }

    setAudioFile(file);
  };

  const handlePublish = async () => {
    if (!isFormValid || !user) return;

    setErrorMessage(null);
    setStatus("uploading_cover");

    try {
      // Step 1: Get fresh session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error("Session expired. Please log in again.");
      }

      // Step 2: Get artist profile
      const { data: artistProfile, error: profileError } = await supabase
        .from("artist_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError || !artistProfile) {
        console.error("Artist profile error:", profileError);
        throw new Error("Artist profile not found.");
      }

      const artistId = artistProfile.id;
      const timestamp = Date.now();
      const sanitizedTitle = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);

      // Step 3: Upload cover to track_covers bucket
      const coverExt = coverFile!.name.split(".").pop()?.toLowerCase() || "jpg";
      const coverPath = `${artistId}/${sanitizedTitle}-${timestamp}.${coverExt}`;
      const coverContentType = getImageContentType(coverFile!);

      console.log("[Upload] Starting cover upload:", {
        path: coverPath,
        size: `${(coverFile!.size / 1024).toFixed(0)} KB`,
        type: coverContentType,
        online: navigator.onLine,
      });

      const { data: coverData, error: coverError } = await supabase.storage
        .from("track_covers")
        .upload(coverPath, coverFile!, {
          cacheControl: "3600",
          upsert: false,
          contentType: coverContentType,
        });

      if (coverError) {
        console.error("[Upload] Cover upload failed:", {
          error: coverError,
          fileName: coverFile!.name,
          fileSize: coverFile!.size,
          online: navigator.onLine,
        });
        throw new Error("Cover upload failed. Try a smaller image or different format (JPG/PNG/WEBP).");
      }

      console.log("[Upload] Cover uploaded:", coverData.path);

      // Get cover public URL
      const { data: coverUrlData } = supabase.storage
        .from("track_covers")
        .getPublicUrl(coverData.path);

      const coverUrl = coverUrlData.publicUrl;

      // Step 4: Upload audio to track_audio bucket
      setStatus("uploading_audio");
      const audioPath = `${artistId}/${sanitizedTitle}-${timestamp}.mp3`;

      console.log("[Upload] Starting audio upload:", {
        path: audioPath,
        size: `${(audioFile!.size / (1024 * 1024)).toFixed(2)} MB`,
        online: navigator.onLine,
      });

      const { data: audioData, error: audioError } = await supabase.storage
        .from("track_audio")
        .upload(audioPath, audioFile!, {
          cacheControl: "3600",
          upsert: false,
          contentType: "audio/mpeg",
        });

      if (audioError) {
        console.error("[Upload] Audio upload failed:", {
          error: audioError,
          fileName: audioFile!.name,
          fileSize: audioFile!.size,
          online: navigator.onLine,
        });
        throw new Error("Audio upload failed. Try a smaller file or check your connection.");
      }

      console.log("[Upload] Audio uploaded:", audioData.path);

      // Get audio public URL
      const { data: audioUrlData } = supabase.storage
        .from("track_audio")
        .getPublicUrl(audioData.path);

      const audioUrl = audioUrlData.publicUrl;

      // Step 5: Insert track record
      setStatus("saving_track");

      const { data: trackData, error: trackError } = await supabase
        .from("tracks")
        .insert({
          artist_id: artistId,
          title: title.trim(),
          genre: genre,
          artwork_url: coverUrl,
          full_audio_url: audioUrl,
        })
        .select("id")
        .single();

      if (trackError) {
        console.error("[Upload] Track insert error:", trackError);
        throw new Error(trackError.message || "Failed to save track");
      }

      console.log("[Upload] Track saved:", trackData.id);

      // Success!
      setStatus("success");
      toast({ title: "Track uploaded!", description: "Your exclusive track is now live." });

      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate("/artist/dashboard");
      }, 1500);

    } catch (err) {
      console.error("[Upload] Error:", err);
      setStatus("error");
      
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setErrorMessage(message);
      
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleRetry = () => {
    setStatus("idle");
    setErrorMessage(null);
  };

  const getStatusMessage = () => {
    switch (status) {
      case "uploading_cover":
        return "Uploading cover art...";
      case "uploading_audio":
        return "Uploading audio file...";
      case "saving_track":
        return "Saving track...";
      case "success":
        return "Track uploaded successfully!";
      default:
        return "";
    }
  };

  const isUploading = status === "uploading_cover" || status === "uploading_audio" || status === "saving_track";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/artist/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-lg font-semibold tracking-wide">Upload Exclusive Track</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        {/* Track Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Track Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter track title"
            maxLength={100}
            disabled={isUploading}
          />
        </div>

        {/* Genre */}
        <div className="space-y-2">
          <Label>Genre *</Label>
          <Select value={genre} onValueChange={setGenre} disabled={isUploading}>
            <SelectTrigger>
              <SelectValue placeholder="Select genre" />
            </SelectTrigger>
            <SelectContent>
              {GENRES.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cover Art */}
        <div className="space-y-2">
          <Label>Cover Art * (JPG, PNG, or WEBP, max 1.5MB)</Label>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleCoverSelect}
            className="hidden"
            disabled={isUploading}
          />
          <GlowCard
            className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => !isUploading && coverInputRef.current?.click()}
          >
            {coverPreview ? (
              <div className="flex items-center gap-4">
                <img src={coverPreview} alt="Cover" className="w-16 h-16 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{coverFile?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {coverFile && (coverFile.size / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
                <ImageIcon className="h-8 w-8" />
                <span className="text-sm">Tap to select cover art</span>
              </div>
            )}
          </GlowCard>
        </div>

        {/* Audio File */}
        <div className="space-y-2">
          <Label>Audio File * (MP3 only, max 50MB)</Label>
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/mpeg,audio/mp3"
            onChange={handleAudioSelect}
            className="hidden"
            disabled={isUploading}
          />
          <GlowCard
            className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => !isUploading && audioInputRef.current?.click()}
          >
            {audioFile ? (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Music className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{audioFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
                <Music className="h-8 w-8" />
                <span className="text-sm">Tap to select audio file</span>
              </div>
            )}
          </GlowCard>
        </div>

        {/* Terms Checkbox */}
        <div className="flex items-start gap-3 pt-2">
          <Checkbox
            id="terms"
            checked={agreesToTerms}
            onCheckedChange={(checked) => setAgreesToTerms(checked === true)}
            disabled={isUploading}
          />
          <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
            I agree to the Artist Terms of Service and confirm I own all rights to this music.
          </Label>
        </div>

        {/* Upload Progress/Status */}
        {isUploading && (
          <GlowCard className="p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm font-medium">{getStatusMessage()}</span>
            </div>
          </GlowCard>
        )}

        {/* Success */}
        {status === "success" && (
          <GlowCard className="p-4 border-green-500/50">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-green-500">{getStatusMessage()}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Redirecting to dashboard...</p>
          </GlowCard>
        )}

        {/* Error Display */}
        {status === "error" && errorMessage && (
          <GlowCard className="p-4 border-destructive/50 bg-destructive/5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Upload failed</p>
                <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" className="mt-3" onClick={handleRetry}>
              Try Again
            </Button>
          </GlowCard>
        )}

        {/* Publish Button */}
        <Button
          className="w-full"
          size="lg"
          disabled={!isFormValid || isUploading || status === "success"}
          onClick={handlePublish}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {getStatusMessage()}
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Publish Exclusive Track
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ArtistUpload;
