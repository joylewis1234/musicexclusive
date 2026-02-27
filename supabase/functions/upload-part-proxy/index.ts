import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { S3Client, UploadPartCommand } from "npm:@aws-sdk/client-s3@3.700.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Missing Authorization" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } =
    await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return json({ error: "Unauthorized" }, 401);
  }

  // Metadata via query params
  const url = new URL(req.url);
  const uploadId = url.searchParams.get("uploadId");
  const key = url.searchParams.get("key");
  const partNumberRaw = url.searchParams.get("partNumber");

  if (!uploadId || !key || !partNumberRaw) {
    return json({ error: "Missing uploadId, key, or partNumber" }, 400);
  }

  const partNumber = Number.parseInt(partNumberRaw, 10);
  if (!Number.isFinite(partNumber) || partNumber < 1) {
    return json({ error: "Invalid partNumber" }, 400);
  }

  const body = new Uint8Array(await req.arrayBuffer());

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
    PartNumber: partNumber,
    Body: body,
  });

  try {
    const result = await s3.send(cmd);
    console.log(`[upload-part-proxy] Part ${partNumber} uploaded for key=${key}`);
    return json({ etag: result.ETag ?? null }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "UploadPart failed";
    console.error(`[upload-part-proxy] Error part ${partNumber}:`, msg);
    return json({ error: msg }, 500);
  }
});
