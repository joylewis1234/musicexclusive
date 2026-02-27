## Update `.lovable/plan.md` with completed cleanup results

Update the current plan doc content by adding a completed report documenting everything that was cleaned, the final row counts, and the canonical accounts retained.

### Content to write:

- **Header**: "Report Data Cleanup — Completed"
- **Date**: 2026-02-27
- **Summary of what was deleted** (with row counts):
  - `artist_payouts`: 4 rows (orphaned references to deleted artists)
  - `payout_batches`: 5 rows (referenced deleted `artist_user_id` values)
  - `stream_ledger`: ~1,000 rows (load-test fans `*@test.internal` + deleted artist IDs)
  - `report_email_logs`: 43 rows (stale report history)
  - `credit_ledger`: ~3,800 rows (orphaned `STREAM_DEBIT`, `ARTIST_EARNING`, `PLATFORM_EARNING` entries referencing deleted streams)
- **Final verified row counts**:
  - `stream_ledger`: 6
  - `stream_charges`: 6
  - `credit_ledger`: 12 (6 `STREAM_DEBIT` + 6 `PLATFORM_EARNING`)
  - `payout_batches`: 0
  - `artist_payouts`: 0
  - `report_email_logs`: 0
  - `playback_sessions`: 0
- **Canonical accounts retained**: list the 4 accounts (admin, fan, 2 artists)
- **Execution order**: document the dependency-ordered steps taken
- **Note**: all remaining data ties back to `demo-fan@test.com` and valid tracks

Single file change to `.lovable/plan.md`.