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

async function signRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: string,
  accessKeyId: string,
  secretAccessKey: string,
): Promise<Record<string, string>> {
  const parsedUrl = new URL(url);
  const host = parsedUrl.host;
  const path = parsedUrl.pathname;
  const queryString = [...parsedUrl.searchParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dateStamp = amzDate.slice(0, 8);
  const region = "auto";
  const service = "s3";

  const payloadHash = await sha256Hex(body);

  const signedHeadersList = ["content-type", "host", "x-amz-content-sha256", "x-amz-date"];
  const allHeaders: Record<string, string> = {
    ...headers,
    host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
  };

  const canonicalHeaders = signedHeadersList
    .map(h => `${h}:${allHeaders[h]}\n`)
    .join("");
  const signedHeaders = signedHeadersList.join(";");

  const canonicalRequest = [
    method,
    path,
    queryString,
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

  return {
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
    Authorization: authorization,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let stage = "init";
  try {
    console.log("COMPLETE: start");
    stage = "auth";

    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized", stage }), {
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
      return new Response(JSON.stringify({ error: "Invalid token", stage }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Body ──
    stage = "parse";
    const { uploadId, key, parts } = await req.json();
    if (!uploadId || !key || !Array.isArray(parts) || parts.length === 0) {
      return new Response(JSON.stringify({ error: "Missing uploadId, key, or parts", stage }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Build XML ──
    stage = "xml";
    const sortedParts = [...parts].sort((a: any, b: any) => a.partNumber - b.partNumber);

    const xmlBody =
      `<CompleteMultipartUpload>` +
      sortedParts.map((p: any) => {
        const etagClean = String(p.etag ?? "").replace(/^"+|"+$/g, "");
        return (
          `<Part>` +
          `<PartNumber>${p.partNumber}</PartNumber>` +
          `<ETag>${etagClean}</ETag>` +
          `</Part>`
        );
      }).join("") +
      `</CompleteMultipartUpload>`;
    console.log("COMPLETE: xml built", `parts=${sortedParts.length}`);

    // ── Sign & fetch ──
    stage = "sign";
    const accountId = Deno.env.get("R2_ACCOUNT_ID")!;
    const bucket = Deno.env.get("R2_BUCKET_NAME")!;
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;

    const r2Url = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}?uploadId=${encodeURIComponent(uploadId)}`;

    const baseHeaders: Record<string, string> = {
      "content-type": "application/xml",
    };

    const sigHeaders = await signRequest("POST", r2Url, baseHeaders, xmlBody, accessKeyId, secretAccessKey);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);

    console.log("COMPLETE: fetch sent");
    stage = "fetch";

    const resp = await fetch(r2Url, {
      method: "POST",
      headers: { ...baseHeaders, ...sigHeaders },
      body: xmlBody,
      signal: controller.signal,
    });
    clearTimeout(timer);

    console.log(`COMPLETE: fetch status ${resp.status}`);
    stage = "response";

    const respText = await resp.text();

    if (!resp.ok) {
      console.error("COMPLETE: R2 error body:", respText);
      return new Response(
        JSON.stringify({ error: `R2 returned ${resp.status}`, stage, detail: respText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Success ──
    const publicBaseUrl = Deno.env.get("R2_PUBLIC_BASE_URL")!.replace(/\/+$/, "");
    const publicUrl = `${publicBaseUrl}/${key}`;

    console.log(`COMPLETE: done key=${key} publicUrl=${publicUrl}`);

    return new Response(
      JSON.stringify({ publicUrl, key, stage: "done" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    const isTimeout = err?.name === "AbortError";
    console.error(`COMPLETE: error at stage=${stage}`, isTimeout ? "TIMEOUT" : msg);
    return new Response(
      JSON.stringify({
        error: isTimeout ? "R2 complete timed out after 20s" : msg,
        stage,
        timeout: isTimeout,
      }),
      { status: isTimeout ? 504 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
