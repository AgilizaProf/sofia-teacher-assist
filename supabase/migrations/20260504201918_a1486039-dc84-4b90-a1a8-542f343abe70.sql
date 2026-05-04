CREATE TABLE public.app_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  key TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);
CREATE INDEX idx_app_snapshots_user ON public.app_snapshots(user_id);
ALTER TABLE public.app_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "snap own select" ON public.app_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "snap own insert" ON public.app_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "snap own update" ON public.app_snapshots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "snap own delete" ON public.app_snapshots FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_app_snapshots_updated BEFORE UPDATE ON public.app_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();