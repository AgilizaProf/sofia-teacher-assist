import type { SofiaContext, FalaSofia, SofiaAcao } from "./types";

// Interpola {{caminho.com.pontos}} em strings, usando o context como fonte.
function interp(template: string, ctx: SofiaContext): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_m, path: string) => {
    const parts = path.trim().split(".");
    let cur: unknown = ctx;
    for (const k of parts) {
      if (cur && typeof cur === "object" && k in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[k];
      } else {
        return ""; // dado ausente → string vazia (a personalidade já deveria ter trocado de fala)
      }
    }
    return cur == null ? "" : String(cur);
  });
}

function saudacao(ctx: SofiaContext): string {
  const slot = ctx.temporal.periodo === "manha" ? "Bom dia" : ctx.temporal.periodo === "tarde" ? "Boa tarde" : "Boa noite";
  const nome = ctx.user.primeiro_nome || "professora";
  return `${slot}, ${nome}`;
}

// ---------- Roteador de personalidade ----------
export function gerarFalaSofia(ctx: SofiaContext): FalaSofia {
  const { route, user, entity, dataState } = ctx;

  // 1) Onboarding acolhedor — Home, sem dados
  if (route === "home" && dataState.turmas_count === 0) {
    return {
      estado: "acolhedora-onboarding",
      saudacao: saudacao(ctx),
      texto: interp(
        "Antes de eu sugerir qualquer coisa, preciso te conhecer um pouco. Quantas turmas você dá aula este ano?"
      , ctx),
      acoes: [
        { label: "1 turma", intent: "onboarding_turmas:1" },
        { label: "2-3 turmas", intent: "onboarding_turmas:2-3" },
        { label: "4 ou mais", intent: "onboarding_turmas:4+" },
        { label: "Cadastrar do zero", intent: "abrir_cadastro_turma", to: "/" },
      ],
      contexto_chip: null,
    };
  }

  // 2) Onboarding propositivo — turma criada, sem alunos
  if (route === "home" && dataState.turmas_count > 0 && dataState.alunos_count === 0) {
    return {
      estado: "propositiva-onboarding",
      saudacao: saudacao(ctx),
      texto: interp(
        "Sua turma <em>{{entity.turma_atual.nome}}</em> está pronta. Vamos juntas cadastrar os primeiros alunos? Leva uns 4 minutos."
      , ctx),
      acoes: [
        { label: "Cadastrar alunos", intent: "abrir_cadastro_alunos" },
        { label: "Importar de planilha", intent: "importar_alunos" },
      ],
      contexto_chip: interp("vendo a turma {{entity.turma_atual.nome}}", ctx),
    };
  }

  // 3) Urgência — próxima aula em ≤2h E há aluno PCD
  if (
    dataState.proxima_aula &&
    dataState.proxima_aula.minutos_ate <= 120 &&
    entity.todos_alunos_pcd.length > 0
  ) {
    const pcd = entity.todos_alunos_pcd[0];
    const acoes: SofiaAcao[] = [
      {
        label: "Adaptar agora",
        prompt: `Crie uma atividade adaptada para ${pcd.nome} (${pcd.condicao}) para a aula de ${dataState.proxima_aula.disciplina} de hoje, mantendo o objetivo da BNCC.`,
      },
      { label: "Mais tarde", intent: "dispensar_foco" },
    ];
    return {
      estado: "urgente-foco",
      saudacao: saudacao(ctx),
      texto: interp(
        `Sua próxima aula de <em>{{dataState.proxima_aula.disciplina}}</em> com a <em>{{entity.turma_atual.nome}}</em> é em <em>{{dataState.proxima_aula.minutos_ate}} min</em>. Quer que eu adapte para ${pcd.nome} (${pcd.condicao}) agora? Vamos juntas?`
      , ctx),
      acoes,
      contexto_chip: interp("vendo o planejamento da {{entity.turma_atual.nome}}", ctx),
    };
  }

  // 4) Inclusão com aluno selecionado → mentora técnica
  if (route === "inclusao" && entity.aluno_atual) {
    const a = entity.aluno_atual;
    const peiPendente = a.pei_status !== "completo";
    return {
      estado: "mentora-tecnica",
      saudacao: saudacao(ctx),
      texto: interp(
        peiPendente
          ? "Vi que o PEI de <em>{{entity.aluno_atual.primeiro_nome}}</em> ({{entity.aluno_atual.condicao_label}}) ainda está em <em>{{entity.aluno_atual.pei_status}}</em>. Vamos juntas finalizar agora? Leva uns 8 minutos."
          : "Estou olhando o PEI de <em>{{entity.aluno_atual.primeiro_nome}}</em> ({{entity.aluno_atual.condicao_label}}). {{entity.aluno_atual.adaptacoes_registradas}} adaptações registradas. Quer que eu sugira a próxima?"
        , ctx),
      acoes: peiPendente
        ? [
            { label: "Finalizar PEI", prompt: `Vamos completar o PEI de ${a.nome} (${a.condicao_label}). Comece pelos eixos faltantes.` },
            { label: "Continuar depois", intent: "dispensar_pei" },
          ]
        : [
            { label: "Sugerir adaptação", prompt: `Sugira a próxima adaptação para ${a.nome} (${a.condicao_label}) com base no PEI ativo.` },
            { label: "Gerar parecer descritivo", prompt: `Gere o parecer descritivo bimestral de ${a.nome} (${a.condicao_label}) com base no PEI e nas ${a.adaptacoes_registradas} adaptações registradas.` },
          ],
      contexto_chip: interp("vendo o PEI de {{entity.aluno_atual.primeiro_nome}}", ctx),
    };
  }

  // 5) Inclusão sem aluno selecionado → vigia-radar
  if (route === "inclusao") {
    if (entity.todos_alunos_pcd.length === 0) {
      return {
        estado: "propositiva-onboarding",
        saudacao: saudacao(ctx),
        texto: "Você ainda não tem alunos com laudo cadastrados. Vamos juntas cadastrar o primeiro? Leva uns 3 minutos.",
        acoes: [{ label: "Cadastrar PCD", intent: "abrir_cadastro_pcd" }],
        contexto_chip: "vendo a tela de Inclusão",
      };
    }
    const pcd = entity.todos_alunos_pcd[0];
    return {
      estado: "vigia-radar",
      saudacao: saudacao(ctx),
      texto: `Você tem <em>${entity.todos_alunos_pcd.length}</em> aluno(s) com laudo. Quer começar por ${pcd.nome} (${pcd.condicao})?`,
      acoes: [{ label: `Abrir ${pcd.nome}`, intent: `abrir_aluno:${pcd.nome}` }],
      contexto_chip: `vendo ${entity.todos_alunos_pcd.length} aluno(s) PCD`,
    };
  }

  // 6) Planejamento → parceira de fluxo
  if (route === "planejamento") {
    if (!entity.turma_atual) {
      return {
        estado: "propositiva-onboarding",
        saudacao: saudacao(ctx),
        texto: "Sem turma cadastrada eu não consigo planejar. Vamos juntas criar a primeira?",
        acoes: [{ label: "Criar turma", intent: "abrir_cadastro_turma" }],
        contexto_chip: "vendo o planejamento",
      };
    }
    return {
      estado: "parceira-fluxo",
      saudacao: saudacao(ctx),
      texto: interp(
        "Estou olhando o planejamento da <em>{{entity.turma_atual.nome}}</em>. Quer que eu rascunhe a aula da próxima semana? Vamos juntas?"
      , ctx),
      acoes: [
        { label: "Rascunhar aula", prompt: `Rascunhe um plano de aula para ${entity.turma_atual.nome} (${entity.turma_atual.ano}) para a próxima semana, alinhado à BNCC.` },
      ],
      contexto_chip: interp("vendo o planejamento da {{entity.turma_atual.nome}}", ctx),
    };
  }

  // 7) Relatórios → celebradora ou urgente conforme proporção
  if (route === "relatorios") {
    const { pareceres_finalizados: f, pareceres_total_bimestre: t } = dataState;
    if (t === 0) {
      return {
        estado: "muda",
        saudacao: null,
        texto: "Sem pareceres no bimestre ainda.",
        acoes: [],
        contexto_chip: "vendo seus relatórios",
      };
    }
    const pct = Math.round((f / t) * 100);
    if (pct >= 60) {
      return {
        estado: "celebradora",
        saudacao: saudacao(ctx),
        texto: `Você já entregou <em>${f} de ${t}</em> pareceres do bimestre (${pct}%). Tá voando! Quer que eu organize os ${t - f} restantes por urgência?`,
        acoes: [{ label: "Organizar restantes", prompt: `Liste os ${t - f} pareceres pendentes do bimestre por urgência e me sugira por onde começar.` }],
        contexto_chip: `vendo seus pareceres do bimestre`,
      };
    }
    return {
      estado: "urgente-foco",
      saudacao: saudacao(ctx),
      texto: `Faltam <em>${t - f}</em> pareceres do bimestre. Vamos juntas começar pelos PCDs?`,
      acoes: [{ label: "Começar pelos PCDs", prompt: `Gere os pareceres pendentes dos alunos PCD do bimestre, um a um, em ordem de prioridade.` }],
      contexto_chip: `vendo seus pareceres do bimestre`,
    };
  }

  // 8) Agenda
  if (route === "agenda") {
    return {
      estado: "vigia-radar",
      saudacao: saudacao(ctx),
      texto: dataState.eventos_agenda_mes > 0
        ? `Você tem <em>${dataState.eventos_agenda_mes}</em> eventos este mês. Quer que eu destaque os que precisam de preparação?`
        : "Sem eventos no mês. Quer cadastrar o calendário escolar agora?",
      acoes: dataState.eventos_agenda_mes > 0
        ? [{ label: "Destacar prioridades", prompt: "Liste os eventos da agenda deste mês que precisam de preparação e me sugira por onde começar." }]
        : [{ label: "Importar calendário", intent: "importar_calendario" }],
      contexto_chip: "vendo sua agenda escolar",
    };
  }

  // 9) Assistente IA → parceira de fluxo (ou onboarding se vazio)
  if (route === "assistente") {
    if (dataState.alunos_count === 0) {
      return {
        estado: "acolhedora-onboarding",
        saudacao: saudacao(ctx),
        texto: "Posso te ajudar mesmo sem alunos cadastrados — só que minhas sugestões ficam genéricas. Vamos juntas cadastrar a primeira turma?",
        acoes: [{ label: "Cadastrar turma", intent: "abrir_cadastro_turma" }],
        contexto_chip: null,
      };
    }
    return {
      estado: "parceira-fluxo",
      saudacao: saudacao(ctx),
      texto: interp(
        "Estou aqui pra te ajudar com <em>{{entity.turma_atual.nome}}</em> ({{dataState.alunos_count}} alunos). O que vamos fazer agora?"
      , ctx),
      acoes: [
        { label: "Gerar parecer", prompt: `Vamos gerar um parecer descritivo. Por qual aluno da ${entity.turma_atual?.nome} começamos?` },
        { label: "Adaptar atividade", prompt: `Quero adaptar uma atividade para um aluno da ${entity.turma_atual?.nome}. Me ajude a escolher.` },
      ],
      contexto_chip: interp("vendo a turma {{entity.turma_atual.nome}}", ctx),
    };
  }

  // 10) Home com dados (Pro com turma e alunos)
  if (route === "home") {
    if (user.streak_dias > 7) {
      return {
        estado: "celebradora",
        saudacao: saudacao(ctx),
        texto: interp(
          "<em>{{user.streak_dias}} dias</em> seguidos por aqui! Você já economizou <em>{{user.horas_economizadas_mes}}h</em> este mês. Bora manter o ritmo?"
        , ctx),
        acoes: [{ label: "Ver foco de hoje", intent: "ver_foco_hoje" }],
        contexto_chip: interp("vendo a turma {{entity.turma_atual.nome}}", ctx),
      };
    }
    return {
      estado: "parceira-fluxo",
      saudacao: saudacao(ctx),
      texto: interp(
        "Estou de olho na <em>{{entity.turma_atual.nome}}</em>. Vamos juntas o que primeiro: parecer, planejamento ou inclusão?"
      , ctx),
      acoes: [
        { label: "Parecer", to: "/relatorios" },
        { label: "Planejamento", to: "/planejamento" },
        { label: "Inclusão", to: "/inclusao" },
      ],
      contexto_chip: interp("vendo a turma {{entity.turma_atual.nome}}", ctx),
    };
  }

  // Configurações etc → muda
  return {
    estado: "muda",
    saudacao: null,
    texto: "",
    acoes: [],
    contexto_chip: null,
  };
}
