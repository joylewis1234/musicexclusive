import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  Music,
  ImageIcon,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trash2,
  Info,
  RotateCcw,
  CircleUser,
  LogOut,
} from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTrackUpload, UPLOAD_HOOK_VERSION } from "@/hooks/useTrackUpload";
import { useArtistAgreement } from "@/hooks/useArtistAgreement";
import { useUploadDraft } from "@/hooks/useUploadDraft";
import { useArtistProfile } from "@/hooks/useArtistProfile";
import { UploadDiagnosticsPanel } from "@/components/artist/UploadDiagnosticsPanel";
import { UploadProgressBar } from "@/components/artist/UploadProgressBar";
import { UploadDebugConsole } from "@/components/artist/UploadDebugConsole";
import { UploadErrorBoundary } from "@/components/artist/UploadErrorBoundary";
import { PreviewTimeSelector } from "@/components/artist/PreviewTimeSelector";
import { getAudioDuration } from "@/utils/audioDuration";
import {
  SAFE_UPLOADS,
  processCoverArt,
  validateAudio,
  formatBytes,
  type AudioMeta,
} from "@/utils/uploadHelpers";

/* ------------------------------------------------------------------ */
/*  Legacy fallback (SAFE_UPLOADS = false)                             */
/* ------------------------------------------------------------------ */
import { validateCoverImage } from "@/utils/imageProcessing";

function legacyValidateAudio(file: File): string | null {
  const validExtensions = ["mp3", "wav"];
  const validTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/wave", "audio/x-wav"];
  const maxSize = 50 * 1024 * 1024;
  const ext = file?.name?.split(".")?.pop()?.toLowerCase() || "";
  const mime = file?.type?.toLowerCase() || "";
  const isValid = (ext && validExtensions.includes(ext)) || (mime && validTypes.includes(mime));
  if (!isValid) return "Invalid format. Please upload an MP3 or WAV file.";
  if (file?.size > maxSize) return "Audio file too large. Please upload a file under 50MB.";
  return null;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const GENRES = [
  "Hip-Hop", "R&B", "Pop", "Rock", "Electronic", "Country",
  "Latin", "Jazz", "Classical", "Indie", "Alternative", "Soul",
  "Funk", "Reggae", "Other",
];

/* ------------------------------------------------------------------ */
/*  Inner form component (wrapped by error boundary)                    */
/* ------------------------------------------------------------------ */

interface ArtistUploadFormProps {
  /** Ref the parent uses to call our reset function from the error boundary */
  resetRef: React.MutableRefObject<(() => void) | null>;
}

function ArtistUploadForm({ resetRef }: ArtistUploadFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { state: uploadState, upload, retry, reset: resetUpload } = useTrackUpload();
  const { hasAccepted, isLoading: isCheckingAgreement } = useArtistAgreement();
  const { draft, loaded: draftLoaded, hasDraft, updateDraft, clearDraft } = useUploadDraft(user?.id);
  const { artistProfile } = useArtistProfile();

  // ── Hard-reset escape hatch (?resetUpload=1) ──────────────────────
  // If the URL contains ?resetUpload=1, wipe all upload drafts and
  // in-memory state on first mount, then strip the param from the URL.
  const [hardResetDone, setHardResetDone] = useState(false);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("resetUpload") === "1") {
        // Wipe all upload draft localStorage keys
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("upload_draft_")) {
            localStorage.removeItem(key);
          }
        });
        // Strip the query param so it doesn't persist
        params.delete("resetUpload");
        const newUrl =
          window.location.pathname +
          (params.toString() ? `?${params.toString()}` : "") +
          window.location.hash;
        window.history.replaceState({}, "", newUrl);
        // Signal that we should clear in-memory state after this effect
        setHardResetDone(true);
      }
    } catch {
      // Ignore – safety net
    }
  }, []);

  // --- Form state (synced from draft on load) ---
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [agreesToTerms, setAgreesToTerms] = useState(false);

  // --- Cover state ---
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverMeta, setCoverMeta] = useState<{ name: string; processedSize: number; type: string; width: number; height: number } | null>(null);
  const [coverProcessing, setCoverProcessing] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);

  // Track whether coverPreview is a blob: URL so we know to revoke it
  const coverObjectUrlRef = useRef<string | null>(null);

  // --- Audio state (ref for the blob, meta in state) ---
  const audioFileRef = useRef<File | null>(null);
  // Reactive flag so isFormValid re-evaluates when file is set (refs don't trigger renders)
  const [hasAudioFile, setHasAudioFile] = useState(false);
  const [audioMeta, setAudioMeta] = useState<AudioMeta | null>(null);
  const [audioValidating, setAudioValidating] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // --- Preview segment state (select 15s from uploaded track) ---
  const [previewStartSeconds, setPreviewStartSeconds] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioObjectUrl, setAudioObjectUrl] = useState<string | null>(null);
  // Mirror ref to avoid stale closures in callbacks without adding state deps
  const audioObjectUrlRef = useRef<string | null>(null);

  // --- UI state ---
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // --- Refs ---
  const coverInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  /* ---------------------------------------------------------------- */
  /*  Core reset function                                               */
  /* ---------------------------------------------------------------- */

  /** Safely revoke the previous cover object URL if one exists */
  const revokePreviousCoverUrl = useCallback(() => {
    if (coverObjectUrlRef.current) {
      URL.revokeObjectURL(coverObjectUrlRef.current);
      coverObjectUrlRef.current = null;
    }
  }, []);

  /**
   * Master reset – clears all runtime state.
   * @param clearDraft  if true, also removes the localStorage draft
   */
  const resetUploadForm = useCallback(
    ({ clearDraft: shouldClearDraft }: { clearDraft: boolean }) => {
      // Text fields
      setTitle("");
      setGenre("");
      setAgreesToTerms(false);

      // Cover
      setCoverFile(null);
      revokePreviousCoverUrl();
      setCoverPreview(null);
      setCoverMeta(null);
      setCoverError(null);
      setCoverProcessing(false);

      // Audio
      audioFileRef.current = null;
      setHasAudioFile(false);
      setAudioMeta(null);
      setAudioError(null);
      setAudioValidating(false);

      // Preview segment
      setPreviewStartSeconds(0);
      setAudioDuration(0);
      if (audioObjectUrlRef.current) URL.revokeObjectURL(audioObjectUrlRef.current);
      audioObjectUrlRef.current = null;
      setAudioObjectUrl(null);

      // Upload hook state
      resetUpload();
      setShowDiagnostics(false);
      setShowClearConfirm(false);

      // Draft
      if (shouldClearDraft) {
        clearDraft();
      }
    },
    [clearDraft, resetUpload, revokePreviousCoverUrl],
  );

  // Expose resetUploadForm to the parent (error boundary)
  useEffect(() => {
    resetRef.current = () => resetUploadForm({ clearDraft: true });
    return () => { resetRef.current = null; };
  }, [resetRef, resetUploadForm]);

  // --- Cleanup blob URLs on unmount ---
  useEffect(() => {
    return () => {
      revokePreviousCoverUrl();
      // audioObjectUrl cleanup handled by resetUploadForm
    };
  }, [revokePreviousCoverUrl]);

  // --- If hard-reset was triggered, wipe in-memory state ---
  useEffect(() => {
    if (hardResetDone) {
      resetUploadForm({ clearDraft: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hardResetDone]);

  // --- Hydrate form from draft once (defensive null-guards) ---
  useEffect(() => {
    if (!draftLoaded || hardResetDone) return;
    try {
      setTitle(typeof draft.title === "string" ? draft.title : "");
      setGenre(typeof draft.genre === "string" ? draft.genre : "");
      setAgreesToTerms(typeof draft.agreementChecked === "boolean" ? draft.agreementChecked : false);
      if (typeof draft.coverPreview === "string" && draft.coverPreview) setCoverPreview(draft.coverPreview);
      if (draft.coverMeta && typeof draft.coverMeta === "object") setCoverMeta(draft.coverMeta);
      if (draft.audioMeta && typeof draft.audioMeta === "object") setAudioMeta(draft.audioMeta);
    } catch (err) {
      console.error("[ArtistUpload] Draft hydration failed – clearing draft:", err);
      clearDraft();
    }
    // Explicitly ensure no stale errors on hydration
    setCoverError(null);
    setAudioError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftLoaded]);

  // --- Persist text fields on change ---
  useEffect(() => {
    if (!draftLoaded) return;
    updateDraft({ title, genre, agreementChecked: agreesToTerms });
  }, [title, genre, agreesToTerms, draftLoaded, updateDraft]);

  // --- Navigation guard (beforeunload only – useBlocker requires data router) ---
  useEffect(() => {
    if (!hasDraft || uploadState.step === "success") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasDraft, uploadState.step]);

  // --- Auto-show diagnostics when upload errors occur ---
  useEffect(() => {
    if (uploadState.step === "error") {
      setShowDiagnostics(true);
    }
  }, [uploadState.step]);

  // --- On success: full reset + redirect to dashboard ---
  useEffect(() => {
    if (uploadState.step === "success") {
      toast({
        title: "Track published successfully!",
        description: "Redirecting to your dashboard…",
      });
      resetUploadForm({ clearDraft: true });
      navigate("/artist/dashboard");
    }
  }, [uploadState.step, navigate, toast, resetUploadForm]);

  // --- Redirect if agreement not accepted ---
  useEffect(() => {
    if (!isCheckingAgreement && hasAccepted === false) {
      navigate("/artist/agreement-accept", { replace: true });
    }
  }, [hasAccepted, isCheckingAgreement, navigate]);

  // --- Derived (fully null-safe) ---
  const isUploading = uploadState?.step ? ["session_check", "cover_upload", "audio_upload", "db_insert", "db_update"].includes(uploadState.step) : false;
  const safeTitle = typeof title === "string" ? title : "";
  const safeGenre = typeof genre === "string" ? genre : "";
  const isFormValid = !!(safeTitle.trim() && safeGenre && coverFile && hasAudioFile && agreesToTerms);

  // --- Loading ---
  if (isCheckingAgreement) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */

  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = ""; // allow re-selecting same file
    if (!file) return;

    // Clear any prior errors (cover + upload-level)
    setCoverError(null);
    if (uploadState.step === "error") resetUpload();

    if (!SAFE_UPLOADS) {
      // --- Legacy path ---
      try {
        const err = validateCoverImage(file);
        if (err) { setCoverError(err); return; }
        revokePreviousCoverUrl();
        const objectUrl = URL.createObjectURL(file);
        coverObjectUrlRef.current = objectUrl;
        setCoverFile(file);
        setCoverPreview(objectUrl);
        setCoverMeta({ name: file.name, processedSize: file.size, type: file.type, width: 0, height: 0 });
        updateDraft({ coverMeta: { name: file.name, processedSize: file.size, type: file.type, width: 0, height: 0 }, coverPreview: null });
      } catch (err: any) {
        console.error("[Upload] Legacy cover error:", { fileName: file.name, fileType: file.type, fileSize: file.size, error: err });
        setCoverError(err?.message || "We couldn't process that file. Please try a different image.");
      }
      return;
    }

    // --- Safe path ---
    setCoverProcessing(true);
    try {
      const result = await processCoverArt(file);

      // Revoke old URL before setting new one
      revokePreviousCoverUrl();
      coverObjectUrlRef.current = result.objectUrl;

      setCoverFile(result.file);
      setCoverPreview(result.objectUrl);
      setCoverMeta(result.meta);

      // Persist tiny base64 to localStorage (may be null – that's fine)
      updateDraft({ coverPreview: result.localStoragePreview, coverMeta: result.meta });
    } catch (err: any) {
      console.error("[Upload] Cover processing error:", { fileName: file.name, fileType: file.type, fileSize: file.size, error: err });
      setCoverError(err?.message || "We couldn't process that file. Please try a different image.");
      setCoverFile(null);
      revokePreviousCoverUrl();
      setCoverPreview(null);
      setCoverMeta(null);
    } finally {
      setCoverProcessing(false);
    }
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;

    // Clear any prior errors (audio + upload-level)
    setAudioError(null);
    if (uploadState.step === "error") resetUpload();

    setAudioValidating(true);

    try {
      if (!SAFE_UPLOADS) {
        const err = legacyValidateAudio(file);
        if (err) { setAudioError(err); setAudioValidating(false); return; }
        audioFileRef.current = file;
        setHasAudioFile(true);
        const meta: AudioMeta = { name: file.name, size: file.size, type: file.type || "audio/mpeg", isWav: false };
        setAudioMeta(meta);
        updateDraft({ audioMeta: meta });
        setAudioValidating(false);
        handleAudioFileReady(file);
        return;
      }

      const meta = validateAudio(file);
      audioFileRef.current = file;
      setHasAudioFile(true);
      setAudioMeta(meta);
      updateDraft({ audioMeta: meta });
      handleAudioFileReady(file);

      if (meta.isWav && file.size > 20 * 1024 * 1024) {
        setAudioError("WAV files may fail on mobile. Consider uploading an MP3 instead.");
        // Still allow – it's a warning, not a block.
      }
    } catch (err: any) {
      console.error("[Upload] Audio validation error:", { fileName: file.name, fileType: file.type, fileSize: file.size, error: err });
      setAudioError(err?.message || "We couldn't process that file. Please try a different audio file.");
      audioFileRef.current = null;
      setHasAudioFile(false);
      setAudioMeta(null);
    } finally {
      setAudioValidating(false);
    }
  };

  // When audio file is selected, detect duration and create object URL for preview selector
  // Plain function (NOT useCallback) to avoid Rules of Hooks violation — this is
  // defined after an early return and its identity doesn't need to be stable.
  const handleAudioFileReady = async (file: File) => {
    // Revoke previous blob URL via ref (no state dependency needed)
    if (audioObjectUrlRef.current) URL.revokeObjectURL(audioObjectUrlRef.current);
    const url = URL.createObjectURL(file);
    audioObjectUrlRef.current = url;
    setAudioObjectUrl(url);

    // Detect duration
    try {
      const dur = await getAudioDuration(file);
      setAudioDuration(dur);
      // Reset preview start if it's beyond the new track
      setPreviewStartSeconds((prev) => Math.min(prev, Math.max(0, dur - 15)));
    } catch {
      setAudioDuration(180); // fallback
    }
  };

  /** Clear upload-level errors when the user edits text fields */
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (uploadState.step === "error") resetUpload();
  };

  const handleGenreChange = (val: string) => {
    setGenre(val);
    if (uploadState.step === "error") resetUpload();
  };

  const handleAgreementChange = (checked: boolean) => {
    setAgreesToTerms(checked);
    if (uploadState.step === "error") resetUpload();
  };

   const handlePublish = async () => {
    const missingFields: string[] = [];
    if (!safeTitle.trim()) missingFields.push("Track Title");
    if (!safeGenre) missingFields.push("Genre");
    if (!coverFile) missingFields.push("Cover Art");
    if (!audioFileRef.current) missingFields.push("Full Audio File");
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
        title: safeTitle,
        genre: safeGenre,
        coverFile: coverFile!,
        audioFile: audioFileRef.current!,
        previewStartSeconds,
        userId: user.id,
      });
    } catch (err) {
      console.error("[Upload] Publish error:", err);
    }
  };

  const handleRetry = () => {
    if (!user?.id || !coverFile || !audioFileRef.current) return;
    setShowDiagnostics(true);
    retry({
      title: safeTitle,
      genre: safeGenre,
      coverFile,
      audioFile: audioFileRef.current,
      previewStartSeconds,
      userId: user.id,
    }).catch((err) => console.error("[Upload] Retry error:", err));
  };

  /** "Start Over" in the upload-error card – keeps fields, just resets upload state */
  const handleResetUploadState = () => {
    resetUpload();
    setShowDiagnostics(false);
  };

  /** "Start New Upload" – full wipe including draft */
  const handleStartNewUpload = () => {
    resetUploadForm({ clearDraft: true });
  };

  /** "Clear draft" confirm dialog callback */
  const handleClearDraft = () => {
    resetUploadForm({ clearDraft: true });
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/artist/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-semibold tracking-wide">Upload Exclusive Track</h1>
            <p className="text-[10px] text-muted-foreground font-mono">{UPLOAD_HOOK_VERSION}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Start New Upload – visible when there's any content or error */}
            {(hasDraft || uploadState.step === "error" || uploadState.step === "success") && !isUploading && (
              <Button variant="outline" size="sm" onClick={handleStartNewUpload}>
                <RotateCcw className="h-4 w-4 mr-1" />
                New Upload
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}
              className="text-muted-foreground hover:text-foreground"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        {/* Track Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Track Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Enter track title"
            maxLength={100}
            disabled={isUploading}
          />
        </div>

        {/* Genre */}
        <div className="space-y-2">
          <Label>Genre *</Label>
          <Select value={genre} onValueChange={handleGenreChange} disabled={isUploading}>
            <SelectTrigger>
              <SelectValue placeholder="Select genre" />
            </SelectTrigger>
            <SelectContent>
              {GENRES.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cover Art */}
        <div className="space-y-2">
          <Label>Cover Art * (JPG, PNG, or WEBP{SAFE_UPLOADS ? " — auto-compressed" : ", max 10MB"})</Label>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            onChange={handleCoverSelect}
            className="hidden"
            disabled={isUploading || coverProcessing}
          />
          <GlowCard
            className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => !isUploading && !coverProcessing && coverInputRef.current?.click()}
          >
            {coverProcessing ? (
              <div className="flex items-center justify-center gap-3 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Processing image…</span>
              </div>
            ) : coverPreview && (coverFile || coverMeta) ? (
              <div className="flex items-center gap-4">
                <img
                  src={coverPreview}
                  alt="Cover"
                  className="w-16 h-16 rounded-lg object-cover"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{coverMeta?.name || "cover"}</p>
                  <p className="text-xs text-muted-foreground">
                    {coverMeta ? `${formatBytes(coverMeta.processedSize)}` : ""}
                    {coverMeta?.width ? ` · ${coverMeta.width}×${coverMeta.height}` : ""}
                  </p>
                  {!coverFile && coverMeta && (
                    <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Please re-select this image to upload
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
                <ImageIcon className="h-8 w-8" />
                <span className="text-sm">Tap to select cover art</span>
              </div>
            )}
          </GlowCard>
          {coverError && (
            <p className="text-xs text-destructive flex items-center gap-1 mt-1">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {coverError}
            </p>
          )}
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
            disabled={isUploading || audioValidating}
          />
          <GlowCard
            className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => !isUploading && !audioValidating && audioInputRef.current?.click()}
          >
            {audioValidating ? (
              <div className="flex items-center justify-center gap-3 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Validating audio…</span>
              </div>
            ) : audioMeta ? (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Music className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{audioMeta.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(audioMeta.size)}
                    {audioMeta.isWav ? " · WAV" : " · MP3"}
                  </p>
                  {!audioFileRef.current && audioMeta && (
                    <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Please re-select this file to upload
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
                <Music className="h-8 w-8" />
                <span className="text-sm">Tap to select audio file</span>
              </div>
            )}
          </GlowCard>
          {audioError && (
            <p className="text-xs text-amber-500 flex items-center gap-1 mt-1">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {audioError}
            </p>
          )}
        </div>

        {/* 15-Second Hook Preview Selector */}
        {audioFileRef.current && audioDuration > 0 && (
          <div className="space-y-2">
            <Label>15-Second Hook Preview</Label>
            <p className="text-xs text-muted-foreground -mt-1">
              Select which 15-second section fans will hear on Discovery.
            </p>
            <GlowCard className="p-4">
              <PreviewTimeSelector
                audioUrl={audioObjectUrl}
                audioDuration={audioDuration}
                previewStartSeconds={previewStartSeconds}
                onPreviewStartChange={setPreviewStartSeconds}
              />
            </GlowCard>
          </div>
        )}


        {/* Artist Profile Photo Status */}
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-muted/30">
          <CircleUser className="h-5 w-5 text-muted-foreground shrink-0" />
          {artistProfile?.avatar_url ? (
            <div className="flex items-center gap-2">
              <img src={artistProfile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              <span className="text-sm text-muted-foreground">Profile photo set</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">
              No profile photo yet —{" "}
              <Link to="/artist/profile/edit" className="text-primary hover:underline">
                add one in Profile Settings
              </Link>
            </span>
          )}
        </div>

        {/* Terms Checkbox */}
        <div className="flex items-start gap-3 pt-2">
          <Checkbox
            id="terms"
            checked={agreesToTerms}
            onCheckedChange={(checked) => handleAgreementChange(checked === true)}
            disabled={isUploading}
          />
          <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
            I confirm I own all rights to this music and agree to the{" "}
            <Link to="/artist-agreement" target="_blank" className="text-primary hover:underline">
              Artist Participation Agreement
            </Link>
            .
          </Label>
        </div>

        {/* Upload Progress */}
        {uploadState.step !== "idle" && uploadState.step !== "error" && uploadState.step !== "success" && (
          <GlowCard className="p-4">
            <UploadProgressBar
              step={uploadState.step}
              progress={uploadState.progress}
              isTimedOut={uploadState.isTimedOut}
            />
            {/* Keep-awake warning for mobile */}
            <div className="mt-3 p-2 rounded bg-amber-500/10 border border-amber-500/30">
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                📱 Keep your screen awake during upload. Don't switch apps or lock your device.
              </p>
            </div>
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
                <p className="text-sm text-muted-foreground mt-1 select-all break-words">{uploadState.errorMessage}</p>
                {uploadState.lastFailedStep && (
                  <p className="text-xs text-muted-foreground mt-1 font-mono select-all">
                    Failed at: {uploadState.lastFailedStep} | {UPLOAD_HOOK_VERSION}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="default" size="sm" onClick={handleRetry}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry Upload
              </Button>
              <Button variant="outline" size="sm" onClick={handleResetUploadState}>
                Start Over
              </Button>
            </div>
          </GlowCard>
        )}

        {/* Diagnostics Panel Toggle */}
        {(uploadState?.diagnostics?.length ?? 0) > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="w-full flex items-center justify-center gap-2 text-muted-foreground"
          >
            {showDiagnostics ? (
              <><ChevronUp className="h-4 w-4" />Hide Diagnostics</>
            ) : (
              <><ChevronDown className="h-4 w-4" />Show Diagnostics</>
            )}
          </Button>
        )}

        {/* Diagnostics Panel */}
        <UploadDiagnosticsPanel
          diagnostics={uploadState?.diagnostics ?? []}
          isVisible={showDiagnostics}
          isTimedOut={uploadState?.isTimedOut ?? false}
        />

        {/* Upload Debug Console */}
        <UploadDebugConsole />

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

        {/* Clear Draft Button */}
        {hasDraft && !isUploading && uploadState.step !== "success" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowClearConfirm(true)}
            className="w-full text-muted-foreground"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear draft
          </Button>
        )}
      </div>

      {/* Clear Draft Confirmation */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all saved form data including selected files. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearDraft}>Clear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page export – wrapped in the local error boundary                   */
/* ------------------------------------------------------------------ */

const ArtistUpload = () => {
  const resetFormRef = useRef<(() => void) | null>(null);

  return (
    <UploadErrorBoundary onResetForm={() => resetFormRef.current?.()}>
      <ArtistUploadForm resetRef={resetFormRef} />
    </UploadErrorBoundary>
  );
};

export default ArtistUpload;
