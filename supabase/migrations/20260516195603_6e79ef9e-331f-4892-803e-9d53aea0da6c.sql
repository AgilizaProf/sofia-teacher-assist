-- Recriar policies do profiles restritas ao role 'authenticated' e garantir
-- que admins leiam todos os perfis enquanto demais usuários só veem o próprio.

DROP POLICY IF EXISTS "admins read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles own select" ON public.profiles;
DROP POLICY IF EXISTS "profiles own insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles own update" ON public.profiles;
DROP POLICY IF EXISTS "profiles own delete" ON public.profiles;

-- SELECT: dono OU admin (via security definer has_role, sem recursão)
CREATE POLICY "profiles select own or admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- INSERT: somente o próprio usuário cria seu perfil
CREATE POLICY "profiles insert own"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: dono atualiza o próprio perfil
CREATE POLICY "profiles update own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: dono apaga o próprio perfil
CREATE POLICY "profiles delete own"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
