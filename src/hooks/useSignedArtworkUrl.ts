import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Global in-memory cache for signed artwork URLs.
 * Key = trackId, Value = { url, expiresAt (epoch ms) }
 */
const artworkCache = new Map<string, { url: string; expiresAt: number }>();

/** Minimum remaining TTL before we consider a cached entry stale (10 s). */
const STALE_BUFFER_MS = 10_000;

async function mintArtworkUrl(trackId: string): Promise<{ url: string; expiresAt: number }> {
  const { data, error } = await supabase.functions.invoke("mint-playback-url", {
    body: { trackId, fileType: "artwork" },
  });

  if (error || !data?.url) {
    throw new Error(error?.message || "Failed to mint artwork URL");
  }

  // Edge function returns a 5-min TTL for artwork
  const expiresAt = Date.now() + 5 * 60 * 1000;
  return { url: data.url as string, expiresAt };
}

/**
 * React hook that returns a short-lived signed URL for a track's cover artwork.
 *
 * Uses a global in-memory cache (shared across components) with a ~5 min TTL
 * matching the presigned URL expiry from the edge function.
 */
export function useSignedArtworkUrl(trackId: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(() => {
    if (!trackId) return null;
    const cached = artworkCache.get(trackId);
    if (cached && cached.expiresAt > Date.now() + STALE_BUFFER_MS) return cached.url;
    return null;
  });
  const [isLoading, setIsLoading] = useState(!url && !!trackId);
  const [error, setError] = useState<string | null>(null);

  // Track latest trackId to avoid stale setState calls
  const latestTrackId = useRef(trackId);
  latestTrackId.current = trackId;

  useEffect(() => {
    if (!trackId) {
      setUrl(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Check cache first
    const cached = artworkCache.get(trackId);
    if (cached && cached.expiresAt > Date.now() + STALE_BUFFER_MS) {
      setUrl(cached.url);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    mintArtworkUrl(trackId)
      .then((result) => {
        if (cancelled || latestTrackId.current !== trackId) return;
        artworkCache.set(trackId, result);
        setUrl(result.url);
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled || latestTrackId.current !== trackId) return;
        console.warn("[useSignedArtworkUrl] Error for", trackId, err);
        setError(err instanceof Error ? err.message : "Failed to load artwork");
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [trackId]);

  return { url, isLoading, error };
}
