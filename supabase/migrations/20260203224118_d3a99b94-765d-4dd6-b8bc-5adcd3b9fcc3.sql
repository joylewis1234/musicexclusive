-- ============================================
-- FIX ALL REMAINING CRITICAL RLS ISSUES
-- ============================================

-- Helper: Check if request is from service_role
-- Service role calls come from edge functions with the service_role key

-- ============================================
-- 1. VAULT_CODES: Restrict INSERT/UPDATE
-- ============================================
DROP POLICY IF EXISTS "Anyone can insert vault codes" ON public.vault_codes;
DROP POLICY IF EXISTS "Anyone can update vault codes" ON public.vault_codes;

-- Only service_role (edge functions) can insert vault codes
CREATE POLICY "Service role can insert vault codes"
ON public.vault_codes
FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Users can update their own codes (for attempt tracking), service_role can update any
CREATE POLICY "Users can update their own vault codes"
ON public.vault_codes
FOR UPDATE
USING (email = (auth.jwt() ->> 'email') OR auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (email = (auth.jwt() ->> 'email') OR auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 2. VAULT_MEMBERS: Restrict INSERT/UPDATE
-- ============================================
DROP POLICY IF EXISTS "Anyone can insert vault members" ON public.vault_members;
DROP POLICY IF EXISTS "Anyone can update vault members" ON public.vault_members;

-- Only service_role can insert new members (via webhooks/edge functions)
CREATE POLICY "Service role can insert vault members"
ON public.vault_members
FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Only service_role can update members (credit changes, etc.)
CREATE POLICY "Service role can update vault members"
ON public.vault_members
FOR UPDATE
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 3. PAYOUT_BATCHES: Fix system policy
-- ============================================
DROP POLICY IF EXISTS "System can manage payout batches" ON public.payout_batches;

CREATE POLICY "Service role can manage payout batches"
ON public.payout_batches
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 4. ARTIST_PAYOUTS: Fix system policy
-- ============================================
DROP POLICY IF EXISTS "System can manage artist payouts" ON public.artist_payouts;

CREATE POLICY "Service role can manage artist payouts"
ON public.artist_payouts
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 5. CREDIT_LEDGER: Restrict INSERT
-- ============================================
DROP POLICY IF EXISTS "System can insert ledger entries" ON public.credit_ledger;

CREATE POLICY "Service role can insert ledger entries"
ON public.credit_ledger
FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 6. STREAM_LEDGER: Restrict INSERT
-- ============================================
DROP POLICY IF EXISTS "System can insert stream entries" ON public.stream_ledger;

CREATE POLICY "Service role can insert stream entries"
ON public.stream_ledger
FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 7. STRIPE_EVENTS: Restrict INSERT (already fixed SELECT)
-- ============================================
DROP POLICY IF EXISTS "System can insert stripe events" ON public.stripe_events;

CREATE POLICY "Service role can insert stripe events"
ON public.stripe_events
FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 8. TRACK_LIKES: Restrict to own fan_id
-- ============================================
DROP POLICY IF EXISTS "Vault members can like tracks" ON public.track_likes;
DROP POLICY IF EXISTS "Vault members can unlike tracks" ON public.track_likes;

-- Users can only like as themselves (fan_id must match their vault_members record)
CREATE POLICY "Users can like tracks as themselves"
ON public.track_likes
FOR INSERT
WITH CHECK (
  fan_id IN (
    SELECT id FROM public.vault_members 
    WHERE email = (auth.jwt() ->> 'email')
  )
);

-- Users can only unlike their own likes
CREATE POLICY "Users can unlike their own likes"
ON public.track_likes
FOR DELETE
USING (
  fan_id IN (
    SELECT id FROM public.vault_members 
    WHERE email = (auth.jwt() ->> 'email')
  )
);

-- ============================================
-- 9. ADMIN_ACTION_LOGS: Restrict INSERT
-- ============================================
DROP POLICY IF EXISTS "System can insert action logs" ON public.admin_action_logs;

CREATE POLICY "Service role or admins can insert action logs"
ON public.admin_action_logs
FOR INSERT
WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role' 
  OR public.has_role(auth.uid(), 'admin')
);

-- ============================================
-- 10. REPORT_EMAIL_LOGS: Restrict UPDATE
-- ============================================
DROP POLICY IF EXISTS "System can update report logs" ON public.report_email_logs;

CREATE POLICY "Service role can update report logs"
ON public.report_email_logs
FOR UPDATE
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 11. SHARED_TRACKS: Fix INSERT/UPDATE
-- ============================================
DROP POLICY IF EXISTS "Active vault members can insert shared tracks" ON public.shared_tracks;
DROP POLICY IF EXISTS "Recipients can update listened_at" ON public.shared_tracks;

-- Users can only share tracks as themselves (sender must be their vault member id)
CREATE POLICY "Users can share tracks as themselves"
ON public.shared_tracks
FOR INSERT
WITH CHECK (
  sender_id IN (
    SELECT id FROM public.vault_members 
    WHERE email = (auth.jwt() ->> 'email')
  )
);

-- Recipients can only update tracks shared WITH them (mark as listened)
CREATE POLICY "Recipients can update their received tracks"
ON public.shared_tracks
FOR UPDATE
USING (
  recipient_id IN (
    SELECT id FROM public.vault_members 
    WHERE email = (auth.jwt() ->> 'email')
  )
)
WITH CHECK (
  recipient_id IN (
    SELECT id FROM public.vault_members 
    WHERE email = (auth.jwt() ->> 'email')
  )
);

-- ============================================
-- 12. AGREEMENT_ACCEPTANCES: Remove UPDATE or restrict
-- ============================================
DROP POLICY IF EXISTS "Users can update their own acceptance" ON public.agreement_acceptances;

-- Agreement acceptances should be immutable (legal records)
-- No UPDATE policy - once accepted, cannot be modified