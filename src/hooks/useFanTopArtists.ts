import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TopArtist {
  id: string;
  name: string;
  likeCount: number;
  imageUrl: string | null;
}

export const useFanTopArtists = (fanId: string | null) => {
  const [topArtists, setTopArtists] = useState<TopArtist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTopArtists = async () => {
      if (!fanId) {
        setIsLoading(false);
        return;
      }

      try {
        // Single RPC call with joins instead of 3 sequential queries
        const { data, error } = await supabase.rpc("get_fan_top_artists", {
          p_fan_id: fanId,
          p_limit: 5,
        });

        if (error) {
          console.error("Error fetching top artists:", error);
          setTopArtists([]);
          return;
        }

        const topArtistsList: TopArtist[] = (data || []).map((row: {
          artist_id: string;
          artist_name: string;
          avatar_url: string | null;
          like_count: number;
        }) => ({
          id: row.artist_id,
          name: row.artist_name || "Unknown Artist",
          likeCount: row.like_count,
          imageUrl: row.avatar_url,
        }));

        setTopArtists(topArtistsList);
      } catch (error) {
        console.error("Error in fetchTopArtists:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopArtists();
  }, [fanId]);

  return { topArtists, isLoading };
};
