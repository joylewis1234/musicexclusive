import { useRef, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, User, Camera, Pencil, Check, X, Loader2, LogOut, Heart, Sparkles } from "lucide-react";
import { useFanProfile } from "@/hooks/useFanProfile";
import { useFanTopArtists } from "@/hooks/useFanTopArtists";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import WalletBalanceCard from "@/components/WalletBalanceCard";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";


const FanProfile = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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

  const { user } = useAuth();
  const { refetchWithRetry } = useCredits();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSuperfan, setIsSuperfan] = useState(false);
  const [fanVaultId, setFanVaultId] = useState<string | null>(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  // Handle payment success redirect - verify with Stripe and update credits
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const creditsAdded = searchParams.get("credits");
    
    if (paymentStatus === "success" && !isVerifyingPayment) {
      setIsVerifyingPayment(true);
      
      // Clear URL params to prevent re-triggering
      setSearchParams({}, { replace: true });
      
      // Use refetchWithRetry to poll for credit updates
      const verifyCredits = async () => {
        try {
          const expectedCredits = creditsAdded ? parseInt(creditsAdded, 10) : undefined;
          console.log("[FanProfile] Polling for credit update, expected:", expectedCredits);
          
          const success = await refetchWithRetry(expectedCredits, 5, 1500);
          
          if (success) {
            toast.success(
              creditsAdded 
                ? `Payment successful! ${creditsAdded} credits added.`
                : "Payment successful! Credits added to your wallet."
            );
          } else {
            toast.info("Payment successful! Credits should appear shortly.");
          }
        } catch (err) {
          console.error("[FanProfile] Credit verification error:", err);
          toast.info("Payment processed! Credits should appear shortly.");
        } finally {
          setIsVerifyingPayment(false);
        }
      };
      
      verifyCredits();
    }
  }, [searchParams, setSearchParams, refetchWithRetry, isVerifyingPayment]);

  // Fetch vault member id for top artists query
  useEffect(() => {
    const fetchFanVaultId = async () => {
      if (!user?.email) return;
      
      const { data } = await supabase
        .from("vault_members")
        .select("id")
        .eq("email", user.email)
        .maybeSingle();
      
      if (data) {
        setFanVaultId(data.id);
      }
    };
    
    fetchFanVaultId();
  }, [user?.email]);

  const { topArtists, isLoading: isLoadingArtists } = useFanTopArtists(fanVaultId);

  // Fetch superfan status by checking for subscription credits in the ledger
  useEffect(() => {
    const fetchSuperfanStatus = async () => {
      if (!user?.email) return;
      
      // A true Superfan has a SUBSCRIPTION_CREDITS entry in the ledger
      const { data, error } = await supabase
        .from("credit_ledger")
        .select("id")
        .eq("user_email", user.email)
        .eq("type", "SUBSCRIPTION_CREDITS")
        .limit(1);
      
      if (!error) {
        setIsSuperfan(Array.isArray(data) && data.length > 0);
      }
    };
    
    fetchSuperfanStatus();
  }, [user?.email]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to log out");
    } finally {
      setIsLoggingOut(false);
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
          onClick={handleLogout}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">Log Out</span>
        </button>
      </header>

      <div className="flex-1 w-full max-w-md mx-auto space-y-6">
        {/* Vault + Superfan Badges */}
        <section className="animate-fade-in flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <StatusBadge variant="vault" size="lg">
              Vault Access Active
            </StatusBadge>
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          {isSuperfan && (
            <StatusBadge variant="superfan" size="default">
              Superfan
            </StatusBadge>
          )}
        </section>

        {/* Profile Header */}
        <section className="text-center animate-fade-in" style={{ animationDelay: "100ms" }}>
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
          
        </section>

        {/* Wallet Balance Card */}
        <section className="animate-fade-in" style={{ animationDelay: "200ms" }}>
          <WalletBalanceCard />
        </section>

        {/* Discovery CTA */}
        <section className="animate-fade-in" style={{ animationDelay: "250ms" }}>
          <Button 
            variant="secondary" 
            size="lg" 
            className="w-full"
            onClick={() => navigate("/discovery")}
          >
            Explore All Music
          </Button>
        </section>

        {/* Top 5 Artists */}
        <section className="animate-fade-in" style={{ animationDelay: "300ms" }}>
          <h2 
            className="font-display text-sm uppercase tracking-wider text-foreground mb-4"
            style={{
              textShadow: "0 0 15px rgba(255, 255, 255, 0.2)"
            }}
          >
            Your Top Artists
          </h2>
          
          {isLoadingArtists ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : topArtists.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Heart className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No liked artists yet</p>
              <p className="text-xs mt-1">Heart tracks to see your favorites here</p>
            </div>
          ) : (
            <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
              <div className="flex gap-3">
                {topArtists.map((artist) => (
                  <div
                    key={artist.id}
                    className="flex-shrink-0 w-[100px] text-center group cursor-pointer"
                    onClick={() => navigate(`/artist/${artist.id}`)}
                  >
                    <div className="relative w-[100px] h-[100px] rounded-full overflow-hidden mb-2 border-2 border-border group-hover:border-primary/50 transition-colors">
                      {artist.imageUrl ? (
                        <img
                          src={artist.imageUrl}
                          alt={artist.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                          <User className="w-10 h-10 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <User className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                    <p className="font-display text-xs font-semibold text-foreground truncate">
                      {artist.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                      <Heart className="w-3 h-3 fill-current" />
                      {artist.likeCount} {artist.likeCount === 1 ? "like" : "likes"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="animate-fade-in pt-4 pb-8" style={{ animationDelay: "400ms" }}>
          <Button
            variant="outline"
            size="lg"
            className="w-full gap-2 text-muted-foreground hover:text-destructive hover:border-destructive"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            Log Out
          </Button>
        </section>
      </div>
    </div>
  );
};

export default FanProfile;
