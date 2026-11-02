import React, { useEffect, useRef, useState } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { Sparkles, X, Send, Plus, ChevronRight, Maximize2, AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useSofia } from "./SofiaProvider";
import { useSofiaContext } from "@/lib/sofia/sofiaContext";
import { parseQuickOptions, isFreeTextOption } from "@/lib/sofia/quickOptions";

const css = `
.sofia-fab{position:fixed;right:max(16px, env(safe-area-inset-right));bottom:max(20px, env(safe-area-inset-bottom));z-index:60;width:58px;height:58px;border-radius:16px;cursor:pointer;
  background:var(--pn-green,#0B7A55);color:#fff;border:2px solid var(--pn-ink,#14161F);box-shadow:3px 3px 0 var(--pn-ink,#14161F);
  display:grid;place-items:center;transition:transform .12s, box-shadow .12s;}
.sofia-fab:hover{transform:translate(-1px,-1px);box-shadow:5px 5px 0 var(--pn-ink,#14161F);}
.sofia-fab-pulse{display:none;}
.sofia-fab-badge{position:absolute;top:-7px;right:-7px;min-width:22px;height:22px;padding:0 5px;border-radius:999px;background:#F2604B;color:#fff;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:800;display:grid;place-items:center;border:2px solid var(--pn-ink,#14161F);}

.sofia-bubble{position:fixed;right:92px;bottom:28px;z-index:50;max-width:300px;background:#fff;border:2px solid var(--pn-ink,#14161F);border-radius:14px;padding:12px 30px 12px 14px;box-shadow:3px 3px 0 var(--pn-ink,#14161F);font-family:'DM Sans',sans-serif;color:var(--pn-ink,#14161F);font-size:14px;line-height:1.45;animation:sofiaBubbleIn .25s cubic-bezier(.2,.8,.2,1);}
.sofia-bubble-close{position:absolute;top:6px;right:6px;background:transparent;border:none;color:#596074;cursor:pointer;padding:3px;border-radius:6px;}
.sofia-bubble-close:hover{background:#EDF0F5;color:#14161F;}
.sofia-bubble-head{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:800;color:var(--pn-green,#0B7A55);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;}
.sofia-bubble-action{margin-top:10px;background:var(--pn-green,#0B7A55);color:#fff;border:2px solid var(--pn-ink,#14161F);border-radius:10px;padding:7px 12px;font-size:13px;font-weight:700;cursor:pointer;}
@keyframes sofiaBubbleIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}

.sofia-overlay{position:fixed;inset:0;background:rgba(20,22,31,.45);z-index:65;animation:sofiaFade .2s ease-out;}
@keyframes sofiaFade{from{opacity:0;}to{opacity:1;}}
.sofia-drawer{position:fixed;right:0;top:0;bottom:0;width:420px;max-width:100vw;background:var(--pn-bg,#EDF0F5);z-index:70;display:flex;flex-direction:column;
  border-left:2px solid var(--pn-ink,#14161F);font-family:'DM Sans',sans-serif;color:var(--pn-ink,#14161F);animation:sofiaSlide .22s cubic-bezier(.2,.8,.2,1);
}
.sofia-drawer *{box-sizing:border-box;}
@media(max-width:640px){.sofia-drawer{width:100vw;border-left:0;}.sofia-bubble{display:none;}}
@keyframes sofiaSlide{from{transform:translateX(40px);opacity:0;}to{transform:translateX(0);opacity:1;}}
.sofia-head{display:flex;align-items:center;gap:10px;padding:12px 12px 12px 14px;padding-top:max(12px, env(safe-area-inset-top));background:#fff;border-bottom:1.5px solid var(--pn-line,#D6DBE5);}
.sofia-head-av{flex:none;width:40px;height:40px;border-radius:11px;background:var(--pn-green,#0B7A55);color:#fff;border:2px solid var(--pn-ink,#14161F);display:grid;place-items:center;}
.sofia-head-name{font-family:'Sora',sans-serif;font-weight:800;font-size:17px;letter-spacing:-.02em;line-height:1.15;}
.sofia-head-sub{font-size:12.5px;color:var(--pn-muted,#596074);display:flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sofia-head-sub .dot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--pn-green,#0B7A55);}
.sofia-head-actions{margin-left:auto;display:flex;gap:6px;flex:none;}
.sofia-head-btn{width:40px;height:40px;border-radius:10px;background:#fff;border:2px solid var(--pn-ink,#14161F);color:var(--pn-ink,#14161F);display:grid;place-items:center;cursor:pointer;box-shadow:2px 2px 0 var(--pn-ink,#14161F);}
.sofia-head-btn:hover{background:var(--pn-green-soft,#CDEFE2);}

.sofia-expand{display:flex;align-items:center;gap:8px;padding:8px 14px;background:#fff;border-bottom:1.5px solid var(--pn-line,#D6DBE5);font-size:13px;color:var(--pn-muted,#596074);}
.sofia-expand span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sofia-expand span b{color:var(--pn-ink,#14161F);}
.sofia-expand button{flex:none;background:var(--pn-green-soft,#CDEFE2);border:1.5px solid var(--pn-ink,#14161F);color:var(--pn-ink,#14161F);border-radius:9px;height:34px;padding:0 10px;font-size:13px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;}

.sofia-body{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:14px;display:flex;flex-direction:column;gap:12px;}
.sofia-empty{padding:12px 4px;}
.sofia-empty h3{font-family:'Sora',sans-serif;font-size:22px;color:var(--pn-ink,#14161F);margin:0 0 6px;font-weight:800;letter-spacing:-.03em;}
.sofia-empty p{font-size:14.5px;line-height:1.5;color:var(--pn-muted,#596074);margin:0;}
.sofia-suggest{margin-top:14px;display:grid;gap:8px;}
.sofia-sg-btn{text-align:left;background:#fff;border:2px solid var(--pn-ink,#14161F);border-radius:12px;padding:11px 12px;font-size:14px;font-weight:600;color:var(--pn-ink,#14161F);cursor:pointer;display:flex;align-items:center;gap:10px;box-shadow:2px 2px 0 var(--pn-ink,#14161F);font-family:inherit;}
.sofia-sg-btn:hover{background:var(--pn-green-soft,#CDEFE2);}
.sofia-sg-btn svg{color:var(--pn-green,#0B7A55);flex-shrink:0;}

.sofia-msg{max-width:90%;padding:10px 13px;font-size:14.5px;line-height:1.55;overflow-wrap:anywhere;}
.sofia-msg.user{align-self:flex-end;background:var(--pn-ink,#14161F);color:#fff;border-radius:14px 14px 4px 14px;white-space:pre-wrap;}
.sofia-msg.assistant{align-self:flex-start;max-width:100%;background:#fff;border:1.5px solid var(--pn-line,#D6DBE5);border-radius:4px 14px 14px 14px;color:var(--pn-ink,#14161F);}
.sofia-msg.err{background:#FFF4F2;border-color:#F2604B;color:#7A1F12;font-weight:600;}
.sofia-msg.assistant p{margin:0 0 8px;}
.sofia-msg.assistant p:last-child{margin-bottom:0;}
.sofia-msg.assistant h1,.sofia-msg.assistant h2,.sofia-msg.assistant h3{font-family:'Sora',sans-serif;font-size:15.5px;margin:12px 0 6px;letter-spacing:-.02em;}
.sofia-msg.assistant ul,.sofia-msg.assistant ol{margin:6px 0 8px 20px;padding:0;}
.sofia-msg.assistant ul{list-style:disc;}
.sofia-msg.assistant ol{list-style:decimal;}
.sofia-msg.assistant a{color:var(--pn-green,#0B7A55);font-weight:600;text-decoration:underline;}
.sofia-msg.assistant code{background:#EDF0F5;padding:1px 5px;border-radius:4px;font-size:12.5px;}
.sofia-retry{margin-top:8px;display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 12px;border-radius:9px;border:2px solid var(--pn-ink,#14161F);background:var(--pn-green,#0B7A55);color:#fff;font-weight:700;font-size:13px;cursor:pointer;}
.sofia-quick{display:flex;flex-wrap:wrap;gap:6px;align-self:flex-start;}
.sofia-quick-btn{min-height:40px;padding:8px 12px;border-radius:999px;border:2px solid var(--pn-ink,#14161F);background:#fff;color:var(--pn-ink,#14161F);font-size:13.5px;font-weight:600;cursor:pointer;line-height:1.15;box-shadow:2px 2px 0 var(--pn-ink,#14161F);font-family:inherit;}
.sofia-quick-btn:hover{background:var(--pn-green-soft,#CDEFE2);}
.sofia-typing{align-self:flex-start;display:flex;align-items:center;gap:8px;padding:10px 14px;background:#fff;border:1.5px solid var(--pn-line,#D6DBE5);border-radius:4px 14px 14px 14px;color:var(--pn-muted,#596074);font-size:13.5px;}
.sofia-typing-dots{display:inline-flex;gap:4px;align-items:center;}
.sofia-typing-dots span{width:6px;height:6px;border-radius:50%;background:var(--pn-green,#0B7A55);animation:sofiaBlink 1.2s infinite ease-in-out;display:inline-block;}
.sofia-typing-dots span:nth-child(2){animation-delay:.2s;}
.sofia-typing-dots span:nth-child(3){animation-delay:.4s;}
@keyframes sofiaBlink{0%,80%,100%{opacity:.3;transform:scale(.8);}40%{opacity:1;transform:scale(1);}}

.sofia-conversations{padding:4px 0 0;}
.sofia-conv-label{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--pn-muted,#596074);font-weight:800;margin:6px 0;}
.sofia-conv-item{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:10px;background:#fff;border:1.5px solid var(--pn-line,#D6DBE5);width:100%;text-align:left;cursor:pointer;font-size:14px;color:var(--pn-ink,#14161F);margin-bottom:6px;font-family:inherit;}
.sofia-conv-item:hover{border-color:var(--pn-ink,#14161F);}

.sofia-composer{padding:10px 12px;padding-bottom:max(10px, env(safe-area-inset-bottom));background:var(--pn-bg,#EDF0F5);}
.sofia-composer-box{display:flex;align-items:flex-end;gap:8px;background:#fff;border:2px solid var(--pn-ink,#14161F);border-radius:14px;padding:6px 6px 6px 12px;box-shadow:3px 3px 0 var(--pn-ink,#14161F);}
.sofia-composer-box:focus-within{box-shadow:3px 3px 0 var(--pn-green,#0B7A55);}
.sofia-composer textarea{flex:1;min-width:0;border:0;padding:8px 0;font-family:inherit;font-size:16px;line-height:1.4;resize:none;outline:none;min-height:24px;max-height:140px;color:var(--pn-ink,#14161F);background:transparent;}
.sofia-send{flex:none;width:42px;height:42px;background:var(--pn-green,#0B7A55);color:#fff;border:2px solid var(--pn-ink,#14161F);border-radius:11px;display:grid;place-items:center;cursor:pointer;}
.sofia-send:disabled{background:#C5CAD6;cursor:not-allowed;}
.sofia-composer-hint{margin-top:6px;font-size:11.5px;color:var(--pn-muted,#596074);text-align:center;}
.sofia-boot-error{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#FFF4F2;border-bottom:1.5px solid #F2604B;color:#7A1F12;font-size:13px;}
.sofia-boot-error svg{flex-shrink:0;}
.sofia-boot-error-msg{flex:1;line-height:1.35;}
.sofia-boot-retry{background:#fff;border:1.5px solid #7A1F12;color:#7A1F12;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;}
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

const mdLinks = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
  ),
};

export function SofiaWidget() {
  const s = useSofia();
  const navigate = useNavigate();
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const hydrated = useHydrated();
  const sofiaCtx = useSofiaContext();
  const firstName = (sofiaCtx.user?.primeiro_nome || sofiaCtx.user?.nome || "").trim();
  const [alreadyGreeted, setAlreadyGreeted] = useState<boolean>(false);
  const loc = useLocation();
  const naPaginaDoChat = loc.pathname.startsWith("/assistente");
  const turmaFoco = sofiaCtx.entity?.turma_atual?.nome;
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    try { setIsTouch(window.matchMedia("(pointer: coarse)").matches); } catch { /* ignore */ }
  }, []);
  // Caixa de texto cresce com o conteúdo.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [s.draft, s.open, isTouch]);

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
    // No celular, Enter quebra a linha (o botão envia).
    if (e.key === "Enter" && !e.shiftKey && !isTouch) {
      e.preventDefault();
      s.send();
    }
  };

  // Na página /assistente o chat já está aberto na tela inteira.
  if (naPaginaDoChat) return null;

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
          <div className="sofia-overlay" onClick={() => s.setOpen(false)} />
          <aside className="sofia-drawer" role="dialog" aria-label="Sofia">
            <header className="sofia-head">
              <span className="sofia-head-av" aria-hidden><Sparkles size={19} /></span>
              <div style={{ minWidth: 0 }}>
                <div className="sofia-head-name">Sofia</div>
                <div className="sofia-head-sub"><span className="dot" /> Assistente pedagógica · {s.routeName}</div>
              </div>
              <div className="sofia-head-actions">
                <button className="sofia-head-btn" title="Nova conversa" aria-label="Nova conversa" onClick={s.startNew}><Plus size={18} /></button>
                <button className="sofia-head-btn" title="Fechar" aria-label="Fechar" onClick={() => s.setOpen(false)}><X size={18} /></button>
              </div>
            </header>

            <div className="sofia-expand">
              <span>{turmaFoco ? <>Turma em foco: <b>{turmaFoco}</b></> : "Conversa rápida"}</span>
              <button
                onClick={() => { s.setOpen(false); navigate({ to: "/assistente" }); }}
                title="Abrir a conversa em tela cheia, com histórico"
              >
                <Maximize2 size={14} /> Tela cheia
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
                  {(
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
                    if (m.error) {
                      return (
                        <div key={i} className="sofia-msg assistant err" role="alert">
                          {m.content}
                          {m.retryText && i === arr.length - 1 && (
                            <div>
                              <button className="sofia-retry" onClick={() => s.send(m.retryText)} disabled={s.busy}>
                                <RotateCcw size={14} /> Tentar de novo
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    }
                    const { clean, options } = parseQuickOptions(m.content);
                    const isLast = i === arr.length - 1;
                    return (
                      <React.Fragment key={i}>
                        <div className="sofia-msg assistant"><ReactMarkdown components={mdLinks}>{clean}</ReactMarkdown></div>
                        {isLast && !s.busy && options.length > 0 && (
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
                                {opt}
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
                  <span className="sofia-typing-text">A Sofia está pensando…</span>
                </div>
              )}
            </div>

            <div className="sofia-composer">
              <div className="sofia-composer-box">
                <textarea
                  ref={taRef}
                  rows={1}
                  value={s.draft}
                  onChange={(e) => s.setDraft(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="Escreva para a Sofia…"
                  aria-label="Mensagem para a Sofia"
                  enterKeyHint="send"
                />
                <button
                  className="sofia-send"
                  aria-label="Enviar mensagem"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => s.send()}
                  disabled={!s.draft.trim() || s.busy}
                >
                  <Send size={17} />
                </button>
              </div>
              <div className="sofia-composer-hint">A Sofia pode errar. Revise antes de usar.</div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
