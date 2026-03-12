

# Redesign /charts Page — Billboard-Style Editorial Layout

## Scope
Visual/layout-only rewrite of `src/pages/ChartsPage.tsx`. All data fetching, query logic, genre slugs, routing, types, and constants remain untouched. Only the JSX return block changes.

## Changes (single file: `src/pages/ChartsPage.tsx`)

### Header Section
- Remove centered hero with pill badge and Trophy icon
- Left-aligned layout: small teal uppercase `"{currentYear} SEASON"` label, large bold `"EXCLUSIVE CHARTS"` h1, thin amber `<hr>`, muted subtitle below
- No glow effects or gradients on text

### Stat Bar
- Replace 4 `GlowCard` grid with a single full-width slim bar (`bg-card border border-border`)
- 4 stats in a horizontal flex row separated by `border-r border-border` vertical dividers
- Each stat: small muted uppercase label on top, white bold value below
- Compact height, no icons

### Genre Tabs
- Replace pill-style `TabsList` with a custom horizontally-scrollable row of buttons
- No `bg-muted/30` wrapper — transparent background
- Active: `text-white font-bold border-b-2 border-primary` (teal underline)
- Inactive: `text-muted-foreground`, hover brightens to white
- `overflow-x-auto` with hidden scrollbar, `flex-nowrap`

### Chart Rows (populated state)
- Remove `GlowCard` wrapper — use a plain `div` with `divide-y divide-border/30`
- Each row: `flex items-center px-4 py-4 hover:bg-white/[0.02] transition-colors`
- Layout: rank number (w-12, large bold muted) | flag + artist name (flex-1, name bold white, streams count + "streams" label stacked) | prize badge pill (top 3 only)
- Top 3 rows get a 3px left border accent: rank 1 `border-l-amber-400`, rank 2 `border-l-slate-400`, rank 3 `border-l-amber-600`
- Rank 1 shows `#1` text instead of Trophy icon (consistent numbering)

### Empty State
- 3 ghost placeholder rows at `opacity-40 blur-[1px]` with left border stripes (gold/silver/bronze)
  - `#1 🏆 First to Qualify`, `#2 ·· First to Qualify`, `#3 ·· First to Qualify`
- Below: centered muted text with genre name, "Be the first" subtitle
- Teal outlined pill button "Become an Artist"

### Callout Bar
- Replace centered gold banner with left-aligned slim bar
- `border-l-4 border-amber-400 bg-card` with `px-4 py-3`
- White text, same content

### Footer Note
- Keep existing text and centered layout, no changes

### Imports Cleanup
- Remove `GlowCard`, `Music`, `Globe` imports (no longer used)
- Keep all other imports

