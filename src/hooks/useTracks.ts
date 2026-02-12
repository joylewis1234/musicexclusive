import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DbTrack {
  id: string;
  artist_id: string; // This is the artist_profile.id (UUID)
  title: string;
  album: string | null;
  duration: number;
  full_audio_url: string | null;
  preview_audio_url: string | null;
  preview_start_seconds: number;
  artwork_url: string | null;
  genre: string | null;
  created_at: string;
  // Joined artist info
  artist_name?: string;
  artist_avatar_url?: string | null;
}

export const useTracks = (artistId?: string) => {
  const [tracks, setTracks] = useState<DbTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isLikelyUuid = (value: string) => value.includes("-") && value.length > 20;

  useEffect(() => {
    const fetchTracks = async () => {
      setIsLoading(true);
      setError(null);

      // NOTE: We cannot join tracks -> public_artist_profiles directly because there's no FK
      // relationship in the schema cache. Instead, fetch tracks first, then fetch the artist
      // profiles in a second query using an `in()` filter.
      let query = supabase.from("tracks").select("*")
        .not("status", "in", '("uploading","disabled")');
      if (artistId) query = query.eq("artist_id", artistId);

      const { data, error: fetchError } = await query.order("created_at", { ascending: false });
      if (fetchError) {
        console.error("Error fetching tracks:", fetchError);
        setError("Could not load tracks");
        setTracks([]);
        setIsLoading(false);
        return;
      }

      const trackRows = (data || []) as DbTrack[];

      const artistProfileIds = Array.from(
        new Set(trackRows.map((t) => t.artist_id).filter(isLikelyUuid)),
      );

      const artistMap = new Map<string, { artist_name: string | null; avatar_url: string | null }>();

      if (artistProfileIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("public_artist_profiles")
          .select("id, artist_name, avatar_url")
          .in("id", artistProfileIds);

        if (profilesError) {
          console.error("Error fetching artist profiles:", profilesError);
        } else {
          (profiles || []).forEach((p) => {
            if (p?.id) {
              artistMap.set(p.id, {
                artist_name: p.artist_name,
                avatar_url: p.avatar_url,
              });
            }
          });
        }
      }

      const tracksWithMeta: DbTrack[] = trackRows.map((t) => {
        const artistInfo = isLikelyUuid(t.artist_id) ? artistMap.get(t.artist_id) : undefined;
        return {
          ...t,
          preview_start_seconds: t.preview_start_seconds ?? 0,
          artist_name: artistInfo?.artist_name || getArtistNameById(t.artist_id),
          artist_avatar_url: artistInfo?.avatar_url || null,
        };
      });

      setTracks(tracksWithMeta);

      setIsLoading(false);
    };

    fetchTracks();
  }, [artistId]);

  return { tracks, isLoading, error };
};

// Get artist name from DbTrack (uses joined data or fallback)
export const getArtistName = (track: DbTrack): string => {
  if (track.artist_name) {
    return track.artist_name;
  }
  return "Artist";
};

// Legacy function for backwards compatibility - just returns "Artist" for UUIDs
export const getArtistNameById = (artistId: string): string => {
  // If it's a UUID (profile ID), we can't resolve without a DB call
  if (artistId.includes("-") && artistId.length > 20) {
    return "Artist";
  }
  return artistId.charAt(0).toUpperCase() + artistId.slice(1);
};

// Get artist image fallback
export const getArtistImage = (artistId: string): string => {
  // Import paths - these will be resolved at build time
  const images: Record<string, string> = {
    nova: "/src/assets/artist-1.jpg",
    aura: "/src/assets/artist-2.jpg",
    echo: "/src/assets/artist-3.jpg",
    pulse: "/src/assets/artist-1.jpg",
    drift: "/src/assets/artist-2.jpg",
    vega: "/src/assets/artist-3.jpg",
    zenith: "/src/assets/artist-1.jpg",
    luna: "/src/assets/artist-2.jpg",
  };
  return images[artistId] || "/src/assets/artist-1.jpg";
};
