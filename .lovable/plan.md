

## Plan: Update Exclusivity Email CTA Link

### What changes

**`supabase/functions/check-exclusivity/index.ts`** — single line change:

Replace the `ARTIST_DASHBOARD_URL` constant on line 9:
- From: `"https://musicexclusive.co/artist/dashboard"`
- To: `"https://www.musicexclusive.co/login"`

This updates the CTA link in all three exclusivity period emails (1-week warning, 2-day warning, expired notice).

### Files changed

| File | Action |
|------|--------|
| `supabase/functions/check-exclusivity/index.ts` | Update `ARTIST_DASHBOARD_URL` to `https://www.musicexclusive.co/login` |

