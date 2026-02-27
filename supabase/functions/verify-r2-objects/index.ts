import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* ── AWS Signature V4 helpers ── */

async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function getSignatureKey(secretKey: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(new TextEncoder().encode("AWS4" + secretKey), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}

async function checkObjectExists(
  key: string,
  accountId: string,
  bucket: string,
  accessKeyId: string,
  secretAccessKey: string,
): Promise<boolean> {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const url = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${encodedKey}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dateStamp = amzDate.slice(0, 8);
  const region = "auto";
  const service = "s3";
  const host = `${accountId}.r2.cloudflarestorage.com`;

  const payloadHash = await sha256Hex("");
  const signedHeadersList = ["host", "x-amz-content-sha256", "x-amz-date"];
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = signedHeadersList.join(";");

  const canonicalRequest = [
    "HEAD",
    `/${bucket}/${encodedKey}`,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signatureBuffer = await hmacSha256(signingKey, stringToSign);
  const signature = [...new Uint8Array(signatureBuffer)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const resp = await fetch(url, {
    method: "HEAD",
    headers: {
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
      Authorization: authorization,
    },
  });

  return resp.status === 200;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
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

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fullKey, artworkKey, previewKey } = await req.json();

    if (!fullKey || !artworkKey) {
      return new Response(JSON.stringify({ error: "Missing fullKey or artworkKey" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountId = Deno.env.get("R2_ACCOUNT_ID")!;
    const bucket = Deno.env.get("R2_BUCKET_NAME")!;
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;

    const keysToCheck: { name: string; key: string }[] = [
      { name: "fullKey", key: fullKey },
      { name: "artworkKey", key: artworkKey },
    ];
    if (previewKey) {
      keysToCheck.push({ name: "previewKey", key: previewKey });
    }

    const results = await Promise.all(
      keysToCheck.map(async ({ name, key }) => ({
        name,
        exists: await checkObjectExists(key, accountId, bucket, accessKeyId, secretAccessKey),
      }))
    );

    const missing = results.filter(r => !r.exists).map(r => r.name);

    if (missing.length === 0) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: false, missing }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("verify-r2-objects error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
