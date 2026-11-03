import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PainelNav, painelTokensCss } from "@/components/painel/PainelNav";
import { TempoChip, tempoChipCss } from "@/components/painel/TempoChip";
import { supabase } from "@/integrations/supabase/client";

// Página do app que abriga uma ferramenta completa (Jogos e atividades interativas, Simulados)
// no visual "Painel": menu do app, contador pequeno no topo, título e a
// ferramenta logo abaixo, ocupando o resto da tela.
//
// A ferramenta roda num iframe do mesmo domínio e conversa com o app de dois jeitos:
// - window.aprofNuvem: guarda e lê os dados da ferramenta (turmas, simulados,
//   resultados…) na tabela app_snapshots da conta do professor, para não ficarem
//   presos ao navegador.
// - postMessage {aprofFerramenta:"imersivo", on}: quando um jogo começa (ou o
//   projetor/câmera do simulado abre), o iframe passa a ocupar a tela inteira e
//   volta ao normal quando o professor sai do jogo.
//
// Tela única: assim que o iframe carrega, o cabeçalho da página (contador, título e
// subtítulo) passa a ser desenhado dentro do próprio iframe, no topo da ferramenta.
// Assim a página inteira rola junta, sem um cabeçalho parado em cima e a
// ferramenta rolando sozinha embaixo.

// estilo do cabeçalho; vai também para dentro do iframe junto com os tokens do Painel
const cabCss = `
.tl-head{flex:none;font-family:var(--pn-body);width:100%;max-width:1240px;margin:0 auto;padding:22px 24px 0;box-sizing:border-box;}
.pn .tl-head .tl-title{margin:14px 0 0;padding:0;font-family:var(--pn-display);font-weight:800;font-size:34px;letter-spacing:-.045em;line-height:1.1;color:var(--pn-ink);}
.pn .tl-head .tl-sub{margin:4px 0 0;padding:0;max-width:72ch;font-size:14.5px;line-height:1.45;color:var(--pn-muted);}
@media (max-width:860px){
  .tl-head{padding:16px 16px 0;}
  .pn .tl-head .tl-title{font-size:28px;margin-top:14px;}
  .pn .tl-head .tl-sub{display:none;}
}
`;

const css = `
.pn.tl-root{height:100dvh;display:flex;flex-direction:column;background:var(--pn-bg);font-family:var(--pn-body);overflow:hidden;}
.tl-frame{flex:1;min-height:0;width:100%;border:0;display:block;background:var(--pn-bg);}
.tl-frame.tl-imersivo{position:fixed;inset:0;width:100vw;height:100dvh;z-index:1000;}
@media (max-width:860px){
  .pn.tl-root{padding-bottom:calc(96px + env(safe-area-inset-bottom,0px));}
}
`;

type Snapshot = { data: unknown; updated_at: string } | null;

type AprofNuvem = {
  get: (key: string) => Promise<Snapshot>;
  set: (key: string, data: unknown) => Promise<boolean>;
};

async function usuarioId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

const aprofNuvem: AprofNuvem = {
  async get(key) {
    const uid = await usuarioId();
    if (!uid) return null;
    const { data, error } = await supabase
      .from("app_snapshots")
      .select("data, updated_at")
      .eq("user_id", uid)
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    return (data as Snapshot) ?? null;
  },
  async set(key, value) {
    const uid = await usuarioId();
    if (!uid) return false;
    const { error } = await supabase.from("app_snapshots").upsert(
      [
        {
          user_id: uid,
          key,
          data: JSON.parse(JSON.stringify(value)),
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: "user_id,key" },
    );
    if (error) throw error;
    return true;
  },
};

export function Ferramenta({ titulo, sub, src }: { titulo: string; sub: string; src: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [imersivo, setImersivo] = useState(false);
  // lugar, dentro do iframe, onde o cabeçalho é desenhado (null até o iframe carregar)
  const [cabDentro, setCabDentro] = useState<HTMLElement | null>(null);

  const aoCarregar = () => {
    const doc = frameRef.current?.contentDocument;
    if (!doc?.body) return;
    let estilo = doc.getElementById("aprof-cab-css");
    if (!estilo) {
      estilo = doc.createElement("style");
      estilo.id = "aprof-cab-css";
      estilo.textContent = painelTokensCss + tempoChipCss + cabCss;
      doc.head.appendChild(estilo);
    }
    let lugar = doc.getElementById("aprof-cab");
    if (!lugar) {
      lugar = doc.createElement("div");
      lugar.id = "aprof-cab";
      lugar.className = "pn";
      doc.body.insertBefore(lugar, doc.body.firstChild);
    }
    setCabDentro(lugar);
  };

  // a ponte precisa existir antes do script do iframe rodar: fica pronta já no primeiro render
  if (typeof window !== "undefined") {
    (window as unknown as { aprofNuvem?: AprofNuvem }).aprofNuvem = aprofNuvem;
  }

  // se o iframe terminou de carregar antes do app ficar pronto, o onLoad não chega
  useEffect(() => {
    const doc = frameRef.current?.contentDocument;
    if (doc && doc.readyState === "complete" && doc.location.href !== "about:blank") aoCarregar();
  }, []);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.source !== frameRef.current?.contentWindow) return;
      const d = e.data as { aprofFerramenta?: string; on?: boolean } | null;
      if (d && d.aprofFerramenta === "imersivo") setImersivo(!!d.on);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const cabecalho = (
    <header className="tl-head">
      <div className="pn-strip">
        <TempoChip />
      </div>
      <h1 className="tl-title">{titulo}</h1>
      <p className="tl-sub">{sub}</p>
    </header>
  );

  return (
    <div className="pn tl-root">
      <style>{painelTokensCss + tempoChipCss + cabCss + css}</style>
      <PainelNav />
      {cabDentro ? (imersivo ? null : createPortal(cabecalho, cabDentro)) : cabecalho}
      <iframe
        ref={frameRef}
        onLoad={aoCarregar}
        className={"tl-frame" + (imersivo ? " tl-imersivo" : "")}
        src={src}
        title={titulo}
        allow="fullscreen; camera; autoplay"
      />
    </div>
  );
}
