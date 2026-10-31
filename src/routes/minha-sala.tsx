import { createFileRoute } from "@tanstack/react-router";
import { MinhaSala } from "@/pages/MinhaSala";

// Escolas, turmas, alunos e agenda rápida (antigo painel da página inicial).
// Os deep-links da Sofia (src/lib/sofia/dashboardLinks.ts) apontam pra cá.
export const Route = createFileRoute("/minha-sala")({
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
  head: () => ({
    meta: [
      { title: "Minha sala · Escolas, turmas e alunos — AgilizaProf" },
      { name: "description", content: "Cadastre escolas, turmas e alunos e acompanhe sua semana." },
    ],
  }),
  component: MinhaSala,
});
