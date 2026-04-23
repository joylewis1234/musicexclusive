

## Plan: Mask the vault portal square on `/vault/enter`

The home page hides the PNG's dark square background with `mix-blend-screen`. The `/vault/enter` portal image is missing that class, so the square shows. One-line fix.

### Change — `src/pages/EnterVault.tsx` (line 196)

Add `mix-blend-screen` to the vault portal image className, matching the home page treatment:

```jsx
<img
  src={vaultPortal}
  alt="Vault Portal"
  className="relative w-full h-full object-contain vault-glow mix-blend-screen z-10"
/>
```

### Why
- The PNG has a dark, non-transparent background. `mix-blend-screen` blends the image against the page background so only the bright portal pixels remain visible — same trick already used in `src/pages/Index.tsx` (line 212).
- Keeps `vault-glow`, sizing, and stacking (`z-10`) untouched so the lightning overlay and floating fan comments still layer correctly.

### Scope
- Single file: `src/pages/EnterVault.tsx`
- One className addition. No other components, no backend.

