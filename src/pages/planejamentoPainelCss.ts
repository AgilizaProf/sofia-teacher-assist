// Visual "Painel" da página de Planejamento (/planejamento).
// Vem depois do CSS original da página e só troca a aparência:
// contador pequeno no topo, ferramentas em cartões com nome e explicação
// e a área de trabalho com as cores e botões do Painel.

export const planPainelCss = `
.pn.pl-root{
  --primary:#14161F;--primary-dark:#14161F;
  --navy:#14161F;--navy-2:#2A2E3A;--navy-deep:#14161F;--navy-darker:#14161F;
  --orange:#0B7A55;--orange-2:#096746;--orange-soft:rgba(11,122,85,.10);--orange-soft-2:rgba(11,122,85,.18);
  --ink:#14161F;--ink-2:#3A4052;--muted:#596074;--line:#D6DBE5;--bg:#EDF0F5;
  --green:#0B7A55;--amber:#FFB224;--red:#F2604B;
  --shadow-sm:none;--shadow-md:none;--shadow-lg:0 18px 40px rgba(20,22,31,.18);
  font-family:var(--pn-body);background:var(--pn-bg);
}
.pn.pl-root h1,.pn.pl-root h2,.pn.pl-root h3,.pn.pl-root h4{font-family:var(--pn-display);font-weight:700;letter-spacing:-.025em;}
.pn.pl-root .pl-app{display:block;min-height:0;max-width:1240px;margin:0 auto;}
.pn.pl-root .pl-hero{margin:18px 24px 0;background:var(--pn-surface);border:1.5px solid var(--pn-line);box-shadow:none;}
.pn.pl-root .pl-hero::after{display:none;}

/* Topo: contador, título, ferramentas */
.pl-top{padding:22px 24px 0;}
.pl-title{margin:14px 0 0!important;font-family:var(--pn-display);font-weight:800!important;font-size:34px;letter-spacing:-.045em!important;line-height:1.1;}
.pl-ei-note{margin-top:12px;background:var(--pn-green-soft);border:1.5px solid var(--pn-green);border-radius:12px;padding:10px 14px;font-size:14px;color:#064E36;}
.pl-ei-note a{color:var(--pn-green);font-weight:700;}
.pn.pl-root .pl-block-title{margin:22px 0 10px;font-size:17px;}
.pl-tools-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;}
.pn.pl-root .pl-tool{display:flex;align-items:center;gap:12px;text-align:left;padding:12px;min-height:84px;background:var(--pn-surface);
  border:2px solid var(--pn-ink);border-radius:16px;box-shadow:3px 3px 0 var(--pn-ink);color:var(--pn-ink);cursor:pointer;text-decoration:none;
  transition:transform .12s,box-shadow .12s;}
.pn.pl-root .pl-tool:hover{transform:translate(-1px,-1px);box-shadow:5px 5px 0 var(--pn-ink);}
.pn.pl-root .pl-tool:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--pn-ink);}
.pn.pl-root .pl-tool.active{background:var(--pn-green);color:#fff;}
.pl-tool .ic{flex:none;width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:21px;
  border:1.5px solid var(--pn-ink);background:var(--pn-green-soft);}
.pl-tool .ic.sky{background:var(--pn-blue-soft);}
.pl-tool .ic.sun{background:var(--pn-sun);}
.pl-tool .ic.lilac{background:var(--pn-lilac);}
.pl-tool .ic.coral{background:var(--pn-pink);}
.pl-tool .ic.cream{background:var(--pn-cream);}
.pl-tool .ic.ink{background:var(--pn-ink);}
.pl-tool .tx{min-width:0;display:flex;flex-direction:column;gap:3px;}
.pl-tool b{font-family:var(--pn-display);font-weight:700;font-size:15px;letter-spacing:-.02em;line-height:1.2;}
.pl-tool small{font-size:12.5px;line-height:1.35;color:var(--pn-muted);}
.pl-tool.active small{color:#D4F3E6;}
.pn.pl-root .pl-tool.active .ic{background:var(--pn-sun);}
.pl-mode-head{margin:26px 0 0;}
.pn.pl-root .pl-mode-head h2{font-size:24px;font-weight:800;letter-spacing:-.035em;}
.pl-mode-head p{margin-top:2px!important;color:var(--pn-muted);font-size:14.5px;}

/* Área de trabalho */
.pn.pl-root .pl-workspace{padding:14px 24px 100px;}
.pn.pl-root .pl-btn{border:2px solid var(--pn-ink);border-radius:10px;font-weight:700;font-size:13px;box-shadow:2px 2px 0 var(--pn-ink);background:var(--pn-surface);}
.pn.pl-root .pl-btn:hover{background:var(--pn-surface);transform:translate(-1px,-1px);box-shadow:3px 3px 0 var(--pn-ink);border-color:var(--pn-ink);}
.pn.pl-root .pl-btn.primary{background:var(--pn-green);color:#fff;}
.pn.pl-root .pl-btn.primary:hover{background:var(--pn-green);}
.pn.pl-root .pl-btn.dark{background:var(--pn-ink);color:#fff;}
.pn.pl-root .pl-btn.ghost{border-color:transparent;box-shadow:none;background:transparent;}
.pn.pl-root .pl-btn.ghost:hover{transform:none;background:var(--pn-surface);border-color:transparent;}
.pn.pl-root .pl-week{border:1.5px solid var(--pn-line);border-radius:16px;}
.pn.pl-root .pl-day{background:var(--pn-bg);}
.pn.pl-root .pl-day-head .dd{font-family:var(--pn-display);font-weight:800;}
.pn.pl-root .pl-card{border:1.5px solid var(--pn-line);}
.pn.pl-root .pl-card:hover{border-color:var(--pn-ink);}

@media(max-width:1100px){.pl-tools-grid{grid-template-columns:repeat(3,minmax(0,1fr));}}
@media(max-width:860px){
  .pl-top{padding:16px 16px 0;}
  .pl-title{font-size:28px;}
  .pl-tools-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
  .pn.pl-root .pl-tool{flex-direction:column;align-items:flex-start;gap:8px;min-height:0;padding:12px;}
  .pl-tool .ic{width:38px;height:38px;font-size:18px;}
  .pl-tool b{font-size:14.5px;}
  .pl-tool small{font-size:12px;}
  .pl-mode-head{margin-top:20px;}
  .pn.pl-root .pl-mode-head h2{font-size:20px;}
  .pn.pl-root .pl-workspace{padding:12px 16px 120px!important;}
}
`;
