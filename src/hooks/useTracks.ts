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

  useEffect(() => {
    const fetchTracks = async () => {
      setIsLoading(true);
      setError(null);

      // Join with public_artist_profiles to get artist names
      let query = supabase
        .from("tracks")
        .select(`
          *,
          public_artist_profiles!inner(artist_name, avatar_url)
        `);
      
      if (artistId) {
        query = query.eq("artist_id", artistId);
      }

      const { data, error: fetchError } = await query.order("created_at", { ascending: false });

      if (fetchError) {
        console.error("Error fetching tracks:", fetchError);
        // Fallback: try without join
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("tracks")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (fallbackError) {
          setError("Could not load tracks");
        } else {
          const tracksWithDefaults = (fallbackData || []).map(track => ({
            ...track,
            preview_start_seconds: track.preview_start_seconds ?? 0,
            artist_name: "Artist",
          }));
          setTracks(tracksWithDefaults);
        }
      } else {
        // Map joined data to flat structure
        const tracksWithArtists = (data || []).map(track => ({
          ...track,
          preview_start_seconds: track.preview_start_seconds ?? 0,
          artist_name: (track.public_artist_profiles as any)?.artist_name || "Artist",
          artist_avatar_url: (track.public_artist_profiles as any)?.avatar_url || null,
        }));
        setTracks(tracksWithArtists);
      }

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
