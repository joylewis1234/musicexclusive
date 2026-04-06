

# Move "Preview Exclusive Music" to Header as a Text Link

## What changes
Remove the "Preview Exclusive Music" buttons from the homepage body and add a small text link saying **"Test Out Music Exclusive"** in the header, positioned below/beside the hamburger menu area.

## Files modified

### 1. `src/components/Header.tsx`
- Add a subtle text link next to the hamburger menu (top-left) that reads **"Test Out Music Exclusive"** and navigates to `/preview`
- Style as a small, understated link (not a button) — e.g. `text-xs text-primary hover:underline`

### 2. `src/pages/Index.tsx`
- **Lines 144-151**: Remove the "Preview Exclusive Music" button from the hero CTA section
- **Lines 391-398**: Remove the "Preview Exclusive Music" button from the bottom CTA section
- Keep all other buttons (Enter the Vault, Superfan) intact

## No backend changes needed
Everything is frontend text/routing only.

