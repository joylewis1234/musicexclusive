import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  // Important: include all headers that browsers/supabase-js may send during CORS preflight
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    console.log("upload-track-cover request", {
      method: req.method,
      origin: req.headers.get("Origin"),
      hasAuth: Boolean(req.headers.get("Authorization")),
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return jsonResponse({ error: "Server misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseClient = createClient(supabaseUrl, anonKey);
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const userId = claimsData.claims.sub;

    const formData = await req.formData();
    const file = formData.get("file");
    const base = formData.get("base");

    if (!(file instanceof File)) {
      return jsonResponse({ error: "Missing file" }, 400);
    }
    const baseStr = typeof base === "string" ? base : "cover";

    // 10MB limit (matches client)
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_IMAGE_SIZE) {
      return jsonResponse({ error: "Image size must be less than 10MB" }, 413);
    }

    const contentType = normalizeImageType(file);
    if (!contentType) {
      return jsonResponse({ error: "Please upload a JPG, PNG, or WEBP image" }, 415);
    }

    const safeBase = baseStr.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60) || "cover";
    const ext = getFileExt(file.name) || ".jpg";
    const path = `${userId}/${safeBase}-cover-${Date.now()}${ext}`;

    const { data, error } = await supabaseAdmin.storage.from("track_covers").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType,
    });

    if (error || !data?.path) {
      return jsonResponse({ error: error?.message ?? "Upload failed" }, 500);
    }

    const { data: urlData } = supabaseAdmin.storage.from("track_covers").getPublicUrl(data.path);
    return jsonResponse({ url: urlData.publicUrl, path: data.path }, 200);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: msg }, 500);
  }
});
