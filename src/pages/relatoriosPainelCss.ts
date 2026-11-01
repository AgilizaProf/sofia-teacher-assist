// Visual "Painel" da página de Pareceres (/relatorios).
// Vem depois do CSS original da página e só troca a aparência:
// ações à esquerda, lista ao lado, resumo escuro no topo.

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

/* Layout: ações à esquerda, conteúdo ao lado */
.rel-layout{display:grid;grid-template-columns:260px minmax(0,1fr);gap:24px;align-items:start;}
.rel-side{position:sticky;top:88px;display:flex;flex-direction:column;gap:10px;}
.rel-side-title{font-family:var(--pn-display);font-weight:700;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--pn-muted);margin:6px 0 2px;}
.rel-side-title:first-child{margin-top:0;}
.rel-side-actions{display:flex;flex-direction:column;gap:10px;}
.rel-side-actions .pn-btn{width:100%;justify-content:flex-start;font-size:14.5px;}
.rel-side-actions .pn-btn svg{width:17px;height:17px;}
.pn.rel-root .rel-side-editor{width:100%;justify-content:flex-start;height:44px;padding:0 16px;border-radius:12px;
  border:2px solid var(--pn-ink);box-shadow:3px 3px 0 var(--pn-ink);background:var(--pn-surface);color:var(--pn-ink);
  font-family:var(--pn-body);font-weight:700;font-size:14.5px;}
.pn.rel-root .rel-side-editor:hover{background:var(--pn-surface);transform:translate(-1px,-1px);box-shadow:4px 4px 0 var(--pn-ink);}
.rel-content{min-width:0;}

/* Situação (KPIs) empilhada no painel */
.pn.rel-root .rel-kpis{grid-template-columns:minmax(0,1fr);gap:8px;margin-top:0;}
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
  .rel-layout{grid-template-columns:220px minmax(0,1fr);gap:18px;}
  .pn.rel-root .rel-hero-grid{grid-template-columns:1fr;}
  .pn.rel-root .rel-grid{grid-template-columns:repeat(2,minmax(0,1fr));}
}
@media (max-width:860px){
  .pn.rel-root .rel-page{padding:16px 16px 120px;}
  .rel-layout{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;}
  .rel-layout > *,.rel-side > *,.rel-content > *{min-width:0;}
  .rel-side,.rel-content{display:contents;}
  .pn.rel-root .rel-hero{order:1;padding:18px;border-radius:18px;}
  .rel-side-title{display:none;}
  .rel-side-actions{order:2;flex-direction:row;overflow-x:auto;gap:8px;padding:2px 4px 6px 2px;scrollbar-width:none;}
  .rel-side-actions::-webkit-scrollbar{display:none;}
  .rel-side-actions .pn-btn,.pn.rel-root .rel-side-editor{width:auto;flex:none;white-space:nowrap;height:40px;font-size:13.5px;}
  .pn.rel-root .rel-kpis{order:3;}
  .pn.rel-root .rel-content > *{order:4;}
  .pn.rel-root .rel-content > .rel-hero{order:1;}
  .pn.rel-root .rel-sec-head{margin:10px 0 0;}
  .pn.rel-root .rel-grid{grid-template-columns:minmax(0,1fr);}
  .pn.rel-root .rel-hero h1{font-size:26px;}
  .pn.rel-root .rel-hero-cta{display:flex!important;flex-direction:column;align-items:stretch;}
  .pn.rel-root .rel-btn-primary,.pn.rel-root .rel-btn-ghost{width:100%;justify-content:center;}
}
`;
