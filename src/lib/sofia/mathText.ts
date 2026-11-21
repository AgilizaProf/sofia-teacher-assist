// Converte notação LaTeX que a IA às vezes devolve ("$\frac{1}{2}$",
// "\(3 \times 4\)", "$$x^2$$") em texto comum que a professora lê e imprime
// ("½", "3 × 4", "x²"). O app não renderiza LaTeX, então sem isso a fórmula
// aparece crua no chat, nos planos e nas atividades.
//
// Regras de segurança:
// - Só trata "$...$" como fórmula quando o miolo tem cara de LaTeX
//   (comando com "\", "^", "_" ou "{"). Assim "R$ 5,00 e R$ 3,00" fica intacto.
// - Não mexe em blocos de código nem em URLs.
//
// Há uma cópia idêntica para as edge functions em
// supabase/functions/_shared/math-text.ts (Deno não importa de src/).
// Mantenha as duas iguais.

const FRACOES: Record<string, string> = {
  "1/2": "½",
  "1/3": "⅓",
  "2/3": "⅔",
  "1/4": "¼",
  "3/4": "¾",
  "1/5": "⅕",
  "2/5": "⅖",
  "3/5": "⅗",
  "4/5": "⅘",
  "1/6": "⅙",
  "5/6": "⅚",
  "1/8": "⅛",
  "3/8": "⅜",
  "5/8": "⅝",
  "7/8": "⅞",
  "1/10": "⅒",
};

const SOBRESCRITO: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "(": "⁽",
  ")": "⁾",
  n: "ⁿ",
};

const SUBSCRITO: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
};

const SIMBOLOS: Array<[RegExp, string]> = [
  [/\\times\b/g, "×"],
  [/\\div\b/g, "÷"],
  [/\\cdot\b/g, "·"],
  [/\\pm\b/g, "±"],
  [/\\leq?\b/g, "≤"],
  [/\\geq?\b/g, "≥"],
  [/\\neq?\b/g, "≠"],
  [/\\approx\b/g, "≈"],
  [/\\infty\b/g, "∞"],
  [/\\pi\b/g, "π"],
  [/\\alpha\b/g, "α"],
  [/\\beta\b/g, "β"],
  [/\\theta\b/g, "θ"],
  [/\\Delta\b/g, "Δ"],
  [/\\degree\b/g, "°"],
  [/\\circ\b/g, "°"],
  [/\\rightarrow\b|\\to\b/g, "→"],
  [/\\leftarrow\b/g, "←"],
  [/\\Rightarrow\b/g, "⇒"],
  [/\\%/g, "%"],
  [/\\\$/g, "$"],
  [/\\&/g, "&"],
  [/\\#/g, "#"],
  [/\\_/g, "_"],
  [/\\ldots\b|\\dots\b|\\cdots\b/g, "…"],
];

/** Pega o conteúdo de um grupo {…} balanceado a partir de `i` (que aponta para "{"). */
function grupo(s: string, i: number): [string, number] | null {
  if (s[i] !== "{") return null;
  let nivel = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === "{") nivel++;
    else if (s[j] === "}") {
      nivel--;
      if (nivel === 0) return [s.slice(i + 1, j), j + 1];
    }
  }
  return null;
}

/** Argumento de comando: {grupo} ou um único caractere (ex.: \frac12). */
function argumento(s: string, i: number): [string, number] | null {
  while (s[i] === " ") i++;
  if (i >= s.length) return null;
  if (s[i] === "{") return grupo(s, i);
  return [s[i], i + 1];
}

function fracao(num: string, den: string): string {
  const n = num.trim();
  const d = den.trim();
  const uni = FRACOES[`${n}/${d}`];
  if (uni) return uni;
  const simples = (t: string) => /^[\w.,]+$/.test(t);
  const a = simples(n) ? n : `(${n})`;
  const b = simples(d) ? d : `(${d})`;
  return `${a}/${b}`;
}

function expoente(t: string, mapa: Record<string, string>, marca: string): string {
  const limpo = t.trim();
  if (limpo && [...limpo].every((c) => mapa[c])) return [...limpo].map((c) => mapa[c]).join("");
  return limpo.length === 1 ? `${marca}${limpo}` : `${marca}(${limpo})`;
}

/** Resolve \\frac, \\dfrac, \\tfrac (com grupos aninhados) e \\sqrt. */
function fracoesERaizes(entrada: string): string {
  let s = entrada;
  let mudou = true;
  let guarda = 0;
  while (mudou && guarda++ < 50) {
    mudou = false;
    const f = /\\[dt]?frac\b\s*/.exec(s);
    if (f) {
      const a = argumento(s, f.index + f[0].length);
      const b = a ? argumento(s, a[1]) : null;
      if (a && b) {
        s =
          s.slice(0, f.index) + fracao(latexParaTexto(a[0]), latexParaTexto(b[0])) + s.slice(b[1]);
        mudou = true;
        continue;
      }
    }
    const r = /\\sqrt\b\s*(?:\[([^\]]*)\])?\s*/.exec(s);
    if (r) {
      const a = argumento(s, r.index + r[0].length);
      if (a) {
        const raiz = r[1] === "3" ? "∛" : r[1] === "4" ? "∜" : r[1] ? `${r[1]}√` : "√";
        const dentro = latexParaTexto(a[0]).trim();
        const corpo = /^[\w.,]+$/.test(dentro) ? dentro : `(${dentro})`;
        s = s.slice(0, r.index) + raiz + corpo + s.slice(a[1]);
        mudou = true;
      }
    }
  }

  return s;
}

/** Converte o miolo de uma fórmula LaTeX em texto comum. */
export function latexParaTexto(src: string): string {
  let s = src;

  // \text{…}, \mathrm{…}, \textbf{…} etc.: fica só o texto
  s = s.replace(
    /\\(?:text|mathrm|mathbf|textbf|textit|mathit|operatorname|mbox)\s*\{([^{}]*)\}/g,
    "$1",
  );
  // \left( \right) \big etc.
  s = s.replace(/\\(?:left|right|big|Big|bigg|Bigg)\s*([()[\]|.]|\\\{|\\\})/g, (_m, d) =>
    d === "." ? "" : d.replace("\\", ""),
  );

  s = fracoesERaizes(s);

  // Grau: 25^\circ, 25^{\circ}
  s = s.replace(/\^\s*\{?\s*\\circ\s*\}?/g, "°");

  for (const [re, rep] of SIMBOLOS) s = s.replace(re, rep);

  // Expoentes e índices: x^2, x^{10}, a_1, a_{n}
  s = s.replace(/\^\s*(\{[^{}]*\}|[^\s{}])/g, (_m, g: string) =>
    expoente(g.startsWith("{") ? g.slice(1, -1) : g, SOBRESCRITO, "^"),
  );
  s = s.replace(/_\s*(\{[^{}]*\}|[^\s{}])/g, (_m, g: string) =>
    expoente(g.startsWith("{") ? g.slice(1, -1) : g, SUBSCRITO, "_"),
  );

  // Espaços do LaTeX e vírgula decimal escrita como {,}
  s = s.replace(/\{,\}/g, ",");
  s = s.replace(/\\[,;:! ]|\\quad\b|\\qquad\b|~/g, " ");
  // Comandos que sobraram (\displaystyle, \mathcal etc.): some o nome do comando
  s = s.replace(/\\[a-zA-Z]+\s*/g, "");
  // Chaves de agrupamento que sobraram
  s = s.replace(/[{}]/g, "");
  return s.replace(/[ \t]{2,}/g, " ").trim();
}

const PARECE_LATEX = /\\[a-zA-Z]|[\^_{}]/;

function converterTrecho(t: string): string {
  let s = t;
  // Blocos: $$…$$ e \[…\]
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_m, f: string) => latexParaTexto(f));
  s = s.replace(/\\\[([\s\S]+?)\\\]/g, (_m, f: string) => latexParaTexto(f));
  // Em linha: \(…\)
  s = s.replace(/\\\(([\s\S]+?)\\\)/g, (_m, f: string) => latexParaTexto(f));
  // Em linha: $…$ só quando o miolo tem cara de LaTeX (protege "R$ 5,00")
  s = s.replace(/(^|[^\\\w])\$(?!\s)([^$\n]{1,200}?)\$(?!\d)/g, (m, antes: string, f: string) =>
    PARECE_LATEX.test(f) ? antes + latexParaTexto(f) : m,
  );
  // Comandos soltos fora de delimitadores (ex.: "metade é \\frac{1}{2}")
  if (/\\(?:[dt]?frac|sqrt|times|div|cdot|leq?|geq?|neq?|approx|pi)\b/.test(s)) {
    s = fracoesERaizes(s);
    s = s.replace(/\\(times|div|cdot|leq?|geq?|neq?|approx|pi)\b/g, (m) => latexParaTexto(m));
  }
  return s;
}

/**
 * Troca fórmulas LaTeX por texto comum em toda a resposta, sem tocar em
 * blocos de código e URLs. Seguro para rodar mais de uma vez.
 */
export function semLatex(texto: string): string {
  if (!texto || !/[\\$]/.test(texto)) return texto;
  const partes = texto.split(/(```[\s\S]*?```|`[^`\n]*`|https?:\/\/\S+)/g);
  return partes.map((p, i) => (i % 2 === 1 ? p : converterTrecho(p))).join("");
}

/** Aplica semLatex em todas as strings de um objeto (respostas estruturadas da IA). */
export function semLatexProfundo<T>(valor: T): T {
  if (typeof valor === "string") return semLatex(valor) as unknown as T;
  if (Array.isArray(valor)) return valor.map((v) => semLatexProfundo(v)) as unknown as T;
  if (valor && typeof valor === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor as Record<string, unknown>))
      out[k] = semLatexProfundo(v);
    return out as T;
  }
  return valor;
}
