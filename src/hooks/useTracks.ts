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
  artwork_url: string | null;
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
        setTracks(data || []);
      }

      setIsLoading(false);
    };

    fetchTracks();
  }, [artistId]);

  return { tracks, isLoading, error };
};

// Get first track for an artist (for preview on Discovery)
export const getArtistPreviewTrack = (tracks: DbTrack[], artistId: string): DbTrack | null => {
  const artistTracks = tracks.filter(t => t.artist_id === artistId);
  // Prefer tracks with preview_audio_url, otherwise return first track
  const withPreview = artistTracks.find(t => t.preview_audio_url);
  return withPreview || artistTracks[0] || null;
};
