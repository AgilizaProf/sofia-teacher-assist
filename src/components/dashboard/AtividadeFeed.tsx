import { useNavigate } from "@tanstack/react-router";
import { FileText, CalendarCheck2, Sparkles, UserPlus, Download, ArrowRight } from "lucide-react";
import { useActivityFeed, relativeTime, type ActivityType } from "@/lib/activity/activityLog";
import { useHydrated } from "@/hooks/useHydrated";
import { useSofia } from "@/components/sofia/SofiaProvider";

const ICON_BY_TYPE: Record<ActivityType, { Icon: typeof FileText; color: string; label: string }> = {
  parecer: { Icon: FileText, color: "#8B5CF6", label: "Parecer" },
  planejamento: { Icon: CalendarCheck2, color: "#10B981", label: "Planejamento" },
  adaptacao: { Icon: Sparkles, color: "#F97316", label: "Adaptação" },
  aluno: { Icon: UserPlus, color: "#0EA5E9", label: "Aluno" },
  exportacao: { Icon: Download, color: "#64748B", label: "Exportação" },
};

const css = `
.afeed-list{display:flex;flex-direction:column;gap:10px;margin-top:6px;}
.afeed-item{display:flex;align-items:flex-start;gap:12px;padding:10px 12px;border-radius:12px;
  background:#fafaf9;border:1px solid #f0eee9;transition:.15s background;}
.afeed-item:hover{background:#f5f4f1;}
.afeed-icn{flex-shrink:0;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;color:#fff;}
.afeed-body{flex:1;min-width:0;}
.afeed-desc{font-size:13.5px;font-weight:600;color:#1f1d2a;line-height:1.35;margin-bottom:2px;}
.afeed-meta{font-size:11.5px;color:#736e63;display:flex;gap:6px;align-items:center;flex-wrap:wrap;}
.afeed-meta b{color:#8B5CF6;font-weight:700;}
.afeed-empty{padding:18px 16px;border-radius:12px;background:linear-gradient(135deg,#FAF5FF,#F3E8FF);
  border:1px dashed #D8B4FE;color:#5B21B6;font-size:13px;font-weight:600;line-height:1.45;
  display:flex;flex-direction:column;gap:10px;}
.afeed-cta{align-self:flex-start;display:inline-flex;align-items:center;gap:6px;padding:8px 14px;
  border-radius:9px;background:#8B5CF6;color:#fff;border:0;font-weight:700;font-size:12.5px;cursor:pointer;}
.afeed-cta:hover{background:#7C3AED;}
`;

export function AtividadeFeed() {
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const sofia = useSofia();
  const { week } = useActivityFeed();

  if (!hydrated) {
    return (
      <div role="status" aria-live="polite" style={{ padding: 16, color: "#736e63", fontSize: 13 }}>
        Carregando atividades…
      </div>
    );
  }

  if (week.length === 0) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="afeed-empty" role="status">
          <span>✨ Nenhuma atividade esta semana. Que tal começar pelos pareceres?</span>
          <button
            type="button"
            className="afeed-cta"
            onClick={() => navigate({ to: "/relatorios", search: { tab: "todo", focus: "pareceres" } })}
          >
            Começar pelos pareceres <ArrowRight size={14} />
          </button>
        </div>
      </>
    );
  }

  const visible = week.slice(0, 8);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <ul className="afeed-list" aria-label="Atividades desta semana">
        {visible.map((item) => {
          const meta = ICON_BY_TYPE[item.type];
          const Icon = meta.Icon;
          return (
            <li key={item.id} className="afeed-item">
              <div className="afeed-icn" style={{ background: meta.color }}>
                <Icon size={16} strokeWidth={2.4} />
              </div>
              <div className="afeed-body">
                <div className="afeed-desc">{item.description}</div>
                <div className="afeed-meta">
                  <span>{relativeTime(item.ts)}</span>
                  {item.detail && <><span>·</span><b>{item.detail}</b></>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {/* CTA "Pergunte à Sofia" segue logo abaixo no Dashboard */}
      <button
        type="button"
        onClick={() => sofia.openSofia({
          prompt: "Me dê um panorama desta semana com base nas atividades registradas.",
          context: "Tela: Página inicial · feed Esta semana",
        })}
        style={{
          marginTop: 12, width: "100%", padding: "10px 14px", borderRadius: 10,
          background: "linear-gradient(135deg,#8B5CF6,#6D28D9)", color: "#fff",
          border: 0, fontWeight: 700, fontSize: 13, cursor: "pointer",
        }}
      >
        💬 Pergunte à Sofia sobre esta semana
      </button>
    </>
  );
}