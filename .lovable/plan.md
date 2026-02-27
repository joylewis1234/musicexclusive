

## Plan: Full Account Cleanup

Retain **4 accounts** and their data; delete everything else.

### Accounts to keep

| Email | User ID | Role | Artist Profile ID |
|---|---|---|---|
| test-artist+validation@example.com | b429eeb1 | artist | b5ce51ad (Validation Artist) |
| joylewismusic+testdemo1@gmail.com | ba5df0b2 | artist | 435b37fd (JL - Demo 1) |
| demo-fan@test.com | db9c713b | fan | — |
| support@musicexclusive.co | 558ee15a | admin | — |

**Note:** `tinytunesmusic@gmail.com` (the second admin email in the allowlist) is **not** in your keep list. It has an artist profile ("New Artist") but no tracks. Deleting it means that admin email won't have an auth account — the allowlist still recognizes it, so re-creating the account later will auto-grant admin. Proceeding as requested.

### Tracks to keep
- artist_id = `b5ce51ad...` (Validation Artist): 1 track
- artist_id = `435b37fd...` (JL - Demo 1): 5 tracks

All other tracks (slug-based like `echo`/`nova`/`aura` + other UUID artists) will be deleted.

### Cleanup edge function: `cleanup-accounts`

A new edge function that performs deletions in dependency order using service role:

1. **Delete dependent track data** for tracks NOT belonging to kept artists:
   - `fan_playlists` (by track_id)
   - `track_likes` (by track_id)
   - `shared_tracks` (by track_id)
   - `stream_charges` (by track_id)
   - `stream_ledger` (by track_id)
   - `marketing_assets` (by track_id — joined via artist_id)
   - `playback_sessions` (by track_id)

2. **Delete tracks** where `artist_id` NOT IN kept artist profile IDs

3. **Delete credit_ledger entries** for emails NOT in keep list

4. **Delete vault_members** for emails NOT in keep list

5. **Delete artist-specific tables** for non-kept users:
   - `artist_agreement_acceptances`
   - `artist_profiles`
   - `artist_applications` (for non-kept contact_email)
   - `application_action_tokens` (for deleted applications)
   - `email_logs` (for deleted applications)

6. **Delete general user tables**:
   - `user_roles` (non-kept user_ids)
   - `profiles` (non-kept user_ids)
   - `fan_terms_acceptances` (non-kept user_ids)
   - `agreement_acceptances` (non-kept emails)
   - `app_error_logs` (non-kept user_ids)

7. **Delete vault_codes** for non-kept emails

8. **Delete auth users** via `supabase.auth.admin.deleteUser()` for each non-kept user

9. **Return summary** with counts of deleted records per table

### Safety measures
- Admin-protected (JWT + role check)
- Hardcoded keep-list inside the function
- Dry-run mode available (log what would be deleted without deleting)
- `artist_id` compared as TEXT throughout (UUID-safe)

### Implementation: 1 new file
- `supabase/functions/cleanup-accounts/index.ts`

After deploying, invoke it once, verify the summary, then delete the function.

