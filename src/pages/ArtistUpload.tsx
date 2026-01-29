import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Music, ImageIcon, Loader2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
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

/**
 * Get proper content type for audio files
 */
function getAudioContentType(file: File): string {
  const type = file.type.toLowerCase();
  
  if (type === "audio/mpeg" || type === "audio/mp3") return "audio/mpeg";
  if (type === "audio/wav" || type === "audio/wave") return "audio/wav";
  if (type === "audio/x-wav") return "audio/wav";
  
  // Fallback based on extension
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "wav") return "audio/wav";
  
  return "audio/mpeg"; // Default fallback
}

/**
 * Validate audio file
 */
function validateAudioFile(file: File): string | null {
  const validExtensions = ["mp3", "wav"];
  const maxSize = 50 * 1024 * 1024; // 50MB
  
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !validExtensions.includes(ext)) {
    return "Invalid format. Please upload an MP3 or WAV file.";
  }
  
  if (file.size > maxSize) {
    return "Audio file too large. Please upload a file under 50MB.";
  }
  
  return null;
}

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
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [lastFailedStep, setLastFailedStep] = useState<"cover" | "audio" | "database" | null>(null);

  // Upload progress tracking
  const [uploadedCoverUrl, setUploadedCoverUrl] = useState<string | null>(null);

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

    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    // Reset uploaded URL if user selects a new file
    setUploadedCoverUrl(null);
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateAudioFile(file);
    if (validationError) {
      toast({ 
        title: "Invalid audio file", 
        description: validationError, 
        variant: "destructive" 
      });
      e.target.value = "";
      return;
    }

    setAudioFile(file);
  };

  const handlePublish = async (retryFromStep?: "cover" | "audio" | "database") => {
    if (!isFormValid || !user) return;

    setErrorMessage(null);
    setErrorDetails(null);
    setLastFailedStep(null);

    try {
      // Step 1: Get fresh session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw { step: "auth", message: "Session expired. Please log in again." };
      }

      // Step 2: Get artist profile
      const { data: artistProfile, error: profileError } = await supabase
        .from("artist_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError || !artistProfile) {
        console.error("[Upload] Artist profile error:", profileError);
        throw { step: "auth", message: "Artist profile not found. Please complete your profile setup." };
      }

      const artistId = artistProfile.id;
      const timestamp = Date.now();
      const sanitizedTitle = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);

      let coverUrl = uploadedCoverUrl;

      // Step 3: Upload cover (skip if already uploaded during retry)
      if (!retryFromStep || retryFromStep === "cover" || !coverUrl) {
        setStatus("uploading_cover");
        
        const coverExt = coverFile!.name.split(".").pop()?.toLowerCase() || "jpg";
        const sanitizedCoverName = sanitizeFilename(coverFile!.name);
        const coverPath = `${artistId}/${timestamp}-${sanitizedCoverName}`;
        const coverContentType = getImageContentType(coverFile!);

        console.log("[Upload] Starting cover upload:", {
          bucket: "track_covers",
          path: coverPath,
          fileName: coverFile!.name,
          fileSize: `${(coverFile!.size / 1024).toFixed(0)} KB`,
          fileType: coverFile!.type,
          contentType: coverContentType,
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
            errorMessage: coverError.message,
            errorName: (coverError as any).name,
            fileName: coverFile!.name,
            fileSize: coverFile!.size,
            online: navigator.onLine,
          });
          setLastFailedStep("cover");
          throw { 
            step: "cover", 
            message: "Cover upload failed. Please try again.",
            details: `Error: ${coverError.message || JSON.stringify(coverError)}`
          };
        }

        console.log("[Upload] Cover uploaded successfully:", coverData.path);

        const { data: coverUrlData } = supabase.storage
          .from("track_covers")
          .getPublicUrl(coverData.path);

        coverUrl = coverUrlData.publicUrl;
        setUploadedCoverUrl(coverUrl);
      }

      // Step 4: Upload audio
      if (!retryFromStep || retryFromStep === "cover" || retryFromStep === "audio") {
        setStatus("uploading_audio");
        
        const audioExt = audioFile!.name.split(".").pop()?.toLowerCase() || "mp3";
        const sanitizedAudioName = sanitizeFilename(audioFile!.name);
        const audioPath = `${artistId}/${timestamp}-${sanitizedAudioName}`;
        const audioContentType = getAudioContentType(audioFile!);

        console.log("[Upload] Starting audio upload:", {
          bucket: "track_audio",
          path: audioPath,
          fileName: audioFile!.name,
          fileSize: `${(audioFile!.size / (1024 * 1024)).toFixed(2)} MB`,
          fileType: audioFile!.type,
          contentType: audioContentType,
          online: navigator.onLine,
        });

        const { data: audioData, error: audioError } = await supabase.storage
          .from("track_audio")
          .upload(audioPath, audioFile!, {
            cacheControl: "3600",
            upsert: false,
            contentType: audioContentType,
          });

        if (audioError) {
          console.error("[Upload] Audio upload failed:", {
            error: audioError,
            errorMessage: audioError.message,
            errorName: (audioError as any).name,
            statusCode: (audioError as any).statusCode,
            fileName: audioFile!.name,
            fileSize: audioFile!.size,
            fileType: audioFile!.type,
            online: navigator.onLine,
          });
          setLastFailedStep("audio");
          throw { 
            step: "audio", 
            message: "Audio upload failed. Please check your connection and try again.",
            details: `Error: ${audioError.message || JSON.stringify(audioError)}`
          };
        }

        console.log("[Upload] Audio uploaded successfully:", audioData.path);

        const { data: audioUrlData } = supabase.storage
          .from("track_audio")
          .getPublicUrl(audioData.path);

        const audioUrl = audioUrlData.publicUrl;

        // Step 5: Save track to database
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
          setLastFailedStep("database");
          throw { 
            step: "database", 
            message: "Failed to save track. Please try again.",
            details: `Error: ${trackError.message || JSON.stringify(trackError)}`
          };
        }

        console.log("[Upload] Track saved successfully:", trackData.id);
      }

      // Success!
      setStatus("success");
      toast({ 
        title: "Track published successfully!", 
        description: "Your exclusive track is now live." 
      });

      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate("/artist/dashboard");
      }, 1500);

    } catch (err: any) {
      console.error("[Upload] Error:", err);
      setStatus("error");
      
      const message = err?.message || "An unexpected error occurred";
      const details = err?.details || null;
      
      setErrorMessage(message);
      setErrorDetails(details);
      
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleRetry = () => {
    // Retry from the last failed step without resetting the form
    if (lastFailedStep) {
      handlePublish(lastFailedStep);
    } else {
      handlePublish();
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setErrorMessage(null);
    setErrorDetails(null);
    setLastFailedStep(null);
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
        return "Track published successfully!";
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
                    {uploadedCoverUrl && <span className="text-green-500 ml-2">✓ Uploaded</span>}
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
          <Label>Audio File * (MP3 or WAV, max 50MB)</Label>
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/mpeg,audio/mp3,audio/wav,audio/wave,.mp3,.wav"
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
                {errorDetails && (
                  <p className="text-xs text-muted-foreground mt-2 font-mono bg-muted/50 p-2 rounded">
                    {errorDetails}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="default" size="sm" onClick={handleRetry}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry Upload
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Start Over
              </Button>
            </div>
          </GlowCard>
        )}

        {/* Publish Button */}
        <Button
          className="w-full"
          size="lg"
          disabled={!isFormValid || isUploading || status === "success"}
          onClick={() => handlePublish()}
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
