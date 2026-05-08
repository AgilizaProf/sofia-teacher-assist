import { useEffect, useMemo, useState } from "react";
import {
  Sparkles, RefreshCw, Plus, Copy, ChevronDown, ChevronUp, X,
  Check, Pencil, Lightbulb, AlertTriangle, Save, FileDown, CalendarPlus,
  Search, Trash2, FileText,
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
export type OpcaoAula = { titulo: string; resumo: string; abordagem: string };

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
  meta?: {
    ano: string; turma: string; disciplina: string; tema: string;
    duracao: string; tipo: string; incluirPCD: boolean;
    modo: "regular" | "pcd"; geradoEm: string;
  };
};

type PlanoSalvo = {
  id: string;
  remoteId?: string;
  titulo: string;
  turma: string;
  disciplina: string;
  ano: string;
  modo: "regular" | "pcd";
  salvoEm: string;
  plano: PlanoAtividade;
};

const EMPTY: PlanoAtividade = {
  titulo: "", objetivo: "", abertura: "", desenvolvimento: "", fechamento: "",
  habilidades: [], adaptacoes: [], sugestoes: [], materiais: [], materiaisCheck: {},
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

const DURACOES = ["30 min", "45 min", "1h", "1h30"];
const TIPOS = ["Individual", "Em dupla", "Em grupo", "Livre"];

/* M1 card type — kept compatible with src/pages/Planejamento.tsx */
type DayKey = "seg" | "ter" | "qua" | "qui" | "sex";
type Variant = "port" | "mat" | "aval" | "esc" | "ci";
type M1Card = {
  id: string; v: Variant; tag: string; title: string;
  bncc: string; minutos: number; foco: string; motivo?: string;
};
type M1Plan = Record<DayKey, M1Card[]>;
const EMPTY_M1: M1Plan = { seg: [], ter: [], qua: [], qui: [], sex: [] };

const VARIANT_BY_DISC: Record<string, Variant> = {
  "Língua Portuguesa": "port",
  "Matemática": "mat",
  "Ciências": "ci",
  "História": "esc",
  "Geografia": "esc",
  "Arte": "esc",
  "Educação Física": "esc",
  "Inglês": "port",
};
const TAG_BY_DISC: Record<string, string> = {
  "Língua Portuguesa": "PORT",
  "Matemática": "MAT",
  "Ciências": "CIÊ",
  "História": "HIST",
  "Geografia": "GEO",
  "Arte": "ART",
  "Educação Física": "EDF",
  "Inglês": "ING",
};
const DUR_TO_MIN: Record<string, number> = {
  "30 min": 30, "45 min": 45, "1h": 60, "1h30": 90,
};

/* ─────────────────────────── Component ─────────────────────────── */

export function PlanoAtividadeEditor({ modo }: { modo: "regular" | "pcd" }) {
  const sofia = useSofiaUserData();

  const [plano, setPlano] = usePersistentState<PlanoAtividade>(
    `plan_atividade_${modo}_v1`, EMPTY,
  );
  const [historico, setHistorico] = usePersistentState<PlanoSalvo[]>(
    `plan_atividade_${modo}_hist_v1`, [],
  );

  // M1 plan (mesma chave usada em Planejamento.tsx)
  const [m1Plan, setM1Plan] = usePersistentState<M1Plan>("plan_m1_plan", EMPTY_M1);

  const turmasPerfil = sofia.turmas;
  const [turma, setTurma] = useState<string>(turmasPerfil[0]?.nome ?? "");
  const [disciplina, setDisciplina] = useState<string>(DISCIPLINAS[0]);
  const [tema, setTema] = useState<string>("");
  const [duracao, setDuracao] = useState<string>("45 min");
  const [tipo, setTipo] = useState<string>("Livre");
  const [generating, setGenerating] = useState(false);
  const [regenField, setRegenField] = useState<string>(""); // só visual
  const [erro, setErro] = useState<string>("");
  const [missing, setMissing] = useState<string[]>([]);
  const [salvo, setSalvo] = useState(false);
  const [toast, setToast] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [confirmDel, setConfirmDel] = useState<string>("");

  // Opções de aula (etapa antes de gerar o plano completo)
  const [opcoes, setOpcoes] = useState<OpcaoAula[]>([]);
  const [opcoesSel, setOpcoesSel] = useState<number[]>([]);
  const [loadingOpcoes, setLoadingOpcoes] = useState(false);

  // Ano escolar derivado da turma (badge não-editável quando há turma)
  const turmaInfo = useMemo(
    () => turmasPerfil.find((t) => t.nome === turma),
    [turmasPerfil, turma],
  );
  const [anoFallback, setAnoFallback] = useState<string>(ANOS_FALLBACK[3]);
  // c.grade vem como "1".."9" do cadastro de turmas — formata para "Nº ano EF".
  const formatAno = (raw: string): string => {
    const t = (raw || "").trim();
    if (!t) return "";
    if (/^\d+$/.test(t)) {
      const n = parseInt(t, 10);
      if (n >= 1 && n <= 9) return `${n}º ano EF`;
    }
    return t;
  };
  const anoTurma = formatAno(turmaInfo?.ano || "");
  const anoEscolar = anoTurma || anoFallback;

  // Quando a turma muda, sincroniza o fallback com o ano da turma —
  // assim, ao desmarcar a turma, o ano permanece coerente.
  useEffect(() => {
    if (anoTurma) setAnoFallback(anoTurma);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anoTurma]);

  const alunosPCDDaTurma = useMemo(() => {
    if (!turma) return sofia.alunosPCD;
    return sofia.alunosPCDPorTurma[turma] ?? [];
  }, [sofia, turma]);

  // Toggle PCD: ligado por padrão se a turma tiver PCD
  const [incluirPCD, setIncluirPCD] = useState<boolean>(true);
  useEffect(() => {
    setIncluirPCD(alunosPCDDaTurma.length > 0);
  }, [turma, alunosPCDDaTurma.length]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2200);
  };

  /* ─────────── Geração (full ou por campo) ─────────── */

  const callSofia = async (field?: string): Promise<PlanoAtividade | null> => {
    setErro("");
    const payload = {
      modo, anoEscolar, disciplina, turma,
      tema: tema.trim(),
      duracao, tipoAtividade: tipo,
      incluirPCD: modo === "pcd" ? true : incluirPCD,
      regenField: field ?? "",
      planoAtual: field ? plano : null,
      opcoesSelecionadas: !field
        ? opcoesSel.map((i) => opcoes[i]).filter(Boolean)
        : [],
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
    if (error) {
      const msg = (error as { context?: { error?: string } })?.context?.error
        || (error as Error)?.message || "Falha ao gerar.";
      setErro(msg);
      return null;
    }
    const novo = data?.plano as PlanoAtividade | undefined;
    if (!novo) { setErro("Sofia não retornou um plano válido."); return null; }
    return novo;
  };

  const sugerirOpcoes = async () => {
    setErro("");
    setLoadingOpcoes(true);
    const payload = {
      modo, anoEscolar, disciplina, turma,
      tema: tema.trim(),
      duracao, tipoAtividade: tipo,
      incluirPCD: modo === "pcd" ? true : incluirPCD,
      etapa: "opcoes",
      alunosPCD: alunosPCDDaTurma.map((a) => ({
        nome: a.primeiro_nome,
        tipo: a.pcd_codigo || "PCD",
      })),
    };
    const { data, error } = await supabase.functions.invoke("gerar-atividade", {
      body: payload,
    });
    setLoadingOpcoes(false);
    if (error) {
      const msg = (error as { context?: { error?: string } })?.context?.error
        || (error as Error)?.message || "Falha ao sugerir opções.";
      setErro(msg);
      return;
    }
    const lista = (data?.opcoes as OpcaoAula[] | undefined) ?? [];
    if (lista.length === 0) {
      setErro("Sofia não retornou opções. Tente reformular o tema.");
      return;
    }
    setOpcoes(lista);
    setOpcoesSel([]);
    setPlano(EMPTY);
  };

  const toggleOpcao = (i: number) =>
    setOpcoesSel((sel) =>
      sel.includes(i) ? sel.filter((x) => x !== i) : [...sel, i],
    );

  const gerar = async () => {
    setGenerating(true);
    const novo = await callSofia();
    setGenerating(false);
    if (!novo) return;
    const enriched: PlanoAtividade = {
      ...EMPTY, ...novo, materiaisCheck: {},
      meta: {
        ano: anoEscolar, turma, disciplina, tema,
        duracao, tipo, incluirPCD: modo === "pcd" ? true : incluirPCD,
        modo, geradoEm: new Date().toISOString(),
      },
    };
    setPlano(enriched);
    setMissing([]);
    setOpcoes([]);
    setOpcoesSel([]);
    logActivity({
      type: "planejamento",
      description: modo === "pcd"
        ? `Atividade PCD gerada: ${enriched.titulo}`
        : `Atividade gerada: ${enriched.titulo}`,
      detail: `${anoEscolar} · ${disciplina}`,
    });
  };

  const regenerarCampo = async (field: keyof PlanoAtividade) => {
    setRegenField(field as string);
    const novo = await callSofia(field as string);
    setRegenField("");
    if (!novo) return;
    setPlano({ ...plano, [field]: novo[field] as PlanoAtividade[typeof field] });
    showToast(`Sofia regenerou: ${field}`);
  };

  const limpar = () => {
    setPlano(EMPTY);
    setMissing([]); setErro(""); setSalvo(false);
    setOpcoes([]); setOpcoesSel([]);
  };

  const setField = <K extends keyof PlanoAtividade>(k: K, v: PlanoAtividade[K]) =>
    setPlano({ ...plano, [k]: v });

  const toggleMat = (i: number) =>
    setPlano({
      ...plano,
      materiaisCheck: { ...(plano.materiaisCheck ?? {}), [i]: !(plano.materiaisCheck ?? {})[i] },
    });

  const addMat = (s: string) => {
    const v = s.trim(); if (!v) return;
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
    setPlano({ ...plano, titulo: s.titulo, desenvolvimento: s.descricao });
    logActivity({ type: "planejamento", description: `Variação aplicada: ${s.titulo}` });
    showToast("Variação aplicada");
  };

  const copiarMateriais = async () => {
    try { await navigator.clipboard.writeText(plano.materiais.map((m) => `• ${m}`).join("\n")); } catch { /* noop */ }
  };

  const temPlano = !!plano.titulo;

  /* ─────────── Validação ─────────── */

  const validar = (): string[] => {
    const f: string[] = [];
    if (!plano.titulo.trim()) f.push("titulo");
    if (!plano.objetivo.trim()) f.push("objetivo");
    if (!plano.abertura.trim() && !plano.desenvolvimento.trim() && !plano.fechamento.trim()) f.push("descricao");
    if (plano.habilidades.length === 0) f.push("habilidades");
    else if (plano.habilidades.some((h) => !h.codigo.trim() || !h.descricao.trim())) f.push("habilidades_incompletas");
    return f;
  };

  useEffect(() => {
    if (missing.length === 0) return;
    const ainda = validar();
    if (ainda.length !== missing.length) setMissing(ainda);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plano.titulo, plano.objetivo, plano.abertura, plano.desenvolvimento, plano.fechamento, plano.habilidades]);

  /* ─────────── Salvar / Histórico (local + remoto) ─────────── */

  const salvarPlano = async () => {
    const f = validar();
    setMissing(f);
    if (f.length > 0) { setSalvo(false); return; }

    const id = `p_${Date.now()}`;
    const registro: PlanoSalvo = {
      id, titulo: plano.titulo, turma, disciplina, ano: anoEscolar, modo,
      salvoEm: new Date().toISOString(),
      plano: { ...plano },
    };

    // 1) commit local imediato
    setHistorico([registro, ...historico].slice(0, 100));

    // 2) commit remoto best-effort (planos_aula)
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (uid) {
        const { data, error } = await supabase
          .from("planos_aula")
          .insert({
            user_id: uid,
            client_id: id,
            titulo: plano.titulo,
            data: { ...registro, plano },
          })
          .select("id")
          .single();
        if (!error && data?.id) {
          setHistorico((h) => h.map((p) => p.id === id ? { ...p, remoteId: data.id } : p));
        }
      }
    } catch { /* offline ok */ }

    logActivity({
      type: "planejamento",
      description: modo === "pcd"
        ? `Planejamento PCD salvo: ${plano.titulo}`
        : `Planejamento salvo: ${plano.titulo}`,
      detail: `${anoEscolar} · ${disciplina}`,
    });
    setSalvo(true);
    showToast("Plano salvo no histórico");
    window.setTimeout(() => setSalvo(false), 2000);
  };

  const carregarPlano = (p: PlanoSalvo) => {
    setPlano(p.plano);
    if (p.turma) setTurma(p.turma);
    if (p.disciplina) setDisciplina(p.disciplina);
    setAnoFallback(p.ano);
    showToast(`Plano "${p.titulo}" carregado`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const duplicarPlano = (p: PlanoSalvo) => {
    const copia: PlanoAtividade = { ...p.plano, titulo: `${p.plano.titulo} (cópia)` };
    setPlano(copia);
    showToast("Cópia editável criada");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removerPlano = async (p: PlanoSalvo) => {
    setHistorico(historico.filter((x) => x.id !== p.id));
    setConfirmDel("");
    if (p.remoteId) {
      try { await supabase.from("planos_aula").delete().eq("id", p.remoteId); } catch { /* noop */ }
    }
    showToast("Plano removido");
  };

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return historico;
    return historico.filter((p) =>
      p.titulo.toLowerCase().includes(q) || p.disciplina.toLowerCase().includes(q),
    );
  }, [historico, busca]);

  /* ─────────── Adicionar ao M1 ─────────── */

  const adicionarAoM1 = () => {
    const f = validar();
    setMissing(f);
    if (f.length > 0) return;
    // Próximo dia útil sem cards (ou seg se todos cheios)
    const ordem: DayKey[] = ["seg", "ter", "qua", "qui", "sex"];
    const alvo = ordem.find((d) => (m1Plan[d] || []).length === 0) ?? "seg";
    const card: M1Card = {
      id: `m1_${Date.now()}`,
      v: VARIANT_BY_DISC[disciplina] ?? "port",
      tag: TAG_BY_DISC[disciplina] ?? "ATV",
      title: plano.titulo,
      bncc: plano.habilidades[0]?.codigo ?? "—",
      minutos: DUR_TO_MIN[duracao] ?? 45,
      foco: plano.objetivo.slice(0, 80),
      motivo: `Adicionado da aba ${modo === "pcd" ? "Atividades PCD" : "Atividades"}.`,
    };
    setM1Plan({ ...m1Plan, [alvo]: [...(m1Plan[alvo] || []), card] });
    logActivity({
      type: "planejamento",
      description: `Plano enviado ao M1 (${alvo.toUpperCase()}): ${plano.titulo}`,
    });
    showToast(`Adicionado a M1 · ${alvo.toUpperCase()}`);
  };

  /* ─────────── PDF ─────────── */

  const exportarPDF = async () => {
    const f = validar();
    setMissing(f);
    if (f.length > 0) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    const contentW = pageW - margin * 2;
    let y = margin;
    const newPageIfNeeded = (h: number) => {
      if (y + h > pageH - margin) { doc.addPage(); y = margin; }
    };
    const h1 = (s: string) => {
      newPageIfNeeded(28);
      doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(15,23,42);
      doc.text(s, margin, y); y += 22;
    };
    const h2 = (s: string) => {
      newPageIfNeeded(22);
      doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(255,122,69);
      doc.text(s, margin, y); y += 16;
    };
    const para = (s: string) => {
      doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(40,40,40);
      const lines = doc.splitTextToSize(s || "—", contentW) as string[];
      lines.forEach((ln) => { newPageIfNeeded(14); doc.text(ln, margin, y); y += 14; });
      y += 4;
    };

    h1(plano.titulo || "Plano de atividade");
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(100);
    doc.text(
      `${anoEscolar}  ·  ${disciplina}${turma ? `  ·  ${turma}` : ""}  ·  ${duracao}  ·  ${tipo}`,
      margin, y,
    );
    y += 18;

    h2("① Objetivo"); para(plano.objetivo);
    h2("② Descrição da atividade");
    para(`Abertura: ${plano.abertura}`);
    para(`Desenvolvimento: ${plano.desenvolvimento}`);
    para(`Fechamento: ${plano.fechamento}`);

    h2("③ Habilidades BNCC");
    plano.habilidades.forEach((h) => para(`• ${h.codigo} — ${h.descricao}`));
    if (plano.habilidades.length === 0) para("—");

    if (plano.adaptacoes.length > 0) {
      h2("④ Adaptações PCD");
      plano.adaptacoes.forEach((a) => para(`[${a.categoria}] ${a.texto}`));
    }
    if (plano.sugestoes.length > 0) {
      h2("⑤ Sugestões da Sofia");
      plano.sugestoes.forEach((s) => para(`• ${s.titulo} — ${s.descricao}`));
    }
    if (plano.materiais.length > 0) {
      h2("⑥ Materiais necessários");
      plano.materiais.forEach((m) => para(`☐ ${m}`));
    }

    doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(150);
    doc.text(`Gerado pela Sofia · ${new Date().toLocaleString("pt-BR")}`, margin, pageH - 20);

    const safe = (plano.titulo || "plano").replace(/[^\w-]+/g, "_").slice(0, 60);
    doc.save(`${safe}.pdf`);
    logActivity({
      type: "exportacao",
      description: `PDF exportado: ${plano.titulo}`,
      detail: `${anoEscolar} · ${disciplina}`,
    });
    showToast("📄 PDF exportado");
  };

  /* ─────────── Render ─────────── */

  return (
    <div className="atv-root">
      <style>{css}</style>

      {/* ────── Toolbar de geração ────── */}
      <div className="atv-toolbar">
        <div className="atv-toolbar-row">
          <div className="atv-field">
            <label>Turma <span className="atv-opt">(opcional)</span></label>
            <select value={turma} onChange={(e) => setTurma(e.target.value)}>
              <option value="">
                {turmasPerfil.length === 0
                  ? "Sem turma — gerar mesmo assim"
                  : "Sem turma específica"}
              </option>
              {turmasPerfil.map((t) => (
                <option key={t.id} value={t.nome}>{t.nome}</option>
              ))}
            </select>
          </div>

          <div className="atv-field">
            <label>Ano escolar</label>
            {anoTurma ? (
              <div className="atv-badge-ano" title="Vindo do cadastro da turma">
                {anoTurma}
              </div>
            ) : (
              <select value={anoFallback} onChange={(e) => setAnoFallback(e.target.value)}>
                {ANOS_FALLBACK.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            )}
          </div>

          <div className="atv-field">
            <label>Disciplina</label>
            <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)}>
              {DISCIPLINAS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="atv-field">
            <label>Duração</label>
            <select value={duracao} onChange={(e) => setDuracao(e.target.value)}>
              {DURACOES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="atv-field">
            <label>Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="atv-field grow">
            <label>Tema ou conteúdo</label>
            <input
              type="text" value={tema} maxLength={140}
              onChange={(e) => setTema(e.target.value)}
              placeholder={modo === "pcd" ? "Ex.: Estímulo sensorial com sons" : "Ex.: Sistema solar"}
            />
          </div>
        </div>

        <div className="atv-toolbar-row second">
          {modo === "regular" && (
            <label className="atv-toggle">
              <input
                type="checkbox" checked={incluirPCD}
                onChange={(e) => setIncluirPCD(e.target.checked)}
              />
              <span>Incluir adaptações PCD</span>
              {alunosPCDDaTurma.length > 0 && (
                <span className="atv-toggle-hint">
                  {alunosPCDDaTurma.length} aluno(s) PCD em {turma || "—"}
                </span>
              )}
            </label>
          )}

          <div className="atv-actions">
            {(temPlano || opcoes.length > 0) && (
              <button className="atv-btn ghost" onClick={limpar}>
                <X size={14} /> Limpar
              </button>
            )}
            {temPlano ? (
              <button className="atv-btn primary" onClick={sugerirOpcoes} disabled={loadingOpcoes}>
                <RefreshCw size={14} />
                {loadingOpcoes ? "Sofia está pensando…" : "Sugerir novas opções"}
              </button>
            ) : opcoes.length === 0 ? (
              <button className="atv-btn primary" onClick={sugerirOpcoes} disabled={loadingOpcoes}>
                <Sparkles size={14} />
                {loadingOpcoes ? "Sofia está pensando…" : "Sugerir opções de aula"}
              </button>
            ) : (
              <>
                <button className="atv-btn ghost" onClick={sugerirOpcoes} disabled={loadingOpcoes}>
                  <RefreshCw size={14} />
                  {loadingOpcoes ? "Sofia…" : "Outras opções"}
                </button>
                <button
                  className="atv-btn primary"
                  onClick={gerar}
                  disabled={generating || opcoesSel.length === 0}
                >
                  <Sparkles size={14} />
                  {generating
                    ? "Sofia está montando o plano…"
                    : opcoesSel.length === 0
                      ? "Selecione 1 ou mais opções"
                      : `Gerar plano com ${opcoesSel.length} opção${opcoesSel.length > 1 ? "ões" : ""}`}
                </button>
              </>
            )}
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
                  <strong>{LABELS[m]}</strong>{i < missing.length - 1 ? ", " : ""}
                </span>
              ))}.
            </span>
          </div>
        )}
      </div>

      {!temPlano && !generating && (
        opcoes.length === 0 ? (
        <div className="atv-empty">
          <Sparkles size={28} />
          <h3>{modo === "pcd" ? "Plano de atividade para aluno PCD" : "Plano de atividade"}</h3>
          <p>
            Defina ano escolar, disciplina e tema (turma é opcional). Sofia sugere
            4 a 5 opções de aula com abordagens diferentes — você escolhe uma ou
            combina várias antes de gerar o plano completo.
          </p>
        </div>
        ) : (
          <div className="atv-opcoes">
            <div className="atv-opcoes-head">
              <h3><Sparkles size={14} /> Opções de aula sugeridas pela Sofia</h3>
              <p className="atv-muted">
                Marque uma ou mais opções para combinar em um único plano integrado.
              </p>
            </div>
            <div className="atv-opcoes-grid">
              {opcoes.map((o, i) => {
                const sel = opcoesSel.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    className={`atv-opcao${sel ? " sel" : ""}`}
                    onClick={() => toggleOpcao(i)}
                  >
                    <div className="atv-opcao-check">
                      {sel ? <Check size={14} /> : <Plus size={14} />}
                    </div>
                    <div className="atv-opcao-body">
                      <div className="atv-opcao-tag">{o.abordagem}</div>
                      <div className="atv-opcao-title">{o.titulo}</div>
                      <p>{o.resumo}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )
      )}

      {temPlano && (
        <PlanoBody
          plano={plano}
          modo={modo}
          alunosPCDCount={alunosPCDDaTurma.length}
          missing={missing}
          regenField={regenField}
          onChange={setField}
          onToggleMat={toggleMat}
          onRemoveMat={removeMat}
          onAddMat={addMat}
          onCopiarMat={copiarMateriais}
          onRemoveHab={removeHab}
          onAddHab={addHab}
          onUsarSugestao={usarSugestao}
          onRegenField={regenerarCampo}
        />
      )}

      {temPlano && (
        <div className="atv-actionbar">
          <button className="atv-btn primary" onClick={salvarPlano}>
            <Save size={14} /> {salvo ? "Salvo!" : "Salvar plano"}
          </button>
          <button className="atv-btn" onClick={exportarPDF}>
            <FileDown size={14} /> Exportar PDF
          </button>
          <button className="atv-btn" onClick={adicionarAoM1}>
            <CalendarPlus size={14} /> Adicionar ao M1
          </button>
        </div>
      )}

      {/* ────── Histórico ────── */}
      <section className="atv-hist">
        <div className="atv-hist-head">
          <h3><FileText size={14} /> Histórico de planos {modo === "pcd" ? "PCD" : "regulares"}</h3>
          <div className="atv-search">
            <Search size={12} />
            <input
              placeholder="Buscar por título ou disciplina…"
              value={busca} onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
        {filtrados.length === 0 ? (
          <p className="atv-muted" style={{ padding: 12 }}>
            {historico.length === 0
              ? "Nenhum plano salvo ainda. Gere e clique em Salvar plano."
              : "Nenhum plano corresponde à busca."}
          </p>
        ) : (
          <ul className="atv-hist-list">
            {filtrados.map((p) => (
              <li key={p.id} className="atv-hist-item">
                <button className="atv-hist-main" onClick={() => carregarPlano(p)}>
                  <span className={`atv-hist-badge ${p.modo}`}>
                    {p.modo === "pcd" ? "PCD" : "REG"}
                  </span>
                  <span className="atv-hist-info">
                    <span className="atv-hist-title">{p.titulo}</span>
                    <span className="atv-hist-meta">
                      {p.turma || "sem turma"} · {p.disciplina} ·{" "}
                      {new Date(p.salvoEm).toLocaleDateString("pt-BR")}
                    </span>
                  </span>
                </button>
                <div className="atv-hist-actions">
                  <button className="atv-btn ghost" onClick={() => duplicarPlano(p)}>
                    <Copy size={12} /> Duplicar
                  </button>
                  {confirmDel === p.id ? (
                    <>
                      <button className="atv-btn danger" onClick={() => removerPlano(p)}>
                        <Check size={12} /> Confirmar
                      </button>
                      <button className="atv-btn ghost" onClick={() => setConfirmDel("")}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button className="atv-btn ghost" onClick={() => setConfirmDel(p.id)}>
                      <Trash2 size={12} /> Remover
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {toast && <div className="atv-toast">{toast}</div>}
    </div>
  );
}

const LABELS: Record<string, string> = {
  titulo: "título",
  objetivo: "objetivo",
  descricao: "descrição (abertura, desenvolvimento ou fechamento)",
  habilidades: "ao menos uma habilidade BNCC",
  habilidades_incompletas: "código e descrição em todas as habilidades BNCC",
};

/* ─────────────────────────── Body ─────────────────────────── */

function PlanoBody(props: {
  plano: PlanoAtividade;
  modo: "regular" | "pcd";
  alunosPCDCount: number;
  missing: string[];
  regenField: string;
  onChange: <K extends keyof PlanoAtividade>(k: K, v: PlanoAtividade[K]) => void;
  onToggleMat: (i: number) => void;
  onRemoveMat: (i: number) => void;
  onAddMat: (s: string) => void;
  onCopiarMat: () => void;
  onRemoveHab: (i: number) => void;
  onAddHab: (codigo: string, descricao: string) => void;
  onUsarSugestao: (s: Sugestao) => void;
  onRegenField: (field: keyof PlanoAtividade) => void;
}) {
  const { plano, modo, alunosPCDCount, missing, regenField, onRegenField } = props;
  const [adaptOpen, setAdaptOpen] = useState(modo === "pcd");
  const [novoMat, setNovoMat] = useState("");
  const [novaHabCod, setNovaHabCod] = useState("");
  const [novaHabDesc, setNovaHabDesc] = useState("");
  const [copiado, setCopiado] = useState(false);

  const has = (k: string) => missing.includes(k);
  const isRegen = (f: string) => regenField === f;

  const RegenBtn = ({ field, label }: { field: keyof PlanoAtividade; label: string }) => (
    <button
      className="atv-regen"
      onClick={() => onRegenField(field)}
      disabled={!!regenField}
      title={`Regenerar ${label}`}
    >
      <RefreshCw size={11} className={isRegen(field) ? "spin" : undefined} />
      {isRegen(field) ? "Sofia…" : "Regenerar"}
    </button>
  );

  return (
    <div className="atv-grid">
      {/* 1. Título */}
      <section className={`atv-card title${has("titulo") ? " atv-invalid" : ""}`}>
        <div className="atv-card-head">
          <InlineText
            value={plano.titulo}
            onChange={(v) => props.onChange("titulo", v)}
            tag="h2" placeholder="Título da atividade"
          />
          <RegenBtn field="titulo" label="título" />
        </div>
        {plano.meta && (
          <div className="atv-meta">
            {plano.meta.ano} · {plano.meta.disciplina}
            {plano.meta.turma ? ` · ${plano.meta.turma}` : ""}
            {` · ${plano.meta.duracao} · ${plano.meta.tipo}`}
          </div>
        )}
      </section>

      {/* 2. Objetivo */}
      <section className={`atv-card${has("objetivo") ? " atv-invalid" : ""}`}>
        <div className="atv-card-head">
          <h3>① Objetivo</h3>
          <RegenBtn field="objetivo" label="objetivo" />
        </div>
        <InlineText
          value={plano.objetivo}
          onChange={(v) => props.onChange("objetivo", v)}
          tag="p" multiline placeholder="O que o aluno vai aprender"
        />
      </section>

      {/* 3. Descrição */}
      <section className={`atv-card${has("descricao") ? " atv-invalid" : ""}`}>
        <div className="atv-card-head">
          <h3>② Descrição da atividade</h3>
        </div>
        <BlockWithRegen
          label="Abertura" value={plano.abertura}
          onChange={(v) => props.onChange("abertura", v)}
          regen={<RegenBtn field="abertura" label="abertura" />}
        />
        <BlockWithRegen
          label="Desenvolvimento" value={plano.desenvolvimento}
          onChange={(v) => props.onChange("desenvolvimento", v)}
          regen={<RegenBtn field="desenvolvimento" label="desenvolvimento" />}
        />
        <BlockWithRegen
          label="Fechamento" value={plano.fechamento}
          onChange={(v) => props.onChange("fechamento", v)}
          regen={<RegenBtn field="fechamento" label="fechamento" />}
        />
      </section>

      {/* 4. Habilidades BNCC */}
      <section className={`atv-card${has("habilidades") || has("habilidades_incompletas") ? " atv-invalid" : ""}`}>
        <div className="atv-card-head">
          <h3>③ Habilidades BNCC</h3>
          <RegenBtn field="habilidades" label="habilidades" />
        </div>
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
          <input placeholder="Código (ex.: EF03MA03)" value={novaHabCod}
            onChange={(e) => setNovaHabCod(e.target.value)} />
          <input placeholder="Descrição da habilidade" value={novaHabDesc}
            onChange={(e) => setNovaHabDesc(e.target.value)} />
          <button className="atv-btn" onClick={() => {
            props.onAddHab(novaHabCod, novaHabDesc);
            setNovaHabCod(""); setNovaHabDesc("");
          }}>
            <Plus size={13} /> Adicionar
          </button>
        </div>
      </section>

      {/* 5. Adaptações PCD */}
      <section className="atv-card adapt">
        <button
          type="button" className="atv-collapser"
          onClick={() => modo === "regular" && setAdaptOpen((v) => !v)}
          disabled={modo === "pcd"}
        >
          <h3>④ Adaptações PCD</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <RegenBtn field="adaptacoes" label="adaptações" />
            {modo === "regular" && (adaptOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
          </div>
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
                      tag="p" multiline
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* 6. Sugestões */}
      <section className="atv-card">
        <div className="atv-card-head">
          <h3><Lightbulb size={14} style={{ verticalAlign: -2, marginRight: 4 }} />⑤ Sugestões da Sofia</h3>
          <RegenBtn field="sugestoes" label="sugestões" />
        </div>
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
          <div style={{ display: "flex", gap: 6 }}>
            <RegenBtn field="materiais" label="materiais" />
            <button
              className="atv-btn ghost"
              onClick={() => { props.onCopiarMat(); setCopiado(true); setTimeout(() => setCopiado(false), 1500); }}
              disabled={plano.materiais.length === 0}
            >
              <Copy size={12} /> {copiado ? "Copiado!" : "Copiar lista"}
            </button>
          </div>
        </div>
        <ul className="atv-mat">
          {plano.materiais.map((m, i) => (
            <li key={i}>
              <label>
                <input type="checkbox" checked={!!plano.materiaisCheck?.[i]} onChange={() => props.onToggleMat(i)} />
                <span style={{ textDecoration: plano.materiaisCheck?.[i] ? "line-through" : "none" }}>{m}</span>
              </label>
              <button className="atv-x" onClick={() => props.onRemoveMat(i)} aria-label="Remover">
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
        <div className="atv-add-row">
          <input placeholder="Adicionar material" value={novoMat}
            onChange={(e) => setNovoMat(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { props.onAddMat(novoMat); setNovoMat(""); } }} />
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
  value: string; onChange: (v: string) => void;
  tag?: "h2" | "h3" | "p"; placeholder?: string; multiline?: boolean;
}) {
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  const commit = () => { onChange(draft.trim()); setEdit(false); };
  if (edit) {
    return multiline ? (
      <textarea autoFocus className="atv-inline-input" value={draft}
        onChange={(e) => setDraft(e.target.value)} onBlur={commit} />
    ) : (
      <input autoFocus className="atv-inline-input" value={draft}
        onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); }} />
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

function BlockWithRegen({
  label, value, onChange, regen,
}: { label: string; value: string; onChange: (v: string) => void; regen: React.ReactNode }) {
  return (
    <div className="atv-block">
      <div className="atv-block-head">
        <div className="atv-block-label">{label}</div>
        {regen}
      </div>
      <InlineText value={value} onChange={onChange} tag="p" multiline placeholder={`Descreva o ${label.toLowerCase()}…`} />
    </div>
  );
}

/* ─────────────────────────── Styles ─────────────────────────── */

const css = `
.atv-root{display:flex;flex-direction:column;gap:16px;}
.atv-root *{box-sizing:border-box;}
.atv-toolbar{background:#fff;border:1px solid var(--line,#E2E8F0);border-radius:12px;padding:14px;box-shadow:0 1px 2px rgba(15,23,42,.05);}
.atv-toolbar-row{display:grid;grid-template-columns:1.2fr 1fr 1fr .8fr .8fr 2fr;gap:10px;align-items:end;}
.atv-toolbar-row.second{display:flex;justify-content:space-between;align-items:center;margin-top:10px;gap:10px;flex-wrap:wrap;}
@media(max-width:1100px){.atv-toolbar-row{grid-template-columns:1fr 1fr;}}
.atv-field{display:flex;flex-direction:column;gap:4px;min-width:0;}
.atv-field.grow{min-width:0;}
.atv-field label{font-size:11px;font-weight:600;color:var(--muted,#64748B);text-transform:uppercase;letter-spacing:.05em;}
.atv-field label .atv-opt{font-weight:500;text-transform:none;letter-spacing:0;color:var(--muted,#94A3B8);margin-left:4px;}
.atv-field select,.atv-field input{height:36px;border:1px solid var(--line,#E2E8F0);border-radius:8px;padding:0 10px;font-size:13px;background:#fff;color:var(--ink,#0F172A);font-family:inherit;}
.atv-field select:focus,.atv-field input:focus{outline:none;border-color:var(--orange,#FF7A45);box-shadow:0 0 0 3px rgba(255,122,69,.15);}
.atv-badge-ano{height:36px;display:inline-flex;align-items:center;padding:0 12px;border-radius:8px;background:rgba(59,130,246,.10);color:#1E40AF;font-weight:700;font-size:12.5px;font-family:'JetBrains Mono',monospace;border:1px solid rgba(59,130,246,.2);}
.atv-toggle{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;color:var(--ink,#0F172A);cursor:pointer;}
.atv-toggle input{accent-color:var(--orange,#FF7A45);width:16px;height:16px;}
.atv-toggle-hint{color:var(--muted,#64748B);font-size:11.5px;margin-left:6px;}
.atv-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.atv-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;font-weight:600;font-size:13px;border:1px solid var(--line,#E2E8F0);background:#fff;color:var(--ink,#0F172A);cursor:pointer;font-family:inherit;}
.atv-btn:hover{background:#F8FAFC;}
.atv-btn.primary{background:var(--orange,#FF7A45);border-color:var(--orange,#FF7A45);color:#fff;}
.atv-btn.primary:hover{background:#F26B36;}
.atv-btn.ghost{background:transparent;}
.atv-btn.danger{background:#EF4444;border-color:#EF4444;color:#fff;}
.atv-btn.danger:hover{background:#DC2626;}
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
.atv-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px;}
.atv-card-head h3{margin:0;}
.atv-meta{font-size:11.5px;color:var(--muted,#64748B);font-family:'JetBrains Mono',monospace;margin-top:4px;}
.atv-collapser{width:100%;display:flex;justify-content:space-between;align-items:center;background:none;border:none;cursor:pointer;padding:0;color:inherit;font-family:inherit;margin-bottom:8px;}
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
.atv-block-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;}
.atv-block-label{font-size:11px;font-weight:700;color:var(--orange,#FF7A45);text-transform:uppercase;letter-spacing:.06em;font-family:'JetBrains Mono',monospace;}
.atv-regen{display:inline-flex;align-items:center;gap:4px;background:transparent;border:1px solid var(--line,#E2E8F0);border-radius:6px;padding:3px 8px;font-size:11px;color:var(--muted,#64748B);cursor:pointer;font-family:inherit;font-weight:600;}
.atv-regen:hover{background:#F8FAFC;color:var(--orange,#FF7A45);border-color:var(--orange,#FF7A45);}
.atv-regen:disabled{opacity:.5;cursor:not-allowed;}
.atv-regen .spin{animation:atv-spin 1s linear infinite;}
@keyframes atv-spin{to{transform:rotate(360deg);}}
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
.atv-actionbar{position:sticky;bottom:0;display:flex;gap:8px;justify-content:flex-end;padding:12px 14px;background:rgba(255,255,255,.95);backdrop-filter:blur(8px);border:1px solid var(--line,#E2E8F0);border-radius:12px;box-shadow:0 -4px 12px rgba(15,23,42,.06);z-index:5;}
.atv-hist{background:#fff;border:1px solid var(--line,#E2E8F0);border-radius:12px;padding:14px;box-shadow:0 1px 2px rgba(15,23,42,.05);}
.atv-hist-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;}
.atv-hist-head h3{font-size:13.5px;font-weight:700;color:var(--ink,#0F172A);margin:0;display:flex;align-items:center;gap:6px;}
.atv-search{display:flex;align-items:center;gap:6px;border:1px solid var(--line,#E2E8F0);border-radius:8px;padding:0 8px;background:#fff;}
.atv-search input{border:none;outline:none;height:30px;font-size:12.5px;width:220px;background:transparent;font-family:inherit;color:var(--ink,#0F172A);}
.atv-hist-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px;}
.atv-hist-item{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px;border:1px solid var(--line,#E2E8F0);border-radius:8px;}
.atv-hist-item:hover{background:#FAFBFD;}
.atv-hist-main{flex:1;display:flex;align-items:center;gap:10px;background:none;border:none;text-align:left;cursor:pointer;padding:0;font-family:inherit;color:inherit;}
.atv-hist-badge{font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:rgba(255,122,69,.15);color:#9A3412;font-family:'JetBrains Mono',monospace;letter-spacing:.04em;}
.atv-hist-badge.pcd{background:rgba(139,92,246,.15);color:#5B21B6;}
.atv-hist-info{display:flex;flex-direction:column;}
.atv-hist-title{font-weight:600;font-size:13px;color:var(--ink,#0F172A);}
.atv-hist-meta{font-size:11px;color:var(--muted,#64748B);font-family:'JetBrains Mono',monospace;}
.atv-hist-actions{display:flex;gap:6px;flex-wrap:wrap;}
.atv-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0F172A;color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;z-index:50;box-shadow:0 8px 24px rgba(0,0,0,.2);}
.atv-opcoes{background:#fff;border:1px solid var(--line,#E2E8F0);border-radius:12px;padding:16px;box-shadow:0 1px 2px rgba(15,23,42,.05);}
.atv-opcoes-head{margin-bottom:12px;}
.atv-opcoes-head h3{font-size:14px;font-weight:700;color:var(--ink,#0F172A);margin:0 0 4px;display:flex;align-items:center;gap:6px;}
.atv-opcoes-head h3 svg{color:var(--orange,#FF7A45);}
.atv-opcoes-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;}
.atv-opcao{display:flex;gap:10px;text-align:left;background:#fff;border:1.5px solid var(--line,#E2E8F0);border-radius:10px;padding:12px;cursor:pointer;font-family:inherit;color:inherit;transition:all .15s;align-items:flex-start;}
.atv-opcao:hover{border-color:var(--orange,#FF7A45);background:#FFF7F2;}
.atv-opcao.sel{border-color:var(--orange,#FF7A45);background:#FFF1E8;box-shadow:0 0 0 3px rgba(255,122,69,.15);}
.atv-opcao-check{width:22px;height:22px;border-radius:6px;display:grid;place-items:center;background:#F1F5F9;color:var(--muted,#64748B);flex-shrink:0;}
.atv-opcao.sel .atv-opcao-check{background:var(--orange,#FF7A45);color:#fff;}
.atv-opcao-body{flex:1;min-width:0;}
.atv-opcao-tag{font-size:10px;font-weight:700;color:var(--orange,#FF7A45);text-transform:uppercase;letter-spacing:.06em;font-family:'JetBrains Mono',monospace;margin-bottom:4px;}
.atv-opcao-title{font-weight:700;font-size:13.5px;color:var(--ink,#0F172A);margin-bottom:4px;line-height:1.3;}
.atv-opcao p{font-size:12.5px;color:var(--muted,#64748B);margin:0;line-height:1.45;}
`;