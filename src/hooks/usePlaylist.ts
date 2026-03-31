import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchVaultMemberRow } from "@/lib/vaultMemberLookup";
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
  /** From `tracks.status` — only `ready` tracks can play */
  track_status?: string;
  /** True when fan_playlists row exists but tracks join failed or returned no row */
  detailMissing?: boolean;
}

function placeholderEntry(entry: {
  id: string;
  track_id: string;
  created_at: string;
}): PlaylistTrack {
  return {
    id: entry.id,
    track_id: entry.track_id,
    title: "Track unavailable",
    artist_name: "—",
    artist_id: "",
    artwork_url: null,
    full_audio_url: null,
    duration: 0,
    added_at: entry.created_at,
    detailMissing: true,
  };
}

/**
 * Loads `fan_playlists` for the logged-in user by resolving `vault_members` inside the hook
 * (`user_id` first, then email). Does not depend on the parent passing `fanVaultId`.
 */
export const usePlaylist = () => {
  const { user } = useAuth();
  const [playlist, setPlaylist] = useState<PlaylistTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [playlistTrackIds, setPlaylistTrackIds] = useState<Set<string>>(new Set());

  const resolveFanId = useCallback(async (): Promise<string | null> => {
    if (!user?.id && !user?.email) return null;
    const { data, error } = await fetchVaultMemberRow(
      supabase,
      { id: user.id, email: user.email },
      "id",
    );
    if (error) {
      console.error("[usePlaylist] vault_members resolve:", error);
      return null;
    }
    return data?.id ?? null;
  }, [user?.id, user?.email]);

  const fetchPlaylist = useCallback(async () => {
    if (!user) {
      setPlaylist([]);
      setPlaylistTrackIds(new Set());
      return;
    }

    setIsLoading(true);
    try {
      const fanId = await resolveFanId();
      if (!fanId) {
        setPlaylist([]);
        setPlaylistTrackIds(new Set());
        return;
      }

      const { data, error } = await supabase
        .from("fan_playlists")
        .select("id, track_id, created_at")
        .eq("fan_id", fanId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[usePlaylist] fetch error:", error);
        setPlaylist([]);
        setPlaylistTrackIds(new Set());
        return;
      }

      if (!data || data.length === 0) {
        setPlaylist([]);
        setPlaylistTrackIds(new Set());
        return;
      }

      const idsFromLinks = new Set(data.map((d) => d.track_id));

      const trackIds = data.map((d) => d.track_id);
      const { data: tracks, error: tracksError } = await supabase
        .from("tracks")
        .select("id, title, artist_id, artwork_url, full_audio_url, duration, status")
        .in("id", trackIds);

      if (tracksError) {
        console.error("[usePlaylist] tracks fetch error:", tracksError);
        setPlaylist(data.map((entry) => placeholderEntry(entry)));
        setPlaylistTrackIds(idsFromLinks);
        return;
      }

      const trackList = tracks || [];
      const trackMap = new Map(trackList.map((t) => [t.id, t]));

      const artistIds = [...new Set(trackList.map((t) => t.artist_id))];
      const { data: artists } =
        artistIds.length > 0
          ? await supabase
              .from("public_artist_profiles")
              .select("id, artist_name")
              .in("id", artistIds)
          : { data: null };

      const artistMap = new Map((artists || []).map((a) => [a.id, a.artist_name]));

      const playlistTracks: PlaylistTrack[] = [];

      for (const entry of data) {
        const track = trackMap.get(entry.track_id);
        if (!track) {
          playlistTracks.push(placeholderEntry(entry));
          continue;
        }

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
          track_status: (track as { status?: string }).status,
        });
      }

      setPlaylist(playlistTracks);
      setPlaylistTrackIds(idsFromLinks);
    } catch (err) {
      console.error("[usePlaylist] error:", err);
      setPlaylist([]);
      setPlaylistTrackIds(new Set());
    } finally {
      setIsLoading(false);
    }
  }, [user, resolveFanId]);

  useEffect(() => {
    void fetchPlaylist();
  }, [fetchPlaylist]);

  const addToPlaylist = useCallback(
    async (trackId: string) => {
      const fanId = await resolveFanId();
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
      setPlaylistTrackIds((prev) => new Set(prev).add(trackId));
      void fetchPlaylist();
      return true;
    },
    [resolveFanId, playlistTrackIds, fetchPlaylist],
  );

  const removeFromPlaylist = useCallback(
    async (playlistEntryId: string, trackId: string) => {
      const fanId = await resolveFanId();
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
    [resolveFanId],
  );

  const isInPlaylist = useCallback(
    (trackId: string) => playlistTrackIds.has(trackId),
    [playlistTrackIds],
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
