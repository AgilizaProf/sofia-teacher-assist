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