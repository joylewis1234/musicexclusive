import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Home,
  Camera,
  Instagram,
  Youtube,
  Loader2,
  Save,
  User,
} from "lucide-react";

import artist1 from "@/assets/artist-1.jpg";

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
  "Christian",
  "Other",
];

// TikTok icon component - simple span wrapper to avoid ref issues
const TikTokIcon = ({ className }: { className?: string }) => (
  <span className={className} style={{ display: 'inline-flex' }}>
    <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  </span>
);

// X (Twitter) icon component - simple span wrapper to avoid ref issues
const XIcon = ({ className }: { className?: string }) => (
  <span className={className} style={{ display: 'inline-flex' }}>
    <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  </span>
);

const EditArtistProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);

  // Form fields
  const [artistName, setArtistName] = useState("");
  const [bio, setBio] = useState("");
  const [genre, setGenre] = useState("");
  const [avatarPath, setAvatarPath] = useState(""); // Store path, not URL
  const [avatarDisplayUrl, setAvatarDisplayUrl] = useState(""); // For display only
  const [instagramUrl, setInstagramUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  // Helper to generate public URL from storage path
  const getAvatarPublicUrl = (path: string | null): string => {
    if (!path) return "";
    // If it's already a full URL, return as-is (legacy support)
    if (path.startsWith("http")) return path;
    // Generate public URL from path
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        // First check if artist_profiles exists
        const { data: profile, error: profileError } = await supabase
          .from("artist_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("[EditProfile] Error fetching profile:", profileError);
        }

        if (profile) {
          console.log("[EditProfile] Loaded profile:", profile);
          setHasExistingProfile(true);
          setArtistName(profile.artist_name || "");
          setBio(profile.bio || "");
          setGenre(profile.genre || "");
          // Store the path and generate display URL
          setAvatarPath(profile.avatar_url || "");
          setAvatarDisplayUrl(getAvatarPublicUrl(profile.avatar_url));
          setInstagramUrl(profile.instagram_url || "");
          setTiktokUrl(profile.tiktok_url || "");
          setYoutubeUrl(profile.youtube_url || "");
          setTwitterUrl(profile.twitter_url || "");
        } else {
          // Fallback to artist_applications for initial data
          const { data: application } = await supabase
            .from("artist_applications")
            .select("artist_name, genres")
            .eq("contact_email", user.email)
            .maybeSingle();

          if (application) {
            setArtistName(application.artist_name || "");
            setGenre(application.genres || "");
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("Could not load profile data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) {
      console.log("[EditProfile] No file selected or user not logged in");
      return;
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please select a JPG, PNG, or WEBP image");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      console.log("[EditProfile] Uploading avatar via edge function...");
      
      // Get the current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      // Create form data for the upload
      const formData = new FormData();
      formData.append("file", file);

      // Upload via edge function to bypass iframe storage limitations
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-avatar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        console.error("[EditProfile] Upload error:", result);
        throw new Error(result.error || "Upload failed");
      }

      console.log("[EditProfile] Upload successful:", result);

      // Store the path, generate display URL
      setAvatarPath(result.path);
      setAvatarDisplayUrl(getAvatarPublicUrl(result.path));
      
      toast.success("Image uploaded successfully");
    } catch (error: any) {
      console.error("[EditProfile] Error uploading image:", error);
      toast.error(error?.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
      // Reset the input so the same file can be re-selected if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("You must be logged in to save");
      return;
    }

    if (!artistName.trim()) {
      toast.error("Artist name is required");
      return;
    }

    setIsSaving(true);
    console.log("[EditProfile] Saving profile for user:", user.id);
    
    try {
      // Store the path (or full URL for legacy), not regenerate URL
      const avatarToSave = avatarPath || null;
      
      const profileData = {
        user_id: user.id,
        artist_name: artistName.trim(),
        bio: bio.trim() || null,
        genre: genre || null,
        avatar_url: avatarToSave,
        instagram_url: instagramUrl.trim() || null,
        tiktok_url: tiktokUrl.trim() || null,
        youtube_url: youtubeUrl.trim() || null,
        twitter_url: twitterUrl.trim() || null,
        updated_at: new Date().toISOString(),
      };

      console.log("[EditProfile] Saving profile data:", profileData);

      if (hasExistingProfile) {
        console.log("[EditProfile] Updating existing profile...");
        const { error, data } = await supabase
          .from("artist_profiles")
          .update(profileData)
          .eq("user_id", user.id)
          .select();

        if (error) {
          console.error("[EditProfile] Update error:", error);
          throw error;
        }
        console.log("[EditProfile] Update successful:", data);
      } else {
        console.log("[EditProfile] Creating new profile...");
        const { error, data } = await supabase
          .from("artist_profiles")
          .insert(profileData)
          .select();

        if (error) {
          console.error("[EditProfile] Insert error:", error);
          throw error;
        }
        console.log("[EditProfile] Insert successful:", data);
        setHasExistingProfile(true);
      }

      toast.success("Profile saved successfully!");
      navigate("/artist/dashboard");
    } catch (error: any) {
      console.error("[EditProfile] Error saving profile:", error);
      toast.error(error?.message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
            Edit Profile
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
        <div className="container max-w-lg mx-auto space-y-6">
          
          {/* Profile Image Section */}
          <GlowCard className="p-6">
            <div className="text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              {/* Avatar Preview */}
              <div className="relative inline-block mb-4">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-primary/30 bg-muted/20">
                  {avatarDisplayUrl ? (
                    <img
                      src={avatarDisplayUrl}
                      alt="Artist avatar"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.log("[EditProfile] Image load error, clearing display");
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Upload Button Overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary-foreground" />
                  ) : (
                    <Camera className="w-5 h-5 text-primary-foreground" />
                  )}
                </button>
              </div>

              <p className="text-muted-foreground text-xs">
                Tap to upload your artist photo
              </p>
            </div>
          </GlowCard>

          {/* Basic Info Section */}
          <GlowCard className="p-5">
            <h3 className="font-display text-xs uppercase tracking-widest text-primary mb-4 text-center">
              Basic Info
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="artist-name">Artist Name *</Label>
                <Input
                  id="artist-name"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder="Your artist name"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Primary Genre</Label>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger className="h-11 bg-background">
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
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 500))}
                  placeholder="Tell fans about yourself and your music..."
                  className="min-h-[120px] resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {bio.length}/500
                </p>
              </div>
            </div>
          </GlowCard>

          {/* Social Links Section */}
          <GlowCard className="p-5">
            <h3 className="font-display text-xs uppercase tracking-widest text-primary mb-4 text-center">
              Social Links
            </h3>

            <div className="space-y-4">
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
                  className="h-11"
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
                  className="h-11"
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
                  className="h-11"
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
                  className="h-11"
                />
              </div>
            </div>
          </GlowCard>

          {/* Save Button */}
          <Button
            size="lg"
            className="w-full h-14"
            onClick={handleSave}
            disabled={isSaving || !artistName.trim()}
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Save className="w-5 h-5 mr-2" />
            )}
            Save Profile
          </Button>

          <p className="text-center text-muted-foreground text-xs">
            Changes will appear on your Artist Profile and Discovery.
          </p>
        </div>
      </main>
    </div>
  );
};

export default EditArtistProfile;
