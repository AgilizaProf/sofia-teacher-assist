// O app manda para a Sofia um bloco "[Contexto: ...]" junto com o pedido.
// Esse bloco é para a Sofia, não para a professora: some da bolha do chat.
export function semBlocoContexto(texto: string): string {
  return (texto || "").replace(/\n*\[Contexto:[\s\S]*?\]\s*$/g, "").replace(/\[Contexto:[\s\S]*?\]/g, "").trim();
}
