# Replace Header with Back Button on Charts Page

## What

Remove the full site `<Header>` (hamburger menu, login button) from the Charts page and replace it with a simple back button header. Also remove the "Become an Artist" CTA button in the empty state.

## Changes — `src/pages/ChartsPage.tsx`

1. **Remove** `Header` import, add `ChevronLeft` to lucide imports
2. **Replace** `<Header />` with a minimal top bar containing a back button that uses `navigate(-1)` — this sends artists back to their dashboard and fans back to wherever they came from
3. **Remove** the "Become an Artist" `<Button>` in the empty-state section (lines 196-203)