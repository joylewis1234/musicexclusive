import { createClient } from "@supabase/supabase-js";
import { performance } from "node:perf_hooks";
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

async function main() {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const supabaseAnonKey = requireEnv("SUPABASE_ANON_KEY");
  const email = requireEnv("TEST_FAN_EMAIL");
  const password = requireEnv("TEST_FAN_PASSWORD");
  const trackId = requireEnv("TEST_TRACK_ID");

  const totalRequests = toInt(process.env.REQUESTS, 40);
  const concurrency = toInt(process.env.CONCURRENCY, 5);
  const allowOverspend = (process.env.ALLOW_OVERSPEND || "").toLowerCase() === "true";

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (authError || !authData.user) {
    throw new Error(`Auth failed: ${authError?.message || "no user"}`);
  }

  const fanUserId = authData.user.id;
  const accessToken = authData.session?.access_token;
  if (!accessToken) {
    throw new Error("Missing access token after sign-in.");
  }

  const functionsBase = supabaseUrl.replace(".supabase.co", ".functions.supabase.co");
  const requestHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const diagnosticResponse = await fetch(`${functionsBase}/charge-stream`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({ trackId, idempotencyKey: randomUUID() }),
  });

  const diagnosticText = await diagnosticResponse.text();
  if (!diagnosticResponse.ok) {
    const failureReport = {
      generatedAt: new Date().toISOString(),
      requestPlan: {
        totalRequests,
        plannedRequests: 0,
        concurrency,
        allowOverspend,
      },
      diagnostic: {
        status: diagnosticResponse.status,
        body: diagnosticText,
      },
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(failureReport, null, 2));
    return;
  }

  const { data: ledgerBefore, error: ledgerBeforeError } = await supabase
    .from("credit_ledger")
    .select("id")
    .eq("user_email", email)
    .eq("type", "STREAM_DEBIT")
    .like("reference", `stream_${trackId}_%`);

  if (ledgerBeforeError) {
    throw new Error(`Failed to read credit_ledger before test: ${ledgerBeforeError.message}`);
  }

  const { data: streamBefore, error: streamBeforeError } = await supabase
    .from("stream_ledger")
    .select("id")
    .eq("fan_email", email)
    .eq("track_id", trackId);

  if (streamBeforeError) {
    throw new Error(`Failed to read stream_ledger before test: ${streamBeforeError.message}`);
  }

  const { data: member, error: memberError } = await supabase
    .from("vault_members")
    .select("credits")
    .eq("email", email)
    .maybeSingle();

  if (memberError) {
    throw new Error(`Failed to read vault member: ${memberError.message}`);
  }

  const startingCredits = member?.credits ?? 0;
  const plannedRequests = allowOverspend
    ? totalRequests
    : Math.min(totalRequests, startingCredits);

  if (plannedRequests === 0) {
    throw new Error("No credits available for test. Add credits or enable ALLOW_OVERSPEND.");
  }

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
      while (inFlight < concurrency && started < plannedRequests) {
        started += 1;
        inFlight += 1;
        const requestStart = performance.now();

        fetch(`${functionsBase}/charge-stream`, {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify({ trackId, idempotencyKey: randomUUID() }),
        })
          .then(async (res) => {
            const status = res.status;
            statusCounts[status] = (statusCounts[status] || 0) + 1;
            const text = await res.text();
            let parsed;
            try {
              parsed = text ? JSON.parse(text) : null;
            } catch {
              parsed = null;
            }

            if (res.ok) {
              success += 1;
            } else {
              failure += 1;
              const message =
                parsed?.error ||
                parsed?.message ||
                (text || "unknown_error").slice(0, 200);
              const key = `${status}:${message}`;
              errorSamples[key] = (errorSamples[key] || 0) + 1;
            }
          })
          .catch(() => {
            failure += 1;
            statusCounts[0] = (statusCounts[0] || 0) + 1;
            errorSamples["0:network_error"] = (errorSamples["0:network_error"] || 0) + 1;
          })
          .finally(() => {
            const requestEnd = performance.now();
            latencies.push(requestEnd - requestStart);
            inFlight -= 1;

            if (started >= plannedRequests && inFlight === 0) {
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

  const { data: afterMember, error: afterError } = await supabase
    .from("vault_members")
    .select("credits")
    .eq("email", email)
    .maybeSingle();

  if (afterError) {
    throw new Error(`Failed to read vault member after test: ${afterError.message}`);
  }

  const { data: ledgerRows, error: ledgerError } = await supabase
    .from("credit_ledger")
    .select("id")
    .eq("user_email", email)
    .eq("type", "STREAM_DEBIT")
    .like("reference", `stream_${trackId}_%`);

  if (ledgerError) {
    throw new Error(`Failed to read credit_ledger: ${ledgerError.message}`);
  }

  const { data: streamRows, error: streamError } = await supabase
    .from("stream_ledger")
    .select("id")
    .eq("fan_email", email)
    .eq("track_id", trackId);

  if (streamError) {
    throw new Error(`Failed to read stream_ledger: ${streamError.message}`);
  }

  const rps = plannedRequests / (durationMs / 1000);
  const sorted = [...latencies].sort((a, b) => a - b);
  const p = (pct) => sorted[Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1)];

  const report = {
    generatedAt: new Date().toISOString(),
    requestPlan: {
      totalRequests: totalRequests,
      plannedRequests,
      concurrency,
      allowOverspend,
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
    credits: {
      starting: startingCredits,
      ending: afterMember?.credits ?? null,
      expectedEnding: startingCredits - success,
    },
    ledger: {
      streamDebitCount: ledgerRows?.length ?? 0,
      streamLedgerCount: streamRows?.length ?? 0,
      streamDebitDelta: (ledgerRows?.length ?? 0) - (ledgerBefore?.length ?? 0),
      streamLedgerDelta: (streamRows?.length ?? 0) - (streamBefore?.length ?? 0),
    },
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Ledger stress test failed:", err.message || err);
  process.exit(1);
});
