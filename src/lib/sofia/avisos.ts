// Avisos da Sofia no Início: o que a professora precisa lembrar hoje, tirado
// só do que ela já cadastrou (agenda, alunos da Inclusão, registros, PEI e
// avaliações de leitura). Não usa IA, então não gasta créditos.
//
// Regras (em ordem de importância):
//   1. Compromissos de hoje na agenda (ou de amanhã, se hoje não tem nada).
//   2. Alunos da Inclusão sem registro há 15 dias ou mais.
//   3. Alunos da Inclusão ainda sem PEI.
//   4. Crianças sem avaliação de leitura há 30 dias ou mais (só para quem já
//      usa a Criança alfabetizada).

export type AvisoTipo = "agenda" | "registro" | "pei" | "leitura";

export type Aviso = {
  /** Muda quando o conteúdo muda, para um aviso dispensado voltar se surgir algo novo. */
  id: string;
  tipo: AvisoTipo;
  texto: string;
  acao: string;
  to: string;
  search?: Record<string, string>;
};

export type AvisosEntrada = {
  agenda: Array<{ id: string; date: string; title: string; time?: string }>;
  /** Alunos da tabela alunos_inclusao (inclui os da Criança alfabetizada, com pcd "nao"). */
  alunos: Array<{ id: string; name: string; pcd?: string; createdAt?: string }>;
  /** Registros da Inclusão por aluno (chave inc_reg), com `when` "DD/MM/AAAA · HH:MM". */
  registros: Record<string, Array<{ when?: string }> | undefined>;
  /** PEI preenchido na própria Inclusão (chave inc_pei). */
  peiInclusao: Record<string, Record<string, unknown> | undefined>;
  /** Alunos com PEI gerado na tela PEI/PDI (tabela pei_pdi). */
  alunosComPeiPdi: string[];
  leituras: Array<{ alunoId: string; alunoNome: string; data: string }>;
};

export const DIAS_SEM_REGISTRO = 15;
export const DIAS_SEM_LEITURA = 30;
const DIA_MS = 24 * 60 * 60 * 1000;

function isoLocal(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dia}`;
}

function inicioDoDia(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "21/11/2026 · 14:05" → data local; aceita também ISO. */
export function lerDataRegistro(when: string | undefined): Date | null {
  if (!when) return null;
  const br = /(\d{2})\/(\d{2})\/(\d{4})/.exec(when);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(when);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
}

function diasDesde(d: Date | null, hoje: Date): number {
  if (!d || Number.isNaN(d.getTime())) return Infinity;
  return Math.floor((inicioDoDia(hoje) - inicioDoDia(d)) / DIA_MS);
}

function primeiroNome(nome: string): string {
  return (nome || "").trim().split(/\s+/)[0] || nome;
}

/** "Ana", "Ana e Bia", "Ana, Bia e Caio", "Ana, Bia e mais 3". */
export function listaNomes(nomes: string[], max = 2): string {
  const n = nomes.map(primeiroNome);
  if (n.length <= 1) return n[0] ?? "";
  if (n.length === 2) return `${n[0]} e ${n[1]}`;
  if (n.length === max + 1) return `${n.slice(0, max).join(", ")} e ${n[max]}`;
  return `${n.slice(0, max).join(", ")} e mais ${n.length - max}`;
}

function ehInclusao(a: { pcd?: string }): boolean {
  return (a.pcd ?? "").toString().trim().toLowerCase() !== "nao";
}

function peiPreenchido(p: Record<string, unknown> | undefined): boolean {
  if (!p || typeof p !== "object") return false;
  return Object.values(p).some((v) => {
    if (typeof v === "string") return v.trim() !== "";
    if (Array.isArray(v)) return v.length > 0;
    return v != null && typeof v === "object" ? Object.keys(v).length > 0 : !!v;
  });
}

function textoAgenda(eventos: AvisosEntrada["agenda"], quando: "Hoje" | "Amanhã"): string {
  const ordenados = [...eventos].sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
  const um = (e: (typeof ordenados)[number]) => (e.time ? `${e.title} às ${e.time.slice(0, 5)}` : e.title);
  if (ordenados.length === 1) return `${quando}: ${um(ordenados[0])}.`;
  if (ordenados.length === 2) return `${quando}: ${um(ordenados[0])} e ${um(ordenados[1])}.`;
  return `${quando} você tem ${ordenados.length} compromissos, a começar por ${um(ordenados[0])}.`;
}

export function calcularAvisos(e: AvisosEntrada, hoje: Date = new Date()): Aviso[] {
  const out: Aviso[] = [];

  // 1. Agenda
  const hojeIso = isoLocal(hoje);
  const amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
  const amanhaIso = isoLocal(amanha);
  const deHoje = e.agenda.filter((x) => x.date === hojeIso && x.title?.trim());
  const deAmanha = e.agenda.filter((x) => x.date === amanhaIso && x.title?.trim());
  if (deHoje.length > 0) {
    out.push({
      id: `agenda:${hojeIso}:${deHoje.map((x) => x.id).sort().join(",")}`,
      tipo: "agenda",
      texto: textoAgenda(deHoje, "Hoje"),
      acao: "Ver agenda",
      to: "/agenda",
    });
  } else if (deAmanha.length > 0) {
    out.push({
      id: `agenda:${amanhaIso}:${deAmanha.map((x) => x.id).sort().join(",")}`,
      tipo: "agenda",
      texto: textoAgenda(deAmanha, "Amanhã"),
      acao: "Ver agenda",
      to: "/agenda",
    });
  }

  const inclusao = e.alunos.filter(ehInclusao);

  // 2. Inclusão sem registro recente (só conta quem foi cadastrado há tempo suficiente)
  const semRegistro = inclusao.filter((a) => {
    if (diasDesde(lerDataRegistro(a.createdAt), hoje) < DIAS_SEM_REGISTRO) return false;
    const regs = e.registros[a.id] ?? [];
    const ultimo = regs.reduce<Date | null>((maior, r) => {
      const d = lerDataRegistro(r.when);
      return d && (!maior || d > maior) ? d : maior;
    }, null);
    return diasDesde(ultimo, hoje) >= DIAS_SEM_REGISTRO;
  });
  if (semRegistro.length > 0) {
    const nomes = listaNomes(semRegistro.map((a) => a.name));
    const um = semRegistro.length === 1;
    out.push({
      id: `registro:${hojeIso}:${semRegistro.map((a) => a.id).sort().join(",")}`,
      tipo: "registro",
      texto: um
        ? `${nomes} está há mais de ${DIAS_SEM_REGISTRO} dias sem registro na Inclusão.`
        : `${nomes} estão há mais de ${DIAS_SEM_REGISTRO} dias sem registro na Inclusão.`,
      acao: "Registrar",
      to: "/inclusao",
      search: um ? { view: "detail", aluno: semRegistro[0].id, tab: "reg" } : undefined,
    });
  }

  // 3. Inclusão sem PEI
  const comPei = new Set(e.alunosComPeiPdi);
  const semPei = inclusao.filter((a) => !comPei.has(a.id) && !peiPreenchido(e.peiInclusao[a.id]));
  if (semPei.length > 0) {
    const nomes = listaNomes(semPei.map((a) => a.name));
    out.push({
      id: `pei:${semPei.map((a) => a.id).sort().join(",")}`,
      tipo: "pei",
      texto:
        semPei.length === 1
          ? `${nomes} ainda não tem PEI. A Sofia monta um a partir dos registros.`
          : `${nomes} ainda não têm PEI. A Sofia monta a partir dos registros.`,
      acao: "Fazer PEI",
      to: "/inclusao/pei",
    });
  }

  // 4. Leitura atrasada (só para quem já avaliou alguém)
  if (e.leituras.length > 0) {
    const ultimaPorAluno = new Map<string, { nome: string; data: Date | null }>();
    for (const l of e.leituras) {
      const d = lerDataRegistro(l.data);
      const atual = ultimaPorAluno.get(l.alunoId);
      if (!atual || (d && (!atual.data || d > atual.data))) {
        ultimaPorAluno.set(l.alunoId, { nome: l.alunoNome, data: d });
      }
    }
    // Aluno que saiu da lista (apagado) não entra.
    const existentes = new Set(e.alunos.map((a) => a.id));
    const atrasados = [...ultimaPorAluno.entries()]
      .filter(([id, v]) => (existentes.size === 0 || existentes.has(id)) && diasDesde(v.data, hoje) >= DIAS_SEM_LEITURA)
      .map(([id, v]) => ({ id, nome: v.nome }));
    if (atrasados.length > 0) {
      const nomes = listaNomes(atrasados.map((a) => a.nome));
      out.push({
        id: `leitura:${hojeIso}:${atrasados.map((a) => a.id).sort().join(",")}`,
        tipo: "leitura",
        texto:
          atrasados.length === 1
            ? `${nomes} não tem avaliação de leitura há mais de ${DIAS_SEM_LEITURA} dias.`
            : `${nomes} não têm avaliação de leitura há mais de ${DIAS_SEM_LEITURA} dias.`,
        acao: "Ouvir leitura",
        to: "/alfabetizacao",
      });
    }
  }

  return out;
}
