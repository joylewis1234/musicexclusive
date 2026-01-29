import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Music, ImageIcon, CheckCircle, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
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
import { validateCoverImage } from "@/utils/imageProcessing";
import { useTrackUpload } from "@/hooks/useTrackUpload";
import { UploadDiagnosticsPanel } from "@/components/artist/UploadDiagnosticsPanel";
import { UploadProgressBar } from "@/components/artist/UploadProgressBar";

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

function validateAudioFile(file: File): string | null {
  const validExtensions = ["mp3", "wav"];
  const validTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/wave", "audio/x-wav"];
  const maxSize = 50 * 1024 * 1024; // 50MB
  
  const ext = file?.name?.split(".")?.pop()?.toLowerCase() || "";
  const mime = file?.type?.toLowerCase() || "";
  const isValid = (ext && validExtensions.includes(ext)) || (mime && validTypes.includes(mime));
  if (!isValid) {
    return "Invalid format. Please upload an MP3 (audio/mpeg) or WAV (audio/wav) file.";
  }
  
  if (file?.size > maxSize) {
    return "Audio file too large. Please upload a file under 50MB.";
  }
  
  return null;
}

const ArtistUpload = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { state: uploadState, upload, retry, reset: resetUpload } = useTrackUpload();

  // Form fields
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [agreesToTerms, setAgreesToTerms] = useState(false);

  // Files
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  // UI state
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Refs
  const coverInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (coverPreview) {
        try {
          URL.revokeObjectURL(coverPreview);
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [coverPreview]);

  // Redirect on success
  useEffect(() => {
    if (uploadState.step === "success") {
      toast({ 
        title: "Track published successfully!", 
        description: "Your exclusive track is now live." 
      });
      const timer = setTimeout(() => {
        navigate("/artist/dashboard");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [uploadState.step, navigate, toast]);

  // Show error toast
  useEffect(() => {
    if (uploadState.step === "error" && uploadState.errorMessage) {
      toast({
        title: "Upload failed",
        description: uploadState.errorMessage,
        variant: "destructive",
      });
    }
  }, [uploadState.step, uploadState.errorMessage, toast]);

  const isFormValid = title?.trim() && genre && coverFile && audioFile && agreesToTerms;
  const isUploading = ["session_check", "cover_upload", "audio_upload", "db_insert", "db_update"].includes(uploadState.step);

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      const validationError = validateCoverImage(file);
      if (validationError) {
        toast({ 
          title: "Invalid cover image", 
          description: validationError, 
          variant: "destructive" 
        });
        if (e.target) e.target.value = "";
        return;
      }

      if (coverPreview) {
        try {
          URL.revokeObjectURL(coverPreview);
        } catch {
          // Ignore
        }
      }

      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    } catch (err) {
      console.error("[Upload] Cover select error:", err);
      toast({
        title: "Error selecting cover",
        description: "Please try selecting the image again.",
        variant: "destructive",
      });
    }
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      const validationError = validateAudioFile(file);
      if (validationError) {
        toast({ 
          title: "Invalid audio file", 
          description: validationError, 
          variant: "destructive" 
        });
        if (e.target) e.target.value = "";
        return;
      }

      setAudioFile(file);
    } catch (err) {
      console.error("[Upload] Audio select error:", err);
      toast({
        title: "Error selecting audio",
        description: "Please try selecting the file again.",
        variant: "destructive",
      });
    }
  };

  const handlePublish = async () => {
    // Show specific missing field errors
    const missingFields: string[] = [];
    if (!title?.trim()) missingFields.push("Track Title");
    if (!genre) missingFields.push("Genre");
    if (!coverFile) missingFields.push("Cover Art");
    if (!audioFile) missingFields.push("Audio File");
    if (!agreesToTerms) missingFields.push("Terms Agreement");
    
    if (missingFields.length > 0 || !user?.id) {
      toast({
        title: "Missing information",
        description: missingFields.length > 0 
          ? `Please fill in: ${missingFields.join(", ")}`
          : "Please sign in to upload tracks.",
        variant: "destructive",
      });
      return;
    }

    setShowDiagnostics(true);

    try {
      await upload({
        title,
        genre,
        coverFile: coverFile!,
        audioFile: audioFile!,
        userId: user.id,
      });
    } catch (err) {
      // Error is already handled in the hook
      console.error("[Upload] Publish error:", err);
    }
  };

  const handleRetry = () => {
    if (!user?.id || !coverFile || !audioFile) return;
    setShowDiagnostics(true);
    retry({
      title,
      genre,
      coverFile,
      audioFile,
      userId: user.id,
    }).catch((err) => console.error("[Upload] Retry error:", err));
  };

  const handleReset = () => {
    resetUpload();
    setShowDiagnostics(false);
  };

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
          <Label>Cover Art * (JPG, PNG, or WEBP, max 10MB)</Label>
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
            {coverPreview && coverFile ? (
              <div className="flex items-center gap-4">
                <img 
                  src={coverPreview} 
                  alt="Cover" 
                  className="w-16 h-16 rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{coverFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(coverFile.size / 1024).toFixed(0)} KB
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

        {/* Upload Progress */}
        {uploadState.step !== "idle" && (
          <GlowCard className="p-4">
            <UploadProgressBar 
              step={uploadState.step} 
              progress={uploadState.progress} 
              isTimedOut={uploadState.isTimedOut}
            />
          </GlowCard>
        )}

        {/* Success */}
        {uploadState.step === "success" && (
          <GlowCard className="p-4 border-green-500/50">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-green-500">Track published successfully!</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Redirecting to dashboard...</p>
          </GlowCard>
        )}

        {/* Error Display */}
        {uploadState.step === "error" && uploadState.errorMessage && (
          <GlowCard className="p-4 border-destructive/50 bg-destructive/5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Upload failed</p>
                <p className="text-sm text-muted-foreground mt-1">{uploadState.errorMessage}</p>
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

        {/* Diagnostics Panel Toggle */}
        {uploadState.diagnostics.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="w-full flex items-center justify-center gap-2 text-muted-foreground"
          >
            {showDiagnostics ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Hide Diagnostics
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show Diagnostics
              </>
            )}
          </Button>
        )}

        {/* Diagnostics Panel */}
        <UploadDiagnosticsPanel
          diagnostics={uploadState.diagnostics}
          isVisible={showDiagnostics}
          isTimedOut={uploadState.isTimedOut}
        />

        {/* Publish Button */}
        <Button
          className="w-full"
          size="lg"
          disabled={!isFormValid || isUploading || uploadState.step === "success"}
          onClick={handlePublish}
        >
          {isUploading ? (
            "Uploading..."
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
