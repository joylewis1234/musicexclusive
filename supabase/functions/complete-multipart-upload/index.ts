import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { S3Client, CompleteMultipartUploadCommand } from "npm:@aws-sdk/client-s3@3.700.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    // ── Body ──
    const { uploadId, key, parts } = await req.json();
    if (!uploadId || !key || !Array.isArray(parts) || parts.length === 0) {
      return new Response(JSON.stringify({ error: "Missing uploadId, key, or parts" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── S3 / R2 complete ──
    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${Deno.env.get("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
        secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
      },
    });

    const bucket = Deno.env.get("R2_BUCKET_NAME")!;

    const cmd = new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts
          .sort((a: any, b: any) => a.partNumber - b.partNumber)
          .map((p: any) => ({
            PartNumber: p.partNumber,
            ETag: p.etag,
          })),
      },
    });

    await s3.send(cmd);

    const publicBaseUrl = Deno.env.get("R2_PUBLIC_BASE_URL")!.replace(/\/+$/, "");
    const publicUrl = `${publicBaseUrl}/${key}`;

    console.log(`[complete-multipart] Completed: key=${key}, publicUrl=${publicUrl}`);

    return new Response(
      JSON.stringify({ publicUrl, key }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[complete-multipart] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
