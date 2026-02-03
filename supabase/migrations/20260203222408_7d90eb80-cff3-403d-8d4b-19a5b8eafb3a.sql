-- ============================================
-- FIX CRITICAL RLS SECURITY ISSUES
-- ============================================

-- 1. ARTIST_APPLICATIONS: Restrict to admins only (applicants don't need to re-read their submission)
DROP POLICY IF EXISTS "Anyone can read applications" ON public.artist_applications;
CREATE POLICY "Admins can view all applications"
ON public.artist_applications
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 2. AGREEMENT_ACCEPTANCES: Users can only read their own records
DROP POLICY IF EXISTS "Users can read their own acceptance" ON public.agreement_acceptances;
CREATE POLICY "Users can read their own acceptance"
ON public.agreement_acceptances
FOR SELECT
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 3. VAULT_CODES: Users can only read their own codes
DROP POLICY IF EXISTS "Users can read vault codes" ON public.vault_codes;
CREATE POLICY "Users can read their own vault codes"
ON public.vault_codes
FOR SELECT
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 4. VAULT_MEMBERS: Users can only read their own membership record
DROP POLICY IF EXISTS "Anyone can read vault members" ON public.vault_members;
CREATE POLICY "Users can read their own vault membership"
ON public.vault_members
FOR SELECT
USING (email = (auth.jwt() ->> 'email'));

-- Allow admins to view all vault members for support
CREATE POLICY "Admins can view all vault members"
ON public.vault_members
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 5. CREDIT_LEDGER: Users can only read their own transactions
DROP POLICY IF EXISTS "Users can view their own ledger entries" ON public.credit_ledger;
CREATE POLICY "Users can view their own ledger entries"
ON public.credit_ledger
FOR SELECT
USING (user_email = (auth.jwt() ->> 'email'));

-- Allow admins to view all ledger entries for auditing
CREATE POLICY "Admins can view all ledger entries"
ON public.credit_ledger
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 6. APPLICATION_ACTION_TOKENS: Restrict to admins only
DROP POLICY IF EXISTS "System can manage action tokens" ON public.application_action_tokens;
CREATE POLICY "Admins can manage action tokens"
ON public.application_action_tokens
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- System/service role can also manage (for edge functions)
CREATE POLICY "Service role can manage action tokens"
ON public.application_action_tokens
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- 7. STRIPE_EVENTS: Restrict to admins and service role only
DROP POLICY IF EXISTS "System can read stripe events" ON public.stripe_events;
CREATE POLICY "Admins can view stripe events"
ON public.stripe_events
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage stripe events"
ON public.stripe_events
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- 8. SHARED_TRACKS: Users can only see tracks shared with them or by them
DROP POLICY IF EXISTS "Recipients can read their shared tracks" ON public.shared_tracks;
CREATE POLICY "Users can read their shared tracks"
ON public.shared_tracks
FOR SELECT
USING (
  sender_id IN (SELECT id FROM public.vault_members WHERE email = (auth.jwt() ->> 'email'))
  OR recipient_id IN (SELECT id FROM public.vault_members WHERE email = (auth.jwt() ->> 'email'))
);

-- Allow admins to view all shared tracks
CREATE POLICY "Admins can view all shared tracks"
ON public.shared_tracks
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));