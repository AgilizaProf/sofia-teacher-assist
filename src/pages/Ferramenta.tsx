import { useEffect, useRef, useState } from "react";
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

const css = `
.pn.tl-root{height:100dvh;display:flex;flex-direction:column;background:var(--pn-bg);font-family:var(--pn-body);overflow:hidden;}
.tl-head{flex:none;width:100%;max-width:1240px;margin:0 auto;padding:18px 24px 0;}
.tl-title{margin:12px 0 0;font-family:var(--pn-display);font-weight:800;font-size:34px;letter-spacing:-.045em;line-height:1.1;color:var(--pn-ink);}
.tl-sub{margin:4px 0 0;max-width:72ch;font-size:14.5px;line-height:1.45;color:var(--pn-muted);}
.tl-frame{flex:1;min-height:0;width:100%;border:0;display:block;background:var(--pn-bg);}
.tl-frame.tl-imersivo{position:fixed;inset:0;width:100vw;height:100dvh;z-index:1000;}
@media (max-width:860px){
  .pn.tl-root{padding-bottom:calc(96px + env(safe-area-inset-bottom,0px));}
  .tl-head{padding:12px 16px 0;}
  .tl-title{font-size:26px;margin-top:10px;}
  .tl-sub{display:none;}
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

  // a ponte precisa existir antes do script do iframe rodar: fica pronta já no primeiro render
  if (typeof window !== "undefined") {
    (window as unknown as { aprofNuvem?: AprofNuvem }).aprofNuvem = aprofNuvem;
  }

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
      <iframe
        ref={frameRef}
        className={"tl-frame" + (imersivo ? " tl-imersivo" : "")}
        src={src}
        title={titulo}
        allow="fullscreen; camera; autoplay"
      />
    </div>
  );
}
