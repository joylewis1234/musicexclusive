-- Allow the full payout batch lifecycle used by the app / payout processor
-- (previous constraint only allowed: pending, processing, paid, failed)
ALTER TABLE public.payout_batches
  DROP CONSTRAINT IF EXISTS payout_batches_status_check;

ALTER TABLE public.payout_batches
  ADD CONSTRAINT payout_batches_status_check
  CHECK (
    status = ANY (
      ARRAY[
        'pending'::text,
        'approved'::text,
        'processing'::text,
        'partial'::text,
        'paid'::text,
        'failed'::text
      ]
    )
  );
