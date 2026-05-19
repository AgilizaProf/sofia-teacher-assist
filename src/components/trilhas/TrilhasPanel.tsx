import { useEffect, useMemo, useState } from "react";
import { usePersistentState } from "@/lib/persist/usePersistentState";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, Calendar, BookOpen, Trash2, Wand2, CheckCircle2, Printer, Download, Edit3, Save, X } from "lucide-react";
import { useTurmas } from "@/hooks/useTurmas";
import { consumirCreditos } from "@/lib/creditos/consume";
import { CUSTOS } from "@/lib/creditos/policy";
import { imprimirPlanejamentoDireto, salvarPlanejamentoDocx } from "@/lib/print/planejamentoDireto";
import { PrintInfoModal, type PrintInfo } from "@/components/print/PrintInfoModal";
import { feriadosNacionaisBR } from "@/lib/calendar/feriadosBR";

const DISCIPLINAS_COMUNS = [
  "Português", "Matemática", "Ciências", "História", "Geografia",
  "Arte", "Educação Física", "Inglês", "Ensino Religioso",
];

// Campos de experiência da BNCC para Educação Infantil. Substituem as
// disciplinas tradicionais quando a turma/ano é de Ed. Infantil.
const CAMPOS_EI = [
  "O eu, o outro e o nós",
  "Corpo, gestos e movimentos",
  "Traços, sons, cores e formas",
  "Escuta, fala, pensamento e imaginação",
  "Espaços, tempos, quantidades, relações e transformações",
];

const ANOS_ESCOLARES = [
  "Educação Infantil — Creche (0 a 3 anos)",
  "Educação Infantil — Pré-escola (4 e 5 anos)",
  "1º ano — Ensino Fundamental",
  "2º ano — Ensino Fundamental",
  "3º ano — Ensino Fundamental",
  "4º ano — Ensino Fundamental",
  "5º ano — Ensino Fundamental",
  "6º ano — Ensino Fundamental",
  "7º ano — Ensino Fundamental",
  "8º ano — Ensino Fundamental",
  "9º ano — Ensino Fundamental",
  "1ª série — Ensino Médio",
  "2ª série — Ensino Médio",
  "3ª série — Ensino Médio",
  "EJA — Fundamental",
  "EJA — Médio",
];

function normalizarAno(raw: string | null | undefined): string {
  if (!raw) return "";
  const s = String(raw).trim();
  if (!s) return "";
  const direct = ANOS_ESCOLARES.find((a) => a.toLowerCase() === s.toLowerCase());
  if (direct) return direct;
  const num = s.match(/(\d+)\s*[ºoª]?/);
  if (num) {
    const n = parseInt(num[1], 10);
    if (/médio|medio|em\b/i.test(s) && n >= 1 && n <= 3) {
      return `${n}ª série — Ensino Médio`;
    }
    if (n >= 1 && n <= 9) return `${n}º ano — Ensino Fundamental`;
  }
  return s;
}

type Trilha = {
  id: string;
  turma: string | null;
  ano_escolar: string | null;
  disciplina: string | null;
  semestre: string | null;
  tema_central: string | null;
  justificativa: string | null;
  status: string;
  created_at: string;
};

type Semana = {
  id: string;
  semana: number;
  titulo: string | null;
  habilidades_bncc: unknown;
  status: string;
  plano_gerado?: unknown;
};

export function TrilhasPanel() {
  const { turmas: turmasCadastradas } = useTurmas();
  const [trilhas, setTrilhas] = useState<Trilha[]>([]);
  const [semanas, setSemanas] = useState<Semana[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({
    turmaId: "",
    turma: "",
    ano: "",
    disciplinas: [] as string[],
    disciplinaCustom: "",
    interdisciplinar: true,
    semestre: "1º semestre",
    contexto: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gerandoSemana, setGerandoSemana] = useState<string | null>(null);
  const [planoAberto, setPlanoAberto] = useState<string | null>(null);

  // Detecta se o ano selecionado é Educação Infantil para alinhar a UI
  // (campos de experiência da BNCC) e o prompt enviado para a Sofia.
  const isEI = /educa[çc][ãa]o infantil|creche|pr[ée]-escola/i.test(form.ano);
  const disciplinasOpts = isEI ? CAMPOS_EI : DISCIPLINAS_COMUNS;
  const componenteLabel = isEI ? "Campos de experiência" : "Disciplinas";
  const componenteHintInter = isEI
    ? "selecione um ou mais (BNCC · Ed. Infantil)"
    : "selecione uma ou mais (interdisciplinar)";

  // Ao trocar para/de EI, descarta seleções que não pertencem ao novo modo
  // para evitar misturar disciplinas do EF com campos de experiência.
  useEffect(() => {
    setForm((f) => {
      const filtradas = f.disciplinas.filter((d) => disciplinasOpts.includes(d));
      if (filtradas.length === f.disciplinas.length) return f;
      return { ...f, disciplinas: filtradas };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEI]);

  const carregar = async () => {
    const { data } = await supabase.from("trilhas").select("*").order("created_at", { ascending: false });
    setTrilhas((data as Trilha[]) || []);
  };
  useEffect(() => { carregar(); }, []);

  useEffect(() => {
    if (!selected) { setSemanas([]); return; }
    supabase.from("trilha_semanas").select("*").eq("trilha_id", selected).order("semana")
      .then(({ data }) => setSemanas((data as Semana[]) || []));
  }, [selected]);

  const gerarTrilha = async () => {
    const discsAll = [
      ...form.disciplinas,
      ...form.disciplinaCustom.split(",").map((s) => s.trim()).filter(Boolean),
    ];
    if (!form.turma || !form.ano || discsAll.length === 0) {
      setError("Selecione a turma, o ano e ao menos uma disciplina.");
      return;
    }
    const multiplas = discsAll.length > 1;
    const interdisciplinar = multiplas && form.interdisciplinar;
    const disciplinaStr = !multiplas
      ? discsAll[0]
      : interdisciplinar
        ? (isEI
            ? `Interdisciplinar — Ed. Infantil (${discsAll.join(", ")})`
            : `Interdisciplinar (${discsAll.join(", ")})`)
        : discsAll.join(" + ");
    const eiPrefix = isEI
      ? `ETAPA: Educação Infantil (${form.ano}). Use EXCLUSIVAMENTE os Campos de Experiência da BNCC (NÃO use disciplinas do Ensino Fundamental). Trabalhe com Objetivos de Aprendizagem e Desenvolvimento (códigos EI01/EI02/EI03), interações, brincadeiras, eixos estruturantes e práticas adequadas à faixa etária. Não cite componentes como "Matemática", "Português", "Ciências" — substitua pelos campos correspondentes.\n\n`
      : "";
    const contextoFinal = !multiplas
      ? `${eiPrefix}${form.contexto}`
      : interdisciplinar
        ? `${eiPrefix}${form.contexto ? form.contexto + "\n\n" : ""}Tratar como TRILHA INTERDISCIPLINAR: integre ${discsAll.join(", ")} em torno de um tema único, com habilidades BNCC de cada componente articuladas semana a semana.`
        : `${eiPrefix}${form.contexto ? form.contexto + "\n\n" : ""}NÃO interdisciplinar: gere conteúdo SEPARADO para cada um dos componentes a seguir, mantendo identidade própria de cada ${isEI ? "campo de experiência" : "disciplina"} (${discsAll.join(", ")}). Para cada semana, indique claramente a qual componente pertence e suas habilidades BNCC específicas.`;
    setError(null); setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u?.user?.id;
      if (!userId) throw new Error("Faça login novamente.");
      const payload = {
        turma: form.turma,
        ano: form.ano,
        disciplina: disciplinaStr,
        semestre: form.semestre,
        contexto: contextoFinal,
      };
      const { data, error: fnErr } = await supabase.functions.invoke("gerar-trilha", { body: payload });
      if (fnErr) throw fnErr;
      const t = (data as { trilha?: Record<string, unknown> })?.trilha || {};
      const tema = (t.tema_central as { titulo?: string; justificativa?: string }) || {};
      const semanasArr = ((t.semanas as unknown[]) || []) as Array<{ semana: number; titulo: string; habilidades_foco?: string[]; tipo_atividade?: string; conecta_anterior?: string; prepara_proxima?: string }>;

      const { data: trilhaRow, error: insErr } = await supabase.from("trilhas").insert([{
        user_id: userId,
        client_id: `tr_${Date.now()}`,
        turma: form.turma,
        ano_escolar: form.ano,
        disciplina: disciplinaStr,
        semestre: form.semestre,
        ano_letivo: new Date().getFullYear(),
        tema_central: tema.titulo || "Trilha sem título",
        justificativa: tema.justificativa || "",
        contexto_adicional: form.contexto,
        status: "ativa",
        data: t as never,
      }]).select().single();
      if (insErr) throw insErr;

      if (semanasArr.length > 0) {
        const rows = semanasArr.slice(0, 20).map((s) => ({
          user_id: userId,
          trilha_id: trilhaRow!.id,
          semana: s.semana,
          titulo: s.titulo || `Semana ${s.semana}`,
          habilidades_bncc: s.habilidades_foco || [],
          tipo_atividade: s.tipo_atividade || "",
          conecta_anterior: s.conecta_anterior || "",
          prepara_proxima: s.prepara_proxima || "",
          status: s.semana === 1 ? "em_andamento" : "futura",
        }));
        await supabase.from("trilha_semanas").insert(rows);
      }
      await carregar();
      setSelected(trilhaRow!.id);
      setForm({ turmaId: "", turma: "", ano: "", disciplinas: [], disciplinaCustom: "", interdisciplinar: true, semestre: "1º semestre", contexto: "" });
      void consumirCreditos(CUSTOS.trilha_semestral, `Trilha semestral · ${tema.titulo || form.semestre}`);
      void import("@/lib/admin/track").then(({ trackEvent }) => trackEvent("trilha_gerada", { turma: form.turma, ano: form.ano, semestre: form.semestre, tema: tema.titulo ?? null, semanas: semanasArr.length }));
    } catch (e) {
      setError((e as Error).message || "Não consegui gerar a trilha agora. Tente em instantes.");
    } finally {
      setLoading(false);
    }
  };

  const excluir = async (id: string) => {
    if (!confirm("Apagar esta trilha?")) return;
    await supabase.from("trilhas").delete().eq("id", id);
    if (selected === id) setSelected(null);
    carregar();
  };

  const gerarPlanoSemana = async (trilha: Trilha, s: Semana) => {
    setGerandoSemana(s.id);
    try {
      const habilidades = Array.isArray(s.habilidades_bncc)
        ? (s.habilidades_bncc as unknown[]).map((h) => (typeof h === "string" ? { codigo: h } : h))
        : [];
      const idx = semanas.findIndex((x) => x.id === s.id);
      const anterior = idx > 0 ? semanas[idx - 1] : null;
      const proxima = idx >= 0 && idx < semanas.length - 1 ? semanas[idx + 1] : null;
      const { data, error: fnErr } = await supabase.functions.invoke("gerar-plano-semanal-trilha", {
        body: {
          semana: s.semana,
          tema_central: trilha.tema_central || "",
          habilidades_semana: habilidades,
          resumo_anterior: anterior?.titulo || "",
          titulo_proxima: proxima?.titulo || "",
          turma: trilha.turma || "",
          ano: trilha.ano_escolar || "",
          disciplina: trilha.disciplina || "",
        },
      });
      if (fnErr) throw fnErr;
      const plano = (data as { plano?: unknown })?.plano || {};
      await supabase.from("trilha_semanas")
        .update({ plano_gerado: plano as never, status: s.status === "futura" ? "em_andamento" : s.status })
        .eq("id", s.id);
      const { data: novas } = await supabase.from("trilha_semanas").select("*").eq("trilha_id", trilha.id).order("semana");
      setSemanas((novas as Semana[]) || []);
      setPlanoAberto(s.id);
      void consumirCreditos(CUSTOS.planejamento_semanal, `Planejamento semanal · Semana ${s.semana}`);
    } catch (e) {
      alert((e as Error).message || "Não consegui gerar o plano agora.");
    } finally {
      setGerandoSemana(null);
    }
  };

  const concluirSemana = async (s: Semana, trilhaId: string) => {
    await supabase.from("trilha_semanas").update({ status: "concluida", concluida_em: new Date().toISOString() }).eq("id", s.id);
    const { data: novas } = await supabase.from("trilha_semanas").select("*").eq("trilha_id", trilhaId).order("semana");
    setSemanas((novas as Semana[]) || []);
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: 20 }}>
        <h2 style={{ fontSize: 18, marginBottom: 4 }}>Nova trilha semestral <small style={{ color: "var(--muted)", fontWeight: 400, fontSize: 12.5, marginLeft: 6 }}>· Sofia distribui ~20 semanas com BNCC</small></h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 14 }}>
          <select
            value={form.turmaId}
            onChange={(e) => {
              const id = e.target.value;
              if (id === "__manual__") {
                setForm({ ...form, turmaId: id, turma: "", ano: form.ano });
                return;
              }
              const t = turmasCadastradas.find((x) => x.id === id);
              setForm({
                ...form,
                turmaId: id,
                turma: t?.name ?? "",
                ano: normalizarAno(t?.grade) || form.ano,
              });
            }}
            style={inputStyle}
          >
            <option value="">Selecione a turma…</option>
            {turmasCadastradas.map((t) => (
              <option key={t.id} value={t.id}>{t.name}{t.grade ? ` · ${t.grade}` : ""}</option>
            ))}
            <option value="__manual__">Outra (digitar)</option>
          </select>
          {form.turmaId === "__manual__" && (
            <input placeholder="Nome da turma" value={form.turma} onChange={(e) => setForm({ ...form, turma: e.target.value })} style={inputStyle} />
          )}
          <select
            value={ANOS_ESCOLARES.includes(form.ano) ? form.ano : ""}
            onChange={(e) => setForm({ ...form, ano: e.target.value })}
            style={inputStyle}
          >
            <option value="">Ano de escolaridade…</option>
            {ANOS_ESCOLARES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select value={form.semestre} onChange={(e) => setForm({ ...form, semestre: e.target.value })} style={inputStyle}>
            <option>1º semestre</option><option>2º semestre</option>
          </select>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 6 }}>
            {componenteLabel} <span style={{ color: "var(--ink-2)" }}>· {componenteHintInter}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {disciplinasOpts.map((d) => {
              const active = form.disciplinas.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setForm({
                    ...form,
                    disciplinas: active
                      ? form.disciplinas.filter((x) => x !== d)
                      : [...form.disciplinas, d],
                  })}
                  style={{
                    padding: "5px 11px",
                    borderRadius: 99,
                    border: "1px solid " + (active ? "var(--orange)" : "var(--line)"),
                    background: active ? "#FFF7ED" : "#fff",
                    color: active ? "#9A3412" : "var(--ink)",
                    fontSize: 12.5,
                    cursor: "pointer",
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <input
            placeholder={isEI ? "Outros campos/eixos (separe por vírgula)" : "Outras disciplinas (separe por vírgula)"}
            value={form.disciplinaCustom}
            onChange={(e) => setForm({ ...form, disciplinaCustom: e.target.value })}
            style={{ ...inputStyle, marginTop: 8, width: "100%" }}
          />
          {(form.disciplinas.length + form.disciplinaCustom.split(",").map((s) => s.trim()).filter(Boolean).length) > 1 && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12.5, color: "var(--ink-2)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.interdisciplinar}
                onChange={(e) => setForm({ ...form, interdisciplinar: e.target.checked })}
              />
              <span>
                Tratar como <strong>interdisciplinar</strong> (tema único integrando os componentes).
                <span style={{ color: "var(--muted)" }}> Desmarque para gerar conteúdo separado por {isEI ? "campo de experiência" : "disciplina"}.</span>
              </span>
            </label>
          )}
        </div>
        <textarea placeholder="Contexto adicional (opcional): projetos da escola, datas comemorativas..." value={form.contexto} onChange={(e) => setForm({ ...form, contexto: e.target.value })} style={{ ...inputStyle, marginTop: 10, minHeight: 60, width: "100%", resize: "vertical" }} />
        {error && <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: "#FEF2F2", color: "#991B1B", fontSize: 13 }}>{error}</div>}
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <button className="pl-btn primary" onClick={gerarTrilha} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? "Sofia está montando a trilha…" : "Sofia sugere a trilha"}
          </button>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: 20 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Suas trilhas</h2>
        {trilhas.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13 }}>Nenhuma trilha ainda. Crie a primeira acima.</p>}
        <div style={{ display: "grid", gap: 10 }}>
          {trilhas.map((t) => (
            <div key={t.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 14, cursor: "pointer", background: selected === t.id ? "#FFF7ED" : "#fff" }} onClick={() => setSelected(selected === t.id ? null : t.id)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}><BookOpen size={14} style={{ display: "inline", marginRight: 6 }} />{t.tema_central}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 4 }}>{t.turma} · {t.ano_escolar} · {t.disciplina} · {t.semestre}</div>
                </div>
                <button className="pl-btn ghost" onClick={(e) => { e.stopPropagation(); excluir(t.id); }} title="Excluir trilha"><Trash2 size={14} /></button>
              </div>
              {selected === t.id && (
                <div style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                  {t.justificativa && <p style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 12 }}>{t.justificativa}</p>}
                  <h3 style={{ fontSize: 14, marginBottom: 8 }}><Calendar size={14} style={{ display: "inline", marginRight: 6 }} />20 semanas</h3>
                  <div style={{ display: "grid", gap: 6 }}>
                    {semanas.map((s) => (
                      <div key={s.id} style={{ background: "#F8FAFC", borderRadius: 6, padding: "8px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                          <span style={{ minWidth: 28, fontWeight: 600, color: "var(--orange)" }}>S{s.semana}</span>
                          <span style={{ flex: 1 }}>{s.titulo}</span>
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: s.status === "concluida" ? "#D1FAE5" : s.status === "em_andamento" ? "#DBEAFE" : "#F1F5F9", color: s.status === "concluida" ? "#065F46" : s.status === "em_andamento" ? "#1E40AF" : "#64748B" }}>{s.status}</span>
                          {s.plano_gerado ? (
                            <button className="pl-btn ghost" onClick={(e) => { e.stopPropagation(); setPlanoAberto(planoAberto === s.id ? null : s.id); }} style={{ fontSize: 11 }}>
                              {planoAberto === s.id ? "Ocultar" : "Ver plano"}
                            </button>
                          ) : (
                            <button className="pl-btn ghost" onClick={(e) => { e.stopPropagation(); gerarPlanoSemana(t, s); }} disabled={gerandoSemana === s.id} style={{ fontSize: 11 }}>
                              {gerandoSemana === s.id ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}
                              {gerandoSemana === s.id ? "Gerando…" : "Gerar plano"}
                            </button>
                          )}
                          {s.status !== "concluida" && Boolean(s.plano_gerado) && (
                            <button className="pl-btn ghost" onClick={(e) => { e.stopPropagation(); concluirSemana(s, t.id); }} title="Marcar como concluída" style={{ fontSize: 11 }}>
                              <CheckCircle2 size={11} />
                            </button>
                          )}
                        </div>
                        {planoAberto === s.id && s.plano_gerado != null && (
                          <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 8, padding: 10, background: "#fff", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12.5, color: "var(--ink-2)" }}>
                            <PlanoSemanal plano={s.plano_gerado} trilha={t} semana={s} />
                          </div>
                        )}
                      </div>
                    ))}
                    {semanas.length === 0 && <p style={{ color: "var(--muted)", fontSize: 12.5 }}>Nenhuma semana gerada ainda.</p>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlanoSemanal({ plano, trilha, semana }: { plano: unknown; trilha: Trilha; semana: Semana }) {
  type DiaPlano = { dia?: string; titulo?: string; objetivo?: string; abertura?: string; desenvolvimento?: string; fechamento?: string; materiais?: string[]; habilidade_bncc?: string; adaptacao_pcd?: string };
  const pInicial = (plano || {}) as {
    objetivo_geral?: string;
    dias?: DiaPlano[];
    avaliacao_formativa?: string;
    ponte_proxima_semana?: string;
  };
  const [dias, setDias] = useState<DiaPlano[]>(pInicial.dias || []);
  const objetivoGeral = pInicial.objetivo_geral || "";
  const avaliacao = pInicial.avaliacao_formativa || "";
  const ponte = pInicial.ponte_proxima_semana || "";
  const today = new Date().toISOString().slice(0, 10);
  const [datas, setDatas] = useState<Record<number, string>>({});
  const [salvos, setSalvos] = useState<Record<number, "salvando" | "ok" | string>>({});
  const [salvandoTodos, setSalvandoTodos] = useState(false);
  // Persistência por (trilha, semana) — sobrevive a troca de aba M1–M7 e reload.
  const persistKey = `trilha_plano_${trilha.id}_${semana.id}`;
  const [formato, setFormato] = usePersistentState<"completo" | "topicos">(`${persistKey}_formato`, "completo");
  const [selIds, setSelIds] = usePersistentState<number[]>(`${persistKey}_sel`, dias.map((_, i) => i));
  const selecionados = useMemo(() => new Set(selIds), [selIds]);
  const setSelecionados = (updater: Set<number> | ((prev: Set<number>) => Set<number>)) => {
    const next = typeof updater === "function" ? (updater as (p: Set<number>) => Set<number>)(new Set(selIds)) : updater;
    setSelIds(Array.from(next).sort((a, b) => a - b));
  };
  const [editando, setEditando] = useState<Record<number, boolean>>({});
  const [rascunho, setRascunho] = useState<Record<number, DiaPlano>>({});
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // ===== Agendamento em sequência (toda segunda, dias úteis, etc.) =====
  type WeekdayMode = "todos" | "uteis" | "0" | "1" | "2" | "3" | "4" | "5" | "6";
  const [agendOpen, setAgendOpen] = useState(false);
  const [agendModo, setAgendModo] = useState<WeekdayMode>("1"); // segunda
  const [agendInicio, setAgendInicio] = useState<string>(today);
  const [agendPularFeriados, setAgendPularFeriados] = useState(true);
  const [agendSkip, setAgendSkip] = useState<Record<string, boolean>>({});
  const [agendExtra, setAgendExtra] = useState(0); // candidatas extras quando o usuário pede para estender

  // Dias personalizados para pular (feriados locais, provas, conselhos…)
  // Persistido por usuário/projeto via usePersistentState (cloud + local).
  type DiaPular = { date: string; label: string; tipo: "feriado_local" | "prova" | "outro" };
  const [diasPular, setDiasPular] = usePersistentState<DiaPular[]>("agendador_dias_pular", []);
  const [novoDiaPular, setNovoDiaPular] = useState<DiaPular>({ date: today, label: "", tipo: "feriado_local" });
  const [gerenciarOpen, setGerenciarOpen] = useState(false);
  const mapaDiasPular = useMemo(() => {
    const m = new Map<string, DiaPular>();
    diasPular.forEach((d) => m.set(d.date, d));
    return m;
  }, [diasPular]);
  const adicionarDiaPular = () => {
    if (!novoDiaPular.date) return;
    if (diasPular.some((d) => d.date === novoDiaPular.date)) return;
    setDiasPular([...diasPular, { ...novoDiaPular, label: novoDiaPular.label.trim() || (novoDiaPular.tipo === "prova" ? "Prova" : novoDiaPular.tipo === "feriado_local" ? "Feriado local" : "Sem aula") }].sort((a, b) => a.date.localeCompare(b.date)));
    setNovoDiaPular({ date: today, label: "", tipo: novoDiaPular.tipo });
  };
  const removerDiaPular = (iso: string) => setDiasPular(diasPular.filter((d) => d.date !== iso));

  const matchWeekday = (d: Date, modo: WeekdayMode): boolean => {
    const dow = d.getUTCDay(); // 0=Dom..6=Sab
    if (modo === "todos") return true;
    if (modo === "uteis") return dow >= 1 && dow <= 5;
    return dow === parseInt(modo, 10);
  };
  const parseIso = (iso: string): Date => {
    const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
    return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  };
  const fmtIso = (d: Date): string => d.toISOString().slice(0, 10);

  // Calcula próximas datas candidatas (com até 60 dias de busca a partir do início).
  const candidatas = useMemo(() => {
    if (!agendOpen) return [] as Array<{ iso: string; feriado: string | null; weekday: number; diaLocal: DiaPular | null }>;
    const out: Array<{ iso: string; feriado: string | null; weekday: number; diaLocal: DiaPular | null }> = [];
    const limite = Math.max(selecionados.size, 1) + 14 + agendExtra;
    let cursor = parseIso(agendInicio);
    const stopAt = new Date(cursor.getTime());
    stopAt.setUTCDate(stopAt.getUTCDate() + 365 + agendExtra * 7);
    const cacheAnos = new Map<number, Map<string, string>>();
    while (out.length < limite && cursor.getTime() <= stopAt.getTime()) {
      if (matchWeekday(cursor, agendModo)) {
        const iso = fmtIso(cursor);
        const y = cursor.getUTCFullYear();
        if (!cacheAnos.has(y)) cacheAnos.set(y, feriadosNacionaisBR(y));
        const feriado = cacheAnos.get(y)!.get(iso) ?? null;
        out.push({ iso, feriado, weekday: cursor.getUTCDay(), diaLocal: mapaDiasPular.get(iso) ?? null });
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return out;
  }, [agendOpen, agendModo, agendInicio, selecionados.size, mapaDiasPular, agendExtra]);

  const datasAgendadas = useMemo(() => {
    const finais: string[] = [];
    for (const c of candidatas) {
      if (agendPularFeriados && c.feriado) continue;
      if (c.diaLocal) continue; // sempre pula dias cadastrados pelo usuário
      if (agendSkip[c.iso]) continue;
      finais.push(c.iso);
      if (finais.length >= selecionados.size) break;
    }
    return finais;
  }, [candidatas, agendPularFeriados, agendSkip, selecionados.size]);

  const aplicarAgendamento = () => {
    if (datasAgendadas.length === 0) return;
    const ordemSel = Array.from(selecionados).sort((a, b) => a - b);
    const novas: Record<number, string> = { ...datas };
    ordemSel.forEach((idx, k) => {
      if (k < datasAgendadas.length) novas[idx] = datasAgendadas[k];
    });
    setDatas(novas);
    setAgendOpen(false);
  };

  const nomeDia = (w: number) => ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][w] || "";

  const toggleSel = (i: number) => setSelecionados((prev) => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });
  const selecionarTodos = () => setSelecionados(new Set(dias.map((_, i) => i)));
  const desmarcarTodos = () => setSelecionados(new Set());

  const iniciarEdicao = (i: number) => { setRascunho((r) => ({ ...r, [i]: { ...dias[i] } })); setEditando((e) => ({ ...e, [i]: true })); };
  const cancelarEdicao = (i: number) => { setEditando((e) => ({ ...e, [i]: false })); };
  const confirmarEdicao = (i: number) => {
    setDias((arr) => arr.map((d, idx) => (idx === i ? { ...(rascunho[i] || d) } : d)));
    setEditando((e) => ({ ...e, [i]: false }));
  };
  const setRascunhoCampo = (i: number, campo: keyof DiaPlano, valor: string) => {
    setRascunho((r) => ({ ...r, [i]: { ...(r[i] || dias[i]), [campo]: campo === "materiais" ? valor.split(",").map((s) => s.trim()).filter(Boolean) : valor } }));
  };

  const diasSelecionados = useMemo(() => dias.filter((_, i) => selecionados.has(i)), [dias, selecionados]);

  async function salvarDia(i: number, d: DiaPlano) {
    setSalvos((x) => ({ ...x, [i]: "salvando" }));
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u?.user?.id;
      if (!userId) throw new Error("Faça login novamente.");
      const dataDia = datas[i] || today;
      const titulo = d.titulo || `${trilha.disciplina ?? "Aula"} — S${semana.semana} dia ${i + 1}`;
      const payload = {
        user_id: userId,
        client_id: `pa_${Date.now()}_${i}`,
        titulo,
        dia: dataDia,
        semana: `S${semana.semana}`,
        data: {
          origem: "trilha",
          trilha_id: trilha.id,
          trilha_tema: trilha.tema_central,
          turma: trilha.turma,
          ano: trilha.ano_escolar,
          disciplina: trilha.disciplina,
          semana_numero: semana.semana,
          plano: d,
          objetivo_geral_semana: objetivoGeral || null,
        } as never,
      };
      const { error } = await supabase.from("planos_aula").insert([payload]);
      if (error) throw error;
      setSalvos((x) => ({ ...x, [i]: "ok" }));
      void import("@/lib/admin/track").then(({ trackEvent }) => trackEvent("plano_aula_salvo", { origem: "trilha", semana: semana.semana, disciplina: trilha.disciplina, ano: trilha.ano_escolar }));
    } catch (e) {
      setSalvos((x) => ({ ...x, [i]: (e as Error).message || "Erro" }));
    }
  }

  async function salvarSelecionados() {
    setSalvandoTodos(true);
    for (let i = 0; i < dias.length; i++) {
      if (!selecionados.has(i)) continue;
      if (salvos[i] === "ok") continue;
      await salvarDia(i, dias[i]);
    }
    setSalvandoTodos(false);
  }

  // ===== Exportações =====
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const buildHtml = (modo: "completo" | "topicos") => {
    const cabec = `<h1>${esc(trilha.tema_central || "Trilha")} · S${semana.semana}</h1>
<div class="meta">${esc(trilha.turma || "")} · ${esc(trilha.ano_escolar || "")} · ${esc(trilha.disciplina || "")} · ${esc(trilha.semestre || "")}</div>
${objetivoGeral ? `<p><b>Objetivo geral:</b> ${esc(objetivoGeral)}</p>` : ""}`;
    const corpo = diasSelecionados.map((d, idx) => {
      const titulo = `<h2>Dia ${idx + 1}${d.dia ? ` · ${esc(d.dia)}` : ""}${d.titulo ? ` — ${esc(d.titulo)}` : ""}</h2>`;
      if (modo === "topicos") {
        const itens: string[] = [];
        if (d.objetivo) itens.push(`<li><b>Objetivo:</b> ${esc(d.objetivo)}</li>`);
        if (d.habilidade_bncc) itens.push(`<li><b>BNCC:</b> ${esc(d.habilidade_bncc)}</li>`);
        if (d.abertura) itens.push(`<li><b>Abertura:</b> ${esc(d.abertura)}</li>`);
        if (d.desenvolvimento) itens.push(`<li><b>Desenvolvimento:</b> ${esc(d.desenvolvimento)}</li>`);
        if (d.fechamento) itens.push(`<li><b>Fechamento:</b> ${esc(d.fechamento)}</li>`);
        if (Array.isArray(d.materiais) && d.materiais.length) itens.push(`<li><b>Materiais:</b> ${esc(d.materiais.join(", "))}</li>`);
        if (d.adaptacao_pcd) itens.push(`<li><b>Adaptação PCD:</b> ${esc(d.adaptacao_pcd)}</li>`);
        return `${titulo}<ul>${itens.join("")}</ul>`;
      }
      const par = (rot: string, txt?: string) => (txt ? `<p><b>${rot}:</b> ${esc(txt)}</p>` : "");
      return `${titulo}
${par("Objetivo", d.objetivo)}
${par("BNCC", d.habilidade_bncc)}
${par("Abertura", d.abertura)}
${par("Desenvolvimento", d.desenvolvimento)}
${par("Fechamento", d.fechamento)}
${Array.isArray(d.materiais) && d.materiais.length ? `<p><b>Materiais:</b> ${esc(d.materiais.join(", "))}</p>` : ""}
${par("Adaptação PCD", d.adaptacao_pcd)}`;
    }).join("\n");
    const rod = `${avaliacao ? `<p><b>Avaliação formativa:</b> ${esc(avaliacao)}</p>` : ""}${ponte ? `<p><b>Ponte p/ próxima semana:</b> ${esc(ponte)}</p>` : ""}`;
    return `<!doctype html><html><head><meta charset="utf-8"><title>Trilha · S${semana.semana}</title>
<style>@page{size:A4;margin:22mm 20mm;}body{font-family:Inter,Arial,sans-serif;color:#0B1220;line-height:1.55;font-size:12pt;}h1{font-family:Fraunces,Georgia,serif;font-size:22pt;margin:0 0 4px;color:#0F1B36;}h2{font-size:13pt;color:#FF6A2C;margin:18px 0 6px;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #E7E9EF;padding-bottom:4px;}.meta{color:#6B7691;font-size:10.5pt;margin-bottom:14px;}p{margin:6px 0;}ul{margin:6px 0;padding-left:18px;}</style></head><body>${cabec}${corpo}${rod}</body></html>`;
  };
  const exportarPdf = () => {
    if (diasSelecionados.length === 0) { alert("Selecione ao menos um dia."); return; }
    setPrintModalOpen(true);
  };

  const construirArgsTrilha = (info: PrintInfo) => {
    if (diasSelecionados.length === 0) return null;
    return {
      titulo: "TRILHA SEMESTRAL",
      escola: info.escola || undefined,
      turma: info.turma || [trilha.turma, trilha.ano_escolar, trilha.disciplina].filter(Boolean).join(" · ") || undefined,
      professor: info.professor || undefined,
      dataInicio: info.dataInicio || undefined,
      dataFim: info.dataFim || undefined,
      secoes: diasSelecionados.map((d, idx) => {
        const blocos: Array<{ label: string; body?: string; bullets?: string[] }> = [];
        const ativ = [d.abertura, d.desenvolvimento, d.fechamento].filter(Boolean).join("\n\n");
        if (ativ) blocos.push({ label: "Atividades:", body: ativ });
        const obj = [d.objetivo, d.habilidade_bncc ? `BNCC: ${d.habilidade_bncc}` : ""].filter(Boolean).join("\n");
        if (obj) blocos.push({ label: "Objetivos:", body: obj });
        if (Array.isArray(d.materiais) && d.materiais.length) {
          blocos.push({ label: "Materiais e Recursos Utilizados:", bullets: d.materiais });
        }
        if (d.adaptacao_pcd) blocos.push({ label: "Adaptação PCD:", body: d.adaptacao_pcd });
        const titulo = `Dia ${idx + 1}${d.dia ? ` · ${d.dia}` : ""}${d.titulo ? ` — ${d.titulo}` : ""}`;
        return { titulo, blocos };
      }),
      rodapeLegal: "Documento gerado com apoio do AgilizaProf em consonância com a Lei 9.394/1996 (LDB) e a Resolução CNE/CP 4/2018 (BNCC).",
    };
  };

  const executarImpressao = (info: PrintInfo) => {
    const args = construirArgsTrilha(info);
    if (args) imprimirPlanejamentoDireto(args);
  };
  const executarSalvarWord = (info: PrintInfo) => {
    const args = construirArgsTrilha(info);
    if (args) salvarPlanejamentoDocx(args, `Trilha_${(trilha.tema_central || "plano").replace(/\s+/g, "_")}_S${semana.semana}`);
  };
  const exportarWord = () => {
    if (diasSelecionados.length === 0) { alert("Selecione ao menos um dia."); return; }
    const html = buildHtml(formato);
    const docHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">${html.replace(/^<!doctype html>/i, "").replace(/^<html>/i, "").replace(/<\/html>$/i, "")}</html>`;
    const blob = new Blob(['\ufeff', docHtml], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Trilha_${(trilha.tema_central || "plano").replace(/\s+/g, "_")}_S${semana.semana}.doc`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const renderCampo = (i: number, campo: keyof DiaPlano, label: string, multi = false) => {
    const d = dias[i];
    if (editando[i]) {
      const valor = (rascunho[i]?.[campo] as string | string[] | undefined);
      const v = Array.isArray(valor) ? valor.join(", ") : (valor || "");
      return (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 2 }}>{label}</div>
          {multi ? (
            <textarea value={v} onChange={(e) => setRascunhoCampo(i, campo, e.target.value)} style={{ ...inputStyle, width: "100%", minHeight: 50, fontSize: 12.5 }} />
          ) : (
            <input value={v} onChange={(e) => setRascunhoCampo(i, campo, e.target.value)} style={{ ...inputStyle, width: "100%", fontSize: 12.5 }} />
          )}
        </div>
      );
    }
    const val = d[campo];
    if (!val || (Array.isArray(val) && val.length === 0)) return null;
    const display = Array.isArray(val) ? val.join(", ") : String(val);
    if (formato === "topicos") return <li><strong>{label}:</strong> {display}</li>;
    return <div><em>{label}:</em> {display}</div>;
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {/* Toolbar: formato + seleção (alinhado com cabeçalho da BNCC/semana) */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", borderBottom: "1px dashed var(--line)", paddingBottom: 8 }}>
        <div style={{ display: "inline-flex", gap: 4, background: "#F1F5F9", borderRadius: 8, padding: 3 }}>
          <button type="button" onClick={() => setFormato("completo")}
            style={{ padding: "4px 10px", borderRadius: 6, border: 0, fontSize: 11.5, fontWeight: 700, cursor: "pointer", background: formato === "completo" ? "#fff" : "transparent", color: formato === "completo" ? "var(--ink)" : "var(--muted)" }}>
            Plano completo
          </button>
          <button type="button" onClick={() => setFormato("topicos")}
            style={{ padding: "4px 10px", borderRadius: 6, border: 0, fontSize: 11.5, fontWeight: 700, cursor: "pointer", background: formato === "topicos" ? "#fff" : "transparent", color: formato === "topicos" ? "var(--ink)" : "var(--muted)" }}>
            Tópicos
          </button>
        </div>
        <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{selecionados.size}/{dias.length} selecionado(s)</span>
          <button className="pl-btn ghost" onClick={selecionarTodos} style={{ fontSize: 11 }}>Selecionar todos</button>
          <button className="pl-btn ghost" onClick={desmarcarTodos} style={{ fontSize: 11 }}>Desmarcar todos</button>
          <button
            className="pl-btn ghost"
            onClick={() => setAgendOpen((v) => !v)}
            disabled={selecionados.size === 0}
            style={{ fontSize: 11 }}
            title="Distribuir as atividades selecionadas em dias sequenciais"
          >
            <Calendar size={11} /> {agendOpen ? "Fechar agendamento" : "Agendar em sequência"}
          </button>
        </div>
      </div>

      {agendOpen && (
        <div style={{ background: "#F8FAFC", border: "1px solid var(--line)", borderRadius: 10, padding: 12, display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>
            Agendar {selecionados.size} atividade(s) em sequência
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <label style={{ fontSize: 11.5, color: "var(--muted)" }}>Recorrência:</label>
            <select value={agendModo} onChange={(e) => setAgendModo(e.target.value as WeekdayMode)} style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }}>
              <option value="1">Toda segunda-feira</option>
              <option value="2">Toda terça-feira</option>
              <option value="3">Toda quarta-feira</option>
              <option value="4">Toda quinta-feira</option>
              <option value="5">Toda sexta-feira</option>
              <option value="6">Todo sábado</option>
              <option value="0">Todo domingo</option>
              <option value="uteis">Todos os dias úteis (seg–sex)</option>
              <option value="todos">Todos os dias</option>
            </select>
            <label style={{ fontSize: 11.5, color: "var(--muted)" }}>A partir de:</label>
            <input type="date" value={agendInicio} onChange={(e) => setAgendInicio(e.target.value)} style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }} />
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--ink-2)", cursor: "pointer" }}>
              <input type="checkbox" checked={agendPularFeriados} onChange={(e) => setAgendPularFeriados(e.target.checked)} />
              Pular feriados nacionais
            </label>
            <button type="button" className="pl-btn ghost" onClick={() => setGerenciarOpen((v) => !v)} style={{ fontSize: 11 }}>
              {gerenciarOpen ? "Fechar dias personalizados" : `Dias personalizados (${diasPular.length})`}
            </button>
          </div>
          {gerenciarOpen && (
            <div style={{ background: "#fff", border: "1px dashed var(--line)", borderRadius: 8, padding: 10, display: "grid", gap: 8 }}>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                Cadastre feriados locais, dias de prova ou outros dias sem aula. Eles serão sempre pulados pelo agendador.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <input type="date" value={novoDiaPular.date} onChange={(e) => setNovoDiaPular({ ...novoDiaPular, date: e.target.value })} style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }} />
                <select value={novoDiaPular.tipo} onChange={(e) => setNovoDiaPular({ ...novoDiaPular, tipo: e.target.value as DiaPular["tipo"] })} style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }}>
                  <option value="feriado_local">Feriado local</option>
                  <option value="prova">Prova</option>
                  <option value="outro">Outro (sem aula)</option>
                </select>
                <input
                  placeholder="Descrição (opcional)"
                  value={novoDiaPular.label}
                  onChange={(e) => setNovoDiaPular({ ...novoDiaPular, label: e.target.value })}
                  style={{ ...inputStyle, padding: "4px 8px", fontSize: 12, flex: 1, minWidth: 160 }}
                />
                <button type="button" className="pl-btn primary" onClick={adicionarDiaPular} disabled={!novoDiaPular.date} style={{ fontSize: 11 }}>
                  Adicionar
                </button>
              </div>
              {diasPular.length > 0 ? (
                <div style={{ display: "grid", gap: 3, maxHeight: 140, overflowY: "auto" }}>
                  {diasPular.map((d) => (
                    <div key={d.date} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "3px 6px", background: "#F8FAFC", borderRadius: 6 }}>
                      <span style={{ minWidth: 92, fontWeight: 600 }}>{d.date.split("-").reverse().join("/")}</span>
                      <span style={{ fontSize: 10.5, padding: "1px 6px", borderRadius: 99, background: d.tipo === "prova" ? "#DBEAFE" : d.tipo === "feriado_local" ? "#FEE2E2" : "#F1F5F9", color: d.tipo === "prova" ? "#1E40AF" : d.tipo === "feriado_local" ? "#991B1B" : "#475569" }}>
                        {d.tipo === "prova" ? "Prova" : d.tipo === "feriado_local" ? "Feriado local" : "Sem aula"}
                      </span>
                      <span style={{ flex: 1, color: "var(--ink-2)" }}>{d.label}</span>
                      <button type="button" className="pl-btn ghost" onClick={() => removerDiaPular(d.date)} style={{ fontSize: 10.5 }}>Remover</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 11.5, color: "var(--muted)", fontStyle: "italic" }}>Nenhum dia personalizado cadastrado ainda.</div>
              )}
            </div>
          )}
          {(() => {
            const ordemSel = Array.from(selecionados).sort((a, b) => a - b);
            const mapaIsoParaAtividade = new Map<string, number>();
            datasAgendadas.forEach((iso, k) => {
              const idx = ordemSel[k];
              if (typeof idx === "number") mapaIsoParaAtividade.set(iso, idx);
            });
            const tituloAtiv = (i: number) => {
              const d = dias[i];
              const t = d?.titulo || d?.dia || "";
              return `Atividade ${i + 1}${t ? ` — ${t}` : ""}`;
            };
            return (
              <>
          <div style={{ display: "grid", gap: 4, maxHeight: 220, overflowY: "auto", background: "#fff", border: "1px solid var(--line)", borderRadius: 8, padding: 8 }}>
            {candidatas.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Nenhuma data candidata encontrada.</div>
            )}
            {candidatas.map((c) => {
              const auto = (agendPularFeriados && !!c.feriado) || !!c.diaLocal;
              const manual = !!agendSkip[c.iso];
              const atividadeIdx = mapaIsoParaAtividade.get(c.iso);
              const usado = atividadeIdx !== undefined;
              return (
                <label key={c.iso} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: auto ? "var(--muted)" : "var(--ink)", textDecoration: auto || manual ? "line-through" : "none", cursor: auto ? "not-allowed" : "pointer" }}>
                  <input
                    type="checkbox"
                    checked={!auto && !manual}
                    disabled={auto}
                    onChange={(e) => setAgendSkip((s) => ({ ...s, [c.iso]: !e.target.checked }))}
                    style={{ accentColor: "var(--orange)" }}
                  />
                  <span style={{ minWidth: 36, fontWeight: 600 }}>{nomeDia(c.weekday)}</span>
                  <span style={{ minWidth: 92 }}>{c.iso.split("-").reverse().join("/")}</span>
                  {usado && (
                    <span style={{ fontSize: 10.5, padding: "1px 6px", borderRadius: 99, background: "#FFF7ED", color: "#9A3412", fontWeight: 600 }}>
                      → {tituloAtiv(atividadeIdx!)}
                    </span>
                  )}
                  {c.feriado && <span style={{ fontSize: 10.5, color: "#991B1B" }}>· {c.feriado}{auto ? " (pulado)" : ""}</span>}
                  {c.diaLocal && (
                    <span style={{ fontSize: 10.5, color: c.diaLocal.tipo === "prova" ? "#1E40AF" : "#991B1B" }}>
                      · {c.diaLocal.tipo === "prova" ? "Prova" : c.diaLocal.tipo === "feriado_local" ? "Feriado local" : "Sem aula"}{c.diaLocal.label ? `: ${c.diaLocal.label}` : ""} (pulado)
                    </span>
                  )}
                </label>
              );
            })}
          </div>
          {datasAgendadas.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>
                Pré-visualização do agendamento
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                {ordemSel.map((idx, k) => {
                  const iso = datasAgendadas[k];
                  return (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      <span style={{ minWidth: 90, color: "var(--muted)" }}>{tituloAtiv(idx).split(" — ")[0]}</span>
                      <span style={{ flex: 1, color: "var(--ink)" }}>{dias[idx]?.titulo || dias[idx]?.dia || "(sem título)"}</span>
                      <span style={{ minWidth: 18, color: "var(--muted)" }}>→</span>
                      {iso ? (
                        <span style={{ fontWeight: 600, color: "#9A3412" }}>
                          {nomeDia(parseIso(iso).getUTCDay())}, {iso.split("-").reverse().join("/")}
                        </span>
                      ) : (
                        <span style={{ color: "#991B1B", fontStyle: "italic" }}>sem data disponível</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
              </>
            );
          })()}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
              {datasAgendadas.length}/{selecionados.size} datas preparadas
              {datasAgendadas.length < selecionados.size && " — amplie o intervalo ou desmarque menos dias."}
            </div>
            <div style={{ display: "inline-flex", gap: 6 }}>
              <button className="pl-btn ghost" onClick={() => { setAgendSkip({}); }} style={{ fontSize: 11 }}>Limpar exclusões</button>
              <button className="pl-btn primary" onClick={aplicarAgendamento} disabled={datasAgendadas.length === 0} style={{ fontSize: 11 }}>
                Aplicar datas
              </button>
            </div>
          </div>
        </div>
      )}

      {objetivoGeral && <div><strong>Objetivo geral:</strong> {objetivoGeral}</div>}
      {dias.map((d, i) => {
        const status = salvos[i];
        const sel = selecionados.has(i);
        const isEditing = !!editando[i];
        const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => formato === "topicos"
          ? <ul style={{ margin: "4px 0", paddingLeft: 18 }}>{children}</ul>
          : <>{children}</>;
        return (
          <div key={i} style={{ borderLeft: `3px solid ${sel ? "var(--orange)" : "#E2E8F0"}`, paddingLeft: 8, opacity: sel ? 1 : 0.6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={sel} onChange={() => toggleSel(i)} style={{ width: 14, height: 14, accentColor: "var(--orange)" }} />
              {isEditing ? (
                <>
                  <input value={(rascunho[i]?.dia ?? d.dia ?? "")} onChange={(e) => setRascunhoCampo(i, "dia", e.target.value)} placeholder="Dia" style={{ ...inputStyle, fontSize: 12.5, padding: "4px 8px", maxWidth: 140 }} />
                  <input value={(rascunho[i]?.titulo ?? d.titulo ?? "")} onChange={(e) => setRascunhoCampo(i, "titulo", e.target.value)} placeholder="Título" style={{ ...inputStyle, fontSize: 12.5, padding: "4px 8px", flex: 1 }} />
                </>
              ) : (
                <div style={{ fontWeight: 600, flex: 1 }}>{d.dia}{d.dia && d.titulo ? " — " : ""}{d.titulo}</div>
              )}
              {isEditing ? (
                <>
                  <button className="pl-btn ghost" onClick={() => confirmarEdicao(i)} style={{ fontSize: 11 }}><Save size={11} /> Aplicar</button>
                  <button className="pl-btn ghost" onClick={() => cancelarEdicao(i)} style={{ fontSize: 11 }}><X size={11} /> Cancelar</button>
                </>
              ) : (
                <button className="pl-btn ghost" onClick={() => iniciarEdicao(i)} title="Editar atividade" style={{ fontSize: 11 }}><Edit3 size={11} /> Editar</button>
              )}
            </div>
            <Wrapper>
              {renderCampo(i, "objetivo", "Objetivo")}
              {renderCampo(i, "habilidade_bncc", "BNCC")}
              {renderCampo(i, "abertura", "Abertura", true)}
              {renderCampo(i, "desenvolvimento", "Desenvolvimento", true)}
              {renderCampo(i, "fechamento", "Fechamento", true)}
              {renderCampo(i, "materiais", "Materiais")}
              {renderCampo(i, "adaptacao_pcd", "Adaptação PCD", true)}
            </Wrapper>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              <label style={{ fontSize: 11.5, color: "var(--muted)" }}>Distribuir no dia:</label>
              <input
                type="date"
                value={datas[i] || today}
                onChange={(e) => setDatas((x) => ({ ...x, [i]: e.target.value }))}
                style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }}
              />
              <button
                className="pl-btn ghost"
                onClick={() => salvarDia(i, d)}
                disabled={status === "salvando"}
                style={{ fontSize: 11 }}
              >
                {status === "salvando" ? <Loader2 size={11} className="animate-spin" /> : status === "ok" ? <CheckCircle2 size={11} /> : <BookOpen size={11} />}
                {status === "ok" ? "Salvo no Planejamento" : status === "salvando" ? "Salvando…" : "Salvar como plano de aula"}
              </button>
              {typeof status === "string" && status !== "ok" && status !== "salvando" && (
                <span style={{ fontSize: 11, color: "#991B1B" }}>{status}</span>
              )}
            </div>
          </div>
        );
      })}
      {avaliacao && <div><strong>Avaliação formativa:</strong> {avaliacao}</div>}
      {ponte && <div><strong>Ponte p/ próxima semana:</strong> {ponte}</div>}
      {dias.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 6 }}>
          <button className="pl-btn ghost" onClick={exportarPdf} style={{ fontSize: 12 }} disabled={selecionados.size === 0}>
            <Printer size={12} /> Imprimir / PDF
          </button>
          <button className="pl-btn primary" onClick={salvarSelecionados} disabled={salvandoTodos || selecionados.size === 0} style={{ fontSize: 12 }}>
            {salvandoTodos ? <Loader2 size={12} className="animate-spin" /> : <BookOpen size={12} />}
            {salvandoTodos ? "Salvando…" : `Salvar ${selecionados.size > 0 ? `(${selecionados.size}) ` : ""}no Planejamento`}
          </button>
        </div>
      )}
      <PrintInfoModal
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        defaults={{ turma: [trilha.turma, trilha.ano_escolar, trilha.disciplina].filter(Boolean).join(" · ") || undefined }}
        onConfirm={executarImpressao}
        onConfirmWord={executarSalvarWord}
      />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  fontSize: 13,
  fontFamily: "inherit",
  background: "#fff",
  color: "var(--ink)",
};