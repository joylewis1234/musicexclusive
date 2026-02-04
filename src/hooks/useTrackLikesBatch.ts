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

  // Memoize trackIds to prevent unnecessary refetches
  const trackIdsKey = useMemo(() => trackIds.sort().join(","), [trackIds]);

  const fetchAllLikeData = useCallback(async () => {
    if (trackIds.length === 0) {
      setLikesMap({});
      return;
    }

    setIsLoading(true);

    try {
      // Single query to get all like counts grouped by track_id
      const { data: likeCounts, error: countError } = await supabase
        .from("track_likes")
        .select("track_id")
        .in("track_id", trackIds);

      if (countError) {
        console.error("Error fetching like counts:", countError);
        setIsLoading(false);
        return;
      }

      // Count likes per track
      const countMap: Record<string, number> = {};
      (likeCounts || []).forEach((like) => {
        countMap[like.track_id] = (countMap[like.track_id] || 0) + 1;
      });

      // If fan is logged in, get their likes in one query
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

      // Build the likes map
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

  // Subscribe to realtime changes on track_likes
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (trackIds.length === 0) return;

    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel("track-likes-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "track_likes",
        },
        (payload) => {
          const trackId = (payload.new as any)?.track_id || (payload.old as any)?.track_id;
          
          // Only update if this track is in our list
          if (!trackId || !trackIds.includes(trackId)) return;

          // Skip if this is our own action (already handled optimistically)
          const eventFanId = (payload.new as any)?.fan_id || (payload.old as any)?.fan_id;
          if (eventFanId === fanId) return;

          // Update count based on event type
          setLikesMap((prev) => {
            const current = prev[trackId] || { count: 0, isLiked: false };
            
            if (payload.eventType === "INSERT") {
              return {
                ...prev,
                [trackId]: { ...current, count: current.count + 1 },
              };
            } else if (payload.eventType === "DELETE") {
              return {
                ...prev,
                [trackId]: { ...current, count: Math.max(0, current.count - 1) },
              };
            }
            return prev;
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
  }, [trackIdsKey, fanId]);

  const toggleLike = useCallback(async (trackId: string) => {
    if (!fanId || !trackId || loadingTrackId) return;

    const currentState = likesMap[trackId];
    if (!currentState) return;

    const wasLiked = currentState.isLiked;
    const prevCount = currentState.count;

    // Optimistic update - instant UI feedback
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
      // Revert optimistic update on failure
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
