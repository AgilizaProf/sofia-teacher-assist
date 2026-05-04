// Conta mock: alterna entre Free vazio e Pro cheio (Camila / 211 CAIC / Pedrinho TEA N1 / Caio TDAH).
// Persiste em localStorage para sobreviver a reload e ser observável por hooks.

const KEY = "sofia_mock_account";
export type MockAccount = "free_vazio" | "pro_cheio";

export function getMockAccount(): MockAccount {
  if (typeof window === "undefined") return "free_vazio";
  const v = window.localStorage.getItem(KEY);
  return v === "pro_cheio" ? "pro_cheio" : "free_vazio";
}

export function setMockAccount(a: MockAccount) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, a);
  window.dispatchEvent(new CustomEvent("sofia:mock-account", { detail: a }));
  window.dispatchEvent(new CustomEvent("sofia:mutate"));
}

export function subscribeMockAccount(cb: (a: MockAccount) => void) {
  const fn = () => cb(getMockAccount());
  window.addEventListener("sofia:mock-account", fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener("sofia:mock-account", fn);
    window.removeEventListener("storage", fn);
  };
}

// Dataset Pro — usado para semear o contexto quando a conta selecionada é "pro_cheio".
// IMPORTANTE: nada aqui aparece no JSX como string fixa; tudo passa por interpolação.
export const PRO_DATASET = {
  user: {
    nome: "Camila Mendes",
    primeiro_nome: "Camila",
    plano: "pro" as const,
    streak_dias: 12,
    horas_economizadas_mes: 14,
    creditos_usados: 1840,
    creditos_total: 9000,
  },
  turma: {
    id: "t-211-caic",
    nome: "211 CAIC",
    ano: "2º ano",
    total_alunos: 27,
  },
  alunos: [
    {
      id: "a-pedrinho",
      nome: "Pedrinho Almeida",
      primeiro_nome: "Pedrinho",
      ano_escolar: "2º ano",
      turma: "211 CAIC",
      cid: "F84.0",
      condicao_label: "TEA Nível 1",
      mediadora: { nome: "Tereza Almeida", frequencia: "diária" },
      anamnese_eixos_preenchidos: 6,
      anamnese_eixos_total: 8,
      pei_status: "completo" as const,
      adaptacoes_registradas: 14,
    },
    {
      id: "a-caio",
      nome: "Caio Fernandes",
      primeiro_nome: "Caio",
      ano_escolar: "2º ano",
      turma: "211 CAIC",
      cid: "F90",
      condicao_label: "TDAH",
      mediadora: null,
      anamnese_eixos_preenchidos: 4,
      anamnese_eixos_total: 8,
      pei_status: "rascunho" as const,
      adaptacoes_registradas: 5,
    },
  ],
  pareceres: { finalizados: 18, total: 27 },
  eventos_mes: 23,
  // Próxima aula é construída dinamicamente em sofiaContext (sempre relativa a "agora").
};
