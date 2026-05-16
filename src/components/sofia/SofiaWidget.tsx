import React, { useEffect, useRef, useState } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { Sparkles, X, Send, Plus, MessageSquare, ChevronRight, Maximize2, AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "@tanstack/react-router";
import { useSofia } from "./SofiaProvider";
import { useSofiaContext } from "@/lib/sofia/sofiaContext";
import { parseQuickOptions, isFreeTextOption } from "@/lib/sofia/quickOptions";

const css = `
.sofia-fab{position:fixed;right:max(16px, env(safe-area-inset-right));bottom:max(20px, env(safe-area-inset-bottom));z-index:60;width:56px;height:56px;border:none;border-radius:50%;cursor:pointer;
  background:var(--sofia-gradient);color:var(--sofia-on-dark);
  display:grid;place-items:center;
  box-shadow:var(--sofia-shadow-fab);transition:transform .18s, box-shadow .18s;}
.sofia-fab:hover{transform:translateY(-2px) scale(1.04);box-shadow:0 24px 48px -10px rgba(249,115,22,.7);}
.sofia-fab-pulse{position:absolute;inset:0;border-radius:50%;animation:sofiaPulse 2.4s ease-out infinite;background:radial-gradient(circle,rgba(249,115,22,.45),transparent 60%);pointer-events:none;}
@keyframes sofiaPulse{0%{opacity:.55;transform:scale(.95);}100%{opacity:0;transform:scale(1.35);}}
.sofia-fab-badge{position:absolute;top:-2px;right:-2px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#E11D48;color:#fff;font-family:'Inter',sans-serif;font-size:11px;font-weight:800;display:grid;place-items:center;border:2px solid #fff;}

.sofia-bubble{position:fixed;right:92px;bottom:32px;z-index:50;max-width:280px;background:var(--sofia-surface);border:1px solid var(--sofia-line);border-radius:var(--sofia-radius);padding:12px 14px;box-shadow:var(--sofia-shadow-card);font-family:var(--sofia-font-body);color:var(--sofia-ink);font-size:13px;line-height:1.45;animation:sofiaBubbleIn .25s cubic-bezier(.2,.8,.2,1);}
.sofia-bubble::after{content:"";position:absolute;right:-8px;bottom:18px;width:0;height:0;border-left:8px solid #fff;border-top:8px solid transparent;border-bottom:8px solid transparent;}
.sofia-bubble-close{position:absolute;top:6px;right:6px;background:transparent;border:none;color:#8A98AE;cursor:pointer;padding:2px;border-radius:6px;}
.sofia-bubble-close:hover{background:#F4F6FB;color:#1B2A4E;}
.sofia-bubble-head{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:800;color:var(--sofia-primary);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;}
.sofia-bubble-action{margin-top:8px;background:var(--sofia-gradient);color:var(--sofia-on-dark);border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;}
@keyframes sofiaBubbleIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}

.sofia-overlay{position:fixed;inset:0;background:rgba(11,18,32,.45);z-index:65;backdrop-filter:blur(2px);animation:sofiaFade .2s ease-out;}
@keyframes sofiaFade{from{opacity:0;}to{opacity:1;}}
.sofia-drawer{position:fixed;right:0;top:0;bottom:0;width:400px;max-width:100vw;background:var(--sofia-surface-2);z-index:70;display:flex;flex-direction:column;
  box-shadow:-30px 0 60px -20px rgba(11,18,32,.35);font-family:var(--sofia-font-body);color:var(--sofia-ink);animation:sofiaSlide .25s cubic-bezier(.2,.8,.2,1);}
.sofia-drawer.collapsed{top:auto;bottom:0;height:auto;max-height:none;border-top-left-radius:14px;border-top-right-radius:14px;overflow:hidden;}
.sofia-drawer.collapsed .sofia-expand,
.sofia-drawer.collapsed .sofia-context,
.sofia-drawer.collapsed .sofia-body,
.sofia-drawer.collapsed .sofia-conversations,
.sofia-drawer.collapsed .sofia-composer,
.sofia-drawer.collapsed .sofia-boot-error{display:none;}
.sofia-drawer.collapsed .sofia-head{border-top-left-radius:14px;border-top-right-radius:14px;}
@media(max-width:640px){.sofia-drawer{width:100vw;}.sofia-bubble{right:24px;bottom:88px;}}
@keyframes sofiaSlide{from{transform:translateX(40px);opacity:0;}to{transform:translateX(0);opacity:1;}}
.sofia-head{display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--sofia-dark);color:var(--sofia-on-dark);}
.sofia-head-name{font-family:var(--sofia-font-display);font-weight:700;font-size:16px;}
.sofia-head-sub{font-size:11px;color:rgba(255,255,255,.7);display:flex;align-items:center;gap:6px;}
.sofia-head-sub .dot{width:6px;height:6px;border-radius:50%;background:#16A36B;}
.sofia-head-actions{margin-left:auto;display:flex;gap:6px;}
.sofia-head-btn{width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#fff;display:grid;place-items:center;cursor:pointer;}
.sofia-head-btn:hover{background:rgba(255,255,255,.16);}

.sofia-expand{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--sofia-primary-soft);border-bottom:1px solid #FFD9C2;color:#9A3412;font-size:12px;font-weight:600;}
.sofia-expand button{background:var(--sofia-surface);border:1px solid #FFD9C2;color:var(--sofia-primary);border-radius:8px;padding:5px 10px;font-size:11.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;}
.sofia-expand button:hover{background:var(--sofia-primary);color:#fff;border-color:var(--sofia-primary);}

.sofia-context{padding:8px 16px;background:var(--sofia-surface);border-bottom:1px solid var(--sofia-line);font-size:11.5px;color:var(--sofia-ink-soft);display:flex;align-items:center;gap:6px;}
.sofia-context b{color:var(--sofia-ink);font-weight:700;}

.sofia-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;}
.sofia-empty{text-align:center;padding:24px 8px;color:var(--sofia-ink-soft);}
.sofia-empty h3{font-family:var(--sofia-font-display);font-size:20px;color:var(--sofia-ink);margin:0 0 6px;font-weight:700;}
.sofia-empty p{font-size:13px;line-height:1.5;}
.sofia-suggest{margin-top:14px;display:grid;gap:6px;}
.sofia-sg-btn{text-align:left;background:var(--sofia-surface);border:1px solid var(--sofia-line);border-radius:10px;padding:10px 12px;font-size:12.5px;color:var(--sofia-ink);cursor:pointer;display:flex;align-items:center;gap:8px;}
.sofia-sg-btn:hover{border-color:var(--sofia-primary);background:var(--sofia-primary-soft);}
.sofia-sg-btn svg{color:var(--sofia-primary);flex-shrink:0;}

.sofia-msg{max-width:88%;padding:10px 13px;border-radius:14px;font-size:13.5px;line-height:1.5;word-wrap:break-word;}
.sofia-msg.user{align-self:flex-end;background:var(--sofia-primary);color:#fff;}
.sofia-msg.assistant{align-self:flex-start;background:var(--sofia-surface);border:1px solid var(--sofia-line);color:var(--sofia-ink);}
.sofia-msg.assistant p{margin:0 0 8px;}
.sofia-msg.assistant p:last-child{margin-bottom:0;}
.sofia-msg.assistant ul,.sofia-msg.assistant ol{margin:6px 0 8px 18px;padding:0;}
.sofia-msg.assistant code{background:#F4F6FB;padding:1px 5px;border-radius:4px;font-size:12px;}
.sofia-quick{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;align-self:flex-start;max-width:88%;}
.sofia-quick-btn{min-height:36px;padding:8px 12px;border-radius:999px;border:1px solid var(--sofia-line);background:#fff;color:var(--sofia-ink);font-size:12.5px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;line-height:1.1;transition:all .15s ease;}
.sofia-quick-btn:hover{border-color:var(--sofia-primary);background:var(--sofia-primary-soft);color:var(--sofia-primary);}
.sofia-quick-btn:active{transform:translateY(1px);}
.sofia-typing{align-self:flex-start;display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--sofia-surface);border:1px solid var(--sofia-line);border-radius:14px;color:var(--sofia-primary);font-size:12.5px;font-weight:500;}
.sofia-typing-dots{display:inline-flex;gap:4px;align-items:center;}
.sofia-typing-dots span{width:6px;height:6px;border-radius:50%;background:var(--sofia-primary);animation:sofiaBlink 1.2s infinite ease-in-out;display:inline-block;}
.sofia-typing-dots span:nth-child(2){animation-delay:.2s;}
.sofia-typing-dots span:nth-child(3){animation-delay:.4s;}
.sofia-typing-text{opacity:.85;}
@keyframes sofiaBlink{0%,80%,100%{opacity:.3;transform:scale(.8);}40%{opacity:1;transform:scale(1);}}

.sofia-conversations{padding:8px 16px 0;}
.sofia-conv-label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#8A98AE;font-weight:800;margin-bottom:6px;}
.sofia-conv-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;background:var(--sofia-surface);border:1px solid var(--sofia-line);width:100%;text-align:left;cursor:pointer;font-size:12.5px;color:var(--sofia-ink);margin-bottom:4px;}
.sofia-conv-item:hover{border-color:var(--sofia-primary);}
.sofia-conv-item.active{border-color:var(--sofia-primary);background:var(--sofia-primary-soft);}
.sofia-conv-meta{margin-left:auto;font-size:10px;color:#8A98AE;}

.sofia-composer{padding:12px;background:var(--sofia-surface);border-top:1px solid var(--sofia-line);}
.sofia-composer textarea{width:100%;border:1px solid var(--sofia-line);border-radius:12px;padding:10px 12px;font-family:inherit;font-size:13.5px;resize:none;outline:none;min-height:48px;max-height:140px;color:var(--sofia-ink);}
.sofia-composer textarea:focus{border-color:var(--sofia-primary);}
.sofia-composer-row{display:flex;align-items:center;justify-content:space-between;margin-top:6px;}
.sofia-composer-hint{font-size:10.5px;color:#8A98AE;}
.sofia-send{background:var(--sofia-gradient);color:#fff;border:none;border-radius:10px;padding:8px 14px;font-weight:700;font-size:12.5px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;}
.sofia-send:disabled{opacity:.5;cursor:not-allowed;}
.sofia-boot-error{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#FEF2F2;border-bottom:1px solid #FECACA;color:#991B1B;font-size:12px;}
.sofia-boot-error svg{flex-shrink:0;}
.sofia-boot-error-msg{flex:1;line-height:1.35;}
.sofia-boot-retry{background:#fff;border:1px solid #FCA5A5;color:#991B1B;border-radius:8px;padding:5px 10px;font-size:11.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;}
.sofia-boot-retry:hover{background:#FEE2E2;}
.sofia-boot-retry:disabled{opacity:.6;cursor:not-allowed;}
`;

const SUGGESTIONS = [
  "Quero criar um plano de aula alinhado à BNCC",
  "Me ajuda com um parecer descritivo",
  "Como adaptar uma atividade para um aluno com TEA?",
  "Sugira atividades para hoje na minha turma",
];

function greeting(hydrated: boolean) {
  // Antes da hidratação, server e client precisam renderizar o MESMO texto,
  // senão o React aborta a árvore e cai no errorBoundary ("Something went wrong").
  if (!hydrated) return "Olá";
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function SofiaWidget() {
  const s = useSofia();
  const navigate = useNavigate();
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const hydrated = useHydrated();
  const sofiaCtx = useSofiaContext();
  const firstName = (sofiaCtx.user?.primeiro_nome || sofiaCtx.user?.nome || "").trim();
  const [alreadyGreeted, setAlreadyGreeted] = useState<boolean>(false);
  const [collapsed, setCollapsed] = useState<boolean>(true);

  useEffect(() => {
    if (s.open) setCollapsed(true);
  }, [s.open]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      setAlreadyGreeted(localStorage.getItem("sofia-greeted") === "1");
    } catch { /* ignore */ }
  }, [hydrated]);

  useEffect(() => {
    if (!s.open || !hydrated) return;
    try {
      if (localStorage.getItem("sofia-greeted") !== "1") {
        localStorage.setItem("sofia-greeted", "1");
      }
    } catch { /* ignore */ }
  }, [s.open, hydrated]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [s.messages, s.loading]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      s.send();
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {hydrated && !s.open && s.proactive && (
        <div className="sofia-bubble" role="status">
          <button className="sofia-bubble-close" aria-label="Fechar" onClick={s.dismissProactive}><X size={14} /></button>
          <div className="sofia-bubble-head"><Sparkles size={11} /> Sofia</div>
          <div>{s.proactive.message}</div>
          {s.proactive.action && (
            <button
              className="sofia-bubble-action"
              onClick={() => {
                const act = s.proactive!.action!;
                s.dismissProactive();
                if (act.to) navigate({ to: act.to });
                s.openSofia(act.prompt ? { prompt: act.prompt } : undefined);
              }}
            >
              {s.proactive.action.label}
            </button>
          )}
        </div>
      )}
      {!s.open && (
        <button className="sofia-fab" aria-label="Abrir Sofia" onClick={() => s.setOpen(true)}>
          <span className="sofia-fab-pulse" />
          <Sparkles size={24} style={{ position: "relative", zIndex: 1 }} />
          {s.unread > 0 && <span className="sofia-fab-badge">{s.unread > 9 ? "9+" : s.unread}</span>}
        </button>
      )}
      {s.open && (
        <>
          {!collapsed && <div className="sofia-overlay" onClick={() => s.setOpen(false)} />}
          <aside className={"sofia-drawer" + (collapsed ? " collapsed" : "")} role="dialog" aria-label="Sofia">
            <header className="sofia-head">
              <div className="sofia-avatar-token sofia-avatar-token--md">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="sofia-head-name">Sofia · {s.routeName}</div>
                <div className="sofia-head-sub"><span className="dot" /> Assistente pedagógica · online</div>
              </div>
              <div className="sofia-head-actions">
                <button className="sofia-head-btn" title="Nova conversa" onClick={s.startNew}><Plus size={16} /></button>
                <button
                  className="sofia-head-btn"
                  title={collapsed ? "Expandir" : "Recolher"}
                  aria-label={collapsed ? "Expandir mini-chat" : "Recolher mini-chat"}
                  onClick={() => setCollapsed((v) => !v)}
                >
                  {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <button className="sofia-head-btn" title="Fechar" onClick={() => s.setOpen(false)}><X size={16} /></button>
              </div>
            </header>

            <div className="sofia-expand">
              <span>💬 Mini-chat contextual</span>
              <button
                onClick={() => { s.setOpen(false); navigate({ to: "/assistente" }); }}
                title="Abrir conversa completa"
              >
                <Maximize2 size={12} /> Abrir conversa completa
              </button>
            </div>

            {s.bootError && (
              <div className="sofia-boot-error" role="alert">
                <AlertTriangle size={14} />
                <div className="sofia-boot-error-msg">
                  <b>Erro ao carregar a Sofia.</b> {s.bootError}
                </div>
                <button
                  className="sofia-boot-retry"
                  onClick={() => s.retryBootstrap()}
                  disabled={s.loading}
                  title="Reexecutar o carregamento inicial"
                >
                  <RefreshCw size={12} /> Tentar novamente
                </button>
              </div>
            )}

            <div className="sofia-context">
              <MessageSquare size={12} /> <b>Contexto:</b> {s.routeContext}
            </div>

            {s.messages.length === 0 && s.conversations.length > 0 && (
              <div className="sofia-conversations">
                <div className="sofia-conv-label">Conversas recentes</div>
                {s.conversations.slice(0, 3).map((c) => (
                  <button key={c.id} className={"sofia-conv-item" + (c.id === s.conversationId ? " active" : "")} onClick={() => s.loadConversation(c.id)}>
                    <ChevronRight size={12} /> <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{c.title}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="sofia-body" ref={bodyRef}>
              {s.messages.length === 0 ? (
                <div className="sofia-empty">
                  <div style={{ display: "grid", placeItems: "center", marginBottom: 10 }}>
                    <div className="sofia-avatar-token sofia-avatar-token--lg"><Sparkles size={28} /></div>
                  </div>
                  {!alreadyGreeted && (
                    <h3>{greeting(hydrated)}{firstName ? `, ${firstName}` : ""} 👋</h3>
                  )}
                  <p>Vamos juntos(as)? Posso preparar um <span className="sofia-em">parecer em ~4 min</span>, um <span className="sofia-em">plano BNCC em ~6 min</span> ou uma adaptação inclusiva — escolha por onde começar.</p>
                  <div className="sofia-suggest">
                    {SUGGESTIONS.map((q) => (
                      <button key={q} className="sofia-sg-btn" onClick={() => s.send(q)}>
                        <Sparkles size={14} /> {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {s.messages.length > 6 && (
                    <button
                      onClick={() => { s.setOpen(false); navigate({ to: "/assistente" }); }}
                      style={{
                        alignSelf: "center", background: "transparent", border: "1px dashed #E7E9EF",
                        color: "#6B7691", fontSize: 11.5, padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                      }}
                    >
                      Ver {s.messages.length - 6} mensagens anteriores na conversa completa →
                    </button>
                  )}
                  {s.messages.slice(-6).map((m, i, arr) => {
                    if (m.role !== "assistant") {
                      return <div key={i} className="sofia-msg user">{m.content}</div>;
                    }
                    const { clean, options } = parseQuickOptions(m.content);
                    const isLast = i === arr.length - 1;
                    return (
                      <React.Fragment key={i}>
                        <div className="sofia-msg assistant"><ReactMarkdown>{clean}</ReactMarkdown></div>
                        {isLast && !s.loading && options.length > 0 && (
                          <div className="sofia-quick" role="group" aria-label="Respostas rápidas">
                            {options.map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                className="sofia-quick-btn"
                                onClick={() => {
                                  if (isFreeTextOption(opt)) {
                                    setTimeout(() => taRef.current?.focus(), 0);
                                  } else {
                                    s.send(opt);
                                  }
                                }}
                              >
                                👆 {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </>
              )}
              {s.loading && (
                <div className="sofia-typing" aria-live="polite">
                  <span className="sofia-typing-dots"><span /><span /><span /></span>
                  <span className="sofia-typing-text">Pensando…</span>
                </div>
              )}
            </div>

            <div className="sofia-composer">
              <textarea
                ref={taRef}
                value={s.draft}
                onChange={(e) => s.setDraft(e.target.value)}
                onKeyDown={onKey}
                placeholder="Pergunte algo à Sofia…"
                disabled={s.loading}
              />
              <div className="sofia-composer-row">
                <span className="sofia-composer-hint">Enter para enviar · Shift+Enter para quebrar linha</span>
                <button className="sofia-send" onClick={() => s.send()} disabled={!s.draft.trim() || s.loading}>
                  <Send size={13} /> Enviar
                </button>
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}