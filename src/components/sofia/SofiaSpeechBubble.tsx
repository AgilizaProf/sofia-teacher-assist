import { useEffect, useState } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { Sparkles, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useSofiaContext } from "@/lib/sofia/sofiaContext";
import { gerarFalaSofia } from "@/lib/sofia/gerarFala";
import { useSofia } from "./SofiaProvider";

const css = `
.sofia-bubble{position:fixed;right:96px;bottom:30px;max-width:360px;background:#1E1B2E;color:#fff;border-radius:16px;padding:14px 16px;box-shadow:0 18px 40px rgba(15,13,30,.45);border:1px solid rgba(249,115,22,.35);z-index:90;font-family:'Inter',sans-serif;animation:sb-in .25s ease-out;}
@keyframes sb-in{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
.sofia-bubble::after{content:"";position:absolute;right:-8px;bottom:24px;width:0;height:0;border-top:8px solid transparent;border-bottom:8px solid transparent;border-left:8px solid #1E1B2E;}
.sb-head{display:flex;align-items:center;gap:9px;margin-bottom:8px;}
.sb-av{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#F97316,#EA580C);display:grid;place-items:center;flex-shrink:0;box-shadow:0 0 0 3px rgba(249,115,22,.18);}
.sb-greet{font-size:12px;color:#FDBA74;font-weight:700;font-family:'JetBrains Mono',monospace;letter-spacing:.04em;}
.sb-close{margin-left:auto;background:transparent;border:0;color:rgba(255,255,255,.55);cursor:pointer;padding:4px;border-radius:6px;display:grid;place-items:center;}
.sb-close:hover{color:#fff;background:rgba(255,255,255,.08);}
.sb-text{font-size:14px;line-height:1.5;color:rgba(255,255,255,.95);font-weight:500;}
.sb-text em{font-style:normal;color:#FDBA74;font-weight:700;}
.sb-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;}
.sb-btn{padding:7px 12px;border-radius:8px;background:linear-gradient(135deg,#F97316,#EA580C);color:#fff;border:0;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;transition:.18s;}
.sb-btn:hover{transform:translateY(-1px);box-shadow:0 8px 18px rgba(249,115,22,.35);}
.sb-btn.ghost{background:rgba(255,255,255,.08);color:rgba(255,255,255,.85);}
.sb-btn.ghost:hover{background:rgba(255,255,255,.14);}
@media(max-width:560px){.sofia-bubble{right:16px;left:16px;max-width:none;bottom:96px;}.sofia-bubble::after{display:none;}}
`;

const STORAGE_PREFIX = "sofia_bubble_seen_";

export function SofiaSpeechBubble() {
  const ctx = useSofiaContext();
  const sofia = useSofia();
  const navigate = useNavigate();
  const fala = gerarFalaSofia(ctx);
  const [dismissed, setDismissed] = useState(false);
  const hydrated = useHydrated();

  // Reseta ao trocar de rota / personalidade
  useEffect(() => {
    setDismissed(false);
  }, [ctx.route, fala.estado]);

  // Evita mismatch de hidratação: o conteúdo depende do horário local
  // (gerarFalaSofia usa o relógio do cliente).
  if (!hydrated) return null;
  if (sofia.open || fala.estado === "muda" || !fala.texto || dismissed) return null;

  const key = `${STORAGE_PREFIX}${ctx.route}_${fala.estado}`;
  if (typeof window !== "undefined" && window.sessionStorage.getItem(key)) return null;

  const handleAcao = (acao: typeof fala.acoes[number]) => {
    try { window.sessionStorage.setItem(key, "1"); } catch { /* ignore */ }
    setDismissed(true);
    if (acao.intent) {
      window.dispatchEvent(new CustomEvent("sofia:intent", { detail: acao }));
    }
    if (acao.to) {
      navigate({ to: acao.to as string });
    }
    if (acao.prompt) {
      sofia.openSofia({ prompt: acao.prompt, send: false });
    } else if (!acao.to && !acao.intent) {
      sofia.openSofia();
    }
  };

  const handleClose = () => {
    try { window.sessionStorage.setItem(key, "1"); } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <aside className="sofia-bubble" role="status" aria-live="polite">
        <div className="sb-head">
          <div className="sb-av"><Sparkles size={14} color="#fff" /></div>
          <div className="sb-greet">{fala.saudacao || "Sofia"}</div>
          <button className="sb-close" onClick={handleClose} aria-label="Dispensar"><X size={14} /></button>
        </div>
        <div className="sb-text" dangerouslySetInnerHTML={{ __html: fala.texto }} />
        {fala.acoes.length > 0 && (
          <div className="sb-actions">
            {fala.acoes.map((a, i) => (
              <button
                key={i}
                className={`sb-btn ${i === 0 ? "" : "ghost"}`}
                onClick={() => handleAcao(a)}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </aside>
    </>
  );
}
