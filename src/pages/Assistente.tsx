import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search, Plus, HelpCircle, Pencil, Send, Sparkles, Trash2, X,
  History, PanelRightOpen, PanelRightClose, RotateCcw, Copy, Check,
} from "lucide-react";
import { PainelNav } from "@/components/painel/PainelNav";
import ReactMarkdown from "react-markdown";
import { SOFIA_CONSTITUTION_VERSION } from "@/lib/sofia-constitution";
import { useSofia } from "@/components/sofia/SofiaProvider";
import { SofiaActiveChip } from "@/components/sofia/SofiaActiveChip";
import { useSofiaContext } from "@/lib/sofia/sofiaContext";
import { inferirNivelEnsino } from "@/lib/sofia/nivelEnsino";
import { useHydrated } from "@/hooks/useHydrated";
import { assistentePainelCss } from "./assistentePainelCss";
import { brDateKey, diffDaysBR } from "@/lib/datetime";
import { usePersistentState } from "@/lib/persist/usePersistentState";
import { parseQuickOptions, isFreeTextOption } from "@/lib/sofia/quickOptions";
import { useDashClasses, useDashStudents, type LegacyDashStudent } from "@/hooks/useDashLegacyData";

function fallbackCopy(texto: string) {
  const ta = document.createElement("textarea");
  ta.value = texto;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } catch { /* ignore */ }
  document.body.removeChild(ta);
}

// Links da Sofia abrem em outra aba, para não perder a conversa.
const mdComponents = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
  ),
};

function CtxChipGroup({ options, value, onToggle }: { options: string[]; value: string[]; onToggle: (v: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);
  const customs = value.filter((v) => !options.includes(v));
  const commit = () => {
    const v = draft.trim();
    if (v && !value.includes(v)) onToggle(v);
    setDraft(""); setAdding(false);
  };
  return (
    <div className="ctx-chips">
      {options.map((o) => (
        <button key={o} type="button" className={"ctx-chip" + (value.includes(o) ? " on" : "")} onClick={() => onToggle(o)}>{o}</button>
      ))}
      {customs.map((o) => (
        <button key={o} type="button" className="ctx-chip on" onClick={() => onToggle(o)} title="Clique para remover">{o} ×</button>
      ))}
      {adding ? (
        <span className="ctx-chip-input">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") { setDraft(""); setAdding(false); } }}
            onBlur={commit}
            placeholder="Digite e Enter"
            maxLength={60}
          />
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={commit}>Adicionar</button>
        </span>
      ) : (
        <button type="button" className="ctx-chip-add" onClick={() => setAdding(true)}>+ Outro</button>
      )}
    </div>
  );
}


type TaskTab = "Mais usadas" | "Inclusão" | "Avaliação" | "Tudo";
type TaskCategory = "Inclusão" | "Avaliação" | "Outros";
const TASKS: Array<{ emoji: string; name: string; desc: string; prompt: string; bg: string; top?: boolean; categories: TaskCategory[] }> = [
  { emoji: "📚", name: "Plano de aula", desc: "Com BNCC, objetivos, passo a passo e avaliação", prompt: "Crie um plano de aula de 50 minutos sobre ", bg: "var(--pn-green-soft)", top: true, categories: ["Outros"] },
  { emoji: "📝", name: "Parecer descritivo", desc: "Texto do bimestre a partir dos seus registros", prompt: "Escreva o parecer descritivo do bimestre para o(a) aluno(a) ", bg: "var(--pn-blue-soft)", top: true, categories: ["Avaliação"] },
  { emoji: "🧩", name: "Atividade para imprimir", desc: "Enunciados prontos e gabarito no final", prompt: "Crie uma atividade para imprimir, com gabarito, sobre ", bg: "var(--pn-cream)", top: true, categories: ["Avaliação"] },
  { emoji: "✨", name: "Adaptar conteúdo", desc: "Para estudantes com deficiência ou dificuldades", prompt: "Adapte esta atividade para um(a) estudante com ", bg: "var(--pn-lilac)", categories: ["Inclusão"] },
  { emoji: "📊", name: "Avaliação", desc: "Questões por nível de dificuldade e gabarito", prompt: "Monte uma avaliação com 10 questões e gabarito sobre ", bg: "var(--pn-pink)", categories: ["Avaliação"] },
  { emoji: "💬", name: "Feedback ao aluno", desc: "Construtivo e acolhedor", prompt: "Escreva um feedback construtivo para um(a) aluno(a) que ", bg: "var(--pn-sun)", categories: ["Avaliação"] },
  { emoji: "🎲", name: "Dinâmica de grupo", desc: "Socialização e aprendizagem ativa", prompt: "Sugira uma dinâmica de grupo de 20 minutos para trabalhar ", bg: "var(--pn-green-soft)", categories: ["Inclusão"] },
  { emoji: "🧠", name: "Estratégias para TEA/TDAH", desc: "Ideias práticas para a sala de aula", prompt: "Quais estratégias práticas posso usar em sala com um(a) estudante com ", bg: "var(--pn-blue-soft)", categories: ["Inclusão"] },
  { emoji: "📅", name: "Sequência didática", desc: "Várias aulas encadeadas sobre um tema", prompt: "Monte uma sequência didática de 4 aulas sobre ", bg: "var(--pn-cream)", categories: ["Outros"] },
];

export function Assistente() {
  const navigate = useNavigate();
  const sofia = useSofia();
  const ctx = useSofiaContext();
  const isPro = ctx.user.plano === "pro";
  const periodoLabel = ctx.temporal.periodo === "manha" ? "Bom dia" : ctx.temporal.periodo === "tarde" ? "Boa tarde" : "Boa noite";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileHistOpen, setMobileHistOpen] = useState(false);
  const [tab, setTab] = useState<TaskTab>("Mais usadas");
  const [search, setSearch] = useState("");
  const [ctxOpen, setCtxOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [observacoes, setObservacoes] = usePersistentState<string>("assist_ctx_obs", "");
  const [selectedTurma, setSelectedTurma] = usePersistentState<string | null>("assist_ctx_turma", null);
  // Novos campos de contexto, todos persistidos para a Sofia "lembrar".
  const [ctxBimestre, setCtxBimestre] = usePersistentState<string>("assist_ctx_bimestre", "");
  const [ctxDuracao, setCtxDuracao] = usePersistentState<string>("assist_ctx_duracao", "");
  const [ctxFocos, setCtxFocos] = usePersistentState<string[]>("assist_ctx_focos", []);
  const [ctxEstilo, setCtxEstilo] = usePersistentState<string[]>("assist_ctx_estilo", []);
  const [ctxRecursos, setCtxRecursos] = usePersistentState<string[]>("assist_ctx_recursos", []);
  const [ctxEvitar, setCtxEvitar] = usePersistentState<string[]>("assist_ctx_evitar", []);
  const [ctxDocs, setCtxDocs] = usePersistentState<string[]>("assist_ctx_docs", []);
  const [ctxMomento, setCtxMomento] = usePersistentState<string[]>("assist_ctx_momento", []);
  const toggleIn = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) =>
    setter((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  const OPT_FOCOS = ["Alfabetização","Letramento","Numeralização","Leitura","Escrita","Compreensão de texto","Resolução de problemas","Habilidades socioemocionais","Projeto interdisciplinar","Preparação para avaliações"];
  const OPT_ESTILO = ["Respostas mais objetivas","Respostas mais detalhadas","Tom acolhedor","Linguagem técnica","Com exemplos práticos","Sempre citar BNCC","Sempre sugerir adaptação PCD"];
  const OPT_RECURSOS = ["Projetor","Quadro digital","Computadores","Tablets","Internet em sala","Materiais manipuláveis","Biblioteca","Pátio / área externa","Sala de informática"];
  const OPT_EVITAR = ["Som alto","Grupos grandes","Atividades com tela","Exposição individual","Estímulo visual excessivo","Tarefa para casa longa"];
  const OPT_DOCS = ["BNCC","Currículo estadual","Currículo municipal","PPP da escola","Material apostilado","Plano de ação da coordenação"];
  const OPT_MOMENTO = ["Início do turno","Antes do recreio","Após o recreio","Final do turno"];
  const OPT_BIMESTRE = ["1º bimestre","2º bimestre","3º bimestre","4º bimestre","1º trimestre","2º trimestre","3º trimestre","Recuperação"];
  const OPT_DURACAO = ["30 min","45 min","50 min","60 min","90 min","2 aulas geminadas"];

  const dashClasses = useDashClasses();
  const dashStudents = useDashStudents();
  type DashStudent = LegacyDashStudent;

  // Agrupa alunos por turma e identifica PCDs
  const turmasInfo = useMemo(() => {
    const map = new Map<string, { name: string; school?: string; grade?: string; shift?: string; alunos: DashStudent[]; pcds: DashStudent[] }>();
    dashClasses.forEach((c) => {
      map.set(c.name, { name: c.name, school: c.school, grade: c.grade, shift: c.shift, alunos: [], pcds: [] });
    });
    dashStudents.forEach((s) => {
      const key = s.classRef || "Sem turma";
      if (!map.has(key)) map.set(key, { name: key, alunos: [], pcds: [] });
      const entry = map.get(key)!;
      entry.alunos.push(s);
      if (s.pcd && s.pcd.trim()) entry.pcds.push(s);
    });
    return Array.from(map.values()).filter((t) => t.alunos.length > 0 || dashClasses.some((c) => c.name === t.name));
  }, [dashClasses, dashStudents]);

  const turmaSelecionada = selectedTurma ? turmasInfo.find((t) => t.name === selectedTurma) : null;
  const messages = sofia.messages;
  const loading = sofia.loading;
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const handleQuickOption = (opt: string) => {
    if (isFreeTextOption(opt)) {
      setTimeout(() => composerRef.current?.focus(), 0);
      return;
    }
    sofia.send(opt);
  };


  const hydrated = useHydrated();
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    try { setIsTouch(window.matchMedia("(pointer: coarse)").matches); } catch { /* ignore */ }
  }, []);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Segue o texto enquanto a Sofia escreve, mas não "puxa" a tela se a
  // pessoa rolou para cima para reler algo.
  const stickToBottom = useRef(true);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => { stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);
  const lastRole = messages[messages.length - 1]?.role;
  useEffect(() => { if (lastRole === "user") stickToBottom.current = true; }, [messages.length, lastRole]);
  useEffect(() => {
    const el = scrollRef.current;
    if (el && messages.length > 0 && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  // Caixa de texto cresce com o conteúdo (até o limite do CSS).
  useEffect(() => {
    const ta = composerRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [sofia.draft, isTouch]);

  // Nesta página o chat já está aberto: o botão da Sofia (menu/chip) só
  // foca a caixa de texto, em vez de abrir a janelinha por cima.
  useEffect(() => {
    if (!sofia.open) return;
    sofia.setOpen(false);
    setTimeout(() => composerRef.current?.focus(), 0);
  }, [sofia.open, sofia.setOpen]);
  useEffect(() => () => { document.body.classList.remove("as-typing"); }, []);


  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const copiar = (texto: string, idx: number) => {
    const done = () => { setCopiedIdx(idx); setTimeout(() => setCopiedIdx((v) => (v === idx ? null : v)), 1800); };
    try {
      void navigator.clipboard.writeText(texto).then(done, () => {
        fallbackCopy(texto); done();
      });
    } catch {
      fallbackCopy(texto); done();
    }
  };

  const usarTarefa = (prompt: string) => {
    sofia.setDraft(prompt);
    setTimeout(() => {
      const ta = composerRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(prompt.length, prompt.length);
    }, 0);
  };

  const salvarContexto = () => {
    const partes: string[] = [];
    if (turmaSelecionada) {
      const pcdTxt = turmaSelecionada.pcds.length
        ? ` Alunos PCD: ${turmaSelecionada.pcds.map((p) => `${p.name} (${p.pcd})`).join(", ")}.`
        : " Sem alunos PCD registrados.";
      // Deriva o nível/segmento da turma para a Sofia NÃO perguntar de novo.
      const nivel = inferirNivelEnsino(turmaSelecionada.grade) ?? inferirNivelEnsino(turmaSelecionada.name);
      const gradeTxt = turmaSelecionada.grade ? ` Ano/série: ${turmaSelecionada.grade}.` : "";
      const nivelTxt = nivel
        ? ` Nível/modalidade de ensino: ${nivel} — use SEMPRE este nível e NÃO pergunte a modalidade ao gerar atividades.`
        : "";
      partes.push(`Foque na turma ${turmaSelecionada.name}.${gradeTxt}${nivelTxt} Total de ${turmaSelecionada.alunos.length} alunos.${pcdTxt}`);
    }
    if (ctxBimestre) partes.push(`Etapa atual: ${ctxBimestre}.`);
    if (ctxDuracao) partes.push(`Duração típica da aula: ${ctxDuracao}.`);
    if (ctxFocos.length) partes.push(`Foco pedagógico: ${ctxFocos.join(", ")}.`);
    if (ctxEstilo.length) partes.push(`Estilo de resposta: ${ctxEstilo.join("; ")}.`);
    if (ctxRecursos.length) partes.push(`Recursos disponíveis: ${ctxRecursos.join(", ")}.`);
    if (ctxEvitar.length) partes.push(`Evitar: ${ctxEvitar.join(", ")}.`);
    if (ctxDocs.length) partes.push(`Documentos seguidos: ${ctxDocs.join(", ")}.`);
    if (ctxMomento.length) partes.push(`Momento do dia em foco: ${ctxMomento.join(", ")}.`);
    if (observacoes.trim()) partes.push(observacoes.trim());
    // Vai no system prompt de TODAS as mensagens, inclusive conversas novas.
    sofia.setUserContext(partes.join(" "));
    setCtxOpen(false);
  };

  // Carrega lista de conversas ao montar
  useEffect(() => { sofia.refreshConversations(); }, [sofia.refreshConversations]);

  const handleNew = () => { sofia.startNew(); setMobileHistOpen(false); };
  const pickConversation = (id: string) => { sofia.loadConversation(id); setMobileHistOpen(false); };

  const sendMessage = (raw?: string) => {
    const content = (raw ?? sofia.draft).trim();
    if (!content || sofia.busy) return;
    sofia.send(content);
    void import("@/lib/admin/track").then(({ trackEvent }) =>
      trackEvent("sofia_chat_mensagem", { origin: raw ? "shortcut" : "manual" })
    );
  };
  // Agrupa conversas por data
  const { today, week, older } = useMemo(() => {
    const todayKey = brDateKey();
    const dayMs = 24 * 3600 * 1000;
    const t: typeof sofia.conversations = [];
    const w: typeof sofia.conversations = [];
    const o: typeof sofia.conversations = [];
    const filter = search.trim().toLowerCase();
    const list = Array.isArray(sofia.conversations) ? sofia.conversations : [];
    for (const c of list) {
      if (filter && !(c.title || "").toLowerCase().includes(filter)) continue;
      const updated = new Date(c.updated_at);
      const updatedKey = brDateKey(updated);
      const ageDays = diffDaysBR(updatedKey, todayKey);
      if (updatedKey === todayKey) t.push(c);
      else if (ageDays >= 0 && ageDays < 7) w.push(c);
      else if (Date.now() - updated.getTime() < dayMs && updatedKey !== todayKey) w.push(c);
      else o.push(c);
    }
    return { today: t, week: w, older: o };
  }, [sofia.conversations, search]);

  const renderHistItem = (c: (typeof sofia.conversations)[number], meta: string) => (
    <div
      key={c.id}
      className={"as-h" + (c.id === sofia.conversationId ? " on" : "")}
      role="button"
      tabIndex={0}
      onClick={() => pickConversation(c.id)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickConversation(c.id); } }}
    >
      <div className="as-h-t">
        <b>{c.title}</b>
        <small>{meta}</small>
      </div>
      <button
        className="as-h-del"
        aria-label="Excluir conversa"
        title="Excluir conversa"
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm(`Excluir a conversa "${c.title}"?`)) {
            sofia.deleteConversation(c.id).catch(() => { /* noop */ });
          }
        }}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );

  const tasksVisiveis = TASKS.filter((t) => {
    if (tab === "Tudo") return true;
    if (tab === "Mais usadas") return t.top;
    return t.categories.includes(tab as TaskCategory);
  });
  const temTurmas = ctx.dataState.turmas_count > 0;
  const nome = ctx.user.primeiro_nome && ctx.user.primeiro_nome !== "Educador(a)" ? ctx.user.primeiro_nome : "";
  const turmaFoco = ctx.entity.turma_atual?.nome || turmaSelecionada?.name;
  const lastIdx = messages.length - 1;

  return (
    <div className="pn as-root">
      <style dangerouslySetInnerHTML={{ __html: assistentePainelCss }} />
      <PainelNav />
      <div className={"as-shell" + (collapsed ? " hist-collapsed" : "")}>
        <section className="as-main" aria-label="Conversa com a Sofia">
          <header className="as-head">
            <div className="as-id">
              <span className="as-avatar" aria-hidden><Sparkles size={20} /></span>
              <div style={{ minWidth: 0 }}>
                <h1>Sofia</h1>
                <p><span className="dot" /> Sua assistente pedagógica</p>
              </div>
            </div>
            <div className="as-head-actions">
              <button className="as-btn" onClick={handleNew} title="Nova conversa" aria-label="Nova conversa">
                <Plus size={17} /><span className="lbl">Nova conversa</span>
              </button>
              <button className="as-btn as-hist-btn" onClick={() => setMobileHistOpen(true)} title="Histórico" aria-label="Abrir histórico">
                <History size={17} /><span className="lbl">Histórico</span>
              </button>
              <button
                className="as-btn icon as-collapse-btn"
                onClick={() => setCollapsed((v) => !v)}
                title={collapsed ? "Mostrar histórico" : "Esconder histórico"}
                aria-label={collapsed ? "Mostrar histórico" : "Esconder histórico"}
              >
                {collapsed ? <PanelRightOpen size={17} /> : <PanelRightClose size={17} />}
              </button>
              <button
                className="as-btn icon"
                aria-label="Como usar a Sofia"
                title="Como usar a Sofia"
                onClick={() => { setTutorialStep(0); setTutorialOpen(true); }}
              >
                <HelpCircle size={17} />
              </button>
            </div>
          </header>

          <div className="as-ctx">
            <span className="as-ctx-label">Contexto:</span>
            <span className="as-ctx-text">
              {turmaFoco ? <><b>{turmaFoco}</b>{ctx.dataState.alunos_count ? ` · ${ctx.dataState.alunos_count} alunos` : ""}</> : "nenhuma turma escolhida"}
              {sofia.userContext ? " · preferências salvas" : ""}
            </span>
            <SofiaActiveChip />
            <button className="as-ctx-edit" aria-label="Editar contexto" onClick={() => setCtxOpen(true)}>
              <Pencil size={14} /> Editar
            </button>
          </div>

          <div className="as-scroll" ref={scrollRef}>
            <div className="as-inner">
              {messages.length > 0 ? (
                <div className="as-list" aria-live="polite">
                  {messages.map((m, i) => {
                    if (m.role === "user") {
                      return (
                        <div key={i} className="as-msg user">
                          <div className="as-bubble">{m.content}</div>
                        </div>
                      );
                    }
                    const parsed = parseQuickOptions(m.content);
                    const isLast = i === lastIdx;
                    const streaming = isLast && sofia.busy && !m.error;
                    return (
                      <React.Fragment key={i}>
                        <div className={"as-msg assistant" + (m.error ? " err" : "")}>
                          <span className="as-msg-av" aria-hidden><Sparkles size={14} /></span>
                          <div className="as-bubble">
                            {m.error ? (
                              <div className="as-err-row">
                                <span>{m.content}</span>
                                {m.retryText && isLast && (
                                  <button className="as-btn green" onClick={() => sofia.send(m.retryText)} disabled={sofia.busy}>
                                    <RotateCcw size={15} /> Tentar de novo
                                  </button>
                                )}
                              </div>
                            ) : (
                              <>
                                <div className={"as-md" + (streaming ? " as-caret" : "")}>
                                  <ReactMarkdown components={mdComponents}>{parsed.clean}</ReactMarkdown>
                                </div>
                                {m.issues && m.issues.length > 0 && (
                                  <div className="as-note lang">
                                    <b>Linguagem ajustada:</b>{" "}
                                    {m.issues.map((it, k) => (
                                      <span key={k}>{k > 0 ? ", " : ""}"{it.term}" → {it.suggestion}</span>
                                    ))}
                                  </div>
                                )}
                                {m.truncated && isLast && !sofia.busy && (
                                  <div className="as-note warn">
                                    <span style={{ flex: 1, minWidth: 160 }}>A resposta ficou longa e parou no meio.</span>
                                    <button
                                      type="button"
                                      className="as-btn"
                                      onClick={() => sofia.send("Continue exatamente de onde parou, sem repetir o que já foi dito.")}
                                    >
                                      Continuar
                                    </button>
                                  </div>
                                )}
                                {!streaming && parsed.clean.trim().length > 280 && (
                                  <div className="as-tools">
                                    <button
                                      type="button"
                                      className={"as-tool" + (copiedIdx === i ? " ok" : "")}
                                      onClick={() => copiar(parsed.clean, i)}
                                    >
                                      {copiedIdx === i ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        {isLast && !sofia.busy && !m.error && parsed.options.length > 0 && (
                          <div className="as-quick" role="group" aria-label="Respostas rápidas">
                            {parsed.options.map((opt) => (
                              <button key={opt} type="button" onClick={() => handleQuickOption(opt)}>{opt}</button>
                            ))}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {loading && (
                    <div className="as-msg assistant">
                      <span className="as-msg-av" aria-hidden><Sparkles size={14} /></span>
                      <div className="as-typing"><span className="as-dots"><i /><i /><i /></span> A Sofia está pensando…</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="as-empty">
                  <h2 className="as-hello" suppressHydrationWarning>
                    {hydrated ? periodoLabel : "Olá"}{nome ? <>, <em>{nome}</em></> : ""}!<br />
                    O que vamos resolver agora?
                  </h2>
                  <p className="as-sub">
                    {temTurmas
                      ? `Já conheço ${turmaFoco ? `a turma ${turmaFoco}` : "suas turmas"}. Peça um plano de aula, parecer, atividade, adaptação ou tire uma dúvida.`
                      : "Peça um plano de aula, parecer, atividade ou adaptação. Se cadastrar suas turmas em Configurações, eu personalizo tudo para elas."}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <h3 className="as-tasks-title">Comece por uma tarefa</h3>
                    <div className="ctx-chips" role="tablist">
                      {(["Mais usadas", "Inclusão", "Avaliação", "Tudo"] as const).map((t) => (
                        <button
                          key={t}
                          role="tab"
                          aria-selected={tab === t}
                          className={"ctx-chip" + (tab === t ? " on" : "")}
                          onClick={() => setTab(t)}
                        >{t}</button>
                      ))}
                    </div>
                  </div>
                  <div className="as-tasks">
                    {tasksVisiveis.map((t) => (
                      <button key={t.name} className="as-task" aria-label={t.name} onClick={() => usarTarefa(t.prompt)}>
                        <span className="ic" style={{ background: t.bg }}>{t.emoji}</span>
                        <span className="tx"><b>{t.name}</b><small>{t.desc}</small></span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="as-composer-wrap">
            <div className="as-inner">
              <div className="as-composer">
                <textarea
                  ref={composerRef}
                  rows={1}
                  value={sofia.draft}
                  onChange={(e) => sofia.setDraft(e.target.value)}
                  onFocus={() => document.body.classList.add("as-typing")}
                  onBlur={() => document.body.classList.remove("as-typing")}
                  onKeyDown={(e) => {
                    // No celular, Enter quebra a linha; no computador, Enter envia.
                    if (e.key === "Enter" && !e.shiftKey && !isTouch) { e.preventDefault(); sendMessage(); }
                  }}
                  placeholder={isTouch ? "Escreva para a Sofia…" : "Escreva para a Sofia… ex.: plano de aula sobre frações para o 4º ano"}
                  aria-label="Mensagem para a Sofia"
                  enterKeyHint="send"
                />
                <button
                  className="as-send"
                  aria-label="Enviar mensagem"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => sendMessage()}
                  disabled={sofia.busy || !sofia.draft.trim()}
                >
                  <Send size={18} />
                </button>
              </div>
              <p className="as-foot" title="A Sofia segue princípios éticos e pedagógicos. Veja em Configurações > Princípios da Sofia.">
                A Sofia pode errar. Revise antes de usar · BNCC · LBI · v{SOFIA_CONSTITUTION_VERSION}
              </p>
            </div>
          </div>
        </section>

        <div className={"as-hist-bg" + (mobileHistOpen ? " show" : "")} onClick={() => setMobileHistOpen(false)} aria-hidden />
        <aside className={"as-hist" + (mobileHistOpen ? " open" : "")} aria-label="Histórico de conversas" aria-hidden={collapsed && !mobileHistOpen ? true : undefined}>
          <div className="as-hist-head">
            <h2>Histórico</h2>
            <button className="as-btn green" onClick={handleNew} aria-label="Nova conversa" title="Nova conversa"><Plus size={16} /> Nova</button>
            <button className="as-hist-x as-hist-close" onClick={() => setMobileHistOpen(false)} aria-label="Fechar histórico"><X size={16} /></button>
          </div>
          <div className="as-hist-search">
            <Search size={15} color="#596074" />
            <input
              placeholder="Buscar conversa"
              aria-label="Buscar conversa"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="as-hist-list">
            {!sofia.isAuthed && <div className="as-hist-empty">Entre na sua conta para ver suas conversas.</div>}
            {sofia.isAuthed && sofia.conversations.length === 0 && (
              <div className="as-hist-empty">Suas conversas com a Sofia aparecem aqui.</div>
            )}
            {sofia.isAuthed && sofia.conversations.length > 0 && search && today.length + week.length + older.length === 0 && (
              <div className="as-hist-empty">Nenhuma conversa encontrada.</div>
            )}
            {today.length > 0 && <div className="as-hist-sec">Hoje</div>}
            {today.map((c) => renderHistItem(c, new Date(c.updated_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" })))}
            {week.length > 0 && <div className="as-hist-sec">Esta semana</div>}
            {week.map((c) => renderHistItem(c, new Date(c.updated_at).toLocaleDateString("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" })))}
            {older.length > 0 && <div className="as-hist-sec">Anteriores</div>}
            {older.map((c) => renderHistItem(c, new Date(c.updated_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })))}
          </div>
          {sofia.isAuthed && sofia.conversations.length > 0 && (
            <button
              className="as-hist-clear"
              onClick={() => {
                if (window.confirm("Apagar todo o histórico de conversas com a Sofia? Isso não pode ser desfeito.")) {
                  sofia.clearConversations().catch(() => { /* noop */ });
                }
              }}
            >
              <Trash2 size={14} /> Apagar todo o histórico
            </button>
          )}
        </aside>
      </div>

      {ctxOpen && (
        <div className="as-modal-bg" onClick={() => setCtxOpen(false)}>
          <div className="as-modal" role="dialog" aria-modal="true" aria-label="Editar contexto" onClick={(e) => e.stopPropagation()}>
            <div className="as-modal-head">
              <div style={{ flex: 1 }}>
                <h3>Editar contexto</h3>
                <p>O que a Sofia deve saber para personalizar as respostas.</p>
              </div>
              <button className="as-hist-x" onClick={() => setCtxOpen(false)} aria-label="Fechar"><X size={16} /></button>
            </div>
            <div className="as-modal-body">
              <div className="ctx-section">
                <div className="ctx-section-label">Turma em foco</div>
                {turmasInfo.length === 0 ? (
                  <div className="ctx-empty-turma">
                    Você ainda não cadastrou turmas. Cadastre em <a href="/configuracoes">Configurações</a> para a Sofia saber o ano, a quantidade de alunos e quem precisa de adaptação.
                  </div>
                ) : (
                  <div className="ctx-turma-list">
                    {turmasInfo.map((t) => {
                      const isSel = selectedTurma === t.name;
                      return (
                        <button
                          key={t.name}
                          type="button"
                          className={"ctx-turma-card" + (isSel ? " selected" : "")}
                          onClick={() => setSelectedTurma(isSel ? null : t.name)}
                          aria-pressed={isSel}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div className="tname">{t.name}</div>
                            <div className="tmeta">{[t.school, t.grade, t.shift].filter(Boolean).join(" · ") || "Turma cadastrada"}</div>
                          </div>
                          <div className="tcounts">
                            <span><b>{t.alunos.length}</b> alunos</span>
                            <span><b>{t.pcds.length}</b> PCD</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {turmaSelecionada && turmaSelecionada.pcds.length > 0 && (
                <div className="ctx-section">
                  <div className="ctx-section-label">Alunos PCD em {turmaSelecionada.name} ({turmaSelecionada.pcds.length})</div>
                  <div className="ctx-pcd-list">
                    {turmaSelecionada.pcds.map((a, i) => (
                      <span key={i} className="ctx-pcd-tag"><b>{a.name}</b> · {a.pcd}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="ctx-section">
                <div className="ctx-grid2">
                  <div className="ctx-field-inline">
                    <label htmlFor="ctx-etapa">Etapa atual</label>
                    <select id="ctx-etapa" value={ctxBimestre} onChange={(e) => setCtxBimestre(e.target.value)}>
                      <option value="">Selecione…</option>
                      {OPT_BIMESTRE.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="ctx-field-inline">
                    <label htmlFor="ctx-duracao">Duração da aula</label>
                    <select id="ctx-duracao" value={ctxDuracao} onChange={(e) => setCtxDuracao(e.target.value)}>
                      <option value="">Selecione…</option>
                      {OPT_DURACAO.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="ctx-section">
                <div className="ctx-section-label">Foco pedagógico do momento</div>
                <CtxChipGroup options={OPT_FOCOS} value={ctxFocos} onToggle={toggleIn(setCtxFocos)} />
              </div>
              <div className="ctx-section">
                <div className="ctx-section-label">Jeito de responder</div>
                <CtxChipGroup options={OPT_ESTILO} value={ctxEstilo} onToggle={toggleIn(setCtxEstilo)} />
              </div>
              <div className="ctx-section">
                <div className="ctx-section-label">Recursos que você tem em sala</div>
                <CtxChipGroup options={OPT_RECURSOS} value={ctxRecursos} onToggle={toggleIn(setCtxRecursos)} />
              </div>
              <div className="ctx-section">
                <div className="ctx-section-label">O que evitar</div>
                <CtxChipGroup options={OPT_EVITAR} value={ctxEvitar} onToggle={toggleIn(setCtxEvitar)} />
              </div>
              <div className="ctx-section">
                <div className="ctx-section-label">Documentos que você segue</div>
                <div className="ctx-chips">
                  {OPT_DOCS.map((o) => (
                    <button key={o} type="button" className={"ctx-chip" + (ctxDocs.includes(o) ? " on" : "")} onClick={() => toggleIn(setCtxDocs)(o)}>{o}</button>
                  ))}
                </div>
              </div>
              <div className="ctx-section">
                <div className="ctx-section-label">Momento do dia em foco</div>
                <div className="ctx-chips">
                  {OPT_MOMENTO.map((o) => (
                    <button key={o} type="button" className={"ctx-chip" + (ctxMomento.includes(o) ? " on" : "")} onClick={() => toggleIn(setCtxMomento)(o)}>{o}</button>
                  ))}
                </div>
              </div>
              <div className="ctx-section">
                <label className="ctx-section-label" htmlFor="ctx-obs">Observações para a Sofia</label>
                <textarea
                  id="ctx-obs"
                  rows={3}
                  placeholder="Ex.: foco em alfabetização, turma agitada depois do recreio…"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>
            </div>
            <div className="as-modal-foot">
              <button className="as-btn" onClick={() => setCtxOpen(false)}>Cancelar</button>
              <button className="as-btn green" onClick={salvarContexto}>Salvar contexto</button>
            </div>
          </div>
        </div>
      )}

      {tutorialOpen && (() => {
        const steps = [
          { title: "Converse com a Sofia", body: "Escreva o que precisa do seu jeito. A Sofia usa suas turmas e alunos para montar pareceres, planos, atividades e adaptações em minutos." },
          { title: "Comece por uma tarefa", body: "Na tela inicial do chat, os cartões de tarefas já deixam o pedido pronto. É só completar com o tema e enviar." },
          { title: "Contexto", body: "Em \"Editar\", escolha a turma em foco, a etapa, o foco do momento e o que evitar. Quanto mais contexto, mais certeira a resposta." },
          { title: "Histórico", body: "Suas conversas ficam salvas no Histórico, separadas por hoje, semana e anteriores. Toque em uma para continuar de onde parou." },
          { title: "Como pedir bem", body: "Diga a turma, o tema, o objetivo e o formato. Ex.: \"plano de aula de 50 minutos sobre frações para o 4º ano, com atividade para imprimir\"." },
        ];
        const total = steps.length;
        const idx = Math.min(tutorialStep, total - 1);
        const st = steps[idx];
        const close = () => setTutorialOpen(false);
        return (
          <div className="as-modal-bg" onClick={close}>
            <div className="as-modal" role="dialog" aria-modal="true" aria-label="Como usar a Sofia" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
              <div className="as-modal-head">
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".06em" }}>COMO USAR · {idx + 1}/{total}</p>
                  <h3 style={{ marginTop: 4 }}>{st.title}</h3>
                </div>
                <button className="as-hist-x" onClick={close} aria-label="Fechar"><X size={16} /></button>
              </div>
              <div className="as-modal-body">
                <p style={{ fontSize: 15.5 }}>{st.body}</p>
                <div className="as-steps">{steps.map((_, i) => <span key={i} className={i <= idx ? "on" : ""} />)}</div>
              </div>
              <div className="as-modal-foot" style={{ justifyContent: "space-between" }}>
                <button className="as-btn" onClick={() => setTutorialStep((n: number) => Math.max(0, n - 1))} disabled={idx === 0}>Voltar</button>
                {idx < total - 1 ? (
                  <button className="as-btn green" onClick={() => setTutorialStep((n: number) => Math.min(total - 1, n + 1))}>Próximo</button>
                ) : (
                  <button className="as-btn green" onClick={close}>Entendi</button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
