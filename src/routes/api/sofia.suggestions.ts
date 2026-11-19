import { createFileRoute } from "@tanstack/react-router";
import {
  cacheKey,
  getCached,
  setCached,
  loadProfessoraContext,
  runDeterministicRules,
  getBaseSuggestions,
  sortByPriority,
  maybePolishTitlesWithAI,
} from "@/server/sofia-suggestions.server";

export const Route = createFileRoute("/api/sofia/suggestions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const screen = (url.searchParams.get("screen") || "home").slice(0, 60);
        const entityType = url.searchParams.get("entityType");
        const entityId = url.searchParams.get("entityId");
        // As sugestões ainda não usam dados da professora (o contexto é fixo),
        // então o resultado só depende da tela. Antes a chave do cache incluía
        // `professoraId` e `entityId` vindos da URL: trocando esses valores,
        // qualquer pessoa sem login forçava uma chamada nova à IA a cada pedido
        // (custo) e enchia a memória do cache. Agora a chave é só a tela, e
        // telas sem sugestões não chamam a IA nem entram no cache.
        const professoraId = "anon";

        const key = cacheKey({ professoraId, screen });
        const cached = getCached(key);
        if (cached) {
          return Response.json({ screen, entityId, suggestions: cached, cached: true });
        }

        // 1. Carregar contexto (placeholder enquanto as tabelas não existem)
        const ctx = await loadProfessoraContext({ professoraId, screen, entityType, entityId });

        // 2. Regras determinísticas (rápido, barato, decide prioridade)
        const ruleHits = runDeterministicRules(ctx);

        // 3. Sugestões-base por tela (priority: info)
        const base = getBaseSuggestions(screen);

        // 4. Combinar e ordenar por prioridade
        let items = sortByPriority([...ruleHits, ...base]);

        // 5. Polimento de títulos com IA (Gemini 2.5 Flash + Constituição)
        const polished = await maybePolishTitlesWithAI(items, { enabled: true });
        items = polished.items;

        if (items.length > 0) setCached(key, items);
        return Response.json({
          screen,
          entityId,
          suggestions: items,
          cached: false,
          polish: polished.metrics,
        });
      },
    },
  },
});