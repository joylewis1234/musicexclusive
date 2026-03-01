import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const artworkCache = new Map<string, { url: string; expiresAt: number }>();
const STALE_BUFFER_MS = 10_000;

async function mintPublicArtwork(trackId: string): Promise<{ url: string; expiresAt: number }> {
  const { data, error } = await supabase.functions.invoke("mint-playback-url-public-preview", {
    body: { trackId, fileType: "artwork" },
  });

  if (error || !data?.url) {
    throw new Error(error?.message || "Failed to mint public artwork URL");
  }

  const expiresAt = data.expiresAt
    ? new Date(data.expiresAt).getTime()
    : Date.now() + 5 * 60 * 1000;
  return { url: data.url as string, expiresAt };
}

export function usePublicSignedArtwork(trackId: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(() => {
    if (!trackId) return null;
    const cached = artworkCache.get(trackId);
    if (cached && cached.expiresAt > Date.now() + STALE_BUFFER_MS) return cached.url;
    return null;
  });
  const [isLoading, setIsLoading] = useState(!url && !!trackId);
  const latestTrackId = useRef(trackId);
  latestTrackId.current = trackId;

  useEffect(() => {
    if (!trackId) { setUrl(null); setIsLoading(false); return; }

    const cached = artworkCache.get(trackId);
    if (cached && cached.expiresAt > Date.now() + STALE_BUFFER_MS) {
      setUrl(cached.url); setIsLoading(false); return;
    }

    let cancelled = false;
    setIsLoading(true);

    mintPublicArtwork(trackId)
      .then((result) => {
        if (cancelled || latestTrackId.current !== trackId) return;
        artworkCache.set(trackId, result);
        setUrl(result.url);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled || latestTrackId.current !== trackId) return;
        setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [trackId]);

  return { url, isLoading };
}
