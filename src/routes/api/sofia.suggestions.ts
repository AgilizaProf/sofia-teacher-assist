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
        const screen = url.searchParams.get("screen") || "home";
        const entityType = url.searchParams.get("entityType");
        const entityId = url.searchParams.get("entityId");
        // professoraId vem do header (auth) ou query (anônimo / dev)
        const professoraId =
          request.headers.get("x-professora-id") ||
          url.searchParams.get("professoraId") ||
          "anon";

        const key = cacheKey({ professoraId, screen, entityId });
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

        setCached(key, items);
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