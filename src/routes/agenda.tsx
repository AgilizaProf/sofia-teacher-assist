import { createFileRoute } from "@tanstack/react-router";
import { Agenda } from "@/pages/Agenda";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda · Radar pedagógico — AgilizaProf" },
      { name: "description", content: "Veja seus compromissos, prazos e a Sofia preparando reuniões automaticamente." },
      { property: "og:title", content: "Agenda · AgilizaProf" },
      { property: "og:description", content: "Radar pedagógico: hoje, amanhã, semana e prazos · com preparação automática da Sofia." },
    ],
  }),
  component: Agenda,
});
