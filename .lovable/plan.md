

# Add Cash Bonus Feed + Charts Teaser Sections to Homepage

## Approach

Create two new components and insert them into `Index.tsx` between the Benefits section (line 330) and the Bottom CTA section (line 333).

## New Files

### 1. `src/components/home/CashBonusFeed.tsx`
- Editorial header: teal "ARTIST EARNINGS" label, bold title, muted subtitle, amber `<hr>`
- 8 static notification cards in a vertical feed
- Each card: `bg-card rounded-lg border-l-2 border-amber-400`, flex row layout
  - Left: emoji icon (🏆/$100+, 💰/$25-50) in a teal circle
  - Center: artist name (bold white) + genre (muted small) / milestone text / bonus amount (bold amber) / italic quote (teal tint)
  - Right: flag + time ago (muted small)
- Scrollable container with `max-h-[600px] overflow-y-auto` and hidden scrollbar
- Disclaimer + "See How Artist Earnings Work" teal outlined button → `/artist-agreement`

### 2. `src/components/home/ChartsTeaser.tsx`
- Editorial header: teal "EXCLUSIVE CHARTS" label, bold title, muted subtitle, amber `<hr>`
- 5 flat underline-style genre tabs (Pop, Hip-Hop/Rap, R&B, EDM, Latin Music) with `useState`
- Static leaderboard data object keyed by genre, 5 rows each
- Row design matches `/charts` page: rank number, flag + name, stream count, prize badge for top 3
- Top 3 left border accents (amber-400/slate-400/amber-600)
- Row hover: `bg-white/[0.02]`
- Disclaimer + two CTAs: filled "Become a Charting Artist" → `/artist/application-form`, outlined "View Full Charts" → `/charts`

## Modified File

### `src/pages/Index.tsx`
- Import `CashBonusFeed` and `ChartsTeaser`
- Insert between line 330 (end of Benefits section) and line 333 (Bottom CTA):
  ```tsx
  <CashBonusFeed />
  <ChartsTeaser />
  ```

No data fetching, no new dependencies, no changes to existing sections.

