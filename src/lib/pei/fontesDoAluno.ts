// O que o app já sabe do aluno fora do PEI, para a Sofia usar ao preencher o
// modelo da rede: anamnese, registros de sala, relatório de inclusão, diário de
// bordo e mensagens do WhatsApp que a professora já confirmou.
//
// Tudo isto já foi escrito ou conferido pela professora em outras telas. Aqui
// só é juntado em texto, com limite de tamanho por fonte.

export type FontesBrutas = {
  /** Anamnese: eixos com itens (descrição e situação) e observação do eixo. */
  anamnese?: Array<{ l?: string; obs?: string; items?: Array<{ d?: string; s?: string }> }> | null;
  anamneseObsGeral?: string | null;
  /** Registros do aluno (pedagógico, comportamental, sensorial, família). */
  registros?: Array<{ when?: string; cat?: string; body?: string }> | null;
  /** Último relatório de inclusão gerado. */
  parecer?: {
    periodoLabel?: string;
    resumo?: string;
    pedagogico?: string;
    comportamental?: string;
    sensorial?: string;
    familia?: string;
    avancos?: string[];
    desafios?: string[];
    encaminhamentos?: string[];
    texto?: string;
  } | null;
  /** Diário de bordo da turma (só as entradas ligadas ao aluno). */
  diario?: Array<{ date?: string; title?: string; text?: string; tags?: string[] }> | null;
  /** Mensagens do WhatsApp já confirmadas pela professora. */
  whatsapp?: Array<{ recebido_em?: string; texto?: string }> | null;
};

export type FontesDoAluno = {
  /** Texto para a Sofia ("" quando não há nada além do PEI). */
  texto: string;
  /** O que entrou, para mostrar à professora. Ex.: ["anamnese", "12 registros"]. */
  resumo: string[];
};

const SITUACAO: Record<string, string> = {
  consolidado: "consolidado",
  desenvolvimento: "em desenvolvimento",
  naoAlcancado: "ainda não alcançado",
};
const CATEGORIA: Record<string, string> = {
  ped: "pedagógico",
  com: "comportamental",
  sen: "sensorial",
  fam: "família",
};

const limpo = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");
const corta = (t: string, max: number) => (t.length > max ? `${t.slice(0, max).trimEnd()}…` : t);
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export function montarFontesDoAluno(f: FontesBrutas): FontesDoAluno {
  const blocos: string[] = [];
  const resumo: string[] = [];

  // Anamnese: só o que foi observado (o que está "não observado" não diz nada).
  const linhasAnam: string[] = [];
  for (const eixo of f.anamnese || []) {
    const itens = (eixo.items || [])
      .filter((i) => limpo(i.d) && SITUACAO[i.s || ""])
      .map((i) => `${limpo(i.d)}: ${SITUACAO[i.s || ""]}`);
    const obs = limpo(eixo.obs);
    if (!itens.length && !obs) continue;
    linhasAnam.push(
      `${limpo(eixo.l) || "Eixo"}: ${itens.join("; ")}${obs ? `${itens.length ? ". " : ""}Observação: ${obs}` : ""}`,
    );
  }
  const obsGeral = limpo(f.anamneseObsGeral);
  if (obsGeral) linhasAnam.push(`Observação geral: ${obsGeral}`);
  if (linhasAnam.length) {
    blocos.push(`ANAMNESE (preenchida pela professora):\n${corta(linhasAnam.join("\n"), 4000)}`);
    resumo.push("anamnese");
  }

  // Registros: os 30 mais recentes (a lista do app já vem do mais novo para o mais antigo).
  const regs = (f.registros || []).filter((r) => limpo(r.body)).slice(0, 30);
  if (regs.length) {
    const linhas = regs.map(
      (r) =>
        `- ${limpo(r.when).split("·")[0].trim() || "sem data"} (${CATEGORIA[r.cat || ""] || "registro"}): ${corta(limpo(r.body), 400)}`,
    );
    blocos.push(`REGISTROS DE SALA:\n${corta(linhas.join("\n"), 5000)}`);
    resumo.push(plural(regs.length, "registro", "registros"));
  }

  // Relatório de inclusão mais recente.
  const p = f.parecer;
  if (p) {
    const partes: string[] = [];
    const campo = (nome: string, v: unknown) => {
      if (limpo(v)) partes.push(`${nome}: ${limpo(v)}`);
    };
    const lista = (nome: string, v: unknown) => {
      const itens = Array.isArray(v) ? v.map(limpo).filter(Boolean) : [];
      if (itens.length) partes.push(`${nome}: ${itens.join("; ")}`);
    };
    campo("Resumo", p.resumo);
    campo("Pedagógico", p.pedagogico);
    campo("Comportamental", p.comportamental);
    campo("Sensorial", p.sensorial);
    campo("Família", p.familia);
    lista("Avanços", p.avancos);
    lista("Desafios", p.desafios);
    lista("Encaminhamentos", p.encaminhamentos);
    if (!partes.length) campo("Texto", p.texto);
    if (partes.length) {
      blocos.push(
        `RELATÓRIO DE INCLUSÃO${limpo(p.periodoLabel) ? ` (${limpo(p.periodoLabel)})` : ""}:\n${corta(partes.join("\n"), 3500)}`,
      );
      resumo.push("relatório de inclusão");
    }
  }

  // Diário de bordo.
  const diario = (f.diario || []).filter((d) => limpo(d.title) || limpo(d.text)).slice(0, 15);
  if (diario.length) {
    const linhas = diario.map(
      (d) =>
        `- ${limpo(d.date) || "sem data"}: ${corta([limpo(d.title), limpo(d.text)].filter(Boolean).join(" — "), 300)}`,
    );
    blocos.push(`DIÁRIO DE BORDO (entradas que citam o aluno):\n${corta(linhas.join("\n"), 2500)}`);
    resumo.push(plural(diario.length, "anotação do diário", "anotações do diário"));
  }

  // WhatsApp (só o que a professora confirmou).
  const wa = (f.whatsapp || []).filter((w) => limpo(w.texto)).slice(0, 30);
  if (wa.length) {
    const linhas = wa.map((w) => {
      const d = w.recebido_em ? new Date(w.recebido_em) : null;
      const quando = d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("pt-BR") : "sem data";
      return `- ${quando}: ${corta(limpo(w.texto), 400)}`;
    });
    blocos.push(
      `MENSAGENS DO WHATSAPP (enviadas e confirmadas pela professora):\n${corta(linhas.join("\n"), 4000)}`,
    );
    resumo.push(plural(wa.length, "mensagem do WhatsApp", "mensagens do WhatsApp"));
  }

  return { texto: blocos.join("\n\n"), resumo };
}

/** Entradas do diário de bordo ligadas ao aluno (pelo id; nas antigas, pelo nome). */
export function diarioDoAluno<
  T extends { title?: string; text?: string; atividadeTitulo?: string; alunoIds?: unknown },
>(entradas: T[] | null | undefined, alunoId: string, alunoNome: string): T[] {
  const nome = alunoNome.toLowerCase().trim();
  const primeiro = nome.split(" ")[0];
  return (entradas || []).filter((e) => {
    if (Array.isArray(e.alunoIds)) return (e.alunoIds as string[]).includes(alunoId);
    if (!primeiro || primeiro.length < 3) return false;
    const txt = `${e.title || ""} ${e.text || ""} ${e.atividadeTitulo || ""}`.toLowerCase();
    return new RegExp(
      `(^|[^\\p{L}])${primeiro.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`,
      "u",
    ).test(txt);
  });
}
