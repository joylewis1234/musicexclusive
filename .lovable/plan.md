

# Update Domain References to musicexclusive.co

The codebase is already 95% migrated — `musicexclusive.co` is used in 43 files. Only **4 files** still reference the old `www.TheMusicIsExclusive.com` domain.

## Changes

### 1. `index.html` (Lines 17, 21)
Update OG/Twitter image URLs:
- `https://www.themusicisexclusive.com/og-image.png` → `https://musicexclusive.co/og-image.png`

### 2. `src/components/artist/marketing/templates/CinematicArtistPhoto.tsx` (Line 206)
Update display URL:
- `www.TheMusicIsExclusive.com` → `musicexclusive.co`

### 3. `src/components/artist/marketing/templates/CinematicCoverArt.tsx` (Line 206)
Update display URL:
- `www.TheMusicIsExclusive.com` → `musicexclusive.co`

### 4. `src/hooks/useVideoExport.ts` (Line 340)
Update canvas-rendered URL:
- `www.TheMusicIsExclusive.com` → `musicexclusive.co`

## No other changes needed
- `src/config/app.ts` already has `APP_URL = "https://musicexclusive.co"`
- All edge functions already use `musicexclusive.co`
- All email templates already use `noreply@musicexclusive.co`

