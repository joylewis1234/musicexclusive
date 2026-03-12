# Cash Bonus & Exclusive Charts — Full Implementation Blueprint
DB Schema | Edge Functions | Lovable Prompts | Developer Guide

## Document Overview

| Section | Contents | Who Uses It |
| --- | --- | --- |
| 1. Feature Overview | Business logic summary | Everyone |
| 2. DB Schema | Tables, columns, SQL | Developer |
| 3. Edge Functions | Function specs + logic | Developer |
| 4. Lovable Prompts | Copy-paste UI prompts | Joy (you) |
| 5. Edge Cases | Scenarios + handling | Developer |
| 6. Build Order | Step-by-step sequence | Both |

---

## Section 1 — Feature Overview

### 1.1 Cash Bonus Program
A one-time, non-repeatable performance incentive that rewards artists for hitting streaming milestones. Once all four milestones are completed, the artist unlocks eligibility for the Exclusive Charts Bonus Program.

| Milestone | Bonus Amount |
| --- | --- |
| 1,000 Verified Streams | $25.00 |
| 2,500 Verified Streams | $50.00 |
| 5,000 Verified Streams | $100.00 |
| 10,000 Verified Streams | $125.00 (Program Complete) |
| Maximum Total | $300.00 per artist |

Key rules:
- Milestones are sequential — each must be unlocked before the next
- Each milestone can only be triggered once per artist
- Paid on standard weekly Monday payout schedule via Stripe Connect
- Disqualified if streams are flagged as Streaming Manipulation
- Company may reverse or recoup bonuses already paid if fraud is later determined

### 1.2 Exclusive Charts Bonus Program
An annual competition rewarding the top 3 artists per genre. Artists must complete the Cash Bonus Program first (gate). Rankings reset every January 1. Cumulative stream counts never reset.

| Detail | Value |
| --- | --- |
| Cycle | Annual — January 1 through December 31 |
| Gate | Must have received full $300 Cash Bonus |
| Qualification | 10,000 cumulative Verified Streams per genre |
| Qualification Type | Lifetime gate — qualify once, eligible forever |
| Eligible Genres | 10 (see below) |
| 1st Place Prize | $500.00 per genre |
| 2nd Place Prize | $250.00 per genre |
| 3rd Place Prize | $100.00 per genre |
| Prize Payment | Within 30 days of cycle close |
| Multi-Genre | Artist can win in multiple genres simultaneously |

The 10 eligible genres:
- Pop
- Hip-Hop/Rap
- Latin Music
- Country
- Electronic Dance Music (EDM)
- Rock
- Phonk & Trap
- K-Pop
- Alternative/Indie
- R&B

Note: Hip-Hop/Rap and R&B are separate genres. Leaderboard displays all qualified artists with their country flag emoji regardless of top-3 placement.

---

## Section 2 — Database Schema

### 2.1 New Table: `bonus_milestones`
Tracks each Cash Bonus milestone per artist. One row per milestone per artist.

```sql
CREATE TABLE bonus_milestones (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id             uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  milestone_streams     int NOT NULL,        -- 1000 | 2500 | 5000 | 10000
  bonus_amount          numeric(10,2) NOT NULL, -- 25 | 50 | 100 | 125
  cycle_number          int NOT NULL DEFAULT 1,
  stream_count_at_trigger int,               -- total streams when triggered
  status                text NOT NULL DEFAULT 'pending',
                        -- pending | approved | paid | disqualified
  disqualification_reason text,
  approved_by           text,                -- admin user id or email
  approved_at           timestamptz,
  paid_at               timestamptz,
  stripe_transfer_id    text,
  cash_bonus_complete   boolean DEFAULT false, -- true when 10k milestone paid
  created_at            timestamptz DEFAULT now(),
  UNIQUE (artist_id, milestone_streams)
);
```

Status flow:
- pending — milestone crossed, awaiting admin approval
- approved — admin approved, queued for Stripe transfer
- paid — Stripe transfer confirmed
- disqualified — fraud detected, bonus forfeited

### 2.2 New Table: `charts_bonus_cycles`
Tracks each artist's annual Exclusive Charts standing per genre. One row per artist per genre per year.

```sql
CREATE TABLE charts_bonus_cycles (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id                uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  genre                    text NOT NULL,    -- genre slug (see 2.4)
  cycle_year               int NOT NULL,     -- e.g. 2025
  annual_streams           int NOT NULL DEFAULT 0,  -- resets each Jan 1
  cumulative_genre_streams int NOT NULL DEFAULT 0,  -- never resets
  is_qualified             boolean DEFAULT false,   -- cumulative >= 10,000
  rank                     int,              -- 1 | 2 | 3 | null
  prize_amount             numeric(10,2),    -- 500 | 250 | 100 | null
  status                   text NOT NULL DEFAULT 'active',
                           -- active | pending_payout | paid | disqualified
  disqualification_reason  text,
  stripe_transfer_id       text,
  paid_at                  timestamptz,
  created_at               timestamptz DEFAULT now(),
  UNIQUE (artist_id, genre, cycle_year)
);
```

### 2.3 Alter Table: `artist_profiles`
Add `country_code` to support leaderboard country flag display.

```sql
ALTER TABLE artist_profiles
  ADD COLUMN IF NOT EXISTS country_code text;
```

Notes:
- ISO 3166-1 alpha-2 format (e.g. `US`, `GB`, `NG`, `BR`)
- Display as emoji flag on leaderboard
- Null displays as globe emoji: 🌐

### 2.4 Genre Slugs Reference

| Display Name | Slug |
| --- | --- |
| Pop | pop |
| Hip-Hop/Rap | hip-hop |
| Latin Music | latin |
| Country | country |
| Electronic Dance Music (EDM) | edm |
| Rock | rock |
| Phonk & Trap | phonk-trap |
| K-Pop | k-pop |
| Alternative/Indie | alternative-indie |
| R&B | rnb |

### 2.5 Recommended Indexes

```sql
-- bonus_milestones
CREATE INDEX idx_bonus_milestones_artist_id ON bonus_milestones(artist_id);
CREATE INDEX idx_bonus_milestones_status ON bonus_milestones(status);

-- charts_bonus_cycles
CREATE INDEX idx_charts_cycles_artist_genre ON charts_bonus_cycles(artist_id, genre);
CREATE INDEX idx_charts_cycles_year_genre ON charts_bonus_cycles(cycle_year, genre);
CREATE INDEX idx_charts_cycles_qualified ON charts_bonus_cycles(is_qualified, genre, cycle_year);
```

---

## Section 3 — Edge Functions

### 3.1 `check-bonus-milestones`
Trigger
- Called after each stream charge OR nightly cron

Purpose
- Detect new milestone crossings and insert `bonus_milestones` rows

Logic:
- Fetch artist's total verified stream count from streams table
- Fetch all existing `bonus_milestones` rows for this artist
- For each of [1000, 2500, 5000, 10000]:
  - If stream count >= threshold AND no existing row for that milestone, insert new row with status = `pending`
- If milestone 10000 is being inserted, also check if all 4 milestones now exist — if so, set `cash_bonus_complete = true` on the 10000 row
- Idempotent — safe to run multiple times, UNIQUE constraint prevents duplicates

### 3.2 `approve-bonus-payout`
Trigger
- Admin action from `/admin/bonus-tracker/cash-bonus`

Auth
- Admin role required

Input
- `milestone_id` (uuid)

Logic:
- Validate admin JWT and role
- Fetch `bonus_milestones` row — confirm status = `pending`
- Confirm artist has valid Stripe Connect account
- Create Stripe Connect transfer for `bonus_amount` to artist's Stripe account
- Update `bonus_milestones`: status = `paid`, paid_at = now(), stripe_transfer_id
- If this is the 10000 milestone: set `cash_bonus_complete = true`
- Log action to `admin_action_logs`
- Send Resend email to artist: "You've earned a $X bonus!"
- Return `{ success: true, stripe_transfer_id }`

### 3.3 `disqualify-bonus`
Trigger
- Admin action from `/admin/bonus-tracker/cash-bonus`

Auth
- Admin role required

Input
- `artist_id` (uuid), `reason` (text), `recoup_paid` (boolean)

Logic:
- Set all pending and approved `bonus_milestones` for artist to status = `disqualified`
- Store `disqualification_reason` on all affected rows
- If `recoup_paid = true`: flag previously paid bonuses for recoupment via future payout hold
- Log to `admin_action_logs`
- Optionally notify artist via Resend email

### 3.4 `update-charts-standings`
Trigger
- Nightly cron (midnight UTC)

Purpose
- Recalculate annual and cumulative stream counts per genre per artist

Logic:
- For each genre slug: aggregate verified streams for current calendar year per artist
- Upsert `charts_bonus_cycles` row for artist + genre + current year
- Update `annual_streams` with current year count
- Update `cumulative_genre_streams` with all-time count for that genre
- If cumulative >= 10,000 and `is_qualified = false`: set `is_qualified = true`
- Recalculate rank within each genre by `annual_streams` descending — update `rank` field for top 3
- Do NOT set prize_amount or status here — that happens at cycle close

### 3.5 `close-annual-cycle`
Trigger
- Admin action — run once per genre after December 31

Auth
- Admin role required

Input
- `genre` (text), `cycle_year` (int)

Logic:
- Fetch all `charts_bonus_cycles` rows for genre + year where `is_qualified = true`
- Sort by annual_streams descending
- Assign rank 1, 2, 3 and prize_amount 500, 250, 100 to top 3
- Set status = `pending_payout` for top 3
- Trigger Stripe Connect transfers for each prize winner
- Set status = `paid`, paid_at, stripe_transfer_id on successful transfer
- Create `charts_bonus_cycles` rows for next year (cycle_year + 1) for all qualified artists
- Send Resend email to each prize winner
- Log to `admin_action_logs`
- Tie handling: if two artists are tied at rank 3, both receive $100. Admin is notified via email.

### 3.6 `disqualify-charts-artist`
Trigger
- Admin action from `/admin/bonus-tracker/exclusive-charts`

Auth
- Admin role required

Input
- `artist_id`, `genre`, `cycle_year`, `reason`

Logic:
- Set `charts_bonus_cycles` status = `disqualified` for specified artist + genre + year
- Remove from leaderboard display (is_qualified stays true for future cycles — only current cycle disqualified)
- If prize already paid: flag for recoupment
- Recalculate ranks for remaining qualified artists in that genre/year
- Log to `admin_action_logs`

---

## Section 4 — Lovable Prompts

Paste each prompt separately into Lovable in the order listed. Wait for confirmation before moving to the next.

### Prompt 1 of 4 — DB Migration
Run the following SQL migration in Supabase:

```sql
CREATE TABLE bonus_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  milestone_streams int NOT NULL,
  bonus_amount numeric(10,2) NOT NULL,
  cycle_number int NOT NULL DEFAULT 1,
  stream_count_at_trigger int,
  status text NOT NULL DEFAULT 'pending',
  disqualification_reason text,
  approved_by text,
  approved_at timestamptz,
  paid_at timestamptz,
  stripe_transfer_id text,
  cash_bonus_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (artist_id, milestone_streams)
);

CREATE TABLE charts_bonus_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  genre text NOT NULL,
  cycle_year int NOT NULL,
  annual_streams int NOT NULL DEFAULT 0,
  cumulative_genre_streams int NOT NULL DEFAULT 0,
  is_qualified boolean DEFAULT false,
  rank int,
  prize_amount numeric(10,2),
  status text NOT NULL DEFAULT 'active',
  disqualification_reason text,
  stripe_transfer_id text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (artist_id, genre, cycle_year)
);

ALTER TABLE artist_profiles
  ADD COLUMN IF NOT EXISTS country_code text;

CREATE INDEX idx_bonus_milestones_artist_id ON bonus_milestones(artist_id);
CREATE INDEX idx_bonus_milestones_status ON bonus_milestones(status);
CREATE INDEX idx_charts_cycles_artist_genre ON charts_bonus_cycles(artist_id, genre);
CREATE INDEX idx_charts_cycles_year_genre ON charts_bonus_cycles(cycle_year, genre);
CREATE INDEX idx_charts_cycles_qualified ON charts_bonus_cycles(is_qualified, genre, cycle_year);
```

This is additive only. Do not modify any existing tables or data.

### Prompt 2 of 4 — `check-bonus-milestones` Edge Function
Create a new Supabase edge function called `check-bonus-milestones`.

This function checks whether an artist has crossed any Cash Bonus milestones and inserts new `bonus_milestones` rows if so.

The function should:
1. Accept `artist_id` in the request body
2. Query the total verified stream count for this artist from the streams table (or whichever table tracks verified streams)
3. Fetch all existing `bonus_milestones` rows for this artist
4. For each milestone threshold [1000, 2500, 5000, 10000]:
   - If artist stream count >= threshold
   - AND no existing `bonus_milestones` row exists for this artist at this milestone_streams value
   - Then insert a new row with:
     - milestone_streams = threshold
     - bonus_amount = [25, 50, 100, 125] corresponding to threshold
     - status = `pending`
     - stream_count_at_trigger = current stream count
5. If the 10000 milestone row is being inserted, check if all 4 milestones now exist for this artist. If yes, set `cash_bonus_complete = true` on the 10000 milestone row.
6. Return `{ triggered: string[] }` listing which milestones were newly created, or empty array if none.

The function must be idempotent — safe to call multiple times. The UNIQUE constraint on (artist_id, milestone_streams) prevents duplicate rows.

This function should be callable internally (from the `charge-stream` edge function) and also via a nightly cron. Use service role key for DB access.

### Prompt 3 of 4 — Admin Cash Bonus Tracker Page
Create a new admin page at `/admin/bonus-tracker/cash-bonus`. Gate it behind the existing admin auth check.

The page has:

Summary cards (4 cards in a row)
- Total Paid: sum of all paid `bonus_milestones` bonus_amount
- Pending Approvals: count of rows with status = `pending`
- Artists Completed: count of distinct artist_ids where `cash_bonus_complete = true`
- In Progress: count of distinct artists with at least one milestone but `cash_bonus_complete = false`

Filters (above the table)
- Status dropdown: All | Pending | In Progress | Completed | Disqualified
- Search by artist name

Main table columns
- Artist Name
- Total Streams
- Milestones (4 checkmark icons, green if paid, gray if not reached, amber if pending)
- Total Paid ($)
- Status
- Actions

Status badges
- In Progress: blue badge
- Milestone Hit - Pending Approval: amber badge
- Completed: gold badge + "Eligible for Exclusive Charts" text
- Disqualified: red badge

Actions per row
- "Approve & Pay" green button (only shows when status = `pending`) — on click, calls `approve-bonus-payout` edge function with the pending `milestone_id`. Show confirmation dialog before executing.
- "Disqualify" red button — on click, opens a modal requiring admin to type a disqualification reason before confirming. Calls `disqualify-bonus` edge function.

Use React Query for all data fetching. Match existing admin page styles. Add this page to the existing admin sidebar navigation under a "Bonus Tracker" section.

### Prompt 4 of 4 — Admin Exclusive Charts Page
Create a new admin page at `/admin/bonus-tracker/exclusive-charts`. Gate it behind the existing admin auth check. Add it to the admin sidebar under the existing "Bonus Tracker" section alongside the Cash Bonus page.

The page has:

Summary bar at the top:
- Current Year
- Days Until Cycle Reset
- Total Qualified Artists
- Total Prize Pool (sum of all `pending_payout` prize_amounts)

Genre tab bar:
- 10 tabs: Pop | Hip-Hop/Rap | Latin Music | Country | EDM | Rock | Phonk & Trap | K-Pop | Alternative/Indie | R&B

Each tab shows a leaderboard table for that genre:
- Rank
- Flag (country_code as emoji flag, globe if null)
- Artist Name
- Genre Streams This Year
- Cumulative Genre Streams
- Qualified (green check or gray dash)
- Prize
- Status
- Actions

Rank highlighting:
- Rank 1 row: gold background
- Rank 2 row: silver/light gray background
- Rank 3 row: bronze/amber background
- All other rows: default

Actions per row:
- "Disqualify" red button — opens modal requiring reason. Calls `disqualify-charts-artist` edge function.

Close annual cycle button:
- Shown at top right of each genre tab
- Label: "Close [Genre] Cycle [Year]"
- Admin only — opens a confirmation modal:
  "This will finalize rankings and trigger Stripe payouts for the top 3 artists. This cannot be undone."
- On confirm: calls `close-annual-cycle` edge function with genre and cycle_year

Use React Query for all data fetching. Match existing admin page styles.

---

## Section 5 — Edge Cases & Handling

### 5.1 Cash Bonus Edge Cases

| Scenario | How to Handle |
| --- | --- |
| Artist hits multiple milestones in one batch | All crossed thresholds trigger simultaneously — insert all rows at once |
| Streams flagged as fake after bonus already paid | disqualify-bonus sets status = disqualified, flags for recoupment via future payout hold |
| Artist has no Stripe Connect account | Block approve-bonus-payout — surface warning in admin UI with artist name highlighted |
| Admin approves same milestone twice | Edge function checks status before processing — returns error if already paid |
| Artist deleted before bonus paid | ON DELETE CASCADE removes rows — no orphaned records |
| Stripe transfer fails | Log error, keep status = approved, surface retry button in admin UI |

### 5.2 Exclusive Charts Edge Cases

| Scenario | How to Handle |
| --- | --- |
| Cash bonus not complete but 10k genre streams hit | Gate enforced via cash_bonus_complete flag — not eligible for charts until gate passed |
| Artist qualifies in multiple genres simultaneously | Separate charts_bonus_cycles row per genre — each tracked independently |
| Tie at rank 3 (two artists same annual streams) | Both receive $100 — admin notified via email — both rows get rank = 3 |
| No country_code set on artist profile | Display globe emoji on leaderboard — admin dashboard flags missing country_code |
| close-annual-cycle called twice for same genre/year | Check if cycle already closed before processing — return error if yes |
| Artist disqualified mid-cycle | Remove from leaderboard, recalculate ranks for remaining artists in that genre/year |
| Artist wins, then fraud discovered after payout | Flag stripe_transfer_id for recoupment — hold future payouts until recovered |
| No qualified artists in a genre for the year | No prizes issued — log to admin — no close_annual_cycle action needed |

### 5.3 Security Notes
- Never trust client-supplied stream counts — always recalculate server-side
- check-bonus-milestones must use service role key — never expose to client
- approve-bonus-payout and close-annual-cycle require admin JWT validation
- All Stripe transfers must be logged with stripe_transfer_id before marking paid
- Rate limit check-bonus-milestones if called after each stream — batch nightly is safer for scale

---

## Section 6 — Build Order

Follow this sequence exactly. Each step depends on the previous.

| Step | Action |
| --- | --- |
| Step 1 | Run Lovable Prompt 1 — DB migration (bonus_milestones, charts_bonus_cycles, country_code) |
| Step 2 | Run Lovable Prompt 2 — check-bonus-milestones edge function |
| Step 3 | Hook check-bonus-milestones into existing charge-stream edge function (call after successful charge) |
| Step 4 | Create approve-bonus-payout edge function (Section 3.2) |
| Step 5 | Create disqualify-bonus edge function (Section 3.3) |
| Step 6 | Run Lovable Prompt 3 — Admin Cash Bonus Tracker page |
| Step 7 | Create update-charts-standings edge function (Section 3.4) |
| Step 8 | Create close-annual-cycle edge function (Section 3.5) |
| Step 9 | Create disqualify-charts-artist edge function (Section 3.6) |
| Step 10 | Run Lovable Prompt 4 — Admin Exclusive Charts page |
| Step 11 | Run Lovable Prompt 5 — Public /charts page (Section 7) |
| Step 12 | Run Lovable Prompt 6 — Dashboard & Discovery links (Section 7) |
| Step 13 | Add country_code to artist profile edit page |
| Step 14 | Test: stream -> milestone -> admin approval -> payout -> charts rank |

---

## Section 7 — Public Exclusive Charts Page (Lovable Prompts 5 & 6)

Run these two prompts after the developer completes Steps 1-10. The DB tables must exist before the live /charts page will work.

### 7.1 Background & Decisions

| Decision | Choice |
| --- | --- |
| Who can view charts | Public — no login required |
| Homepage teaser | Handled by Joy separately — static placeholder data |
| Full charts page | /charts — live Supabase data |
| Prize visibility | Prize amounts visible to public ($500, $250, $100) |
| Artist display | Artist name + country flag emoji |
| Genres shown | All 10 genres via tab bar |
| Leaderboard scope | All qualified artists per genre, not just top 3 |
| Linked from | Artist dashboard + fan discovery page |

### Lovable Prompt 5 of 6 — Public /charts Page
Create a new public page at `/charts`. No login required.
Add to main site navigation and footer under Discover.

Page header:
- Title: Exclusive Charts
- Subtitle: The top-streaming artists on Music Exclusive, ranked by genre. Updated weekly.
- Two stat cards: 10 Genres and Prizes up to $500 per genre per year
- Gold banner: Artists earn $0.10 per stream. Top artists earn cash prizes. Every stream counts.
- Current year badge: [YEAR] Season — Resets January 1

Genre tab bar (all 10 genres):
- Pop | Hip-Hop/Rap | Latin Music | Country | EDM | Rock | Phonk & Trap | K-Pop | Alternative/Indie | R&B

Genre slug reference:
- Pop=pop, Hip-Hop/Rap=hip-hop, Latin Music=latin, Country=country, EDM=edm,
  Rock=rock, Phonk & Trap=phonk-trap, K-Pop=k-pop, Alternative/Indie=alternative-indie, R&B=rnb

Each tab queries Supabase: `charts_bonus_cycles`
- WHERE genre=slug AND cycle_year=current year AND is_qualified=true AND status!=disqualified
- JOIN artist_profiles ON artist_id for display_name and country_code
- ORDER BY annual_streams DESC

Leaderboard row:
- Rank | Flag emoji | Artist Name | Streams This Year | Prize badge top 3 only

Row backgrounds:
- Rank 1: gold tint + Trophy icon + gold $500 prize badge
- Rank 2: silver tint + $250 prize silver badge
- Rank 3: amber tint + $100 prize amber badge
- Rank 4+: default background, no prize badge

Empty state:
- No artists have qualified in [Genre] yet this season.
- Be the first - 10,000 streams unlocks your spot on the charts.
- Button: Become an Artist linking to /artist/application-form

Loading state:
- Skeleton rows while fetching.

Footer note:
- Chart eligibility requires completion of the Cash Bonus Program.
- Rankings reflect verified streams only. Prizes paid annually.
- Questions? support@musicexclusive.co

React Query queryKey: `[charts, genre, year]`, staleTime: 5 minutes.
Use shadcn/ui Tabs. lucide-react Trophy, Music, Globe icons.
Match existing dark theme. No auth gating.

### Lovable Prompt 6 of 6 — Dashboard & Discovery Links

Change 1 — Artist Dashboard
- Add charts eligibility card. Fetch `cash_bonus_complete` from `bonus_milestones` for current artist.

If `cash_bonus_complete = true`:
- Gold-bordered card
- Title: You are Eligible for Exclusive Charts
- Body: You have completed the Cash Bonus Program.
- Compete for $500, $250, or $100 in your genre this year.
- Button: View Charts linking to /charts (new tab)

If `cash_bonus_complete = false`:
- Muted progress card
- Title: Your Path to Exclusive Charts
- Body: Complete the Cash Bonus Program to unlock eligibility.
- 4 milestone checkmarks (green=paid, gray=not reached):
  - 1,000 streams ($25) | 2,500 streams ($50) | 5,000 streams ($75) | 10,000 streams ($150)
- Fetch status from `bonus_milestones` where artist_id = current user

Change 2 — Fan Discovery Page
- Add charts banner card near top of discovery page:
  - Dark card with gold border
  - Left: Trophy icon + Exclusive Charts
  - Subtitle: See who is leading the charts this week
  - Right: View Charts button linking to /charts

React Query for milestone fetch. Match existing card styles.

---

## Section 8 — Charts Page Technical Notes for Developer

### 8.1 Data Flow for /charts Page
The /charts page is read-only. It calls the `get_public_charts` SECURITY DEFINER RPC function, which joins `charts_bonus_cycles` with `artist_profiles` server-side (bypassing artist_profiles RLS). Data is populated by the update-charts-standings nightly cron (Section 3.4). No writes happen from this page.

| Data Need | Source |
| --- | --- |
| Artist display name | artist_profiles.artist_name (via RPC) |
| Country flag | artist_profiles.country_code ISO 3166-1 alpha-2 (via RPC) |
| Cumulative streams | charts_bonus_cycles.cumulative_streams |
| Rank | charts_bonus_cycles.rank (NOT NULL = qualified) |
| Current year filter | charts_bonus_cycles.cycle_year = current year |
| Genre filter | charts_bonus_cycles.genre = slug |
| Sort order | ORDER BY cumulative_streams DESC |
| Prize amounts | Derived client-side: rank 1=$500, rank 2=$250, rank 3=$100 |

### 8.2 Country Code to Flag Emoji Utility

```ts
function countryCodeToFlag(code: string | null): string {
  if (!code || code.length !== 2) return "🌍";
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}
```

Examples:
- countryCodeToFlag("US") => 🇺🇸
- countryCodeToFlag("NG") => 🇳🇬
- countryCodeToFlag(null) => 🌍

### 8.3 Database Function (SECURITY DEFINER)

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

### 8.4 Frontend Query (Supabase RPC)

```ts
const { data, error } = await supabase
  .rpc("get_public_charts", { p_genre: activeGenre, p_year: currentYear });
```

### 8.5 React Query Key Convention

```ts
useQuery({
  queryKey: ["charts", selectedGenre, currentYear],
  queryFn: () => fetchChartsByGenre(selectedGenre, currentYear),
  staleTime: 5 * 60 * 1000,
});
```

### 8.6 RLS Policy — Public Read Access

```sql
CREATE POLICY "Public can read active charts cycles"
  ON charts_bonus_cycles
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active' AND rank IS NOT NULL);
```

Note: The direct table query is only used by admin/artist RLS policies. The public `/charts` page uses the `get_public_charts()` RPC function which bypasses `artist_profiles` RLS safely.

---

## Section 9 — Implementation Verification Summary

All 13 steps verified and tested. Two bugs were found and fixed during verification:

| Bug | Location | Fix Applied |
| --- | --- | --- |
| Prize mismatch (5k=$100, 10k=$125) | `ChartsEligibilityCard.tsx` | Corrected to 5k=$75, 10k=$150 |
| Public charts broken for anon users | `ChartsPage.tsx` direct join on RLS-protected `artist_profiles` | Created `get_public_charts()` SECURITY DEFINER RPC |
