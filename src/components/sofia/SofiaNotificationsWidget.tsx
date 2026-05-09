import { useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, X, Send, Loader2, Check, Bell as BellIcon, Baby, ClipboardList, BarChart3, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useHydrated } from "@/hooks/useHydrated";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useSofiaNotifications, type SofiaNotifAction, type SofiaNotifCategory, type SofiaNotification } from "@/lib/sofia/notifications";
import { useSofia } from "./SofiaProvider";
import { askSofia } from "@/lib/sofia.functions";
import { useSofiaUserData } from "@/lib/sofia/SofiaUserContext";

// ─────────────────────────────────────────────────────────────────────────────
// Widget flutuante de notificações da Sofia.
//
// Diferente do SofiaWidget (chat), este botão fica acima do FAB principal e
// abre um Sheet lateral com:
//   - badge de não-lidas
//   - lista de lembretes/sugestões/alertas (mais recentes no topo)
//   - botão "Marcar todas como lidas"
//   - input no rodapé que faz uma pergunta direta à Sofia (askSofia) com
//     contexto dos dados reais do usuário (turmas, alunos, planos, diário).
// ─────────────────────────────────────────────────────────────────────────────

const CAT_META: Record<SofiaNotifCategory, { icon: typeof Bell; label: string; color: string; bg: string }> = {
  lembrete: { icon: BellIcon,        label: "Lembrete",   color: "#9A3412", bg: "#FFEDD5" },
  pcd:      { icon: Baby,            label: "Aluno PCD",  color: "#7C3AED", bg: "#EDE9FE" },
  plano:    { icon: ClipboardList,   label: "Planejamento", color: "#1D4ED8", bg: "#DBEAFE" },
  padrao:   { icon: BarChart3,       label: "Padrão",     color: "#0F766E", bg: "#CCFBF1" },
  alerta:   { icon: AlertTriangle,   label: "Alerta",     color: "#B91C1C", bg: "#FEE2E2" },
};

function timeAgo(ts: number): string {
  const sec = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (sec < 60) return "agora";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function SofiaNotificationsWidget() {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const { items, unread, markAllRead, markRead, dismiss } = useSofiaNotifications();
  const sofia = useSofia();
  const userData = useSofiaUserData();
  const navigate = useNavigate();

  const [draft, setDraft] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  const handleAsk = useCallback(async () => {
    const text = draft.trim();
    if (!text || asking) return;
    if (!sofia.isAuthed) { navigate({ to: "/auth" }); return; }
    setAsking(true); setAskError(null); setAnswer(null);
    // Compõe um contexto factual a partir do que o usuário cadastrou.
    const ctxParts: string[] = [];
    ctxParts.push(`Turmas cadastradas: ${userData.turmas.length === 0 ? "nenhuma" : userData.turmas.map((t) => `${t.nome} (${t.total_alunos} alunos)`).join("; ")}.`);
    ctxParts.push(`Alunos cadastrados: ${userData.alunos.length}.`);
    if (userData.alunosPCD.length) {
      ctxParts.push(`Alunos PCD: ${userData.alunosPCD.map((a) => `${a.primeiro_nome} (${a.pcd_codigo ?? "PCD"})`).join("; ")}.`);
    }
    ctxParts.push(`Diário de bordo: ${userData.diario.entries.length} registros (mês: ${userData.diario.total_no_mes}/${userData.diario.meta_mes}).`);
    ctxParts.push(`Sequência didática: ${userData.sequencia.total === 0 ? "nenhuma em andamento" : `${userData.sequencia.done_count}/${userData.sequencia.total} etapas`}.`);
    ctxParts.push("Regra: responda apenas com base nesses dados; se faltar informação, pergunte à professora antes de inventar.");
    try {
      const res = await askSofia({
        data: {
          messages: [{ role: "user", content: text }],
          routeContext: ctxParts.join(" "),
          originRoute: typeof window !== "undefined" ? window.location.pathname : undefined,
        },
      });
      setAnswer(res.content || "");
    } catch (err) {
      setAskError(err instanceof Error ? err.message : "Não consegui responder agora.");
    } finally {
      setAsking(false);
    }
  }, [draft, asking, sofia.isAuthed, navigate, userData]);

  const runAction = useCallback((action: SofiaNotifAction) => {
    if (action.to) {
      // `search` aceita chaves opcionais; o TanStack Router faz o merge.
      navigate({ to: action.to, search: (action.search ?? {}) as never });
      setOpen(false);
      return;
    }
    if (action.prompt) {
      sofia.openSofia({ prompt: action.prompt, send: false });
      setOpen(false);
      return;
    }
    if (action.intent) {
      // dispara um evento global; outras telas podem escutar.
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sofia:intent", { detail: { intent: action.intent } }));
      }
      setOpen(false);
    }
  }, [navigate, sofia]);

  const handleAction = useCallback((n: SofiaNotification) => {
    markRead(n.id);
    if (n.action) runAction(n.action);
  }, [markRead, runAction]);

  const handleSecondary = useCallback((n: SofiaNotification, action: SofiaNotifAction) => {
    markRead(n.id);
    runAction(action);
  }, [markRead, runAction]);

  if (!hydrated) return null;

  return (
    <>
      <style>{`
        .sofia-notif-fab{position:fixed;right:24px;bottom:92px;z-index:50;width:48px;height:48px;border:none;border-radius:50%;cursor:pointer;
          background:#fff;color:#1B2A4E;display:grid;place-items:center;
          box-shadow:0 12px 24px -10px rgba(11,18,32,.35);border:1px solid var(--sofia-line, #E5E7EB);
          transition:transform .18s, box-shadow .18s;}
        .sofia-notif-fab:hover{transform:translateY(-2px);box-shadow:0 18px 28px -10px rgba(11,18,32,.45);}
        .sofia-notif-badge{position:absolute;top:-2px;right:-2px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#E11D48;color:#fff;font-family:'Inter',sans-serif;font-size:11px;font-weight:800;display:grid;place-items:center;border:2px solid #fff;}
        @media(max-width:640px){.sofia-notif-fab{bottom:88px;right:24px;}}
        .sofia-notif-item{display:flex;gap:10px;padding:12px;border:1px solid var(--sofia-line,#E5E7EB);border-radius:12px;background:#fff;align-items:flex-start;transition:background .15s;}
        .sofia-notif-item.unread{background:#FFF7ED;border-color:#FFD9C2;}
        .sofia-notif-icon{width:32px;height:32px;border-radius:8px;display:grid;place-items:center;flex-shrink:0;}
        .sofia-notif-text{font-size:13px;line-height:1.45;color:#1B2A4E;}
        .sofia-notif-meta{font-size:11px;color:#64748B;margin-top:2px;display:flex;gap:8px;align-items:center;}
        .sofia-notif-actions{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;}
        .sofia-notif-empty{text-align:center;padding:32px 16px;color:#64748B;font-size:13px;}
        .sofia-notif-empty h4{font-family:var(--sofia-font-display,'Fraunces',serif);font-size:18px;color:#1B2A4E;margin:0 0 4px;}
        .sofia-notif-foot{border-top:1px solid var(--sofia-line,#E5E7EB);padding:10px 12px;background:#fff;}
        .sofia-notif-foot textarea{width:100%;resize:none;border:1px solid var(--sofia-line,#E5E7EB);border-radius:10px;padding:8px 10px;font-size:13px;font-family:inherit;color:#1B2A4E;outline:none;min-height:44px;max-height:120px;}
        .sofia-notif-foot textarea:focus{border-color:var(--sofia-primary,#F97316);}
        .sofia-notif-answer{margin:8px 0 4px;padding:10px;border-radius:10px;background:#F8FAFC;border:1px solid #E2E8F0;font-size:13px;line-height:1.5;color:#1B2A4E;}
        .sofia-notif-answer p{margin:0 0 8px;} .sofia-notif-answer p:last-child{margin-bottom:0;}
      `}</style>

      <button
        type="button"
        className="sofia-notif-fab"
        aria-label={`Notificações da Sofia${unread ? ` (${unread} não lidas)` : ""}`}
        onClick={() => setOpen(true)}
      >
        <Bell size={20} />
        {unread > 0 && <span className="sofia-notif-badge" aria-hidden>{unread > 9 ? "9+" : unread}</span>}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[400px] max-w-full p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b">
            <div className="flex items-center justify-between gap-2">
              <SheetTitle className="flex items-center gap-2 text-base">
                <Bell size={18} className="text-orange-500" />
                Notificações da Sofia
              </SheetTitle>
              {items.length > 0 && unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1"
                >
                  <Check size={12} /> Marcar todas como lidas
                </button>
              )}
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-3 flex flex-col gap-2">
              {items.length === 0 && (
                <div className="sofia-notif-empty">
                  <h4>Tudo em dia ✨</h4>
                  <p>Quando eu notar algo importante sobre suas turmas, planos ou diário, aviso por aqui.</p>
                </div>
              )}
              {items.map((n) => {
                const meta = CAT_META[n.category];
                const Icon = meta.icon;
                return (
                  <div key={n.id} className={`sofia-notif-item ${n.read ? "" : "unread"}`}>
                    <div className="sofia-notif-icon" style={{ background: meta.bg, color: meta.color }}>
                      <Icon size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="sofia-notif-text">{n.text}</div>
                      <div className="sofia-notif-meta">
                        <span style={{ color: meta.color, fontWeight: 600 }}>{meta.label}</span>
                        <span>·</span>
                        <span>{timeAgo(n.createdAt)}</span>
                      </div>
                      <div className="sofia-notif-actions">
                        {n.action && (
                          <Button size="sm" className="h-7 px-3 text-xs" onClick={() => handleAction(n)}>
                            {n.action.label}
                          </Button>
                        )}
                        {n.actions?.map((a, i) => (
                          <Button
                            key={`${n.id}-act-${i}`}
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleSecondary(n, a)}
                          >
                            {a.label}
                          </Button>
                        ))}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-muted-foreground"
                          onClick={() => dismiss(n.id)}
                        >
                          <X size={12} className="mr-1" /> Ignorar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="sofia-notif-foot">
            {answer !== null && (
              <div className="sofia-notif-answer">
                <ReactMarkdown>{answer || "_Sem resposta._"}</ReactMarkdown>
              </div>
            )}
            {askError && (
              <div className="text-xs text-red-600 mb-2">{askError}</div>
            )}
            <div className="flex gap-2 items-end">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={sofia.isAuthed ? "Pergunte algo à Sofia..." : "Faça login para conversar com a Sofia"}
                disabled={!sofia.isAuthed || asking}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); }
                }}
              />
              <Button
                size="icon"
                onClick={handleAsk}
                disabled={!draft.trim() || asking || !sofia.isAuthed}
                aria-label="Enviar pergunta"
                className="bg-orange-500 hover:bg-orange-600 text-white shrink-0"
              >
                {asking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}