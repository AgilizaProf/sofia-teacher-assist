import { useEffect, useMemo, useRef, useState } from "react";
import { X, Sparkles, Loader2, Check, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { PlanoInclusao } from "./PlanoInclusaoModal";
import { buildAnoReferenciaPromptBlock } from "@/lib/inclusao/anoReferencia";
import { consumirCreditos, descricaoDoc } from "@/lib/creditos/consume";
import { CUSTOS } from "@/lib/creditos/policy";
import { useCreditosGate } from "@/lib/creditos/CreditosGate";

type Aluno = {
  id: string;
  name: string;
  diag?: string;
  cid?: string;
  anoEscolar?: string;
  anoReferenciaPedagogico?: string;
  turma?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  aluno: Aluno | null;
  anamneseResumo: string;
  peiResumo?: string;
  onSavedMany: (planos: PlanoInclusao[]) => void;
};

const PERIODOS = [
  { k: "bim", label: "Bimestre", semanas: 8 },
  { k: "tri", label: "Trimestre", semanas: 12 },
  { k: "sem", label: "Semestre", semanas: 18 },
] as const;
type PeriodoKey = (typeof PERIODOS)[number]["k"];

const DISCIPLINAS_EF = [
  "Língua Portuguesa", "Matemática", "Ciências", "História", "Geografia",
  "Arte", "Educação Física", "Inglês", "Ensino Religioso",
];
const CAMPOS_EI = [
  "O eu, o outro e o nós",
  "Corpo, gestos e movimentos",
  "Traços, sons, cores e formas",
  "Escuta, fala, pensamento e imaginação",
  "Espaços, tempos, quantidades, relações e transformações",
];

function isEducacaoInfantil(ano?: string) {
  return !!ano && /infantil|creche|pr[eé]/i.test(ano);
}

type GeradoItem = {
  id: string;
  disciplina: string;
  semana: number;
  data: string; // ISO yyyy-mm-dd
  plano: Omit<PlanoInclusao, "id" | "alunoId">;
  expandido: boolean;
  incluir: boolean;
  recolhidas?: Record<string, boolean>;
};

function isoFromOffset(weeks: number): string {
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

export function PlanoPeriodoModal({ open, onClose, aluno, anamneseResumo, peiResumo, onSavedMany }: Props) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const creditosGate = useCreditosGate();
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const el = modalRef.current?.querySelector<HTMLElement>('button.pim-chip, input, select, textarea');
      el?.focus();
    }, 60);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);
  const [periodo, setPeriodo] = useState<PeriodoKey>("bim");
  const [disciplinas, setDisciplinas] = useState<string[]>([]);
  const [porDisciplina, setPorDisciplina] = useState<number>(4);
  const [vista, setVista] = useState<"topicos" | "completo">("completo");
  const [loading, setLoading] = useState(false);
  const [progresso, setProgresso] = useState<{ feito: number; total: number }>({ feito: 0, total: 0 });
  const [itens, setItens] = useState<GeradoItem[]>([]);

  useEffect(() => {
    if (open) {
      setItens([]);
      setDisciplinas([]);
      setPeriodo("bim");
      setPorDisciplina(4);
      setVista("completo");
      setProgresso({ feito: 0, total: 0 });
    }
  }, [open, aluno?.id]);

  // Ano de referência pedagógico prevalece sobre o ano de matrícula.
  const anoEfetivo = (aluno?.anoReferenciaPedagogico || aluno?.anoEscolar || "").trim();
  const isEI = isEducacaoInfantil(anoEfetivo);
  const opcoes = isEI ? CAMPOS_EI : DISCIPLINAS_EF;
  const labelDisciplina = isEI ? "Campos de experiência" : "Disciplinas";
  const condicaoLabel = useMemo(() => {
    if (!aluno) return "";
    return [aluno.diag, aluno.cid].filter(Boolean).join(" · ");
  }, [aluno]);

  function toggleDisc(d: string) {
    setDisciplinas((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  async function gerarUm(disciplina: string, semana: number, totalSemanas: number) {
    if (!aluno) return null;
    const tema = `Atividade ${semana}/${totalSemanas} do ${PERIODOS.find((p) => p.k === periodo)!.label.toLowerCase()} — sequência didática progressiva`;
    const anotacoes = [
      condicaoLabel ? `Condição: ${condicaoLabel}` : "",
      peiResumo
        ? `\nPEI vigente (objetivos e metas — o período DEVE ser progressivo em relação a eles):\n${peiResumo}`
        : "\n(Sem PEI cadastrado — use boas práticas inclusivas para a condição informada.)",
      `Esta é a atividade ${semana} de ${totalSemanas} de uma sequência. Garanta progressão de complexidade em relação às anteriores.`,
    ].filter(Boolean).join("\n\n");
    const anoReferenciaInstrucao = buildAnoReferenciaPromptBlock(
      aluno.anoEscolar,
      aluno.anoReferenciaPedagogico,
    );
    const { data, error } = await supabase.functions.invoke("gerar-atividade", {
      body: {
        modo: "pcd",
        anoEscolar: aluno.anoEscolar || "",
        anoReferenciaPedagogico: aluno.anoReferenciaPedagogico || "",
        anoReferenciaInstrucao,
        turma: aluno.turma || "",
        disciplina,
        tema,
        duracao: "45 min",
        tipoAtividade: "Aula adaptada",
        incluirPCD: true,
        alunoFoco: { nome: aluno.name, codigo: condicaoLabel || "PCD", anotacoes },
      },
    });
    if (error) throw error;
    const plano = (data as { plano?: GeradoItem["plano"] })?.plano ?? null;
    if (plano) {
      void consumirCreditos(CUSTOS.planejamento_semanal, descricaoDoc(`Planejamento semanal (${disciplina})`, aluno?.name));
    }
    return plano;
  }

  async function gerar() {
    if (!aluno || disciplinas.length === 0) {
      toast.error("Selecione ao menos uma disciplina.");
      return;
    }
    const totalSemanas = PERIODOS.find((p) => p.k === periodo)!.semanas;
    const passo = Math.max(1, Math.floor(totalSemanas / porDisciplina));
    const tarefas: Array<{ disciplina: string; semana: number }> = [];
    for (const d of disciplinas) {
      for (let i = 0; i < porDisciplina; i++) {
        tarefas.push({ disciplina: d, semana: 1 + i * passo });
      }
    }
    const custoTotal = tarefas.length * CUSTOS.planejamento_semanal;
    const okGate = await creditosGate.checar({
      custo: custoTotal,
      acao: `Planejamento por período · ${tarefas.length} atividade(s) para ${aluno.name}`,
    });
    if (!okGate) return;
    setLoading(true);
    setProgresso({ feito: 0, total: tarefas.length });
    setItens([]);
    try {
      const results = await Promise.all(
        tarefas.map(async (t) => {
          try {
            const p = await gerarUm(t.disciplina, t.semana, totalSemanas);
            setProgresso((g) => ({ ...g, feito: g.feito + 1 }));
            if (!p) return null;
            const item: GeradoItem = {
              id: `gp_${t.disciplina}_${t.semana}_${Math.random().toString(36).slice(2, 7)}`,
              disciplina: t.disciplina,
              semana: t.semana,
              data: isoFromOffset(t.semana - 1),
              plano: p,
              expandido: false,
              incluir: true,
              recolhidas: {},
            };
            return item;
          } catch (e) {
            console.error(e);
            setProgresso((g) => ({ ...g, feito: g.feito + 1 }));
            return null;
          }
        }),
      );
      const ok = results.filter((x): x is GeradoItem => !!x);
      if (ok.length === 0) throw new Error("Nenhuma atividade foi gerada.");
      ok.sort((a, b) => a.semana - b.semana || a.disciplina.localeCompare(b.disciplina));
      setItens(ok);
      toast.success(`${ok.length} atividade(s) geradas pela Sofia`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar atividades", { description: e instanceof Error ? e.message : "Tente novamente." });
    } finally {
      setLoading(false);
    }
  }

  function salvarSelecionados() {
    if (!aluno) return;
    const escolhidos = itens.filter((x) => x.incluir);
    if (escolhidos.length === 0) {
      toast.error("Selecione ao menos uma atividade para salvar.");
      return;
    }
    const planos: PlanoInclusao[] = escolhidos.map((x) => ({
      ...x.plano,
      id: x.id,
      alunoId: aluno.id,
      data: x.data,
      disciplina: x.disciplina,
    }));
    onSavedMany(planos);
    toast.success(`${planos.length} atividade(s) salva(s) no planejamento`);
    onClose();
  }

  if (!open || !aluno) return null;

  return (
    <div className="pim-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="pim-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <header className="pim-head">
          <div>
            <h3>Atividades do período · {aluno.name}</h3>
            <span className="pim-sub">Sofia gera várias atividades alinhadas ao PEI e à BNCC</span>
            <div className="pim-meta">
              <span className="pim-meta-item">
                <b>Ano escolar:</b> {aluno.anoEscolar?.trim() || <i>não informado</i>}
              </span>
              {aluno.anoReferenciaPedagogico?.trim() && (
                <span className="pim-meta-item">
                  <b>Ano de referência:</b> {aluno.anoReferenciaPedagogico}
                </span>
              )}
              <span className="pim-meta-item">
                <b>Condição:</b> {condicaoLabel || <i>não informada</i>}
              </span>
            </div>
          </div>
          <button className="pim-x" onClick={onClose}><X size={16} /></button>
        </header>

        <div className="pim-body">
          <div className="pim-field">
            <label>Período</label>
            <div className="pim-chips">
              {PERIODOS.map((p) => (
                <button
                  key={p.k}
                  type="button"
                  className={"pim-chip" + (periodo === p.k ? " active" : "")}
                  onClick={() => setPeriodo(p.k)}
                >{p.label} <span style={{ opacity: .6 }}>· {p.semanas} sem.</span></button>
              ))}
            </div>
          </div>

          <div className="pim-field">
            <label>{labelDisciplina} <span style={{ color: "var(--muted)", fontWeight: 500 }}>(selecione uma ou mais)</span></label>
            <div className="pim-chips">
              {opcoes.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={"pim-chip" + (disciplinas.includes(d) ? " active" : "")}
                  onClick={() => toggleDisc(d)}
                >{disciplinas.includes(d) && <Check size={11} style={{ marginRight: 4 }} />}{d}</button>
              ))}
            </div>
          </div>

          <div className="pim-field">
            <label>Atividades por {labelDisciplina.toLowerCase().slice(0, -1)}</label>
            <div className="pim-chips">
              {[2, 4, 6, 8].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={"pim-chip" + (porDisciplina === n ? " active" : "")}
                  onClick={() => setPorDisciplina(n)}
                >{n}</button>
              ))}
            </div>
            <span style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>
              Total estimado: <b>{disciplinas.length * porDisciplina}</b> atividade(s)
            </span>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6 }}>
            <button
              type="button"
              className="btn btn-primary bg-orange-400 text-orange-400"
              onClick={gerar}
              disabled={loading || disciplinas.length === 0}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {loading ? `Gerando ${progresso.feito}/${progresso.total}…` : "Gerar com a Sofia"}
            </button>
            {itens.length > 0 && (
              <div className="pim-toggle" role="tablist" aria-label="Formato de exibição">
                <button type="button" className={"pim-toggle-opt" + (vista === "topicos" ? " active" : "")} onClick={() => setVista("topicos")}>Tópicos</button>
                <button type="button" className={"pim-toggle-opt" + (vista === "completo" ? " active" : "")} onClick={() => setVista("completo")}>Completo</button>
              </div>
            )}
          </div>

          {itens.length > 0 && (
            <div className="pim-list">
              {itens.map((it, idx) => {
                const expandir = vista === "completo" || it.expandido;
                return (
                  <div key={it.id} className={"pim-card" + (it.incluir ? "" : " off")}>
                    <div className="pim-card-head">
                      <input
                        type="checkbox"
                        checked={it.incluir}
                        onChange={(e) => setItens((arr) => arr.map((x, i) => i === idx ? { ...x, incluir: e.target.checked } : x))}
                        aria-label="Incluir esta atividade"
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="pim-card-meta">
                          <span className="pim-card-disc">{it.disciplina}</span>
                          <span className="pim-card-sem">Semana {it.semana}</span>
                          {it.plano.habilidades?.[0]?.codigo && <span className="pim-bncc">{it.plano.habilidades[0].codigo}</span>}
                        </div>
                        <h4>{it.plano.titulo}</h4>
                      </div>
                      {vista === "topicos" && (
                        <button
                          type="button"
                          className="pim-expand"
                          onClick={() => setItens((arr) => arr.map((x, i) => i === idx ? { ...x, expandido: !x.expandido } : x))}
                          aria-label={it.expandido ? "Recolher" : "Ver completo"}
                        >
                          {it.expandido ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          {it.expandido ? "Recolher" : "Ver completo"}
                        </button>
                      )}
                    </div>

                    {/* Tópicos resumo */}
                    <div className="pim-topicos">
                      <div><b>Objetivo:</b> {it.plano.objetivo || "—"}</div>
                      <div><b>Metodologia:</b> {it.plano.metodologia || it.plano.desenvolvimento?.split(".")[0] || "—"}</div>
                      <div><b>Avaliação:</b> {it.plano.avaliacao || "Observação processual"}</div>
                    </div>

                    {expandir && (
                      <div className="pim-completo">
                        {(() => {
                          const toggle = (key: string) =>
                            setItens((arr) => arr.map((x, i) => i === idx
                              ? { ...x, recolhidas: { ...(x.recolhidas || {}), [key]: !(x.recolhidas || {})[key] } }
                              : x));
                          const isOpen = (key: string) => !(it.recolhidas || {})[key];
                          const Section = ({ k, title, children }: { k: string; title: string; children: React.ReactNode }) => (
                            <section className="pim-sec">
                              <button type="button" className="pim-sec-head" onClick={() => toggle(k)} aria-expanded={isOpen(k)}>
                                {isOpen(k) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                <b>{title}</b>
                              </button>
                              {isOpen(k) && <div className="pim-sec-body">{children}</div>}
                            </section>
                          );
                          return (
                            <>
                              {it.plano.abertura && (
                                <Section k="abertura" title="Abertura"><p>{it.plano.abertura}</p></Section>
                              )}
                              {it.plano.desenvolvimento && (
                                <Section k="desenvolvimento" title="Desenvolvimento"><p>{it.plano.desenvolvimento}</p></Section>
                              )}
                              {it.plano.fechamento && (
                                <Section k="fechamento" title="Fechamento"><p>{it.plano.fechamento}</p></Section>
                              )}
                              {it.plano.adaptacoes?.length > 0 && (
                                <Section k="adaptacoes" title={`Adaptações para ${aluno.name.split(" ")[0]}`}>
                                  <ul>{it.plano.adaptacoes.map((a, i) => <li key={i}><i>{a.categoria}:</i> {a.texto}</li>)}</ul>
                                </Section>
                              )}
                            </>
                          );
                        })()}
                        {it.plano.materiais?.length > 0 && (
                          <section><b>Materiais</b><p>{it.plano.materiais.join(", ")}</p></section>
                        )}
                        {it.plano.habilidades?.length > 0 && (
                          <section>
                            <b>BNCC</b>
                            <ul>{it.plano.habilidades.map((h, i) => <li key={i}><i>{h.codigo}</i> — {h.descricao}</li>)}</ul>
                          </section>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer className="pim-foot">
          <button type="button" className="inc-btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            type="button"
            className="btn btn-primary bg-orange-400 text-orange-400"
            onClick={salvarSelecionados}
            disabled={loading || itens.filter((x) => x.incluir).length === 0}
          >
            <Check size={14} /> Salvar selecionadas no planejamento
          </button>
        </footer>

        <style>{`
          .pim-overlay{position:fixed;inset:0;background:rgba(15,26,54,.55);display:grid;place-items:center;z-index:1000;padding:16px;}
          .pim-modal{background:#fff;border-radius:16px;width:min(960px,100%);max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 60px -20px rgba(11,18,32,.5);}
          .pim-head{display:flex;align-items:flex-start;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--border);}
          .pim-head h3{font-family:'Fraunces',serif;font-weight:700;font-size:18px;margin:0;}
          .pim-sub{font-size:12px;color:var(--muted);}
          .pim-meta{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px;font-size:12px;color:#1B2A4E;}
          .pim-meta-item{background:var(--bg);border:1px solid var(--border);border-radius:999px;padding:3px 10px;}
          .pim-meta-item b{font-weight:700;color:var(--muted);margin-right:4px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;}
          .pim-x{background:transparent;border:none;cursor:pointer;color:var(--muted);padding:6px;border-radius:6px;}
          .pim-x:hover{background:var(--bg);color:#1B2A4E;}
          .pim-body{padding:18px 22px;overflow:auto;display:flex;flex-direction:column;gap:14px;}
          .pim-field{display:flex;flex-direction:column;gap:6px;}
          .pim-field>label{font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);}
          .pim-chips{display:flex;flex-wrap:wrap;gap:6px;}
          .pim-chip{padding:6px 11px;border-radius:999px;border:1px solid var(--border);background:#fff;font-size:12px;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;}
          .pim-chip:hover{background:var(--bg);}
          .pim-chip.active{background:var(--accent-soft);border-color:#FFB37A;color:#B8410E;font-weight:700;}
          .pim-toggle{display:inline-flex;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:2px;}
          .pim-toggle-opt{padding:5px 12px;border-radius:6px;border:none;background:transparent;font-size:12px;cursor:pointer;font-family:inherit;color:var(--muted);font-weight:600;}
          .pim-toggle-opt.active{background:#fff;color:#1B2A4E;box-shadow:0 1px 3px rgba(0,0,0,.06);}
          .pim-list{display:flex;flex-direction:column;gap:10px;margin-top:6px;}
          .pim-card{border:1px solid var(--border);border-radius:12px;padding:14px;background:#fff;transition:opacity .15s;}
          .pim-card.off{opacity:.55;}
          .pim-card-head{display:flex;gap:10px;align-items:flex-start;}
          .pim-card-head h4{font-family:'Fraunces',serif;font-weight:700;font-size:15px;margin:2px 0 0;line-height:1.3;}
          .pim-card-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:11px;}
          .pim-card-disc{background:#1B2A4E;color:#fff;padding:2px 8px;border-radius:6px;font-weight:700;}
          .pim-card-sem{color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em;}
          .pim-bncc{font-family:'JetBrains Mono',monospace;background:var(--accent-soft);color:#B8410E;padding:2px 6px;border-radius:5px;font-weight:700;}
          .pim-expand{background:transparent;border:1px solid var(--border);border-radius:7px;padding:5px 10px;font-size:11.5px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;color:var(--muted);font-family:inherit;}
          .pim-expand:hover{background:var(--bg);color:#1B2A4E;}
          .pim-topicos{margin-top:10px;display:flex;flex-direction:column;gap:4px;font-size:12.5px;line-height:1.45;}
          .pim-topicos b{color:#1B2A4E;}
          .pim-completo{margin-top:10px;padding-top:10px;border-top:1px dashed var(--border);display:flex;flex-direction:column;gap:10px;}
          .pim-completo section b{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--accent);margin-bottom:3px;}
          .pim-completo p{font-size:12.5px;line-height:1.5;margin:0;}
          .pim-sec{border:1px solid var(--border);border-radius:8px;background:#fff;}
          .pim-sec-head{width:100%;display:flex;align-items:center;gap:6px;background:var(--bg);border:none;border-radius:8px 8px 0 0;padding:7px 10px;cursor:pointer;font-family:inherit;text-align:left;color:var(--accent);}
          .pim-sec-head[aria-expanded="false"]{border-radius:8px;}
          .pim-sec-head b{margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.06em;}
          .pim-sec-body{padding:8px 12px 10px;}
          .pim-sec-body p{font-size:12.5px;line-height:1.5;margin:0;}
          .pim-sec-body ul{margin:0;padding-left:18px;font-size:12.5px;line-height:1.5;}
          .pim-completo ul{margin:0;padding-left:18px;font-size:12.5px;line-height:1.5;}
          .pim-foot{display:flex;justify-content:flex-end;gap:8px;padding:14px 22px;border-top:1px solid var(--border);background:var(--bg);}
          @media (max-width: 640px){
            .pim-overlay{padding:0;align-items:flex-end;}
            .pim-modal{width:100%;max-width:100%;max-height:100dvh;height:100dvh;border-radius:14px 14px 0 0;}
            .pim-head{padding:14px 16px;}
            .pim-head h3{font-size:16px;}
            .pim-body{padding:14px 16px;-webkit-overflow-scrolling:touch;padding-bottom:calc(14px + env(safe-area-inset-bottom));}
            .pim-body input,.pim-body select,.pim-body textarea{font-size:16px !important;}
            .pim-foot{position:sticky;bottom:0;flex-direction:column-reverse;align-items:stretch;gap:8px;padding:12px 16px calc(12px + env(safe-area-inset-bottom));z-index:5;background:#fff;}
            .pim-foot button{width:100%;justify-content:center;}
          }
        `}</style>
      </div>
    </div>
  );
}
