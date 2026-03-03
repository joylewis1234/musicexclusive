import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface LikeState {
  count: number;
  isLiked: boolean;
}

type LikesMap = Record<string, LikeState>;

export const useTrackLikesBatch = (trackIds: string[], fanId: string | null) => {
  const [likesMap, setLikesMap] = useState<LikesMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);

  const trackIdsKey = useMemo(() => [...trackIds].sort().join(","), [trackIds]);

  const fetchAllLikeData = useCallback(async () => {
    if (trackIds.length === 0) {
      setLikesMap({});
      return;
    }

    setIsLoading(true);

    try {
      // Read like_count from tracks table (publicly readable via "Anyone can read tracks")
      const { data: tracksData, error: tracksError } = await supabase
        .from("tracks")
        .select("id, like_count")
        .in("id", trackIds);

      if (tracksError) {
        console.error("Error fetching like counts:", tracksError);
        setIsLoading(false);
        return;
      }

      const countMap: Record<string, number> = {};
      (tracksData || []).forEach((t: any) => {
        countMap[t.id] = t.like_count ?? 0;
      });

      // If fan is logged in, get their likes (fan can read own likes under new RLS)
      const fanLikedSet = new Set<string>();
      if (fanId) {
        const { data: fanLikes, error: fanError } = await supabase
          .from("track_likes")
          .select("track_id")
          .eq("fan_id", fanId)
          .in("track_id", trackIds);

        if (!fanError && fanLikes) {
          fanLikes.forEach((like) => fanLikedSet.add(like.track_id));
        }
      }

      const newLikesMap: LikesMap = {};
      trackIds.forEach((trackId) => {
        newLikesMap[trackId] = {
          count: countMap[trackId] || 0,
          isLiked: fanLikedSet.has(trackId),
        };
      });

      setLikesMap(newLikesMap);
    } catch (error) {
      console.error("Error fetching batch like data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [trackIdsKey, fanId]);

  useEffect(() => {
    fetchAllLikeData();
  }, [fetchAllLikeData]);

  // Subscribe to realtime changes on tracks.like_count for live count updates
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (trackIds.length === 0) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel("track-likes-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tracks",
        },
        (payload) => {
          const updatedTrack = payload.new as any;
          const trackId = updatedTrack?.id;

          if (!trackId || !trackIds.includes(trackId)) return;
          if (updatedTrack.like_count === undefined) return;

          setLikesMap((prev) => {
            const current = prev[trackId];
            if (!current || current.count === updatedTrack.like_count) return prev;
            return {
              ...prev,
              [trackId]: { ...current, count: updatedTrack.like_count },
            };
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [trackIdsKey]);

  const toggleLike = useCallback(async (trackId: string) => {
    if (!fanId || !trackId || loadingTrackId) return;

    const currentState = likesMap[trackId];
    if (!currentState) return;

    const wasLiked = currentState.isLiked;
    const prevCount = currentState.count;

    // Optimistic update
    setLikesMap((prev) => ({
      ...prev,
      [trackId]: {
        count: wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1,
        isLiked: !wasLiked,
      },
    }));

    setLoadingTrackId(trackId);

    try {
      if (wasLiked) {
        const { error } = await supabase
          .from("track_likes")
          .delete()
          .eq("track_id", trackId)
          .eq("fan_id", fanId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("track_likes").insert({
          track_id: trackId,
          fan_id: fanId,
        });

        if (error) throw error;
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      setLikesMap((prev) => ({
        ...prev,
        [trackId]: {
          count: prevCount,
          isLiked: wasLiked,
        },
      }));
    } finally {
      setLoadingTrackId(null);
    }
  }, [fanId, likesMap, loadingTrackId]);

  const getLikeState = useCallback((trackId: string): LikeState => {
    return likesMap[trackId] || { count: 0, isLiked: false };
  }, [likesMap]);

  const isTrackLoading = useCallback((trackId: string): boolean => {
    return loadingTrackId === trackId;
  }, [loadingTrackId]);

  return {
    likesMap,
    getLikeState,
    toggleLike,
    isLoading,
    isTrackLoading,
    refetch: fetchAllLikeData,
  };
};
