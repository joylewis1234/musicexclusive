

## Plan: Clean up Fan Homepage + rename header nav item

Frontend-only. Two files: `src/pages/Index.tsx` and `src/components/Header.tsx`.

### Part 2A — Remove "Benefits — For Artists" section
In `src/pages/Index.tsx`:
- Delete the `artistBenefits` array (lines ~85–101).
- Delete the JSX `<section>` that renders `<SectionHeader title="Benefits — For Artists" ...>` and maps `artistBenefits`.
- Keep `CashBonusFeed` and the fan `benefits` array/section untouched.

### Part 2B — Remove "Apply as an Artist" / waitlist button from bottom CTA
- In the bottom CTA, remove the button gated by `ARTIST_APPLICATION_ENTRY_ENABLED` ("Apply as an Artist" / "Join the Artist Waitlist").
- Remove the `ARTIST_APPLICATION_ENTRY_ENABLED` import if no other usage remains in `Index.tsx`.
- Keep the existing subtle "Are you an artist? Learn how to earn here →" link as-is (it already points to `/artist-benefits`), OR replace with the explicit section in 2E (see below — we'll go with 2E and remove the existing inline link to avoid duplication).

### Part 2C — Remove the duplicate Vault Portal section
- The page currently has only one Vault Portal section (the second was previously removed; a comment `{/* Second Vault Portal Section */}` remains as a stray marker right before the Benefits section).
- Remove that stray comment line for cleanliness. No other duplicate exists to delete.

### Part 2D — Fix vault portal image dark square
In the single Vault Portal section, replace:
```jsx
<img
  src={vaultPortal}
  alt="Vault Portal"
  className="relative w-full h-full object-contain vault-glow mix-blend-screen"
/>
```
with a wrapper applying a radial mask + `mix-blend-lighten`:
```jsx
<div
  className="relative w-full h-full"
  style={{
    maskImage: 'radial-gradient(ellipse 70% 70% at center, black 50%, transparent 100%)',
    WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at center, black 50%, transparent 100%)',
  }}
>
  <img
    src={vaultPortal}
    alt="Vault Portal"
    className="w-full h-full object-contain vault-glow mix-blend-lighten"
  />
</div>
```
This eliminates the dark/black square so only the glowing portal blends into the page background.

### Part 2E — Add "Are You an Artist?" link section above Footer
Just before `<Footer />`, add:
```jsx
<section className="px-4 py-8 text-center">
  <p className="text-muted-foreground text-sm font-body mb-2">Are you an artist?</p>
  <Button
    variant="ghost"
    size="sm"
    className="text-primary hover:text-primary/80"
    onClick={() => navigate("/artist-benefits")}
  >
    Learn how to earn on Music Exclusive →
  </Button>
</section>
```
Remove the existing inline `Are you an artist? Learn how to earn here →` button from the bottom CTA block to avoid duplication.

### Part 2F — Header nav label rename
In `src/components/Header.tsx`, in `mainNavItems`:
- Change `{ title: "Artist Benefits", href: "/artist-benefits", icon: Crown }` → `{ title: "For Artists", href: "/artist-benefits", icon: Crown }`.

### Scope confirmation
- Files modified: `src/pages/Index.tsx`, `src/components/Header.tsx`.
- No backend, routing, auth, payments, or Supabase changes.
- Reuses existing `Button`, `Footer`, `SectionHeader`, `BenefitCard`, `StepCard`, `CashBonusFeed`, `ChartsTeaser` — no new primitives.
- Mobile-first preserved; dark theme preserved.

