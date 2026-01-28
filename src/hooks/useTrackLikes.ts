import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LikeState {
  count: number;
  isLiked: boolean;
}

export const useTrackLikes = (trackId: string, fanId: string | null) => {
  const [likeState, setLikeState] = useState<LikeState>({ count: 0, isLiked: false });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch like count and user's like status
  const fetchLikeData = useCallback(async () => {
    if (!trackId) return;

    try {
      // Get total like count
      const { count, error: countError } = await supabase
        .from("track_likes")
        .select("*", { count: "exact", head: true })
        .eq("track_id", trackId);

      if (countError) {
        console.error("Error fetching like count:", countError);
        return;
      }

      // Check if current fan has liked
      let isLiked = false;
      if (fanId) {
        const { data: likeData } = await supabase
          .from("track_likes")
          .select("id")
          .eq("track_id", trackId)
          .eq("fan_id", fanId)
          .maybeSingle();

        isLiked = !!likeData;
      }

      setLikeState({ count: count || 0, isLiked });
    } catch (error) {
      console.error("Error fetching like data:", error);
    }
  }, [trackId, fanId]);

  useEffect(() => {
    fetchLikeData();
  }, [fetchLikeData]);

  const toggleLike = async () => {
    if (!fanId || !trackId || isLoading) return;

    setIsLoading(true);

    try {
      if (likeState.isLiked) {
        // Unlike
        const { error } = await supabase
          .from("track_likes")
          .delete()
          .eq("track_id", trackId)
          .eq("fan_id", fanId);

        if (error) throw error;

        setLikeState((prev) => ({
          count: Math.max(0, prev.count - 1),
          isLiked: false,
        }));
      } else {
        // Like
        const { error } = await supabase.from("track_likes").insert({
          track_id: trackId,
          fan_id: fanId,
        });

        if (error) throw error;

        setLikeState((prev) => ({
          count: prev.count + 1,
          isLiked: true,
        }));
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      // Refetch to sync state
      fetchLikeData();
    } finally {
      setIsLoading(false);
    }
  };

  return {
    likeCount: likeState.count,
    isLiked: likeState.isLiked,
    toggleLike,
    isLoading,
  };
};
