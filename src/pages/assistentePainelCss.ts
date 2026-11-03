// Visual "Painel" do chat da Sofia (/assistente).
// Layout de app de conversa: cabeçalho, mensagens com rolagem própria e a
// caixa de texto sempre visível embaixo. Funciona de 320px até telas grandes.

export const assistentePainelCss = `
.as-root{min-height:100dvh;background:var(--pn-bg);color:var(--pn-ink);font-family:var(--pn-body);font-size:15px;line-height:1.5;}
.as-root button{font-family:inherit;cursor:pointer;color:inherit;}
.as-root h1,.as-root h2,.as-root h3{margin:0;font-family:var(--pn-display);letter-spacing:-.025em;}
.as-root p{margin:0;}
body:has(.as-root){padding-bottom:0!important;}

.as-shell{display:grid;grid-template-columns:minmax(0,1fr) 300px;max-width:1280px;margin:0 auto;height:calc(100dvh - 64px);}
.as-shell.hist-collapsed{grid-template-columns:minmax(0,1fr) 0;}
.as-main{display:flex;flex-direction:column;min-width:0;min-height:0;}

/* Cabeçalho */
.as-head{display:flex;align-items:center;gap:12px;padding:16px 24px 10px;}
.as-id{display:flex;align-items:center;gap:12px;min-width:0;}
.as-avatar{flex:none;width:44px;height:44px;border-radius:12px;background:var(--pn-green);color:#fff;border:2px solid var(--pn-ink);
  box-shadow:2px 2px 0 var(--pn-ink);display:grid;place-items:center;}
.as-id h1{font-size:22px;font-weight:800;line-height:1.1;}
.as-id p{font-size:13px;color:var(--pn-muted);display:flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.as-id .dot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--pn-green);}
.as-head-actions{margin-left:auto;display:flex;align-items:center;gap:8px;}
.as-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:40px;padding:0 12px;border-radius:10px;border:2px solid var(--pn-ink);
  background:var(--pn-surface);box-shadow:2px 2px 0 var(--pn-ink);font-weight:700;font-size:14px;transition:transform .12s,box-shadow .12s;white-space:nowrap;}
.as-btn:hover{transform:translate(-1px,-1px);box-shadow:3px 3px 0 var(--pn-ink);}
.as-btn:active{transform:translate(1px,1px);box-shadow:1px 1px 0 var(--pn-ink);}
.as-btn.icon{width:40px;padding:0;}
.as-btn.green{background:var(--pn-green);color:#fff;}
.as-btn:disabled{opacity:.5;cursor:default;transform:none;box-shadow:2px 2px 0 var(--pn-ink);}
.as-hist-btn{display:none!important;}

/* Contexto */
.as-ctx{display:flex;align-items:center;gap:8px;margin:0 24px 6px;padding:8px 10px 8px 14px;background:var(--pn-surface);border:1.5px solid var(--pn-line);border-radius:14px;min-width:0;}
.as-ctx-label{font-size:13px;color:var(--pn-muted);font-weight:600;white-space:nowrap;}
.as-ctx-text{font-size:13px;color:var(--pn-ink);min-width:0;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.as-ctx-text b{font-weight:700;}
.as-ctx .sofia-active-chip{flex:none;}
.as-ctx-edit{flex:none;margin-left:auto;display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 12px;border-radius:9px;border:1.5px solid var(--pn-ink);
  background:var(--pn-green-soft);font-size:13px;font-weight:700;}
.as-ctx-edit:hover{background:#B8E6D3;}

/* Mensagens */
.as-scroll{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;}
.as-inner{width:100%;max-width:800px;margin:0 auto;padding:0 24px;}
.as-list{display:flex;flex-direction:column;gap:16px;padding:14px 0 18px;}
.as-msg{display:flex;gap:10px;align-items:flex-start;min-width:0;}
.as-msg.user{justify-content:flex-end;}
.as-msg-av{flex:none;width:30px;height:30px;border-radius:9px;background:var(--pn-green);color:#fff;border:1.5px solid var(--pn-ink);display:grid;place-items:center;margin-top:2px;}
.as-bubble{min-width:0;max-width:100%;}
.as-msg.user .as-bubble{max-width:82%;background:var(--pn-ink);color:#fff;border-radius:16px 16px 4px 16px;padding:10px 14px;white-space:pre-wrap;overflow-wrap:anywhere;}
.as-msg.assistant .as-bubble{flex:1;background:var(--pn-surface);border:1.5px solid var(--pn-line);border-radius:4px 16px 16px 16px;padding:12px 16px;}
.as-msg.err .as-bubble{background:#FFF4F2;border-color:var(--pn-coral);}
.as-err-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.as-err-row span{flex:1;min-width:180px;color:#7A1F12;font-weight:600;}

/* Texto da Sofia (Markdown) */
.as-md{overflow-wrap:anywhere;font-size:15px;line-height:1.6;}
.as-md > *:first-child{margin-top:0!important;}
.as-md > *:last-child{margin-bottom:0!important;}
.as-md p{margin:0 0 10px;}
.as-md h1,.as-md h2,.as-md h3,.as-md h4{font-family:var(--pn-display);font-weight:700;letter-spacing:-.02em;line-height:1.25;margin:18px 0 8px;}
.as-md h1{font-size:20px;}.as-md h2{font-size:18px;}.as-md h3{font-size:16px;}.as-md h4{font-size:15px;}
.as-md ul,.as-md ol{margin:4px 0 12px;padding-left:24px;}
.as-md ul{list-style:disc;}
.as-md ol{list-style:decimal;}
.as-md li::marker{color:var(--pn-green);font-weight:700;}
.as-md li{margin:3px 0;}
.as-md li > p{margin:0;}
.as-md strong{font-weight:700;}
.as-md a{color:var(--pn-green);font-weight:600;text-decoration:underline;text-underline-offset:2px;}
.as-md blockquote{margin:10px 0;padding:8px 12px;border-left:4px solid var(--pn-sun);background:#FFF8E6;border-radius:0 10px 10px 0;}
.as-md code{background:var(--pn-bg);padding:1px 6px;border-radius:5px;font-size:13px;}
.as-md pre{background:var(--pn-bg);padding:10px 12px;border-radius:10px;overflow-x:auto;white-space:pre-wrap;}
.as-md hr{border:0;border-top:1.5px dashed var(--pn-line);margin:14px 0;}
.as-md table{display:block;max-width:100%;overflow-x:auto;border-collapse:collapse;}

.as-note{margin-top:10px;padding:8px 10px;border-radius:10px;font-size:13px;}
.as-note.lang{background:var(--pn-green-soft);color:#064E36;}
.as-note.warn{background:#FFF1CC;color:#5C3D00;display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.as-tools{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;}
.as-tool{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 10px;border-radius:8px;border:1.5px solid var(--pn-line);background:var(--pn-surface);font-size:13px;font-weight:600;color:var(--pn-muted);}
.as-tool:hover{border-color:var(--pn-ink);color:var(--pn-ink);}
.as-tool.ok{border-color:var(--pn-green);color:var(--pn-green);}

.as-quick{display:flex;flex-wrap:wrap;gap:8px;margin:-4px 0 0 40px;}
.as-quick button{min-height:42px;padding:8px 14px;border-radius:999px;border:2px solid var(--pn-ink);background:var(--pn-surface);font-size:14px;font-weight:600;
  box-shadow:2px 2px 0 var(--pn-ink);text-align:left;transition:transform .12s,box-shadow .12s;}
.as-quick button:hover{background:var(--pn-green-soft);transform:translate(-1px,-1px);box-shadow:3px 3px 0 var(--pn-ink);}

.as-typing{display:inline-flex;align-items:center;gap:10px;padding:10px 14px;background:var(--pn-surface);border:1.5px solid var(--pn-line);border-radius:4px 16px 16px 16px;color:var(--pn-muted);font-size:14px;}
.as-dots{display:inline-flex;gap:4px;}
.as-dots i{width:7px;height:7px;border-radius:50%;background:var(--pn-green);animation:asBlink 1.2s infinite ease-in-out;}
.as-dots i:nth-child(2){animation-delay:.2s;}.as-dots i:nth-child(3){animation-delay:.4s;}
@keyframes asBlink{0%,80%,100%{opacity:.3;transform:scale(.8);}40%{opacity:1;transform:scale(1);}}
.as-caret::after{content:"";display:inline-block;width:8px;height:16px;margin-left:2px;vertical-align:-3px;background:var(--pn-green);animation:asCaret 1s steps(2) infinite;}
@keyframes asCaret{50%{opacity:0;}}

/* Tela inicial */
.as-empty{padding:18px 0 22px;}
.as-hello{font-size:34px;font-weight:800;letter-spacing:-.045em;line-height:1.1;}
.as-hello em{font-style:normal;color:var(--pn-green);}
.as-sub{margin-top:8px!important;color:var(--pn-muted);font-size:15.5px;max-width:620px;}
.as-tasks-title{margin:22px 0 10px!important;font-size:17px;font-weight:700;}
.as-tasks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;}
.as-task{display:flex;align-items:center;gap:12px;text-align:left;padding:12px;min-height:78px;background:var(--pn-surface);border:2px solid var(--pn-ink);border-radius:16px;
  box-shadow:3px 3px 0 var(--pn-ink);transition:transform .12s,box-shadow .12s;}
.as-task:hover{transform:translate(-1px,-1px);box-shadow:5px 5px 0 var(--pn-ink);}
.as-task:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--pn-ink);}
.as-task .ic{flex:none;width:42px;height:42px;border-radius:12px;display:grid;place-items:center;font-size:20px;border:1.5px solid var(--pn-ink);}
.as-task .tx{min-width:0;display:flex;flex-direction:column;gap:2px;}
.as-task b{font-family:var(--pn-display);font-weight:700;font-size:15px;letter-spacing:-.02em;line-height:1.2;}
.as-task small{font-size:12.5px;line-height:1.35;color:var(--pn-muted);}

/* Caixa de texto */
.as-composer-wrap{flex:none;padding:8px 0 14px;background:linear-gradient(180deg,rgba(237,240,245,0) 0,var(--pn-bg) 14px);}
.as-composer{display:flex;align-items:flex-end;gap:8px;background:var(--pn-surface);border:2px solid var(--pn-ink);border-radius:16px;padding:8px 8px 8px 14px;box-shadow:3px 3px 0 var(--pn-ink);}
.as-composer:focus-within{box-shadow:3px 3px 0 var(--pn-green);}
.as-composer textarea{flex:1;min-width:0;border:0;outline:0;resize:none;background:transparent;font-family:inherit;font-size:16px;line-height:1.45;color:var(--pn-ink);
  padding:7px 0;max-height:200px;min-height:24px;}
.as-composer textarea::placeholder{color:#8A90A2;}
.as-send{flex:none;width:44px;height:44px;border-radius:12px;border:2px solid var(--pn-ink);background:var(--pn-green);color:#fff;display:grid;place-items:center;}
.as-send:disabled{background:#C5CAD6;color:#fff;cursor:default;}
.as-foot{margin-top:8px!important;font-size:12px;color:var(--pn-muted);text-align:center;}

/* Histórico */
.as-hist{display:flex;flex-direction:column;min-height:0;background:var(--pn-surface);border-left:1.5px solid var(--pn-line);overflow:hidden;}
.hist-collapsed .as-hist{border-left:0;}
.as-hist-head{display:flex;align-items:center;gap:8px;padding:16px 14px 10px;}
.as-hist-head h2{font-size:17px;font-weight:700;flex:1;}
.as-hist-x{width:36px;height:36px;border-radius:9px;border:1.5px solid var(--pn-line);background:var(--pn-surface);display:grid;place-items:center;color:var(--pn-muted);}
.as-hist-x:hover{border-color:var(--pn-ink);color:var(--pn-ink);}
.as-hist-search{margin:0 14px 8px;display:flex;align-items:center;gap:8px;border:1.5px solid var(--pn-line);border-radius:10px;padding:0 10px;height:40px;}
.as-hist-search input{flex:1;min-width:0;border:0;outline:0;font-size:15px;background:transparent;font-family:inherit;}
.as-hist-list{flex:1;overflow-y:auto;padding:0 8px 12px;}
.as-hist-sec{padding:12px 8px 4px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--pn-muted);font-weight:700;}
.as-hist-empty{padding:10px 8px;font-size:13.5px;color:var(--pn-muted);}
.as-h{position:relative;display:flex;align-items:center;gap:8px;width:100%;padding:9px 40px 9px 10px;border-radius:10px;border:1.5px solid transparent;background:transparent;text-align:left;}
.as-h:hover{background:var(--pn-bg);}
.as-h.on{background:var(--pn-green-soft);border-color:var(--pn-green);}
.as-h-t{min-width:0;flex:1;}
.as-h-t b{display:block;font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.as-h-t small{font-size:12px;color:var(--pn-muted);}
.as-h-del{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:30px;height:30px;border-radius:8px;border:0;background:transparent;color:#9AA0B0;display:grid;place-items:center;opacity:0;}
.as-h:hover .as-h-del,.as-h:focus-within .as-h-del{opacity:1;}
.as-h-del:hover{background:#FFE1DC;color:#B42318;}
@media (hover:none){.as-h-del{opacity:1;}}
.as-hist-clear{margin:0 14px 14px;height:38px;border-radius:10px;border:1.5px dashed var(--pn-line);background:transparent;color:var(--pn-muted);font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;}
.as-hist-clear:hover{border-color:#B42318;color:#B42318;}
.as-hist-bg{display:none;}
.as-hist-close{display:none!important;}
.as-composer textarea:focus,.as-composer textarea:focus-visible{outline:none!important;box-shadow:none!important;}

/* Janelas (contexto e ajuda) */
.as-modal-bg{position:fixed;inset:0;z-index:300;background:rgba(20,22,31,.5);display:flex;align-items:center;justify-content:center;padding:16px;}
.as-modal{width:100%;max-width:580px;max-height:min(88dvh,820px);display:flex;flex-direction:column;background:var(--pn-surface);border:2px solid var(--pn-ink);border-radius:18px;box-shadow:6px 6px 0 var(--pn-ink);overflow:hidden;}
.as-modal-head{display:flex;align-items:flex-start;gap:12px;padding:18px 20px 12px;border-bottom:1.5px solid var(--pn-line);}
.as-modal-head h3{font-size:20px;font-weight:800;}
.as-modal-head p{font-size:13.5px;color:var(--pn-muted);margin-top:2px!important;}
.as-modal-body{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:18px;}
.as-modal-foot{display:flex;justify-content:flex-end;gap:8px;padding:12px 20px calc(12px + env(safe-area-inset-bottom,0px));border-top:1.5px solid var(--pn-line);}
.ctx-section{display:flex;flex-direction:column;gap:8px;}
.ctx-section-label{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--pn-muted);}
.ctx-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.ctx-field-inline{display:flex;flex-direction:column;gap:6px;}
.ctx-field-inline > label{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--pn-muted);}
.as-root select,.as-modal textarea{width:100%;height:44px;padding:0 12px;border-radius:10px;border:1.5px solid var(--pn-line);font-size:15px;font-family:inherit;background:var(--pn-surface);color:var(--pn-ink);}
.as-modal textarea{height:auto;padding:10px 12px;resize:vertical;}
.as-root select:focus,.as-modal textarea:focus{outline:none;border-color:var(--pn-green);box-shadow:0 0 0 3px rgba(11,122,85,.15);}
.ctx-chips{display:flex;flex-wrap:wrap;gap:6px;}
.ctx-chip,.ctx-chip-add{min-height:36px;padding:6px 12px;border-radius:999px;border:1.5px solid var(--pn-line);background:var(--pn-surface);font-size:13.5px;font-weight:500;color:var(--pn-ink);}
.ctx-chip:hover{border-color:var(--pn-ink);}
.ctx-chip.on{background:var(--pn-green);border-color:var(--pn-ink);color:#fff;font-weight:700;}
.ctx-chip-add{border-style:dashed;color:var(--pn-muted);}
.ctx-chip-input{display:inline-flex;align-items:center;gap:4px;padding:2px 4px 2px 12px;border-radius:999px;border:1.5px solid var(--pn-green);}
.ctx-chip-input input{border:none;outline:none;font-size:14px;background:transparent;width:140px;font-family:inherit;}
.ctx-chip-input button{border:none;background:var(--pn-green);color:#fff;font-size:12.5px;font-weight:700;border-radius:999px;padding:6px 10px;}
.ctx-pcd-list{display:flex;flex-wrap:wrap;gap:6px;padding:10px;background:var(--pn-bg);border-radius:10px;}
.ctx-pcd-tag{background:var(--pn-surface);border:1.5px solid var(--pn-line);padding:5px 10px;border-radius:999px;font-size:13px;}
.ctx-turma-list{display:flex;flex-direction:column;gap:8px;}
.ctx-turma-card{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-radius:12px;border:1.5px solid var(--pn-line);background:var(--pn-surface);text-align:left;width:100%;}
.ctx-turma-card:hover{border-color:var(--pn-ink);}
.ctx-turma-card.selected{border:2px solid var(--pn-ink);background:var(--pn-green-soft);box-shadow:2px 2px 0 var(--pn-ink);}
.ctx-turma-card .tname{font-weight:700;font-size:14.5px;}
.ctx-turma-card .tmeta{font-size:12.5px;color:var(--pn-muted);margin-top:2px;}
.ctx-turma-card .tcounts{display:flex;flex-direction:column;align-items:flex-end;gap:2px;font-size:12px;color:var(--pn-muted);white-space:nowrap;}
.ctx-turma-card .tcounts b{font-size:15px;color:var(--pn-green);font-weight:800;}
.ctx-empty-turma{padding:14px;background:var(--pn-bg);border:1.5px dashed var(--pn-line);border-radius:10px;font-size:13.5px;color:var(--pn-muted);}
.ctx-empty-turma a{color:var(--pn-green);font-weight:700;}
.as-steps{display:flex;gap:6px;}
.as-steps span{height:5px;flex:1;border-radius:3px;background:var(--pn-line);}
.as-steps span.on{background:var(--pn-green);}

/* Tablet e celular (menu embaixo) */
@media (max-width:1080px){
  .as-shell,.as-shell.hist-collapsed{grid-template-columns:minmax(0,1fr);height:calc(100dvh - 58px);}
  .as-hist-btn{display:inline-flex!important;}
  .as-hist-close{display:grid!important;}
  .as-collapse-btn{display:none!important;}
  .as-composer-wrap{padding-bottom:calc(92px + env(safe-area-inset-bottom,0px));}
  body.as-composing .pn-bottom{display:none!important;}
  body.as-composing .as-composer-wrap{padding-bottom:calc(10px + env(safe-area-inset-bottom,0px));}
  .as-hist{position:fixed;top:0;right:0;bottom:0;width:min(360px,90vw);z-index:260;transform:translateX(105%);transition:transform .22s ease;border-left:2px solid var(--pn-ink);}
  .as-hist.open{transform:none;}
  .hist-collapsed .as-hist{border-left:2px solid var(--pn-ink);}
  .as-hist-bg{display:block;position:fixed;inset:0;z-index:255;background:rgba(20,22,31,.45);opacity:0;pointer-events:none;transition:opacity .2s;}
  .as-hist-bg.show{opacity:1;pointer-events:auto;}
  .as-tasks{grid-template-columns:repeat(2,minmax(0,1fr));}
}
@media (max-width:640px){
  .as-head{padding:12px 16px 8px;gap:8px;}
  .as-avatar{width:38px;height:38px;}
  .as-id h1{font-size:19px;}
  .as-id p{display:none;}
  .as-head .as-btn .lbl{display:none;}
  .as-head .as-btn{width:40px;padding:0;}
  .as-modal-foot .as-btn{flex:1;}
  .as-ctx{margin:0 16px 4px;padding:6px 6px 6px 12px;}
  .as-ctx .sofia-active-chip{display:none;}
  .as-inner{padding:0 16px;}
  .as-msg-av{display:none;}
  .as-msg.user .as-bubble{max-width:88%;}
  .as-msg.assistant .as-bubble{padding:12px 14px;}
  .as-quick{margin-left:0;}
  .as-hello{font-size:27px;}
  .as-sub{font-size:14.5px;}
  .as-tasks{gap:10px;}
  .as-task{flex-direction:column;align-items:flex-start;gap:8px;min-height:0;padding:12px;}
  .as-task .ic{width:36px;height:36px;font-size:18px;}
  .as-task b{font-size:14.5px;}
  .as-task small{font-size:12px;}
  .ctx-grid2{grid-template-columns:1fr;}
  .as-modal-bg{align-items:flex-end;padding:0;}
  .as-modal{max-width:none;border-radius:18px 18px 0 0;max-height:92dvh;box-shadow:none;border-bottom:0;}
}
@media (max-width:360px){
  .as-ctx-label{display:none;}
  .as-hello{font-size:24px;}
  .as-tasks{grid-template-columns:1fr;}
  .as-task{flex-direction:row;align-items:center;}
}
`;
