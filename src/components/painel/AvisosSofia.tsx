import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgenda } from "@/hooks/useAgenda";
import { useInclusaoStudents } from "@/hooks/useInclusaoStudents";
import { usePersistentState } from "@/lib/persist/usePersistentState";
import { useAlfaDados } from "@/lib/alfabetizacao/store";
import { calcularAvisos, type Aviso, type AvisoTipo } from "@/lib/sofia/avisos";
import { trackEvent } from "@/lib/tracking";

// "A Sofia lembra": avisos curtos no Início com o que a professora precisa
// lembrar hoje (agenda, registros e PEI da Inclusão, leitura das crianças).
// Tudo vem dos dados dela; não usa IA nem créditos. Some quando não há nada.

const CHAVE_DISPENSADOS = "aprof_avisos_dispensados";
const VISIVEIS = 3;

function lerDispensados(): Record<string, number> {
  try {
    const bruto = JSON.parse(window.localStorage.getItem(CHAVE_DISPENSADOS) || "{}");
    if (!bruto || typeof bruto !== "object") return {};
    // guarda só os últimos 30 dias, para a lista não crescer para sempre
    const limite = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return Object.fromEntries(
      Object.entries(bruto as Record<string, number>).filter(([, t]) => typeof t === "number" && t > limite),
    );
  } catch {
    return {};
  }
}

function salvarDispensados(d: Record<string, number>) {
  try {
    window.localStorage.setItem(CHAVE_DISPENSADOS, JSON.stringify(d));
  } catch {
    /* navegador sem armazenamento: o aviso só volta na próxima visita */
  }
}

const COR: Record<AvisoTipo, { bg: string; fg: string }> = {
  agenda: { bg: "var(--pn-blue-soft)", fg: "#1F5FD1" },
  registro: { bg: "var(--pn-cream)", fg: "#8A5A00" },
  pei: { bg: "var(--pn-lilac)", fg: "#4B3A9E" },
  leitura: { bg: "var(--pn-green-soft)", fg: "var(--pn-green)" },
};

function Icone({ tipo }: { tipo: AvisoTipo }) {
  const p = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (tipo === "agenda")
    return (
      <svg {...p}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </svg>
    );
  if (tipo === "registro")
    return (
      <svg {...p}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
      </svg>
    );
  if (tipo === "pei")
    return (
      <svg {...p}>
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <path d="M14 3v6h6M9 14h6M9 18h4" />
      </svg>
    );
  return (
    <svg {...p}>
      <path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z" />
      <path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z" />
    </svg>
  );
}

const css = `
.av{margin-top:16px;background:var(--pn-surface);border:1.5px solid var(--pn-line);border-radius:18px;padding:14px 16px;}
.av-h{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;}
.av-h h2{margin:0;font-family:var(--pn-display);font-weight:700;font-size:16px;}
.av-h span{font-size:13px;color:var(--pn-muted);font-weight:600;}
.av-lista{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;}
.av-item{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--pn-line);}
.av-item:first-child{border-top:0;}
.av-ic{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.av-txt{flex:1;min-width:0;font-size:14.5px;line-height:1.4;color:var(--pn-ink);}
.av-acao{flex-shrink:0;height:36px;padding:0 12px;border-radius:9px;border:1.5px solid var(--pn-ink);background:#fff;font-family:inherit;font-size:13.5px;font-weight:700;color:var(--pn-ink);cursor:pointer;white-space:nowrap;}
.av-acao:hover{background:var(--pn-ink);color:#fff;}
.av-x{flex-shrink:0;width:32px;height:32px;border-radius:8px;border:0;background:transparent;color:var(--pn-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;}
.av-x:hover{background:var(--pn-bg);color:var(--pn-ink);}
.av-mais{margin-top:4px;border:0;background:none;padding:6px 0;font-family:inherit;font-size:13.5px;font-weight:700;color:var(--pn-green);cursor:pointer;}
@media (max-width:860px){
  .av{padding:12px 14px;}
  .av-item{flex-wrap:wrap;gap:8px 10px;}
  .av-txt{flex:1 1 calc(100% - 90px);font-size:14px;}
  .av-acao{margin-left:44px;}
}
`;

export function AvisosSofia() {
  const navigate = useNavigate();
  const { events } = useAgenda();
  const { students } = useInclusaoStudents();
  const [registros] = usePersistentState<Record<string, Array<{ when?: string }>>>("inc_reg", {});
  const [peiInclusao] = usePersistentState<Record<string, Record<string, unknown>>>("inc_pei", {});
  const { dados: alfa } = useAlfaDados();
  const { data: alunosComPeiPdi = [] } = useQuery({
    queryKey: ["pei_pdi_alunos"],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase.from("pei_pdi").select("aluno_client_id");
      if (error) return [] as string[];
      return Array.from(new Set((data ?? []).map((r) => r.aluno_client_id)));
    },
  });

  const [dispensados, setDispensados] = useState<Record<string, number>>({});
  const [verTodos, setVerTodos] = useState(false);
  useEffect(() => setDispensados(lerDispensados()), []);

  const avisos = useMemo(() => {
    const todos = calcularAvisos({
      agenda: events,
      alunos: students,
      registros: registros && typeof registros === "object" ? registros : {},
      peiInclusao: peiInclusao && typeof peiInclusao === "object" ? peiInclusao : {},
      alunosComPeiPdi,
      leituras: alfa.leituras,
    });
    return todos.filter((a) => !dispensados[a.id]);
  }, [events, students, registros, peiInclusao, alunosComPeiPdi, alfa.leituras, dispensados]);

  if (avisos.length === 0) return null;

  const dispensar = (a: Aviso) => {
    const novo = { ...lerDispensados(), [a.id]: Date.now() };
    salvarDispensados(novo);
    setDispensados(novo);
    trackEvent("home_aviso_dispensar", { location: "home", tipo: a.tipo });
  };

  const abrir = (a: Aviso) => {
    trackEvent("home_aviso_abrir", { location: "home", tipo: a.tipo });
    navigate({ to: a.to as never, search: (a.search ?? {}) as never });
  };

  const lista = verTodos ? avisos : avisos.slice(0, VISIVEIS);

  return (
    <section className="av" aria-labelledby="av-h">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="av-h">
        <h2 id="av-h">A Sofia lembra</h2>
        <span>{avisos.length === 1 ? "1 aviso" : `${avisos.length} avisos`}</span>
      </div>
      <ul className="av-lista">
        {lista.map((a) => (
          <li key={a.id} className="av-item">
            <span className="av-ic" style={{ background: COR[a.tipo].bg, color: COR[a.tipo].fg }}>
              <Icone tipo={a.tipo} />
            </span>
            <span className="av-txt">{a.texto}</span>
            <button type="button" className="av-acao" onClick={() => abrir(a)}>
              {a.acao}
            </button>
            <button
              type="button"
              className="av-x"
              onClick={() => dispensar(a)}
              aria-label="Dispensar este aviso"
              title="Dispensar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
      {avisos.length > VISIVEIS && (
        <button type="button" className="av-mais" onClick={() => setVerTodos((v) => !v)}>
          {verTodos ? "Mostrar menos" : `Ver mais ${avisos.length - VISIVEIS}`}
        </button>
      )}
    </section>
  );
}
