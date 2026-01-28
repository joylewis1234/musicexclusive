import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const safeError = (err: unknown) => {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      ...(err as any),
    };
  }
  return err;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "Server misconfigured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({
      session: { ok: false, reason: "missing bearer token" },
      supabaseUrl,
      listBuckets: { ok: false, error: "Unauthorized" },
      testUpload: { ok: false, error: "Unauthorized" },
    }, 401);
  }
  const token = authHeader.replace("Bearer ", "");

  const supabaseAuth = createClient(supabaseUrl, anonKey);
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  try {
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return json({
        session: { ok: false, error: safeError(claimsError ?? "missing claims") },
        supabaseUrl,
        listBuckets: { ok: false, error: "Unauthorized" },
        testUpload: { ok: false, error: "Unauthorized" },
      }, 401);
    }

    const userId = claimsData.claims.sub;
    const body = await req.json().catch(() => ({} as any));
    const artistProfileId = typeof body?.artistProfileId === "string" ? body.artistProfileId : null;

    let artistOk = false;
    if (artistProfileId) {
      const { data: ap } = await supabaseAdmin
        .from("artist_profiles")
        .select("id")
        .eq("id", artistProfileId)
        .eq("user_id", userId)
        .maybeSingle();
      artistOk = Boolean(ap?.id);
    }

    // list buckets
    let listBuckets: any = { ok: true };
    try {
      const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
      if (error) throw error;
      listBuckets = {
        ok: true,
        buckets: (buckets ?? []).map((b) => ({ id: b.id, name: b.name, public: b.public })),
      };
    } catch (err) {
      listBuckets = { ok: false, error: safeError(err) };
    }

    // test upload 1KB
    let testUpload: any = { ok: false, skipped: true, reason: "missing/invalid artistProfileId" };
    if (artistProfileId && artistOk) {
      const path = `artists/${artistProfileId}/_health/${Date.now()}.txt`;
      try {
        const content = new Blob([new Uint8Array(1024)], { type: "text/plain" });
        const { data, error } = await supabaseAdmin.storage.from("track_covers").upload(path, content, {
          cacheControl: "60",
          upsert: true,
          contentType: "text/plain",
        });
        if (error || !data?.path) throw error ?? new Error("Upload returned no path");
        const { data: urlData } = supabaseAdmin.storage.from("track_covers").getPublicUrl(data.path);

        // Best-effort cleanup
        supabaseAdmin.storage.from("track_covers").remove([data.path]).catch(() => {});

        testUpload = {
          ok: true,
          bucket: "track_covers",
          path: data.path,
          url: urlData.publicUrl,
        };
      } catch (err) {
        testUpload = {
          ok: false,
          bucket: "track_covers",
          path,
          error: safeError(err),
        };
      }
    }

    return json({
      session: { ok: true, userId },
      artistProfile: { ok: artistOk, artistProfileId },
      supabaseUrl,
      listBuckets,
      testUpload,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    return json({ error: safeError(err) }, 500);
  }
});
