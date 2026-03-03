

## Plan: Update Documentation to Reflect Double-Mint Fix

Three docs need updating, plus the plan file should be marked as completed.

### 1. `.lovable/plan.md`
- Replace the current plan content with a "Completed" note summarizing what was done and when.

### 2. `docs/playback-protection-architecture.md`
- Update the "Playback Flow (HLS)" section to document the new two-path flow:
  - **Fan paid stream**: `charge-stream` mints the session JWT and returns `hlsUrl` directly; `CompactVaultPlayer` receives `paidStreamData` prop and calls `loadPaidStream()` — no separate `mint-playback-url` call.
  - **Artist dashboard / replay**: Still uses `mint-playback-url` for on-demand signed URLs.
- Add `charge-stream` to the Components list as the primary playback entry point for fan streams.

### 3. `docs/global-audio-engine-plan.md`
- Update the Edge Function Dependencies table (section 9) to reflect that `charge-stream` now returns `hlsUrl` directly and `mint-playback-url` is no longer called for initial fan paid streams.
- Update section 5 (Paid Stream Rules / First Play) to note that `charge-stream` returns the HLS URL, so no separate mint call is needed.

### 4. `docs/final-audit-report.md`
- Add a brief entry under "Completed Work (Highlights)" noting the double-mint elimination and `charge-stream` protocol normalization fix (`https://` prefix).

