

## Blueprint Review & Build Order Confirmation

I reviewed the blueprint against the existing codebase. Here are my findings and the confirmed build order.

### Compatibility Check

**Database**: The blueprint references `artist_profiles(id)` for foreign keys — confirmed this table exists with `id` as UUID primary key. The `stream_ledger` table tracks streams with `artist_id` (text, referencing `artist_profiles.id::text`) and `fan_id`. The `admin_action_logs` table exists for audit logging. All dependencies are in place.

**Edge Functions**: `charge-stream` exists and is the right place to hook `check-bonus-milestones` (Step 3). It already has service role access and monitoring patterns we can follow.

**Admin UI**: `AdminDashboard.tsx` has a card-based navigation pattern with icons, tooltips, and `navigate()` calls. New bonus tracker pages will follow this pattern and be added to the sidebar/dashboard links.

**One schema note**: The blueprint uses `artist_id uuid REFERENCES artist_profiles(id)` in `bonus_milestones`, but `stream_ledger.artist_id` is `text` (storing `artist_profiles.id::text`). The stream count query in `check-bonus-milestones` will need to cast or match accordingly. This is a minor implementation detail, not a blocker.

### Confirmed Build Order

| Step | What | Type |
|------|------|------|
| 1 | DB migration: `bonus_milestones`, `charts_bonus_cycles`, `country_code` column, indexes, RLS policies | Migration |
| 2 | `check-bonus-milestones` edge function | Backend |
| 3 | Hook into `charge-stream` to call `check-bonus-milestones` after successful charge | Backend |
| 4 | `approve-bonus-payout` edge function | Backend |
| 5 | `disqualify-bonus` edge function | Backend |
| 6 | Admin Cash Bonus Tracker page at `/admin/bonus-tracker/cash-bonus` | Frontend |
| 7 | `update-charts-standings` edge function (nightly cron) | Backend |
| 8 | `close-annual-cycle` edge function | Backend |
| 9 | `disqualify-charts-artist` edge function | Backend |
| 10 | Admin Exclusive Charts page at `/admin/bonus-tracker/exclusive-charts` | Frontend |
| 11 | Public `/charts` page | Frontend |
| 12 | Artist dashboard eligibility card + fan discovery charts banner | Frontend |
| 13 | Add `country_code` to artist profile edit page | Frontend |
| 14 | End-to-end testing | Testing |

### Recommendation

The build order is sound. Each step's dependencies are satisfied by prior steps. I recommend we begin with **Step 1 — the DB migration** to create both tables, add `country_code`, create indexes, and set up RLS policies (including the public read policy for `charts_bonus_cycles`).

Ready to proceed when you give the go-ahead.

