import { performance } from "node:perf_hooks";

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const TEST_FAN_EMAIL = process.env.TEST_FAN_EMAIL;
const TEST_FAN_PASSWORD = process.env.TEST_FAN_PASSWORD;
const TEST_TRACK_ID = process.env.TEST_TRACK_ID;

const EDGE_REQUESTS = parseInt(process.env.EDGE_REQUESTS || "200", 10);
const EDGE_CONCURRENCY = parseInt(process.env.EDGE_CONCURRENCY || "20", 10);
const MINT_REQUESTS = parseInt(process.env.MINT_REQUESTS || "200", 10);
const MINT_CONCURRENCY = parseInt(process.env.MINT_CONCURRENCY || "25", 10);
const CHARGE_REQUESTS = parseInt(process.env.CHARGE_REQUESTS || "80", 10);
const CHARGE_CONCURRENCY = parseInt(process.env.CHARGE_CONCURRENCY || "20", 10);

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("Required env vars: SUPABASE_URL, SUPABASE_ANON_KEY");
  process.exit(1);
}

const FUNCTIONS_URL = SUPABASE_URL.replace(/\/$/, "").replace(/\.supabase\.co$/, ".functions.supabase.co");

async function authenticate() {
  if (!TEST_FAN_EMAIL || !TEST_FAN_PASSWORD) {
    return null;
  }
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

async function runLoadTest({ name, url, body, bodyFn, headers, totalRequests, concurrency }) {
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
        const requestBody = bodyFn ? bodyFn() : body;

        fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
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
            const requestEnd = performance.now();
            latencies.push(requestEnd - requestStart);
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
  const publicHeaders = { "Content-Type": "application/json" };

  const tests = [
    {
      name: "validate-fan-invite (invalid token)",
      url: `${FUNCTIONS_URL}/validate-fan-invite`,
      body: { token: "load_test_invalid_token" },
      headers: publicHeaders,
      totalRequests: EDGE_REQUESTS,
      concurrency: EDGE_CONCURRENCY,
    },
    {
      name: "validate-vault-code (lookup, non-existent)",
      url: `${FUNCTIONS_URL}/validate-vault-code`,
      body: {
        email: "loadtest+missing@example.com",
        vaultCode: "ZZZZ",
        mode: "lookup",
      },
      headers: publicHeaders,
      totalRequests: EDGE_REQUESTS,
      concurrency: EDGE_CONCURRENCY,
    },
  ];

  // Authenticated tests require credentials + track ID
  const jwt = await authenticate();

  if (jwt && TEST_TRACK_ID) {
    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
      apikey: ANON_KEY,
    };

    tests.push({
      name: "mint-playback-url (preview, authenticated)",
      url: `${FUNCTIONS_URL}/mint-playback-url`,
      body: { trackId: TEST_TRACK_ID, fileType: "preview" },
      headers: authHeaders,
      totalRequests: MINT_REQUESTS,
      concurrency: MINT_CONCURRENCY,
    });

    tests.push({
      name: "charge-stream (authenticated, unique idempotency keys)",
      url: `${FUNCTIONS_URL}/charge-stream`,
      bodyFn: () => ({ trackId: TEST_TRACK_ID, idempotencyKey: crypto.randomUUID() }),
      headers: authHeaders,
      totalRequests: CHARGE_REQUESTS,
      concurrency: CHARGE_CONCURRENCY,
    });
  } else {
    console.log("Skipping authenticated tests (missing TEST_FAN_EMAIL, TEST_FAN_PASSWORD, or TEST_TRACK_ID)");
  }

  const results = [];

  for (const test of tests) {
    console.log(`Running: ${test.name}`);
    const result = await runLoadTest(test);
    results.push(formatResult(result));
  }

  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
}

main().catch((err) => {
  console.error("Load test failed:", err);
  process.exit(1);
});
