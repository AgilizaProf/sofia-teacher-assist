-- 1) Add dedicated array column for multiple CIDs
ALTER TABLE public.alunos_inclusao
  ADD COLUMN IF NOT EXISTS cids text[] NOT NULL DEFAULT '{}';

-- 2) Backfill from the existing single `cid` text column.
-- Existing values look like "CID F84.0, F71" or "CID não informado".
-- Strip the leading "CID" prefix, split on comma/semicolon, trim, drop empties
-- and sentinel values like "não informado" / "-" / "—".
UPDATE public.alunos_inclusao
SET cids = sub.arr
FROM (
  SELECT
    id,
    COALESCE(
      ARRAY(
        SELECT trim(both ' ' FROM token)
        FROM regexp_split_to_table(
          regexp_replace(COALESCE(cid, ''), '^\s*CID\s*', '', 'i'),
          '[,;]'
        ) AS token
        WHERE
          trim(both ' ' FROM token) <> ''
          AND lower(trim(both ' ' FROM token)) NOT IN ('não informado', 'nao informado', '-', '—')
      ),
      '{}'::text[]
    ) AS arr
  FROM public.alunos_inclusao
) AS sub
WHERE public.alunos_inclusao.id = sub.id
  AND (public.alunos_inclusao.cids IS NULL OR array_length(public.alunos_inclusao.cids, 1) IS NULL);

-- 3) Helpful index for future queries that filter by CID
CREATE INDEX IF NOT EXISTS alunos_inclusao_cids_gin
  ON public.alunos_inclusao USING GIN (cids);