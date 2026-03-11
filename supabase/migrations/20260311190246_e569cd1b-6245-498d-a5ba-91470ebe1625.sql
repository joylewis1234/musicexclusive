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