// Habilidades e objetivos da BNCC para as sugestões do PEI.
//
// O arquivo /bncc/bncc.json (public/) tem os textos oficiais da BNCC 2018
// (dados abertos bncc-dev/bncc-dados, licença MIT):
//   ei: objetivos de aprendizagem por campo de experiência e grupo etário (1, 2, 3)
//   ef: habilidades por componente, com ano inicial e final (1º a 9º)
//   em: habilidades por área do Ensino Médio
// Só é baixado quando a professora abre as sugestões.

export type NivelBncc =
  | { etapa: "ei"; grupo: 1 | 2 | 3 }
  | { etapa: "ef"; ano: number }
  | { etapa: "em" };

export type ItemBncc = { cod: string; t: string };

type BnccJson = {
  ei: Record<string, Array<[string, string, number]>>;
  ef: Record<string, Array<[string, string, number, number]>>;
  em: Record<string, Array<[string, string]>>;
};

export const COMPONENTES: Record<NivelBncc["etapa"], Array<{ k: string; nome: string }>> = {
  ei: [
    { k: "eo", nome: "O eu, o outro e o nós" },
    { k: "cg", nome: "Corpo, gestos e movimentos" },
    { k: "ts", nome: "Traços, sons, cores e formas" },
    { k: "ef", nome: "Escuta, fala, pensamento e imaginação" },
    { k: "et", nome: "Espaços, tempos, quantidades, relações e transformações" },
  ],
  ef: [
    { k: "lp", nome: "Língua Portuguesa" },
    { k: "mat", nome: "Matemática" },
    { k: "cie", nome: "Ciências" },
    { k: "his", nome: "História" },
    { k: "geo", nome: "Geografia" },
    { k: "arte", nome: "Arte" },
    { k: "ef", nome: "Educação Física" },
    { k: "ing", nome: "Língua Inglesa" },
    { k: "rel", nome: "Ensino Religioso" },
  ],
  em: [
    { k: "lgg", nome: "Linguagens" },
    { k: "lp", nome: "Língua Portuguesa" },
    { k: "mat", nome: "Matemática" },
    { k: "cnt", nome: "Ciências da Natureza" },
    { k: "chs", nome: "Ciências Humanas e Sociais" },
  ],
};

export const GRUPOS_EI: Record<1 | 2 | 3, string> = {
  1: "Bebês (0 a 1 ano e 6 meses)",
  2: "Crianças bem pequenas (1 ano e 7 meses a 3 anos e 11 meses)",
  3: "Crianças pequenas (4 anos a 5 anos e 11 meses)",
};

function norm(v: string): string {
  return (v || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Lê a etapa e o ano a partir do texto da série/turma/ano de referência.
 * Ex.: "3º ano A" → EF 3; "Maternal II (3-4 anos)" → EI grupo 2;
 * "Pré II" → EI grupo 3; "2ª série" / "1º ano EM" → EM.
 */
export function nivelDoTexto(...textos: Array<string | undefined | null>): NivelBncc | null {
  for (const bruto of textos) {
    const t = norm(bruto || "").trim();
    if (!t) continue;
    // "EM" só vale em maiúsculas ("1º ano EM"): em minúsculas é a palavra "em".
    const siglaEM = /(^|[^\p{L}])EM([^\p{L}]|$)/u.test(bruto || "");
    if (/bercario|bebe/.test(t)) return { etapa: "ei", grupo: 1 };
    if (/maternal|creche|bem pequen/.test(t)) return { etapa: "ei", grupo: 2 };
    if (/\bpre\b|pre-escola|pre escola|jardim|criancas pequenas/.test(t))
      return { etapa: "ei", grupo: 3 };
    if (/\bg[1-3]\b/.test(t)) return { etapa: "ei", grupo: 2 };
    if (/\bg[45]\b/.test(t)) return { etapa: "ei", grupo: 3 };
    if (/infantil/.test(t)) {
      // "Infantil 2", "Infantil III": turmas de 2 e 3 anos são crianças bem pequenas.
      const n = t.match(/infantil\s*(\d|i{1,3}\b|iv\b|v\b)/);
      const idade = n ? ({ i: 1, ii: 2, iii: 3, iv: 4, v: 5 }[n[1]] ?? parseInt(n[1], 10)) : 0;
      return { etapa: "ei", grupo: idade >= 1 && idade <= 3 ? 2 : 3 };
    }
    if (/ensino medio/.test(t) || siglaEM || /\d\s*[aoªº°]?\s*serie/.test(t))
      return { etapa: "em" };
    // "1º período", "2º período": pré-escola em várias redes.
    if (/\d\s*[oº°]?\s*periodo/.test(t) && !/ano|serie/.test(t)) return { etapa: "ei", grupo: 3 };
    const m = t.match(/(\d{1,2})\s*[ºo°]?\s*ano/) || t.match(/^\D*([1-9])\b/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 9) return { etapa: "ef", ano: n };
    }
  }
  return null;
}

export function nomeDoNivel(n: NivelBncc): string {
  if (n.etapa === "ei") return `Educação Infantil · ${GRUPOS_EI[n.grupo].split(" (")[0]}`;
  if (n.etapa === "ef") return `${n.ano}º ano`;
  return "Ensino Médio";
}

/** Todos os níveis, para a professora trocar (ex.: aluno com ano de referência anterior). */
export const TODOS_NIVEIS: NivelBncc[] = [
  { etapa: "ei", grupo: 1 },
  { etapa: "ei", grupo: 2 },
  { etapa: "ei", grupo: 3 },
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((ano) => ({ etapa: "ef" as const, ano })),
  { etapa: "em" },
];

export function chaveNivel(n: NivelBncc): string {
  return n.etapa === "ei" ? `ei${n.grupo}` : n.etapa === "ef" ? `ef${n.ano}` : "em";
}

export function nivelDaChave(k: string): NivelBncc | null {
  return TODOS_NIVEIS.find((n) => chaveNivel(n) === k) || null;
}

let cache: BnccJson | null = null;
let carregando: Promise<BnccJson> | null = null;

export function carregarBncc(): Promise<BnccJson> {
  if (cache) return Promise.resolve(cache);
  if (!carregando) {
    carregando = fetch("/bncc/bncc.json", { cache: "force-cache" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<BnccJson>;
      })
      .then((j) => (cache = j))
      .finally(() => {
        carregando = null;
      });
  }
  return carregando;
}

/** Itens do componente para o nível: primeiro os só daquele ano, depois os de vários anos. */
export function itensBncc(dados: BnccJson, nivel: NivelBncc, comp: string): ItemBncc[] {
  if (nivel.etapa === "ei") {
    return (dados.ei[comp] || [])
      .filter((r) => r[2] === nivel.grupo)
      .map((r) => ({ cod: r[0], t: r[1] }));
  }
  if (nivel.etapa === "em") {
    return (dados.em[comp] || []).map((r) => ({ cod: r[0], t: r[1] }));
  }
  const ano = nivel.ano;
  return (dados.ef[comp] || [])
    .filter((r) => r[2] <= ano && ano <= r[3])
    .sort((x, y) => (x[2] === x[3] ? 0 : 1) - (y[2] === y[3] ? 0 : 1) || x[0].localeCompare(y[0]))
    .map((r) => ({ cod: r[0], t: r[1] }));
}

/**
 * Componente que abre primeiro em cada campo do PEI. `null` = o campo não
 * mostra a BNCC (ex.: atenção, memória, crises).
 */
export function componentePadrao(campo: string, etapa: NivelBncc["etapa"]): string | null {
  const ei = etapa === "ei";
  const em = etapa === "em";
  const lp = ei ? "ef" : em ? "lgg" : "lp";
  const mat = ei ? "et" : "mat";
  const corpo = ei ? "cg" : em ? "lgg" : "ef";
  switch (campo) {
    case "aval_obs:leitura_escrita":
      return lp;
    case "aval_obs:linguagem_oral":
      return lp;
    case "aval_obs:raciocinio_logico":
      return mat;
    case "aval_obs:motor_fino":
      return ei ? "cg" : em ? null : "arte";
    case "aval_obs:motor_grosso":
      return corpo;
    case "aval_obs:socializacao":
      return ei ? "eo" : em ? null : "ef";
    case "meta_texto:Cognitiva/Pedagógica":
      return lp;
    case "meta_texto:Comunicação e linguagem":
      return lp;
    case "meta_texto:Motora":
      return corpo;
    case "meta_texto:Social e emocional":
      return ei ? "eo" : em ? null : "ef";
    case "meta_texto:Autonomia e independência":
      return ei ? "cg" : null;
    case "objetivosLongoPrazo":
    case "adaptacoesConteudo":
    case "estrategiasArea":
      return ei ? "eo" : lp;
    default:
      return null;
  }
}

/** Anos a que um código da BNCC se aplica. Ex.: EF15LP03 → 1º ao 5º ano; EI02EO04 → grupo 2. */
function alcanceDoCodigo(cod: string): NivelBncc[] {
  const m = cod.match(/^(EI|EF|EM)(\d)(\d)/);
  if (!m) return [];
  if (m[1] === "EM") return [{ etapa: "em" }];
  const a = parseInt(m[2], 10);
  const b = parseInt(m[3], 10);
  if (m[1] === "EI") return b >= 1 && b <= 3 ? [{ etapa: "ei", grupo: b as 1 | 2 | 3 }] : [];
  // EF01 = 1º ano; EF15 = 1º ao 5º; EF69 = 6º ao 9º.
  const [ini, fim] = a === 0 ? [b, b] : [a, b];
  const out: NivelBncc[] = [];
  for (let ano = ini; ano <= fim; ano++) out.push({ etapa: "ef", ano });
  return out;
}

/**
 * Uma sugestão pronta que cita códigos da BNCC só serve se algum código for do
 * ano do aluno. Frases sem código servem sempre; sem o ano do aluno, todas servem.
 */
export function fraseServeAoNivel(frase: string, nivel: NivelBncc | null | undefined): boolean {
  if (!nivel) return true;
  const cods = frase.match(/\bE[IFM]\d{2}[A-Z]{2,3}\d{2,3}\b/g);
  if (!cods) return true;
  const k = chaveNivel(nivel);
  return cods.some((c) => alcanceDoCodigo(c).some((n) => chaveNivel(n) === k));
}
