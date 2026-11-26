// Os 1000 cartões de leitura, do nível 1 (sílabas) ao 6 (textos para fluência).
// São montados sempre do mesmo jeito a partir dos bancos de sílabas, palavras,
// frases e textos: o cartão "L3-045" é o mesmo para todas as professoras.
import type { Cartao } from "./tipos";
import { palavrasDe } from "./analise";
import {
  ENCONTROS_VOCALICOS,
  FAMILIAS,
  PADROES,
  PALAVRAS_SIMPLES,
  VOGAIS,
} from "./cartoesPalavras";
import { FRASES } from "./cartoesFrases";
import { TEXTOS_CURTOS } from "./cartoesTextosCurtos";
import { TEXTOS_FLUENCIA } from "./cartoesTextosFluencia";

export const QTD_POR_NIVEL: Record<Cartao["nivel"], number> = {
  1: 150,
  2: 250,
  3: 250,
  4: 220,
  5: 90,
  6: 40,
};

/** Gerador de números "sorteados" que dá sempre a mesma sequência para a mesma semente. */
function sorteador(semente: number) {
  let a = semente >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function embaralhar<T>(lista: readonly T[], rnd: () => number): T[] {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const id = (nivel: number, n: number) => `L${nivel}-${String(n).padStart(3, "0")}`;

function listaE(nomes: string[]): string {
  if (nomes.length <= 1) return nomes.join("");
  return nomes.slice(0, -1).join(", ") + " e " + nomes[nomes.length - 1];
}

/** Evita a mesma sílaba duas vezes seguidas. */
function semRepetirVizinho(itens: string[]): string[] {
  const a = itens.slice();
  for (let i = 1; i < a.length; i++) {
    if (a[i] === a[i - 1]) {
      const k = a.findIndex((x, j) => j > i && x !== a[i] && x !== a[i - 1]);
      if (k > 0) [a[i], a[k]] = [a[k], a[i]];
    }
  }
  return a;
}

function nivel1(): Cartao[] {
  const out: Cartao[] = [];
  const vistos = new Set<string>();
  const add = (titulo: string, itens: string[], foco: string) => {
    const chave = itens.join(" ");
    if (vistos.has(chave) || out.length >= QTD_POR_NIVEL[1]) return false;
    vistos.add(chave);
    out.push({
      id: id(1, out.length + 1),
      nivel: 1,
      tipo: "silabas",
      titulo,
      itens,
      foco,
      total: itens.length,
    });
    return true;
  };
  const rnd = sorteador(101);
  add("Vogais", semRepetirVizinho([...VOGAIS, ...embaralhar(VOGAIS, rnd)]), "Vogais");
  add("Vogais juntas", ENCONTROS_VOCALICOS.slice(), "Encontros de vogais");
  for (const f of FAMILIAS) {
    const vezes = f.silabas.length === 3 ? 3 : 1;
    let itens = f.silabas.slice();
    for (let v = 0; v < vezes; v++) itens = itens.concat(embaralhar(f.silabas, rnd));
    while (itens.length < 12) itens = itens.concat(embaralhar(f.silabas, rnd));
    add(`Sílabas com ${f.letra}`, semRepetirVizinho(itens.slice(0, 12)), `Família do ${f.letra}`);
  }
  // Misturas: primeiro duas famílias, depois três, depois quatro ou mais.
  let tentativa = 0;
  while (out.length < QTD_POR_NIVEL[1] && tentativa < 5000) {
    tentativa++;
    const feitos = out.length - 18;
    const quantas = feitos < 44 ? 2 : feitos < 90 ? 3 : 4;
    const fams = embaralhar(FAMILIAS, rnd).slice(0, quantas);
    const base = fams.flatMap((f) => f.silabas);
    const itens = semRepetirVizinho(embaralhar(base, rnd).slice(0, 12));
    if (itens.length < 10) continue;
    const letras = fams.map((f) => f.letra).sort();
    add(`Sílabas com ${listaE(letras)}`, itens, `Famílias do ${listaE(letras)}`);
  }
  return out;
}

function emGrupos<T>(lista: T[], tam: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i + tam <= lista.length; i += tam) out.push(lista.slice(i, i + tam));
  return out;
}

function nivel2(): Cartao[] {
  const out: Cartao[] = [];
  const vistos = new Set<string>();
  const rnd = sorteador(202);
  let voltas = 0;
  while (out.length < QTD_POR_NIVEL[2] && voltas < 40) {
    voltas++;
    for (const g of emGrupos(embaralhar(PALAVRAS_SIMPLES, rnd), 8)) {
      const chave = g.slice().sort().join(" ");
      if (vistos.has(chave) || out.length >= QTD_POR_NIVEL[2]) continue;
      vistos.add(chave);
      out.push({
        id: id(2, out.length + 1),
        nivel: 2,
        tipo: "palavras",
        titulo: `Palavras simples ${out.length + 1}`,
        itens: g,
        foco: "Sílabas de consoante e vogal",
        total: g.length,
      });
    }
  }
  return out;
}

function nivel3(): Cartao[] {
  const out: Cartao[] = [];
  const vistos = new Set<string>();
  const rnd = sorteador(303);
  const add = (titulo: string, itens: string[], foco: string) => {
    const chave = itens.slice().sort().join(" ");
    if (vistos.has(chave) || out.length >= QTD_POR_NIVEL[3]) return;
    vistos.add(chave);
    out.push({
      id: id(3, out.length + 1),
      nivel: 3,
      tipo: "palavras",
      titulo,
      itens,
      foco,
      total: itens.length,
    });
  };
  // 12 cartões por padrão (LH, NH, CH...), em 4 voltas de 3 cartões.
  for (let volta = 0; volta < 4; volta++) {
    for (const p of PADROES) {
      const grupos = emGrupos(embaralhar(p.palavras, rnd), 8).slice(0, 3);
      grupos.forEach((g) => add(`Palavras com ${p.foco}`, g, p.foco));
    }
  }
  // O resto: palavras de vários padrões misturadas.
  const todas = [...new Set(PADROES.flatMap((p) => p.palavras))];
  let voltas = 0;
  while (out.length < QTD_POR_NIVEL[3] && voltas < 40) {
    voltas++;
    for (const g of emGrupos(embaralhar(todas, rnd), 8))
      add("Palavras difíceis misturadas", g, "Vários padrões");
  }
  return out;
}

function nivel4(): Cartao[] {
  const out: Cartao[] = [];
  const vistos = new Set<string>();
  const rnd = sorteador(404);
  let voltas = 0;
  while (out.length < QTD_POR_NIVEL[4] && voltas < 40) {
    voltas++;
    for (const g of emGrupos(embaralhar(FRASES, rnd), 3)) {
      const chave = g.slice().sort().join("|");
      if (vistos.has(chave) || out.length >= QTD_POR_NIVEL[4]) continue;
      vistos.add(chave);
      out.push({
        id: id(4, out.length + 1),
        nivel: 4,
        tipo: "frases",
        titulo: `Frases ${out.length + 1}`,
        itens: g,
        total: g.reduce((s, f) => s + palavrasDe(f).length, 0),
      });
    }
  }
  return out;
}

function deTextos(nivel: 5 | 6, textos: Array<{ titulo: string; texto: string }>): Cartao[] {
  return textos.slice(0, QTD_POR_NIVEL[nivel]).map((t, i) => ({
    id: id(nivel, i + 1),
    nivel,
    tipo: "texto" as const,
    titulo: t.titulo,
    itens: [],
    texto: t.texto,
    total: palavrasDe(t.texto).length,
  }));
}

let cache: Cartao[] | null = null;

/** Todos os cartões (1000), na ordem dos níveis. */
export function todosOsCartoes(): Cartao[] {
  if (!cache) {
    cache = [
      ...nivel1(),
      ...nivel2(),
      ...nivel3(),
      ...nivel4(),
      ...deTextos(5, TEXTOS_CURTOS),
      ...deTextos(6, TEXTOS_FLUENCIA),
    ];
  }
  return cache;
}

export function cartoesDoNivel(nivel: number): Cartao[] {
  return todosOsCartoes().filter((c) => c.nivel === nivel);
}

export function cartaoPorId(cid: string): Cartao | undefined {
  return todosOsCartoes().find((c) => c.id === cid);
}

/**
 * Um cartão do nível pedido que o aluno ainda não leu (se já leu todos,
 * volta ao começo). `usados` são os ids dos cartões das avaliações dele.
 */
export function proximoCartao(nivel: number, usados: string[]): Cartao {
  const lista = cartoesDoNivel(nivel);
  const livres = lista.filter((c) => !usados.includes(c.id));
  return (livres.length ? livres : lista)[0];
}
