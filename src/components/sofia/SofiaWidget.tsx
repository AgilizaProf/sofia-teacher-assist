import { useEffect, useRef } from "react";
import { Sparkles, X, Send, Plus, MessageSquare, ChevronRight, Maximize2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "@tanstack/react-router";
import { useSofia } from "./SofiaProvider";

const css = `
.sofia-fab{position:fixed;right:24px;bottom:24px;z-index:50;width:56px;height:56px;border:none;border-radius:50%;cursor:pointer;
  background:linear-gradient(135deg,#F97316,#FF9466);color:#fff;font-family:'Fraunces',serif;font-weight:900;font-size:22px;
  display:grid;place-items:center;
  box-shadow:0 18px 40px -12px rgba(249,115,22,.55),0 4px 12px -4px rgba(249,115,22,.45);transition:transform .18s, box-shadow .18s;}
.sofia-fab:hover{transform:translateY(-2px) scale(1.04);box-shadow:0 24px 48px -10px rgba(249,115,22,.7);}
.sofia-fab-pulse{position:absolute;inset:0;border-radius:50%;animation:sofiaPulse 2.4s ease-out infinite;background:radial-gradient(circle,rgba(249,115,22,.45),transparent 60%);pointer-events:none;}
@keyframes sofiaPulse{0%{opacity:.55;transform:scale(.95);}100%{opacity:0;transform:scale(1.35);}}
.sofia-fab-badge{position:absolute;top:-2px;right:-2px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#E11D48;color:#fff;font-family:'Inter',sans-serif;font-size:11px;font-weight:800;display:grid;place-items:center;border:2px solid #fff;}

.sofia-bubble{position:fixed;right:92px;bottom:32px;z-index:50;max-width:280px;background:#fff;border:1px solid #E7E9EF;border-radius:14px;padding:12px 14px;box-shadow:0 18px 40px -12px rgba(11,18,32,.25);font-family:'Inter',sans-serif;color:#1B2A4E;font-size:13px;line-height:1.45;animation:sofiaBubbleIn .25s cubic-bezier(.2,.8,.2,1);}
.sofia-bubble::after{content:"";position:absolute;right:-8px;bottom:18px;width:0;height:0;border-left:8px solid #fff;border-top:8px solid transparent;border-bottom:8px solid transparent;}
.sofia-bubble-close{position:absolute;top:6px;right:6px;background:transparent;border:none;color:#8A98AE;cursor:pointer;padding:2px;border-radius:6px;}
.sofia-bubble-close:hover{background:#F4F6FB;color:#1B2A4E;}
.sofia-bubble-head{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:800;color:#F97316;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;}
.sofia-bubble-action{margin-top:8px;background:linear-gradient(135deg,#F97316,#FF9466);color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;}
@keyframes sofiaBubbleIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}

.sofia-overlay{position:fixed;inset:0;background:rgba(11,18,32,.45);z-index:65;backdrop-filter:blur(2px);animation:sofiaFade .2s ease-out;}
@keyframes sofiaFade{from{opacity:0;}to{opacity:1;}}
.sofia-drawer{position:fixed;right:0;top:0;bottom:0;width:400px;max-width:100vw;background:#FBFAF6;z-index:70;display:flex;flex-direction:column;
  box-shadow:-30px 0 60px -20px rgba(11,18,32,.35);font-family:'Inter',sans-serif;color:#1B2A4E;animation:sofiaSlide .25s cubic-bezier(.2,.8,.2,1);}
@media(max-width:640px){.sofia-drawer{width:100vw;}.sofia-bubble{right:24px;bottom:88px;}}
@keyframes sofiaSlide{from{transform:translateX(40px);opacity:0;}to{transform:translateX(0);opacity:1;}}
.sofia-head{display:flex;align-items:center;gap:12px;padding:14px 16px;background:linear-gradient(135deg,#1B2A4E,#0F1B36);color:#fff;}
.sofia-head-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#F97316,#FF9466);display:grid;place-items:center;color:#fff;font-family:'Fraunces',serif;font-weight:900;font-size:16px;box-shadow:0 8px 18px -8px rgba(249,115,22,.6);}
.sofia-head-name{font-family:'Fraunces',serif;font-weight:700;font-size:16px;}
.sofia-head-sub{font-size:11px;color:rgba(255,255,255,.7);display:flex;align-items:center;gap:6px;}
.sofia-head-sub .dot{width:6px;height:6px;border-radius:50%;background:#16A36B;}
.sofia-head-actions{margin-left:auto;display:flex;gap:6px;}
.sofia-head-btn{width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#fff;display:grid;place-items:center;cursor:pointer;}
.sofia-head-btn:hover{background:rgba(255,255,255,.16);}

.sofia-expand{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#FFF5EE;border-bottom:1px solid #FFD9C2;color:#9A3412;font-size:12px;font-weight:600;}
.sofia-expand button{background:#fff;border:1px solid #FFD9C2;color:#F97316;border-radius:8px;padding:5px 10px;font-size:11.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;}
.sofia-expand button:hover{background:#F97316;color:#fff;border-color:#F97316;}

.sofia-context{padding:8px 16px;background:#fff;border-bottom:1px solid #E7E9EF;font-size:11.5px;color:#5B6B82;display:flex;align-items:center;gap:6px;}
.sofia-context b{color:#1B2A4E;font-weight:700;}

.sofia-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;}
.sofia-empty{text-align:center;padding:24px 8px;color:#6B7691;}
.sofia-empty h3{font-family:'Fraunces',serif;font-size:18px;color:#1B2A4E;margin:0 0 6px;}
.sofia-empty p{font-size:13px;line-height:1.5;}
.sofia-suggest{margin-top:14px;display:grid;gap:6px;}
.sofia-sg-btn{text-align:left;background:#fff;border:1px solid #E7E9EF;border-radius:10px;padding:10px 12px;font-size:12.5px;color:#1B2A4E;cursor:pointer;display:flex;align-items:center;gap:8px;}
.sofia-sg-btn:hover{border-color:#FF7A45;background:#FFF5EE;}
.sofia-sg-btn svg{color:#FF7A45;flex-shrink:0;}

.sofia-msg{max-width:88%;padding:10px 13px;border-radius:14px;font-size:13.5px;line-height:1.5;word-wrap:break-word;}
.sofia-msg.user{align-self:flex-end;background:#FF7A45;color:#fff;}
.sofia-msg.assistant{align-self:flex-start;background:#fff;border:1px solid #E7E9EF;color:#1B2A4E;}
.sofia-msg.assistant p{margin:0 0 8px;}
.sofia-msg.assistant p:last-child{margin-bottom:0;}
.sofia-msg.assistant ul,.sofia-msg.assistant ol{margin:6px 0 8px 18px;padding:0;}
.sofia-msg.assistant code{background:#F4F6FB;padding:1px 5px;border-radius:4px;font-size:12px;}
.sofia-typing{align-self:flex-start;display:flex;gap:4px;padding:10px 14px;background:#fff;border:1px solid #E7E9EF;border-radius:14px;}
.sofia-typing span{width:6px;height:6px;border-radius:50%;background:#FF7A45;animation:sofiaBlink 1.2s infinite ease-in-out;}
.sofia-typing span:nth-child(2){animation-delay:.2s;}
.sofia-typing span:nth-child(3){animation-delay:.4s;}
@keyframes sofiaBlink{0%,80%,100%{opacity:.3;transform:scale(.8);}40%{opacity:1;transform:scale(1);}}

.sofia-conversations{padding:8px 16px 0;}
.sofia-conv-label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#8A98AE;font-weight:800;margin-bottom:6px;}
.sofia-conv-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;background:#fff;border:1px solid #E7E9EF;width:100%;text-align:left;cursor:pointer;font-size:12.5px;color:#1B2A4E;margin-bottom:4px;}
.sofia-conv-item:hover{border-color:#FF7A45;}
.sofia-conv-item.active{border-color:#FF7A45;background:#FFF5EE;}
.sofia-conv-meta{margin-left:auto;font-size:10px;color:#8A98AE;}

.sofia-composer{padding:12px;background:#fff;border-top:1px solid #E7E9EF;}
.sofia-composer textarea{width:100%;border:1px solid #E7E9EF;border-radius:12px;padding:10px 12px;font-family:inherit;font-size:13.5px;resize:none;outline:none;min-height:48px;max-height:140px;color:#1B2A4E;}
.sofia-composer textarea:focus{border-color:#FF7A45;}
.sofia-composer-row{display:flex;align-items:center;justify-content:space-between;margin-top:6px;}
.sofia-composer-hint{font-size:10.5px;color:#8A98AE;}
.sofia-send{background:linear-gradient(135deg,#FF7A45,#FF9466);color:#fff;border:none;border-radius:10px;padding:8px 14px;font-weight:700;font-size:12.5px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;}
.sofia-send:disabled{opacity:.5;cursor:not-allowed;}
`;

const SUGGESTIONS = [
  "Quero criar um plano de aula alinhado à BNCC",
  "Me ajuda com um parecer descritivo",
  "Como adaptar uma atividade para um aluno com TEA?",
  "Sugira atividades para hoje na minha turma",
];

export function SofiaWidget() {
  const s = useSofia();
  const navigate = useNavigate();
  const bodyRef = useRef<HTMLDivElement | null>(null);

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
      {!s.open && s.proactive && (
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
          <span style={{ position: "relative", zIndex: 1 }}>S</span>
          {s.unread > 0 && <span className="sofia-fab-badge">{s.unread > 9 ? "9+" : s.unread}</span>}
        </button>
      )}
      {s.open && (
        <>
          <div className="sofia-overlay" onClick={() => s.setOpen(false)} />
          <aside className="sofia-drawer" role="dialog" aria-label="Sofia">
            <header className="sofia-head">
              <div className="sofia-head-avatar">S</div>
              <div>
                <div className="sofia-head-name">Sofia · {s.routeName}</div>
                <div className="sofia-head-sub"><span className="dot" /> Assistente pedagógica · online</div>
              </div>
              <div className="sofia-head-actions">
                <button className="sofia-head-btn" title="Nova conversa" onClick={s.startNew}><Plus size={16} /></button>
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
                  <h3>Olá! Eu sou a Sofia 💛</h3>
                  <p>Posso te ajudar com pareceres, planos de aula, adaptações inclusivas e muito mais — sempre ancorada na BNCC e em linguagem humanizada.</p>
                  {!s.isAuthed && (
                    <p style={{ marginTop: 12, color: "#FF7A45", fontWeight: 700 }}>Faça login para conversar comigo.</p>
                  )}
                  <div className="sofia-suggest">
                    {SUGGESTIONS.map((q) => (
                      <button key={q} className="sofia-sg-btn" onClick={() => s.send(q)}>
                        <Sparkles size={14} /> {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                s.messages.map((m, i) => (
                  <div key={i} className={"sofia-msg " + m.role}>
                    {m.role === "assistant" ? <ReactMarkdown>{m.content}</ReactMarkdown> : m.content}
                  </div>
                ))
              )}
              {s.loading && (
                <div className="sofia-typing"><span /><span /><span /></div>
              )}
            </div>

            <div className="sofia-composer">
              <textarea
                value={s.draft}
                onChange={(e) => s.setDraft(e.target.value)}
                onKeyDown={onKey}
                placeholder={s.isAuthed ? "Pergunte algo à Sofia…" : "Faça login para conversar"}
                disabled={!s.isAuthed || s.loading}
              />
              <div className="sofia-composer-row">
                <span className="sofia-composer-hint">Enter para enviar · Shift+Enter para quebrar linha</span>
                <button className="sofia-send" onClick={() => s.send()} disabled={!s.draft.trim() || s.loading || !s.isAuthed}>
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