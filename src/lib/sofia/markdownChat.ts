// Preparação do Markdown que a Sofia escreve antes de ir para o <ReactMarkdown>.
//
// O app não tem remark-gfm nem remark-breaks. Sem eles:
//   - quebras de linha simples somem (o bloco de transparência, o passo a
//     passo 1️⃣ 2️⃣ ✅ e a pergunta do nível saem numa linha só);
//   - tabelas aparecem como "| a | b |";
//   - URLs soltas não viram link;
//   - "- [ ]" e "~~x~~" aparecem crus.
// `prepararMarkdownChat` resolve isso com Markdown comum (CommonMark), sem
// pacote novo. `textoParaCopiar` gera o texto limpo para o botão "Copiar".

const FENCE_RE = /^\s{0,3}(```|~~~)/;
const BLOCO_INICIO_RE =
  /^\s{0,3}(?:#{1,6}\s|>|[-*+•]\s|\d{1,3}[.)]\s|```|~~~|(?:[-*_]\s*){3,}$|\|)/;
const SEPARADOR_TABELA_RE = /^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function ehLinhaDeTabela(l: string): boolean {
  const t = l.trim();
  if (!t.includes("|")) return false;
  // Pelo menos duas células: "a | b" ou "| a | b |".
  return t.split("|").filter((c) => c.trim() !== "").length >= 2 || /^\|.*\|$/.test(t);
}

function celulas(l: string): string[] {
  let t = l.trim();
  if (t.startsWith("|")) t = t.slice(1);
  if (t.endsWith("|")) t = t.slice(0, -1);
  return t.split("|").map((c) => c.trim());
}

/** Tabela pipe → lista legível (a Constituição já pede para não usar tabela). */
function tabelaParaLista(linhas: string[]): string[] {
  const cab = celulas(linhas[0]);
  const corpo = linhas.slice(2).map(celulas);
  const out: string[] = [];
  for (const row of corpo) {
    const [primeira, ...resto] = row;
    const titulo = (primeira || "").trim();
    const extras = resto
      .map((c, i) => ({ h: (cab[i + 1] || "").trim(), c: c.trim() }))
      .filter((x) => x.c);
    if (!titulo && extras.length === 0) continue;
    if (extras.length === 0) {
      out.push(`- ${titulo}`);
    } else if (cab.length === 2 && extras.length === 1) {
      out.push(`- **${titulo || cab[0]}**: ${extras[0].c}`);
    } else {
      out.push(`- **${titulo || cab[0] || "Item"}**`);
      for (const x of extras) out.push(x.h ? `  - ${x.h}: ${x.c}` : `  - ${x.c}`);
    }
  }
  return out;
}

/** Transforma URLs soltas em autolinks CommonMark, fora de código e de links já prontos. */
function linkarUrls(linha: string): string {
  // Separa trechos de código inline para não mexer neles.
  const partes = linha.split(/(`[^`]*`)/);
  return partes
    .map((p) => {
      if (p.startsWith("`")) return p;
      return p.replace(
        /(\]\(\s*|<|\]:\s*|href=["']?)?\b((?:https?:\/\/|www\.)[^\s<>()\]]*(?:\([^\s<>()]*\)[^\s<>()\]]*)*)/gi,
        (m, antes: string | undefined, url: string) => {
          if (antes) return m; // já é link Markdown, autolink ou referência
          // Pontuação final não faz parte do link.
          let fim = "";
          let u = url;
          while (/[.,;:!?'"*_]$/.test(u)) {
            fim = u.slice(-1) + fim;
            u = u.slice(0, -1);
          }
          if (u.length < 8) return m;
          const href = /^www\./i.test(u) ? `https://${u}` : u;
          return /^www\./i.test(u) ? `[${u}](${href})${fim}` : `<${href}>${fim}`;
        },
      );
    })
    .join("");
}

/** Ajustes de GFM comuns que o CommonMark não entende. */
function gfmBasico(linha: string): string {
  return linha
    .replace(/^(\s*(?:[-*+]|\d{1,3}[.)])\s+)\[ \]\s+/, "$1☐ ")
    .replace(/^(\s*(?:[-*+]|\d{1,3}[.)])\s+)\[[xX]\]\s+/, "$1☑ ")
    .replace(/~~(?=\S)([^~\n]*?\S)~~/g, "$1");
}

/**
 * Deixa o Markdown da Sofia pronto para o ReactMarkdown sem plugins:
 *  (a) preserva quebras de linha simples (vira "  \n", quebra forçada);
 *  (b) URLs soltas viram links;
 *  (c) tabelas pipe viram listas legíveis;
 *  (d) "- [ ]" vira ☐ e "~~x~~" perde os til.
 * Blocos de código ficam intactos.
 */
export function prepararMarkdownChat(md: string): string {
  if (!md) return "";
  const linhas = md.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let emCodigo = false;
  let cerca = "";

  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    const f = l.match(FENCE_RE);
    if (f) {
      if (!emCodigo) {
        emCodigo = true;
        cerca = f[1];
      } else if (f[1] === cerca) {
        emCodigo = false;
      }
      out.push(l);
      continue;
    }
    if (emCodigo) {
      out.push(l);
      continue;
    }
    // Tabela: linha com pipes seguida da linha separadora |---|---|.
    if (ehLinhaDeTabela(l) && i + 1 < linhas.length && SEPARADOR_TABELA_RE.test(linhas[i + 1])) {
      const bloco = [l, linhas[i + 1]];
      let j = i + 2;
      while (j < linhas.length && linhas[j].trim() !== "" && ehLinhaDeTabela(linhas[j])) {
        bloco.push(linhas[j]);
        j++;
      }
      if (out.length && out[out.length - 1].trim() !== "") out.push("");
      out.push(...tabelaParaLista(bloco));
      if (j < linhas.length && linhas[j].trim() !== "") out.push("");
      i = j - 1;
      continue;
    }
    out.push(linkarUrls(gfmBasico(l)));
  }

  // Quebra simples → quebra forçada, só quando a próxima linha continua o
  // mesmo parágrafo (se ela já abre lista, título etc., o Markdown já quebra).
  emCodigo = false;
  cerca = "";
  for (let i = 0; i < out.length; i++) {
    const l = out[i];
    const f = l.match(FENCE_RE);
    if (f) {
      if (!emCodigo) {
        emCodigo = true;
        cerca = f[1];
      } else if (f[1] === cerca) {
        emCodigo = false;
      }
      continue;
    }
    if (emCodigo) continue;
    const prox = out[i + 1];
    if (prox === undefined) continue;
    if (l.trim() === "" || prox.trim() === "") continue;
    if (/^\s{0,3}#{1,6}\s/.test(l)) continue; // título termina sozinho
    if (/^\s{0,3}(?:[-*_]\s*){3,}$/.test(l)) continue; // linha horizontal
    if (/(?:\s{2}|\\)$/.test(l)) continue; // já tem quebra forçada
    if (BLOCO_INICIO_RE.test(prox) && !/^\s{4,}/.test(prox)) continue;
    // Linha "---"/"===" logo abaixo viraria título (setext): não interfere.
    if (/^\s{0,3}(?:=+|-+)\s*$/.test(prox)) continue;
    out[i] = l.replace(/\s+$/, "") + "  ";
  }
  return out.join("\n");
}

/**
 * Texto limpo para colar no Word, no Google Docs ou no WhatsApp:
 * sem **, ##, crases nem marcação de link; listas viram "• ".
 */
export function textoParaCopiar(md: string): string {
  if (!md) return "";
  const linhas = prepararMarkdownChat(md).split("\n");
  const out: string[] = [];
  let emCodigo = false;
  for (const raw of linhas) {
    let l = raw.replace(/\s+$/, "");
    if (FENCE_RE.test(l)) {
      emCodigo = !emCodigo;
      continue;
    }
    if (emCodigo) {
      out.push(l);
      continue;
    }
    if (/^\s{0,3}(?:[-*_]\s*){3,}$/.test(l)) {
      out.push("");
      continue;
    }
    l = l
      .replace(/^\s{0,3}#{1,6}\s+/, "")
      .replace(/\s+#+\s*$/, "")
      .replace(/^\s{0,3}>\s?/, "");
    // Listas: marcador "- " / "* " / "+ " vira "• " (com recuo dos subitens).
    const lista = l.match(/^(\s*)[-*+•]\s+(.*)$/);
    if (lista) {
      const nivel = Math.floor(lista[1].length / 2);
      l = `${"  ".repeat(nivel)}• ${lista[2]}`;
    }
    l = l
      // Links: [texto](url) → "texto (url)"; se o texto já é a url, só a url.
      .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_m, t: string, u: string) =>
        t === u || u === `https://${t}` ? t : u.startsWith("/") ? t : `${t} (${u})`,
      )
      .replace(/<((?:https?:\/\/|mailto:)[^>\s]+)>/g, "$1")
      .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/__(.+?)__/g, "$1")
      .replace(/(^|[\s(“"'])\*(?!\s)([^*\n]+?)\*(?=[\s.,;:!?)”"']|$)/g, "$1$2")
      .replace(/(^|[\s(“"'])_(?!\s)([^_\n]+?)_(?=[\s.,;:!?)”"']|$)/g, "$1$2")
      .replace(/`([^`\n]+)`/g, "$1")
      .replace(/\\([\\`*_{}[\]()#+\-.!|>~])/g, "$1");
    out.push(l);
  }
  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Link interno do app ("/planejamento", "/inclusao/pei?x=1"), não "//site". */
export function ehLinkInterno(href: string | undefined | null): href is string {
  return !!href && href.startsWith("/") && !href.startsWith("//");
}
