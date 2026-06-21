UPDATE public.profiles
   SET onboarding_concluido = false
 WHERE coalesce(length(regexp_replace(coalesce(telefone, ''), '\D', '', 'g')), 0) NOT BETWEEN 10 AND 11;