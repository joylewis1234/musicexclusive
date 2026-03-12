import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { AvatarCropper } from "@/components/artist/AvatarCropper";
import { getAuthedUserOrFail, withTimeout } from "@/utils/authHelpers";
import {
  ChevronLeft,
  Camera,
  Instagram,
  Youtube,
  Loader2,
  Save,
  User,
  RefreshCw,
  AlertCircle,
  
  Crown,
  LogOut,
} from "lucide-react";

import { ARTIST_GENRES } from "@/data/genres";
const GENRES = ARTIST_GENRES;

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <span className={className} style={{ display: "inline-flex" }}>
    <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  </span>
);

// X (Twitter) icon component
const XIcon = ({ className }: { className?: string }) => (
  <span className={className} style={{ display: "inline-flex" }}>
    <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  </span>
);

const EditArtistProfile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [artistProfileId, setArtistProfileId] = useState<string | null>(null);

  // Form fields
  const [artistName, setArtistName] = useState("");
  const [bio, setBio] = useState("");
  const [genre, setGenre] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [countryCode, setCountryCode] = useState("");

  // Cropper state – raw file before crop
  const [cropFile, setCropFile] = useState<File | null>(null);

  // Hook for avatar upload
  const avatarUploader = useAvatarUpload({ userId });

  const fetchProfile = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    setIsLoading(true);
    setLoadError(null);

    try {
      const authResult = await withTimeout(getAuthedUserOrFail(signal), 10000);

      if (authResult.ok === false) {
        setLoadError(authResult.error);
        toast.error(authResult.error);
        return;
      }

      const { user } = authResult;
      setUserId(user.id);

      if (signal.aborted) return;

      const { data: profile, error: profileError } = await supabase
        .from("artist_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (signal.aborted) return;

      if (profileError) {
        console.error("[EditProfile] Error fetching profile:", profileError);
        setLoadError(profileError.message);
        toast.error("Could not load profile: " + profileError.message);
        return;
      }

      if (profile) {
        setHasExistingProfile(true);
        setArtistProfileId(profile.id);
        setArtistName(profile.artist_name || "");
        setBio(profile.bio || "");
        setGenre(profile.genre || "");
        setAvatarUrl(profile.avatar_url || "");
        setInstagramUrl(profile.instagram_url || "");
        setTiktokUrl(profile.tiktok_url || "");
        setYoutubeUrl(profile.youtube_url || "");
        setTwitterUrl(profile.twitter_url || "");
        setCountryCode(profile.country_code || "");
      } else {
        const { data: app } = await supabase
          .from("artist_applications")
          .select("artist_name, genres")
          .eq("contact_email", user.email)
          .maybeSingle();

        if (signal.aborted) return;

        const defaultName = app?.artist_name || "";
        const defaultGenre = app?.genres || "";

        const { data: newProfile, error: upsertError } = await supabase
          .from("artist_profiles")
          .upsert(
            {
              user_id: user.id,
              artist_name: defaultName || "New Artist",
            },
            { onConflict: "user_id" }
          )
          .select()
          .single();

        if (signal.aborted) return;

        if (upsertError) {
          console.error("[EditProfile] Upsert error:", upsertError);
          setLoadError(upsertError.message);
          toast.error("Could not create profile: " + upsertError.message);
          return;
        }

        setHasExistingProfile(true);
        if (newProfile?.id) setArtistProfileId(newProfile.id);
        setArtistName(newProfile?.artist_name || defaultName);
        setGenre(defaultGenre);
      }
    } catch (err: any) {
      if (err?.name === "AbortError" || signal.aborted) return;
      console.error("[EditProfile] Fetch error:", err);
      const msg = err?.message || "Could not load profile data";
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();

    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [fetchProfile]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Open cropper instead of processing immediately
    setCropFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCropConfirm = async (croppedFile: File) => {
    setCropFile(null);
    const processResult = await avatarUploader.processImage(croppedFile);
    if (!processResult.ok) {
      toast.error(
        (processResult as { ok: false; error: { message: string } }).error.message
      );
    }
  };

  const handleCropCancel = () => {
    setCropFile(null);
  };

  const handleUploadProcessed = async () => {
    const result = await avatarUploader.uploadAvatar();
    if (result.ok) {
      setAvatarUrl(result.url);
      toast.success("Profile image updated!");
    } else {
      toast.error(
        (result as { ok: false; error: { message: string } }).error.message
      );
    }
  };

  const handleCancelProcessed = () => {
    avatarUploader.clearProcessedImage();
  };

  const handleSave = async () => {
    if (!userId) {
      toast.error("You must be logged in to save");
      return;
    }
    if (!artistName.trim()) {
      toast.error("Artist name is required");
      return;
    }

    setIsSaving(true);
    try {
      const profileData = {
        artist_name: artistName.trim(),
        bio: bio.trim() || null,
        genre: genre || null,
        avatar_url: avatarUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        tiktok_url: tiktokUrl.trim() || null,
        youtube_url: youtubeUrl.trim() || null,
        twitter_url: twitterUrl.trim() || null,
        country_code: countryCode.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (hasExistingProfile) {
        const { error } = await supabase
          .from("artist_profiles")
          .update(profileData)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("artist_profiles")
          .insert({ user_id: userId, ...profileData });
        if (error) throw error;
        setHasExistingProfile(true);
      }

      toast.success("Profile saved successfully!");
      navigate("/artist/dashboard");
    } catch (err: any) {
      console.error("[EditProfile] Save error:", err);
      toast.error(err?.message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  // Error state
  if (loadError && !isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="p-8 max-w-sm w-full text-center rounded-2xl bg-card/50 border border-border/30">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="font-display text-lg font-semibold mb-2">
            {loadError === "Please sign in again" ? "Session Expired" : "Load Error"}
          </h2>
          <p className="text-muted-foreground text-sm mb-6">{loadError}</p>

          {loadError === "Please sign in again" ? (
            <Button onClick={() => navigate("/artist/login")} className="w-full rounded-full">
              Go to Login
            </Button>
          ) : (
            <Button onClick={fetchProfile} className="w-full gap-2 rounded-full">
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'hsl(280, 80%, 70%)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Floating Header */}
      <header className="fixed top-0 left-0 right-0 z-30 px-4 py-4">
        <div className="w-full max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/artist/dashboard")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-background/80 backdrop-blur-md border border-border/50 text-foreground/80 hover:text-foreground hover:bg-background/90 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Title badge */}
            <div 
              className="relative px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-md border border-border/50"
            >
              <span className="text-sm font-display uppercase tracking-wider text-foreground/80">
                Edit Profile
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}
              className="rounded-full bg-background/80 backdrop-blur-md border border-border/50 text-muted-foreground hover:text-foreground gap-1.5 px-3"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative pt-24 pb-6 px-5">
        <div className="w-full max-w-lg mx-auto text-center">
          {/* Avatar with glow */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={handleImageSelect}
            className="hidden"
          />

          {/* Cropper overlay – shown when a file is selected for cropping */}
          {cropFile ? (
            <div className="mb-4">
              <AvatarCropper
                imageFile={cropFile}
                onCrop={handleCropConfirm}
                onCancel={handleCropCancel}
              />
            </div>
          ) : (
            <>
              <div data-tutorial="avatar-upload" className="relative inline-block mb-4">
                <div className="relative w-28 h-28">
                  <div 
                    className="absolute -inset-1 rounded-full blur-sm"
                    style={{ 
                      background: 'linear-gradient(135deg, hsl(280, 80%, 50%), hsl(45, 90%, 55%))' 
                    }}
                  />
                  <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-background bg-muted/20">
                    {avatarUploader.processedImage?.previewUrl ? (
                      <img
                        src={avatarUploader.processedImage.previewUrl}
                        alt="Processed preview"
                        className="w-full h-full object-cover"
                      />
                    ) : avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Artist avatar"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {avatarUploader.isProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'hsl(280, 80%, 70%)' }} />
                    </div>
                  )}

                  {!avatarUploader.processedImage && !avatarUploader.isProcessing && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarUploader.isUploading}
                      className="absolute bottom-0 right-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
                      style={{
                        background: 'hsl(280, 80%, 50%)',
                        boxShadow: '0 0 12px hsla(280, 80%, 50%, 0.5)',
                      }}
                    >
                      {avatarUploader.isUploading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                      ) : (
                        <Camera className="w-5 h-5 text-white" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Compression info */}
              {avatarUploader.processedImage && avatarUploader.lastMeta?.compression && (
                <div className="mb-4 text-xs text-muted-foreground">
                  <p>
                    Compressed:{" "}
                    {avatarUploader.formatFileSize(avatarUploader.lastMeta.compression.originalSize)}
                    {" → "}
                    {avatarUploader.formatFileSize(avatarUploader.lastMeta.compression.compressedSize)}
                    <span className="ml-1" style={{ color: 'hsl(280, 80%, 70%)' }}>
                      ({avatarUploader.lastMeta.compression.ratio} saved)
                    </span>
                  </p>
                </div>
              )}

              {/* Confirm/Cancel for processed image */}
              {avatarUploader.processedImage && (
                <div className="flex gap-3 justify-center mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelProcessed}
                    disabled={avatarUploader.isUploading}
                    className="rounded-full"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleUploadProcessed}
                    disabled={avatarUploader.isUploading}
                    className="rounded-full"
                    style={{ background: 'hsl(280, 80%, 50%)' }}
                  >
                    {avatarUploader.isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Uploading...
                      </>
                    ) : (
                      "Upload Photo"
                    )}
                  </Button>
                </div>
              )}

              {!avatarUploader.processedImage && (
                <p className="text-muted-foreground text-xs">
                  Tap to select your artist photo
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="px-5 pb-12">
        <div className="w-full max-w-lg mx-auto space-y-6">
          
          {/* Basic Info Section */}
          <section className="animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-display text-sm uppercase tracking-widest" style={{ color: 'hsl(280, 80%, 70%)' }}>
                Basic Info
              </h3>
            </div>

            <div 
              className="p-5 rounded-2xl space-y-4"
              style={{
                background: 'hsla(0, 0%, 100%, 0.02)',
                border: '1px solid hsla(280, 80%, 50%, 0.15)',
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="artist-name">Artist Name *</Label>
                <Input
                  id="artist-name"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder="Your artist name"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Primary Genre</Label>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger className="h-11 bg-background rounded-xl">
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    {GENRES.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
              </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country-code">{countryCode ? `${countryCode.toUpperCase().split("").map((ch) => String.fromCodePoint(127397 + ch.charCodeAt(0))).join("")} ` : ""}Country (for Charts)</Label>
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="h-11 bg-background rounded-xl">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50 max-h-60">
                    {[
                      { code: "US", name: "United States" },
                      { code: "GB", name: "United Kingdom" },
                      { code: "CA", name: "Canada" },
                      { code: "AU", name: "Australia" },
                      { code: "NG", name: "Nigeria" },
                      { code: "GH", name: "Ghana" },
                      { code: "ZA", name: "South Africa" },
                      { code: "KE", name: "Kenya" },
                      { code: "JM", name: "Jamaica" },
                      { code: "MX", name: "Mexico" },
                      { code: "BR", name: "Brazil" },
                      { code: "CO", name: "Colombia" },
                      { code: "AR", name: "Argentina" },
                      { code: "DE", name: "Germany" },
                      { code: "FR", name: "France" },
                      { code: "ES", name: "Spain" },
                      { code: "IT", name: "Italy" },
                      { code: "NL", name: "Netherlands" },
                      { code: "SE", name: "Sweden" },
                      { code: "JP", name: "Japan" },
                      { code: "KR", name: "South Korea" },
                      { code: "IN", name: "India" },
                      { code: "PH", name: "Philippines" },
                      { code: "PR", name: "Puerto Rico" },
                      { code: "TT", name: "Trinidad & Tobago" },
                    ].map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code.toUpperCase().split("").map((ch) => String.fromCodePoint(127397 + ch.charCodeAt(0))).join("")} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 500))}
                  placeholder="Tell fans about yourself and your music..."
                  className="min-h-[120px] resize-none rounded-xl"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {bio.length}/500
                </p>
              </div>
            </div>
          </section>

          {/* Social Links Section */}
          <section className="animate-fade-in" style={{ animationDelay: '50ms' }}>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-display text-sm uppercase tracking-widest" style={{ color: 'hsl(280, 80%, 70%)' }}>
                Social Links
              </h3>
            </div>

            <div 
              className="p-5 rounded-2xl space-y-4"
              style={{
                background: 'hsla(0, 0%, 100%, 0.02)',
                border: '1px solid hsla(280, 80%, 50%, 0.15)',
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="instagram" className="flex items-center gap-2">
                  <Instagram className="w-4 h-4" />
                  Instagram
                </Label>
                <Input
                  id="instagram"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/yourhandle"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tiktok" className="flex items-center gap-2">
                  <TikTokIcon className="w-4 h-4" />
                  TikTok
                </Label>
                <Input
                  id="tiktok"
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  placeholder="https://tiktok.com/@yourhandle"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="youtube" className="flex items-center gap-2">
                  <Youtube className="w-4 h-4" />
                  YouTube
                </Label>
                <Input
                  id="youtube"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/@yourchannel"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter" className="flex items-center gap-2">
                  <XIcon className="w-4 h-4" />
                  X (Twitter)
                </Label>
                <Input
                  id="twitter"
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                  placeholder="https://x.com/yourhandle"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
          </section>


          {/* Save Button */}
          <Button
            size="lg"
            className="w-full h-14 rounded-full animate-fade-in"
            style={{ 
              animationDelay: '150ms',
              background: 'hsl(280, 80%, 50%)',
              boxShadow: '0 0 20px hsla(280, 80%, 50%, 0.4)',
            }}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Save Profile
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default EditArtistProfile;
