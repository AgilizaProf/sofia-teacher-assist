/**
 * Impressão direta no formato padrão de Planejamento (Fraunces 28 título,
 * Arial 12 corpo, margens 2cm, borda 1px sólida, assinaturas e rodapé legal).
 * Usado pelos botões "Imprimir" das abas M1, M2, M3 e M7, que abrem a janela
 * de impressão do navegador sem passar por modal/preview.
 */

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatarDataBR(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export type BlocoCampo = {
  /** Rótulo em negrito da linha (ex.: "Atividades:"). */
  label: string;
  /** Texto longo (justificado) ou lista de bullets. */
  body?: string;
  bullets?: string[];
  /** Bullets com código BNCC à direita: "Texto ... CÓDIGO". */
  bulletsBncc?: Array<{ texto: string; codigo?: string }>;
};

export type SecaoImpressao = {
  /** Título da seção/dia (ex.: "12/05/2026 — Segunda-feira" ou "Aula 1 — Introdução"). */
  titulo?: string;
  blocos: BlocoCampo[];
};

export type ImprimirArgs = {
  /** Título do cabeçalho (ex.: "PLANEJAMENTO", "SEQUÊNCIA DIDÁTICA"). */
  titulo: string;
  escola?: string;
  turma?: string;
  professor?: string;
  /** ISO ou texto livre. Se for ISO `YYYY-MM-DD` é formatado em BR. */
  dataInicio?: string;
  dataFim?: string;
  secoes: SecaoImpressao[];
  /** Frase legal do rodapé (ex.: "Lei 9.394/1996 (LDB)..."). */
  rodapeLegal?: string;
  /** Mostra blocos de assinatura (Professor / Coordenação). Default: true. */
  assinaturas?: boolean;
};

function renderBloco(b: BlocoCampo): string {
  const label = `<b>${esc(b.label)}</b>`;
  if (b.bulletsBncc && b.bulletsBncc.length) {
    const items = b.bulletsBncc.map((it) => {
      const cod = it.codigo ? `<span class="cod">${esc(it.codigo)}</span>` : "";
      const leader = it.codigo ? `<span class="leader"></span>` : "";
      return `<li><span class="bul">•</span><span class="txt">${esc(it.texto)}</span>${leader}${cod}</li>`;
    }).join("");
    return `<div class="secao">${label}<ul class="bul-list">${items}</ul></div>`;
  }
  if (b.bullets && b.bullets.length) {
    const items = b.bullets.map((t) => `<li><span class="bul">•</span><span class="txt">${esc(t)}</span></li>`).join("");
    return `<div class="secao">${label}<ul class="bul-list">${items}</ul></div>`;
  }
  const corpo = (b.body || "")
    .split(/\n+/)
    .filter((s) => s.trim().length > 0)
    .map((p) => `<p>${esc(p)}</p>`)
    .join("") || `<p>—</p>`;
  return `<div class="secao">${label}${corpo}</div>`;
}

function renderSecao(s: SecaoImpressao): string {
  const head = s.titulo ? `<h2>${esc(s.titulo)}</h2>` : "";
  const blocos = s.blocos.map(renderBloco).join("");
  return `<section class="dia">${head}${blocos}</section>`;
}

/** Constrói o HTML do documento padrão (sem trigger de impressão). */
export function construirPlanejamentoHtml(args: ImprimirArgs): string {
  if (typeof window === "undefined") return;
  const periodo = (args.dataInicio || args.dataFim)
    ? `${formatarDataBR(args.dataInicio || "")}${args.dataInicio && args.dataFim ? " a " : ""}${formatarDataBR(args.dataFim || "")}`
    : "";
  const meta = [
    args.escola ? `<div><b>Nome da Escola: </b>${esc(args.escola)}</div>` : "",
    args.turma ? `<div><b>Turma: </b>${esc(args.turma)}</div>` : "",
    args.professor ? `<div><b>Nome do(a) Professor(a): </b>${esc(args.professor)}</div>` : "",
  ].filter(Boolean).join("");
  const corpo = args.secoes.map(renderSecao).join("");
  const showSign = args.assinaturas !== false;
  const assinaturas = showSign ? `
    <div class="ass">
      <div><b>Assinatura do(a) Professor(a):</b></div>
      <div class="linha"></div>
      <div class="legenda">Nome completo / Data</div>
      <div style="margin-top:24px"><b>Assinatura da Coordenação Pedagógica:</b></div>
      <div class="linha"></div>
      <div class="legenda">Nome completo / Data</div>
    </div>` : "";
  const rodape = args.rodapeLegal
    ? `<hr class="sep-rodape" /><div class="rodape">${esc(args.rodapeLegal)}</div>`
    : "";

  return `<!doctype html><html><head><meta charset="utf-8" />
<title>${esc(args.titulo)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@700&display=swap" rel="stylesheet" />
<style>
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  html,body{margin:0;padding:0;background:#fff;color:#000}
  body{font:12px/1.45 Arial, Helvetica, sans-serif;text-align:justify}
  .doc{border:1px solid #000;padding:2cm;margin:0;min-height:100vh}
  h1{font-family:'Fraunces', Georgia, serif;font-weight:700;font-size:28px;text-align:center;margin:0 0 8px;letter-spacing:.01em}
  .periodo{text-align:center;margin:0 0 16px;font-size:12px}
  hr{border:0;border-top:1px solid #000;margin:12px 0}
  .meta{text-align:left;margin:8px 0 16px}
  .meta div{margin:2px 0}
  .dia{margin:16px 0;padding-top:12px;border-top:1px solid #000}
  .dia h2{font-size:12px;font-weight:700;margin:0 0 8px;text-align:left;font-family:Arial,Helvetica,sans-serif}
  .secao{margin:6px 0;text-align:justify}
  .secao b{font-weight:700;display:block;margin-bottom:2px}
  .secao p{margin:0 0 4px;text-align:justify}
  .secao + .secao{border-top:1px solid #000;padding-top:6px;margin-top:8px}
  ul.bul-list{list-style:none;padding:0;margin:4px 0}
  ul.bul-list li{display:flex;align-items:baseline;gap:6px;margin:2px 0}
  ul.bul-list li .bul{flex:0 0 auto}
  ul.bul-list li .txt{flex:0 1 auto}
  ul.bul-list li .leader{flex:1 1 auto;border-bottom:1px dotted #000;height:.7em;margin:0 4px;min-width:24px}
  ul.bul-list li .cod{flex:0 0 auto;font-variant-numeric:tabular-nums}
  .ass{margin-top:32px;text-align:left}
  .ass .linha{margin:18px 0 4px;border-bottom:1px solid #000;height:1px}
  .ass .legenda{font-size:11px}
  .sep-rodape{margin:24px 0 12px}
  .rodape{margin-top:12px;font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#666;text-align:center}
  @page{size:A4;margin:1cm}
  @media print{ button,.no-print{display:none !important} .doc{border:1px solid #000;padding:1cm} }
</style>
</head><body>
<div class="doc">
  <h1>${esc(args.titulo)}</h1>
  ${periodo ? `<div class="periodo">${esc(periodo)}</div>` : ""}
  <hr />
  <div class="meta">${meta}</div>
  ${corpo}
  ${assinaturas}
  ${rodape}
</div>
</body></html>`;
}

export function imprimirPlanejamentoDireto(args: ImprimirArgs): void {
  if (typeof window === "undefined") return;
  const base = construirPlanejamentoHtml(args);
  const html = base.replace(
    "</body></html>",
    `<script>window.onload=function(){setTimeout(function(){try{window.print()}catch(_){}} ,250)}<\/script></body></html>`,
  );

  const w = window.open("", "_blank");
  if (!w) {
    // Pop-up bloqueado — usa impressão da própria página.
    window.print();
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
}

/**
 * Faz download do mesmo documento padrão como arquivo Word (.doc) usando
 * o cabeçalho mso. O Word abre o HTML e preserva o layout impresso.
 */
export function salvarPlanejamentoDocx(args: ImprimirArgs, nomeArquivo?: string): void {
  if (typeof window === "undefined") return;
  const html = construirPlanejamentoHtml(args);
  const inner = html
    .replace(/^<!doctype html>/i, "")
    .replace(/^<html>/i, "")
    .replace(/<\/html>\s*$/i, "");
  const docHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">${inner}</html>`;
  const blob = new Blob(["\ufeff", docHtml], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safe = (nomeArquivo || args.titulo || "planejamento").replace(/[^\w-]+/g, "_");
  link.href = url;
  link.download = `${safe}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}