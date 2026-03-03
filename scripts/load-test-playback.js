import { createClient } from "@supabase/supabase-js";
import { performance } from "node:perf_hooks";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

async function main() {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const supabaseAnonKey = requireEnv("SUPABASE_ANON_KEY");
  const email = requireEnv("TEST_FAN_EMAIL");
  const password = requireEnv("TEST_FAN_PASSWORD");
  const trackId = requireEnv("TEST_TRACK_ID");
  const fileType = process.env.TEST_FILE_TYPE || "audio";

  const totalRequests = toInt(process.env.PLAYBACK_REQUESTS, 20);
  const concurrency = toInt(process.env.PLAYBACK_CONCURRENCY, 5);
  const refreshMs = toInt(process.env.PLAYBACK_REFRESH_MS, 45000);

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (authError || !authData.user) {
    throw new Error(`Auth failed: ${authError?.message || "no user"}`);
  }

  const accessToken = authData.session?.access_token;
  if (!accessToken) {
    throw new Error("Missing access token after sign-in.");
  }

  const functionsBase = supabaseUrl.replace(".supabase.co", ".functions.supabase.co");
  const mintUrl = async () => {
    const mintResponse = await fetch(`${functionsBase}/mint-playback-url`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ trackId, fileType }),
    });

    const mintText = await mintResponse.text();
    if (!mintResponse.ok) {
      throw new Error(`Failed to mint playback URL: ${mintText || mintResponse.status}`);
    }

    let mintData;
    try {
      mintData = mintText ? JSON.parse(mintText) : null;
    } catch {
      mintData = null;
    }

    if (!mintData?.url) {
      throw new Error("Failed to mint playback URL: missing url");
    }
    return mintData.url;
  };

  let signedUrl = await mintUrl();
  let mintedAt = Date.now();

  let inFlight = 0;
  let started = 0;
  let success = 0;
  let failure = 0;
  const statusCounts = {};
  const errorSamples = {};
  const latencies = [];

  const startTime = performance.now();

  await new Promise((resolve) => {
    const launchNext = () => {
      while (inFlight < concurrency && started < totalRequests) {
        started += 1;
        inFlight += 1;
        const requestStart = performance.now();

        const runRequest = async () => {
          const now = Date.now();
          if (now - mintedAt > refreshMs) {
            signedUrl = await mintUrl();
            mintedAt = Date.now();
          }

          const res = await fetch(signedUrl, { method: "GET" });
          const status = res.status;
          statusCounts[status] = (statusCounts[status] || 0) + 1;
          if (res.ok) {
            success += 1;
            try {
              await res.arrayBuffer();
            } catch {
              // ignore
            }
          } else {
            failure += 1;
            const text = await res.text();
            const message = text ? text.slice(0, 200) : "non_ok_response";
            const key = `${status}:${message}`;
            errorSamples[key] = (errorSamples[key] || 0) + 1;
          }
        };

        runRequest()
          .catch(() => {
            failure += 1;
            statusCounts[0] = (statusCounts[0] || 0) + 1;
            errorSamples["0:network_error"] = (errorSamples["0:network_error"] || 0) + 1;
          })
          .finally(() => {
            const requestEnd = performance.now();
            latencies.push(requestEnd - requestStart);
            inFlight -= 1;

            if (started >= totalRequests && inFlight === 0) {
              resolve();
              return;
            }
            launchNext();
          });
      }
    };
    launchNext();
  });

  const endTime = performance.now();
  const durationMs = endTime - startTime;
  const rps = totalRequests / (durationMs / 1000);
  const sorted = [...latencies].sort((a, b) => a - b);
  const p = (pct) => sorted[Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1)];

  const report = {
    generatedAt: new Date().toISOString(),
    requestPlan: {
      totalRequests,
      concurrency,
      fileType,
    },
    results: {
      success,
      failure,
      statusCounts,
      errorSamples,
      durationMs: Math.round(durationMs),
      rps: Number(rps.toFixed(2)),
      latency: {
        minMs: Math.round(sorted[0] ?? 0),
        p50Ms: Math.round(p(50) ?? 0),
        p95Ms: Math.round(p(95) ?? 0),
        p99Ms: Math.round(p(99) ?? 0),
        maxMs: Math.round(sorted[sorted.length - 1] ?? 0),
      },
    },
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Playback load test failed:", err.message || err);
  process.exit(1);
});
