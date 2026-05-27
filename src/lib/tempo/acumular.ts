import { supabase } from "@/integrations/supabase/client";

/**
 * Tempo (em minutos) devolvido ao usuário por cada ação concluída.
 * Fonte única da verdade da tabela "Tempo devolvido a você".
 */
export const TEMPO_MIN = {
  // Currículo e cadastros
  curriculo_municipio: 60,           // 1 h por currículo anexado
  aluno_em_massa_unit: 1,            // 1 min por aluno
  cadastrar_turma: 10,               // 10 min por turma

  // Planejamento
  planejamento_ia: 20,               // 20 min por planejamento completo gerado pela IA
  atividade_m1_m2: 20,               // 20 min por atividade gerada e selecionada (M1/M2)
  sofia_semana_atividade: 20,        // 20 min por atividade salva quando Sofia preenche a semana
  drag_and_drop: 10,                 // 10 min por atividade arrastada (após já salva)
  replicar_em_turmas: 20,            // 20 min por ação (independente do número de turmas)
  trilha_atividade: 20,              // 20 min por atividade dentro de uma trilha gerada

  // Relatórios
  relatorio_ia: 35,                  // 35 min por relatório gerado pela IA
  relatorio_aluno: 45,               // 45 min por aluno na página de relatórios

  // Inclusão
  // Anamnese é creditada em dois patamares incrementais por aluno:
  //  - ao salvar com qualquer preenchimento (< 50%) → +1 h (baixa)
  //  - ao salvar atingindo ≥ 50% → +1 h adicional (alta), totalizando 2 h
  anamnese_baixa: 60,                // primeira hora (preenchimento < 50%)
  anamnese_alta: 60,                 // segunda hora (ao cruzar 50%)
  pei_aluno: 180,                    // 3 h por PEI realizado
  planejamento_inclusao: 20,         // 20 min por atividade gerada (inclusão)
  registro: 5,                       // 5 min por registro salvo
  relatorio_pcd: 45,                 // 45 min por relatório PCD gerado pela IA

  // Agenda
  calendario_anexado: 120,           // 2 h por calendário anexado
  atividade_m4: 5,                   // 5 min por atividade trazida (M4)
} as const;

export type TempoAcao = keyof typeof TEMPO_MIN;

/**
 * Acumula tempo no saldo do usuário autenticado.
 * Falha silenciosa (apenas log) — nunca deve quebrar a ação principal.
 */
export async function acumularTempo(
  acao: TempoAcao,
  motivo: string,
  opts?: { minutos?: number; multiplicador?: number },
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const base = opts?.minutos ?? TEMPO_MIN[acao];
    const minutos = Math.max(0, Math.round(base * (opts?.multiplicador ?? 1)));
    if (minutos <= 0) return;
    await supabase.rpc("acumular_tempo_economizado" as any, {
      _user_id: user.id,
      _minutos: minutos,
      _acao: acao,
      _motivo: motivo,
    });
  } catch (err) {
    console.warn("[tempo] falha ao acumular", acao, err);
  }
}

/** Formata minutos em "Xh Ym" (ou "Ym" quando < 60). */
export function formatMinutos(min: number): string {
  const total = Math.max(0, Math.floor(min));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}