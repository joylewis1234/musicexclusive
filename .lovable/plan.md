

## Plan: Stationary glowing rings (no rotation)

Update the orbital rings in `src/pages/ArtistBenefits.tsx` to match the reference: stationary thin neon arcs with a concentrated glow hotspot rather than uniformly spinning.

### Changes

**1. Remove rotation**
- Strip `animate-spin` and the inline `animationDuration` / `animationDirection` styles from all 4 ring containers (3 in hero + 1 in bottom CTA).
- Rings stay positioned exactly where they are now — just no motion.

**2. Concentrated glow hotspot (per ring)**
Instead of a uniform `drop-shadow` on the ellipse, layer two elements per ring inside the same absolutely-positioned container:
- The thin SVG `<ellipse>` itself: keep stroke color, raise opacity slightly (`0.5` for ring 1, `0.45` for rings 2 & 3), keep `strokeWidth="1.25"`, drop the heavy `drop-shadow` filter (or reduce to `drop-shadow(0 0 6px ...)` for crispness).
- A small radial-glow `<div>` positioned at one point along the ring's arc (top-left for ring 1, bottom-right for ring 2, top-right for ring 3, bottom-center for the CTA ring). Each glow:
  - `w-[300px] h-[300px] rounded-full`
  - Background: `radial-gradient(circle, hsl(var(--primary) / 0.35) 0%, transparent 70%)` (color matches its ring)
  - `blur-2xl`
  - `pointer-events-none`

This creates the "bright spot on the arc" look from the reference instead of uniform glow.

**3. Keep everything else**
- Same ring sizes, tilts, viewBox, positioning, z-index layering (`z-0` rings, `z-10` content).
- Same neon palette (primary pink, secondary cyan, accent purple).
- Demoted background blur blobs stay as-is.

### Scope
Single file: `src/pages/ArtistBenefits.tsx`. No imports added, no other sections changed, no backend.

