// Preenchimento do modelo de PEI da rede de ensino (arquivo Word .docx).
//
// A professora anexa o modelo que a rede dela usa. Aqui o modelo é lido, os
// espaços em branco viram "lacunas" (com o rótulo que está ao lado), e depois
// cada lacuna recebe o texto do PEI do aluno. O resto do documento (logo,
// tabelas, fontes, cabeçalho) fica como está.
//
// Lacunas reconhecidas:
//   celula             célula de tabela vazia (rótulo: célula à esquerda e/ou cabeçalho da coluna)
//   apos_rotulo        "Nome: ________" ou "Nome:" no fim da linha
//   linha              linha só de "______" (rótulo: o parágrafo anterior)
//   paragrafo_seguinte "Objetivos:" seguido de parágrafo vazio
//   opcoes             "( ) Sim ( ) Não", "[ ] Visual", "☐ Auditivo" → marca com X
//   controle           controle de conteúdo do Word ("Clique aqui para inserir o texto")
//
// Usa DOMParser/XMLSerializer (navegador).

import JSZip from "jszip";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const XML_NS = "http://www.w3.org/XML/1998/namespace";
const MAX_LACUNAS = 300;
// Marcas (caracteres de uso privado) que indicam, no documento mostrado na
// tela, onde fica cada espaço: MARCA_INI + id + MARCA_FIM.
const MARCA_INI = "\uE000";
const MARCA_FIM = "\uE001";

export type TipoLacuna =
  | "celula"
  | "apos_rotulo"
  | "linha"
  | "paragrafo_seguinte"
  | "opcoes"
  | "controle";

export type Lacuna = {
  id: string;
  tipo: TipoLacuna;
  rotulo: string;
  secao: string;
  opcoes?: string[];
};

type Alvo = Lacuna & { aplicar: (valor: string) => void };

export class ErroModelo extends Error {}

// ---------------------------------------------------------------- utilidades

// "____", "......", "……" e datas "___/___/____"
const BRANCO = /(?:_{2,}\s*\/\s*){1,2}_{2,}|_{3,}|\.{5,}|…{2,}/g;
const MARCADOR = /\(\s{0,3}\)|\[\s{0,3}\]|[☐□❏]/g;

function filhos(el: Element, nome?: string): Element[] {
  const r: Element[] = [];
  for (let n = el.firstElementChild; n; n = n.nextElementSibling) {
    if (n.namespaceURI === W && (!nome || n.localName === nome)) r.push(n);
  }
  return r;
}
function filho(el: Element | null | undefined, nome: string): Element | null {
  if (!el) return null;
  return filhos(el, nome)[0] || null;
}
function descendentes(el: Element, nome: string): Element[] {
  return Array.from(el.getElementsByTagNameNS(W, nome));
}
function attr(el: Element | null, nome: string): string | null {
  if (!el) return null;
  return el.getAttributeNS(W, nome) ?? el.getAttribute(`w:${nome}`);
}

function textoDe(el: Element): string {
  let s = "";
  const walk = (n: Element) => {
    for (let c = n.firstElementChild; c; c = c.nextElementSibling) {
      if (c.namespaceURI === W) {
        if (c.localName === "t") s += c.textContent || "";
        else if (c.localName === "tab") s += " ";
        else if (c.localName === "br" || c.localName === "cr") s += "\n";
        else if (c.localName === "delText" || c.localName === "instrText") continue;
        else walk(c);
      } else walk(c);
    }
  };
  walk(el);
  return s;
}

/** Sem letras nem números: vazio, espaços, "____", "......". */
function semConteudo(t: string): boolean {
  return !/[\p{L}\p{N}]/u.test(t);
}

/** Tem imagem ou objeto (logo da rede, por exemplo): não é espaço para escrever. */
function temObjeto(el: Element): boolean {
  for (const nome of ["drawing", "pict", "object"])
    if (el.getElementsByTagNameNS(W, nome).length) return true;
  return false;
}

function limpaRotulo(t: string): string {
  return t
    .replace(/\s+/g, " ")
    .replace(/[\s:–—-]+$/u, "")
    .replace(/^[\s:–—-]+/u, "")
    .trim()
    .slice(0, 200);
}

function ehTituloDeSecao(p: Element, texto: string): boolean {
  const t = texto.trim();
  if (!t || t.length > 110) return false;
  const estilo = attr(filho(filho(p, "pPr"), "pStyle"), "val") || "";
  if (/heading|t[ií]tulo|ttulo|title/i.test(estilo)) return true;
  if (/^(\d+(\.\d+)*[.)]?|[IVX]+[.)-])\s+\S/.test(t)) return true;
  const letras = t.replace(/[^\p{L}]/gu, "");
  if (letras.length >= 4 && letras === letras.toUpperCase()) return true;
  const runs = descendentes(p, "r").filter((r) => (textoDe(r) || "").trim());
  return (
    runs.length > 0 &&
    runs.every((r) => {
      const b = filho(filho(r, "rPr"), "b");
      return !!b && attr(b, "val") !== "0" && attr(b, "val") !== "false";
    })
  );
}

function novoEl(doc: Document, nome: string): Element {
  return doc.createElementNS(W, `w:${nome}`);
}

function novoT(doc: Document, texto: string): Element {
  const t = novoEl(doc, "t");
  t.setAttributeNS(XML_NS, "xml:space", "preserve");
  t.textContent = texto;
  return t;
}

/** Run com o texto (linhas separadas por quebra de linha), copiando a formatação de `modeloRPr`. */
function novoRun(doc: Document, valor: string, modeloRPr: Element | null): Element {
  const r = novoEl(doc, "r");
  if (modeloRPr) {
    const rPr = modeloRPr.cloneNode(true) as Element;
    // Tira o estilo cinza de "texto de espaço reservado" e o sublinhado das linhas.
    for (const k of filhos(rPr, "rStyle"))
      if (/placeholder/i.test(attr(k, "val") || "")) rPr.removeChild(k);
    for (const k of filhos(rPr, "u")) rPr.removeChild(k);
    for (const k of filhos(rPr, "color"))
      if ((attr(k, "val") || "").toUpperCase() === "808080") rPr.removeChild(k);
    if (rPr.localName === "rPr") r.appendChild(rPr);
  }
  valor.split("\n").forEach((linha, i) => {
    if (i > 0) r.appendChild(novoEl(doc, "br"));
    r.appendChild(novoT(doc, linha));
  });
  return r;
}

function rPrModelo(p: Element): Element | null {
  for (const r of descendentes(p, "r")) {
    const rPr = filho(r, "rPr");
    if (rPr) return rPr;
  }
  const pr = filho(filho(p, "pPr"), "rPr");
  if (pr) {
    // O rPr do parágrafo vale para a marca de parágrafo; serve de modelo do texto.
    const doc = p.ownerDocument;
    const c = doc.createElementNS(W, "w:rPr");
    for (const k of Array.from(pr.childNodes)) c.appendChild(k.cloneNode(true));
    return c;
  }
  return null;
}

/** Escreve `valor` num parágrafo sem conteúdo (apaga os "____" que houver). */
function escreverNoParagrafo(p: Element, valor: string) {
  const doc = p.ownerDocument;
  const modelo = rPrModelo(p);
  for (const n of Array.from(p.childNodes)) {
    const el = n as Element;
    if (n.nodeType === 1 && el.localName !== "pPr" && !temObjeto(el)) p.removeChild(n);
  }
  p.appendChild(novoRun(doc, valor, modelo));
}

type Trecho = { t: Element; ini: number; fim: number };

function mapaDeTexto(p: Element): { texto: string; trechos: Trecho[] } {
  const trechos: Trecho[] = [];
  let texto = "";
  for (const t of descendentes(p, "t")) {
    // ignora texto dentro de controles de conteúdo (tratados à parte)
    if (dentroDe(t, "sdt", p)) continue;
    const s = t.textContent || "";
    trechos.push({ t, ini: texto.length, fim: texto.length + s.length });
    texto += s;
  }
  return { texto, trechos };
}

function dentroDe(el: Element, nome: string, ate: Element): boolean {
  for (let n = el.parentElement; n && n !== ate; n = n.parentElement) {
    if (n.namespaceURI === W && n.localName === nome) return true;
  }
  return false;
}

/** Troca o intervalo [ini, fim) do texto do parágrafo por `valor`. */
function substituir(trechos: Trecho[], ini: number, fim: number, valor: string) {
  let colocado = false;
  for (const tr of trechos) {
    if (tr.fim <= ini || tr.ini >= fim) continue;
    const s = tr.t.textContent || "";
    const a = Math.max(0, ini - tr.ini);
    const b = Math.min(s.length, fim - tr.ini);
    const antes = s.slice(0, a);
    const depois = s.slice(b);
    tr.t.setAttributeNS(XML_NS, "xml:space", "preserve");
    if (colocado) {
      tr.t.textContent = antes + depois;
      continue;
    }
    colocado = true;
    const linhas = valor.split("\n");
    tr.t.textContent = antes + linhas[0];
    const doc = tr.t.ownerDocument;
    let ref: Element = tr.t;
    const run = tr.t.parentElement!;
    const inserir = (el: Element) => {
      run.insertBefore(el, ref.nextSibling);
      ref = el;
    };
    // Remove o sublinhado do run (as linhas "____" costumam vir sublinhadas).
    for (const u of filhos(filho(run, "rPr") || novoEl(doc, "rPr"), "u"))
      u.parentElement?.removeChild(u);
    for (const linha of linhas.slice(1)) {
      inserir(novoEl(doc, "br"));
      inserir(novoT(doc, linha));
    }
    if (depois) inserir(novoT(doc, depois));
  }
}

function ehPlaceholder(sdt: Element): boolean {
  const pr = filho(sdt, "sdtPr");
  if (!pr) return false;
  // Sumário, imagem, caixa de seleção, listas: não são campos de texto.
  for (const k of filhos(pr)) {
    if (
      [
        "docPartObj",
        "picture",
        "dropDownList",
        "comboBox",
        "group",
        "citation",
        "bibliography",
        "equation",
      ].includes(k.localName)
    )
      return false;
  }
  if (Array.from(pr.children).some((k) => k.localName === "checkbox")) return false;
  if (filho(pr, "showingPlcHdr")) return true;
  const conteudo = filho(sdt, "sdtContent");
  return !!conteudo && semConteudo(textoDe(conteudo));
}

function rotuloDoControle(sdt: Element): string {
  const pr = filho(sdt, "sdtPr");
  return limpaRotulo(attr(filho(pr, "alias"), "val") || attr(filho(pr, "tag"), "val") || "");
}

function escreverNoControle(sdt: Element, valor: string) {
  const pr = filho(sdt, "sdtPr");
  const ph = filho(pr, "showingPlcHdr");
  if (ph) pr!.removeChild(ph);
  const conteudo = filho(sdt, "sdtContent");
  if (!conteudo) return;
  const doc = sdt.ownerDocument;
  const ps = filhos(conteudo, "p");
  if (ps.length) {
    escreverNoParagrafo(ps[0], valor);
    return;
  }
  const tcs = filhos(conteudo, "tc");
  if (tcs.length) {
    const p = filho(tcs[0], "p");
    if (p) escreverNoParagrafo(p, valor);
    return;
  }
  // controle dentro da linha: só runs
  let modelo: Element | null = null;
  for (const r of filhos(conteudo, "r")) {
    modelo = modelo || filho(r, "rPr");
    conteudo.removeChild(r);
  }
  conteudo.appendChild(novoRun(doc, valor, modelo));
}

// ---------------------------------------------------------------- detecção

type Ctx = {
  secao: string;
  rotuloFora: string;
  naCelula: boolean;
  celulaSozinha: boolean;
  /** Célula "Nome:" sem célula vazia ao lado nem embaixo: escreve-se nela mesma. */
  rotuloSolto?: boolean;
};

function detectar(doc: Document): Alvo[] {
  const alvos: Alvo[] = [];
  const body = doc.getElementsByTagNameNS(W, "body")[0];
  if (!body) throw new ErroModelo("O arquivo não parece um documento do Word.");
  let secao = "";
  let anterior = ""; // texto do último parágrafo com conteúdo
  let ultimaLinha: { alvo: Alvo; p: Element; extras: Element[] } | null = null;

  const add = (a: Omit<Alvo, "id">) => {
    if (alvos.length >= MAX_LACUNAS) return null;
    const alvo = { ...a, id: `L${alvos.length + 1}` } as Alvo;
    alvos.push(alvo);
    return alvo;
  };

  const paragrafo = (p: Element, ctx: Ctx) => {
    // Controles de conteúdo dentro da linha
    const ctrls = descendentes(p, "sdt").filter(ehPlaceholder);
    if (ctrls.length) {
      for (const sdt of ctrls) {
        const antes = limpaRotulo(textoAntesDe(p, sdt));
        add({
          tipo: "controle",
          rotulo: rotuloDoControle(sdt) || antes || ctx.rotuloFora || anterior || secao,
          secao,
          aplicar: (v) => escreverNoControle(sdt, v),
        });
      }
      ultimaLinha = null;
      const tx = textoDe(p).trim();
      if (tx) anterior = limpaRotulo(tx);
      return;
    }

    const { texto, trechos } = mapaDeTexto(p);
    const limpo = texto.trim();

    // Parágrafo vazio: pode ser o espaço de resposta de um "Rótulo:" anterior (tratado abaixo).
    if (!limpo) return;

    // 1) Opções para marcar: ( ) Sim ( ) Não
    const marcas = [...texto.matchAll(MARCADOR)];
    if (marcas.length) {
      const opcoes = marcas.map((m, i) => {
        const de = m.index! + m[0].length;
        const ate = i + 1 < marcas.length ? marcas[i + 1].index! : texto.length;
        return (
          limpaRotulo(texto.slice(de, ate).replace(BRANCO, " "))
            .replace(/[;,/]$/, "")
            .trim() || `opção ${i + 1}`
        );
      });
      const rotulo =
        limpaRotulo(texto.slice(0, marcas[0].index!)) || ctx.rotuloFora || anterior || secao;
      const pos = marcas.map((m) => ({ ini: m.index!, fim: m.index! + m[0].length, m: m[0] }));
      add({
        tipo: "opcoes",
        rotulo,
        secao,
        opcoes,
        aplicar: (v) => {
          const escolhidas = new Set(
            String(v)
              .split(/[^0-9]+/)
              .filter(Boolean)
              .map((n) => parseInt(n, 10) - 1),
          );
          const visual = String(v).startsWith(MARCA_INI);
          // de trás para frente para não deslocar as posições
          [...pos].reverse().forEach((x, iRev) => {
            const i = pos.length - 1 - iRev;
            if (visual) {
              // Para mostrar na tela: cada caixinha vira uma marca "id#n".
              substituir(trechos, x.ini, x.fim, `${String(v).slice(0, -1)}#${i + 1}${MARCA_FIM}`);
              return;
            }
            if (!escolhidas.has(i)) return;
            const marcado = x.m.startsWith("(") ? "(X)" : x.m.startsWith("[") ? "[X]" : "☒";
            substituir(trechos, x.ini, x.fim, marcado);
          });
        },
      });
      ultimaLinha = null;
      anterior = limpaRotulo(limpo);
      return;
    }

    // 2) Linhas e espaços de "______"
    const brancos = [...texto.matchAll(BRANCO)];
    if (brancos.length) {
      const soLinha = semConteudo(texto);
      if (soLinha && ultimaLinha && ultimaLinha.p.nextElementSibling === p) {
        // continuação da linha anterior: só limpa os traços
        ultimaLinha.extras.push(p);
        ultimaLinha.p = p;
        return;
      }
      let de = 0;
      brancos.forEach((m, i) => {
        const ini = m.index!;
        const fim = ini + m[0].length;
        const rotBruto = limpaRotulo(texto.slice(de, ini).replace(BRANCO, " "));
        const rot = /\p{L}/u.test(rotBruto) ? rotBruto : "";
        de = fim;
        const rotulo = rot || (i === 0 ? ctx.rotuloFora || anterior || secao : "");
        if (!rotulo) return;
        if (soLinha) {
          const extras: Element[] = [];
          const alvo = add({
            tipo: "linha",
            rotulo,
            secao,
            aplicar: (v) => {
              escreverNoParagrafo(p, v);
              for (const e of extras) escreverNoParagrafo(e, "");
            },
          });
          if (alvo) ultimaLinha = { alvo, p, extras };
        } else {
          add({
            tipo: "apos_rotulo",
            rotulo,
            secao,
            aplicar: (v) => substituir(trechos, ini, fim, v ? ` ${v} ` : ""),
          });
        }
      });
      if (!soLinha) {
        ultimaLinha = null;
        anterior = limpaRotulo(limpo);
      }
      return;
    }
    ultimaLinha = null;

    // 3) "Rótulo:" sem nada depois
    const m = limpo.match(/^([\s\S]{2,140}?)\s*[:?]$/);
    if (
      m &&
      (!ctx.naCelula || ctx.celulaSozinha || (ctx.rotuloSolto && limpo.endsWith(":"))) &&
      !temObjeto(p)
    ) {
      let prox = p.nextElementSibling;
      while (
        prox &&
        prox.namespaceURI === W &&
        ["bookmarkStart", "bookmarkEnd", "proofErr"].includes(prox.localName)
      )
        prox = prox.nextElementSibling;
      const proxEhTabela = !!prox && prox.localName === "tbl";
      // A próxima linha já é o espaço ("____" ou "( ) Sim"): ela vira a lacuna, com este rótulo.
      const proxTx = prox && prox.localName === "p" ? textoDe(prox) : "";
      const proxEhEspaco = proxTx.search(BRANCO) >= 0 || proxTx.search(MARCADOR) >= 0;
      if (!proxEhTabela && !proxEhEspaco) {
        const rotulo = limpaRotulo(m[1]);
        if (
          prox &&
          prox.localName === "p" &&
          semConteudo(textoDe(prox)) &&
          !temObjeto(prox) &&
          !descendentes(prox, "sdt").length
        ) {
          const alvoP = prox;
          add({
            tipo: "paragrafo_seguinte",
            rotulo,
            secao,
            aplicar: (v) => escreverNoParagrafo(alvoP, v),
          });
        } else {
          add({
            tipo: "apos_rotulo",
            rotulo,
            secao,
            aplicar: (v) => {
              if (v) p.appendChild(novoRun(p.ownerDocument, ` ${v}`, rPrModelo(p)));
            },
          });
        }
        anterior = limpaRotulo(limpo);
        return;
      }
    }

    if ((!ctx.naCelula || ctx.celulaSozinha) && ehTituloDeSecao(p, limpo))
      secao = limpaRotulo(limpo);
    anterior = limpaRotulo(limpo);
  };

  const tabela = (tbl: Element, ctxPai: Ctx) => {
    const linhas = linhasDaTabela(tbl);
    // Cabeçalho: primeira linha com todas as células preenchidas e sem "Rótulo:"
    const primeira = linhas[0] || [];
    const cab =
      primeira.length > 1 && primeira.every((c) => c.texto.trim() && !/:\s*$/.test(c.texto.trim()))
        ? primeira
        : null;
    linhas.forEach((cels, li) => {
      cels.forEach((c, ci) => {
        if (c.continua) return;
        const vazio =
          semConteudo(c.texto) &&
          !temObjeto(c.tc) &&
          !descendentes(c.tc, "tbl").length &&
          !descendentes(c.tc, "sdt").some(ehPlaceholder);
        if (!vazio) {
          // "Nome:" numa célula que não tem onde responder ao lado nem embaixo.
          const direita = cels[ci + 1];
          const abaixo = linhas[li + 1]?.find((x) => x.col <= c.col && c.col < x.col + x.span);
          const rotuloSolto =
            cels.length > 1 && !ehEspaco(direita) && !ehEspaco(abaixo) && !temObjeto(c.tc);
          const esquerda = cels
            .slice(0, ci)
            .reverse()
            .find((x) => !semConteudo(x.texto));
          const ctx: Ctx = {
            secao,
            rotuloFora: limpaRotulo(esquerda?.texto || ""),
            naCelula: true,
            celulaSozinha: cels.length === 1,
            rotuloSolto,
          };
          bloco(c.tc, ctx);
          return;
        }
        if (cab && li === 0) return;
        const esquerda = cels
          .slice(0, ci)
          .reverse()
          .find((x) => !semConteudo(x.texto));
        const doCab = cab ? cab.find((x) => x.col <= c.col && c.col < x.col + x.span) : undefined;
        const rotEsq = limpaRotulo(esquerda?.texto || "");
        const rotCab = limpaRotulo(doCab?.texto || "");
        let rotulo = "";
        if (rotCab && rotEsq && rotCab !== rotEsq) rotulo = `${rotCab} — ${rotEsq}`;
        else if (rotCab && !rotEsq) rotulo = `${rotCab} — linha ${li}`;
        else rotulo = rotEsq || rotCab;
        if (!rotulo) {
          // célula sozinha embaixo de um título (caixa de resposta)
          // Sobe pela coluna até achar o título ("Objetivos:" com várias linhas vazias embaixo).
          let acima = "";
          let dist = 0;
          for (let k = li - 1; k >= 0 && !acima; k--) {
            const x = linhas[k].find((y) => y.col <= c.col && c.col < y.col + y.span);
            if (!x) break;
            if (x.continua) continue;
            dist = li - k;
            if (!semConteudo(x.texto)) acima = limpaRotulo(x.texto);
          }
          rotulo =
            (acima && dist > 1 ? `${acima} — linha ${dist}` : acima) ||
            (cels.length === 1 ? ctxPai.rotuloFora || anterior : "");
        }
        if (!rotulo) return;
        const tc = c.tc;
        add({
          tipo: "celula",
          rotulo,
          secao,
          aplicar: (v) => {
            let ps = filhos(tc, "p");
            if (!ps.length) {
              tc.appendChild(novoEl(tc.ownerDocument, "p"));
              ps = filhos(tc, "p");
            }
            escreverNoParagrafo(ps[0], v);
            for (const outro of ps.slice(1))
              if (semConteudo(textoDe(outro)) && textoDe(outro)) escreverNoParagrafo(outro, "");
          },
        });
      });
    });
  };

  const bloco = (container: Element, ctx: Ctx) => {
    for (const el of filhos(container)) {
      if (el.localName === "p") paragrafo(el, ctx);
      else if (el.localName === "tbl") {
        ultimaLinha = null;
        tabela(el, ctx);
      } else if (el.localName === "sdt") {
        if (ehPlaceholder(el) && filhos(filho(el, "sdtContent") || el, "p").length) {
          const sdt = el;
          add({
            tipo: "controle",
            rotulo: rotuloDoControle(sdt) || ctx.rotuloFora || anterior || secao,
            secao,
            aplicar: (v) => escreverNoControle(sdt, v),
          });
        } else {
          const c = filho(el, "sdtContent");
          if (c) bloco(c, ctx);
        }
      }
    }
  };

  bloco(body, { secao: "", rotuloFora: "", naCelula: false, celulaSozinha: false });
  return alvos;
}

function textoAntesDe(p: Element, alvo: Element): string {
  let s = "";
  let achou = false;
  const walk = (n: Element) => {
    for (let c = n.firstElementChild; c && !achou; c = c.nextElementSibling) {
      if (c === alvo) {
        achou = true;
        return;
      }
      if (c.namespaceURI === W && c.localName === "t") s += c.textContent || "";
      else walk(c);
    }
  };
  walk(p);
  return s;
}

type Cel = { tc: Element; texto: string; col: number; span: number; continua: boolean };

/** A célula serve de resposta: vazia, com "____", com "( )" ou com controle do Word. */
function ehEspaco(c: Cel | undefined): boolean {
  if (!c || c.continua || temObjeto(c.tc)) return false;
  return (
    semConteudo(c.texto) ||
    c.texto.search(BRANCO) >= 0 ||
    c.texto.search(MARCADOR) >= 0 ||
    descendentes(c.tc, "sdt").some(ehPlaceholder)
  );
}

function linhasDaTabela(tbl: Element): Cel[][] {
  const linhas: Cel[][] = [];
  for (const tr of filhos(tbl, "tr")) {
    const cels: Cel[] = [];
    let col = 0;
    const tcs: Element[] = [];
    for (const k of filhos(tr)) {
      if (k.localName === "tc") tcs.push(k);
      else if (k.localName === "sdt") tcs.push(...filhos(filho(k, "sdtContent") || k, "tc"));
    }
    for (const tc of tcs) {
      const tcPr = filho(tc, "tcPr");
      const span = parseInt(attr(filho(tcPr, "gridSpan"), "val") || "1", 10) || 1;
      const vm = filho(tcPr, "vMerge");
      const continua = !!vm && (attr(vm, "val") || "continue") === "continue";
      cels.push({ tc, texto: textoDe(tc), col, span, continua });
      col += span;
    }
    linhas.push(cels);
  }
  return linhas;
}

// ---------------------------------------------------------------- API

async function abrir(buf: ArrayBuffer) {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buf);
  } catch {
    throw new ErroModelo(
      "Não consegui abrir o arquivo. Ele precisa ser um documento do Word (.docx).",
    );
  }
  const f = zip.file("word/document.xml");
  if (!f)
    throw new ErroModelo(
      "Não consegui abrir o arquivo. Ele precisa ser um documento do Word (.docx).",
    );
  const xml = await f.async("string");
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length)
    throw new ErroModelo("O arquivo do Word está danificado.");
  return { zip, doc };
}

/** Lê o modelo e devolve os espaços a preencher, na ordem do documento. */
export async function analisarModelo(buf: ArrayBuffer): Promise<Lacuna[]> {
  const { doc } = await abrir(buf);
  return detectar(doc).map(({ aplicar: _a, ...l }) => l);
}

/** Preenche o modelo com `valores` (id da lacuna → texto) e devolve o novo .docx. */
export async function preencherModelo(
  buf: ArrayBuffer,
  valores: Record<string, string>,
): Promise<Blob> {
  const { zip, doc } = await abrir(buf);
  const alvos = detectar(doc);
  // Aplica de trás para frente: mudanças num parágrafo não mexem nas lacunas anteriores.
  for (const a of [...alvos].reverse()) {
    const v = valores[a.id];
    if (v == null || String(v).trim() === "") continue;
    a.aplicar(String(v).trim());
  }
  const xml = new XMLSerializer().serializeToString(doc);
  zip.file("word/document.xml", xml);
  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    compression: "DEFLATE",
  });
}

// ---------------------------------------------------------------- dados fixos

export type DadosIdentificacao = {
  nome?: string;
  dataNascimento?: string;
  escola?: string;
  serie?: string;
  cid?: string;
  diagnostico?: string;
  responsavel?: string;
  contato?: string;
  professor?: string;
  dataHoje?: string;
};

function sem(t: string) {
  return t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function dataBR(v?: string): string {
  if (!v) return "";
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
}

/**
 * Dados de identificação que não precisam da IA (nome, nascimento, escola...).
 * Só para lacunas curtas cujo rótulo é claramente esse dado.
 */
export function valoresDeIdentificacao(
  lacunas: Lacuna[],
  d: DadosIdentificacao,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of lacunas) {
    if (l.tipo === "opcoes") continue;
    // Para célula com cabeçalho ("Meta — Cognitiva") não é identificação.
    if (l.rotulo.includes(" — ")) continue;
    const r = sem(l.rotulo)
      .replace(/\((a|o|as|os)\)/g, "")
      .replace(/[()]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    let v = "";
    if (
      /^nome( completo)?( do| da| de)?( a)?( alun[oa]| estudante| crianca| educand[oa])?(\(a\))?$/.test(
        r,
      ) ||
      /^(alun[oa]|estudante|crianca)(\(a\))?$/.test(r)
    )
      v = d.nome || "";
    else if (/nascimento|^d\.? ?n\.?$/.test(r)) v = dataBR(d.dataNascimento);
    else if (
      /^(nome da )?(escola|unidade escolar|unidade de ensino|instituicao( de ensino)?|u\.?e\.?)$/.test(
        r,
      )
    )
      v = d.escola || "";
    else if (
      /^(ano|serie|turma|ano\/serie|ano \/ serie|ano escolar|ano de escolaridade|ano\/turma|serie\/turma|etapa)$/.test(
        r,
      )
    )
      v = d.serie || "";
    else if (/^cid( ?10| ?11)?$/.test(r)) v = d.cid || "";
    else if (/^(diagnostico|hipotese diagnostica)$/.test(r)) v = d.diagnostico || "";
    else if (/^(nome do |nome da )?(responsavel( legal)?|mae|pai|filiacao)$/.test(r))
      v = d.responsavel || "";
    else if (/^(telefone|contato|telefone do responsavel|contato da familia)$/.test(r))
      v = d.contato || "";
    else if (/^(nome do |nome da )?professor(a)?( regente)?(\(a\))?$/.test(r))
      v = d.professor || "";
    else if (/^data( de elaboracao| do preenchimento| da elaboracao)?$/.test(r))
      v = d.dataHoje || "";
    if (v.trim()) out[l.id] = v.trim();
  }
  return out;
}

// ---------------------------------------------------------------- documento na tela

export type TrechoVisual =
  | { t: "texto"; texto: string; b?: boolean; i?: boolean; u?: boolean; tam?: number; cor?: string }
  | { t: "campo"; id: string }
  | { t: "opcao"; id: string; n: number }
  | { t: "img"; src: string; w: number; h: number }
  | { t: "br" };

export type BlocoVisual =
  | { t: "p"; filhos: TrechoVisual[]; alinh?: "center" | "right" | "justify"; titulo?: boolean }
  | { t: "tabela"; linhas: CelulaVisual[][] };

export type CelulaVisual = {
  blocos: BlocoVisual[];
  colSpan: number;
  rowSpan: number;
  fundo?: string;
  largura?: number; // em % da linha
};

export type ModeloVisual = { lacunas: Lacuna[]; cabecalho: BlocoVisual[]; corpo: BlocoVisual[] };

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  svg: "image/svg+xml",
};

async function carregarImagens(zip: JSZip, parte: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const rels = zip.file(`word/_rels/${parte}.rels`);
  if (!rels) return out;
  const doc = new DOMParser().parseFromString(await rels.async("string"), "application/xml");
  for (const r of Array.from(doc.getElementsByTagName("Relationship"))) {
    const alvo = r.getAttribute("Target") || "";
    const id = r.getAttribute("Id") || "";
    const ext = (alvo.split(".").pop() || "").toLowerCase();
    if (!/image/.test(r.getAttribute("Type") || "") || !MIME[ext]) continue;
    const f = zip.file(`word/${alvo.replace(/^\/?(word\/)?/, "")}`);
    if (!f) continue;
    out[id] = `data:${MIME[ext]};base64,${await f.async("base64")}`;
  }
  return out;
}

function partirMarcas(
  texto: string,
  base: Omit<Extract<TrechoVisual, { t: "texto" }>, "t" | "texto">,
) {
  const out: TrechoVisual[] = [];
  const re = new RegExp(`${MARCA_INI}([^${MARCA_FIM}]*)${MARCA_FIM}`, "g");
  let de = 0;
  for (const m of texto.matchAll(re)) {
    if (m.index! > de) out.push({ t: "texto", texto: texto.slice(de, m.index!), ...base });
    const [id, n] = m[1].split("#");
    out.push(n ? { t: "opcao", id, n: parseInt(n, 10) } : { t: "campo", id });
    de = m.index! + m[0].length;
  }
  if (de < texto.length) out.push({ t: "texto", texto: texto.slice(de), ...base });
  return out;
}

function ligado(rPr: Element | null, nome: string): boolean {
  const e = filho(rPr, nome);
  if (!e) return false;
  const v = attr(e, "val");
  return v !== "0" && v !== "false" && v !== "none";
}

function blocosVisuais(container: Element, imagens: Record<string, string>): BlocoVisual[] {
  const out: BlocoVisual[] = [];

  const run = (r: Element, dest: TrechoVisual[]) => {
    const rPr = filho(r, "rPr");
    const tam = parseInt(attr(filho(rPr, "sz"), "val") || "", 10);
    const cor = attr(filho(rPr, "color"), "val") || "";
    const base = {
      ...(ligado(rPr, "b") ? { b: true } : {}),
      ...(ligado(rPr, "i") ? { i: true } : {}),
      ...(ligado(rPr, "u") ? { u: true } : {}),
      ...(tam ? { tam: tam / 2 } : {}),
      ...(/^[0-9a-f]{6}$/i.test(cor) ? { cor: `#${cor}` } : {}),
    };
    for (let c = r.firstElementChild; c; c = c.nextElementSibling) {
      if (c.localName === "t") dest.push(...partirMarcas(c.textContent || "", base));
      else if (c.localName === "tab") dest.push({ t: "texto", texto: "    ", ...base });
      else if (c.localName === "br" || c.localName === "cr") dest.push({ t: "br" });
      else if (c.localName === "drawing" || c.localName === "pict") {
        const blip = c.getElementsByTagNameNS("*", "blip")[0];
        const id = blip?.getAttribute("r:embed") || "";
        const ext = c.getElementsByTagNameNS("*", "extent")[0];
        if (id && imagens[id]) {
          dest.push({
            t: "img",
            src: imagens[id],
            w: Math.round(parseInt(ext?.getAttribute("cx") || "0", 10) / 9525) || 120,
            h: Math.round(parseInt(ext?.getAttribute("cy") || "0", 10) / 9525) || 0,
          });
        }
      }
    }
  };

  const linha = (el: Element, dest: TrechoVisual[]) => {
    for (const c of filhos(el)) {
      if (c.localName === "r") run(c, dest);
      else if (c.localName === "pPr" || c.localName === "sdtPr") continue;
      else linha(c, dest); // hyperlink, sdt, sdtContent, smartTag...
    }
  };

  const paragrafo = (p: Element) => {
    const pPr = filho(p, "pPr");
    const jc = attr(filho(pPr, "jc"), "val") || "";
    const estilo = attr(filho(pPr, "pStyle"), "val") || "";
    const filhosV: TrechoVisual[] = [];
    linha(p, filhosV);
    out.push({
      t: "p",
      filhos: filhosV,
      ...(jc === "center" ? { alinh: "center" as const } : {}),
      ...(jc === "right" || jc === "end" ? { alinh: "right" as const } : {}),
      ...(jc === "both" ? { alinh: "justify" as const } : {}),
      ...(/heading|t[ií]tulo|ttulo|title/i.test(estilo) ? { titulo: true } : {}),
    });
  };

  const tabela = (tbl: Element) => {
    const linhas: CelulaVisual[][] = [];
    const abertas: Record<number, CelulaVisual> = {}; // coluna → célula mesclada na vertical
    for (const cels of linhasDaTabela(tbl)) {
      const total = cels.reduce(
        (n, c) => n + (parseInt(attr(filho(filho(c.tc, "tcPr"), "tcW"), "w") || "0", 10) || 0),
        0,
      );
      const row: CelulaVisual[] = [];
      for (const c of cels) {
        const tcPr = filho(c.tc, "tcPr");
        const vm = filho(tcPr, "vMerge");
        if (c.continua && abertas[c.col]) {
          abertas[c.col].rowSpan++;
          continue;
        }
        const w = parseInt(attr(filho(tcPr, "tcW"), "w") || "0", 10) || 0;
        const fundo = attr(filho(tcPr, "shd"), "fill") || "";
        const cel: CelulaVisual = {
          blocos: blocosVisuais(c.tc, imagens),
          colSpan: c.span,
          rowSpan: 1,
          ...(/^[0-9a-f]{6}$/i.test(fundo) && fundo.toUpperCase() !== "FFFFFF"
            ? { fundo: `#${fundo}` }
            : {}),
          ...(total && w ? { largura: Math.round((w / total) * 100) } : {}),
        };
        if (vm) abertas[c.col] = cel;
        else delete abertas[c.col];
        row.push(cel);
      }
      linhas.push(row);
    }
    out.push({ t: "tabela", linhas });
  };

  for (const el of filhos(container)) {
    if (el.localName === "p") paragrafo(el);
    else if (el.localName === "tbl") tabela(el);
    else if (el.localName === "sdt") {
      const c = filho(el, "sdtContent");
      if (c) out.push(...blocosVisuais(c, imagens));
    }
  }
  return out;
}

/**
 * Prepara o modelo para aparecer na tela: o texto, as tabelas e as imagens do
 * documento, com um campo em cada espaço em branco (mesmos ids de analisarModelo).
 */
export async function visualizarModelo(buf: ArrayBuffer): Promise<ModeloVisual> {
  const { zip, doc } = await abrir(buf);
  const alvos = detectar(doc);
  for (const a of [...alvos].reverse()) a.aplicar(`${MARCA_INI}${a.id}${MARCA_FIM}`);
  const body = doc.getElementsByTagNameNS(W, "body")[0];
  const corpo = blocosVisuais(body, await carregarImagens(zip, "document.xml"));

  // Cabeçalho (onde costuma ficar o logo da rede): o mais completo dos que existirem.
  let cabecalho: BlocoVisual[] = [];
  let peso = 0;
  for (const nome of Object.keys(zip.files)) {
    const m = nome.match(/^word\/(header\d+\.xml)$/);
    if (!m) continue;
    const hd = new DOMParser().parseFromString(
      await zip.file(nome)!.async("string"),
      "application/xml",
    );
    const raiz = hd.documentElement;
    if (!raiz || hd.getElementsByTagName("parsererror").length) continue;
    const blocos = blocosVisuais(raiz, await carregarImagens(zip, m[1]));
    const p = JSON.stringify(blocos).length;
    if (p > peso) {
      peso = p;
      cabecalho = blocos;
    }
  }
  return { lacunas: alvos.map(({ aplicar: _a, ...l }) => l), cabecalho, corpo };
}
