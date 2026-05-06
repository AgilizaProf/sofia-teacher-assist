-- Enable pg_cron for scheduled cleanup
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function: delete Sofia conversations older than 24h.
-- Messages cascade if FK is set; otherwise we delete them explicitly first.
CREATE OR REPLACE FUNCTION public.cleanup_old_sofia_conversations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.sofia_messages
  WHERE conversation_id IN (
    SELECT id FROM public.sofia_conversations
    WHERE updated_at < now() - interval '24 hours'
  );

  DELETE FROM public.sofia_conversations
  WHERE updated_at < now() - interval '24 hours';
END;
$$;

-- Unschedule prior version if it exists (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-sofia-conversations-24h');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Schedule: every hour, on the hour
SELECT cron.schedule(
  'cleanup-sofia-conversations-24h',
  '0 * * * *',
  $$ SELECT public.cleanup_old_sofia_conversations(); $$
);