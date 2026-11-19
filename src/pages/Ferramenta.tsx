import { useEffect, useRef, useState } from "react";
import { PainelNav, painelTokensCss } from "@/components/painel/PainelNav";
import { TempoChip, tempoChipCss } from "@/components/painel/TempoChip";
import { supabase } from "@/integrations/supabase/client";

// Página do app que abriga uma ferramenta completa (Jogos e atividades interativas, Questões)
// no visual "Painel": menu do app, contador pequeno no topo, título e a
// ferramenta logo abaixo, ocupando o resto da tela.
//
// O conteúdo da ferramenta não fica mais em public/: vem da edge function
// `ferramenta`, que só entrega para quem está logado (antes o banco de
// questões, com gabaritos, abria sem login em /ferramentas/questoes.html).
// O app coloca esse conteúdo no iframe com srcdoc, que herda o domínio do app.
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
.tl-head{flex:none;width:100%;max-width:1240px;margin:0 auto;padding:22px 24px 0;}
.tl-title{margin:14px 0 0;font-family:var(--pn-display);font-weight:800;font-size:34px;letter-spacing:-.045em;line-height:1.1;color:var(--pn-ink);}
.tl-sub{margin:4px 0 0;max-width:72ch;font-size:14.5px;line-height:1.45;color:var(--pn-muted);}
.tl-frame{flex:1;min-height:0;width:100%;border:0;display:block;background:var(--pn-bg);}
.tl-aviso{flex:1;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;color:var(--pn-muted);font-size:15px;}
.tl-frame.tl-imersivo{position:fixed;inset:0;width:100vw;height:100dvh;z-index:1000;}
@media (max-width:860px){
  .pn.tl-root{padding-bottom:calc(96px + env(safe-area-inset-bottom,0px));}
  .tl-head{padding:16px 16px 0;}
  .tl-title{font-size:28px;margin-top:14px;}
  .tl-sub{display:none;}
}
`;

type Snapshot = { data: unknown; updated_at: string } | null;

type AprofNuvem = {
  get: (key: string) => Promise<Snapshot>;
  set: (key: string, data: unknown) => Promise<boolean>;
  usuario: () => Promise<string | null>;
};

// Só estas chaves podem ser lidas ou gravadas pelas ferramentas (lista branca).
// simulados_dados: Questões (questoes.html) e a página antiga simulados.html.
// jogos_dados: Jogos e atividades interativas (jogos.html).
const CHAVES_FERRAMENTAS = ["simulados_dados", "jogos_dados"] as const;

function chavePermitida(key: unknown): key is (typeof CHAVES_FERRAMENTAS)[number] {
  return typeof key === "string" && (CHAVES_FERRAMENTAS as readonly string[]).includes(key);
}

async function usuarioId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

const aprofNuvem: AprofNuvem = {
  async get(key) {
    if (!chavePermitida(key)) throw new Error("Chave não permitida");
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
    if (!chavePermitida(key)) throw new Error("Chave não permitida");
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
  // id da conta, para a ferramenta separar a cópia local de cada professora no mesmo navegador
  async usuario() {
    return usuarioId();
  },
};

export type NomeFerramenta = "questoes" | "jogos";

type EstadoConteudo =
  | { tipo: "carregando" }
  | { tipo: "pronto"; html: string }
  | { tipo: "erro"; mensagem: string };

async function carregarFerramenta(nome: NomeFerramenta): Promise<string> {
  const { data: sessao } = await supabase.auth.getSession();
  if (!sessao.session) throw new Error("Entre na sua conta para abrir esta ferramenta.");
  const { data, error } = await supabase.functions.invoke(`ferramenta?nome=${nome}`, {
    method: "GET",
  });
  if (error || typeof data !== "string" || !data.trim()) {
    throw new Error("Não consegui abrir a ferramenta agora. Tente de novo em instantes.");
  }
  return data;
}

export function Ferramenta({
  titulo,
  sub,
  ferramenta,
}: {
  titulo: string;
  sub: string;
  ferramenta: NomeFerramenta;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [imersivo, setImersivo] = useState(false);
  const [conteudo, setConteudo] = useState<EstadoConteudo>({ tipo: "carregando" });

  useEffect(() => {
    let ativo = true;
    setConteudo({ tipo: "carregando" });
    carregarFerramenta(ferramenta).then(
      (html) => ativo && setConteudo({ tipo: "pronto", html }),
      (e) =>
        ativo &&
        setConteudo({ tipo: "erro", mensagem: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      ativo = false;
    };
  }, [ferramenta]);

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
      {conteudo.tipo === "carregando" && <div className="tl-aviso">Abrindo a ferramenta…</div>}
      {conteudo.tipo === "erro" && (
        <div className="tl-aviso" role="alert">
          {conteudo.mensagem}
        </div>
      )}
      {conteudo.tipo === "pronto" && (
        <iframe
          ref={frameRef}
          className={"tl-frame" + (imersivo ? " tl-imersivo" : "")}
          srcDoc={conteudo.html}
          title={titulo}
          allow="fullscreen; camera; autoplay"
          // Testado: câmera (leitor QR), tela cheia, provas que abrem em nova aba e downloads continuam
          // funcionando. Como a ferramenta precisa do mesmo domínio (allow-same-origin) para usar a ponte,
          // isto é uma camada a mais (bloqueia navegar a página do app, por exemplo), não um isolamento total.
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads allow-forms allow-modals"
        />
      )}
    </div>
  );
}
