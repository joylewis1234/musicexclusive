

## Upgrade ArtistAgreementAccept with Scroll Gate, Signature Block, and Confirmation Modal

### Overview
Rewrite `ArtistAgreementAccept.tsx` to include: inline agreement text in a scroll-gated container, a validated signature block with React Hook Form + Zod, submission via the existing edge function, and a post-sign confirmation dialog.

### Changes

**File: `src/pages/artist/ArtistAgreementAccept.tsx`** — Full rewrite preserving routing, auth context, and `useArtistAgreement` hook.

1. **Scroll Gate**: Embed the full agreement text (same 14 sections from `ArtistAgreement.tsx`) inside a `div` with `max-h-[520px] overflow-y-auto`. Track `scrollPercent` via `onScroll` and set `hasScrolled90 = true` once >= 90%. Show a progress bar above the container. Show helper text "Scroll to the bottom to unlock the signature block" until unlocked.

2. **Signature Block**: Wrapped in a `div` with conditional `opacity-40 pointer-events-none` until `hasScrolled90`. Uses React Hook Form + Zod schema:
   - `legalName`: `z.string().trim().min(1).max(200)`
   - `artistName`: `z.string().trim().min(1).max(200)`
   - `email`: read-only, pre-filled from `useAuth().user.email`
   - `signatureDate`: read-only, today's date formatted
   - `agreedTerms`: `z.literal(true)`
   - `agreedAge`: `z.literal(true)`
   - Submit button disabled unless `hasScrolled90 && form.formState.isValid`

3. **Submission**: On submit, call the `submit-agreement-acceptance` edge function via `supabase.functions.invoke()` passing `legal_name`, `artist_name`, `agreement_version: "1.0"`, `artist_id`, `email`, `name` (for the existing agreement_acceptances upsert), `terms_version`, `privacy_version`, and `client_timestamp`.

4. **Confirmation Modal**: On success, open a `Dialog` with `onInteractOutside={e => e.preventDefault()}` — title "Agreement Signed ✓", body text, and "Continue to Dashboard" button navigating to `/artist/dashboard`.

5. **Error State**: Inline red banner below the submit button on failure.

**File: `src/hooks/useArtistAgreement.ts`** — Modify `acceptAgreement` to accept `{ legalName, artistName }` parameters and pass them in the request body. Switch from direct REST POST to calling the `submit-agreement-acceptance` edge function instead, so the new fields flow through.

### Technical Notes
- Agreement text sections are inlined directly (not imported from `ArtistAgreement.tsx`) to keep the scroll container self-contained
- `useAuth()` provides `user.email` and `user.id` for pre-filling
- The edge function already handles `legal_name`, `artist_name`, `agreement_version`, `ip_address`, `user_agent`, and `signed_at` server-side

