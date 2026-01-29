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

type UploadStatus = "idle" | "uploading_cover" | "success" | "error";

interface UploadError {
  step: string;
  message: string;
  details?: string;
}

interface UploadResult {
  coverUrl: string;
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
  const [error, setError] = useState<UploadError | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  // Refs
  const coverInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  const isFormValid = title.trim() && genre && coverFile && agreesToTerms;

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.toLowerCase().split(".").pop();
    if (!["jpg", "jpeg", "png", "webp"].includes(ext || "")) {
      toast({ title: "Invalid file", description: "Please upload a JPG, PNG, or WEBP image", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Image must be under 10MB", variant: "destructive" });
      return;
    }

    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "mp3") {
      toast({ title: "Invalid file", description: "Please upload an MP3 file", variant: "destructive" });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "File too large", description: "Audio must be under 50MB", variant: "destructive" });
      return;
    }

    setAudioFile(file);
  };

  const handlePublish = async () => {
    if (!isFormValid || !user) return;

    setError(null);
    setUploadResult(null);
    setStatus("uploading_cover");

    try {
      // Get fresh session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw { step: "auth", message: "Session expired. Please log in again." };
      }

      // Get artist profile
      const { data: artistProfile, error: profileError } = await supabase
        .from("artist_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError || !artistProfile) {
        throw { step: "auth", message: "Artist profile not found." };
      }

      // Build form data for server-side upload (COVER ONLY)
      const formData = new FormData();
      formData.append("coverFile", coverFile!);
      formData.append("artistId", artistProfile.id);
      formData.append("title", title.trim());
      formData.append("genre", genre);

      // Call edge function for COVER ONLY TEST
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uploadTrackAssets`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw {
          step: "cover_upload",
          message: result.error || "Cover upload failed",
          details: JSON.stringify(result, null, 2),
        };
      }

      // Success - show the URL
      setUploadResult({ coverUrl: result.coverUrl });
      setStatus("success");
      toast({ title: "Cover uploaded!", description: "URL displayed below" });

    } catch (err: any) {
      console.error("Upload error:", err);
      setStatus("error");
      setError({
        step: err.step || "unknown",
        message: err.message || "An unexpected error occurred",
        details: err.details,
      });
    }
  };

  const handleRetry = () => {
    setStatus("idle");
    setError(null);
  };

  const getStatusMessage = () => {
    switch (status) {
      case "uploading_cover":
        return "Uploading cover art...";
      case "success":
        return "Cover uploaded successfully!";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/artist/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-lg font-semibold tracking-wide">Upload Track (Cover Test Only)</h1>
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
            disabled={status !== "idle"}
          />
        </div>

        {/* Genre */}
        <div className="space-y-2">
          <Label>Genre *</Label>
          <Select value={genre} onValueChange={setGenre} disabled={status !== "idle"}>
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
          <Label>Cover Art * (JPG, PNG, or WEBP)</Label>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleCoverSelect}
            className="hidden"
            disabled={status !== "idle"}
          />
          <GlowCard
            className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => status === "idle" && coverInputRef.current?.click()}
          >
            {coverPreview ? (
              <div className="flex items-center gap-4">
                <img src={coverPreview} alt="Cover" className="w-16 h-16 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{coverFile?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {coverFile && (coverFile.size / (1024 * 1024)).toFixed(2)} MB
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

        {/* Audio File - DISABLED FOR TESTING */}
        <div className="space-y-2 opacity-50">
          <Label>Audio File (DISABLED - Cover test only)</Label>
          <GlowCard className="p-4">
            <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
              <Music className="h-8 w-8" />
              <span className="text-sm">Audio upload disabled for this test</span>
            </div>
          </GlowCard>
        </div>

        {/* Terms Checkbox */}
        <div className="flex items-start gap-3 pt-2">
          <Checkbox
            id="terms"
            checked={agreesToTerms}
            onCheckedChange={(checked) => setAgreesToTerms(checked === true)}
            disabled={status !== "idle"}
          />
          <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
            I agree to the Artist Terms of Service and confirm I own all rights to this music.
          </Label>
        </div>

        {/* Upload Progress/Status */}
        {status !== "idle" && status !== "error" && !uploadResult && (
          <GlowCard className="p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm font-medium">{getStatusMessage()}</span>
            </div>
          </GlowCard>
        )}

        {/* Success - Show URL */}
        {status === "success" && uploadResult && (
          <GlowCard className="p-4 border-green-500/50">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-green-500">Cover uploaded successfully!</span>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Cover URL:</Label>
                <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-x-auto break-all">
                  {uploadResult.coverUrl}
                </pre>
              </div>
              <Button variant="secondary" size="sm" onClick={handleRetry}>
                Upload Another
              </Button>
            </div>
          </GlowCard>
        )}

        {/* Error Display */}
        {status === "error" && error && (
          <GlowCard className="p-4 border-destructive/50">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-destructive">
                    Failed at: {error.step}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
                </div>
              </div>
              {error.details && (
                <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-x-auto max-h-40">
                  {error.details}
                </pre>
              )}
              <Button variant="secondary" size="sm" onClick={handleRetry}>
                Try Again
              </Button>
            </div>
          </GlowCard>
        )}

        {/* Test Button */}
        <Button
          className="w-full"
          size="lg"
          disabled={!isFormValid || status !== "idle"}
          onClick={handlePublish}
        >
          {status === "uploading_cover" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Uploading Cover...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Test Cover Upload
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ArtistUpload;
