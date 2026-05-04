import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search, Plus, ChevronsLeft, Share2, HelpCircle, Pencil, Clock,
  FileText, Send, User, Sparkles, ArrowRight,
  Calendar, CheckSquare, Star,
} from "lucide-react";
import { AppSidebar, sidebarCss } from "@/components/AppSidebar";
import ReactMarkdown from "react-markdown";
import { SOFIA_CONSTITUTION_VERSION } from "@/lib/sofia-constitution";
import { useSofia } from "@/components/sofia/SofiaProvider";

const css = `
.ap-root{
  --primary:#1B2A4E;--primary-dark:#0F1B36;--accent:#FF6A2C;--accent-warm:#FF9466;
  --paper:#F6F4EE;--paper-2:#FBFAF6;--text:#0B1220;--text-soft:#3B4256;--muted:#7A8194;
  --line-soft:#E7E9EF;--violet:#6E5BE6;--green:#16A36B;
  font-family:'Inter',-apple-system,sans-serif;background:var(--paper);color:var(--text);
  -webkit-font-smoothing:antialiased;line-height:1.5;font-size:14px;min-height:100vh;
}
.ap-root *{box-sizing:border-box;}
.ap-root h1,.ap-root h3,.ap-root h4{margin:0;}
.ap-root button{font-family:inherit;cursor:pointer;border:none;background:transparent;color:inherit;}
.ap-root a{color:inherit;text-decoration:none;}
.ap-root p{margin:0;}
.ai-app{display:grid;grid-template-columns:240px 1fr 320px;min-height:100vh;transition:grid-template-columns .25s ease;}
.ai-app.collapsed{grid-template-columns:240px 1fr 56px;}

/* Main */
.ai-main{display:flex;flex-direction:column;min-width:0;}
.ai-topbar{display:flex;align-items:center;gap:14px;padding:14px 22px;background:var(--paper);
  border-bottom:1px solid rgba(17,24,39,.06);position:sticky;top:0;z-index:5;}
.ai-crumbs{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted);}
.ai-crumbs b{color:var(--text);font-weight:700;}
.ai-crumbs .sep{opacity:.5;}
.sofia-id{display:flex;align-items:center;gap:10px;}
.sofia-avatar{width:36px;height:36px;border-radius:10px;
  background:radial-gradient(120% 120% at 30% 20%,#FFD2B7 0%,#FF6A2C 60%,#C84A14 100%);
  display:grid;place-items:center;color:#fff;box-shadow:0 8px 18px -8px rgba(255,106,44,.6);}
.sofia-name{font-family:'Fraunces',serif;font-weight:700;font-size:18px;display:flex;align-items:center;gap:8px;color:var(--text);}
.tag-beta{font-size:10px;background:#0B1220;color:#fff;padding:2px 6px;border-radius:6px;letter-spacing:.06em;font-weight:700;}
.sofia-sub{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:6px;}
.dot-online{width:6px;height:6px;border-radius:50%;background:#16A36B;display:inline-block;}
.topbar-right{margin-left:auto;display:flex;align-items:center;gap:10px;}
.credits{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--line-soft);
  padding:8px 12px;border-radius:12px;box-shadow:0 1px 0 rgba(17,24,39,.04),0 8px 24px -12px rgba(17,24,39,.18);}
.ring{--p:67;width:28px;height:28px;border-radius:50%;
  background:conic-gradient(var(--accent) calc(var(--p)*1%),#F2D9C8 0);display:grid;place-items:center;}
.ring::after{content:"";width:18px;height:18px;border-radius:50%;background:#fff;}
.credits b{font-size:13px;}
.credits small{display:block;color:var(--muted);font-size:11px;}
.icon-btn{width:34px;height:34px;border-radius:10px;background:#fff;border:1px solid var(--line-soft);
  display:grid;place-items:center;color:#3B4256;box-shadow:0 1px 0 rgba(17,24,39,.04),0 8px 24px -12px rgba(17,24,39,.18);}
.icon-btn:hover{border-color:#cfd4e1;}

/* Context */
.ai-context{display:flex;align-items:center;gap:10px;padding:10px 22px;background:var(--paper-2);
  border-bottom:1px solid rgba(17,24,39,.06);flex-wrap:wrap;}
.ctx-label{font-size:12px;color:var(--muted);font-weight:600;letter-spacing:.02em;}
.chip{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line-soft);
  padding:6px 10px;border-radius:999px;font-size:12px;color:var(--text-soft);}
.chip .d{width:6px;height:6px;border-radius:50%;}
.chip.orange .d{background:var(--accent);}
.chip.violet .d{background:var(--violet);}
.chip.green .d{background:var(--green);}
.chip.blue .d{background:#3B82F6;}
.ap-root .edit-context{margin-left:auto;font-size:12px;color:#fff !important;background:var(--accent) !important;font-weight:700;display:inline-flex;align-items:center;gap:6px;cursor:pointer;padding:6px 12px;border-radius:999px;border:none;box-shadow:0 6px 14px -6px rgba(255,106,44,.55);}
.ap-root .edit-context:hover{filter:brightness(1.05);}

/* Convo */
.convo{flex:1;display:flex;flex-direction:column;align-items:center;padding:48px 24px 24px;}
.convo-inner{width:100%;max-width:760px;}
.stamp{display:inline-flex;align-items:center;gap:8px;background:rgba(255,106,44,.10);color:var(--accent);
  padding:6px 12px;border-radius:999px;font-size:12px;font-weight:600;letter-spacing:.04em;}
.greet{font-family:'Fraunces',serif;font-weight:600;font-size:40px;line-height:1.12;letter-spacing:-.01em;
  margin:18px 0 10px;color:var(--text);}
.greet em{font-style:normal;color:var(--accent);}
.greet u{text-decoration:none;background:linear-gradient(180deg,transparent 62%,rgba(255,106,44,.22) 62%);}
.greet-sub{color:var(--text-soft);font-size:15.5px;line-height:1.55;max-width:640px;}
.greet-sub b{color:var(--text);font-weight:600;}

.suggest{margin-top:26px;background:linear-gradient(135deg,#0E1422 0%,#1a2238 100%);
  border:1px solid #1f2a44;border-radius:18px;padding:18px;
  display:grid;grid-template-columns:54px 1fr auto;gap:16px;align-items:center;color:#fff;
  box-shadow:0 30px 60px -30px rgba(11,18,32,.45);}
.suggest .ico-tile{width:54px;height:54px;border-radius:14px;
  background:linear-gradient(135deg,#FF6A2C,#FF8A4C);display:grid;place-items:center;color:#fff;
  box-shadow:0 10px 24px -10px rgba(255,106,44,.7);}
.suggest .label{font-size:11px;letter-spacing:.08em;color:#FFB47A;font-weight:700;
  text-transform:uppercase;display:inline-flex;align-items:center;gap:6px;}
.suggest h3{margin:6px 0 4px;font-family:'Fraunces',serif;font-weight:600;font-size:22px;line-height:1.25;color:#fff;}
.suggest p{margin:0;color:#aab2c8;font-size:13px;}
.ap-root .btn-cta{background:linear-gradient(180deg,#FF7A3D,#FF5A14) !important;color:#fff !important;padding:12px 18px;border-radius:12px;
  font-weight:700;font-size:14px;display:inline-flex;align-items:center;gap:8px;border:none;
  box-shadow:0 12px 24px -8px rgba(255,90,20,.55),inset 0 1px 0 rgba(255,255,255,.25);}
.btn-cta:hover{filter:brightness(1.05);}

.composer-wrap{margin-top:22px;}
.composer{background:#fff;border:1px solid var(--line-soft);border-radius:16px;padding:14px 14px 10px;
  box-shadow:0 1px 0 rgba(17,24,39,.04),0 8px 24px -12px rgba(17,24,39,.18);}
.composer textarea{width:100%;border:0;outline:0;resize:none;min-height:54px;font-size:14.5px;color:var(--text);
  font-family:inherit;line-height:1.5;background:transparent;}
.composer textarea::placeholder{color:#9aa3b8;}
.composer-row{display:flex;align-items:center;gap:6px;margin-top:6px;}
.tool{display:inline-flex;align-items:center;gap:6px;color:#5b6478;font-size:12.5px;padding:6px 10px;border-radius:8px;}
.tool:hover{background:#F1EFE8;}
.send{margin-left:auto;background:#0B1220;color:#fff;padding:9px 14px;border-radius:10px;font-size:13px;font-weight:600;
  display:inline-flex;align-items:center;gap:8px;opacity:.9;}
.send:hover{opacity:1;}
.composer-hint{display:flex;justify-content:space-between;color:var(--muted);font-size:11.5px;margin-top:8px;padding:0 4px;flex-wrap:wrap;gap:8px;}
.kbd{font-size:10px;border:1px solid var(--line-soft);padding:2px 6px;border-radius:6px;background:#fff;color:#5b6478;}

/* Tasks block */
.tasks-wrap{margin-top:28px;}
.tasks-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;}
.tasks-title{font-family:'Fraunces',serif;font-weight:600;font-size:18px;color:var(--text);letter-spacing:-.01em;}
.tasks-tabs{display:inline-flex;gap:4px;background:#fff;border:1px solid var(--line-soft);border-radius:10px;padding:4px;}
.tasks-tab{font-size:12px;color:var(--text-soft);font-weight:600;padding:6px 12px;border-radius:7px;transition:all .15s;}
.tasks-tab.active{background:var(--accent);color:#fff;}
.tasks-tab:not(.active):hover{background:#F1EFE8;}
.tasks-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;align-items:stretch;}
.task-card{background:#FFFFFF !important;border:2px solid #E7E9EF;border-radius:12px;padding:30px 10px 12px;text-align:left;
  display:flex;flex-direction:column;gap:6px;transition:all .18s;position:relative;
  box-shadow:0 1px 0 rgba(17,24,39,.04);min-width:0;height:180px;justify-content:flex-start;cursor:pointer;}
.task-card:hover{border-color:var(--accent);box-shadow:0 0 0 2px rgba(255,106,44,.18),0 10px 22px -12px rgba(255,106,44,.5);transform:translateY(-2px);}
.task-top{display:flex;align-items:flex-start;justify-content:space-between;gap:4px;}
.task-emoji{width:30px;height:30px;border-radius:8px;background:#FBF7F0;display:grid;place-items:center;font-size:15px;flex-shrink:0;}
.task-top-pill{position:absolute;top:8px;left:10px;font-size:8px;font-weight:800;color:#9A3412;background:#FFEDD5;padding:2px 6px;border-radius:999px;letter-spacing:.04em;}
.task-shortcut{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted);font-weight:700;background:#F6F4EE;border:1px solid var(--line-soft);padding:3px 7px;border-radius:6px;white-space:nowrap;display:inline-flex;align-items:center;line-height:1;margin-top:auto;align-self:flex-start;height:20px;}
.task-name{font-family:'Fraunces',serif;font-weight:600;font-size:13px;color:var(--text);line-height:1.2;margin-top:4px;}
.task-desc{font-size:10.5px;color:var(--text-soft);line-height:1.35;}
@media(max-width:1100px){.tasks-grid{grid-template-columns:repeat(3,1fr);}}
@media(max-width:520px){.tasks-grid{grid-template-columns:repeat(2,1fr);}}

/* History */
.history{background:var(--paper-2);border-left:1px solid rgba(17,24,39,.06);
  display:flex;flex-direction:column;height:100vh;position:sticky;top:0;transition:all .25s ease;overflow:hidden;}
.history-head{display:flex;align-items:center;gap:8px;padding:14px 16px;}
.history-title{font-weight:700;font-size:14px;}
.history-actions{margin-left:auto;display:flex;gap:6px;align-items:center;}
.btn-new{background:#0B1220;color:#fff;padding:6px 10px;border-radius:8px;font-size:12px;font-weight:600;
  display:inline-flex;align-items:center;gap:6px;}
.btn-collapse{width:28px;height:28px;border-radius:8px;border:1px solid var(--line-soft);background:#fff;
  display:grid;place-items:center;color:#3B4256;}
.btn-collapse:hover{border-color:#cfd4e1;}
.history-search{margin:0 16px 10px;display:flex;align-items:center;gap:8px;background:#fff;
  border:1px solid var(--line-soft);border-radius:10px;padding:8px 10px;}
.history-search input{border:0;outline:0;width:100%;font-size:13px;background:transparent;}
.history-section{padding:8px 16px 4px;font-size:10.5px;letter-spacing:.14em;color:#7a8194;text-transform:uppercase;}
.history-list{display:flex;flex-direction:column;gap:2px;padding:0 8px;overflow:auto;}
.h-item{display:flex;gap:10px;align-items:flex-start;padding:9px 10px;border-radius:10px;cursor:pointer;text-align:left;width:100%;}
.h-item:hover{background:#fff;}
.h-icon{width:26px;height:26px;border-radius:7px;background:#fff;border:1px solid var(--line-soft);
  display:grid;place-items:center;color:#3B4256;flex:none;}
.h-text{font-size:13px;line-height:1.35;color:var(--text);}
.h-meta{font-size:11px;color:var(--muted);margin-top:2px;}
.plan{margin:auto 12px 12px;background:linear-gradient(180deg,#FFEDD5 0%,#FFD7B5 100%);
  border:1px solid #F7C9A8;border-radius:12px;padding:10px 12px;color:#3a1f0b;}
.plan-tag{font-size:9.5px;font-weight:800;color:#9A3412;letter-spacing:.08em;display:inline-flex;align-items:center;gap:5px;}
.plan h4{margin:5px 0 2px;font-family:'Fraunces',serif;font-weight:700;font-size:13px;color:#3a1f0b;line-height:1.25;}
.plan p{margin:0;font-size:11px;color:#5a3a20;line-height:1.35;}
.btn-plan{margin-top:8px;display:inline-flex;align-items:center;gap:5px;background:var(--accent);color:#fff;
  padding:6px 10px;border-radius:8px;font-size:11.5px;font-weight:700;}

.history.collapsed{overflow:visible;}
.history.collapsed .history-head{flex-direction:column;gap:8px;padding:12px 8px;align-items:center;}
.history.collapsed .history-actions{flex-direction:column;gap:8px;margin-left:0;}
.history.collapsed .history-title,
.history.collapsed .history-search,
.history.collapsed .history-section,
.history.collapsed .history-list,
.history.collapsed .plan,
.history.collapsed .empty-today,
.history.collapsed .btn-new span{display:none;}
.history.collapsed .btn-new{padding:6px;width:32px;height:32px;justify-content:center;}
.history.collapsed .btn-collapse svg{transform:rotate(180deg);}

@media(max-width:1100px){.ai-app{grid-template-columns:72px 1fr 280px;}.ai-app.collapsed{grid-template-columns:72px 1fr 56px;}}
@media(max-width:820px){.ai-app,.ai-app.collapsed{grid-template-columns:1fr;}.history{display:none;}.greet{font-size:30px;}}
`;

const HISTORY_TODAY: Array<{ icon: React.ReactNode; text: string; meta: string }> = [];
const HISTORY_WEEK: Array<{ icon: React.ReactNode; text: string; meta: string }> = [];

type TaskTab = "Mais usadas" | "Inclusão" | "Avaliação" | "Tudo";
const TASKS: Array<{ emoji: string; name: string; desc: string; shortcut: string; top?: boolean }> = [
  { emoji: "📚", name: "Plano de aula", desc: "BNCC alinhado, com objetivos e avaliação", shortcut: "⌘ + 1", top: true },
  { emoji: "📝", name: "Parecer descritivo", desc: "Bimestral, individual, em 4 minutos", shortcut: "⌘ + 2", top: true },
  { emoji: "✨", name: "Adaptar conteúdo", desc: "Para alunos PCD ou com dificuldades", shortcut: "⌘ + 3" },
  { emoji: "📊", name: "Atividade avaliativa", desc: "Com gabarito e níveis de dificuldade", shortcut: "⌘ + 4" },
  { emoji: "💬", name: "Feedback ao aluno", desc: "Construtivo, alinhado à neurociência", shortcut: "⌘ + 5" },
  { emoji: "🎲", name: "Dinâmica de grupo", desc: "Para socialização e aprendizado ativo", shortcut: "⌘ + 6" },
];

export function Assistente() {
  const navigate = useNavigate();
  const sofia = useSofia();
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<TaskTab>("Mais usadas");
  const [search, setSearch] = useState("");
  const messages = sofia.messages;
  const loading = sofia.loading;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Carrega lista de conversas ao montar
  useEffect(() => { sofia.refreshConversations(); }, [sofia.refreshConversations]);

  const handleNew = () => { sofia.startNew(); };

  const sendMessage = (raw?: string) => {
    const content = (raw ?? sofia.draft).trim();
    if (!content || loading) return;
    sofia.send(content);
  };

  // Agrupa conversas por data
  const { today, week, older } = useMemo(() => {
    const now = Date.now();
    const t: typeof sofia.conversations = [];
    const w: typeof sofia.conversations = [];
    const o: typeof sofia.conversations = [];
    const filter = search.trim().toLowerCase();
    for (const c of sofia.conversations) {
      if (filter && !(c.title || "").toLowerCase().includes(filter)) continue;
      const age = now - new Date(c.updated_at).getTime();
      if (age < 24 * 3600 * 1000) t.push(c);
      else if (age < 7 * 24 * 3600 * 1000) w.push(c);
      else o.push(c);
    }
    return { today: t, week: w, older: o };
  }, [sofia.conversations, search]);

  const sendMessage = async (raw?: string) => {
    const content = (raw ?? text).trim();
    if (!content || loading) return;
    const next: ChatMsg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setText("");
    setLoading(true);
    try {
      const data = await askSofia({ data: { messages: next.map(({ role, content }) => ({ role, content })) } });
      setMessages((m) => [...m, { role: "assistant", content: data.content || "", issues: data.issues }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao consultar a Sofia.";
      setMessages((m) => [...m, { role: "assistant", content: `_${msg}_` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ap-root">
      <style dangerouslySetInnerHTML={{ __html: sidebarCss + css }} />
      <div className={"ai-app" + (collapsed ? " collapsed" : "")}>
        <AppSidebar active="assistant" />

        <section className="ai-main">
          <header className="ai-topbar">
            <div className="ai-crumbs">
              <b>Sua sala</b>
              <span className="sep">›</span>
              <span>Assistente IA</span>
            </div>
            <div className="sofia-id">
              <div className="sofia-avatar"><Sparkles size={18} /></div>
              <div>
                <div className="sofia-name">Sofia <span className="tag-beta">IA · BETA</span></div>
                <div className="sofia-sub"><span className="dot-online" /> Sua assistente pedagógica · online agora</div>
              </div>
            </div>
            <div className="topbar-right">
              <div className="credits" title="Créditos do mês">
                <div className="ring" />
                <div>
                  <b>2.000<span style={{ color: "var(--muted)", fontWeight: 500 }}>/3.000</span></b>
                  <small>CRÉDITOS · MAIO</small>
                </div>
              </div>
              <button className="icon-btn" aria-label="Compartilhar"><Share2 size={16} /></button>
              <button className="icon-btn" aria-label="Ajuda"><HelpCircle size={16} /></button>
            </div>
          </header>

          <div className="ai-context">
            <span className="ctx-label">Contexto ativo:</span>
            <span className="chip blue"><span className="d" />Adicione contexto pra Sofia te ajudar melhor</span>
            <button className="edit-context" aria-label="Editar contexto"><Pencil size={13} /> Editar contexto</button>
          </div>

          <div className="convo">
            <div className="convo-inner" ref={scrollRef}>
              {messages.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      style={{
                        alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                        maxWidth: "85%",
                        background: m.role === "user" ? "var(--accent)" : "#fff",
                        color: m.role === "user" ? "#fff" : "var(--text)",
                        border: m.role === "user" ? "none" : "1px solid var(--line-soft)",
                        borderRadius: 14,
                        padding: "12px 14px",
                        fontSize: 14,
                        lineHeight: 1.55,
                        boxShadow: "0 1px 0 rgba(17,24,39,.04),0 8px 24px -16px rgba(17,24,39,.18)",
                      }}
                    >
                      {m.role === "assistant" ? (
                        <>
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                          {m.issues && m.issues.length > 0 && (
                            <div style={{ marginTop: 10, padding: "8px 10px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 8, fontSize: 12, color: "#7C2D12" }}>
                              <b>Linguagem ajustada automaticamente</b> ({m.issues.length} termo{m.issues.length > 1 ? "s" : ""}): {m.issues.map((i, k) => (
                                <span key={k}>{k > 0 ? ", " : " "}<i>"{i.term}"</i> → <b>{i.suggestion}</b></span>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                      )}
                    </div>
                  ))}
                  {loading && (
                    <div style={{ alignSelf: "flex-start", color: "var(--muted)", fontSize: 13, padding: "8px 12px" }}>
                      Sofia está pensando…
                    </div>
                  )}
                </div>
              ) : (
                <>
              <div className="stamp"><Clock size={12} /> QUINTA-FEIRA · 08:14</div>
              <h1 className="greet">
                Olá 👋<br />
                Por onde <em><u>a gente começa hoje?</u></em>
              </h1>
              <p className="greet-sub">
                Cadastre suas turmas e alunos para que eu tenha contexto e possa gerar pareceres, planos e adaptações em minutos.
              </p>

              <div className="suggest">
                <div className="ico-tile"><FileText size={22} /></div>
                <div>
                  <div className="label"><Star size={11} fill="currentColor" /> SUGESTÃO PRA VOCÊ AGORA</div>
                  <h3>Comece cadastrando sua primeira turma</h3>
                  <p>Conforme você usa a Sofia, sugestões personalizadas aparecerão aqui.</p>
                </div>
                <button className="btn-cta" onClick={() => navigate({ to: "/" })} aria-label="Começar agora">
                  Começar agora <ArrowRight size={14} />
                </button>
              </div>

              <div className="tasks-wrap">
                <div className="tasks-head">
                  <div className="tasks-title">Ou escolha uma tarefa</div>
                  <div className="tasks-tabs" role="tablist">
                    {(["Mais usadas","Inclusão","Avaliação","Tudo"] as const).map((t) => (
                      <button
                        key={t}
                        role="tab"
                        aria-selected={tab === t}
                        className={"tasks-tab" + (tab === t ? " active" : "")}
                        onClick={() => setTab(t)}
                      >{t}</button>
                    ))}
                  </div>
                </div>
                <div className="tasks-grid">
                  {TASKS.map((t) => (
                    <button key={t.shortcut} className="task-card" aria-label={t.name} onClick={() => sendMessage(`${t.name}: ${t.desc}`)}>
                      {t.top && <span className="task-top-pill">🔥 Top</span>}
                      <div className="task-emoji">{t.emoji}</div>
                      <div className="task-name">{t.name}</div>
                      <div className="task-desc">{t.desc}</div>
                      <span className="task-shortcut">{t.shortcut}</span>
                    </button>
                  ))}
                </div>
              </div>
                </>
              )}

              <div className="composer-wrap">
                <div className="composer">
                  <textarea
                    value={sofia.draft}
                    onChange={(e) => sofia.setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Pergunte qualquer coisa pedagógica... ex: 'crie um plano de aula sobre frações para o 4º ano'"
                    aria-label="Mensagem para a Sofia"
                  />
                  <div className="composer-row">
                    <button className="send" aria-label="Enviar mensagem" onClick={() => sendMessage()} disabled={loading}>
                      {loading ? "Enviando…" : "Enviar"} <Send size={14} />
                    </button>
                  </div>
                </div>
                <div className="composer-hint">
                  <span>💡 Dica: use <span className="kbd">⌘</span> + <span className="kbd">1-6</span> para abrir uma tarefa direto</span>
                  <span>A Sofia pode cometer erros · sempre revise antes de usar</span>
                </div>
                <div
                  className="text-xs"
                  style={{ marginTop: 4, color: "#6B7280", textAlign: "right" }}
                  title="Esta assistente opera sob princípios éticos e pedagógicos. Clique em Configurações > Princípios da Sofia para ler na íntegra."
                >
                  🛡️ Sofia v{SOFIA_CONSTITUTION_VERSION} · BNCC · LBI · Lei 14.254/2021 · linguagem não-capacitista
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className={"history" + (collapsed ? " collapsed" : "")}>
          <div className="history-head">
            <div className="history-title">Histórico</div>
            <div className="history-actions">
              <button className="btn-new" onClick={handleNew} aria-label="Nova conversa">
                <Plus size={12} /><span>Novo</span>
              </button>
              <button
                className="btn-collapse"
                onClick={() => setCollapsed((v) => !v)}
                aria-label={collapsed ? "Expandir histórico" : "Recolher histórico"}
              >
                <ChevronsLeft size={14} />
              </button>
            </div>
          </div>

          <div className="history-search">
            <Search size={13} color="#7a8194" />
            <input
              placeholder="Buscar conversa..."
              aria-label="Buscar conversa"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="history-list" style={{ flex: 1 }}>
            {!sofia.isAuthed && (
              <div style={{ padding: "8px 16px", fontSize: 12, color: "var(--muted)" }}>
                Faça login para ver suas conversas.
              </div>
            )}
            {sofia.isAuthed && sofia.conversations.length === 0 && (
              <div style={{ padding: "8px 16px", fontSize: 12, color: "var(--muted)" }}>
                Suas conversas com a Sofia aparecerão aqui.
              </div>
            )}
            {today.length > 0 && <div className="history-section">Hoje</div>}
            {today.map((c) => (
              <button
                key={c.id}
                className="h-item"
                onClick={() => sofia.loadConversation(c.id)}
                style={c.id === sofia.conversationId ? { background: "#FFF5EE" } : undefined}
              >
                <div className="h-icon"><FileText size={13} /></div>
                <div style={{ minWidth: 0 }}>
                  <div className="h-text" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                  <div className="h-meta">{new Date(c.updated_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </button>
            ))}
            {week.length > 0 && <div className="history-section">Esta semana</div>}
            {week.map((c) => (
              <button
                key={c.id}
                className="h-item"
                onClick={() => sofia.loadConversation(c.id)}
                style={c.id === sofia.conversationId ? { background: "#FFF5EE" } : undefined}
              >
                <div className="h-icon"><FileText size={13} /></div>
                <div style={{ minWidth: 0 }}>
                  <div className="h-text" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                  <div className="h-meta">{new Date(c.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</div>
                </div>
              </button>
            ))}
            {older.length > 0 && <div className="history-section">Anteriores</div>}
            {older.map((c) => (
              <button
                key={c.id}
                className="h-item"
                onClick={() => sofia.loadConversation(c.id)}
                style={c.id === sofia.conversationId ? { background: "#FFF5EE" } : undefined}
              >
                <div className="h-icon"><FileText size={13} /></div>
                <div style={{ minWidth: 0 }}>
                  <div className="h-text" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                  <div className="h-meta">{new Date(c.updated_at).toLocaleDateString("pt-BR")}</div>
                </div>
              </button>
            ))}
          </div>

        </aside>
      </div>
    </div>
  );
}