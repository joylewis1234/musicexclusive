import { performance } from "node:perf_hooks";

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const TEST_FAN_EMAIL = process.env.TEST_FAN_EMAIL;
const TEST_FAN_PASSWORD = process.env.TEST_FAN_PASSWORD;
const TEST_TRACK_ID = process.env.TEST_TRACK_ID;

const PLAYBACK_REQUESTS = parseInt(process.env.PLAYBACK_REQUESTS || "200", 10);
const PLAYBACK_CONCURRENCY = parseInt(process.env.PLAYBACK_CONCURRENCY || "20", 10);
const PLAYBACK_REFRESH_MS = parseInt(process.env.PLAYBACK_REFRESH_MS || "30000", 10);

if (!SUPABASE_URL || !ANON_KEY || !TEST_FAN_EMAIL || !TEST_FAN_PASSWORD || !TEST_TRACK_ID) {
  console.error("Required env vars: SUPABASE_URL, SUPABASE_ANON_KEY, TEST_FAN_EMAIL, TEST_FAN_PASSWORD, TEST_TRACK_ID");
  process.exit(1);
}

const FUNCTIONS_URL = SUPABASE_URL.replace(/\/$/, "").replace(/\.supabase\.co$/, ".functions.supabase.co");

async function authenticate() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: TEST_FAN_EMAIL, password: TEST_FAN_PASSWORD }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Auth failed (${res.status}): ${text}`);
    process.exit(1);
  }
  const data = await res.json();
  return data.access_token;
}

async function runLoadTest({ name, url, body, headers, totalRequests, concurrency }) {
  const latencies = [];
  let success = 0;
  let failure = 0;
  const statusCounts = {};
  let inFlight = 0;
  let started = 0;

  return new Promise((resolve) => {
    const startTime = performance.now();

    const launchNext = () => {
      while (inFlight < concurrency && started < totalRequests) {
        started += 1;
        inFlight += 1;
        const requestStart = performance.now();

        fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        })
          .then((res) => {
            statusCounts[res.status] = (statusCounts[res.status] || 0) + 1;
            if (res.ok) {
              success += 1;
            } else {
              failure += 1;
            }
            return res.text();
          })
          .catch(() => {
            failure += 1;
          })
          .finally(() => {
            latencies.push(performance.now() - requestStart);
            inFlight -= 1;

            if (started >= totalRequests && inFlight === 0) {
              const endTime = performance.now();
              resolve({
                name,
                totalRequests,
                success,
                failure,
                durationMs: endTime - startTime,
                latencies,
                statusCounts,
              });
              return;
            }

            launchNext();
          });
      }
    };

    launchNext();
  });
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function formatResult(result) {
  const { name, totalRequests, success, failure, durationMs, latencies, statusCounts } = result;
  const rps = totalRequests / (durationMs / 1000);

  return {
    name,
    totalRequests,
    success,
    failure,
    durationMs: Math.round(durationMs),
    rps: Number(rps.toFixed(2)),
    latency: {
      minMs: Math.round(Math.min(...latencies)),
      p50Ms: Math.round(percentile(latencies, 50)),
      p95Ms: Math.round(percentile(latencies, 95)),
      p99Ms: Math.round(percentile(latencies, 99)),
      maxMs: Math.round(Math.max(...latencies)),
    },
    statusCounts,
  };
}

async function main() {
  console.log(`Playback load test: ${PLAYBACK_REQUESTS} requests, concurrency ${PLAYBACK_CONCURRENCY}, refresh ${PLAYBACK_REFRESH_MS}ms`);

  const jwt = await authenticate();

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${jwt}`,
    apikey: ANON_KEY,
  };

  const result = await runLoadTest({
    name: "mint-playback-url (playback load test)",
    url: `${FUNCTIONS_URL}/mint-playback-url`,
    body: { trackId: TEST_TRACK_ID, fileType: "preview" },
    headers,
    totalRequests: PLAYBACK_REQUESTS,
    concurrency: PLAYBACK_CONCURRENCY,
  });

  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), refreshMs: PLAYBACK_REFRESH_MS, results: [formatResult(result)] }, null, 2));
}

main().catch((err) => {
  console.error("Playback load test failed:", err);
  process.exit(1);
});
