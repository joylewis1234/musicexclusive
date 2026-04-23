

## Plan: Replace orbital arc SVG with subtler, larger version

Swap the existing decorative SVG block in `src/pages/Index.tsx` with the version you provided — a larger, fainter ellipse pushed further off-screen for a more subtle background sweep.

### Changes — `src/pages/Index.tsx`

Replace the current decorative SVG (the `{/* Decorative orbital arc — left side */}` block) with:

```jsx
{/* Decorative orbital arc — left side */}
<svg
  className="absolute top-[300px] -left-[250px] md:-left-[350px] w-[600px] md:w-[900px] h-[1100px] md:h-[1400px] pointer-events-none z-0"
  viewBox="0 0 900 1400"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <ellipse
    cx="450"
    cy="700"
    rx="420"
    ry="650"
    stroke="hsl(var(--primary))"
    strokeWidth="1"
    opacity="0.15"
    style={{ filter: 'drop-shadow(0 0 15px hsl(var(--primary) / 0.3))' }}
  />
</svg>
```

### What changes vs. current
- Larger ellipse (`rx 380→420`, `ry 550→650`) and bigger viewBox (`900x1400`).
- Pushed further off-screen (`-left-[250px] md:-left-[350px]`) so only the right edge sweeps into view.
- Thinner stroke (`2 → 1`), lower opacity (`0.55 → 0.15`), softer single drop-shadow — much more subtle.
- Lower start point (`top-[200px] → top-[300px]`).

### Scope
- Single file: `src/pages/Index.tsx` (only the decorative SVG block).
- No other changes, no new imports, no backend.

