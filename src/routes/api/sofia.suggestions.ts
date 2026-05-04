import { createFileRoute } from "@tanstack/react-router";
import type { SofiaSuggestion } from "@/components/sofia/SofiaSuggestionCard";

const BANK: Record<string, SofiaSuggestion[]> = {
  home: [
    {
      id: "home-foco",
      tag: "Foco de hoje",
      title: "Vamos dar os próximos passos no AgilizaProf",
      description: "Cadastre sua primeira turma, adicione alunos e converse comigo para liberar o potencial completo.",
      prompt: "Me ajude a dar os próximos passos no AgilizaProf",
      context: "Foco de hoje · Página inicial",
      actionLabel: "Começar agora",
    },
  ],
  radar: [
    {
      id: "radar-parecer",
      tag: "Radar Pedagógico",
      title: "3 alunos sem parecer descritivo neste bimestre",
      description: "Posso gerar uma primeira versão para você revisar em minutos.",
      prompt: "Liste os alunos sem parecer descritivo e gere uma primeira versão para cada",
      context: "Radar Pedagógico",
      actionLabel: "Gerar pareceres",
    },
    {
      id: "radar-pei",
      tag: "Radar Pedagógico",
      title: "PEI desatualizado para 2 alunos",
      description: "Atualizar agora evita retrabalho no fechamento do bimestre.",
      prompt: "Quais PEIs estão desatualizados e como podemos atualizar?",
      context: "Radar Pedagógico",
      actionLabel: "Revisar PEIs",
    },
  ],
  inclusao: [
    {
      id: "inc-adapt",
      tag: "Adaptações sugeridas",
      title: "Adaptar a aula de hoje para este aluno",
      description: "Geramos atividades alinhadas ao PEI e à BNCC.",
      prompt: "Adapte a aula de hoje para este aluno",
      context: "Inclusão · Adaptações",
      actionLabel: "Adaptar aula",
    },
    {
      id: "inc-plano",
      tag: "Adaptações sugeridas",
      title: "Plano de aula adaptado para a próxima semana",
      description: "Sequência didática inclusiva pronta para revisar.",
      prompt: "Gere um plano de aula adaptado para a próxima semana",
      context: "Inclusão · Adaptações",
      actionLabel: "Gerar plano",
    },
    {
      id: "inc-parecer",
      tag: "Adaptações sugeridas",
      title: "Parecer descritivo bimestral",
      description: "Linguagem humanizada e ancorada nos princípios da Sofia.",
      prompt: "Gere um parecer descritivo bimestral para este aluno",
      context: "Inclusão · Adaptações",
      actionLabel: "Gerar parecer",
    },
    {
      id: "inc-familia",
      tag: "Adaptações sugeridas",
      title: "Preparar reunião com a família",
      description: "Roteiro objetivo e acolhedor para a conversa.",
      prompt: "Me ajuda a preparar uma reunião com a família deste aluno",
      context: "Inclusão · Adaptações",
      actionLabel: "Preparar",
    },
  ],
  cmdk: [
    { id: "cmdk-parecer", title: "Gerar parecer descritivo", prompt: "Gere um parecer descritivo", context: "Sugestões da IA · Command bar" },
    { id: "cmdk-adapt", title: "Adaptar atividade para aluno PCD", prompt: "Adapte uma atividade para um aluno PCD", context: "Sugestões da IA · Command bar" },
    { id: "cmdk-plano", title: "Criar plano de aula alinhado à BNCC", prompt: "Crie um plano de aula alinhado à BNCC", context: "Sugestões da IA · Command bar" },
  ],
  planejamento: [
    {
      id: "plan-bncc",
      tag: "Planejamento",
      title: "Plano de aula alinhado à BNCC",
      description: "Crie sequências didáticas em poucos minutos.",
      prompt: "Crie um plano de aula alinhado à BNCC",
      context: "Planejamento",
      actionLabel: "Criar plano",
    },
  ],
};

export const Route = createFileRoute("/api/sofia/suggestions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const screen = url.searchParams.get("screen") || "home";
        const entityId = url.searchParams.get("entityId") || null;
        const items = BANK[screen] || [];
        return Response.json({ screen, entityId, suggestions: items });
      },
    },
  },
});