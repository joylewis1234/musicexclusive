import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StorageHealthCheckResult = {
  checkedAt: string;
  session: { ok: boolean; userId?: string; error?: unknown };
  storageBaseUrl: string | null;
  listBuckets: { ok: boolean; buckets?: Array<{ id: string; name: string; public: boolean }>; error?: unknown };
  testUpload: { ok: boolean; bucket: string; path?: string; url?: string; error?: unknown };
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
          storageBaseUrl,
          listBuckets: { ok: false, error: "Unauthorized" },
          testUpload: { ok: false, bucket: "track_covers", error: "Unauthorized" },
        };
        setResult(r);
        return r;
      }

      // 1) list buckets (client-side) — may be blocked depending on backend permissions
      let listBuckets: StorageHealthCheckResult["listBuckets"] = { ok: false, error: "not run" };
      try {
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        if (bucketsError) throw bucketsError;
        listBuckets = {
          ok: true,
          buckets: (buckets ?? []).map((b) => ({ id: b.id, name: b.name, public: b.public })),
        };
      } catch (e) {
        listBuckets = { ok: false, error: e };
      }

      // 2) test upload (client-side) into track_covers/test.txt as requested
      let testUpload: StorageHealthCheckResult["testUpload"] = { ok: false, bucket: "track_covers" };
      try {
        const path = "test.txt";
        const content = new Blob([new Uint8Array(1024)], { type: "text/plain" });
        const { data, error: uploadError } = await supabase.storage.from("track_covers").upload(path, content, {
          cacheControl: "60",
          upsert: true,
          contentType: "text/plain",
        });
        if (uploadError || !data?.path) throw uploadError ?? new Error("Upload returned no path");

        const { data: urlData } = supabase.storage.from("track_covers").getPublicUrl(data.path);
        testUpload = { ok: true, bucket: "track_covers", path: data.path, url: urlData.publicUrl };
      } catch (e) {
        testUpload = { ok: false, bucket: "track_covers", error: e };
      }

      const r: StorageHealthCheckResult = {
        checkedAt: new Date().toISOString(),
        session: { ok: true, userId },
        storageBaseUrl,
        listBuckets,
        testUpload,
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

export { safeStringify };
