## Goal
Replace the "Axel Volt / Electronic" artist photo in the homepage carousel with a cinematic cover-art style image to demonstrate how a cover-art card looks alongside the existing artist-photo cards.

## Steps

1. **Generate cover art** via Lovable AI image gateway (`google/gemini-2.5-flash-image`).
   - Prompt direction: dark cinematic electronic album cover, neon purple/magenta lighting, abstract synthwave/geometric energy, premium music-exclusive aesthetic, no text, square 3:4 friendly composition.
   - Save output to `src/assets/cover-art-axel-volt.jpg`.

2. **Update `src/pages/Index.tsx`:**
   - Remove the `import artistElectronic from "@/assets/artist-electronic.jpg"` line.
   - Add `import coverArtAxelVolt from "@/assets/cover-art-axel-volt.jpg"`.
   - In the `artists` array, change the Axel Volt entry's `imageUrl` from `artistElectronic` to `coverArtAxelVolt`.

## Out of scope
- No changes to `ArtistCard.tsx`, `ArtistCardCarousel.tsx`, or `ArtistPreviewStrip.tsx`.
- No changes to other artists, layout, copy, or styling.
- No backend changes.

## Result
The Electronic card in both the top preview strip and the main scrolling carousel will display a stylized cover-art image instead of an artist photo, while everything else remains identical.