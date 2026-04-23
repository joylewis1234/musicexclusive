

## Plan: Make orbital rings neon to match page colors

Update the 3 hero rings (and optional bottom-CTA ring) in `src/pages/ArtistBenefits.tsx` to use the page's neon palette instead of white.

### Color assignment
Use the existing CSS variables already driving the page's neon look:
- **Ring 1** (largest, ~1600px) — `stroke="hsl(var(--primary))"` (neon pink), opacity `0.45`, glow `drop-shadow(0 0 25px hsl(var(--primary) / 0.7))`, 180s spin
- **Ring 2** (~1400px, tilted 15°) — `stroke="hsl(var(--secondary))"` (cyan/blue), opacity `0.4`, glow `drop-shadow(0 0 20px hsl(var(--secondary) / 0.6))`, 140s spin reverse
- **Ring 3** (~1200px, tilted -25°) — `stroke="hsl(var(--accent))"` (purple), opacity `0.4`, glow `drop-shadow(0 0 20px hsl(var(--accent) / 0.6))`, 100s spin
- **Ring 4** (bottom CTA, ~1200px) — `stroke="hsl(var(--primary))"`, opacity `0.3`, glow primary, 150s spin

### Other tweaks
- Bump `strokeWidth` from `1` to `1.25` so the neon strokes read clearly against the dark background.
- Keep all geometry, sizing, positioning, animation durations, and z-index layering exactly as in the previous orbital-rings update.
- Keep the demoted glow blobs at `-z-20` so they don't wash out the neon strokes.

### Scope
Single file: `src/pages/ArtistBenefits.tsx`. No new imports, no other sections touched, no backend changes.

