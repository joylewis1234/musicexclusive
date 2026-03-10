

## Update `/artist-agreement` Public Page

### What changes
**Single file**: `src/pages/ArtistAgreement.tsx` — full rewrite.

Replace the current `LegalPageLayout`-wrapped page with a standalone page that imports `AgreementTextContent` as the single source of truth.

### Structure

1. **Page wrapper**: `min-h-screen bg-background` with scroll tracking via `useEffect` for the back-to-top button.

2. **Header section** (centered, `max-w-[780px]`):
   - Title: "Artist Participation Agreement" (`text-2xl font-bold`)
   - Subtitle: "Music Exclusive LLC | themusicexclusive.com" (muted)
   - Two badges side by side: "Version 1.0" and "Effective 2025" using existing `Badge` component
   - Horizontal divider (`Separator`)

3. **Action bar** (flex between, same max-width):
   - Left: muted text "Read before signing up as an artist"
   - Right: `<Button>` "Become an Artist" linking to `/artist/application-form` via `useNavigate`

4. **Agreement content**: `<AgreementTextContent />` rendered inside a container with `max-w-[780px] mx-auto px-6` and custom text sizing (`text-[15px] leading-[1.8]`)

5. **Footer note** (centered, muted):
   - Text about governing all artist accounts + support email
   - "Contact Support" secondary button with `mailto:support@musicexclusive.co`

6. **Back to Top button**: Fixed bottom-right, circular, appears after 400px scroll. Uses `ChevronUp` from lucide-react. Smooth scroll to top on click.

### No other files changed
- Removes unused imports (`LegalSection`, `Download`, `downloadArtistAgreementPdf`)
- Adds import of `AgreementTextContent`
- Page remains fully public, no auth gating

