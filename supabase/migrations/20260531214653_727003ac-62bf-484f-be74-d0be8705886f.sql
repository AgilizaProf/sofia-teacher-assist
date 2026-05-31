ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_source_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_source_check
  CHECK (source = ANY (ARRAY['signup','admin_grant','stripe','paddle','mercadopago','referral_bonus']));

ALTER TABLE public.creditos_historico DROP CONSTRAINT IF EXISTS creditos_historico_tipo_check;
ALTER TABLE public.creditos_historico
  ADD CONSTRAINT creditos_historico_tipo_check
  CHECK (tipo = ANY (ARRAY['uso','bonus','renovacao','reset_mensal','reset_semanal','compra','ajuste']));