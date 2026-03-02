

## Replace Raven Cross Artist Card Image

**What changes:**

1. **Save uploaded image** to `src/assets/artist-raven-cross.jpg` — the uploaded photo of the rock artist.

2. **Update `src/pages/Index.tsx`**:
   - Replace the import `artistRockFemale` from `artist-rock-female.jpg` with a new import from `artist-raven-cross.jpg`.
   - The artist entry on line 36 already reads `{ name: "Raven Cross", genre: "Rock", imageUrl: artistRockFemale }` — update the `imageUrl` to reference the new import.

**No styling changes needed** — the `ArtistCard`, `ArtistPreviewStrip`, and `ArtistCardCarousel` components already apply the neon glow border, gradient overlay, hover effects, and "Exclusive" badge uniformly to all cards. The new image will automatically receive the same treatment.

### Technical Details

- New file: `src/assets/artist-raven-cross.jpg` (from uploaded image)
- Edit `src/pages/Index.tsx`:
  - Change import line 22 from `artist-rock-female.jpg` to `artist-raven-cross.jpg`
  - Update line 36 to use the new import variable

