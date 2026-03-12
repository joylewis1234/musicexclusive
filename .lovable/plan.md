

# Redesign ChartsBanner — Billboard-Style Callout Bar

## What Changes

**Single file: `src/components/discovery/ChartsBanner.tsx`**

Redesign the existing `ChartsBanner` to match the callout bar style from the `/charts` page:

- `bg-card` background with `border-l-4 border-amber-400` left accent (no gold background tint)
- `rounded-lg` instead of `rounded-2xl`
- Single-row flex layout:
  - **Left:** Trophy icon (amber-400, size 20, no background circle) + bold "Exclusive Charts" title + muted subtitle "See who's leading the charts this week"
  - **Right:** Outlined teal pill button "View Charts" linking to `/charts`
- **Dismissible:** Add `useState` for dismissed state, X button (lucide `X` icon) in top-right corner, `text-muted-foreground hover:text-foreground`
- When dismissed, render `null` (session-only, no persistence needed)
- Remove all inline `style` props — use only Tailwind classes

No changes to `Discovery.tsx` or any other file. The banner placement stays the same.

