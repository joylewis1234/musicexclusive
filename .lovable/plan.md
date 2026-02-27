

## Fix Report Data After Account Cleanup

The account cleanup missed several tables that feed into admin reports. Here's what remains orphaned and the cleanup steps:

### Orphaned Data Found

| Table | Orphaned Rows | Issue |
|-------|--------------|-------|
| `stream_ledger` | ~1,000 | Load-test fans (`*@test.internal`) + deleted artist IDs |
| `payout_batches` | 5 | Reference deleted `artist_user_id` values |
| `artist_payouts` | 4 | Linked to orphaned payout batches |
| `report_email_logs` | 43 | Old report logs (safe to clear) |
| `credit_ledger` | 0 | Already clean |
| `playback_sessions` | 0 | Already clean |
| `stream_charges` | 6 | All `demo-fan@test.com` — valid, keep |

### Cleanup Steps (dependency order)

1. **Delete orphaned `artist_payouts`** — references payout_batches for deleted artists
2. **Delete orphaned `payout_batches`** — 5 rows referencing deleted user IDs
3. **Delete orphaned `stream_ledger`** — ~1,000 rows from load-test fans and deleted artists
4. **Clear `report_email_logs`** — stale report history
5. **Verify** remaining data is consistent with the 4 canonical accounts

Each step will be executed via the data tool with your approval before proceeding.

