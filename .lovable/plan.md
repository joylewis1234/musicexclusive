

## Update `submit-agreement-acceptance` Edge Function

The function currently writes to `agreement_acceptances` only. We'll add a second insert into `artist_agreement_acceptances` using the new columns, while keeping all existing logic untouched.

### Changes

**`supabase/functions/submit-agreement-acceptance/index.ts`**

After the existing `agreement_acceptances` upsert (line 84–95), add:

1. Extract `ip_address` from `x-forwarded-for` (already captured as `ip` on line 45), falling back to `x-real-ip`
2. Extract `user_agent` from request headers
3. Accept `legal_name` (required), `artist_name` (required), `artist_id` (required UUID), and `agreement_version` (default `"1.0"`) from the request body
4. Only run the artist agreement insert when `artist_id` is present (so existing fan agreement calls are unaffected)
5. Validate `legal_name` and `artist_name` are non-empty strings when `artist_id` is provided
6. Insert into `artist_agreement_acceptances` with server-side `signed_at` timestamp

No changes to existing validation, rate limiting, or `agreement_acceptances` upsert logic.

