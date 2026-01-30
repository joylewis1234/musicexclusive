import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, Home, Play, User, Camera, Pencil, Check, X, Loader2 } from "lucide-react";
import { usePlayer, tracksLibrary } from "@/contexts/PlayerContext";
import { useFanProfile } from "@/hooks/useFanProfile";
import WalletBalanceCard from "@/components/WalletBalanceCard";
import { toast } from "sonner";

import artist1 from "@/assets/artist-1.jpg";
import artist2 from "@/assets/artist-2.jpg";
import artist3 from "@/assets/artist-3.jpg";

const topArtists = [
  { id: "1", name: "NOVA", streams: 47, imageUrl: artist1 },
  { id: "2", name: "AURA", streams: 32, imageUrl: artist2 },
  { id: "3", name: "ECHO", streams: 28, imageUrl: artist3 },
  { id: "1", name: "PULSE", streams: 19, imageUrl: artist1 },
  { id: "2", name: "DRIFT", streams: 12, imageUrl: artist2 },
];

const sharedTracks = [
  { id: "1", artist: "NOVA", track: "Midnight Protocol", sharedBy: "Alex" },
  { id: "2", artist: "AURA", track: "Velvet Skies", sharedBy: "Jordan" },
  { id: "3", artist: "ECHO", track: "Lost Frequency", sharedBy: "Sam" },
];

const FanProfile = () => {
  const navigate = useNavigate();
  const { playTrack } = usePlayer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    profile,
    isLoading,
    isUploading,
    isProcessing,
    isSaving,
    processedImage,
    processImage,
    uploadAvatar,
    updateDisplayName,
    clearProcessedImage,
  } = useFanProfile();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  const handlePlayTrack = (trackId: string) => {
    const track = tracksLibrary[trackId];
    if (track) {
      playTrack(track);
    }
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await processImage(file);
    if (!result.ok && "error" in result) {
      toast.error(result.error.message);
    }
    
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  // Handle upload confirmation
  const handleConfirmUpload = async () => {
    const result = await uploadAvatar();
    if (result.ok) {
      toast.success("Profile photo updated!");
    } else if ("error" in result) {
      toast.error(result.error.message);
    }
  };

  // Handle name edit
  const handleStartEditName = () => {
    setEditedName(profile?.display_name || "");
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    const result = await updateDisplayName(editedName);
    if (result.ok) {
      toast.success("Name updated!");
      setIsEditingName(false);
    } else if ("error" in result) {
      toast.error(result.error.message);
    }
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditedName("");
  };

  // Get display image URL
  const displayImageUrl = processedImage?.previewUrl || profile?.avatar_url;
  const displayName = profile?.display_name || "Fan";

  return (
    <div className="min-h-screen bg-background flex flex-col px-4 py-6">
      {/* Navigation Header */}
      <header className="w-full max-w-md mx-auto mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">Back</span>
        </button>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">Home</span>
        </button>
      </header>

      <div className="flex-1 w-full max-w-md mx-auto space-y-6">
        {/* Profile Header */}
        <section className="text-center animate-fade-in">
          {/* Avatar with upload */}
          <div className="relative w-24 h-24 mx-auto mb-4">
            <Avatar className="w-24 h-24 border-2 border-border">
              {displayImageUrl ? (
                <AvatarImage src={displayImageUrl} alt="Profile" className="object-cover" />
              ) : (
                <AvatarFallback className="bg-muted/30">
                  <User className="w-10 h-10 text-muted-foreground" />
                </AvatarFallback>
              )}
            </Avatar>
            
            {/* Camera button overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isProcessing}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Pending upload confirmation */}
          {processedImage && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <Button
                size="sm"
                onClick={handleConfirmUpload}
                disabled={isUploading}
                className="gap-1"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save Photo
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={clearProcessedImage}
                disabled={isUploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Name with edit */}
          {isEditingName ? (
            <div className="flex items-center justify-center gap-2 mb-2">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="max-w-[200px] text-center"
                placeholder="Your name"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleSaveName}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelEditName}
                disabled={isSaving}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 mb-2">
              <h1 
                className="font-display text-2xl md:text-3xl font-bold uppercase tracking-wider text-foreground"
                style={{
                  textShadow: "0 0 20px rgba(0, 255, 255, 0.3)"
                }}
              >
                {isLoading ? "Loading..." : displayName}
              </h1>
              <button
                onClick={handleStartEditName}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <StatusBadge variant="member" size="default">
            Vault Member
          </StatusBadge>
        </section>

        {/* Wallet Balance Card */}
        <section className="animate-fade-in" style={{ animationDelay: "100ms" }}>
          <WalletBalanceCard />
        </section>

        {/* Top 5 Artists */}
        <section className="animate-fade-in" style={{ animationDelay: "200ms" }}>
          <h2 
            className="font-display text-sm uppercase tracking-wider text-foreground mb-4"
            style={{
              textShadow: "0 0 15px rgba(255, 255, 255, 0.2)"
            }}
          >
            Your Top Artists
          </h2>
          
          <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
            <div className="flex gap-3">
              {topArtists.map((artist, index) => (
                <div
                  key={`${artist.name}-${index}`}
                  className="flex-shrink-0 w-[100px] text-center group cursor-pointer"
                  onClick={() => handlePlayTrack(artist.id)}
                >
                  <div className="relative w-[100px] h-[100px] rounded-full overflow-hidden mb-2 border-2 border-border group-hover:border-primary/50 transition-colors">
                    <img
                      src={artist.imageUrl}
                      alt={artist.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <p className="font-display text-xs font-semibold text-foreground truncate">
                    {artist.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {artist.streams} streams
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Inbox - Shared With You */}
        <section className="animate-fade-in" style={{ animationDelay: "300ms" }}>
          <h2 
            className="font-display text-sm uppercase tracking-wider text-foreground mb-4"
            style={{
              textShadow: "0 0 15px rgba(255, 255, 255, 0.2)"
            }}
          >
            Shared With You
          </h2>
          
          <div className="space-y-3">
            {sharedTracks.map((item) => (
              <GlowCard key={item.id} glowColor="accent" hover>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm font-semibold text-foreground truncate">
                      {item.track}
                    </p>
                    <p className="text-xs text-primary truncate">
                      {item.artist}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      From {item.sharedBy}
                    </p>
                  </div>
                  <Button
                    variant="accent"
                    size="sm"
                    className="ml-3 flex-shrink-0"
                    onClick={() => handlePlayTrack(item.id)}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Listen
                  </Button>
                </div>
              </GlowCard>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default FanProfile;
