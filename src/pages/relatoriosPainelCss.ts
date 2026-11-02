// Visual "Painel" da página de Pareceres (/relatorios).
// Vem depois do CSS original da página e só troca a aparência:
// contador pequeno no topo, ações em cartões com nome e explicação,
// situação do período e a lista dos alunos.

export const painelCss = `
.pn.rel-root{
  --primary:#14161F;--primary-dark:#14161F;--panel:#14161F;
  --muted:#596074;--line-soft:#D6DBE5;--line:#D6DBE5;
  --paper:#EDF0F5;--paper-2:#F6F8FB;
  --accent:#F2604B;--accent-2:#FFB224;
  --violet:#7A5FE0;--violet-soft:#E8E2FF;
  --green:#0B7A55;--green-soft:#CDEFE2;
  --amber:#FFB224;--amber-soft:#FFEFC9;
  --text:#14161F;--text-soft:#3A4052;
  --shadow-card:none;
  display:block;font-family:var(--pn-body);background:var(--pn-bg);min-height:100vh;
}
.pn.rel-root .rel-main{display:block;}
.pn.rel-root .rel-page{max-width:1280px;padding:24px 24px 64px;}

.pn.rel-root .rel-page{max-width:1120px;}
.rel-title{margin:14px 0 0;font-family:var(--pn-display);font-weight:800;font-size:34px;letter-spacing:-.045em;line-height:1.1;}
.pn.rel-root .rel-block-title{margin:22px 0 10px;font-family:var(--pn-display);font-weight:700;font-size:17px;letter-spacing:-.02em;}
.rel-prog-chip{background:var(--pn-surface);border:1.5px solid var(--pn-line);padding:0 12px;}
.rel-prog-chip b{font-family:var(--pn-display);}
.rel-prog-bar{width:52px;height:8px;border-radius:99px;background:var(--pn-bg);overflow:hidden;}
.rel-prog-bar i{display:block;height:100%;background:var(--pn-green);border-radius:99px;}

/* Ações: cartões grandes, com ícone, nome e explicação */
.rel-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;}
.pn.rel-root .rel-action{display:flex;align-items:center;gap:12px;text-align:left;padding:14px;min-height:84px;background:var(--pn-surface);
  border:2px solid var(--pn-ink);border-radius:16px;box-shadow:3px 3px 0 var(--pn-ink);color:var(--pn-ink);cursor:pointer;
  transition:transform .12s,box-shadow .12s;}
.pn.rel-root .rel-action:hover{transform:translate(-1px,-1px);box-shadow:5px 5px 0 var(--pn-ink);}
.pn.rel-root .rel-action:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--pn-ink);}
.pn.rel-root .rel-action:disabled{opacity:.6;cursor:default;transform:none;}
.rel-action .ic{flex:none;width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;
  background:var(--pn-green-soft);color:var(--pn-green);border:1.5px solid var(--pn-ink);}
.rel-action .ic.sky{background:var(--pn-blue-soft);color:#1F5FC8;}
.rel-action .ic.sun{background:var(--pn-cream);color:#7A4F00;}
.rel-action .ic.lilac{background:var(--pn-lilac);color:#3B2A8C;}
.rel-action .ic.coral{background:var(--pn-pink);color:#A3301F;}
.rel-action .ic.ink{background:var(--pn-ink);color:#fff;}
.rel-action .tx{min-width:0;display:flex;flex-direction:column;gap:3px;}
.rel-action b{font-family:var(--pn-display);font-weight:700;font-size:16px;letter-spacing:-.02em;line-height:1.2;}
.rel-action small{font-size:13.5px;line-height:1.35;color:var(--pn-muted);}
.pn.rel-root .rel-action.main{background:var(--pn-green);color:#fff;}
.rel-action.main .ic{background:var(--pn-sun);color:var(--pn-ink);}
.rel-action.main small{color:#D4F3E6;}

/* Situação (KPIs) em linha */
.pn.rel-root .rel-kpis{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:0;}
.pn.rel-root .rel-kpi{display:grid;grid-template-columns:30px minmax(0,1fr) auto;grid-template-areas:"ic lb nm" "ic ft nm";
  column-gap:10px;row-gap:1px;align-items:center;border:1.5px solid var(--pn-line);border-radius:14px;padding:10px 12px;transition:border-color .12s;}
.pn.rel-root .rel-kpi:hover{border-color:var(--pn-ink);}
.pn.rel-root .rel-kpi-top{display:contents;}
.pn.rel-root .rel-kpi-icon{grid-area:ic;width:30px;height:30px;border-radius:9px;}
.pn.rel-root .rel-kpi-label{grid-area:lb;font-size:11px;color:var(--pn-muted);font-weight:700;}
.pn.rel-root .rel-kpi-foot{grid-area:ft;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pn.rel-root .rel-kpi-num{grid-area:nm;margin:0;font-family:var(--pn-display);font-weight:800;font-size:24px;letter-spacing:-.03em;text-align:right;}
.pn.rel-root .rel-kpi-num small{font-family:var(--pn-body);font-size:12px;letter-spacing:0;}
.pn.rel-root .rel-kpi-icon.amber{background:var(--pn-cream);color:#8A5A00;}
.pn.rel-root .rel-kpi-icon.violet{background:var(--violet-soft);color:#4B3CA8;}
.pn.rel-root .rel-kpi-icon.green{background:var(--pn-green-soft);color:var(--pn-green);}
.pn.rel-root .rel-kpi-icon.orange{background:var(--pn-sun);color:var(--pn-ink);}
.pn.rel-root .rel-kpi-dark{border:2px solid var(--pn-ink)!important;}
.pn.rel-root .kpi-tip{left:0;transform:translate(0,4px);}
.pn.rel-root .kpi-tip-host:hover .kpi-tip,.pn.rel-root .kpi-tip-host:focus-visible .kpi-tip{transform:translate(0,0);}
.pn.rel-root .kpi-tip-arrow{left:40px;}
.pn.rel-root .kpi-tip-total{color:var(--pn-sun);}

/* Resumo escuro */
.pn.rel-root .rel-hero{background:var(--pn-ink);border-radius:22px;padding:24px 26px;box-shadow:4px 4px 0 var(--pn-sun);}
.pn.rel-root .rel-hero::before,.pn.rel-root .rel-hero::after{display:none;}
.pn.rel-root .rel-hero-grid{grid-template-columns:1fr 300px;gap:24px;}
.pn.rel-root .rel-eyebrow{color:var(--pn-sun);font-size:11.5px;letter-spacing:.12em;}
.pn.rel-root .rel-hero h1{font-family:var(--pn-display);font-weight:800;font-size:34px;line-height:1.08;letter-spacing:-.04em;}
.pn.rel-root .rel-hero h1 em{color:var(--pn-sun);}
.pn.rel-root .rel-hero p{color:#B9BFCE;font-size:15px;}
.pn.rel-root .rel-btn-primary{background:var(--pn-sun);color:var(--pn-ink);height:46px;padding:0 18px;border-radius:12px;border:2px solid var(--pn-ink);
  box-shadow:3px 3px 0 #fff;font-weight:800;font-size:14.5px;}
.pn.rel-root .rel-btn-primary:hover{filter:none;transform:translate(-1px,-1px);box-shadow:4px 4px 0 #fff;}
.pn.rel-root .rel-btn-ghost{height:46px;border-radius:12px;border:2px solid rgba(255,255,255,.35);background:transparent;font-weight:700;}
.pn.rel-root .rel-btn-ghost:hover{border-color:#fff;background:transparent;}
.pn.rel-root .rel-pc{background:#22252F;border:1.5px solid #3A3E4B;border-radius:16px;backdrop-filter:none;}
.pn.rel-root .rel-pc-title{color:#B9BFCE;}
.pn.rel-root .rel-pc-num{font-family:var(--pn-display);font-weight:800;letter-spacing:-.04em;font-size:36px;}
.pn.rel-root .rel-pc-num span{font-family:var(--pn-body);color:#B9BFCE;}
.pn.rel-root .rel-pc-bar{height:10px;background:#3A3E4B;}
.pn.rel-root .rel-pc-bar i{background:var(--pn-green);box-shadow:none;}
.pn.rel-root .rel-pc-meta{color:#B9BFCE;}
.pn.rel-root .rel-sofia-bubble{border-radius:16px!important;}

/* Títulos de seção */
.pn.rel-root .rel-sec-head{margin:28px 0 12px;}
.pn.rel-root .rel-sec-head h2{font-family:var(--pn-display);font-weight:800;font-size:22px;letter-spacing:-.03em;}
.pn.rel-root .rel-sec-head p{font-size:14px;color:var(--pn-muted);}

/* Filtros */
.pn.rel-root .rel-filters{border:1.5px solid var(--pn-line);border-radius:16px;padding:10px;}
.pn.rel-root .rel-tabs{background:var(--pn-bg);border-radius:12px;}
.pn.rel-root .rel-tab{border-radius:9px;font-size:12.5px;color:var(--pn-muted);}
.pn.rel-root .rel-tab.active{background:var(--pn-ink);color:#fff;box-shadow:none;}
.pn.rel-root .rel-tab.active .count{background:var(--pn-sun);color:var(--pn-ink);}
.pn.rel-root .rel-pill{border:1.5px solid var(--pn-line);border-radius:10px;font-weight:600;color:var(--pn-ink);}
.pn.rel-root .rel-pill:hover{border-color:var(--pn-ink);}
.pn.rel-root .rel-search-mini{background:var(--pn-bg);border:1.5px solid transparent;border-radius:10px;}
.pn.rel-root .rel-search-mini:focus-within{border-color:var(--pn-ink);}
.pn.rel-root .rel-dropdown{border:2px solid var(--pn-ink);border-radius:12px;box-shadow:4px 4px 0 var(--pn-ink);}
.pn.rel-root .rel-dropdown button:hover{background:var(--pn-bg);}

/* Cards dos alunos */
.pn.rel-root .rel-grid{gap:14px;}
.pn.rel-root .rel-card{border:1.5px solid var(--pn-line);border-radius:18px;padding:16px;}
.pn.rel-root .rel-card:hover{transform:translate(-2px,-2px);border-color:var(--pn-ink);box-shadow:4px 4px 0 var(--pn-ink);}
.pn.rel-root .rel-av{border-radius:12px;border:2px solid var(--pn-ink);background:var(--pn-coral);font-family:var(--pn-display);font-weight:800;}
.pn.rel-root .rel-av.violet{background:#7A5FE0;}
.pn.rel-root .rel-av.green{background:var(--pn-green);}
.pn.rel-root .rel-av.blue{background:var(--pn-sky);}
.pn.rel-root .rel-av.pink{background:#D9488B;}
.pn.rel-root .rel-av.amber{background:var(--pn-sun);color:var(--pn-ink);}
.pn.rel-root .rel-stu b{font-family:var(--pn-display);font-weight:700;font-size:15px;letter-spacing:-.01em;}
.pn.rel-root .rel-status.todo{background:var(--pn-cream);color:#7A4F00;}
.pn.rel-root .rel-status.todo .dot{background:#C98A10;}
.pn.rel-root .rel-status.review{background:var(--pn-pink);color:#A3301F;}
.pn.rel-root .rel-status.done{background:var(--pn-green-soft);color:var(--pn-green);}
.pn.rel-root .rel-progress{height:8px;background:var(--pn-bg);}
.pn.rel-root .rel-progress i{background:var(--pn-green);}
.pn.rel-root .rel-card-foot{border-top:1.5px dashed var(--pn-line);}
.pn.rel-root .rel-btn-card{border:2px solid var(--pn-ink);border-radius:10px;font-weight:700;color:var(--pn-ink);}
.pn.rel-root .rel-btn-card:hover{background:var(--pn-bg);}
.pn.rel-root .rel-btn-card.dark{background:var(--pn-ink);border-color:var(--pn-ink);color:#fff;}
.pn.rel-root .rel-btn-card.dark:hover{background:var(--pn-ink);filter:none;}
.pn.rel-root .rel-btn-card.accent{background:var(--pn-green);border-color:var(--pn-ink);color:#fff;box-shadow:2px 2px 0 var(--pn-ink);}
.pn.rel-root .rel-btn-card.accent:hover{filter:none;transform:translate(-1px,-1px);box-shadow:3px 3px 0 var(--pn-ink);}
.pn.rel-root .rel-bulk{background:var(--pn-cream);border:2px dashed var(--pn-ink);}
.pn.rel-root .rel-bulk-icon{background:var(--pn-green);box-shadow:none;border:2px solid var(--pn-ink);}
.pn.rel-root .rel-bulk h3{font-family:var(--pn-display);font-weight:800;}

/* Finalizados */
.pn.rel-root .rel-history{border:1.5px solid var(--pn-line);border-radius:16px;}
.pn.rel-root .rel-h-row:hover{background:var(--pn-bg)!important;}
.pn.rel-root .rel-h-av{border-radius:10px;font-family:var(--pn-display);font-weight:800;}
.pn.rel-root .rel-h-icon{border:1.5px solid var(--pn-line);}

/* Botões do visual Painel e Sofia flutuante */
.pn.rel-root .pn-btn{border:2px solid var(--pn-ink);}
.pn.rel-root .pn-btn:not(.primary):not(.ink){background:var(--pn-surface);}
.pn.rel-root .es-title{font-family:var(--pn-display);font-weight:700;color:var(--pn-ink);letter-spacing:-.01em;}

/* Janelas */
.pn.rel-root .rel-modal-bg{background:rgba(20,22,31,.55);z-index:70;}
.pn.rel-root .rel-modal{border:2px solid var(--pn-ink);border-radius:20px;box-shadow:6px 6px 0 var(--pn-ink);}
.pn.rel-root .rel-modal h3{font-family:var(--pn-display);font-weight:800;letter-spacing:-.03em;}
.pn.rel-root .rel-modal-body{background:var(--paper-2);border:1.5px solid var(--pn-line);}
.pn.rel-root h1,.pn.rel-root h2,.pn.rel-root h3{font-family:var(--pn-display);}

@media (max-width:1100px){
  .pn.rel-root .rel-grid{grid-template-columns:repeat(2,minmax(0,1fr));}
}
@media (max-width:860px){
  .pn.rel-root .rel-page{padding:16px 16px 120px;}
  .rel-title{font-size:28px;}
  .rel-actions{grid-template-columns:minmax(0,1fr);gap:10px;}
  .pn.rel-root .rel-action{min-height:72px;padding:12px;}
  .rel-action .ic{width:42px;height:42px;}
  .pn.rel-root .rel-kpis{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}
  .pn.rel-root .rel-kpi{grid-template-columns:minmax(0,1fr);grid-template-areas:"ic" "lb" "nm";padding:10px;row-gap:4px;}
  .pn.rel-root .rel-kpi-foot{display:none;}
  .pn.rel-root .rel-kpi-num{text-align:left;font-size:22px;}
  .pn.rel-root .rel-kpi-label{font-size:10px;}
  .pn.rel-root .rel-sec-head{margin:22px 0 0;}
  .pn.rel-root .rel-grid{grid-template-columns:minmax(0,1fr);}
  .pn.rel-root .rel-sofia-bubble{display:none!important;}
}
`;
