

# Verification Report: Steps 6-13 — Critical Bug Found

## All Components Status

| Step | Component | Code Exists | Routing | Logic |
|------|-----------|-------------|---------|-------|
| 6 | Admin Cash Bonus Tracker | ✓ | ✓ | ✓ |
| 7 | `update-charts-standings` edge function | ✓ | N/A | ✓ |
| 8 | `close-annual-cycle` edge function | ✓ | N/A | ✓ |
| 9 | `disqualify-charts-artist` edge function | ✓ | N/A | ✓ |
| 10 | Admin Exclusive Charts page | ✓ | ✓ | ✓ |
| 11 | Public `/charts` page | ✓ | ✓ | **BUG** |
| 12 | ChartsEligibilityCard + ChartsBanner + country editor | ✓ | ✓ | ✓ |
| 13 | Country code (done in 12) | ✓ | N/A | ✓ |

## Critical Bug: Public Charts Page Broken for Unauthenticated Users

**Problem:** `ChartsPage.tsx` (line 67) joins `charts_bonus_cycles` with `artist_profiles!inner(artist_name, country_code)`. The `artist_profiles` table has RLS requiring the user to be the artist owner, an admin, or a vault member. Anonymous/unauthenticated visitors will get **zero results** because Supabase enforces RLS on both sides of the join.

**Root cause:** The `public_artist_profiles` view exists for public access, but:
1. It doesn't include `country_code`
2. It's a view (not a table), so it can't be used in FK-based joins via `!inner`

**Fix (2 parts):**

### Part 1: Add `country_code` to `public_artist_profiles` view

Migration SQL:
```sql
DROP VIEW IF EXISTS public.public_artist_profiles;
CREATE VIEW public.public_artist_profiles
WITH (security_invoker = false)
AS
SELECT id, user_id, artist_name, bio, genre, avatar_url,
       instagram_url, tiktok_url, youtube_url, twitter_url,
       country_code, created_at, updated_at
FROM public.artist_profiles;
GRANT SELECT ON public.public_artist_profiles TO anon, authenticated;
```

Note: changing to `security_invoker = false` (security definer) so the view bypasses RLS on `artist_profiles`, making it truly public. This only exposes non-sensitive fields.

### Part 2: Update ChartsPage query

Change `ChartsPage.tsx` to use a two-step approach:
1. Fetch `charts_bonus_cycles` (public RLS allows `status='active' AND rank IS NOT NULL`)
2. Fetch artist names/country codes from `public_artist_profiles` using the artist IDs

Alternatively, create a security-definer database function `get_public_charts(p_genre text, p_year int)` that returns chart entries joined with artist names — this is cleaner and avoids the two-query approach.

**Recommended: Database function approach**

```sql
CREATE OR REPLACE FUNCTION public.get_public_charts(p_genre text, p_year integer)
RETURNS TABLE(
  id uuid, artist_id uuid, cumulative_streams bigint,
  rank integer, prize_usd numeric, status text,
  artist_name text, country_code text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.artist_id, c.cumulative_streams, c.rank, c.prize_usd, c.status,
         a.artist_name, a.country_code
  FROM charts_bonus_cycles c
  JOIN artist_profiles a ON a.id = c.artist_id
  WHERE c.genre = p_genre AND c.cycle_year = p_year
    AND c.status = 'active' AND c.rank IS NOT NULL
  ORDER BY c.cumulative_streams DESC;
$$;
```

Then update `ChartsPage.tsx` to call `supabase.rpc("get_public_charts", { p_genre: activeGenre, p_year: currentYear })`.

## Other Verified Items (All Pass)

- **Prize values** in ChartsEligibilityCard: correctly $25/$50/$75/$150 (fixed in previous step)
- **Edge functions**: All use correct CORS, admin verification, service role clients
- **Admin pages**: Properly guarded by `AdminProtectedRoute`
- **ChartsBanner**: Correctly links to `/charts` from Discovery page
- **ChartsEligibilityCard**: Integrated into ArtistDashboard with correct `artistProfileId` prop
- **Country code editor**: 25 countries with flag emojis in EditArtistProfile
- **`admin_action_logs`**: Used by close-annual-cycle, disqualify-charts-artist, disqualify-bonus, approve-bonus-payout

## Summary

One fix needed: the public `/charts` page query must bypass `artist_profiles` RLS. The recommended approach is a `SECURITY DEFINER` database function + updating the view to include `country_code`.

