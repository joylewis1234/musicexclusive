ALTER TABLE public.playback_sessions
  ADD COLUMN IF NOT EXISTS watermark_id text;

CREATE INDEX IF NOT EXISTS playback_sessions_watermark_id_idx
  ON public.playback_sessions (watermark_id);