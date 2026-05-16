-- 1. password_reset_attempts: enable RLS + policies
ALTER TABLE public.password_reset_attempts ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can insert an attempt record (needed for forgot-password flow)
CREATE POLICY "anyone can log reset attempts"
ON public.password_reset_attempts
FOR INSERT
TO public
WITH CHECK (true);

-- Only admins can read attempts (avoids email enumeration)
CREATE POLICY "admins read reset attempts"
ON public.password_reset_attempts
FOR SELECT
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. platform_errors: bound payload size to mitigate abuse (no rate limiting available)
ALTER TABLE public.platform_errors
  ADD CONSTRAINT platform_errors_message_size CHECK (char_length(message) <= 5000),
  ADD CONSTRAINT platform_errors_stack_size CHECK (stack IS NULL OR char_length(stack) <= 20000);
