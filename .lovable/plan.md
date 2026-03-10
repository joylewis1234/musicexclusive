

## Add "My Agreement" Card to Artist Dashboard

### What changes
**New file**: `src/components/artist/AgreementStatusCard.tsx` — standalone card component using React Query.

**Modified file**: `src/pages/artist/ArtistDashboard.tsx` — import and render the card between the Payout Account Status card and the Invite Fans section (around line 786).

### AgreementStatusCard component
- Uses `useQuery` from `@tanstack/react-query` to fetch from `artist_agreement_acceptances` where `artist_id = user.id`, selecting `signed_at, agreement_version, legal_name`.
- Uses `useAuth()` to get current user.

**Signed state**: Green badge "Signed", two muted lines (signed date, version), "Download Signed Copy" button that opens `/artist-agreement` in a new tab.

**Unsigned state**: Yellow/amber badge "Pending", text "You haven't signed your artist agreement yet.", "Sign Agreement" button navigating to `/artist/agreement-accept`.

**Loading**: Skeleton matching the card height (`h-28 rounded-2xl`).

**Error**: Muted text with support email.

### Card styling
Matches existing dashboard card pattern: `p-4 rounded-2xl border` with `background: 'hsla(0, 0%, 100%, 0.02)'` and themed border color (green if signed, amber if pending). Same icon/badge layout as the Payout Account Status card.

### Dashboard placement
Rendered after the Payout Account Status card (line ~784) and before `ArtistInviteSection` (line ~787).

