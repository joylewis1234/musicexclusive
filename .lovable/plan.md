

## Account Cleanup — Remaining Steps

### Current State
- `fan_playlists` already empty (done previously)
- 33 tracks to delete (keeping 6 for the two kept artists)
- Large volumes in: `stream_charges` (4512), `stream_ledger` (2948), `playback_sessions` (4174), `credit_ledger` (5806), `monitoring_events` (7012)
- 44 vault_members (keeping 3), 24 artist_profiles (keeping 2), 72 user_roles (keeping ~4), 77 profiles (keeping ~4)

### Keep Lists (verified from DB)
- **Artist Profile IDs**: `b5ce51ad-acf4-4e2d-a378-083fb2c32be2`, `435b37fd-9d4d-43db-aba3-ae55427c1e41`
- **User IDs**: `b429eeb1-88c3-48df-a023-f345fee49912`, `ba5df0b2-8bb9-41f2-b1ad-4e2c97868448`, plus demo-fan and admin (need to confirm exact UUIDs)
- **Vault Member Emails**: `demo-fan@test.com`, `joylewismusic+testdemo1@gmail.com`, `support@musicexclusive.co`, `platform@musicexclusive.com`

### Execution Steps (all via data tool, in dependency order)

1. **Delete track dependencies** for tracks where `artist_id NOT IN` kept artist IDs:
   - `track_likes` (27 rows)
   - `stream_charges` (~4500 rows, batched)
   - `stream_ledger` (~2900 rows, batched)
   - `playback_sessions` (~4100 rows, batched)
   - `shared_tracks` (10 rows)

2. **Delete tracks** not belonging to kept artists (33 rows)

3. **Delete credit_ledger** for emails not in keep list (~5800 rows, batched)

4. **Delete shared_artist_profiles** referencing non-kept vault members

5. **Delete vault_members** for emails not in keep list (~41 rows)

6. **Delete artist-specific tables**: `artist_agreement_acceptances`, `artist_profiles` (non-kept), `application_action_tokens`, `email_logs`, `artist_applications` (non-kept emails)

7. **Delete general user tables**: `user_roles`, `profiles`, `fan_terms_acceptances`, `agreement_acceptances`, `app_error_logs` for non-kept user IDs

8. **Delete vault_codes** for non-kept emails

9. **Clear ancillary tables**: `monitoring_events`, `request_rate_limits`

10. **Delete auth users** — will need the edge function for this step (admin.deleteUser API)

### Implementation
- Steps 1–9: Direct SQL via data tool (each step needs approval)
- Step 10: Call the already-deployed `cleanup-accounts` edge function, or execute auth deletions individually
- After completion: delete the `cleanup-accounts` edge function

