import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MAX_PLAYLIST_SIZE = 50;

export interface PlaylistTrack {
  id: string; // fan_playlists.id
  track_id: string;
  title: string;
  artist_name: string;
  artist_id: string;
  artwork_url: string | null;
  full_audio_url: string | null;
  duration: number;
  added_at: string;
}

export const usePlaylist = (fanId: string | null) => {
  const [playlist, setPlaylist] = useState<PlaylistTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [playlistTrackIds, setPlaylistTrackIds] = useState<Set<string>>(new Set());

  // Fetch playlist with track details
  const fetchPlaylist = useCallback(async () => {
    if (!fanId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("fan_playlists")
        .select("id, track_id, created_at")
        .eq("fan_id", fanId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[usePlaylist] fetch error:", error);
        return;
      }

      if (!data || data.length === 0) {
        setPlaylist([]);
        setPlaylistTrackIds(new Set());
        return;
      }

      // Fetch track details
      const trackIds = data.map((d) => d.track_id);
      const { data: tracks, error: tracksError } = await supabase
        .from("tracks")
        .select("id, title, artist_id, artwork_url, full_audio_url, duration, status")
        .in("id", trackIds)
        .eq("status", "ready");

      if (tracksError) {
        console.error("[usePlaylist] tracks fetch error:", tracksError);
        return;
      }

      // Fetch artist names
      const artistIds = [...new Set((tracks || []).map((t) => t.artist_id))];
      const { data: artists } = await supabase
        .from("public_artist_profiles")
        .select("id, artist_name")
        .in("id", artistIds);

      const artistMap = new Map(
        (artists || []).map((a) => [a.id, a.artist_name])
      );

      const trackMap = new Map(
        (tracks || []).map((t) => [t.id, t])
      );

      const playlistTracks: PlaylistTrack[] = [];
      const ids = new Set<string>();

      for (const entry of data) {
        const track = trackMap.get(entry.track_id);
        if (!track) continue; // Track was removed or disabled
        
        playlistTracks.push({
          id: entry.id,
          track_id: track.id,
          title: track.title,
          artist_name: artistMap.get(track.artist_id) || "Unknown Artist",
          artist_id: track.artist_id,
          artwork_url: track.artwork_url,
          full_audio_url: track.full_audio_url,
          duration: track.duration,
          added_at: entry.created_at,
        });
        ids.add(track.id);
      }

      setPlaylist(playlistTracks);
      setPlaylistTrackIds(ids);
    } catch (err) {
      console.error("[usePlaylist] error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [fanId]);

  useEffect(() => {
    fetchPlaylist();
  }, [fetchPlaylist]);

  const addToPlaylist = useCallback(
    async (trackId: string) => {
      if (!fanId) return false;

      if (playlistTrackIds.has(trackId)) {
        toast.info("Already in your playlist");
        return false;
      }

      if (playlistTrackIds.size >= MAX_PLAYLIST_SIZE) {
        toast.error(`Playlist full (${MAX_PLAYLIST_SIZE} songs max)`);
        return false;
      }

      const { error } = await supabase
        .from("fan_playlists")
        .insert({ fan_id: fanId, track_id: trackId });

      if (error) {
        if (error.code === "23505") {
          toast.info("Already in your playlist");
        } else {
          console.error("[usePlaylist] add error:", error);
          toast.error("Couldn't add to playlist");
        }
        return false;
      }

      toast.success("Added to playlist ✓");
      // Optimistic update
      setPlaylistTrackIds((prev) => new Set(prev).add(trackId));
      // Refetch for full data
      fetchPlaylist();
      return true;
    },
    [fanId, playlistTrackIds, fetchPlaylist]
  );

  const removeFromPlaylist = useCallback(
    async (playlistEntryId: string, trackId: string) => {
      if (!fanId) return false;

      const { error } = await supabase
        .from("fan_playlists")
        .delete()
        .eq("id", playlistEntryId);

      if (error) {
        console.error("[usePlaylist] remove error:", error);
        toast.error("Couldn't remove from playlist");
        return false;
      }

      toast.success("Removed from playlist");
      setPlaylist((prev) => prev.filter((p) => p.id !== playlistEntryId));
      setPlaylistTrackIds((prev) => {
        const next = new Set(prev);
        next.delete(trackId);
        return next;
      });
      return true;
    },
    [fanId]
  );

  const isInPlaylist = useCallback(
    (trackId: string) => playlistTrackIds.has(trackId),
    [playlistTrackIds]
  );

  return {
    playlist,
    isLoading,
    addToPlaylist,
    removeFromPlaylist,
    isInPlaylist,
    refetch: fetchPlaylist,
  };
};
