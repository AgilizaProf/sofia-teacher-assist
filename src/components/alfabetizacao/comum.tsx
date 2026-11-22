// Peças comuns da tela "Criança alfabetizada" (leitura e escrita).
import type { Cartao } from "@/lib/alfabetizacao/tipos";

export type AlunoAlfa = { id: string; nome: string; turma: string; ano: string };

export const COR_LEITURA: Record<number, string> = {
  1: "#FBD5D0",
  2: "#FDE2C4",
  3: "#FFF1B8",
  4: "#DDF0C8",
  5: "#C5EBD9",
  6: "#8FD9BC",
};
export const COR_ESCRITA: Record<number, string> = {
  1: "#FBD5D0",
  2: "#FDE2C4",
  3: "#FFF1B8",
  4: "#C5EBD9",
  5: "#8FD9BC",
};

/** O cartão do jeito que a criança lê (letra grande). */
export function CartaoVisual({ c, pequeno }: { c: Cartao; pequeno?: boolean }) {
  const cls = "af-cartao" + (pequeno ? " peq" : "");
  if (c.tipo === "silabas")
    return (
      <div className={cls + " sil"}>
        {c.itens.map((s, k) => (
          <span key={k}>{s}</span>
        ))}
      </div>
    );
  if (c.tipo === "palavras")
    return (
      <div className={cls + " pal"}>
        {c.itens.map((s, k) => (
          <span key={k}>{s}</span>
        ))}
      </div>
    );
  if (c.tipo === "frases")
    return (
      <div className={cls + " fra"}>
        {c.itens.map((s, k) => (
          <p key={k}>{s}</p>
        ))}
      </div>
    );
  return (
    <div className={cls + " txt"}>
      <b>{c.titulo}</b>
      <p>{c.texto}</p>
    </div>
  );
}

export function Seta({ antes, agora }: { antes: number; agora: number }) {
  if (agora > antes)
    return (
      <span className="af-seta up" title="Subiu de nível">
        ▲ subiu
      </span>
    );
  if (agora < antes)
    return (
      <span className="af-seta down" title="Caiu de nível">
        ▼ caiu
      </span>
    );
  return (
    <span className="af-seta eq" title="Mesmo nível">
      = igual
    </span>
  );
}

export const alfaCss = `
html{scrollbar-gutter:stable;}
.af{min-height:100dvh;padding-bottom:110px;}
.af *{box-sizing:border-box;}
.af-wrap{max-width:1180px;margin:0 auto;padding:22px 24px 0;}
.af-hero{padding:4px 0 0;}
.af-eyebrow{display:inline-flex;align-items:center;gap:7px;padding:5px 10px 5px 8px;border-radius:999px;background:var(--pn-surface);border:1.5px solid var(--pn-ink);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--pn-green);}
.af-eyebrow svg{width:15px;height:15px;}
.af-title{margin:12px 0 6px;font-family:var(--pn-display);font-weight:800;font-size:36px;letter-spacing:-.045em;line-height:1.04;}
.af-sub{margin:0;color:var(--pn-muted);font-size:15.5px;line-height:1.5;max-width:66ch;}
.af-tabs{display:inline-flex;gap:4px;flex-wrap:wrap;margin:18px 0 14px;padding:5px;border-radius:16px;background:var(--pn-surface);border:1.5px solid var(--pn-line);max-width:100%;}
.af-tabs button{height:40px;padding:0 16px;border-radius:11px;border:0;background:transparent;font-family:inherit;font-weight:700;font-size:14.5px;color:var(--pn-muted);cursor:pointer;}
.af-tabs button:hover{color:var(--pn-ink);background:var(--pn-bg);}
.af-tabs button[aria-selected="true"]{background:var(--pn-ink);color:#fff;}
.af-chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:14px 0 0;}
.af-chips>span{font-size:13.5px;font-weight:700;color:var(--pn-muted);}
.af-chips button{height:34px;padding:0 12px;border-radius:9px;border:1.5px solid var(--pn-line);background:#fff;font-family:inherit;font-size:13.5px;font-weight:700;color:var(--pn-ink);cursor:pointer;}
.af-chips button[aria-pressed="true"]{background:var(--pn-green);border-color:var(--pn-ink);color:#fff;}
.af-card{background:var(--pn-surface);border:1.5px solid var(--pn-line);border-radius:16px;padding:16px;margin-bottom:14px;}
.af-card.forte{border:2px solid var(--pn-ink);box-shadow:4px 4px 0 var(--pn-ink);border-radius:20px;}
.af-card h2{margin:0 0 4px;font-family:var(--pn-display);font-size:19px;letter-spacing:-.03em;}
.af-card h3{margin:0 0 6px;font-family:var(--pn-display);font-size:16px;}
.af-card p.dica{margin:0 0 10px;color:var(--pn-muted);font-size:14px;line-height:1.5;}
.af-g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.af-barras{display:grid;gap:6px;}
.af-barra{display:grid;grid-template-columns:minmax(120px,190px) 1fr 34px;gap:8px;align-items:center;font-size:13.5px;}
.af-barra i{display:block;height:20px;border-radius:6px;border:1.5px solid var(--pn-ink);min-width:3px;}
.af-barra .tr{background:var(--pn-bg);border-radius:6px;}
.af-barra b{text-align:right;font-variant-numeric:tabular-nums;}
.af-nums{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 14px;}
.af-num{position:relative;padding:14px 16px;border-radius:16px;background:var(--pn-surface);border:1.5px solid var(--pn-ink);}
.af-num i{position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;}
.af-num.n1 i{background:var(--pn-blue-soft);}
.af-num.n2 i{background:var(--pn-cream);}
.af-num.n3 i{background:var(--pn-green-soft);}
.af-num.n4 i{background:var(--pn-pink);}
.af-num b{display:block;font-family:var(--pn-display);font-size:32px;line-height:1;letter-spacing:-.04em;}
.af-num span{display:block;margin-top:6px;font-size:13.5px;color:var(--pn-muted);}
.af-tabela{width:100%;border-collapse:collapse;font-size:14px;}
.af-tabela th{text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--pn-muted);padding:6px 8px;border-bottom:1.5px solid var(--pn-line);}
.af-tabela td{padding:8px;border-bottom:1px solid var(--pn-line);vertical-align:middle;}
.af-tabela tr:last-child td{border-bottom:0;}
.af-rol{min-width:0;}
.af-nv{display:inline-block;padding:3px 8px;border-radius:7px;border:1.5px solid var(--pn-ink);font-size:12.5px;font-weight:700;white-space:nowrap;}
.af-nv.vazio{border-color:var(--pn-line);color:var(--pn-muted);background:#fff;font-weight:500;}
.af-seta{font-size:12px;font-weight:700;margin-left:6px;white-space:nowrap;}
.af-seta.up{color:#0B7A55;}.af-seta.down{color:#B42318;}.af-seta.eq{color:var(--pn-muted);}
.af-mini{display:inline-flex;align-items:center;justify-content:center;height:34px;padding:0 10px;border-radius:9px;border:1.5px solid var(--pn-ink);background:#fff;font-family:inherit;font-size:13px;font-weight:700;color:var(--pn-ink);cursor:pointer;white-space:nowrap;}
.af-mini:hover{background:var(--pn-bg);}
.af-mini.perigo{border-color:#B42318;color:#B42318;}
.af-acoes{display:flex;gap:6px;flex-wrap:wrap;}
.af-linha{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;}
.af-campo{display:grid;gap:4px;font-size:13px;font-weight:700;color:var(--pn-muted);flex:1;min-width:160px;}
.af-campo select,.af-campo input,.af-campo textarea,.af-in{height:44px;padding:0 12px;border-radius:11px;border:1.5px solid var(--pn-line);background:#fff;font-family:inherit;font-size:15px;color:var(--pn-ink);width:100%;}
.af-campo textarea{height:auto;padding:10px 12px;line-height:1.5;resize:vertical;}
.af-campo select:focus,.af-campo input:focus,.af-campo textarea:focus,.af-in:focus{outline:2px solid var(--pn-green);outline-offset:1px;}
.af-botoes{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;align-items:center;}
.af-link{border:0;background:none;padding:0;font-family:inherit;font-size:14px;font-weight:700;color:var(--pn-muted);text-decoration:underline;text-underline-offset:3px;cursor:pointer;}
.af-fl{display:grid;gap:6px;margin-top:10px;}
.af-fl-l{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:12px;background:var(--pn-bg);border:1.5px solid transparent;}
.af-fl-l.duv{background:var(--pn-cream);border-color:var(--pn-ink);}
.af-fl-l .nm{min-width:0;}
.af-fl-l .nm b{display:block;font-size:15px;}
.af-fl-l .nm span{display:block;font-size:13px;color:var(--pn-muted);}
.af-fl-l .nv{display:flex;gap:5px;flex:none;}
.af-fl-l .nv button{width:38px;height:38px;border-radius:10px;border:1.5px solid var(--pn-line);background:#fff;font-family:var(--pn-display);font-weight:800;font-size:15px;color:var(--pn-ink);cursor:pointer;}
.af-fl-l .nv button[aria-pressed="true"]{border-color:var(--pn-ink);box-shadow:2px 2px 0 var(--pn-ink);}
.af-aviso{padding:10px 12px;border-radius:12px;background:var(--pn-blue-soft);font-size:14px;line-height:1.5;margin:10px 0;}
.af-aviso.sol{background:var(--pn-cream);}
.af-vazio{padding:18px;border:1.5px dashed var(--pn-line);border-radius:14px;color:var(--pn-muted);font-size:14.5px;text-align:center;line-height:1.5;}
.af-cartao{border:2px dashed #667;border-radius:16px;background:#fff;padding:18px;color:#111;}
.af-cartao.sil{display:grid;grid-template-columns:repeat(3,1fr);gap:16px 8px;text-align:center;font-size:34px;font-weight:800;letter-spacing:1px;}
.af-cartao.pal{display:grid;grid-template-columns:repeat(2,1fr);gap:16px 8px;text-align:center;font-size:28px;font-weight:800;}
.af-cartao.fra p{margin:0 0 14px;font-size:25px;line-height:1.45;font-weight:600;}
.af-cartao.fra p:last-child{margin:0;}
.af-cartao.txt b{display:block;font-size:20px;margin-bottom:8px;}
.af-cartao.txt p{margin:0;font-size:21px;line-height:1.7;}
.af-cartao.peq{padding:10px;border-width:1.5px;border-radius:12px;}
.af-cartao.peq.sil{font-size:17px;gap:6px 4px;}
.af-cartao.peq.pal{font-size:15px;gap:6px 4px;}
.af-cartao.peq.fra p{font-size:13.5px;margin-bottom:6px;font-weight:500;}
.af-cartao.peq.txt b{font-size:14px;margin-bottom:4px;}
.af-cartao.peq.txt p{font-size:12.5px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden;}
.af-grav{display:grid;justify-items:center;gap:10px;padding:16px 0 4px;}
.af-tempo{font-family:var(--pn-display);font-size:40px;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.03em;}
.af-rec{display:inline-flex;align-items:center;gap:8px;font-weight:700;color:#B42318;}
.af-rec i{width:12px;height:12px;border-radius:50%;background:#D92D20;animation:afpisca 1s infinite;}
@keyframes afpisca{50%{opacity:.25;}}
@media (prefers-reduced-motion: reduce){.af-rec i{animation:none;}}
.af-pals{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0;}
.af-pals button{min-height:40px;padding:4px 10px;border-radius:9px;border:1.5px solid var(--pn-ink);font-family:inherit;font-size:16px;font-weight:700;color:#111;cursor:pointer;display:grid;justify-items:center;line-height:1.15;}
.af-pals button small{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;}
.af-pals .ok{background:#C5EBD9;}
.af-pals .troca{background:#FDE2C4;}
.af-pals .pulou{background:#FBD5D0;}
.af-pals .nao{background:#fff;border-color:var(--pn-line);color:var(--pn-muted);}
.af-leg{display:flex;gap:12px;flex-wrap:wrap;font-size:13px;color:var(--pn-muted);}
.af-leg span{display:inline-flex;align-items:center;gap:5px;}
.af-leg i{width:14px;height:14px;border-radius:4px;border:1.5px solid var(--pn-ink);display:inline-block;}
.af-sug{padding:14px;border-radius:14px;border:2px solid var(--pn-ink);background:var(--pn-green-soft);margin-top:12px;}
.af-sug b.t{display:block;font-size:12.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--pn-green);}
.af-sug .n{font-family:var(--pn-display);font-size:22px;font-weight:800;letter-spacing:-.03em;margin:2px 0;}
.af-sug p{margin:0 0 10px;font-size:14.5px;line-height:1.5;}
.af-foto{max-width:100%;max-height:380px;border-radius:12px;border:1.5px solid var(--pn-line);display:block;}
.af-erro{display:grid;grid-template-columns:1fr 1fr 1.4fr 40px;gap:6px;margin-bottom:6px;align-items:center;}
.af-erro input,.af-erro select{height:40px;padding:0 10px;border-radius:9px;border:1.5px solid var(--pn-line);font-family:inherit;font-size:14.5px;background:#fff;width:100%;min-width:0;}
.af-erro button{height:40px;border-radius:9px;border:1.5px solid var(--pn-line);background:#fff;cursor:pointer;font-size:16px;font-weight:700;color:#B42318;}
.af-crit{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;}
.af-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;}
.af-item{position:relative;background:var(--pn-surface);border:1.5px solid var(--pn-line);border-radius:14px;padding:10px;display:grid;gap:8px;align-content:start;cursor:pointer;text-align:left;font-family:inherit;color:inherit;}
.af-item[aria-pressed="true"]{border:2px solid var(--pn-green);background:#F2FBF7;}
.af-item .cab{display:flex;justify-content:space-between;gap:8px;font-size:12.5px;color:var(--pn-muted);font-weight:700;}
.af-item .cab em{font-style:normal;color:var(--pn-green);}
.af-pag{display:flex;gap:10px;align-items:center;justify-content:center;margin:14px 0;font-size:14px;color:var(--pn-muted);}
.af-barra-fixa{position:sticky;bottom:76px;z-index:20;display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 14px;border-radius:14px;background:var(--pn-ink);color:#fff;font-size:14.5px;font-weight:700;margin-top:12px;}
.af-barra-fixa .sp{flex:1;}
.af-bg{position:fixed;inset:0;z-index:80;background:rgba(20,22,31,.5);display:flex;align-items:center;justify-content:center;padding:16px;}
.af-modal{width:100%;max-width:720px;max-height:90vh;overflow:auto;scrollbar-width:none;background:var(--pn-surface);border:2px solid var(--pn-ink);border-radius:20px;box-shadow:6px 6px 0 var(--pn-ink);padding:20px;}
.af-modal::-webkit-scrollbar{display:none;}
.af-modal h2{margin:0;font-family:var(--pn-display);font-size:22px;letter-spacing:-.03em;}
.af-hist{display:grid;gap:8px;margin:8px 0 14px;}
.af-hist>div{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:8px 10px;border-radius:11px;background:var(--pn-bg);font-size:14px;}
.af-hist .sp{flex:1;}
.af-graf{display:flex;align-items:flex-end;gap:6px;height:74px;margin:6px 0 10px;}
.af-graf span{flex:1;max-width:44px;border:1.5px solid var(--pn-ink);border-radius:6px 6px 0 0;display:flex;align-items:flex-start;justify-content:center;font-size:12px;font-weight:700;padding-top:2px;}
/* tela estreita: a tabela não cabe, então cada aluno vira um cartão (sem rolar de lado) */
@media (max-width:880px){
  .af-tabela thead{display:none;}
  .af-tabela,.af-tabela tbody{display:block;}
  .af-tabela tr{display:block;padding:12px 0;border-bottom:1px solid var(--pn-line);}
  .af-tabela tr:last-child{border-bottom:0;padding-bottom:0;}
  .af-tabela td{display:block;padding:0;border:0;margin-bottom:6px;}
  .af-tabela td:first-child b{font-size:16px;}
  .af-tabela td[data-rot]::before{content:attr(data-rot) ": ";font-size:13px;font-weight:700;color:var(--pn-muted);margin-right:4px;}
  .af-tabela td:last-child{margin:10px 0 0;}
}
@media (max-width:760px){
  .af-wrap{padding:14px 14px 0;}
  .af-title{font-size:26px;margin:10px 0 6px;}
  .af-sub{font-size:14.5px;}
  .af-g2{grid-template-columns:1fr;}
  .af-card{padding:14px;border-radius:14px;}
  .af-card.forte{border-radius:18px;}
  /* abas em duas linhas, sem rolar de lado */
  .af-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:14px 0 12px;padding:5px;}
  .af-tabs button{height:44px;padding:0 6px;}
  .af-chips button{height:40px;}
  /* dedo: alvos de toque de 44px e letras de 16px (sem zoom no iPhone) */
  .af-mini{height:44px;padding:0 12px;font-size:14px;}
  .af-link{padding:12px 4px;}
  .af-campo select,.af-campo input,.af-campo textarea,.af-in,.af-erro input,.af-erro select{font-size:16px;}
  .af-campo{min-width:100%;}
  .af-botoes{flex-direction:column;align-items:stretch;}
  .af-botoes .pn-btn{width:100%;height:50px;}
  .af-botoes .af-link{align-self:center;}
  .af-linha>.pn-btn{width:100%;}
  .af-nums{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
  .af-num{min-width:0;}
  .af-num{padding:12px;}
  .af-num i{width:30px;height:30px;top:10px;right:10px;}
  .af-num i svg{width:16px;height:16px;}
  .af-num b{font-size:26px;}
  .af-erro{grid-template-columns:1fr 1fr 44px;}
  .af-erro input,.af-erro select,.af-erro button{height:44px;}
  .af-erro select{grid-column:1 / 3;grid-row:2;}
  .af-erro button{grid-row:1 / 3;height:100%;}
  .af-cartao{padding:14px;}
  .af-cartao.sil{font-size:30px;}
  .af-cartao.pal{font-size:23px;}
  .af-cartao.fra p{font-size:22px;}
  .af-cartao.txt p{font-size:19px;line-height:1.65;}
  .af-pals button{min-height:46px;font-size:17px;padding:4px 12px;}
  .af-barra{grid-template-columns:110px 1fr 28px;}
  .af-acoes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;}
  .af-acoes .af-mini{padding:0 4px;font-size:13.5px;}
  /* o app deixa toda tabela rolar de lado no celular; aqui cada aluno já é um cartão */
  .af-tabela{overflow:visible;}
  .af-nv{white-space:normal;}
  .af-fl-l{flex-direction:column;align-items:stretch;gap:8px;}
  .af-fl-l .nv{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px;}
  .af-fl-l .nv button{width:auto;height:44px;}
  /* cartões em duas colunas */
  .af-grid{grid-template-columns:1fr 1fr;gap:8px;}
  .af-item{padding:8px;}
  .af-item .cab{flex-direction:column;gap:2px;font-size:12px;}
  .af-cartao.peq{padding:8px;}
  .af-cartao.peq.sil{font-size:15px;}
  .af-cartao.peq.pal{font-size:12.5px;grid-template-columns:1fr;gap:4px;}
  .af-cartao.peq.fra p{font-size:12.5px;}
  .af-barra-fixa{bottom:calc(84px + env(safe-area-inset-bottom));}
  .af-barra-fixa .af-mini{height:40px;}
  /* ficha do aluno sobe de baixo, como uma gaveta */
  .af-bg{align-items:flex-end;padding:0;}
  .af-modal{max-width:none;max-height:92dvh;border-radius:20px 20px 0 0;border-width:2px 0 0;box-shadow:none;padding:16px 14px calc(18px + env(safe-area-inset-bottom));}
  .af-hist>div{padding:10px;}
}
@media (max-width:359px){
  .af-acoes{grid-template-columns:1fr 1fr;}
  .af-acoes .af-mini:last-child{grid-column:1/-1;}
}
`;
