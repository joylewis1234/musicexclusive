

## Plan: Add decorative orbital arc to homepage

Add a neon pink orbital arc on the left side of the homepage that sweeps from the hero section down to the vault area.

### Changes — `src/pages/Index.tsx`

**1. Update main wrapper className**
Line 89: Change `className="min-h-screen bg-background"` to `className="min-h-screen bg-background relative overflow-hidden"` so the arc clips at page edges.

**2. Add decorative orbital arc SVG**
Insert after line 91 (`<VaultLockedModal />`), before the Artist Preview Strip section:

```jsx
{/* Decorative orbital arc — left side */}
<svg
  className="absolute top-[250px] -left-[100px] md:-left-[200px] w-[500px] md:w-[800px] h-[1000px] md:h-[1200px] pointer-events-none -z-10"
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
    strokeWidth="1.5"
    opacity="0.3"
    style={{ filter: 'drop-shadow(0 0 25px hsl(var(--primary) / 0.5))' }}
  />
</svg>
```

### Key positioning details
- Mobile: `-left-[100px] w-[500px]` pushes less off-screen so the right edge of the arc is clearly visible along the left margin
- Desktop: `md:-left-[200px] md:w-[800px]` for a wider, more subtle sweep
- `top-[250px]` positions the arc to start near the hero text and curve down past the vault
- Static (no animation), neon pink with 0.3 opacity and drop-shadow glow
- `-z-10` keeps it behind all content

### Scope
- Single file: `src/pages/Index.tsx`
- No new imports needed
- Frontend-only, no backend changes

