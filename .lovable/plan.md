

## Data Migration SQL Export

I've queried all critical tables and have the complete dataset. Here's what I'll generate:

### File: `supabase/export/data-migration.sql`

A single SQL file with INSERT statements for all tables, ordered to respect foreign key dependencies.

### Data summary (what goes in)

| Table | Rows | Notes |
|-------|------|-------|
| vault_members | 4 | Fan/artist credit balances |
| profiles | 4 | User display names |
| user_roles | 6 | admin, artist, fan assignments |
| artist_profiles | 2 | Joy Lewis + Validation Artist |
| artist_applications | 4 | Including 13 waitlist artists |
| artist_waitlist | 13 | Real artist signups |
| fan_waitlist | 1 | Dalonna |
| tracks | 13 | 6 active + 7 disabled |
| track_likes | 2 | Demo fan likes |
| credit_ledger | 148 | All financial entries |
| stream_ledger | ~51 | Revenue split records |
| stream_charges | ~51 | Idempotency records |
| stripe_events | ~20 | Payment event log |
| fan_invites | 12 | Invite tokens |
| agreement_acceptances | 1 | Fan terms |
| artist_agreement_acceptances | 3 | Artist agreements |

### Insert order (FK-safe)
1. vault_members, profiles (no deps)
2. user_roles (refs auth.users)
3. artist_profiles (refs auth.users)
4. artist_applications, artist_waitlist, fan_waitlist
5. tracks (refs artist_profiles)
6. track_likes (refs tracks + vault_members)
7. stream_charges, stream_ledger (refs tracks)
8. credit_ledger
9. stripe_events, fan_invites, agreement tables

### Important notes
- All INSERT statements use `ON CONFLICT DO NOTHING` for safety
- auth.users must be recreated manually first (4 users with matching UUIDs)
- Storage files (audio/artwork in R2) must be migrated separately
- The script is designed to run AFTER `full-schema.sql`

