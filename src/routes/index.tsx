import { createFileRoute, redirect } from "@tanstack/react-router";
import { Home } from "@/pages/Home";

export const Route = createFileRoute("/")({
  // Links antigos da Sofia apontavam pra "/?open=…" (turmas, alunos, escolas,
  // agenda). Essas seções agora vivem em /minha-sala.
  validateSearch: (
    s: Record<string, unknown>,
  ): { open?: string; target?: string; m?: "m1" | "m3" | "m5" } => ({
    open: typeof s.open === "string" ? (s.open as string) : undefined,
    target: typeof s.target === "string" ? (s.target as string) : undefined,
    m:
      typeof s.m === "string" && ["m1", "m3", "m5"].includes(s.m as string)
        ? (s.m as "m1" | "m3" | "m5")
        : undefined,
  }),
  beforeLoad: ({ search }) => {
    if (search.open) throw redirect({ to: "/minha-sala", search });
  },
  head: () => ({
    meta: [
      { title: "AgilizaProf — Painel do(a) educador(a)" },
      {
        name: "description",
        content:
          "Assistente pedagógica com IA alinhada à BNCC. Pareceres, planos de aula e PEI em minutos.",
      },
      { property: "og:title", content: "AgilizaProf — Painel do(a) educador(a)" },
      {
        property: "og:description",
        content: "Economize 10 horas por semana com a Sofia, sua assistente pedagógica.",
      },
    ],
  }),
  component: Home,
});
