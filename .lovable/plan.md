

## Plan: Premium artist landing page + cleaned-up fan homepage

Two frontend-only files. No backend touched.

---

### Part 1 — Upgrade `src/pages/ArtistBenefits.tsx`

**1A. Decorative orbital ring arcs**
Add 2–3 inline SVG `<ellipse>` elements absolutely positioned inside the hero section's relative container (and one near the bottom CTA). All `pointer-events-none`, `-z-10`, parent `overflow-hidden`.
- Ring A (upper-left, ~1200px, primary/pink, tilted, 120s spin)
- Ring B (lower-right, ~900px, accent/purple, tilted, 80s spin reversed)
- Ring C (center-right, ~800px, secondary/cyan, 100s spin)
- Each: `fill="none"`, `strokeWidth="1.25"`, `opacity 0.3`, `filter: drop-shadow(0 0 15px hsl(var(--primary) / 0.5))`
- Use Tailwind `animate-spin` with inline `style={{ animationDuration: '120s' }}`; reverse via `animationDirection: 'reverse'`.

**1B. Hero refinements**
- Padding `pt-24 pb-16` → `pt-28 pb-20`.
- Below the existing CTA buttons add:
  - **Social proof strip**: 5 overlapping `w-8 h-8 rounded-full bg-muted border-2 border-background -ml-2` dots followed by bold `text-muted-foreground text-sm` — "Join artists already earning on Music Exclusive". Centered, `mt-8`.
  - **"For Fans" link**: small `text-muted-foreground text-xs hover:text-primary transition-colors cursor-pointer mt-4` — "Looking to discover music? → Fan Home", navigates to `/`.

**1C. New "How It Works" section** (between hero and "Your Music. Your Money. Your Rules.")
- `<SectionHeader title="How It Works" align="center" />`
- 3 vertical `GlowCard`s. Each: numbered badge (`w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center`), bold title, `text-muted-foreground text-sm` description.
  1. **Apply & Upload** — "Submit your application. Once approved, upload your exclusive tracks in minutes."
  2. **Fans Stream With Credits** — "Every stream is a direct transaction — fans pay with credits, you earn real revenue per play."
  3. **Get Paid Weekly** — "Earnings are calculated transparently and paid out every Monday via Stripe Connect."

**1D. Footer**
Import `Footer from "@/components/Footer"` and render `<Footer />` after the watermark protection section. Remove the trailing spacer div.

**1E. Final section order**
Header → Hero (rings + social proof + Fan Home link) → **How It Works (NEW)** → existing sections in current order → Watermark Protection → **Footer (NEW)**

---

### Part 2 — Clean up `src/pages/Index.tsx`

**2A. Remove artist-specific content**
- Remove the **"Benefits — For Artists"** section and the `artistBenefits` array.
- Remove the **"Apply as an Artist / Join the Artist Waitlist"** Button at the bottom of the bottom-CTA stack and the now-unused `ARTIST_APPLICATION_ENTRY_ENABLED` import.
- **Keep `CashBonusFeed`** and its import (social proof for fans).

**2B. Remove the duplicate Vault Portal section**
The Vault Portal block currently renders twice. Delete the **second** occurrence (between "How It Works" and the artist benefits area), keeping the first.

**2C. Fix vault portal image dark-square issue**
Add `mix-blend-screen` to the remaining vault portal `<img>` className so dark pixels in the PNG drop out against the dark background. Keep `vault-glow` and surrounding glow orbs.

**2D. Add subtle "Are you an artist?" link**
At the bottom of the bottom-CTA section (replacing the removed artist Button), add:
> Are you an artist? Learn how to earn here →

Styled `text-muted-foreground text-xs hover:text-primary transition-colors cursor-pointer mt-6 text-center`, navigates to `/artist-benefits`.

**2E. Final Index.tsx section order**
Header → Artist Preview Strip → Hero → Vault Portal (single, blended) → Artists Carousel → How It Works → Benefits — For Fans → CashBonusFeed → Charts Teaser → Bottom CTA (with subtle "Are you an artist?" link) → Footer

---

### Technical notes
- Pure JSX/Tailwind in two files: `src/pages/ArtistBenefits.tsx`, `src/pages/Index.tsx`.
- New import on ArtistBenefits: `Footer`.
- Removed imports on Index: `ARTIST_APPLICATION_ENTRY_ENABLED` and the `artistBenefits` constant. `CashBonusFeed` import retained.
- `mix-blend-screen` works because the page background is dark.
- Orbital rings: SVG `<ellipse>` inside an absolutely-positioned `<svg>` larger than viewport; cropped by parent `overflow-hidden`.
- No new dependencies, no backend changes.

