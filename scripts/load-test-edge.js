import { performance } from "node:perf_hooks";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

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

async function runLoadTest({
  name,
  url,
  body,
  bodyFactory,
  headers,
  totalRequests,
  concurrency,
}) {
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
        const payload = bodyFactory ? bodyFactory() : body;
        fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
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
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const supabaseAnonKey = requireEnv("SUPABASE_ANON_KEY");
  const email = requireEnv("TEST_FAN_EMAIL");
  const password = requireEnv("TEST_FAN_PASSWORD");
  const trackId = requireEnv("TEST_TRACK_ID");

  const base = supabaseUrl.replace(".supabase.co", ".functions.supabase.co");
  const headers = {
    "Content-Type": "application/json",
  };

  const totalRequests = toInt(process.env.EDGE_REQUESTS, 200);
  const concurrency = toInt(process.env.EDGE_CONCURRENCY, 12);
  const mintRequests = toInt(process.env.MINT_REQUESTS, 200);
  const mintConcurrency = toInt(process.env.MINT_CONCURRENCY, 20);
  const chargeRequests = toInt(process.env.CHARGE_REQUESTS, 200);
  const chargeConcurrency = toInt(process.env.CHARGE_CONCURRENCY, 20);

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (authError || !authData.session?.access_token) {
    throw new Error(`Auth failed: ${authError?.message || "no token"}`);
  }

  const authHeaders = {
    ...headers,
    Authorization: `Bearer ${authData.session.access_token}`,
  };

  const tests = [
    {
      name: "validate-fan-invite (invalid token)",
      url: `${base}/validate-fan-invite`,
      body: { token: "load_test_invalid_token" },
      headers,
      totalRequests,
      concurrency,
    },
    {
      name: "validate-vault-code (lookup, non-existent)",
      url: `${base}/validate-vault-code`,
      body: {
        email: "loadtest+missing@example.com",
        vaultCode: "ZZZZ",
        mode: "lookup",
      },
      headers,
      totalRequests,
      concurrency,
    },
    {
      name: "mint-playback-url (audio)",
      url: `${base}/mint-playback-url`,
      body: { trackId, fileType: "audio" },
      headers: authHeaders,
      totalRequests: mintRequests,
      concurrency: mintConcurrency,
    },
    {
      name: "charge-stream",
      url: `${base}/charge-stream`,
      bodyFactory: () => ({ trackId, idempotencyKey: randomUUID() }),
      headers: authHeaders,
      totalRequests: chargeRequests,
      concurrency: chargeConcurrency,
    },
  ];

  const results = [];
  for (const test of tests) {
    // eslint-disable-next-line no-console
    console.log(`Running: ${test.name}`);
    const result = await runLoadTest(test);
    results.push(formatResult(result));
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Load test failed:", err);
  process.exit(1);
});
