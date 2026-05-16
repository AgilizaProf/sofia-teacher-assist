CREATE POLICY "admins read all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));