import { PainelNav, painelTokensCss } from "@/components/painel/PainelNav";
import { TempoChip, tempoChipCss } from "@/components/painel/TempoChip";

// Página do app que abriga uma ferramenta completa (Jogos 2D, Simulados)
// no visual "Painel": menu do app, contador pequeno no topo, título e a
// ferramenta logo abaixo, ocupando o resto da tela.

const css = `
.pn.tl-root{height:100dvh;display:flex;flex-direction:column;background:var(--pn-bg);font-family:var(--pn-body);overflow:hidden;}
.tl-head{flex:none;width:100%;max-width:1240px;margin:0 auto;padding:18px 24px 0;}
.tl-title{margin:12px 0 0;font-family:var(--pn-display);font-weight:800;font-size:34px;letter-spacing:-.045em;line-height:1.1;color:var(--pn-ink);}
.tl-sub{margin:4px 0 0;max-width:72ch;font-size:14.5px;line-height:1.45;color:var(--pn-muted);}
.tl-frame{flex:1;min-height:0;width:100%;border:0;display:block;background:var(--pn-bg);}
@media (max-width:860px){
  .pn.tl-root{padding-bottom:calc(96px + env(safe-area-inset-bottom,0px));}
  .tl-head{padding:12px 16px 0;}
  .tl-title{font-size:26px;margin-top:10px;}
  .tl-sub{display:none;}
}
`;

export function Ferramenta({ titulo, sub, src }: { titulo: string; sub: string; src: string }) {
  return (
    <div className="pn tl-root">
      <style>{painelTokensCss + tempoChipCss + css}</style>
      <PainelNav />
      <div className="tl-head">
        <div className="pn-strip">
          <TempoChip />
        </div>
        <h1 className="tl-title">{titulo}</h1>
        <p className="tl-sub">{sub}</p>
      </div>
      <iframe className="tl-frame" src={src} title={titulo} allow="fullscreen; camera; autoplay" />
    </div>
  );
}
