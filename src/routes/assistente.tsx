import { createFileRoute } from "@tanstack/react-router";
import { Assistente } from "@/pages/Assistente";

export const Route = createFileRoute("/assistente")({
  head: () => ({
    meta: [
      { title: "Assistente IA · Sofia — AgilizaProf" },
      { name: "description", content: "Converse com a Sofia, sua assistente pedagógica IA. Pareceres, planos, atividades e PEI em minutos." },
      { property: "og:title", content: "Assistente IA · Sofia" },
      { property: "og:description", content: "Sua assistente pedagógica com IA, alinhada à BNCC." },
    ],
  }),
  // ?conversa=<id>: abre uma conversa guardada (vem da Minha Biblioteca).
  validateSearch: (s: Record<string, unknown>): { conversa?: string } => {
    const c = typeof s.conversa === "string" ? s.conversa : "";
    return /^[0-9a-f-]{36}$/i.test(c) ? { conversa: c } : {};
  },
  component: Assistente,
});