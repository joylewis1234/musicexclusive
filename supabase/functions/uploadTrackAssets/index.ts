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

const getFileExt = (name: string) => {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
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

const sanitizeBase = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "track";

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

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
    const coverFile = form.get("coverFile");
    const audioFile = form.get("audioFile");
    const artistId = form.get("artistId");
    const title = form.get("title");
    const genre = form.get("genre");

    if (!(coverFile instanceof File)) return json({ error: "Missing coverFile" }, 400);
    if (!(audioFile instanceof File)) return json({ error: "Missing audioFile" }, 400);
    if (typeof artistId !== "string" || !artistId || !isUuid(artistId)) {
      return json({ error: "Invalid artistId" }, 400);
    }
    if (typeof title !== "string" || !title.trim() || title.trim().length > 100) {
      return json({ error: "Invalid title" }, 400);
    }
    if (typeof genre !== "string" || !genre.trim() || genre.trim().length > 50) {
      return json({ error: "Invalid genre" }, 400);
    }

    // Ensure the authenticated user owns the artist profile.
    const { data: ap, error: apError } = await supabaseAdmin
      .from("artist_profiles")
      .select("id")
      .eq("id", artistId)
      .eq("user_id", userId)
      .maybeSingle();
    if (apError || !ap?.id) return json({ error: "Forbidden" }, 403);

    const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
    const MAX_AUDIO_SIZE = 50 * 1024 * 1024;

    if (coverFile.size > MAX_IMAGE_SIZE) return json({ error: "Image size must be less than 10MB" }, 413);
    if (audioFile.size > MAX_AUDIO_SIZE) return json({ error: "Audio size must be less than 50MB" }, 413);

    const coverType = normalizeImageType(coverFile);
    if (!coverType) return json({ error: "Please upload a JPG, PNG, or WEBP image" }, 415);
    const audioType = normalizeAudioType(audioFile);
    if (!audioType) return json({ error: "Please upload an MP3 file" }, 415);

    const safeBase = sanitizeBase(title);
    const timestamp = Date.now();

    const coverExt = getFileExt(coverFile.name) || ".jpg";
    const audioExt = ".mp3"; // we only allow MP3

    const coverPath = `artists/${artistId}/covers/${safeBase}-cover-${timestamp}${coverExt}`;
    const audioPath = `artists/${artistId}/audio/${safeBase}-full-${timestamp}${audioExt}`;

    // 1) upload cover
    const { data: coverData, error: coverError } = await supabaseAdmin.storage
      .from("track_covers")
      .upload(coverPath, coverFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: coverType,
      });
    if (coverError || !coverData?.path) {
      return json({
        error: coverError?.message ?? "Cover upload failed",
        stage: "cover",
        details: safeError(coverError),
      }, 500);
    }

    // 2) upload audio
    const { data: audioData, error: audioError } = await supabaseAdmin.storage
      .from("track_audio")
      .upload(audioPath, audioFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: audioType,
      });
    if (audioError || !audioData?.path) {
      return json({
        error: audioError?.message ?? "Audio upload failed",
        stage: "audio",
        details: safeError(audioError),
      }, 500);
    }

    const { data: coverUrlData } = supabaseAdmin.storage.from("track_covers").getPublicUrl(coverData.path);
    const { data: audioUrlData } = supabaseAdmin.storage.from("track_audio").getPublicUrl(audioData.path);

    return json({
      coverUrl: coverUrlData.publicUrl,
      audioUrl: audioUrlData.publicUrl,
      coverPath: coverData.path,
      audioPath: audioData.path,
    });
  } catch (err) {
    return json({ error: "Unexpected error", details: safeError(err) }, 500);
  }
});
