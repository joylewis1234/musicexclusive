
## Completed: Double-Mint Elimination (2026-03-03)

**What was done:**
- Eliminated redundant `mint-playback-url` calls during fan paid streams by using the `hlsUrl` returned directly from `charge-stream`.
- Fixed `charge-stream` protocol normalization (`https://` prefix for `HLS_WORKER_BASE_URL`).
- Updated `CompactVaultPlayer` to accept `paidStreamData` prop and call `loadPaidStream()` directly.
- Updated `ArtistProfilePage` to pass charge result's `hlsUrl`/`sessionId` to the player.
- Updated `docs/playback-protection-architecture.md`, `docs/global-audio-engine-plan.md`, and `docs/final-audit-report.md` to reflect the new flow.
