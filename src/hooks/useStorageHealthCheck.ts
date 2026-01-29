import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StorageHealthCheckResult = {
  checkedAt: string;
  session: { ok: boolean; userId?: string; error?: unknown };
  storageBaseUrl: string | null;
  listBuckets: {
    ok: boolean;
    buckets?: Array<{ id: string; name: string; public: boolean }>;
    raw?: unknown;
    error?: unknown;
  };
  testUpload: {
    ok: boolean;
    bucket: string;
    path?: string;
    url?: string;
    raw?: unknown;
    error?: unknown;
  };
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
    // supabase-js usually derives Storage URL from supabaseUrl; some builds expose storageUrl
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
        if (sessionError) console.error("[storage-health-check] session error", sessionError);
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
          raw: buckets ?? [],
        };
      } catch (e) {
        console.error("[storage-health-check] listBuckets error", e);
        listBuckets = { ok: false, error: e };
      }

      // 2) test upload (client-side) into track_covers/test.jpg (image/jpeg)
      let testUpload: StorageHealthCheckResult["testUpload"] = { ok: false, bucket: "track_covers" };
      try {
        const path = `test-${Date.now()}.jpg`;
        // Minimal JPEG header/body (then padded to ~1KB)
        const minimalJpeg = new Uint8Array([
          0xff, 0xd8, // SOI
          0xff, 0xe0, 0x00, 0x10, // APP0
          0x4a, 0x46, 0x49, 0x46, 0x00, // JFIF\0
          0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
          0xff, 0xd9, // EOI
        ]);
        const jpegBytes = new Uint8Array(1024);
        jpegBytes.set(minimalJpeg, 0);
        const content = new Blob([jpegBytes], { type: "image/jpeg" });
        const { data, error: uploadError } = await supabase.storage.from("track_covers").upload(path, content, {
          cacheControl: "60",
          upsert: true,
          contentType: "image/jpeg",
        });
        if (uploadError || !data?.path) throw uploadError ?? new Error("Upload returned no path");

        const { data: urlData } = supabase.storage.from("track_covers").getPublicUrl(data.path);
        testUpload = {
          ok: true,
          bucket: "track_covers",
          path: data.path,
          url: urlData.publicUrl,
          raw: { upload: data, publicUrl: urlData },
        };
      } catch (e) {
        console.error("[storage-health-check] testUpload error", e);
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
      console.error("[storage-health-check] unexpected error", e);
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
