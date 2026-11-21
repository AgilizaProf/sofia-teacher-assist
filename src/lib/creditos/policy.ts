// Política de créditos e custos por documento gerado.
// Mantém a lógica de cobrança em um lugar só.

export type PlanoAtual = "anual" | "mensal" | "free";

export const CUSTOS = {
  parecer_descritivo: 20,
  relatorio_inclusao: 20,
  pei_completo: 50,
  pei_modelo_rede: 10, // preencher o modelo de PEI da rede da professora
  plano_aula: 10,
  adaptacao_pcd: 10,
  anamnese: 20,
  atividade_gerada: 10,
  atividade_pcd: 10,
  planejamento_semanal: 10,
  trilha_semestral: 10, // + créditos das atividades geradas na trilha
  chat_sofia_bloco: 1, // 1 crédito a cada 10 mensagens (chat curto)
  chat_sofia_msgs_por_bloco: 10,
  chat_sofia_longa: 5, // geração longa no chat
  anexar_rede: 100, // anexar arquivo de Rede (currículo municipal)
  anexar_agenda: 30, // anexar arquivo de Agenda (calendário escolar)
  leitura_avaliada: 5, // a Sofia ouve a leitura de um aluno (cobrado na função)
  texto_corrigido: 10, // a Sofia corrige a foto de um texto (cobrado na função)
  exportacao: 0,
} as const;

export const MESES_BONUS = new Set<number>([1, 6, 12]);

export const BONUS_NOMES: Record<number, string> = {
  1: "🎁 Bônus de Planejamento Anual",
  6: "🎁 Bônus de Fechamento de Semestre",
  12: "🎁 Bônus de Encerramento do Ano",
};

export const MESES_PT_LONGO = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function planoFromSnapshot(plano: string | null, ciclo: string | null): PlanoAtual {
  if (plano === "pro" && ciclo === "anual") return "anual";
  if (plano === "pro") return "mensal";
  return "free";
}

export function proximoBonus(now: Date = new Date()): { mes: number; ano: number } | null {
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  const meses = [1, 6, 12];
  for (const mb of meses) {
    if (mb > m) return { mes: mb, ano: y };
  }
  return { mes: 1, ano: y + 1 };
}

export function corDaBarra(pct: number): "ok" | "warn" | "danger" {
  if (pct >= 50) return "ok";
  if (pct >= 20) return "warn";
  return "danger";
}

export function mensagemContextual(pct: number, plano: PlanoAtual): string {
  if (pct >= 50) {
    if (plano === "mensal")
      return "✅ Você está ótimo(a)! Créditos de sobra para o restante do mês.";
    if (plano === "free")
      return "✅ Você está ótimo(a)! Créditos de sobra para o restante da semana.";
    return "✅ Você está ótimo(a)! Créditos de sobra para o restante do ano.";
  }
  if (pct >= 20) return "⚡ Usando bem seus créditos. Continue o ótimo trabalho!";
  if (pct >= 5)
    return "⚠️ Seus créditos estão acabando. Considere usar com atenção até o próximo ciclo.";
  return "🔴 Créditos quase esgotados. Entre em contato para adicionar mais.";
}

// Link de checkout do plano anual (Mercado Pago)
export const MP_ANUAL_URL =
  "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=7798ddd616d8438a92b0e2bceaa20bab";

// Valores de referência para comparativo mensal x anual
export const PRECO_MENSAL = 34.9; // R$/mês
export const PRECO_ANUAL = 247.0; // R$/ano
export const ECONOMIA_ANUAL = PRECO_MENSAL * 12 - PRECO_ANUAL; // R$ 171,80
export const CREDITOS_ANUAIS_TOTAL = 19500; // 18.000 + 3x500
export const CREDITOS_MENSAIS = 1500; // plano mensal e promoção até 12/03/2027

// Próxima data de renovação do plano mensal:
// 30 dias a partir da última data de renovação (creditado pelo Mercado Pago).
// Se não houver data_renovacao registrada, cai no fallback de início do próximo mês civil.
export function proximaRenovacaoMensal(
  dataRenovacao?: string | Date | null,
  now: Date = new Date(),
): Date {
  if (dataRenovacao) {
    const base = typeof dataRenovacao === "string" ? new Date(dataRenovacao) : dataRenovacao;
    if (!isNaN(base.getTime())) {
      let next = new Date(base.getTime());
      next.setDate(next.getDate() + 30);
      // Se já passou, avança em ciclos de 30 dias até cair no futuro.
      while (next.getTime() <= now.getTime()) {
        next.setDate(next.getDate() + 30);
      }
      return next;
    }
  }
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

export function diasAteRenovacaoMensal(
  dataRenovacao?: string | Date | null,
  now: Date = new Date(),
): number {
  const next = proximaRenovacaoMensal(dataRenovacao, now);
  const ms = next.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function isMesPico(now: Date = new Date()): boolean {
  return MESES_BONUS.has(now.getMonth() + 1);
}

// ===== Plano gratuito: renovação semanal toda sexta-feira às 14h (BRT) =====
export const FREE_CREDITOS_SEMANAIS = 75;

/** Próxima sexta-feira às 14:00 (horário de Brasília). */
export function proximaRenovacaoSemanal(now: Date = new Date()): Date {
  // BRT = UTC-3 (sem horário de verão atualmente)
  const brtNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const dow = brtNow.getUTCDay(); // 0=dom..5=sex
  let diasAteSexta = (5 - dow + 7) % 7;
  // monta candidato em BRT às 14h
  const candidato = new Date(
    Date.UTC(
      brtNow.getUTCFullYear(),
      brtNow.getUTCMonth(),
      brtNow.getUTCDate() + diasAteSexta,
      14 + 3, // 14h BRT = 17h UTC
      0,
      0,
      0,
    ),
  );
  if (candidato.getTime() <= now.getTime()) {
    candidato.setUTCDate(candidato.getUTCDate() + 7);
  }
  return candidato;
}

export function diasAteRenovacaoSemanal(now: Date = new Date()): number {
  const next = proximaRenovacaoSemanal(now);
  const ms = next.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function horasAteRenovacaoSemanal(now: Date = new Date()): number {
  const next = proximaRenovacaoSemanal(now);
  const ms = next.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60)));
}
// ===== Tabela "quanto custa cada coisa" (fonte única: CUSTOS) =====
// Usada no painel de créditos e no extrato. Não escreva números à mão:
// leia de CUSTOS para a tabela nunca divergir do que é cobrado (N12).
export type LinhaCusto = { nome: string; custo: number; obs?: string };

export const TABELA_CUSTOS: LinhaCusto[] = [
  {
    nome: "Chat com a Sofia",
    custo: CUSTOS.chat_sofia_bloco,
    obs: `a cada ${CUSTOS.chat_sofia_msgs_por_bloco} mensagens`,
  },
  { nome: "Geração longa no chat", custo: CUSTOS.chat_sofia_longa },
  { nome: "Parecer descritivo", custo: CUSTOS.parecer_descritivo },
  { nome: "Relatório de inclusão", custo: CUSTOS.relatorio_inclusao },
  { nome: "Anamnese", custo: CUSTOS.anamnese },
  { nome: "PEI completo", custo: CUSTOS.pei_completo },
  { nome: "PEI no modelo da rede", custo: CUSTOS.pei_modelo_rede },
  { nome: "Plano de aula", custo: CUSTOS.plano_aula },
  { nome: "Planejamento semanal", custo: CUSTOS.planejamento_semanal },
  {
    nome: "Trilha semestral",
    custo: CUSTOS.trilha_semestral,
    obs: "mais os créditos de cada atividade gerada na trilha",
  },
  { nome: "Atividade gerada", custo: CUSTOS.atividade_gerada },
  { nome: "Atividade PCD", custo: CUSTOS.atividade_pcd },
  { nome: "Adaptação PCD", custo: CUSTOS.adaptacao_pcd },
  { nome: "Ouvir a leitura de um aluno", custo: CUSTOS.leitura_avaliada },
  { nome: "Corrigir um texto pela foto", custo: CUSTOS.texto_corrigido },
  { nome: "Anexar calendário na Agenda", custo: CUSTOS.anexar_agenda },
  { nome: "Anexar currículo da rede", custo: CUSTOS.anexar_rede },
  { nome: "Exportar PDF ou Word", custo: CUSTOS.exportacao },
];

export function custoTexto(n: number): string {
  if (n <= 0) return "grátis";
  return `${n.toLocaleString("pt-BR")} crédito${n === 1 ? "" : "s"}`;
}

/**
 * Agrupa um lançamento de creditos_historico num tipo legível, a partir da
 * descrição gravada por consumirCreditos() e pelas funções do banco.
 */
export function categoriaDoLancamento(descricao: string, tipo?: string | null): string {
  const d = (descricao || "").toLowerCase();
  if (tipo && tipo !== "uso") {
    if (tipo === "bonus") return "Bônus";
    if (tipo === "compra") return "Compra de créditos";
    if (tipo === "ajuste") return "Ajuste";
    return "Renovação do plano";
  }
  if (d.startsWith("chat sofia") || d.startsWith("chat com")) return "Chat com a Sofia";
  if (d.startsWith("chat")) return "Geração longa no chat";
  if (d.startsWith("parecer")) return "Parecer descritivo";
  if (d.startsWith("relatório pedagógico")) return "Parecer descritivo";
  if (d.startsWith("relatório de inclusão")) return "Relatório de inclusão";
  if (d.startsWith("pei no modelo")) return "PEI no modelo da rede";
  if (d.startsWith("pei")) return "PEI completo";
  if (d.startsWith("anamnese")) return "Anamnese";
  if (d.startsWith("plano de aula")) return "Plano de aula";
  if (d.startsWith("planejamento semanal") || d.startsWith("roteiro ei"))
    return "Planejamento semanal";
  if (d.startsWith("trilha")) return "Trilha semestral";
  if (d.startsWith("adaptação")) return "Adaptação PCD";
  if (d.startsWith("atividade pcd")) return "Atividade PCD";
  if (d.startsWith("atividade")) return "Atividade gerada";
  if (d.startsWith("anexo de agenda")) return "Anexar calendário na Agenda";
  if (d.startsWith("anexo de rede")) return "Anexar currículo da rede";
  return "Outros";
}

/** Fim da promoção "grátis até 12/03/2027" (mesma data da migration). */
export const PROMO_ATE_ISO = "2027-03-12T23:59:59-03:00";
export const PROMO_ATE_TEXTO = "12/03/2027";
