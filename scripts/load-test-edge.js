import { performance } from "node:perf_hooks";

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
  const base = "https://yjytuglxpvdkyvjsdyfk.functions.supabase.co";
  const headers = {
    "Content-Type": "application/json",
  };

  const tests = [
    {
      name: "validate-fan-invite (invalid token)",
      url: `${base}/validate-fan-invite`,
      body: { token: "load_test_invalid_token" },
      headers,
      totalRequests: 120,
      concurrency: 6,
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
      totalRequests: 120,
      concurrency: 6,
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
