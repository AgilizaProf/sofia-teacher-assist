ALTER TABLE public.user_curriculo_municipal
  DROP CONSTRAINT IF EXISTS user_curriculo_municipal_user_id_key;

ALTER TABLE public.user_curriculo_municipal
  ADD COLUMN IF NOT EXISTS ordem smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS eh_padrao boolean NOT NULL DEFAULT false;

ALTER TABLE public.user_curriculo_municipal
  DROP CONSTRAINT IF EXISTS user_curriculo_municipal_ordem_check;
ALTER TABLE public.user_curriculo_municipal
  ADD CONSTRAINT user_curriculo_municipal_ordem_check CHECK (ordem IN (1, 2));

ALTER TABLE public.user_curriculo_municipal
  DROP CONSTRAINT IF EXISTS user_curriculo_municipal_user_ordem_key;
ALTER TABLE public.user_curriculo_municipal
  ADD CONSTRAINT user_curriculo_municipal_user_ordem_key UNIQUE (user_id, ordem);

CREATE UNIQUE INDEX IF NOT EXISTS user_curriculo_municipal_padrao_uniq
  ON public.user_curriculo_municipal (user_id)
  WHERE eh_padrao = true;