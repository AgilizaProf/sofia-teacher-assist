import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";

// Resumo do "Tempo devolvido a você": abre por cima da página (sem trocar
// de página) e mostra em que partes do app o tempo foi economizado e as
// últimas ações que somaram minutos.

type Linha = { acao: string; minutos: number; motivo: string; created_at: string };

const AREAS: { nome: string; cor: string; acoes: string[] }[] = [
  {
    nome: "Planejamento",
    cor: "#0B7A55",
    acoes: [
      "planejamento_ia",
      "atividade_m1_m2",
      "sofia_semana_atividade",
      "drag_and_drop",
      "replicar_em_turmas",
      "trilha_atividade",
    ],
  },
  { nome: "Pareceres e relatórios", cor: "#3D8BFD", acoes: ["relatorio_ia", "relatorio_aluno"] },
  {
    nome: "Inclusão e PEI",
    cor: "#8B7CF6",
    acoes: [
      "anamnese_baixa",
      "anamnese_alta",
      "pei_aluno",
      "planejamento_inclusao",
      "registro",
      "relatorio_pcd",
    ],
  },
  { nome: "Agenda", cor: "#F2604B", acoes: ["calendario_anexado", "atividade_m4"] },
  {
    nome: "Currículo e turmas",
    cor: "#FFB224",
    acoes: ["curriculo_municipio", "aluno_em_massa_unit", "cadastrar_turma"],
  },
];

function fmt(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m}min`;
  return m ? `${h}h ${String(m).padStart(2, "0")}min` : `${h}h`;
}

function quando(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);
  const mesmoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (mesmoDia(d, hoje)) return "Hoje";
  if (mesmoDia(d, ontem)) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

const css = `
.tp-bg{position:fixed;inset:0;z-index:80;background:rgba(20,22,31,.45);display:flex;align-items:center;justify-content:center;padding:16px;
  font-family:'DM Sans','Segoe UI',system-ui,sans-serif;color:#14161F;}
.tp{width:100%;max-width:480px;max-height:min(86vh,720px);overflow:auto;background:#EDF0F5;border:2px solid #14161F;border-radius:20px;
  box-shadow:5px 5px 0 #14161F;padding:20px;}
.tp *{box-sizing:border-box;}
.tp-hd{display:flex;align-items:flex-start;gap:12px;}
.tp-hd .ic{width:44px;height:44px;flex:none;border-radius:12px;background:#0B7A55;color:#fff;border:2px solid #14161F;display:flex;align-items:center;justify-content:center;}
.tp-hd .ic svg{width:22px;height:22px;}
.tp-hd p{margin:0;font-size:13px;color:#596074;font-weight:600;}
.tp-hd h2{margin:2px 0 0;font-family:'Sora',sans-serif;font-size:28px;letter-spacing:-.04em;line-height:1.1;}
.tp-x{margin-left:auto;width:36px;height:36px;flex:none;border-radius:10px;border:2px solid #14161F;background:#fff;cursor:pointer;font-size:18px;font-weight:700;line-height:1;color:#14161F;}
.tp-lvl{display:inline-block;margin-top:8px;font-size:12px;font-weight:700;padding:3px 8px;border-radius:6px;background:#CDEFE2;border:1.5px solid #0B7A55;}
.tp h3{margin:20px 0 10px;font-family:'Sora',sans-serif;font-size:16px;letter-spacing:-.02em;}
.tp-card{background:#fff;border:1.5px solid #D6DBE5;border-radius:14px;padding:12px 14px;}
.tp-area{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 10px;align-items:center;padding:8px 0;}
.tp-area + .tp-area{border-top:1px solid #EDF0F5;}
.tp-area .nm{font-weight:700;font-size:14px;display:flex;align-items:center;gap:8px;min-width:0;}
.tp-area .nm i{width:10px;height:10px;border-radius:3px;flex:none;}
.tp-area .vl{font-family:'Sora',sans-serif;font-weight:700;font-size:14px;font-variant-numeric:tabular-nums;}
.tp-bar{grid-column:1 / -1;height:8px;border-radius:99px;background:#EDF0F5;overflow:hidden;}
.tp-bar span{display:block;height:100%;border-radius:99px;}
.tp-it{display:flex;align-items:center;gap:10px;padding:9px 0;}
.tp-it + .tp-it{border-top:1px solid #EDF0F5;}
.tp-it .tx{min-width:0;flex:1;}
.tp-it .tx b{display:block;font-size:13.5px;font-weight:600;overflow-wrap:anywhere;}
.tp-it .tx small{font-size:12px;color:#596074;}
.tp-it .mn{flex:none;font-weight:800;font-size:13px;color:#0B7A55;background:#E8F6EF;border-radius:6px;padding:3px 7px;}
.tp-vazio{font-size:14px;color:#596074;margin:0;line-height:1.5;}
.tp-nota{margin:14px 0 0;font-size:12.5px;color:#596074;line-height:1.5;}
@media (max-width:640px){
  .tp-bg{align-items:flex-end;padding:0;}
  .tp{max-width:none;max-height:88vh;border-radius:20px 20px 0 0;border-bottom:0;box-shadow:none;
    padding:18px 16px calc(20px + env(safe-area-inset-bottom,0px));}
  .tp-hd h2{font-size:24px;}
}
`;

export function TempoPainel({
  minutos,
  nivel,
  onClose,
}: {
  minutos: number;
  nivel: string;
  onClose: () => void;
}) {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (vivo) setLinhas([]);
        return;
      }
      const { data } = await supabase
        .from("tempo_economizado_historico")
        .select("acao,minutos,motivo,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (vivo) setLinhas(Array.isArray(data) ? (data as Linha[]) : []);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const porArea = AREAS.map((a) => ({
    ...a,
    min: (linhas ?? [])
      .filter((l) => a.acoes.includes(l.acao))
      .reduce((s, l) => s + Number(l.minutos || 0), 0),
  }));
  const conhecidas = new Set(AREAS.flatMap((a) => a.acoes));
  const outros = (linhas ?? [])
    .filter((l) => !conhecidas.has(l.acao))
    .reduce((s, l) => s + Number(l.minutos || 0), 0);
  if (outros > 0) porArea.push({ nome: "Outras ações", cor: "#596074", acoes: [], min: outros });
  const areas = porArea.filter((a) => a.min > 0).sort((a, b) => b.min - a.min);
  const maior = Math.max(1, ...areas.map((a) => a.min));
  const ultimas = (linhas ?? []).slice(0, 8);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="tp-bg" onClick={onClose}>
      <style>{css}</style>
      <div
        className="tp"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tp-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tp-hd">
          <span className="ic" aria-hidden>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
          <div>
            <p>Tempo devolvido a você</p>
            <h2 id="tp-titulo">{fmt(minutos)}</h2>
            <span className="tp-lvl">Nível: {nivel}</span>
          </div>
          <button type="button" className="tp-x" aria-label="Fechar" onClick={onClose}>
            ×
          </button>
        </div>

        <h3>Onde você economizou</h3>
        <div className="tp-card">
          {linhas === null ? (
            <p className="tp-vazio">Carregando…</p>
          ) : areas.length === 0 ? (
            <p className="tp-vazio">
              Ainda não há economia registrada. Cada planejamento, parecer, PEI ou calendário feito
              com a Sofia soma tempo aqui.
            </p>
          ) : (
            areas.map((a) => (
              <div className="tp-area" key={a.nome}>
                <span className="nm">
                  <i style={{ background: a.cor }} />
                  {a.nome}
                </span>
                <span className="vl">{fmt(a.min)}</span>
                <span className="tp-bar" aria-hidden>
                  <span
                    style={{ width: `${Math.max(4, (a.min / maior) * 100)}%`, background: a.cor }}
                  />
                </span>
              </div>
            ))
          )}
        </div>

        {ultimas.length > 0 && (
          <>
            <h3>Últimas economias</h3>
            <div className="tp-card">
              {ultimas.map((l, i) => (
                <div className="tp-it" key={`${l.created_at}-${i}`}>
                  <span className="tx">
                    <b>{l.motivo || "Ação no app"}</b>
                    <small>{quando(l.created_at)}</small>
                  </span>
                  <span className="mn">+{fmt(Number(l.minutos || 0))}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="tp-nota">
          Contamos o tempo que cada tarefa levaria feita à mão. Exemplos: um PEI vale 3h, um
          relatório com a Sofia 35min e um planejamento completo 20min.
        </p>
      </div>
    </div>,
    document.body,
  );
}
