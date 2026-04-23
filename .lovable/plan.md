

## Plan: Make vault portal fully blend into the page (no visible square)

The mask is already wide, but the dark/black corners of `vault-portal.png` still show because `mix-blend-lighten` only hides black against an even darker background — and the mask edge fade is too narrow. Tighten the visible portal area into a true circle and let it dissolve into the page.

### Changes — `src/pages/Index.tsx` (vault portal block, ~lines 183–212)

**1. Tighten + circularize the mask** (kills the square corners completely)

Replace the mask wrapper with a perfect circular fade that starts fading earlier and ends sooner:
```jsx
<div
  className="relative w-full h-full"
  style={{
    maskImage: 'radial-gradient(circle at center, black 35%, transparent 72%)',
    WebkitMaskImage: 'radial-gradient(circle at center, black 35%, transparent 72%)',
  }}
>
  <img
    src={vaultPortal}
    alt="Vault Portal"
    className="w-full h-full object-contain vault-glow mix-blend-screen"
  />
</div>
```
Key shifts:
- `ellipse 85% 85%` → `circle` (forces a true round cutout, not rectangle-shaped ellipse).
- Fade window `30% → 90%` → `35% → 72%` (steeper but starts well inside the frame, so all corner pixels are fully transparent).
- `mix-blend-lighten` → `mix-blend-screen` (more aggressively eliminates dark grays, not just pure black, so any near-black halo in the PNG disappears).

**2. Strengthen the surrounding glow so the portal reads as emerging from light, not pasted on**

Update the three glow orbs (lines 188–190):
- `bg-secondary/30 blur-[100px] scale-75` → `bg-secondary/40 blur-[120px] scale-90`
- `bg-accent/20 blur-[80px] scale-90` → `bg-accent/30 blur-[100px] scale-100`
- `bg-primary/20 blur-[70px] scale-80` → `bg-primary/30 blur-[90px] scale-95`

This widens the ambient glow halo so the masked edge of the portal lands on a lit area — eliminating any perceived "edge."

**3. Add an inner radial vignette behind the image**

Insert one more glow layer immediately before the masked image wrapper to brighten the page background where the portal sits, so the blended portal looks like it's emanating from the page:
```jsx
<div
  className="absolute inset-[10%] rounded-full"
  style={{
    background: 'radial-gradient(circle, hsl(var(--primary) / 0.25) 0%, transparent 70%)',
    filter: 'blur(40px)',
  }}
/>
```

### Scope
- Single file: `src/pages/Index.tsx`.
- No new imports, no other sections touched, no backend, no asset changes.
- Mobile + desktop layout preserved (all changes are within the existing `aspect-square` container).

