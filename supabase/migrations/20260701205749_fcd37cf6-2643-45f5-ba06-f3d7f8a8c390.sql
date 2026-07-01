
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Backfill from auth.users last_sign_in_at + any surviving activity_events
UPDATE public.profiles p
   SET last_seen_at = GREATEST(
     COALESCE(p.last_seen_at, 'epoch'::timestamptz),
     COALESCE((SELECT u.last_sign_in_at FROM auth.users u WHERE u.id = p.user_id), 'epoch'::timestamptz),
     COALESCE((SELECT max(created_at) FROM public.activity_events e WHERE e.user_id = p.user_id), 'epoch'::timestamptz)
   )
 WHERE true;

UPDATE public.profiles SET last_seen_at = NULL WHERE last_seen_at = 'epoch'::timestamptz;

-- RPC to bump last_seen for the current user (cheap, idempotent)
CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.profiles
     SET last_seen_at = now()
   WHERE user_id = auth.uid()
     AND (last_seen_at IS NULL OR last_seen_at < now() - interval '2 minutes');
END;
$$;

GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;
