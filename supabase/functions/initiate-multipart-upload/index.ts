import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { S3Client, CreateMultipartUploadCommand } from "npm:@aws-sdk/client-s3@3.700.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PART_SIZE = 5_242_880; // 5 MB

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;

    // ── Body ──
    const { trackId, contentType, fileName } = await req.json();
    if (!trackId || !contentType || !fileName) {
      return new Response(JSON.stringify({ error: "Missing trackId, contentType, or fileName" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Verify artist owns track ──
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: track, error: trackErr } = await adminClient
      .from("tracks")
      .select("id, artist_id")
      .eq("id", trackId)
      .single();

    if (trackErr || !track) {
      return new Response(JSON.stringify({ error: "Track not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check artist profile ownership
    const { data: profile } = await adminClient
      .from("artist_profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!profile || track.artist_id !== profile.id) {
      return new Response(JSON.stringify({ error: "Not authorized for this track" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── S3 / R2 ──
    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${Deno.env.get("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
        secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
      },
    });

    const bucket = Deno.env.get("R2_BUCKET_NAME")!;
    const ext = fileName.split(".").pop()?.toLowerCase() || "mp3";
    const key = `artists/${profile.id}/${trackId}.${ext}`;

    const cmd = new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const result = await s3.send(cmd);

    console.log(`[initiate-multipart] Created upload: key=${key}, uploadId=${result.UploadId}`);

    return new Response(
      JSON.stringify({
        uploadId: result.UploadId,
        key,
        partSize: PART_SIZE,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[initiate-multipart] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
