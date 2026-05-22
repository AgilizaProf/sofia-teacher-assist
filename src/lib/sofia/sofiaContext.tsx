// ============================================================
// PATCH para src/lib/sofia.functions.ts
// Adiciona suporte ao campo userContext (contexto digitado pelo usuário)
// ============================================================

// 1. No inputValidator, adicione o campo userContext:
// Substitua o return do inputValidator por:
return {
  conversationId: typeof d.conversationId === "string" ? d.conversationId : undefined,
  messages,
  routeContext: typeof d.routeContext === "string" ? d.routeContext.slice(0, 4000) : undefined,
  originRoute: typeof d.originRoute === "string" ? d.originRoute.slice(0, 200) : undefined,
  userContext: typeof d.userContext === "string" ? d.userContext.slice(0, 2000) : undefined, // NOVO
};

// ============================================================
// 2. Substitua a função buildSystemPrompt por esta versão:
function buildSystemPrompt(routeContext?: string, userContext?: string) {
  const taskPrompt = [
    "Responda à conversa do chat seguindo rigorosamente a Constituição. Use apenas o que o(a) educador(a) registrou; quando faltar informação essencial, pergunte antes de produzir o documento. Escreva sempre em português do Brasil correto, revisando internamente acentuação, concordância, crase e pontuação antes de enviar.",
    "",
    "ESTILO DE RESPOSTA (obrigatório):",
    "- Seja sempre direta e objetiva. Responda apenas o que foi perguntado.",
    "- Nunca use introduções como 'Claro!', 'Com certeza!', 'Ótimo!', 'Ótima pergunta!', 'Como posso te ajudar hoje?'.",
    "- Nunca use encerramentos como 'Espero ter ajudado!' ou 'Qualquer dúvida estou à disposição.'.",
    "- Nunca repita ou parafraseie o que o(a) usuário(a) acabou de escrever.",
    "- Vá direto ao ponto. Prefira respostas curtas e precisas.",
    "",
    "REGRA DE CONCLUSÃO:",
    "- Sempre conclua o pensamento antes de encerrar. Nunca corte no meio de uma frase, item ou lista.",
    "- Se o conteúdo ficaria muito longo, prefira resumir de forma completa ou avisar: 'Posso detalhar alguma seção específica se desejar.'",
    "- Uma resposta curta e completa vale mais que uma longa e cortada.",
    "",
    "RESPOSTAS RÁPIDAS (botões clicáveis):",
    "- Quando fizer uma pergunta com respostas previsíveis, oferecer escolhas ao(à) usuário(a), pedir confirmação antes de gerar um documento longo, ou perceber que o(a) usuário(a) está em dúvida sobre o que precisa, sempre anexe ao FINAL da mensagem um bloco no formato EXATO abaixo:",
    "[OPÇÕES]",
    "- Opção 1",
    "- Opção 2",
    "- Opção 3",
    "- Opção 4",
    "- ✏️ Outro (vou digitar)",
    "[/OPÇÕES]",
    "- Máximo de 4 opções de conteúdo + sempre a última opção 'Outro (vou digitar)'. Cada opção curta (máx. 6 palavras). Pode incluir um emoji curto no início para facilitar a leitura.",
    "- O bloco [OPÇÕES] NUNCA deve ser comentado ou explicado no texto: ele é processado pelo app e renderizado como botões. Não escreva 'aqui estão as opções', apenas anexe o bloco no final.",
    "- NÃO use o bloco [OPÇÕES] quando: a resposta exigir texto livre obrigatoriamente, você já tiver contexto completo para responder diretamente, ou a pergunta for muito específica/pessoal.",
    // Injeta contexto adicional fornecido pelo usuário
    ...(userContext
      ? [
          "",
          "===== CONTEXTO ADICIONAL FORNECIDO PELA PROFESSORA =====",
          userContext,
          "Use este contexto como base principal para todas as respostas nesta conversa.",
          "===== FIM DO CONTEXTO ADICIONAL =====",
        ]
      : []),
  ].join("\n");
  return buildSofiaPrompt(taskPrompt, routeContext);
}

// ============================================================
// 3. No handler, passe userContext para buildSystemPrompt:
// Substitua a linha:
//   const res = await fetch("https://ai.gateway.lovable.dev/...", {
//     body: JSON.stringify({
//       messages: [{ role: "system", content: buildSystemPrompt(data.routeContext) }, ...],
// Por:
//       messages: [{ role: "system", content: buildSystemPrompt(data.routeContext, data.userContext) }, ...],

// ============================================================
// 4. No SofiaProvider.tsx, no send(), passe o userContext:
// Onde está:
//   const stream = await askSofia({
//     data: {
//       conversationId: conversationId ?? undefined,
//       messages: next.map(...),
//       routeContext: composedRouteContext,
//       originRoute: loc.pathname,
//     },
//   });
// Mude para:
//   const stream = await askSofia({
//     data: {
//       conversationId: conversationId ?? undefined,
//       messages: next.map(...),
//       routeContext: composedRouteContext,
//       originRoute: loc.pathname,
//       userContext: userContext ?? undefined, // NOVO — vem do campo de contexto
//     },
//   });
