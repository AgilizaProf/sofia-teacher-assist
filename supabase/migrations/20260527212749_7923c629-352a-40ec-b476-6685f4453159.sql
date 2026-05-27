INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'::app_role
FROM public.profiles p
WHERE lower(p.email) IN ('pedrojr.ferreiraa@gmail.com', 'marcelicarvalho12@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;