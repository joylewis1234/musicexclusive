
-- Step 1: Add country_code to artist_profiles
ALTER TABLE public.artist_profiles
  ADD COLUMN IF NOT EXISTS country_code text DEFAULT NULL;

-- Step 2: Create bonus_milestones table
CREATE TABLE public.bonus_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.artist_profiles(id) ON DELETE CASCADE,
  milestone integer NOT NULL,
  prize_usd numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reached_at timestamptz,
  paid_at timestamptz,
  payout_batch_id uuid REFERENCES public.payout_batches(id),
  disqualified_at timestamptz,
  disqualified_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artist_id, milestone)
);

-- Step 3: Create charts_bonus_cycles table
CREATE TABLE public.charts_bonus_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.artist_profiles(id) ON DELETE CASCADE,
  genre text NOT NULL,
  cycle_year integer NOT NULL,
  cumulative_streams bigint NOT NULL DEFAULT 0,
  rank integer,
  prize_usd numeric,
  status text NOT NULL DEFAULT 'active',
  disqualified_at timestamptz,
  disqualified_reason text,
  paid_at timestamptz,
  payout_batch_id uuid REFERENCES public.payout_batches(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artist_id, genre, cycle_year)
);

-- Step 4: Indexes
CREATE INDEX idx_bonus_milestones_artist ON public.bonus_milestones(artist_id);
CREATE INDEX idx_bonus_milestones_status ON public.bonus_milestones(status);
CREATE INDEX idx_charts_bonus_genre_year ON public.charts_bonus_cycles(genre, cycle_year);
CREATE INDEX idx_charts_bonus_rank ON public.charts_bonus_cycles(rank) WHERE rank IS NOT NULL;
CREATE INDEX idx_charts_bonus_artist ON public.charts_bonus_cycles(artist_id);

-- Step 5: Enable RLS
ALTER TABLE public.bonus_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charts_bonus_cycles ENABLE ROW LEVEL SECURITY;

-- Step 6: RLS policies for bonus_milestones
CREATE POLICY "Service role can manage bonus milestones"
  ON public.bonus_milestones FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Admins can view bonus milestones"
  ON public.bonus_milestones FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update bonus milestones"
  ON public.bonus_milestones FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Artists can view their own milestones"
  ON public.bonus_milestones FOR SELECT
  USING (artist_id IN (
    SELECT id FROM public.artist_profiles WHERE user_id = auth.uid()
  ));

-- Step 7: RLS policies for charts_bonus_cycles
CREATE POLICY "Service role can manage charts cycles"
  ON public.charts_bonus_cycles FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Admins can view charts cycles"
  ON public.charts_bonus_cycles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update charts cycles"
  ON public.charts_bonus_cycles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Artists can view their own charts cycles"
  ON public.charts_bonus_cycles FOR SELECT
  USING (artist_id IN (
    SELECT id FROM public.artist_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Public can read active charts cycles"
  ON public.charts_bonus_cycles FOR SELECT TO anon, authenticated
  USING (status = 'active' AND rank IS NOT NULL);
