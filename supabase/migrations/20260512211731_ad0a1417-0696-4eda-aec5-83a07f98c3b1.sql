-- Enable pg_cron for scheduled expiry of Mercado Pago subscriptions
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function: expire canceled Mercado Pago subscriptions when their paid period ends
CREATE OR REPLACE FUNCTION public.mp_expire_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.subscriptions
     SET plano = 'free',
         ciclo = NULL,
         status = 'expired',
         updated_at = now()
   WHERE source = 'mercadopago'
     AND status IN ('canceled','paused')
     AND current_period_end IS NOT NULL
     AND current_period_end < now()
     AND plano <> 'free';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- Schedule: run hourly
DO $$
BEGIN
  PERFORM cron.unschedule('mp_expire_subscriptions_hourly')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mp_expire_subscriptions_hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'mp_expire_subscriptions_hourly',
  '0 * * * *',
  $$ SELECT public.mp_expire_subscriptions(); $$
);