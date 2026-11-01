// Visual "Painel" da página Agenda (/agenda).
// Vem depois do CSS original da página e só troca a aparência:
// contador pequeno no topo, ações em cartões com nome e explicação,
// situação da agenda em linha e o calendário com as cores do Painel.

export const agPainelCss = `
.pn.ag-root{
  --primary:#14161F;--primary-dark:#14161F;--primary-deep:#14161F;
  --accent:#0B7A55;--accent-warm:#0B7A55;--accent-soft:#CDEFE2;
  --success:#0B7A55;--warn:#C98A10;--danger:#F2604B;--info:#3D8BFD;
  --bg:#EDF0F5;--card:#FFFFFF;--text:#14161F;--text-mute:#596074;
  --border:#D6DBE5;--border-soft:#E3E7EE;
  font-family:var(--pn-body);background:var(--pn-bg);
}
.pn.ag-root .ag-app{display:block;min-height:0;max-width:1240px;margin:0 auto;}
.pn.ag-root .ag-content{padding:12px 24px 64px;}

/* Topo */
.ag-top{padding:22px 24px 0;}
.ag-ptitle{margin:14px 0 0;font-family:var(--pn-display);font-weight:800;font-size:34px;letter-spacing:-.045em;line-height:1.1;}
.ag-block-title{margin:24px 0 10px;font-family:var(--pn-display);font-weight:700;font-size:17px;letter-spacing:-.02em;}
.pn.ag-root .ag-top .ag-actions{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;align-items:stretch;}
.pn.ag-root .ag-top .ag-actions > div{position:relative;display:flex;}
.pn.ag-root .ag-action{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:12px;min-height:84px;
  background:var(--pn-surface);border:2px solid var(--pn-ink);border-radius:16px;box-shadow:3px 3px 0 var(--pn-ink);color:var(--pn-ink);
  font-family:var(--pn-body);cursor:pointer;transition:transform .12s,box-shadow .12s;}
.pn.ag-root .ag-action:hover{transform:translate(-1px,-1px);box-shadow:5px 5px 0 var(--pn-ink);}
.pn.ag-root .ag-action:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--pn-ink);}
.pn.ag-root .ag-action:disabled{opacity:.6;cursor:default;transform:none;}
.pn.ag-root .ag-action.main{background:var(--pn-green);color:#fff;}
.ag-action .ic{flex:none;width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:21px;
  border:1.5px solid var(--pn-ink);background:var(--pn-green-soft);color:var(--pn-green);}
.ag-action .ic.sky{background:var(--pn-blue-soft);}
.ag-action .ic.sun{background:var(--pn-cream);}
.ag-action .ic.coral{background:var(--pn-pink);color:#A3301F;}
.ag-action .ic.lilac{background:var(--pn-lilac);color:#3B2A8C;}
.pn.ag-root .ag-action.main .ic{background:var(--pn-sun);color:var(--pn-ink);}
.ag-action .tx{min-width:0;display:flex;flex-direction:column;gap:3px;}
.ag-action b{font-family:var(--pn-display);font-weight:700;font-size:15px;letter-spacing:-.02em;line-height:1.2;}
.ag-action small{font-size:12.5px;line-height:1.35;color:var(--pn-muted);}
.ag-action.main small{color:#D4F3E6;}
.pn.ag-root .ag-action > span:last-child:not(.tx){margin-left:auto;}

/* Situação (radar) */
.pn.ag-root .ag-radar-card{border:1.5px solid var(--pn-line);border-radius:14px;}
.pn.ag-root .ag-radar-card:hover{border-color:var(--pn-ink);box-shadow:none;transform:none;}
.pn.ag-root .ag-radar-count{font-family:var(--pn-display);font-weight:800;letter-spacing:-.03em;font-size:26px;}
.pn.ag-root .ag-radar-count small{font-family:var(--pn-body);}

/* Calendário e lateral */
.pn.ag-root .ag-drag-hint{background:var(--pn-surface);color:var(--pn-muted);border:1.5px dashed var(--pn-line);box-shadow:none;font-weight:600;}
.pn.ag-root .ag-drag-hint-ic{background:var(--pn-green-soft);color:var(--pn-green);}
.pn.ag-root .ag-cal-card,.pn.ag-root .ag-up-card{border:1.5px solid var(--pn-line);border-radius:18px;}
.pn.ag-root .ag-cal-month,.pn.ag-root .ag-up-title,.pn.ag-root .ag-mobile-day-label{font-family:var(--pn-display);font-weight:800;letter-spacing:-.03em;}
.pn.ag-root .ag-cal-view.active{background:var(--pn-ink);color:#fff;box-shadow:none;}
.pn.ag-root .ag-btn{border:2px solid var(--pn-ink);border-radius:10px;font-weight:700;}
.pn.ag-root .ag-btn.primary{background:var(--pn-green);color:#fff;border-color:var(--pn-ink);box-shadow:2px 2px 0 var(--pn-ink);}
.pn.ag-root .ag-btn.primary:hover{box-shadow:3px 3px 0 var(--pn-ink);}
.pn.ag-root h1,.pn.ag-root h2,.pn.ag-root h3{font-family:var(--pn-display);}

@media(max-width:1180px){
  .pn.ag-root .ag-top .ag-actions{grid-template-columns:repeat(3,minmax(0,1fr));}
}
@media(max-width:860px){
  .ag-top{padding:16px 16px 0;}
  .ag-ptitle{font-size:28px;}
  .pn.ag-root .ag-top .ag-actions{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
  .pn.ag-root .ag-action{flex-direction:column;align-items:flex-start;gap:8px;min-height:0;}
  .ag-action .ic{width:38px;height:38px;font-size:18px;}
  .ag-action b{font-size:14.5px;}
  .ag-action small{font-size:12px;}
  .pn.ag-root .ag-content{padding:10px 16px 120px!important;}
}
`;
