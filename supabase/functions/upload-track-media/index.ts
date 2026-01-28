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

const getFileExt = (name: string) => {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
};

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

const normalizeImageType = (file: File): string | null => {
  const ext = getFileExt(file.name);
  const t = (file.type || "").toLowerCase();
  const isOctetStream = t === "application/octet-stream";

  if (t === "image/jpg") return "image/jpeg";
  if (t === "image/jpeg" || t === "image/png" || t === "image/webp") return t;

  if (!t || isOctetStream) {
    if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
    if (ext === ".png") return "image/png";
    if (ext === ".webp") return "image/webp";
  }
  return null;
};

const normalizeAudioType = (file: File): string | null => {
  const ext = getFileExt(file.name);
  const t = (file.type || "").toLowerCase();
  const isOctetStream = t === "application/octet-stream";

  if (t === "audio/mp3") return "audio/mpeg";
  if (t === "audio/mpeg") return "audio/mpeg";
  if (!t || isOctetStream) {
    if (ext === ".mp3") return "audio/mpeg";
  }
  return null;
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
    return json({ error: "Unauthorized" }, 401);
  }
  const token = authHeader.replace("Bearer ", "");

  const supabaseAuth = createClient(supabaseUrl, anonKey);
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  try {
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return json({ error: "Unauthorized", details: safeError(claimsError) }, 401);
    }

    const userId = claimsData.claims.sub;
    const form = await req.formData();
    const file = form.get("file");
    const kind = form.get("kind");
    const artistProfileId = form.get("artistProfileId");
    const base = form.get("base");

    if (!(file instanceof File)) return json({ error: "Missing file" }, 400);
    if (typeof kind !== "string" || (kind !== "cover" && kind !== "audio")) {
      return json({ error: "Invalid kind" }, 400);
    }
    if (typeof artistProfileId !== "string" || !artistProfileId) {
      return json({ error: "Missing artistProfileId" }, 400);
    }

    const { data: ap, error: apError } = await supabaseAdmin
      .from("artist_profiles")
      .select("id")
      .eq("id", artistProfileId)
      .eq("user_id", userId)
      .maybeSingle();
    if (apError || !ap?.id) return json({ error: "Forbidden" }, 403);

    const baseStr = typeof base === "string" ? base : "track";
    const safeBase = baseStr.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60) || "track";

    const isCover = kind === "cover";
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
    const MAX_AUDIO_SIZE = 50 * 1024 * 1024;

    if (isCover && file.size > MAX_IMAGE_SIZE) return json({ error: "Image size must be less than 10MB" }, 413);
    if (!isCover && file.size > MAX_AUDIO_SIZE) return json({ error: "Audio size must be less than 50MB" }, 413);

    const contentType = isCover ? normalizeImageType(file) : normalizeAudioType(file);
    if (!contentType) {
      return json({ error: isCover ? "Please upload a JPG, PNG, or WEBP image" : "Please upload an MP3 file" }, 415);
    }

    const ext = getFileExt(file.name) || (isCover ? ".jpg" : ".mp3");
    const folder = isCover ? "covers" : "audio";
    const bucket = isCover ? "track_covers" : "track_audio";
    const path = `artists/${artistProfileId}/${folder}/${safeBase}-${Date.now()}${ext}`;

    const { data, error } = await supabaseAdmin.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType,
    });
    if (error || !data?.path) {
      return json({ error: error?.message ?? "Upload failed", details: safeError(error) }, 500);
    }

    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(data.path);
    return json({ url: urlData.publicUrl, path: data.path, bucket }, 200);
  } catch (err) {
    return json({ error: safeError(err) }, 500);
  }
});
