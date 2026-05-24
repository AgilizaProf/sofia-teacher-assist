CREATE TABLE public.user_curriculo_municipal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  municipio TEXT NOT NULL,
  estado TEXT,
  arquivo_path TEXT NOT NULL,
  arquivo_nome TEXT,
  arquivo_bytes BIGINT,
  status TEXT DEFAULT 'processando',
  erro_msg TEXT,
  habilidades JSONB DEFAULT '[]',
  ativo BOOLEAN DEFAULT false,
  usar_municipal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_curriculo_municipal ADD CONSTRAINT unique_user_curriculo UNIQUE (user_id);

ALTER TABLE public.user_curriculo_municipal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own curriculo" 
ON public.user_curriculo_municipal 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own curriculo" 
ON public.user_curriculo_municipal 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own curriculo" 
ON public.user_curriculo_municipal 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own curriculo" 
ON public.user_curriculo_municipal 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_curriculo_municipal_updated_at
BEFORE UPDATE ON public.user_curriculo_municipal
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();