

## Plan: Make the orbital arc actually visible

The arc was added with `-z-10`, which puts it behind the page background, so it never shows. Also, `overflow-hidden` on the page wrapper plus `top-[250px]` pushes a lot of it off-screen on the current 923px viewport. Two small fixes in `src/pages/Index.tsx`:

### Changes — `src/pages/Index.tsx`

**1. Remove `-z-10` from the SVG and bump opacity/glow**

Replace the existing decorative SVG (lines ~93–110) with:
```jsx
<svg
  className="absolute top-[200px] -left-[80px] md:-left-[150px] w-[520px] md:w-[820px] h-[1000px] md:h-[1200px] pointer-events-none z-0"
  viewBox="0 0 800 1200"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <ellipse
    cx="400"
    cy="600"
    rx="380"
    ry="550"
    stroke="hsl(var(--primary))"
    strokeWidth="2"
    opacity="0.55"
    style={{ filter: 'drop-shadow(0 0 20px hsl(var(--primary) / 0.7)) drop-shadow(0 0 40px hsl(var(--primary) / 0.4))' }}
  />
</svg>
```
Why each change:
- `-z-10` → `z-0`: `-z-10` was sliding behind the `bg-background` paint of the wrapper, hiding the arc entirely. `z-0` keeps it above the background but still behind all sections (which create their own stacking contexts via `relative`).
- `strokeWidth 1.5 → 2`, `opacity 0.3 → 0.55`, doubled drop-shadow: makes it actually readable on the dark background.
- `top-[250px] → top-[200px]` and slightly less negative `left`: nudges more of the arc's right edge into view at the current viewport.

**2. Make sure content sections sit above the arc**

No structural changes needed — every major `<section>` already participates in the normal flow above a `z-0` decorative SVG. The arc will appear as a faint neon sweep behind the hero / vault area without intercepting clicks (`pointer-events-none` retained).

### Scope
- Single file: `src/pages/Index.tsx` (only the decorative SVG block).
- No new imports, no other sections touched, no backend.
- Mobile + desktop both covered by responsive `left` / `w` values.

