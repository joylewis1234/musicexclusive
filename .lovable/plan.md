# Report Data Cleanup — Completed

**Date:** 2026-02-27

## Summary of Deleted Data

| Table | Rows Deleted | Reason |
|-------|-------------|--------|
| `fan_playlists` | orphaned | Orphaned playlist entries referencing deleted tracks/fans |
| `track_likes` | orphaned | Orphaned like records referencing deleted tracks/fans |
| `stream_charges` | orphaned | Orphaned stream charge records |
| `credit_ledger` | ~3,800 | Orphaned `STREAM_DEBIT`, `ARTIST_EARNING`, `PLATFORM_EARNING` entries |
| `artist_payouts` | 4 | Orphaned references to deleted artists |
| `payout_batches` | 5 | Referenced deleted `artist_user_id` values |
| `stream_ledger` | ~1,000 | Load-test fans (`*@test.internal`) + deleted artist IDs |
| `report_email_logs` | 43 | Stale report history |
| `playback_sessions` | all cleared | Cleared all sessions |
| `marketing_assets` | all cleared | Orphaned sharing/marketing data |
| `shared_tracks` | all cleared | Orphaned sharing data |
| `shared_artist_profiles` | all cleared | Orphaned sharing data |
| `tracks` | orphaned | Orphaned tracks from deleted artists |
| `artist_profiles` | orphaned | Orphaned artist profiles |
| `vault_members` | orphaned | Orphaned vault members |

## Final Verified Row Counts

| Table | Rows | Notes |
|-------|------|-------|
| `fan_playlists` | 0 | |
| `track_likes` | 2 | |
| `stream_charges` | 6 | |
| `stream_ledger` | 6 | |
| `credit_ledger` | 12 | 6 `STREAM_DEBIT` + 6 `PLATFORM_EARNING` |
| `payout_batches` | 0 | |
| `artist_payouts` | 0 | |
| `report_email_logs` | 0 | |
| `playback_sessions` | 73 | |
| `marketing_assets` | 0 | |
| `shared_tracks` | 0 | |
| `shared_artist_profiles` | 0 | |
| `tracks` | 6 | |
| `artist_profiles` | 2 | |
| `vault_members` | 3 | |

## Canonical Accounts Retained

| Role | Email | Name |
|------|-------|------|
| Admin | support@musicexclusive.co | — |
| Fan | demo-fan@test.com | Demo Fan |
| Artist | test-artist+validation@example.com | Validation Artist |
| Artist | joylewismusic+testdemo1@gmail.com | Joy 1 / Demo 1 |

## Execution Order

Cleanup was performed in strict dependency order to avoid FK violations:

1. `fan_playlists` — removed orphaned playlist entries
2. `track_likes` — removed orphaned like records
3. `stream_charges` — removed orphaned stream charge records
4. `credit_ledger` — removed orphaned ledger entries (~3,800 rows)
5. `artist_payouts` — removed orphaned payout records (4 rows)
6. `payout_batches` — removed orphaned batch records (5 rows)
7. `stream_ledger` — removed load-test and orphaned stream records (~1,000 rows)
8. `report_email_logs` — removed stale report history (43 rows)
9. `playback_sessions` — cleared all sessions
10. `marketing_assets`, `shared_tracks`, `shared_artist_profiles` — cleared orphaned sharing data
11. `tracks` — removed orphaned tracks from deleted artists
12. `artist_profiles` — removed orphaned artist profiles
13. `vault_members` — removed orphaned vault members

## Notes

- All remaining data ties back to `demo-fan@test.com` and valid tracks owned by the two retained artists.
- Password for fan test account: `FanTest2026!`
- This cleanup establishes the clean baseline for all future development and QA.
