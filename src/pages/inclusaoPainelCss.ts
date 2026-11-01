// Visual "Painel" da página de Inclusão (/inclusao).
// Vem depois do CSS original da página e só troca a aparência:
// contador pequeno no topo, ações e seções do aluno em cartões com nome
// e explicação, e o card escuro de "próximo passo" vira uma faixa clara.

export const incPainelCss = `
.pn.inc-root{
  --primary:#14161F;--primary-dark:#14161F;--accent:#0B7A55;--accent-warm:#0B7A55;--accent-soft:#CDEFE2;
  --success:#0B7A55;--warn:#C98A10;--danger:#F2604B;
  --bg:#EDF0F5;--card:#FFFFFF;--text:#14161F;--muted:#596074;--border:#D6DBE5;
  font-family:var(--pn-body);background:var(--pn-bg);
}
.pn.inc-root h1,.pn.inc-root h2,.pn.inc-root h3,.pn.inc-root h4{font-family:var(--pn-display);letter-spacing:-.03em;}
.pn.inc-root .inc-app{display:block;min-height:0;max-width:1180px;margin:0 auto;}
.pn.inc-root .inc-main{padding-top:0;}
.pn.inc-root .inc-content{padding:22px 24px 64px;}

/* Topo e blocos */
.inc-title{margin:14px 0 0!important;font-weight:800;font-size:34px;letter-spacing:-.045em!important;line-height:1.1;}
.pn.inc-root .inc-block-title{margin:24px 0 10px;font-weight:700;font-size:17px;letter-spacing:-.02em;}
.inc-block-sub{margin:-4px 0 0!important;color:var(--pn-muted);font-size:14px;}

/* Cartões de ação e de seção */
.inc-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;}
.inc-sections{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;}
.pn.inc-root .inc-action,.pn.inc-root .inc-section{display:flex;align-items:center;gap:12px;text-align:left;padding:12px;min-height:80px;
  background:var(--pn-surface);border:2px solid var(--pn-ink);border-radius:16px;box-shadow:3px 3px 0 var(--pn-ink);color:var(--pn-ink);
  cursor:pointer;text-decoration:none;transition:transform .12s,box-shadow .12s;}
.pn.inc-root .inc-action:hover,.pn.inc-root .inc-section:hover{transform:translate(-1px,-1px);box-shadow:5px 5px 0 var(--pn-ink);}
.pn.inc-root .inc-action:active,.pn.inc-root .inc-section:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--pn-ink);}
.pn.inc-root .inc-action.main,.pn.inc-root .inc-section.active{background:var(--pn-green);color:#fff;}
.inc-action .ic,.inc-section .ic{flex:none;width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;
  border:1.5px solid var(--pn-ink);background:var(--pn-green-soft);color:var(--pn-green);}
.inc-section .ic{width:38px;height:38px;border-radius:10px;}
.inc-action .ic.sky,.inc-section .ic.sky{background:var(--pn-blue-soft);color:#1F5FC8;}
.inc-action .ic.sun,.inc-section .ic.sun{background:var(--pn-cream);color:#7A4F00;}
.inc-action .ic.ink{background:var(--pn-ink);color:#fff;}
.inc-section .ic.coral{background:var(--pn-pink);color:#A3301F;}
.inc-section .ic.lilac{background:var(--pn-lilac);color:#3B2A8C;}
.pn.inc-root .inc-action.main .ic,.pn.inc-root .inc-section.active .ic{background:var(--pn-sun);color:var(--pn-ink);}
.inc-action .tx,.inc-section .tx{min-width:0;display:flex;flex-direction:column;gap:3px;}
.inc-action b,.inc-section b{font-family:var(--pn-display);font-weight:700;font-size:15px;letter-spacing:-.02em;line-height:1.2;}
.inc-action small,.inc-section small{font-size:12.5px;line-height:1.35;color:var(--pn-muted);}
.inc-section small{font-size:12px;}
.inc-action.main small,.inc-section.active small{color:#D4F3E6;}

/* Situação de todos os alunos */
.inc-resumo{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;}
.inc-res{display:grid;grid-template-columns:30px minmax(0,1fr) auto;grid-template-areas:"ic lb nm" "ic sm nm";column-gap:10px;row-gap:1px;align-items:center;
  background:var(--pn-surface);border:1.5px solid var(--pn-line);border-radius:14px;padding:10px 12px;}
.inc-res .ic{grid-area:ic;width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:var(--pn-green-soft);color:var(--pn-green);}
.inc-res .ic.sky{background:var(--pn-blue-soft);color:#1F5FC8;}
.inc-res .ic.sun{background:var(--pn-cream);color:#7A4F00;}
.inc-res .ic.coral{background:var(--pn-pink);color:#A3301F;}
.inc-res .lb{grid-area:lb;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--pn-muted);}
.inc-res small{grid-area:sm;font-size:11.5px;color:var(--pn-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.inc-res b{grid-area:nm;font-family:var(--pn-display);font-weight:800;font-size:24px;letter-spacing:-.03em;text-align:right;}
.inc-res b span{font-family:var(--pn-body);font-size:12px;font-weight:600;color:var(--pn-muted);letter-spacing:0;}

/* Lista de alunos */
.pn.inc-root .list-actions{display:none;}
.pn.inc-root .list-toolbar{margin-top:12px;}
.pn.inc-root .list-search input{border:1.5px solid var(--pn-line);border-radius:12px;font-size:14px;}
.pn.inc-root .list-search input:focus{border-color:var(--pn-ink);}
.pn.inc-root .list-filter{border:1.5px solid var(--pn-line);border-radius:10px;background:var(--pn-surface);padding:9px 12px;font-weight:600;}
.pn.inc-root .student-card{background:var(--pn-surface);border:1.5px solid var(--pn-line);border-radius:18px;}
.pn.inc-root .student-card:hover{border-color:var(--pn-ink);box-shadow:4px 4px 0 var(--pn-ink);transform:translate(-2px,-2px);background:var(--pn-surface);}
.pn.inc-root .student-card h3,.pn.inc-root .student-card b{font-family:var(--pn-display);}

/* Aluno aberto */
.pn.inc-root .hero-l h1{font-family:var(--pn-display);font-weight:800;letter-spacing:-.045em;}
.pn.inc-root .hero-l h1 .age{font-family:var(--pn-body);}
.pn.inc-root .diagnostic{background:var(--pn-pink);border:1.5px solid var(--pn-ink);color:var(--pn-ink);}
.pn.inc-root .diagnostic .pulse{background:var(--pn-coral);animation:none;}
.pn.inc-root .tag{border:1.5px solid var(--pn-line);}
.pn.inc-root .btn{border-radius:12px;font-weight:700;font-size:13.5px;border:2px solid var(--pn-ink)!important;box-shadow:3px 3px 0 var(--pn-ink);}
.pn.inc-root .btn:hover{transform:translate(-1px,-1px);box-shadow:4px 4px 0 var(--pn-ink);}
.pn.inc-root .btn-secondary,.pn.inc-root .btn-secondary:hover{background:var(--pn-surface);color:var(--pn-ink);}
.pn.inc-root .btn-primary,.pn.inc-root .btn-primary:hover{background:var(--pn-green)!important;color:#fff!important;}
.pn.inc-root .kpi{border:1.5px solid var(--pn-line);border-radius:14px;}
.pn.inc-root .kpi-value{font-family:var(--pn-display);font-weight:800;letter-spacing:-.03em;}
.pn.inc-root .kpi-accent{background:var(--pn-green-soft);border:1.5px solid var(--pn-green);color:var(--pn-ink);}
.pn.inc-root .kpi-accent .kpi-label,.pn.inc-root .kpi-accent .kpi-sub{color:#064E36;}
.pn.inc-root .kpi-accent .kpi-value{color:var(--pn-ink);}

/* Próximo passo: faixa clara e compacta em vez do card grande escuro */
.pn.inc-root .action-card{background:var(--pn-cream);border:1.5px solid var(--pn-ink);border-radius:16px;box-shadow:none;color:var(--pn-ink);
  padding:14px 16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
.pn.inc-root .action-card .ac-head{margin:0;flex:1 1 280px;}
.pn.inc-root .action-card .ac-head .sofia{background:var(--pn-green);box-shadow:none;font-family:var(--pn-display);}
.pn.inc-root .action-card .ac-head-txt b{color:var(--pn-ink);font-size:14.5px;font-family:var(--pn-display);}
.pn.inc-root .action-card .ac-head-txt span{color:#5A4A1F;font-size:13px;}
.pn.inc-root .action-card .ac-tag{background:var(--pn-ink);color:#fff;}
.pn.inc-root .action-card .ac-title,.pn.inc-root .action-card .ac-body,.pn.inc-root .action-card .ac-strats{display:none;}
.pn.inc-root .action-card .btn-ghost-dark{background:var(--pn-surface);border:2px solid var(--pn-ink);border-radius:12px;color:var(--pn-ink);font-weight:700;}

@media(max-width:1024px){
  .inc-resumo{grid-template-columns:repeat(2,minmax(0,1fr));}
  .inc-actions{grid-template-columns:repeat(2,minmax(0,1fr));}
  .inc-sections{grid-template-columns:repeat(3,minmax(0,1fr));}
}
@media(max-width:860px){
  .pn.inc-root .inc-content{padding:16px 16px 120px;}
  .inc-title{font-size:28px;}
  .inc-actions,.inc-sections{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
  .inc-resumo{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
  .inc-res{grid-template-columns:minmax(0,1fr);grid-template-areas:"ic" "lb" "nm" "sm";row-gap:4px;padding:10px;}
  .inc-res b{text-align:left;font-size:22px;}
  .inc-res .lb{font-size:10px;}
  .pn.inc-root .inc-action,.pn.inc-root .inc-section{flex-direction:column;align-items:flex-start;gap:8px;min-height:0;}
  .inc-action .ic{width:38px;height:38px;}
  .inc-action b,.inc-section b{font-size:14.5px;}
  .inc-action small,.inc-section small{font-size:12px;}
}
`;
