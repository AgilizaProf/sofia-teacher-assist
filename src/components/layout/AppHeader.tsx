import type { ReactNode } from "react";
import { useSofiaContext } from "@/lib/sofia/sofiaContext";
import { SofiaActiveChip } from "@/components/sofia/SofiaActiveChip";
import { initialsFromName } from "@/lib/mockData";

export const appHeaderCss = `
.app-header{display:flex;align-items:center;gap:14px;padding:12px 24px;background:#fff;border-bottom:1px solid #E4E8F0;flex-wrap:wrap;min-height:60px;}
.app-header .ah-left{display:flex;align-items:center;gap:12px;min-width:0;flex:1;}
.app-header .ah-crumbs{display:flex;align-items:center;gap:6px;font-size:12px;color:#6B7691;font-weight:600;flex-wrap:wrap;}
.app-header .ah-crumbs strong{color:#1B2A4E;font-weight:700;}
.app-header .ah-crumbs .sep{opacity:.45;}
.app-header .ah-crumbs .now{color:#1B2A4E;font-weight:700;}
.app-header .ah-streak{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#FFF1E8,#fff);border:1px solid #FFD9BF;border-radius:100px;padding:4px 10px 4px 8px;font-size:11.5px;font-weight:700;color:#C2410C;}
.app-header .ah-streak .num{font-family:'Fraunces',serif;font-weight:800;font-size:13px;}
.app-header .ah-secstatus{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:#6B7691;}
.app-header .ah-secstatus .dot{width:7px;height:7px;border-radius:50%;background:#10B981;box-shadow:0 0 6px #10B981;}
.app-header .ah-right{margin-left:auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.app-header .ah-icon{width:32px;height:32px;border-radius:8px;background:#fff;border:1px solid #E4E8F0;display:flex;align-items:center;justify-content:center;color:#6B7691;cursor:pointer;transition:.15s;position:relative;}
.app-header .ah-icon:hover{border-color:#FF7A45;color:#FF7A45;}
.app-header .ah-icon svg{width:14px;height:14px;}
.app-header .ah-credits{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #E4E8F0;border-radius:10px;padding:5px 11px;font-size:11.5px;color:#1B2A4E;font-weight:700;line-height:1.1;}
.app-header .ah-credits small{display:block;font-size:9.5px;color:#6B7691;font-weight:700;letter-spacing:.06em;margin-top:2px;}
.app-header .ah-user{display:flex;align-items:center;gap:9px;background:#fff;border:1px solid #E4E8F0;border-radius:100px;padding:3px 12px 3px 3px;cursor:pointer;}
.app-header .ah-user:hover{border-color:#FF7A45;}
.app-header .ah-user .av{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#FF9466,#FF7A45);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:10.5px;}
.app-header .ah-user .nm{font-size:11.5px;font-weight:700;color:#1B2A4E;line-height:1.2;}
.app-header .ah-user .pl{font-size:9px;color:#FF7A45;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-top:1px;}
`;

export type AppHeaderProps = {
  breadcrumb?: Array<{ label: string; onClick?: () => void }>;
  actions?: ReactNode;
  secondaryStatus?: string | null;
  hideActiveChip?: boolean;
};

const ROUTE_LABELS: Record<string, string> = {
  home: "Página inicial",
  assistente: "Assistente IA",
  planejamento: "Planejamento",
  relatorios: "Relatórios",
  inclusao: "Inclusão",
  agenda: "Agenda",
  configuracoes: "Configurações",
};

function deriveBreadcrumb(ctx: ReturnType<typeof useSofiaContext>): Array<{ label: string; onClick?: () => void }> {
  const out: Array<{ label: string; onClick?: () => void }> = [{ label: "Sua sala" }];
  const routeLabel = ROUTE_LABELS[ctx.route] ?? "—";
  out.push({ label: routeLabel });
  if (ctx.route === "inclusao" && ctx.entity.aluno_atual) {
    if (ctx.entity.turma_atual) out.push({ label: ctx.entity.turma_atual.nome });
    out.push({ label: ctx.entity.aluno_atual.nome });
  }
  return out;
}

export function AppHeader({ breadcrumb, actions, secondaryStatus, hideActiveChip }: AppHeaderProps) {
  const ctx = useSofiaContext();
  const crumbs = breadcrumb && breadcrumb.length > 0 ? breadcrumb : deriveBreadcrumb(ctx);
  const u = ctx.user;
  const isPro = u.plano === "pro";
  const mes = new Date().toLocaleString("pt-BR", { month: "short" }).replace(".", "").toUpperCase();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: appHeaderCss }} />
      <header className="app-header">
        <div className="ah-left">
          <div className="ah-crumbs">
            {crumbs.map((c, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {i === 0 ? <strong>{c.label}</strong> : (
                  c.onClick
                    ? <a onClick={c.onClick} style={{ cursor: "pointer" }}>{c.label}</a>
                    : <span className={i === crumbs.length - 1 ? "now" : ""}>{c.label}</span>
                )}
                {i < crumbs.length - 1 && <span className="sep">›</span>}
              </span>
            ))}
          </div>
          {!hideActiveChip && <SofiaActiveChip />}
          {secondaryStatus && (
            <div className="ah-secstatus"><span className="dot" /> {secondaryStatus}</div>
          )}
          {u.streak_dias >= 3 && (
            <div className="ah-streak">🔥 <span className="num">{u.streak_dias}</span> dias seguidos</div>
          )}
        </div>
        <div className="ah-right">
          {actions}
          {isPro && (
            <div className="ah-credits" title="Créditos do mês">
              <div>
                {u.creditos_usados.toLocaleString("pt-BR")}<span style={{ color: "#6B7691", fontWeight: 500 }}>/{u.creditos_total.toLocaleString("pt-BR")}</span>
                <small>CRÉDITOS · {mes}</small>
              </div>
            </div>
          )}
          <div className="ah-user" aria-label={`Usuária ${u.nome}, ${u.plano === "pro" ? "Plano Pro" : "Plano Free"}`}>
            <div className="av">{initialsFromName(u.nome)}</div>
            <div>
              <div className="nm">{u.nome}</div>
              <div className="pl">PLANO {u.plano === "pro" ? "PRO" : "FREE"}</div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}