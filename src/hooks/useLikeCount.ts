import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useLikeCount = (trackId: string) => {
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    if (!trackId) return;

    const fetchLikeCount = async () => {
      const { count, error } = await supabase
        .from("track_likes")
        .select("*", { count: "exact", head: true })
        .eq("track_id", trackId);

      if (!error && count !== null) {
        setLikeCount(count);
      }
    };

    fetchLikeCount();
  }, [trackId]);

  return likeCount;
};
