import { performance } from "node:perf_hooks";

/**
 * Ledger Concurrency Stress Test
 *
 * Sends concurrent charge-stream requests with unique idempotency keys
 * to verify that credits, credit_ledger, and stream_ledger stay consistent
 * under contention.
 *
 * Prerequisites:
 *   - A test fan with vault access and known starting credits
 *   - A valid track ID
 *   - A valid JWT for the test fan
 *
 * Usage:
 *   AUTH_TOKEN="<jwt>" TRACK_ID="<uuid>" FAN_EMAIL="<email>" \
 *     node scripts/ledger-stress-test.js
 */

const BASE = "https://yjytuglxpvdkyvjsdyfk.functions.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqeXR1Z2x4cHZka3l2anNkeWZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMzM3MzMsImV4cCI6MjA4NDkwOTczM30.NEs_fcWRbHfrDIVIySQHRs8xq9mrel9ZxBGg4YA95a0";

const AUTH_TOKEN = process.env.AUTH_TOKEN;
const TRACK_ID = process.env.TRACK_ID;
const FAN_EMAIL = process.env.FAN_EMAIL;
const TOTAL_REQUESTS = parseInt(process.env.TOTAL_REQUESTS || "40", 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "5", 10);

if (!AUTH_TOKEN || !TRACK_ID || !FAN_EMAIL) {
  console.error("Required env vars: AUTH_TOKEN, TRACK_ID, FAN_EMAIL");
  process.exit(1);
}

async function fetchLedgerCounts() {
  const headers = {
    apikey: ANON_KEY,
    Authorization: `Bearer ${AUTH_TOKEN}`,
    "Content-Type": "application/json",
  };

  const [debitRes, streamRes] = await Promise.all([
    fetch(
      `${BASE.replace(".functions.", ".")}/rest/v1/credit_ledger?select=id&type=eq.STREAM_DEBIT&user_email=eq.${encodeURIComponent(FAN_EMAIL)}`,
      { headers }
    ),
    fetch(
      `${BASE.replace(".functions.", ".")}/rest/v1/stream_ledger?select=id&fan_email=eq.${encodeURIComponent(FAN_EMAIL)}&track_id=eq.${TRACK_ID}`,
      { headers }
    ),
  ]);

  const debits = await debitRes.json();
  const streams = await streamRes.json();
  return {
    streamDebits: Array.isArray(debits) ? debits.length : 0,
    streamLedger: Array.isArray(streams) ? streams.length : 0,
  };
}

async function fetchCredits() {
  const headers = {
    apikey: ANON_KEY,
    Authorization: `Bearer ${AUTH_TOKEN}`,
    "Content-Type": "application/json",
  };
  const res = await fetch(
    `${BASE.replace(".functions.", ".")}/rest/v1/vault_members?select=credits&email=eq.${encodeURIComponent(FAN_EMAIL)}`,
    { headers }
  );
  const data = await res.json();
  return Array.isArray(data) && data.length > 0 ? data[0].credits : null;
}

async function runStressTest() {
  console.log(`\n=== Ledger Stress Test ===`);
  console.log(`Fan: ${FAN_EMAIL}`);
  console.log(`Track: ${TRACK_ID}`);
  console.log(`Requests: ${TOTAL_REQUESTS}, Concurrency: ${CONCURRENCY}\n`);

  // Snapshot before
  const creditsBefore = await fetchCredits();
  const ledgerBefore = await fetchLedgerCounts();
  console.log(`Credits before: ${creditsBefore}`);
  console.log(`Ledger before: STREAM_DEBIT=${ledgerBefore.streamDebits}, stream_ledger=${ledgerBefore.streamLedger}\n`);

  const statusCounts = {};
  const latencies = [];
  let inFlight = 0;
  let started = 0;

  const startTime = performance.now();

  await new Promise((resolve) => {
    const launchNext = () => {
      while (inFlight < CONCURRENCY && started < TOTAL_REQUESTS) {
        started += 1;
        inFlight += 1;
        const idempotencyKey = crypto.randomUUID();
        const requestStart = performance.now();

        fetch(`${BASE}/charge-stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${AUTH_TOKEN}`,
            apikey: ANON_KEY,
          },
          body: JSON.stringify({ trackId: TRACK_ID, idempotencyKey }),
        })
          .then(async (res) => {
            statusCounts[res.status] = (statusCounts[res.status] || 0) + 1;
            await res.text();
          })
          .catch(() => {
            statusCounts["error"] = (statusCounts["error"] || 0) + 1;
          })
          .finally(() => {
            latencies.push(performance.now() - requestStart);
            inFlight -= 1;
            if (started >= TOTAL_REQUESTS && inFlight === 0) {
              resolve();
              return;
            }
            launchNext();
          });
      }
    };
    launchNext();
  });

  const durationMs = performance.now() - startTime;

  // Snapshot after
  const creditsAfter = await fetchCredits();
  const ledgerAfter = await fetchLedgerCounts();

  const debitDelta = ledgerAfter.streamDebits - ledgerBefore.streamDebits;
  const streamDelta = ledgerAfter.streamLedger - ledgerBefore.streamLedger;
  const creditsConsumed = creditsBefore - creditsAfter;

  console.log(`--- Results ---`);
  console.log(`Duration: ${Math.round(durationMs)}ms`);
  console.log(`Status codes:`, statusCounts);
  console.log(`Credits after: ${creditsAfter} (consumed: ${creditsConsumed})`);
  console.log(`Ledger delta: STREAM_DEBIT +${debitDelta}, stream_ledger +${streamDelta}`);

  const ok =
    creditsConsumed === debitDelta &&
    creditsConsumed === streamDelta &&
    creditsAfter >= 0;

  console.log(
    ok
      ? `\n✅ INTEGRITY OK — credits consumed matches ledger deltas, no negatives.`
      : `\n❌ INTEGRITY MISMATCH — credits consumed: ${creditsConsumed}, debit delta: ${debitDelta}, stream delta: ${streamDelta}`
  );
}

runStressTest().catch((err) => {
  console.error("Stress test failed:", err);
  process.exit(1);
});
