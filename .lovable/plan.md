

## Plan: Sharpen the vault portal

The portal currently looks soft because (a) `mix-blend-screen` washes out detail by adding the dark background to the image, (b) the radial mask cuts in tight at 72%, and (c) heavy `blur` orbs sit close behind it, fogging the edges of the rings.

### Changes — `src/pages/Index.tsx` (vault portal block)

**1. Restore image clarity**
- Replace `mix-blend-screen` on the `<img>` with `mix-blend-lighten` plus a CSS contrast/saturation boost. `lighten` keeps brighter neon pixels at full strength instead of summing them with the page, while `contrast(1.2) saturate(1.25) brightness(1.05)` brings back crisp ring edges.
- Add `image-rendering: high-quality` via inline style on the `<img>` to prevent any browser-side downscaling softness.

```jsx
<img
  src={vaultPortal}
  alt="Vault Portal"
  className="w-full h-full object-contain vault-glow mix-blend-lighten"
  style={{ filter: 'contrast(1.2) saturate(1.25) brightness(1.05)', imageRendering: 'high-quality' }}
/>
```

**2. Widen the visible portal area** so more of the sharp ring detail shows before the fade begins
- Mask: `circle at center, black 35%, transparent 72%` → `circle at center, black 50%, transparent 82%`. The portal stays fully opaque across its core (rings + center), then dissolves only at the very outer halo.

**3. Pull the heavy blur orbs back** so they no longer fog the rings
- `bg-secondary/40 blur-[120px] scale-90` → `bg-secondary/30 blur-[140px] scale-110`
- `bg-accent/30 blur-[100px] scale-100` → `bg-accent/25 blur-[120px] scale-115`
- `bg-primary/30 blur-[90px] scale-95` → `bg-primary/25 blur-[110px] scale-110`
- Inner vignette `inset-[10%]` `blur(40px)` → `inset-[15%]` `blur(60px)` and lower alpha from `0.25` to `0.18`.

Net effect: the glow halo gets larger and softer (still emerging from the page), while the portal itself sits in front of it cleanly, looking noticeably sharper and more saturated.

### Scope
- Single file: `src/pages/Index.tsx`, vault portal section only.
- No new imports, no asset changes, no other sections touched, no backend.
- Mobile + desktop layout untouched (all changes inside the existing `aspect-square` container).

