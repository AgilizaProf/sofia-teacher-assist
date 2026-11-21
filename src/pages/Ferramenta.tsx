import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PainelNav, painelTokensCss } from "@/components/painel/PainelNav";
import { TempoChip, tempoChipCss } from "@/components/painel/TempoChip";
import { supabase } from "@/integrations/supabase/client";
import { guardarNaBiblioteca, type ResultadoGuardar, type TipoBiblioteca } from "@/lib/biblioteca";

// Página do app que abriga uma ferramenta completa (Jogos e atividades interativas, Questões)
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

// Habilidades BNCC que o professor já planejou para cada turma (planos de aula e trilhas).
// A Sofia das Questões usa isto para sugerir habilidades ao montar um simulado.
type PlanejamentoTurma = { turma: string; ano: string; codigos: string[]; quando: string };

type AprofNuvem = {
  get: (key: string) => Promise<Snapshot>;
  set: (key: string, data: unknown) => Promise<boolean>;
  usuario: () => Promise<string | null>;
  planejamento: () => Promise<PlanejamentoTurma[]>;
  relatar: (relato: unknown) => Promise<boolean>;
  guardar: (item: unknown) => Promise<ResultadoGuardar>;
};

// Só estas chaves podem ser lidas ou gravadas pelas ferramentas (lista branca).
// simulados_dados: Questões (questoes.html) e a página antiga simulados.html.
// jogos_dados: Jogos e atividades interativas (jogos.html).
const CHAVES_FERRAMENTAS = ["simulados_dados", "jogos_dados"] as const;

function chavePermitida(key: unknown): key is (typeof CHAVES_FERRAMENTAS)[number] {
  return typeof key === "string" && (CHAVES_FERRAMENTAS as readonly string[]).includes(key);
}

const RE_BNCC = /EF\d{2}[A-Z]{2}\d{2}/g;

// Os planos guardam as habilidades em lugares diferentes conforme a origem (plano de aula,
// atividade PCD, trilha): procuramos os códigos BNCC no conteúdo inteiro.
function codigosBncc(valor: unknown): string[] {
  const achados =
    JSON.stringify(valor ?? "")
      .toUpperCase()
      .match(RE_BNCC) ?? [];
  return [...new Set(achados)];
}

function texto(v: unknown): string {
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
}

async function planejamentoPorTurma(uid: string): Promise<PlanejamentoTurma[]> {
  const out: PlanejamentoTurma[] = [];
  const [planos, trilhas] = await Promise.all([
    supabase
      .from("planos_aula")
      .select("data, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("trilhas")
      .select("id, turma, ano_escolar, data, updated_at")
      .eq("user_id", uid)
      .order("updated_at", { ascending: false })
      .limit(60),
  ]);
  for (const p of planos.data ?? []) {
    const d = (p.data ?? {}) as Record<string, unknown>;
    const codigos = codigosBncc(d);
    if (codigos.length)
      out.push({ turma: texto(d.turma), ano: texto(d.ano), codigos, quando: p.created_at });
  }
  const lista = trilhas.data ?? [];
  if (lista.length) {
    const { data: semanas } = await supabase
      .from("trilha_semanas")
      .select("trilha_id, habilidades_bncc")
      .eq("user_id", uid)
      .in(
        "trilha_id",
        lista.map((t) => t.id),
      );
    for (const t of lista) {
      const daTrilha = (semanas ?? [])
        .filter((s) => s.trilha_id === t.id)
        .map((s) => s.habilidades_bncc);
      const codigos = codigosBncc([t.data, daTrilha]);
      if (codigos.length)
        out.push({ turma: t.turma ?? "", ano: t.ano_escolar ?? "", codigos, quando: t.updated_at });
    }
  }
  return out.sort((a, b) => (a.quando < b.quando ? 1 : -1));
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
  // Relato de questão com erro: vai para Administração > Erros, onde a equipe do
  // AgilizaProf corrige o banco. Antes ficava só na conta da professora.
  async relatar(relato) {
    const r = (relato ?? {}) as Record<string, unknown>;
    const txt = (v: unknown, n = 200) => (typeof v === "string" || typeof v === "number" ? String(v).slice(0, n) : "");
    const uid = await usuarioId();
    const { error } = await supabase.from("platform_errors").insert({
      user_id: uid,
      route: "/questoes",
      severity: "info",
      message: `Relato de questão ${txt(r.qid, 40)}: ${txt(r.tipo, 40)}${r.detalhe ? ` · ${txt(r.detalhe, 800)}` : ""}`,
      metadata: {
        tipo: "relato_questao",
        qid: txt(r.qid, 40),
        ano: txt(r.ano, 10),
        disc: txt(r.disc, 10),
        problema: txt(r.tipo, 40),
        letra_sugerida: txt(r.letra, 2),
        gabarito_atual: txt(r.gabarito, 2),
        enunciado: txt(r.enunciado, 200),
        detalhe: txt(r.detalhe, 800),
      },
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
    });
    return !error;
  },
  // Guarda um simulado ou jogo na Minha Biblioteca do app.
  async guardar(item) {
    const r = (item ?? {}) as Record<string, unknown>;
    const tipos: TipoBiblioteca[] = ["simulado", "ficha", "jogo", "atividade"];
    const tipo = tipos.includes(r.tipo as TipoBiblioteca) ? (r.tipo as TipoBiblioteca) : "simulado";
    const txt = (v: unknown, n = 160) => (typeof v === "string" || typeof v === "number" ? String(v).slice(0, n) : "");
    return guardarNaBiblioteca({
      tipo,
      refId: txt(r.refId, 80) || null,
      titulo: txt(r.titulo, 160) || "Sem título",
      ano: txt(r.ano, 20) || null,
      componente: txt(r.componente, 80) || null,
      habilidades: Array.isArray(r.habilidades) ? r.habilidades.map((h) => txt(h, 20)).filter(Boolean).slice(0, 30) : [],
    });
  },
  // só leitura, e só da conta de quem está logado
  async planejamento() {
    const uid = await usuarioId();
    if (!uid) return [];
    try {
      return await planejamentoPorTurma(uid);
    } catch {
      return [];
    }
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
        // Testado: câmera (leitor QR), tela cheia, provas que abrem em nova aba e downloads continuam
        // funcionando. Como a ferramenta precisa do mesmo domínio (allow-same-origin) para usar a ponte,
        // isto é uma camada a mais (bloqueia navegar a página do app, por exemplo), não um isolamento total.
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads allow-forms allow-modals"
      />
    </div>
  );
}
