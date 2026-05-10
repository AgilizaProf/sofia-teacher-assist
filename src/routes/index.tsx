import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dashboard } from "@/pages/Dashboard";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>) => ({
    open: typeof s.open === "string" ? (s.open as string) : undefined,
    target: typeof s.target === "string" ? (s.target as string) : undefined,
    m: typeof s.m === "string" && ["m1", "m3", "m5"].includes(s.m as string)
      ? (s.m as "m1" | "m3" | "m5")
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "AgilizaProf — Painel da professora" },
      { name: "description", content: "Assistente pedagógica com IA alinhada à BNCC. Pareceres, planos de aula e PEI em minutos." },
      { property: "og:title", content: "AgilizaProf — Painel da professora" },
      { property: "og:description", content: "Economize 10 horas por semana com a Sofia, sua assistente pedagógica." },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    try {
      const done = localStorage.getItem("agp_onboarding_completed");
      if (done !== "1") {
        navigate({ to: "/onboarding" });
      }
    } catch {
      /* ignore */
    }
  }, [navigate]);
  return <Dashboard />;
}
