

## Plan: Make the vault portal larger on `/vault/enter`

Bump the portal container size on `/vault/enter` so the masked vault image reads bigger on both mobile and desktop. Floating fan comments are positioned relative to this container, so they'll scale outward with it automatically.

### Change — `src/pages/EnterVault.tsx`

**Section wrapper (line ~155)** — widen the outer max-width:
```jsx
<section className="relative w-full max-w-xl md:max-w-3xl mx-auto mb-8">
```
(was `max-w-lg md:max-w-2xl`)

**Portal container (line ~163)** — enlarge the square portal:
```jsx
<div className="relative mx-auto w-full max-w-md md:max-w-lg aspect-square">
```
(was `max-w-sm md:max-w-md`)

### Result
- Mobile portal: ~384px → ~448px wide
- Desktop portal: ~448px → ~512px wide
- Mask, glow, lightning overlays, and floating fan bubbles all scale with the container — no other changes needed.

### Scope
- Single file: `src/pages/EnterVault.tsx`
- Two className edits. No new assets, no backend.

