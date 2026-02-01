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
        // Get all track likes for this fan
        const { data: likes, error: likesError } = await supabase
          .from("track_likes")
          .select("track_id")
          .eq("fan_id", fanId);

        if (likesError) {
          console.error("Error fetching likes:", likesError);
          setIsLoading(false);
          return;
        }

        if (!likes || likes.length === 0) {
          setTopArtists([]);
          setIsLoading(false);
          return;
        }

        // Get tracks for these likes to find artist_ids
        const trackIds = likes.map((l) => l.track_id);
        const { data: tracks, error: tracksError } = await supabase
          .from("tracks")
          .select("id, artist_id")
          .in("id", trackIds);

        if (tracksError) {
          console.error("Error fetching tracks:", tracksError);
          setIsLoading(false);
          return;
        }

        // Count likes per artist
        const artistLikeCounts: Record<string, number> = {};
        tracks?.forEach((track) => {
          const artistId = track.artist_id;
          artistLikeCounts[artistId] = (artistLikeCounts[artistId] || 0) + 1;
        });

        // Get unique artist IDs and fetch their profiles
        const artistIds = Object.keys(artistLikeCounts);
        if (artistIds.length === 0) {
          setTopArtists([]);
          setIsLoading(false);
          return;
        }

        const { data: artists, error: artistsError } = await supabase
          .from("public_artist_profiles")
          .select("id, artist_name, avatar_url")
          .in("id", artistIds);

        if (artistsError) {
          console.error("Error fetching artists:", artistsError);
          setIsLoading(false);
          return;
        }

        // Build top artists list sorted by like count
        const topArtistsList: TopArtist[] = (artists || [])
          .map((artist) => ({
            id: artist.id!,
            name: artist.artist_name || "Unknown Artist",
            likeCount: artistLikeCounts[artist.id!] || 0,
            imageUrl: artist.avatar_url,
          }))
          .sort((a, b) => b.likeCount - a.likeCount)
          .slice(0, 5);

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
