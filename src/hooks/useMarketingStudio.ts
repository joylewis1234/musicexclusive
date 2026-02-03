import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Track {
  id: string;
  title: string;
  artwork_url: string | null;
  genre: string | null;
}

export interface ArtistInfo {
  id: string;
  artist_name: string;
  avatar_url: string | null;
  genre: string | null;
}

export interface MarketingAsset {
  id: string;
  artist_id: string;
  track_id: string;
  format: "story" | "reel";
  template_id: string;
  promo_image_url: string;
  chosen_caption: string | null;
  badges: string[] | null;
  created_at: string;
  track?: Track;
}

export const useMarketingStudio = () => {
  const [artistInfo, setArtistInfo] = useState<ArtistInfo | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [recentAssets, setRecentAssets] = useState<MarketingAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyCount, setDailyCount] = useState(0);
  const DAILY_LIMIT = 20;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in");
        return;
      }

      // Fetch artist profile
      const { data: profile, error: profileError } = await supabase
        .from("artist_profiles")
        .select("id, artist_name, avatar_url, genre")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError || !profile) {
        toast.error("Could not load artist profile");
        return;
      }

      setArtistInfo(profile);

      // Fetch tracks
      const { data: trackData, error: tracksError } = await supabase
        .from("tracks")
        .select("id, title, artwork_url, genre")
        .eq("artist_id", profile.id)
        .neq("status", "disabled")
        .order("created_at", { ascending: false });

      if (tracksError) {
        toast.error("Could not load tracks");
      } else {
        setTracks(trackData || []);
      }

      // Fetch recent assets
      const { data: assets, error: assetsError } = await supabase
        .from("marketing_assets")
        .select("*")
        .eq("artist_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!assetsError && assets) {
        // Enrich with track info
        const enriched = assets.map((asset: any) => ({
          ...asset,
          track: trackData?.find((t) => t.id === asset.track_id),
        }));
        setRecentAssets(enriched);
      }

      // Count today's assets for rate limiting
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count } = await supabase
        .from("marketing_assets")
        .select("*", { count: "exact", head: true })
        .eq("artist_id", profile.id)
        .gte("created_at", today.toISOString());

      setDailyCount(count || 0);
    } catch (error) {
      console.error("Error fetching marketing data:", error);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveAsset = async (
    trackId: string,
    format: "story" | "reel",
    templateId: string,
    imageBlob: Blob,
    caption: string | null,
    badges: string[]
  ): Promise<string | null> => {
    if (!artistInfo) return null;

    if (dailyCount >= DAILY_LIMIT) {
      toast.error("You've hit today's promo limit—try again tomorrow.");
      return null;
    }

    try {
      // Upload to storage
      const fileName = `${artistInfo.id}/${Date.now()}-${format}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("marketing-assets")
        .upload(fileName, imageBlob, {
          contentType: "image/png",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("marketing-assets")
        .getPublicUrl(fileName);

      // Save to database
      const { data: asset, error: dbError } = await supabase
        .from("marketing_assets")
        .insert({
          artist_id: artistInfo.id,
          track_id: trackId,
          format,
          template_id: templateId,
          promo_image_url: publicUrl,
          chosen_caption: caption,
          badges,
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      setDailyCount((prev) => prev + 1);
      const newAsset: MarketingAsset = {
        ...asset,
        format: asset.format as "story" | "reel",
        track: tracks.find((t) => t.id === trackId),
      };
      setRecentAssets((prev) => [newAsset, ...prev.slice(0, 19)]);

      return publicUrl;
    } catch (error: any) {
      console.error("Error saving asset:", error);
      toast.error("Failed to save promo: " + (error.message || "Unknown error"));
      return null;
    }
  };

  const deleteAsset = async (assetId: string) => {
    try {
      const asset = recentAssets.find((a) => a.id === assetId);
      if (!asset) return;

      // Delete from storage
      const urlParts = asset.promo_image_url.split("/");
      const fileName = urlParts.slice(-2).join("/");
      
      await supabase.storage
        .from("marketing-assets")
        .remove([fileName]);

      // Delete from database
      const { error } = await supabase
        .from("marketing_assets")
        .delete()
        .eq("id", assetId);

      if (error) throw error;

      setRecentAssets((prev) => prev.filter((a) => a.id !== assetId));
      toast.success("Promo deleted");
    } catch (error) {
      console.error("Error deleting asset:", error);
      toast.error("Failed to delete");
    }
  };

  return {
    artistInfo,
    tracks,
    recentAssets,
    isLoading,
    dailyCount,
    dailyLimit: DAILY_LIMIT,
    canCreate: dailyCount < DAILY_LIMIT,
    saveAsset,
    deleteAsset,
    refetch: fetchData,
  };
};
