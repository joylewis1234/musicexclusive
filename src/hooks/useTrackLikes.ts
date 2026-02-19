import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LikeState {
  count: number;
  isLiked: boolean;
}

export const useTrackLikes = (trackId: string, fanId: string | null) => {
  const [likeState, setLikeState] = useState<LikeState>({ count: 0, isLiked: false });
  const [isLoading, setIsLoading] = useState(false);

  const fetchLikeData = useCallback(async () => {
    if (!trackId) return;

    try {
      // Read like_count from tracks table (publicly readable)
      const { data: trackData, error: trackError } = await supabase
        .from("tracks")
        .select("like_count")
        .eq("id", trackId)
        .maybeSingle();

      if (trackError) {
        console.error("Error fetching like count:", trackError);
        return;
      }

      // Check if current fan has liked (fan can read their own likes under new RLS)
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

      setLikeState({ count: (trackData as any)?.like_count ?? 0, isLiked });
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
