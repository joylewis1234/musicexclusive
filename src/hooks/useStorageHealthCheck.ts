import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StorageHealthCheckResult = {
  checkedAt: string;
  session: { ok: boolean; userId?: string; error?: unknown };
  artistProfile: { ok: boolean; artistProfileId?: string | null };
  storageBaseUrl: string | null;
  listBuckets: { ok: boolean; buckets?: Array<{ id: string; name: string; public: boolean }>; error?: unknown };
  testUpload: { ok: boolean; bucket?: string; path?: string; url?: string; error?: unknown; skipped?: boolean; reason?: string };
};

const safeStringify = (value: unknown) => {
  try {
    if (value instanceof Error) {
      return JSON.stringify(
        { name: value.name, message: value.message, stack: value.stack, ...(value as any) },
        null,
        2,
      );
    }
    return JSON.stringify(value, null, 2);
  } catch {
    try {
      return String(value);
    } catch {
      return "[unstringifiable]";
    }
  }
};

export const useStorageHealthCheck = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<StorageHealthCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const storageBaseUrl = useMemo(() => {
    const anyClient = supabase as any;
    const raw = anyClient?.storageUrl ?? anyClient?.supabaseUrl ?? null;
    // Ensure we return a string, not a URL object
    if (raw === null || raw === undefined) return null;
    if (typeof raw === "string") return raw;
    if (typeof raw === "object" && typeof raw.toString === "function") return String(raw);
    return null;
  }, []);

  const run = useCallback(async () => {
    setIsRunning(true);
    setError(null);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (sessionError || !userId) {
        const r: StorageHealthCheckResult = {
          checkedAt: new Date().toISOString(),
          session: { ok: false, error: sessionError ?? { reason: "missing session" } },
          artistProfile: { ok: false, artistProfileId: null },
          storageBaseUrl,
          listBuckets: { ok: false, error: "Unauthorized" },
          testUpload: { ok: false, error: "Unauthorized" },
        };
        setResult(r);
        return r;
      }

      const { data: ap } = await supabase
        .from("artist_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      const artistProfileId = ap?.id ?? null;

      const { data, error: fnError } = await supabase.functions.invoke("storage-health-check", {
        body: { artistProfileId },
      });

      if (fnError) {
        const http = await extractHttp(fnError);
        const r: StorageHealthCheckResult = {
          checkedAt: new Date().toISOString(),
          session: { ok: true, userId },
          artistProfile: { ok: Boolean(artistProfileId), artistProfileId },
          storageBaseUrl,
          listBuckets: { ok: false, error: { fnError, http } },
          testUpload: { ok: false, error: { fnError, http } },
        };
        setResult(r);
        return r;
      }

      const r: StorageHealthCheckResult = {
        checkedAt: data?.checkedAt ?? new Date().toISOString(),
        session: data?.session?.ok ? { ok: true, userId: data?.session?.userId ?? userId } : { ok: false, error: data?.session?.error },
        artistProfile: { ok: Boolean(data?.artistProfile?.ok), artistProfileId: data?.artistProfile?.artistProfileId ?? artistProfileId },
        storageBaseUrl,
        listBuckets: data?.listBuckets?.ok ? { ok: true, buckets: data?.listBuckets?.buckets ?? [] } : { ok: false, error: data?.listBuckets?.error },
        testUpload: data?.testUpload?.ok
          ? { ok: true, bucket: data?.testUpload?.bucket, path: data?.testUpload?.path, url: data?.testUpload?.url }
          : { ok: false, ...(data?.testUpload ?? {}) },
      };
      setResult(r);
      return r;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setIsRunning(false);
    }
  }, [storageBaseUrl]);

  useEffect(() => {
    // Auto-run once on mount for quick feedback
    run();
  }, [run]);

  return { isRunning, result, error, run, safeStringify };
};

async function extractHttp(fnError: any) {
  try {
    const ctx = fnError?.context;
    if (ctx && typeof ctx === "object" && typeof ctx.clone === "function" && typeof ctx.text === "function") {
      const text = await ctx.clone().text().catch(() => undefined);
      return { status: ctx.status, statusText: ctx.statusText, responseText: text };
    }
  } catch {
    // ignore
  }
  return undefined;
}

export { safeStringify };
