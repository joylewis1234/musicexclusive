

## Plan: Enlarge "Become a superfan" to match hero headline

Update the "Become a superfan" headline in the Superfan CTA block on the homepage to match the visual weight of the hero headline ("STEP INSIDE THE VAULT: / THE FUTURE OF MUSIC IS HERE.").

### File
`src/pages/Index.tsx`

### Change
Replace the current `<h3>` element:

```tsx
<h3 className="text-foreground text-xl font-display font-bold text-center mb-3">
  Become a superfan
</h3>
```

With an `<h2>` that inherits the same global heading styles as the hero `<h1>` (Exo2 display font via global `h1, h2, h3` base styles in `index.css`), sized and weighted to match:

```tsx
<h2 className="text-foreground text-center mb-3">
  Become a superfan
</h2>
```

The global stylesheet already applies the display font and responsive sizing to `<h2>` to match the hero heading scale, so no explicit size classes are needed — it will render at the same size as "STEP INSIDE THE VAULT: / THE FUTURE OF MUSIC IS HERE." while keeping the centered alignment and bottom margin.

### Scope
- Single file: `src/pages/Index.tsx`
- One element changed (`<h3>` → `<h2>`, classes simplified)
- No other copy, layout, or styling changes

