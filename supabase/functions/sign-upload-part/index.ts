import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { S3Client, UploadPartCommand } from "npm:@aws-sdk/client-s3@3.700.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.700.0";
import { EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY } from "../_shared/external-supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth (validate against external project) ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return json({ error: "Invalid token" }, 401);
    }

    // ── Body ──
    const { uploadId, key, partNumber } = await req.json();
    if (!uploadId || !key || !partNumber) {
      return json({ error: "Missing uploadId, key, or partNumber" }, 400);
    }

    const pn = Number(partNumber);
    if (!Number.isFinite(pn) || pn < 1) {
      return json({ error: "Invalid partNumber" }, 400);
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

    const cmd = new UploadPartCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      PartNumber: pn,
    });

    const presignedUrl = await getSignedUrl(s3, cmd, { expiresIn: 600 });

    console.log(`[sign-upload-part] Signed part ${pn} for key=${key}`);

    return json({ presignedUrl });
  } catch (err) {
    console.error("[sign-upload-part] Error:", err);
    return json(
      { error: err instanceof Error ? err.message : "Internal error" },
      500
    );
  }
});
