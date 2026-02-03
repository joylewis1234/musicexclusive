-- Add admin access to vault_codes
CREATE POLICY "Admins can view all vault codes"
ON public.vault_codes
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Add admin access to agreement_acceptances
CREATE POLICY "Admins can view all agreement acceptances"
ON public.agreement_acceptances
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));