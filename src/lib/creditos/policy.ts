// Política de créditos e custos por documento gerado.
// Mantém a lógica de cobrança em um lugar só.

export type PlanoAtual = "anual" | "mensal" | "free";

export const CUSTOS = {
  parecer_descritivo: 10,
  relatorio_inclusao: 20,
  pei_completo: 50,
  plano_aula: 10,
  adaptacao_pcd: 10,
  anamnese: 10,
  atividade_gerada: 10,
  atividade_pcd: 10,
  planejamento_semanal: 15,
  trilha_semestral: 50,
  chat_sofia_bloco: 1, // 1 crédito a cada 10 mensagens (chat curto)
  chat_sofia_msgs_por_bloco: 10,
  chat_sofia_longa: 5, // geração longa no chat
  exportacao: 0,
} as const;

export const MESES_BONUS = new Set<number>([1, 6, 11]);

export const BONUS_NOMES: Record<number, string> = {
  1: "🎁 Bônus de Planejamento Anual",
  6: "🎁 Bônus de Fechamento de Semestre",
  11: "🎁 Bônus de Antecipação do Encerramento",
};

export const MESES_PT_LONGO = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function planoFromSnapshot(plano: string | null, ciclo: string | null): PlanoAtual {
  if (plano === "pro" && ciclo === "anual") return "anual";
  if (plano === "pro") return "mensal";
  return "free";
}

export function proximoBonus(now: Date = new Date()): { mes: number; ano: number } | null {
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  const meses = [1, 6, 11];
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

export function mensagemContextual(pct: number): string {
  if (pct >= 50) return "✅ Você está ótimo(a)! Créditos de sobra para o restante do ano.";
  if (pct >= 20) return "⚡ Usando bem seus créditos. Continue o ótimo trabalho!";
  if (pct >= 5) return "⚠️ Seus créditos estão acabando. Considere usar com atenção até o próximo ciclo.";
  return "🔴 Créditos quase esgotados. Entre em contato para adicionar mais.";
}

// Link de checkout do plano anual (Mercado Pago)
export const MP_ANUAL_URL =
  "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=7798ddd616d8438a92b0e2bceaa20bab";

// Valores de referência para comparativo mensal x anual
export const PRECO_MENSAL = 34.9;          // R$/mês
export const PRECO_ANUAL = 247.0;          // R$/ano
export const ECONOMIA_ANUAL = PRECO_MENSAL * 12 - PRECO_ANUAL; // R$ 171,80
export const CREDITOS_ANUAIS_TOTAL = 19500; // 18.000 + 3x500

// Próxima data de renovação do plano mensal:
// usamos o início do próximo mês civil (alinhado com o reset feito no banco).
export function proximaRenovacaoMensal(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

export function diasAteRenovacaoMensal(now: Date = new Date()): number {
  const next = proximaRenovacaoMensal(now);
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
  const candidato = new Date(Date.UTC(
    brtNow.getUTCFullYear(),
    brtNow.getUTCMonth(),
    brtNow.getUTCDate() + diasAteSexta,
    14 + 3, // 14h BRT = 17h UTC
    0, 0, 0,
  ));
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