// Política de créditos e custos por documento gerado.
// Mantém a lógica de cobrança em um lugar só.

export type PlanoAtual = "anual" | "mensal" | "free";

export const CUSTOS = {
  parecer_descritivo: 100,
  relatorio_inclusao: 100,
  pei_completo: 200,
  plano_aula: 100,
  adaptacao_pcd: 100,
  anamnese: 100,
  chat_sofia_bloco: 100, // a cada 100 mensagens
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