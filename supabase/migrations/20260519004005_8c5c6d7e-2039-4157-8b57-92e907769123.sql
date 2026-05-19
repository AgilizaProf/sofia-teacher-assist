CREATE TABLE public.cancellation_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ciclo TEXT,
  reasons TEXT[] NOT NULL DEFAULT '{}',
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cancellation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own feedback"
  ON public.cancellation_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users view own feedback"
  ON public.cancellation_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_cancellation_feedback_user ON public.cancellation_feedback(user_id);
CREATE INDEX idx_cancellation_feedback_created ON public.cancellation_feedback(created_at DESC);