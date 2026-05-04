import { useEffect, useRef } from "react";
import { Sparkles, X, Send, Plus, MessageSquare, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useSofia } from "./SofiaProvider";

const css = `
.sofia-fab{position:fixed;right:22px;bottom:22px;z-index:60;display:flex;align-items:center;gap:10px;padding:12px 18px 12px 14px;border:none;border-radius:999px;cursor:pointer;
  background:linear-gradient(135deg,#FF7A45,#FF9466);color:#fff;font-weight:700;font-family:'Inter',sans-serif;font-size:13px;letter-spacing:.01em;
  box-shadow:0 18px 40px -12px rgba(255,122,69,.55),0 4px 12px -4px rgba(255,122,69,.4);transition:transform .18s, box-shadow .18s;}
.sofia-fab:hover{transform:translateY(-2px);box-shadow:0 24px 48px -10px rgba(255,122,69,.65);}
.sofia-fab .sofia-fab-pulse{position:absolute;inset:0;border-radius:999px;animation:sofiaPulse 2.4s ease-out infinite;background:radial-gradient(circle,rgba(255,122,69,.45),transparent 60%);pointer-events:none;}
@keyframes sofiaPulse{0%{opacity:.55;transform:scale(.95);}100%{opacity:0;transform:scale(1.35);}}
.sofia-fab-avatar{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.2);display:grid;place-items:center;color:#fff;}

.sofia-overlay{position:fixed;inset:0;background:rgba(11,18,32,.45);z-index:65;backdrop-filter:blur(2px);animation:sofiaFade .2s ease-out;}
@keyframes sofiaFade{from{opacity:0;}to{opacity:1;}}
.sofia-drawer{position:fixed;right:0;top:0;bottom:0;width:min(440px,100%);background:#FBFAF6;z-index:70;display:flex;flex-direction:column;
  box-shadow:-30px 0 60px -20px rgba(11,18,32,.35);font-family:'Inter',sans-serif;color:#1B2A4E;animation:sofiaSlide .25s cubic-bezier(.2,.8,.2,1);}
@keyframes sofiaSlide{from{transform:translateX(40px);opacity:0;}to{transform:translateX(0);opacity:1;}}
.sofia-head{display:flex;align-items:center;gap:12px;padding:14px 16px;background:linear-gradient(135deg,#1B2A4E,#0F1B36);color:#fff;}
.sofia-head-avatar{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#FF7A45,#FF9466);display:grid;place-items:center;color:#fff;box-shadow:0 8px 18px -8px rgba(255,122,69,.6);}
.sofia-head-name{font-family:'Fraunces',serif;font-weight:700;font-size:16px;}
.sofia-head-sub{font-size:11px;color:rgba(255,255,255,.7);display:flex;align-items:center;gap:6px;}
.sofia-head-sub .dot{width:6px;height:6px;border-radius:50%;background:#16A36B;}
.sofia-head-actions{margin-left:auto;display:flex;gap:6px;}
.sofia-head-btn{width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#fff;display:grid;place-items:center;cursor:pointer;}
.sofia-head-btn:hover{background:rgba(255,255,255,.16);}

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
      {!s.open && (
        <button className="sofia-fab" aria-label="Abrir Sofia" onClick={() => s.setOpen(true)}>
          <span className="sofia-fab-pulse" />
          <span className="sofia-fab-avatar"><Sparkles size={16} /></span>
          <span>Sofia</span>
        </button>
      )}
      {s.open && (
        <>
          <div className="sofia-overlay" onClick={() => s.setOpen(false)} />
          <aside className="sofia-drawer" role="dialog" aria-label="Sofia">
            <header className="sofia-head">
              <div className="sofia-head-avatar"><Sparkles size={18} /></div>
              <div>
                <div className="sofia-head-name">Sofia</div>
                <div className="sofia-head-sub"><span className="dot" /> Assistente pedagógica · online</div>
              </div>
              <div className="sofia-head-actions">
                <button className="sofia-head-btn" title="Nova conversa" onClick={s.startNew}><Plus size={16} /></button>
                <button className="sofia-head-btn" title="Fechar" onClick={() => s.setOpen(false)}><X size={16} /></button>
              </div>
            </header>

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