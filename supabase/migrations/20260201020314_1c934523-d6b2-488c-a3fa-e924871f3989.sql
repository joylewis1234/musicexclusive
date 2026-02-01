-- Add admin UPDATE/INSERT policies for payout_batches
CREATE POLICY "Admins can update payout batches"
ON public.payout_batches
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all payout batches"
ON public.payout_batches
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin UPDATE policy for artist_payouts
CREATE POLICY "Admins can update artist payouts"
ON public.artist_payouts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));