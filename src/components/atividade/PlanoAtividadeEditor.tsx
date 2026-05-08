import { useEffect, useMemo, useState } from "react";
import {
  Sparkles, RefreshCw, Plus, Copy, ChevronDown, ChevronUp, X,
  Check, Pencil, Lightbulb, AlertTriangle, Save,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePersistentState } from "@/lib/persist/usePersistentState";
import { useSofiaUserData } from "@/lib/sofia/SofiaUserContext";
import { logActivity } from "@/lib/activity/activityLog";

/* ─────────────────────────── Types ─────────────────────────── */

export type Habilidade = { codigo: string; descricao: string };
export type Adaptacao = {
  categoria: "TEA" | "TDAH" | "DI" | "Deficiência física" | "Outra";
  texto: string;
};
export type Sugestao = { titulo: string; descricao: string };

export type PlanoAtividade = {
  titulo: string;
  objetivo: string;
  abertura: string;
  desenvolvimento: string;
  fechamento: string;
  habilidades: Habilidade[];
  adaptacoes: Adaptacao[];
  sugestoes: Sugestao[];
  materiais: string[];
  materiaisCheck?: Record<number, boolean>;
  meta?: { ano: string; turma: string; disciplina: string; tema: string; modo: "regular" | "pcd"; geradoEm: string };
};

const EMPTY: PlanoAtividade = {
  titulo: "",
  objetivo: "",
  abertura: "",
  desenvolvimento: "",
  fechamento: "",
  habilidades: [],
  adaptacoes: [],
  sugestoes: [],
  materiais: [],
  materiaisCheck: {},
};

const ANOS_FALLBACK = [
  "Educação Infantil",
  "1º ano EF", "2º ano EF", "3º ano EF", "4º ano EF", "5º ano EF",
  "6º ano EF", "7º ano EF", "8º ano EF", "9º ano EF",
  "1º ano EM", "2º ano EM", "3º ano EM",
];

const DISCIPLINAS = [
  "Língua Portuguesa", "Matemática", "Ciências", "História", "Geografia",
  "Arte", "Educação Física", "Inglês", "Ensino Religioso", "Interdisciplinar",
];

/* ─────────────────────────── Component ─────────────────────────── */

export function PlanoAtividadeEditor({ modo }: { modo: "regular" | "pcd" }) {
  const sofia = useSofiaUserData();

  const [plano, setPlano] = usePersistentState<PlanoAtividade>(
    `plan_atividade_${modo}_v1`,
    EMPTY,
  );

  const turmasPerfil = sofia.turmas;
  const [turma, setTurma] = useState<string>(turmasPerfil[0]?.nome ?? "");
  const [anoEscolar, setAnoEscolar] = useState<string>(
    turmasPerfil[0]?.ano || ANOS_FALLBACK[3],
  );
  const [disciplina, setDisciplina] = useState<string>(DISCIPLINAS[0]);
  const [tema, setTema] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [erro, setErro] = useState<string>("");
  const [missing, setMissing] = useState<string[]>([]);
  const [salvo, setSalvo] = useState(false);

  // Quando troca de turma, sincroniza ano escolar.
  useEffect(() => {
    const t = turmasPerfil.find((x) => x.nome === turma);
    if (t?.ano) setAnoEscolar(t.ano);
  }, [turma, turmasPerfil]);

  const alunosPCDDaTurma = useMemo(() => {
    if (!turma) return sofia.alunosPCD;
    return sofia.alunosPCDPorTurma[turma] ?? [];
  }, [sofia, turma]);

  const gerar = async () => {
    setErro("");
    setGenerating(true);
    try {
      const payload = {
        modo,
        anoEscolar,
        disciplina,
        tema: tema.trim(),
        turma,
        alunosPCD: alunosPCDDaTurma.map((a) => ({
          nome: a.primeiro_nome,
          tipo: a.pcd_codigo || "PCD",
          codigo: a.pcd_codigo || undefined,
          anotacoes: a.pcd_anotacoes || undefined,
        })),
      };
      const { data, error } = await supabase.functions.invoke("gerar-atividade", {
        body: payload,
      });
      if (error) throw error;
      const novo = data?.plano as PlanoAtividade | undefined;
      if (!novo) throw new Error("Sofia não retornou um plano válido.");
      const enriched: PlanoAtividade = {
        ...EMPTY,
        ...novo,
        materiaisCheck: {},
        meta: {
          ano: anoEscolar,
          turma,
          disciplina,
          tema,
          modo,
          geradoEm: new Date().toISOString(),
        },
      };
      setPlano(enriched);
      logActivity({
        type: "planejamento",
        description:
          modo === "pcd"
            ? `Atividade PCD gerada: ${enriched.titulo}`
            : `Atividade gerada: ${enriched.titulo}`,
        detail: `${anoEscolar} · ${disciplina}`,
      });
    } catch (e) {
      const msg =
        (e as { context?: { error?: string } })?.context?.error ||
        (e as Error)?.message ||
        "Falha ao gerar.";
      setErro(msg);
    } finally {
      setGenerating(false);
    }
  };

  const limpar = () => {
    setPlano(EMPTY);
    setErro("");
    setMissing([]);
    setSalvo(false);
  };

  const setField = <K extends keyof PlanoAtividade>(k: K, v: PlanoAtividade[K]) =>
    setPlano({ ...plano, [k]: v });

  const toggleMat = (i: number) =>
    setPlano({
      ...plano,
      materiaisCheck: { ...(plano.materiaisCheck ?? {}), [i]: !(plano.materiaisCheck ?? {})[i] },
    });

  const addMat = (s: string) => {
    const v = s.trim();
    if (!v) return;
    setPlano({ ...plano, materiais: [...plano.materiais, v] });
  };

  const removeMat = (i: number) =>
    setPlano({ ...plano, materiais: plano.materiais.filter((_, j) => j !== i) });

  const removeHab = (i: number) =>
    setPlano({ ...plano, habilidades: plano.habilidades.filter((_, j) => j !== i) });

  const addHab = (codigo: string, descricao: string) => {
    if (!codigo.trim() || !descricao.trim()) return;
    setPlano({
      ...plano,
      habilidades: [...plano.habilidades, { codigo: codigo.trim(), descricao: descricao.trim() }],
    });
  };

  const usarSugestao = (s: Sugestao) => {
    setPlano({
      ...plano,
      titulo: s.titulo,
      desenvolvimento: s.descricao,
    });
    logActivity({
      type: "planejamento",
      description: `Variação aplicada: ${s.titulo}`,
    });
  };

  const copiarMateriais = async () => {
    try {
      await navigator.clipboard.writeText(plano.materiais.map((m) => `• ${m}`).join("\n"));
    } catch {/* noop */}
  };

  const temPlano = !!plano.titulo;

  const validar = (): string[] => {
    const faltam: string[] = [];
    if (!plano.titulo.trim()) faltam.push("titulo");
    if (!plano.objetivo.trim()) faltam.push("objetivo");
    if (
      !plano.abertura.trim() &&
      !plano.desenvolvimento.trim() &&
      !plano.fechamento.trim()
    ) {
      faltam.push("descricao");
    }
    if (plano.habilidades.length === 0) faltam.push("habilidades");
    else if (plano.habilidades.some((h) => !h.codigo.trim() || !h.descricao.trim())) {
      faltam.push("habilidades_incompletas");
    }
    return faltam;
  };

  const salvar = () => {
    const faltam = validar();
    setMissing(faltam);
    if (faltam.length > 0) {
      setSalvo(false);
      return;
    }
    logActivity({
      type: "planejamento",
      description:
        modo === "pcd"
          ? `Planejamento PCD salvo: ${plano.titulo}`
          : `Planejamento salvo: ${plano.titulo}`,
      detail: plano.meta
        ? `${plano.meta.ano} · ${plano.meta.disciplina}`
        : undefined,
    });
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  };

  // Limpa marcadores de erro automaticamente quando o usuário corrige.
  useEffect(() => {
    if (missing.length === 0) return;
    const ainda = validar();
    if (ainda.length !== missing.length) setMissing(ainda);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plano.titulo, plano.objetivo, plano.abertura, plano.desenvolvimento, plano.fechamento, plano.habilidades.length]);

  return (
    <div className="atv-root">
      <style>{css}</style>

      {/* Toolbar geração */}
      <div className="atv-toolbar">
        <div className="atv-toolbar-row">
          <div className="atv-field">
            <label>Turma</label>
            <select value={turma} onChange={(e) => setTurma(e.target.value)}>
              <option value="">Sem turma cadastrada</option>
              {turmasPerfil.map((t) => (
                <option key={t.id} value={t.nome}>{t.nome}</option>
              ))}
            </select>
          </div>
          <div className="atv-field">
            <label>Ano escolar</label>
            <select value={anoEscolar} onChange={(e) => setAnoEscolar(e.target.value)}>
              {ANOS_FALLBACK.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="atv-field">
            <label>Disciplina</label>
            <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)}>
              {DISCIPLINAS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="atv-field grow">
            <label>Tema (opcional)</label>
            <input
              type="text"
              value={tema}
              maxLength={140}
              onChange={(e) => setTema(e.target.value)}
              placeholder={
                modo === "pcd"
                  ? "Ex.: Estímulo sensorial com sons"
                  : "Ex.: Sistema solar"
              }
            />
          </div>
          <div className="atv-actions">
            {temPlano && (
              <button className="atv-btn ghost" onClick={limpar}>
                <X size={14} /> Limpar
              </button>
            )}
            {temPlano && (
              <button className="atv-btn" onClick={salvar}>
                <Save size={14} /> {salvo ? "Salvo!" : "Salvar planejamento"}
              </button>
            )}
            <button className="atv-btn primary" onClick={gerar} disabled={generating}>
              {temPlano ? <RefreshCw size={14} /> : <Sparkles size={14} />}
              {generating ? "Sofia gerando…" : temPlano ? "Regenerar" : "Gerar com Sofia"}
            </button>
          </div>
        </div>

        {modo === "pcd" && alunosPCDDaTurma.length === 0 && (
          <div className="atv-warn">
            <AlertTriangle size={14} />
            Nenhum aluno PCD encontrado{turma ? ` em ${turma}` : ""}. Sofia gerará
            uma atividade PCD genérica baseada no ano escolar.
          </div>
        )}

        {erro && (
          <div className="atv-error">
            <AlertTriangle size={14} /> {erro}
          </div>
        )}

        {missing.length > 0 && (
          <div className="atv-error">
            <AlertTriangle size={14} />
            <span>
              Antes de salvar, preencha:{" "}
              {missing.map((m, i) => (
                <span key={m}>
                  <strong>{LABELS[m]}</strong>
                  {i < missing.length - 1 ? ", " : ""}
                </span>
              ))}
              .
            </span>
          </div>
        )}
      </div>

      {!temPlano && !generating && (
        <div className="atv-empty">
          <Sparkles size={28} />
          <h3>{modo === "pcd" ? "Plano de atividade para aluno PCD" : "Plano de atividade"}</h3>
          <p>
            Defina turma, ano escolar e tema. Sofia gera título, objetivo, descrição,
            habilidades BNCC, adaptações, sugestões e lista de materiais.
          </p>
        </div>
      )}

      {temPlano && (
        <PlanoBody
          plano={plano}
          modo={modo}
          alunosPCDCount={alunosPCDDaTurma.length}
          missing={missing}
          onChange={setField}
          onToggleMat={toggleMat}
          onRemoveMat={removeMat}
          onAddMat={addMat}
          onCopiarMat={copiarMateriais}
          onRemoveHab={removeHab}
          onAddHab={addHab}
          onUsarSugestao={usarSugestao}
        />
      )}
    </div>
  );
}

const LABELS: Record<string, string> = {
  titulo: "título",
  objetivo: "objetivo",
  descricao: "descrição (abertura, desenvolvimento ou fechamento)",
  habilidades: "ao menos uma habilidade BNCC",
};

/* ─────────────────────────── Body ─────────────────────────── */

function PlanoBody(props: {
  plano: PlanoAtividade;
  modo: "regular" | "pcd";
  alunosPCDCount: number;
  missing: string[];
  onChange: <K extends keyof PlanoAtividade>(k: K, v: PlanoAtividade[K]) => void;
  onToggleMat: (i: number) => void;
  onRemoveMat: (i: number) => void;
  onAddMat: (s: string) => void;
  onCopiarMat: () => void;
  onRemoveHab: (i: number) => void;
  onAddHab: (codigo: string, descricao: string) => void;
  onUsarSugestao: (s: Sugestao) => void;
}) {
  const { plano, modo, alunosPCDCount, missing } = props;
  const has = (k: string) => missing.includes(k);
  const [adaptOpen, setAdaptOpen] = useState(modo === "pcd");
  const [novoMat, setNovoMat] = useState("");
  const [novaHabCod, setNovaHabCod] = useState("");
  const [novaHabDesc, setNovaHabDesc] = useState("");
  const [copiado, setCopiado] = useState(false);

  return (
    <div className="atv-grid">
      {/* 1. Título */}
      <section className={`atv-card title${has("titulo") ? " atv-invalid" : ""}`}>
        <InlineText
          value={plano.titulo}
          onChange={(v) => props.onChange("titulo", v)}
          tag="h2"
          placeholder="Título da atividade"
        />
        {plano.meta && (
          <div className="atv-meta">
            {plano.meta.ano} · {plano.meta.disciplina}
            {plano.meta.turma ? ` · ${plano.meta.turma}` : ""}
          </div>
        )}
      </section>

      {/* 2. Objetivo */}
      <section className={`atv-card${has("objetivo") ? " atv-invalid" : ""}`}>
        <h3>① Objetivo</h3>
        <InlineText
          value={plano.objetivo}
          onChange={(v) => props.onChange("objetivo", v)}
          tag="p"
          multiline
          placeholder="O que o aluno vai aprender"
        />
      </section>

      {/* 3. Descrição */}
      <section className={`atv-card${has("descricao") ? " atv-invalid" : ""}`}>
        <h3>② Descrição da atividade</h3>
        <Block label="Abertura" value={plano.abertura} onChange={(v) => props.onChange("abertura", v)} />
        <Block label="Desenvolvimento" value={plano.desenvolvimento} onChange={(v) => props.onChange("desenvolvimento", v)} />
        <Block label="Fechamento" value={plano.fechamento} onChange={(v) => props.onChange("fechamento", v)} />
      </section>

      {/* 4. Habilidades BNCC */}
      <section className={`atv-card${has("habilidades") ? " atv-invalid" : ""}`}>
        <h3>③ Habilidades BNCC</h3>
        <div className="atv-chips">
          {plano.habilidades.map((h, i) => (
            <span className="atv-chip" key={`${h.codigo}-${i}`} title={h.descricao}>
              {h.codigo}
              <button onClick={() => props.onRemoveHab(i)} aria-label="Remover">
                <X size={11} />
              </button>
            </span>
          ))}
          {plano.habilidades.length === 0 && (
            <span className="atv-empty-chip">Nenhuma habilidade. Adicione abaixo.</span>
          )}
        </div>
        <div className="atv-add-row">
          <input
            placeholder="Código (ex.: EF03MA03)"
            value={novaHabCod}
            onChange={(e) => setNovaHabCod(e.target.value)}
          />
          <input
            placeholder="Descrição da habilidade"
            value={novaHabDesc}
            onChange={(e) => setNovaHabDesc(e.target.value)}
          />
          <button
            className="atv-btn"
            onClick={() => {
              props.onAddHab(novaHabCod, novaHabDesc);
              setNovaHabCod(""); setNovaHabDesc("");
            }}
          >
            <Plus size={13} /> Adicionar
          </button>
        </div>
      </section>

      {/* 5. Adaptações PCD */}
      <section className="atv-card adapt">
        <button
          type="button"
          className="atv-collapser"
          onClick={() => modo === "regular" && setAdaptOpen((v) => !v)}
          disabled={modo === "pcd"}
        >
          <h3>④ Adaptações PCD</h3>
          {modo === "regular" && (adaptOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
        </button>

        {(adaptOpen || modo === "pcd") && (
          <>
            {modo === "regular" && alunosPCDCount === 0 ? (
              <p className="atv-muted">Nenhum aluno PCD nesta turma.</p>
            ) : plano.adaptacoes.length === 0 ? (
              <p className="atv-muted">Sofia não gerou adaptações. Regenere com tema mais específico.</p>
            ) : (
              <div className="atv-adapt-grid">
                {plano.adaptacoes.map((a, i) => (
                  <div className="atv-adapt-card" key={i}>
                    <div className="atv-adapt-cat">{a.categoria}</div>
                    <InlineText
                      value={a.texto}
                      onChange={(v) => {
                        const next = [...plano.adaptacoes];
                        next[i] = { ...a, texto: v };
                        props.onChange("adaptacoes", next);
                      }}
                      tag="p"
                      multiline
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* 6. Sugestões da Sofia */}
      <section className="atv-card">
        <h3><Lightbulb size={14} style={{ verticalAlign: -2, marginRight: 4 }} />⑤ Sugestões da Sofia</h3>
        {plano.sugestoes.length === 0 ? (
          <p className="atv-muted">Sem sugestões.</p>
        ) : (
          <div className="atv-sug-grid">
            {plano.sugestoes.map((s, i) => (
              <div className="atv-sug" key={i}>
                <div className="atv-sug-title">{s.titulo}</div>
                <p>{s.descricao}</p>
                <button className="atv-btn ghost" onClick={() => props.onUsarSugestao(s)}>
                  <Check size={12} /> Usar esta
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 7. Materiais */}
      <section className="atv-card">
        <div className="atv-card-head">
          <h3>⑥ Material necessário</h3>
          <button
            className="atv-btn ghost"
            onClick={() => { props.onCopiarMat(); setCopiado(true); setTimeout(() => setCopiado(false), 1500); }}
            disabled={plano.materiais.length === 0}
          >
            <Copy size={12} /> {copiado ? "Copiado!" : "Copiar lista"}
          </button>
        </div>
        <ul className="atv-mat">
          {plano.materiais.map((m, i) => (
            <li key={i}>
              <label>
                <input
                  type="checkbox"
                  checked={!!plano.materiaisCheck?.[i]}
                  onChange={() => props.onToggleMat(i)}
                />
                <span style={{ textDecoration: plano.materiaisCheck?.[i] ? "line-through" : "none" }}>{m}</span>
              </label>
              <button className="atv-x" onClick={() => props.onRemoveMat(i)} aria-label="Remover">
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
        <div className="atv-add-row">
          <input
            placeholder="Adicionar material"
            value={novoMat}
            onChange={(e) => setNovoMat(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { props.onAddMat(novoMat); setNovoMat(""); }
            }}
          />
          <button className="atv-btn" onClick={() => { props.onAddMat(novoMat); setNovoMat(""); }}>
            <Plus size={13} /> Adicionar item
          </button>
        </div>
      </section>
    </div>
  );
}

/* ─────────────────── inline-edit primitives ─────────────────── */

function InlineText({
  value, onChange, tag = "p", placeholder, multiline,
}: {
  value: string;
  onChange: (v: string) => void;
  tag?: "h2" | "h3" | "p";
  placeholder?: string;
  multiline?: boolean;
}) {
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => {
    onChange(draft.trim());
    setEdit(false);
  };

  if (edit) {
    return multiline ? (
      <textarea
        autoFocus
        className="atv-inline-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
      />
    ) : (
      <input
        autoFocus
        className="atv-inline-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
      />
    );
  }

  const Tag = tag as "p";
  return (
    <Tag className="atv-inline" onClick={() => setEdit(true)}>
      {value || <span className="atv-placeholder">{placeholder || "Clique para editar"}</span>}
      <Pencil size={12} className="atv-inline-icon" />
    </Tag>
  );
}

function Block({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="atv-block">
      <div className="atv-block-label">{label}</div>
      <InlineText value={value} onChange={onChange} tag="p" multiline placeholder={`Descreva o ${label.toLowerCase()}…`} />
    </div>
  );
}

/* ─────────────────────────── Styles ─────────────────────────── */

const css = `
.atv-root{display:flex;flex-direction:column;gap:16px;}
.atv-root *{box-sizing:border-box;}
.atv-toolbar{background:#fff;border:1px solid var(--line,#E2E8F0);border-radius:12px;padding:14px;box-shadow:0 1px 2px rgba(15,23,42,.05);}
.atv-toolbar-row{display:grid;grid-template-columns:1.2fr 1fr 1fr 2fr auto;gap:10px;align-items:end;}
@media(max-width:1100px){.atv-toolbar-row{grid-template-columns:1fr 1fr;}.atv-actions{grid-column:span 2;justify-content:flex-end;}}
.atv-field{display:flex;flex-direction:column;gap:4px;min-width:0;}
.atv-field.grow{min-width:0;}
.atv-field label{font-size:11px;font-weight:600;color:var(--muted,#64748B);text-transform:uppercase;letter-spacing:.05em;}
.atv-field select,.atv-field input{height:36px;border:1px solid var(--line,#E2E8F0);border-radius:8px;padding:0 10px;font-size:13px;background:#fff;color:var(--ink,#0F172A);font-family:inherit;}
.atv-field select:focus,.atv-field input:focus{outline:none;border-color:var(--orange,#FF7A45);box-shadow:0 0 0 3px rgba(255,122,69,.15);}
.atv-actions{display:flex;gap:8px;align-items:flex-end;}
.atv-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;font-weight:600;font-size:13px;border:1px solid var(--line,#E2E8F0);background:#fff;color:var(--ink,#0F172A);cursor:pointer;font-family:inherit;}
.atv-btn:hover{background:#F8FAFC;}
.atv-btn.primary{background:var(--orange,#FF7A45);border-color:var(--orange,#FF7A45);color:#fff;}
.atv-btn.primary:hover{background:#F26B36;}
.atv-btn.ghost{background:transparent;}
.atv-btn:disabled{opacity:.5;cursor:not-allowed;}
.atv-warn{margin-top:10px;padding:8px 12px;border-radius:8px;background:rgba(245,158,11,.10);color:#92400E;display:flex;align-items:center;gap:8px;font-size:12.5px;}
.atv-error{margin-top:10px;padding:8px 12px;border-radius:8px;background:rgba(239,68,68,.10);color:#991B1B;display:flex;align-items:center;gap:8px;font-size:12.5px;}
.atv-empty{background:#fff;border:1px dashed var(--line,#E2E8F0);border-radius:12px;padding:48px 24px;text-align:center;color:var(--muted,#64748B);}
.atv-empty h3{font-size:18px;color:var(--ink,#0F172A);margin:8px 0 4px;}
.atv-empty p{max-width:520px;margin:0 auto;font-size:13.5px;line-height:1.5;}
.atv-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
@media(max-width:980px){.atv-grid{grid-template-columns:1fr;}}
.atv-card{background:#fff;border:1px solid var(--line,#E2E8F0);border-radius:12px;padding:16px;box-shadow:0 1px 2px rgba(15,23,42,.05);}
.atv-card.atv-invalid{border-color:#EF4444;box-shadow:0 0 0 3px rgba(239,68,68,.12);}
.atv-card.title{grid-column:1/-1;}
.atv-card.adapt{background:linear-gradient(180deg,#FAF5FF,#FFFFFF);border-color:#E9D5FF;grid-column:1/-1;}
.atv-card h3{font-size:13.5px;font-weight:700;color:var(--ink,#0F172A);margin:0 0 10px;display:flex;align-items:center;gap:6px;}
.atv-card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
.atv-meta{font-size:11.5px;color:var(--muted,#64748B);font-family:'JetBrains Mono',monospace;margin-top:4px;}
.atv-collapser{width:100%;display:flex;justify-content:space-between;align-items:center;background:none;border:none;cursor:pointer;padding:0;color:inherit;font-family:inherit;}
.atv-collapser h3{margin:0;}
.atv-collapser:disabled{cursor:default;}
.atv-muted{color:var(--muted,#64748B);font-size:13px;margin:0;}
.atv-inline{cursor:text;border-radius:6px;padding:4px 6px;margin:-4px -6px;display:block;line-height:1.5;color:var(--ink,#0F172A);font-size:14px;}
h2.atv-inline{font-size:22px;font-weight:600;font-family:'Fraunces',Georgia,serif;letter-spacing:-.01em;}
.atv-inline:hover{background:#F8FAFC;}
.atv-inline-icon{opacity:0;margin-left:6px;color:var(--muted,#64748B);}
.atv-inline:hover .atv-inline-icon{opacity:1;}
.atv-inline-input{width:100%;border:1px solid var(--orange,#FF7A45);border-radius:6px;padding:6px 8px;font-size:14px;font-family:inherit;line-height:1.5;color:var(--ink,#0F172A);}
textarea.atv-inline-input{min-height:80px;resize:vertical;}
.atv-placeholder{color:var(--muted,#64748B);font-style:italic;}
.atv-block{margin-bottom:10px;}
.atv-block-label{font-size:11px;font-weight:700;color:var(--orange,#FF7A45);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;font-family:'JetBrains Mono',monospace;}
.atv-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;}
.atv-chip{display:inline-flex;align-items:center;gap:6px;background:rgba(59,130,246,.12);color:#1E40AF;padding:4px 8px 4px 10px;border-radius:14px;font-size:11.5px;font-weight:700;font-family:'JetBrains Mono',monospace;cursor:help;}
.atv-chip button{background:none;border:none;color:inherit;cursor:pointer;padding:2px;display:flex;align-items:center;border-radius:4px;}
.atv-chip button:hover{background:rgba(0,0,0,.1);}
.atv-empty-chip{font-size:12px;color:var(--muted,#64748B);font-style:italic;}
.atv-add-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}
.atv-add-row input{flex:1 1 140px;height:32px;border:1px solid var(--line,#E2E8F0);border-radius:6px;padding:0 8px;font-size:12.5px;font-family:inherit;}
.atv-adapt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;}
.atv-adapt-card{background:#fff;border:1px solid #E9D5FF;border-radius:8px;padding:10px;}
.atv-adapt-cat{font-size:10.5px;font-weight:700;color:#7C3AED;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;font-family:'JetBrains Mono',monospace;}
.atv-sug-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;}
.atv-sug{background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:6px;}
.atv-sug-title{font-weight:700;font-size:13px;color:#92400E;}
.atv-sug p{font-size:12.5px;color:var(--ink-2,#334155);margin:0;line-height:1.45;}
.atv-sug button{align-self:flex-start;}
.atv-mat{list-style:none;padding:0;margin:0 0 10px;display:flex;flex-direction:column;gap:4px;}
.atv-mat li{display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-radius:6px;font-size:13px;}
.atv-mat li:hover{background:#F8FAFC;}
.atv-mat label{display:flex;align-items:center;gap:8px;cursor:pointer;flex:1;}
.atv-x{background:none;border:none;color:var(--muted,#64748B);cursor:pointer;padding:4px;border-radius:4px;display:flex;align-items:center;}
.atv-x:hover{background:rgba(239,68,68,.1);color:#EF4444;}
`;