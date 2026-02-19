

## Restrict `track_likes` SELECT + Add Trigger-Maintained Like Counts

### Problem
The current "Anyone can read track likes" policy exposes every fan's like activity to every visitor. The user wants to restrict reads to service_role, admins, or the owning fan. However, the app displays like counts on every track (Discovery page, artist profiles, player) by fetching all `track_likes` rows and counting client-side. Restricting SELECT will break all like counts.

### Solution

1. **Add a `like_count` column to `tracks`** with a default of 0
2. **Create a trigger** on `track_likes` that increments/decrements `tracks.like_count` on INSERT/DELETE
3. **Backfill** existing counts from current data
4. **Apply the new RLS policy** (drop "Anyone can read", create restricted read)
5. **Update frontend hooks** to read count from `tracks.like_count` instead of counting rows

### Why this is safe
- `tracks` already has an "Anyone can read tracks" SELECT policy, so like counts remain visible
- The trigger runs as SECURITY DEFINER, so it can update `tracks` regardless of the calling user's role
- Individual like status (isLiked) is still readable because the new policy allows fans to see their own likes

### Technical Details

#### Database Migration (single migration)

```sql
-- 1. Add like_count column to tracks
ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;

-- 2. Backfill existing counts
UPDATE public.tracks t
SET like_count = (
  SELECT count(*)::int FROM public.track_likes tl
  WHERE tl.track_id = t.id
);

-- 3. Trigger function to keep like_count in sync
CREATE OR REPLACE FUNCTION public.update_track_like_count()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tracks SET like_count = like_count + 1 WHERE id = NEW.track_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tracks SET like_count = like_count - 1 WHERE id = OLD.track_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_like_count ON public.track_likes;
CREATE TRIGGER trg_track_like_count
  AFTER INSERT OR DELETE ON public.track_likes
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_track_like_count();

-- 4. Drop the open SELECT policy
DROP POLICY IF EXISTS "Anyone can read track likes" ON public.track_likes;

-- 5. Create the restricted SELECT policy
CREATE POLICY "Users can read their own likes"
  ON public.track_likes
  FOR SELECT
  USING (
    (auth.jwt() ->> 'role') = 'service_role'
    OR has_role(auth.uid(), 'admin'::app_role)
    OR fan_id IN (
      SELECT id FROM public.vault_members
      WHERE email = (auth.jwt() ->> 'email')
    )
  );
```

#### Frontend: `src/hooks/useTrackLikesBatch.ts`

Replace the "fetch all likes and count client-side" approach:

- **Like counts**: Read from `tracks` table (include `like_count` in the existing track queries, or fetch it here via `.select("id, like_count").in("id", trackIds)` from `tracks`)
- **isLiked check**: Keep the existing fan-specific query (fan can still see their own likes under new RLS)
- Remove the query that fetches all `track_likes` rows just for counting

#### Frontend: `src/hooks/useTrackLikes.ts`

Same pattern -- read `like_count` from `tracks` instead of `count(*)` on `track_likes`.

#### Frontend: Realtime subscription update

The existing realtime subscription on `track_likes` will only fire for the fan's own likes now. Update the handler to increment/decrement from the `like_count` value instead. Alternatively, subscribe to changes on `tracks.like_count` for broader updates.

### Files modified

| File | Change |
|------|--------|
| New migration SQL | Add `like_count` column, backfill, create trigger, swap RLS policy |
| `src/hooks/useTrackLikesBatch.ts` | Read count from `tracks.like_count`; keep fan-specific isLiked query |
| `src/hooks/useTrackLikes.ts` | Read count from `tracks.like_count` instead of counting rows |
| `src/integrations/supabase/types.ts` | Auto-updated (new `like_count` column on tracks) |

