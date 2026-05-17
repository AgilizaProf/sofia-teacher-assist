/**
 * Impressão / PDF do PEI no padrão visual AgilizaProf:
 *   • Margens A4 2cm, borda 1px solid #000 em todo o documento
 *   • Título "PLANO EDUCACIONAL INDIVIDUALIZADO" em Fraunces 28pt bold
 *   • Subtítulo "PEI — [ANO LETIVO]" Arial 12 centralizado
 *   • Período de vigência Arial 12 centralizado
 *   • Identificação com labels em negrito
 *   • Seções em CAIXA ALTA, separadas por linha horizontal
 *   • Bloco de assinaturas (Professor, Coordenação, AEE, Responsável)
 *   • Rodapé com fundamentação legal (Arial 10, #666666)
 *
 * Mantém intacto o conteúdo gerado (`buildPEIContext`) e os dados do PEI —
 * apenas reformata o documento final.
 */

import { buildPEIContext, type PEIData } from "@/components/inclusao/PEIFormModal";

function escHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtDateBR(iso: string | undefined | null): string {
  const s = (iso ?? "").trim();
  if (!s) return "—";
  // YYYY-MM-DD → DD/MM/AAAA
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}

function anoLetivo(pei: Partial<PEIData>): string {
  const ref = pei.vigencia?.inicio || pei.dataInicioPEI || "";
  const m = /^(\d{4})/.exec(ref);
  if (m) return m[1];
  return String(new Date().getFullYear());
}

function leisAplicaveis(cid: string): string[] {
  const base = [
    "Lei 13.146/2015 (LBI)",
    "Lei 9.394/1996 (LDB)",
    "Resolução CNE/CEB 4/2009 (AEE)",
    "Decreto 7.611/2011",
  ];
  const c = (cid || "").toUpperCase();
  if (/F84/.test(c)) base.push("Lei 12.764/2012 (TEA)");
  if (/F90|F81/.test(c)) base.push("Lei 14.254/2021 (TDAH/Dislexia)");
  return base;
}

function row(label: string, value: string): string {
  const v = (value ?? "").trim();
  if (!v) return ""; // não renderiza itens não preenchidos
  let val = v.replace(/\s*\(\s*([^()]*?)\s*\)/g, " — $1").trim();
  if (!/[.!?…:;]$/.test(val)) val += ".";
  return `<div class="ident-row"><b>${escHtml(label)}:</b> ${escHtml(val)}</div>`;
}

function buildIdentificacao(pei: Partial<PEIData>, alunoName: string, professorNome: string): string {
  const profs = Array.isArray(pei.profissionaisEnvolvidos)
    ? pei.profissionaisEnvolvidos.filter(Boolean).join(", ")
    : "";
  const diag = [pei.diagnostico, pei.cid ? `CID ${pei.cid}` : ""].filter(Boolean).join(" · ");
  // fmtDateBR retorna "—" para datas vazias — normaliza para string vazia
  // para que o `row()` consiga omitir os campos não preenchidos.
  const d = (iso?: string | null) => {
    const f = fmtDateBR(iso);
    return f === "—" ? "" : f;
  };
  const vIni = d(pei.vigencia?.inicio);
  const vFim = d(pei.vigencia?.fim);
  const vig = vIni || vFim ? `${vIni || "—"} a ${vFim || "—"}` : "";
  return [
    row("Nome do(a) Aluno(a)", alunoName),
    row("Data de Nascimento", d(pei.dataNascimento)),
    row("Diagnóstico(s)/CID(s)", diag),
    row("Data do Laudo", d(pei.laudoData)),
    row("Profissional Responsável", pei.laudoProf || ""),
    row("Nome do(a) Responsável Legal", pei.responsavelNome || ""),
    row("Contato da Família", pei.responsavelContato || ""),
    row("Escola", pei.escola || ""),
    row("Turma", pei.serie || ""),
    row("Nome do(a) Professor(a)", professorNome || ""),
    row("Profissionais Envolvidos", profs),
    row("Data de Início do PEI", d(pei.dataInicioPEI)),
    row("Vigência", vig),
  ].filter(Boolean).join("\n");
}

/**
 * Renderiza o corpo já gerado pela Sofia (`buildPEIContext`) em seções
 * com TÍTULO EM CAIXA ALTA + conteúdo justificado e linha separadora
 * entre cada uma — sem alterar o conteúdo.
 */
function buildCorpo(pei: Partial<PEIData>): string {
  const ctx = buildPEIContext(pei);
  if (!ctx) return "";
  // O builder retorna "PEI DO ALUNO:\n" + blocos separados por "\n\n"
  const blocos = ctx.replace(/^PEI DO ALUNO:\n?/, "").split(/\n{2,}/);

  // Mapeia o título técnico do builder para o nome oficial pedido.
  const RENAME: Record<string, string> = {
    "IDENTIFICAÇÃO": "PERFIL DO ALUNO(A)",
    "PERFIL DO ALUNO": "PERFIL DO ALUNO(A)",
    "HISTÓRICO ESCOLAR": "HISTÓRICO ESCOLAR",
    "AVALIAÇÃO PEDAGÓGICA INICIAL": "AVALIAÇÃO PEDAGÓGICA INICIAL",
    "OBJETIVOS E METAS": "OBJETIVOS E METAS",
    "ADAPTAÇÕES CURRICULARES": "ADAPTAÇÕES CURRICULARES",
    "ESTRATÉGIAS PEDAGÓGICAS": "ESTRATÉGIAS PEDAGÓGICAS",
    "TECNOLOGIA ASSISTIVA": "TECNOLOGIA ASSISTIVA",
    "APOIOS E SERVIÇOS": "APOIOS E SERVIÇOS",
    "PARTICIPAÇÃO DA FAMÍLIA": "PARTICIPAÇÃO DA FAMÍLIA",
    "REVISÃO DO PEI": "AVALIAÇÃO E REVISÃO DO PEI",
  };

  const partes: string[] = [];
  for (const bloco of blocos) {
    const idx = bloco.indexOf("\n");
    if (idx < 0) continue;
    const rawTitle = bloco.slice(0, idx).replace(/:\s*$/, "").trim();
    const body = bloco.slice(idx + 1).trim();
    // Pula a IDENTIFICAÇÃO técnica — ela já aparece no bloco de identificação acima.
    if (/^IDENTIFICAÇÃO/i.test(rawTitle)) continue;
    const title = RENAME[rawTitle.toUpperCase()] || rawTitle.toUpperCase();
    // Substitui parênteses "(...)" por travessão " — ..." e garante
    // ponto final no fim de cada frase.
    const limpar = (txt: string): string => {
      let t = txt
        // "abc (xyz)" → "abc — xyz"
        .replace(/\s*\(\s*([^()]*?)\s*\)/g, " — $1")
        // remove travessão final solto
        .replace(/\s*—\s*$/, "")
        .trim();
      if (!t) return t;
      // adiciona ponto final se a linha não terminar com pontuação
      if (!/[.!?…:;]$/.test(t)) t += ".";
      return t;
    };
    const linhas = body
      .split(/\n+/)
      .map((l) => l.replace(/\s+$/, ""))
      .map((l) => {
        const m = /^(\s*)(.*)$/.exec(l)!;
        return m[1] + limpar(m[2]);
      })
      .filter((l) => l.trim().length > 0);
    if (linhas.length === 0) continue; // pula seções sem conteúdo
    // Cada linha vem como "Rótulo: resposta" (ou listas indentadas "  1. ...").
    // Renderiza o rótulo em negrito e a resposta sem negrito.
    const html = linhas.map((line) => {
      // preserva indentação de listas
      const indentMatch = /^(\s+)(.*)$/.exec(line);
      const indent = indentMatch ? indentMatch[1].replace(/ /g, "&nbsp;") : "";
      const content = indentMatch ? indentMatch[2] : line;
      const colonIdx = content.indexOf(":");
      if (colonIdx > 0 && colonIdx < 120) {
        const label = content.slice(0, colonIdx);
        const rest = content.slice(colonIdx + 1).trimStart();
        return `<p>${indent}<b>${escHtml(label)}:</b>${rest ? " " + escHtml(rest) : ""}</p>`;
      }
      return `<p>${indent}${escHtml(content)}</p>`;
    }).join("");
    partes.push(`<section class="doc-secao"><h2>${escHtml(title)}</h2>${html}</section>`);
  }

  return partes.join("\n");
}

function buildAssinaturas(): string {
  const bloco = (titulo: string, legenda: string) => `
    <div class="assinatura">
      <div class="titulo">${escHtml(titulo)}</div>
      <div class="linha"></div>
      <div class="legenda">${escHtml(legenda)}</div>
    </div>`;
  return `<section class="doc-assinaturas">
    ${bloco("Assinatura do(a) Professor(a):", "Nome completo / Data / Matrícula")}
    ${bloco("Assinatura da Coordenação Pedagógica:", "Nome completo / Data")}
    ${bloco("Assinatura do(a) Responsável pelo AEE:", "Nome completo / Data")}
    ${bloco("Ciente do(a) Responsável Legal do(a) Aluno(a):", "Nome completo / Data / Parentesco")}
  </section>`;
}

function buildRodape(cid: string): string {
  const leis = leisAplicaveis(cid).join(" · ");
  return `<hr class="rodape-sep"/>
    <p class="rodape">Este Plano Educacional Individualizado foi elaborado com apoio do AgilizaProf em consonância com: ${escHtml(leis)}.</p>`;
}

export function buildPEIPrintHtml(opts: {
  pei: Partial<PEIData>;
  alunoName: string;
  professorNome: string;
}): string {
  const { pei, alunoName, professorNome } = opts;
  const titulo = "PLANO EDUCACIONAL INDIVIDUALIZADO";
  const subtitulo = `PEI — ${anoLetivo(pei)}`;
  const vig = `Vigência: ${fmtDateBR(pei.vigencia?.inicio)} a ${fmtDateBR(pei.vigencia?.fim)}`;

  const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700&display=swap');

*{box-sizing:border-box;}
html,body{margin:0;padding:0;background:#e5e5e5;}
body{font-family:Arial,Helvetica,sans-serif;color:#000;font-size:12pt;line-height:1.45;}

.toolbar{position:fixed;top:12px;right:12px;z-index:99;}
.toolbar button{font:13px/1 Arial,Helvetica,sans-serif;padding:8px 14px;border:1px solid #888;background:#fff;border-radius:6px;cursor:pointer;}

.documento{
  width:21cm;min-height:29.7cm;background:#fff;
  border:1px solid #000;padding:2cm;margin:24px auto;
  text-align:justify;box-shadow:0 4px 18px rgba(0,0,0,.12);
}

.documento h1.title{
  font-family:'Fraunces',Georgia,'Times New Roman',serif;
  font-weight:700;font-size:28px;text-align:center;
  margin:0 0 6px;color:#000;
}
.documento .subtitle{text-align:center;font-size:12pt;margin:0 0 6px;}
.documento .vigencia{text-align:center;font-size:12pt;margin:0 0 12px;}
.documento .sep{border:0;border-top:1px solid #000;margin:8px 0 14px;}

.documento .doc-ident{text-align:left;margin:0 0 16px;}
.documento .doc-ident{
  display:grid;grid-template-columns:1fr 1fr;
  column-gap:24px;row-gap:4px;
}
.documento .ident-row{margin:2px 0;text-align:left;break-inside:avoid;}
.documento .ident-row b{font-weight:700;}
@media print{
  .documento .doc-ident{column-gap:18px;}
}

.documento .doc-secao{margin:6px 0;text-align:justify;}
.documento .doc-secao h2{
  font-family:Arial,Helvetica,sans-serif;
  font-size:12pt;font-weight:700;text-transform:uppercase;
  margin:0 0 6px;color:#000;text-align:left;
}
.documento .doc-secao p{margin:0 0 6px;text-align:justify;}
.documento .doc-secao + .doc-secao{border-top:1px solid #000;padding-top:8px;margin-top:10px;}

.documento .doc-assinaturas{margin-top:28px;text-align:left;}
.documento .doc-assinaturas .assinatura{margin:18px 0;}
.documento .doc-assinaturas .titulo{font-weight:700;margin-bottom:18px;}
.documento .doc-assinaturas .linha{border-bottom:1px solid #000;height:1px;margin:0 0 4px;}
.documento .doc-assinaturas .legenda{font-size:11pt;}

.documento .rodape-sep{border:0;border-top:1px solid #000;margin:24px 0 12px;}
.documento .rodape{
  font-family:Arial,Helvetica,sans-serif;
  font-size:10pt;color:#666666;text-align:center;margin:0;
}

@media print{
  @page{size:A4;margin:2cm;}
  body{background:#fff;}
  .toolbar{display:none !important;}
  .documento{
    width:auto;min-height:0;margin:0;padding:0;
    border:1px solid #000;box-shadow:none;
  }
  *{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
}
`;

  const corpo = buildCorpo(pei);
  const identificacao = buildIdentificacao(pei, alunoName, professorNome);
  const assinaturas = buildAssinaturas();
  const rodape = buildRodape(pei.cid || "");

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>PEI · ${escHtml(alunoName)}</title>
<style>${css}</style>
</head>
<body>
<div class="toolbar"><button onclick="window.print()">Imprimir / Salvar PDF</button></div>
<article class="documento">
  <h1 class="title">${escHtml(titulo)}</h1>
  <div class="subtitle">${escHtml(subtitulo)}</div>
  <div class="vigencia">${escHtml(vig)}</div>
  <hr class="sep"/>
  <div class="doc-ident">
    ${identificacao}
  </div>
  ${corpo}
  ${assinaturas}
  ${rodape}
</article>
</body>
</html>`;
}

export function printPEIDocument(opts: {
  pei: Partial<PEIData>;
  alunoName: string;
  professorNome: string;
}): void {
  const html = buildPEIPrintHtml(opts);
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
}