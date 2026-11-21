-- WhatsApp: novo destino "Leitura e escrita" (tela Criança alfabetizada).
-- Idempotente: pode rodar mais de uma vez.
ALTER TABLE public.whatsapp_entradas
  DROP CONSTRAINT IF EXISTS whatsapp_entradas_destino_sugerido_check;
ALTER TABLE public.whatsapp_entradas
  ADD CONSTRAINT whatsapp_entradas_destino_sugerido_check
  CHECK (destino_sugerido IN ('registro','parecer','planejamento','diario','pcd','inclusao_pei','agenda','alfabetizacao'));

ALTER TABLE public.whatsapp_entradas
  DROP CONSTRAINT IF EXISTS whatsapp_entradas_destino_final_check;
ALTER TABLE public.whatsapp_entradas
  ADD CONSTRAINT whatsapp_entradas_destino_final_check
  CHECK (destino_final IN ('registro','parecer','planejamento','diario','pcd','inclusao_pei','agenda','alfabetizacao'));
