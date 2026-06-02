// Tipagem do SofiaContext — fonte da verdade compartilhada por todas as telas.
// Mantém o contrato espelhável por uma futura server route (ver useFocoDoDia).

export type Periodo = "manha" | "tarde" | "noite";
export type DiaSemana = "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";
export type RouteKey = "home" | "assistente" | "planejamento" | "relatorios" | "inclusao" | "agenda" | "configuracoes";

export type SofiaUser = {
  nome: string;
  primeiro_nome: string;
  plano: "free" | "pro";
  ciclo?: "mensal" | "anual" | null;
  streak_dias: number;
  horas_economizadas_mes: number;
  creditos_usados: number;
  creditos_total: number;
};

export type SofiaTurma = {
  id: string;
  nome: string;
  ano: string;
  total_alunos: number;
};

export type SofiaAluno = {
  id: string;
  nome: string;
  primeiro_nome: string;
  ano_escolar: string;
  turma: string;
  cid: string | null;
  condicao_label: string | null;
  mediadora: { nome: string; frequencia: string } | null;
  anamnese_eixos_preenchidos: number;
  anamnese_eixos_total: number;
  pei_status: "nao_criado" | "rascunho" | "completo";
  adaptacoes_registradas: number;
};

export type ProximaAula = {
  disciplina: string;
  bncc_codigo: string | null;
  horario: string;       // ISO
  minutos_ate: number;
  turma: string;
};

export type SofiaContext = {
  route: RouteKey;
  user: SofiaUser;
  entity: {
    turma_atual: SofiaTurma | null;
    aluno_atual: SofiaAluno | null;
    todos_alunos_pcd: Array<{ nome: string; condicao: string }>;
    nivel_ensino?: string | null;
  };
  dataState: {
    turmas_count: number;
    alunos_count: number;
    pareceres_finalizados: number;
    pareceres_total_bimestre: number;
    eventos_agenda_mes: number;
    proxima_aula: ProximaAula | null;
  };
  temporal: {
    dia_semana: DiaSemana;
    hora_local: string;
    periodo: Periodo;
    fim_de_bimestre_em_dias: number | null;
    eh_inicio_de_mes: boolean;
  };
  /** Define (ou limpa, com null) o aluno em foco. Dispara re-render para o
   *  contexto da Sofia ser recomputado de forma determinística. */
  setAlunoAtual: (aluno: SofiaAluno | null) => void;
};

// ----- Resultado de gerarFalaSofia -----
export type FalaEstado =
  | "acolhedora-onboarding"
  | "propositiva-onboarding"
  | "urgente-foco"
  | "celebradora"
  | "vigia-radar"
  | "parceira-fluxo"
  | "mentora-tecnica"
  | "muda";

export type SofiaAcao = {
  label: string;
  prompt?: string;       // pré-preenche a Tray
  to?: RouteKey | string; // navega
  intent?: string;        // identificador para handlers customizados (ex.: "abrir_cadastro_turma")
};

export type FalaSofia = {
  estado: FalaEstado;
  saudacao: string | null;
  texto: string;          // pode conter <em> para palavras-chave em laranja
  acoes: SofiaAcao[];
  contexto_chip: string | null; // texto do chip "Sofia ativa · ..."
};
