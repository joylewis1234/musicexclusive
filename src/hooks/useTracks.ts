import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DbTrack {
  id: string;
  artist_id: string;
  title: string;
  album: string | null;
  duration: number;
  full_audio_url: string | null;
  preview_audio_url: string | null;
  preview_start_seconds: number;
  artwork_url: string | null;
  genre: string | null;
  created_at: string;
}

export const useTracks = (artistId?: string) => {
  const [tracks, setTracks] = useState<DbTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTracks = async () => {
      setIsLoading(true);
      setError(null);

      let query = supabase.from("tracks").select("*");
      
      if (artistId) {
        query = query.eq("artist_id", artistId);
      }

      const { data, error: fetchError } = await query.order("created_at", { ascending: false });

      if (fetchError) {
        console.error("Error fetching tracks:", fetchError);
        setError("Could not load tracks");
      } else {
        // Ensure preview_start_seconds has a default value
        const tracksWithDefaults = (data || []).map(track => ({
          ...track,
          preview_start_seconds: track.preview_start_seconds ?? 0,
        }));
        setTracks(tracksWithDefaults);
      }

      setIsLoading(false);
    };

    fetchTracks();
  }, [artistId]);

  return { tracks, isLoading, error };
};

// Get artist name from artist_id (mock mapping for now)
export const getArtistName = (artistId: string): string => {
  const artistNames: Record<string, string> = {
    nova: "NOVA",
    aura: "AURA",
    echo: "ECHO",
    pulse: "PULSE",
    drift: "DRIFT",
    vega: "VEGA",
    zenith: "ZENITH",
    luna: "LUNA",
  };
  return artistNames[artistId] || artistId.toUpperCase();
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
