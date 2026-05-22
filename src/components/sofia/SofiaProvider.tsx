// Trecho a substituir dentro do hook useRouteContext() em SofiaProvider.tsx
// Substitua a função useRouteContext() existente por esta versão:

function useRouteContext() {
  const loc = useLocation();
  const sofia = useSofiaContextOptional();
  return useMemo(() => {
    const p = loc.pathname;
    let tela = "Você está na Página inicial (painel do(a) educador(a)).";
    if (p.startsWith("/inclusao")) tela = "Você está na tela Inclusão (PEI, anamnese, pareceres).";
    else if (p.startsWith("/planejamento")) tela = "Você está na tela Planejamento (planos de aula, BNCC).";
    else if (p.startsWith("/relatorios")) tela = "Você está na tela Relatórios.";
    else if (p.startsWith("/agenda")) tela = "Você está na Agenda escolar.";
    else if (p.startsWith("/assistente")) tela = "Você está na tela do Assistente IA (chat principal).";
    else if (p.startsWith("/configuracoes")) tela = "Você está nas Configurações.";

    const turma = sofia?.entity?.turma_atual;
    const nivel = inferirNivelEnsino(turma?.ano) ?? inferirNivelEnsino(turma?.nome);
    const linhas = [tela];

    // Injeta bloco completo de dados reais da turma (alunos, agenda, PEIs)
    const blocoCompleto = (sofia?.dataState as { _blocoTurmaCompleto?: string })?._blocoTurmaCompleto;
    if (blocoCompleto) {
      linhas.push(blocoCompleto);
    } else if (turma) {
      linhas.push(`Turma atual: ${turma.nome}${turma.ano ? ` (${turma.ano})` : ""} — ${turma.total_alunos ?? 0} aluno(s).`);
    } else {
      linhas.push("Turma atual: NENHUMA selecionada.");
    }

    if (nivel) {
      linhas.push(
        `Nível de ensino da turma: ${nivel}. Adapte TODAS as suas respostas (atividades, estratégias, linguagem, sugestões de vídeos, relatórios e planejamentos) para esse público, conforme o bloco "ADAPTAÇÃO POR NÍVEL DE ENSINO" da sua Constituição.`,
      );
    } else {
      linhas.push(
        'Nível de ensino: NÃO INFORMADO. Antes de responder qualquer pedido pedagógico, pergunte: "Para te ajudar melhor, com qual nível de ensino você está trabalhando? 🧸 Educação Infantil  📚 Ensino Fundamental  🎓 Ensino Médio". Use a resposta para adaptar toda a conversa.',
      );
    }
    return linhas.join("\n");
  }, [loc.pathname, sofia?.entity?.turma_atual, sofia?.dataState]);
}
