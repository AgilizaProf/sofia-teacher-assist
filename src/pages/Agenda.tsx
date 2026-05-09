import { useEffect, useMemo, useState } from "react";
import { AppSidebar, sidebarCss } from "@/components/AppSidebar";
import { ChevronLeft, ChevronRight, Plus, Filter, Clock, X, Pencil, Trash2, Sparkles } from "lucide-react";
import { holidayMap } from "@/lib/holidaysBR";
import { brNow } from "@/lib/datetime";
import { useSofiaContext } from "@/lib/sofia/sofiaContext";
import { useSofia } from "@/components/sofia/SofiaProvider";
import { Header as AppHeader } from "@/components/Header";
import { usePersistentState } from "@/lib/persist/usePersistentState";

const css = `
.ag-root{
  --primary:#1B2A4E;--primary-dark:#0F1B36;--primary-deep:#0a1226;
  --accent:#FF7A45;--accent-warm:#FF9466;--accent-soft:#FFF1E8;
  --success:#10B981;--warn:#F59E0B;--danger:#EF4444;--info:#3B82F6;
  --bg:#F4F6FB;--card:#FFFFFF;--text:#1B2A4E;--text-mute:#64708A;
  --border:#E4E8F0;--border-soft:#EEF1F7;
 --pcd:#8B5CF6;--plan:#3B82F6;--report:#10B981;--meeting:#FF7A45;--eval:#F59E0B;--holiday:#94A3B8;--personal:#EC4899;
  font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);font-size:14px;line-height:1.5;min-height:100vh;
}
.ag-root *{box-sizing:border-box;}
.ag-app{display:grid;grid-template-columns:240px 1fr;min-height:100vh;}
.ag-main{padding:0;display:flex;flex-direction:column;min-width:0;}

.ag-topbar{padding:18px 32px 16px;background:#fff;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;}
.ag-breadcrumb{font-size:11.5px;color:var(--text-mute);display:flex;align-items:center;gap:8px;margin-bottom:5px;font-weight:500;}
.ag-breadcrumb .sep{opacity:.4;}
.ag-breadcrumb b{color:var(--text);font-weight:600;}
.ag-title{font-family:'Fraunces',serif;font-size:28px;font-weight:800;letter-spacing:-.7px;line-height:1.1;color:var(--text);margin:0;}
.ag-meta{font-size:12.5px;color:var(--text-mute);margin-top:4px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
.ag-meta b{color:var(--text);font-weight:600;}
.ag-meta .pill{display:inline-flex;align-items:center;gap:5px;padding:2px 10px;background:var(--accent-soft);color:var(--accent);border-radius:20px;font-weight:600;font-size:11px;}
.ag-meta .mdot{width:3px;height:3px;background:#cdd4e0;border-radius:50%;}
.ag-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.ag-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 14px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid var(--border);background:#fff;color:var(--text);font-family:inherit;transition:.18s;}
.ag-btn:hover{background:var(--bg);border-color:#cdd4e0;}
.ag-btn.primary{background:linear-gradient(135deg,var(--accent) 0%,var(--accent-warm) 100%);color:#fff;border-color:transparent;box-shadow:0 4px 12px rgba(255,122,69,.32);}
.ag-btn.primary:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(255,122,69,.42);}

.ag-content{padding:22px 32px 40px;display:grid;grid-template-columns:1fr 340px;gap:22px;align-items:start;}
.ag-col-main{min-width:0;display:flex;flex-direction:column;gap:18px;}
.ag-col-side{display:flex;flex-direction:column;gap:16px;position:sticky;top:18px;}
@media(max-width:1180px){.ag-content{grid-template-columns:1fr;}.ag-col-side{position:static;}}

.ag-radar{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
@media(max-width:1100px){.ag-radar{grid-template-columns:repeat(2,1fr);}}
.ag-radar-card{background:#fff;border:1px solid var(--border);border-radius:14px;padding:14px 15px;position:relative;overflow:hidden;cursor:pointer;transition:.18s;}
.ag-radar-card:hover{border-color:#cdd4e0;transform:translateY(-1px);box-shadow:0 6px 18px rgba(27,42,78,.06);}
.ag-radar-card.urgent{border-color:rgba(239,68,68,.35);background:linear-gradient(135deg,#FFF5F5 0%,#fff 60%);}
.ag-radar-card.urgent::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--danger),#ff6464);}
.ag-radar-card.warn{border-color:rgba(245,158,11,.3);}
.ag-radar-card.warn::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:var(--warn);}
.ag-radar-label{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--text-mute);}
.ag-radar-card.urgent .ag-radar-label{color:var(--danger);}
.ag-radar-card.warn .ag-radar-label{color:var(--warn);}
.ag-radar-count{font-family:'Fraunces',serif;font-size:30px;font-weight:800;line-height:1;letter-spacing:-1px;margin-top:8px;}
.ag-radar-count small{font-size:14px;color:var(--text-mute);font-weight:500;}
.ag-radar-card.urgent .ag-radar-count{color:var(--danger);}
.ag-radar-desc{font-size:12px;color:var(--text-mute);margin-top:4px;line-height:1.4;}
.ag-radar-desc b{color:var(--text);font-weight:600;}
.ag-radar-tag{position:absolute;bottom:12px;right:12px;font-size:10px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.5px;}

.ag-cal-card{background:#fff;border:1px solid var(--border);border-radius:16px;overflow:hidden;}
.ag-cal-head{padding:16px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);gap:16px;flex-wrap:wrap;}
.ag-cal-nav{display:flex;align-items:center;gap:6px;}
.ag-cal-nav-btn{width:30px;height:30px;border-radius:8px;border:1px solid var(--border);background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text);transition:.15s;}
.ag-cal-nav-btn:hover{background:var(--bg);border-color:#cdd4e0;}
.ag-cal-month{font-family:'Fraunces',serif;font-size:20px;font-weight:700;letter-spacing:-.4px;min-width:170px;text-align:center;}
.ag-cal-month small{display:block;font-family:'Inter',sans-serif;font-size:10.5px;font-weight:600;color:var(--text-mute);text-transform:uppercase;letter-spacing:1px;margin-top:1px;}
.ag-cal-views{display:flex;background:var(--bg);border-radius:9px;padding:3px;border:1px solid var(--border-soft);}
.ag-cal-view{padding:6px 12px;font-size:12px;font-weight:600;border-radius:6px;cursor:pointer;color:var(--text-mute);transition:.15s;border:none;background:transparent;font-family:inherit;}
.ag-cal-view.active{background:#fff;color:var(--text);box-shadow:0 1px 3px rgba(27,42,78,.08);}
.ag-cal-legend{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-left:auto;}
.ag-legend-item{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:var(--text-mute);}
.ag-legend-dot{width:8px;height:8px;border-radius:2px;}

.ag-cal-weekdays{display:grid;grid-template-columns:repeat(7,1fr);background:#fafbfd;border-bottom:1px solid var(--border);}
.ag-cal-weekday{padding:9px 0;text-align:center;font-size:10.5px;font-weight:700;color:var(--text-mute);text-transform:uppercase;letter-spacing:1px;}
.ag-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);grid-auto-rows:minmax(108px,auto);}
.ag-cal-day{border-right:1px solid var(--border-soft);border-bottom:1px solid var(--border-soft);padding:7px 8px;position:relative;cursor:pointer;transition:.12s;display:flex;flex-direction:column;gap:3px;min-width:0;}
.ag-cal-day:hover{background:#fafbfd;}
.ag-cal-day:nth-child(7n){border-right:none;}
.ag-cal-day.other{background:#fafbfd;color:#cdd4e0;}
.ag-cal-day.today{background:linear-gradient(135deg,rgba(255,122,69,.07) 0%,rgba(255,148,102,.02) 100%);}
.ag-cal-day.today .ag-cal-num{background:var(--accent);color:#fff;box-shadow:0 2px 8px rgba(255,122,69,.4);}
.ag-cal-day.weekend{background:#fafbfd;}
.ag-cal-num{font-size:12.5px;font-weight:700;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;align-self:flex-start;letter-spacing:-.3px;}
.ag-cal-day.other .ag-cal-num{color:#cdd4e0;font-weight:500;}
.ag-cal-event{font-size:10.5px;padding:3px 6px;border-radius:4px;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3;cursor:pointer;transition:.15s;border-left:2px solid;}
.ag-cal-event:hover{transform:translateX(1px);filter:brightness(.97);}
.ag-cal-event.holiday{background:#F1F5F9;color:#64748B;border-color:var(--holiday);font-weight:500;font-style:italic;}
.ag-cal-event.meeting{background:#FFF1E8;color:#C2410C;border-color:var(--meeting);}
.ag-cal-event.eval{background:#FEF3C7;color:#92400E;border-color:var(--eval);}
.ag-cal-event.report{background:#D1FAE5;color:#065F46;border-color:var(--report);}
.ag-cal-event.plan{background:#DBEAFE;color:#1E40AF;border-color:var(--plan);}
.ag-cal-event.pcd{background:#EDE9FE;color:#5B21B6;border-color:var(--pcd);}
.ag-cal-event.personal{background:#FCE7F3;color:#9D174D;border-color:var(--personal);}
.ag-cal-event.urgent{box-shadow:0 0 0 2px rgba(239,68,68,.15);position:relative;}
.ag-cal-event.urgent::after{content:"";position:absolute;top:3px;right:4px;width:5px;height:5px;border-radius:50%;background:var(--danger);box-shadow:0 0 6px var(--danger);animation:agpulse 1.6s infinite;}
@keyframes agpulse{0%,100%{opacity:1}50%{opacity:.4}}
.ag-cal-day-flag{position:absolute;top:7px;right:7px;font-size:9px;font-weight:800;color:var(--accent);text-transform:uppercase;letter-spacing:.5px;}

.ag-sofia-card{background:linear-gradient(135deg,var(--primary) 0%,var(--primary-dark) 100%);border-radius:16px;padding:18px;color:#fff;position:relative;overflow:hidden;}
.ag-sofia-card::before{content:"";position:absolute;top:-30%;right:-20%;width:240px;height:240px;background:radial-gradient(circle,rgba(255,122,69,.28) 0%,transparent 65%);pointer-events:none;}
.ag-sofia-head{display:flex;align-items:center;gap:11px;position:relative;margin-bottom:13px;}
.ag-sofia-avatar{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--accent) 0%,var(--accent-warm) 100%);display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;font-size:15px;position:relative;box-shadow:0 4px 14px rgba(255,122,69,.5);}
.ag-sofia-avatar::after{content:"";position:absolute;bottom:-1px;right:-1px;width:11px;height:11px;border-radius:50%;background:var(--success);border:2px solid var(--primary-dark);box-shadow:0 0 8px var(--success);}
.ag-sofia-name{font-weight:700;font-size:14px;}
.ag-sofia-name small{display:block;font-size:10.5px;color:rgba(255,255,255,.55);font-weight:500;margin-top:1px;}
.ag-sofia-msg{position:relative;font-size:13px;line-height:1.55;color:rgba(255,255,255,.92);margin-bottom:14px;}
.ag-sofia-msg b{color:var(--accent-warm);font-weight:600;}
.ag-sofia-actions{display:flex;flex-direction:column;gap:7px;position:relative;}
.ag-sofia-action{display:flex;align-items:center;gap:9px;padding:9px 11px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px;cursor:pointer;transition:.18s;color:#fff;font-size:12.5px;font-weight:500;text-align:left;width:100%;font-family:inherit;}
.ag-sofia-action:hover{background:rgba(255,122,69,.15);border-color:rgba(255,122,69,.35);}
.ag-sofia-action-ic{width:26px;height:26px;border-radius:7px;background:rgba(255,122,69,.18);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.ag-sofia-action b{display:block;font-weight:600;font-size:12.5px;}
.ag-sofia-action small{font-size:10.5px;color:rgba(255,255,255,.55);font-weight:500;}
.ag-sofia-arrow{margin-left:auto;color:rgba(255,255,255,.35);font-size:14px;}

.ag-stat-card{background:linear-gradient(135deg,#fff 0%,var(--accent-soft) 100%);border:1px solid rgba(255,122,69,.2);border-radius:14px;padding:14px 16px;}
.ag-stat-head{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--accent);margin-bottom:6px;}
.ag-stat-big{font-family:'Fraunces',serif;font-size:26px;font-weight:800;line-height:1;letter-spacing:-.7px;color:var(--text);}
.ag-stat-big small{font-size:13px;color:var(--text-mute);font-weight:500;margin-left:4px;}
.ag-stat-desc{font-size:11.5px;color:var(--text-mute);margin-top:6px;line-height:1.45;}
.ag-stat-desc b{color:var(--text);font-weight:600;}

.ag-up-card{background:#fff;border:1px solid var(--border);border-radius:14px;padding:0;overflow:hidden;}
.ag-up-head{padding:14px 16px 10px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border-soft);}
.ag-up-title{font-family:'Fraunces',serif;font-size:15px;font-weight:700;letter-spacing:-.3px;color:var(--text);}
.ag-up-link{font-size:11px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:.5px;cursor:pointer;}
.ag-up-list{padding:6px 0;}
.ag-up-item{padding:11px 16px;display:flex;gap:11px;cursor:pointer;transition:.12s;border-left:3px solid transparent;}
.ag-up-item:hover{background:#fafbfd;border-left-color:var(--accent);}
.ag-up-day{flex-shrink:0;width:42px;text-align:center;padding-top:1px;}
.ag-up-day-num{font-family:'Fraunces',serif;font-size:18px;font-weight:800;line-height:1;letter-spacing:-.5px;color:var(--text);}
.ag-up-day-mo{font-size:9.5px;font-weight:700;color:var(--text-mute);text-transform:uppercase;letter-spacing:1px;margin-top:2px;}
.ag-up-body{flex:1;min-width:0;}
.ag-up-tag{display:inline-block;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;padding:1px 6px;border-radius:4px;margin-bottom:3px;}
.ag-up-tag.eval{background:#FEF3C7;color:#92400E;}
.ag-up-tag.report{background:#D1FAE5;color:#065F46;}
.ag-up-tag.meeting{background:#FFF1E8;color:#C2410C;}
.ag-up-tag.pcd{background:#EDE9FE;color:#5B21B6;}
.ag-up-name{font-size:13px;font-weight:600;line-height:1.35;color:var(--text);}
.ag-up-meta{font-size:11px;color:var(--text-mute);margin-top:3px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.ag-up-meta .mdot{width:3px;height:3px;border-radius:50%;background:#cdd4e0;}
.ag-up-prep{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;color:var(--success);margin-top:5px;background:rgba(16,185,129,.08);padding:2px 6px;border-radius:4px;border:1px solid rgba(16,185,129,.18);}
.ag-up-prep.pending{color:var(--warn);background:rgba(245,158,11,.08);border-color:rgba(245,158,11,.2);}

.ag-cal-day{cursor:pointer;}
.ag-drag-hint{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:11px;background:linear-gradient(135deg,var(--primary) 0%,var(--primary-dark) 100%);color:#fff;font-size:12.5px;font-weight:600;letter-spacing:.1px;box-shadow:0 6px 16px rgba(15,27,54,.18);border:1px solid rgba(255,255,255,.06);}
.ag-drag-hint-ic{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;background:rgba(255,122,69,.22);color:var(--accent-warm);font-weight:800;font-size:13px;}
.ag-overlay{position:fixed;inset:0;background:rgba(15,27,54,.45);backdrop-filter:blur(2px);z-index:80;display:flex;justify-content:flex-end;}
.ag-panel{width:420px;max-width:100%;background:#fff;height:100%;box-shadow:-8px 0 24px rgba(15,27,54,.18);display:flex;flex-direction:column;animation:agpanel .2s ease-out;}
@keyframes agpanel{from{transform:translateX(20px);opacity:.6}to{transform:none;opacity:1}}
.ag-panel-head{padding:18px 20px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
.ag-panel-title{font-family:'Fraunces',serif;font-size:20px;font-weight:800;letter-spacing:-.4px;color:var(--text);}
.ag-panel-sub{font-size:12px;color:var(--text-mute);margin-top:2px;}
.ag-panel-close{width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-mute);}
.ag-panel-close:hover{background:var(--bg);color:var(--text);}
.ag-panel-body{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:14px;}
.ag-panel-section-title{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--text-mute);}
.ag-panel-event{border:1px solid var(--border);border-radius:10px;padding:10px 12px;display:flex;align-items:flex-start;gap:10px;}
.ag-panel-event .ev-dot{width:8px;height:8px;border-radius:50%;margin-top:6px;flex-shrink:0;}
.ag-panel-event .ev-body{flex:1;min-width:0;}
.ag-panel-event .ev-title{font-weight:600;font-size:13px;color:var(--text);}
.ag-panel-event .ev-meta{font-size:11.5px;color:var(--text-mute);margin-top:2px;display:flex;gap:8px;flex-wrap:wrap;}
.ag-panel-event .ev-actions{display:flex;gap:4px;}
.ag-icon-btn{width:28px;height:28px;border-radius:7px;border:1px solid var(--border);background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-mute);}
.ag-icon-btn:hover{background:var(--bg);color:var(--text);}
.ag-icon-btn.danger:hover{color:var(--danger);border-color:rgba(239,68,68,.3);}
.ag-empty{font-size:12.5px;color:var(--text-mute);padding:14px;border:1px dashed var(--border);border-radius:10px;text-align:center;}
.ag-form{display:flex;flex-direction:column;gap:10px;background:#FAFBFD;border:1px solid var(--border);border-radius:12px;padding:14px;}
.ag-form label{font-size:11.5px;font-weight:600;color:var(--text-mute);display:flex;flex-direction:column;gap:5px;}
.ag-form input,.ag-form select,.ag-form textarea{font-family:inherit;font-size:13px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:#fff;color:var(--text);outline:none;}
.ag-form input:focus,.ag-form select:focus,.ag-form textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(255,122,69,.15);}
.ag-form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.ag-panel-foot{display:flex;gap:8px;justify-content:flex-end;padding:14px 20px;border-top:1px solid var(--border);background:#fff;}
`;

type Ev = { type: "holiday" | "meeting" | "eval" | "report" | "plan" | "pcd"; t: string; urgent?: boolean };
type Day = { n: number; date: string; other?: boolean; weekend?: boolean; today?: boolean; events?: Ev[] };

const MONTHS_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function AgendaSofiaSide() {
  const ctx = useSofiaContext();
  const sofia = useSofia();
  const mes = MONTHS_PT[new Date().getMonth()].toLowerCase();
  const eventos = ctx.dataState.eventos_agenda_mes;
  const horas = ctx.user.horas_economizadas_mes;
  return (
    <>
      <div className="ag-sofia-card">
        <div className="ag-sofia-head">
          <div className="ag-sofia-avatar">S</div>
          <div className="ag-sofia-name">Sofia <small>Sua assistente · online</small></div>
        </div>
        {eventos === 0 ? (
          <>
            <div className="ag-sofia-msg">
              Sua agenda de <b>{mes}</b> tá em branco. Posso já preencher os marcos do mês: reunião pedagógica, fechamento do bimestre, conselho de classe e feriados. 30 segundos.
            </div>
            <div className="ag-sofia-actions">
              <button className="ag-sofia-action" onClick={() => sofia.openSofia({ prompt: `Preencha minha agenda de ${mes} com os marcos típicos do bimestre brasileiro.`, send: false })}>
                <span className="ag-sofia-action-ic"><Sparkles size={13} color="#FF7A45" /></span>
                <b>Preencher agenda de {mes}</b>
              </button>
              <button className="ag-sofia-action" onClick={() => sofia.openSofia({ prompt: "Como importar o calendário escolar?", send: false })}>
                <span className="ag-sofia-action-ic">📅</span>
                <b>Importar do calendário da escola</b>
              </button>
            </div>
          </>
        ) : (
          <div className="ag-sofia-msg">
            Você tem <b>{eventos}</b> evento(s) este mês. Quer que eu destaque os que precisam de preparação?
          </div>
        )}
      </div>
      <div className="ag-stat-card">
        <div className="ag-stat-head"><Clock size={11} style={{ display: "inline", marginRight: 4 }} />Você esta semana</div>
        {horas > 0 || eventos >= 1 ? (
          <>
            <div className="ag-stat-big">{horas}h <small>economizadas</small></div>
            <div className="ag-stat-desc">Tempo devolvido a você este mês com a Sofia.</div>
          </>
        ) : (
          <>
            <div className="ag-stat-big">~2h <small>economizáveis</small></div>
            <div className="ag-stat-desc" title="Potencial baseado em professoras com perfil parecido">Potencial estimado para esta semana.</div>
          </>
        )}
      </div>
    </>
  );
}

function buildMonthGrid(year: number, month: number, todayKey: string): Day[] {
  // month: 0-11. Semana começa no domingo.
  const first = new Date(year, month, 1);
  const startDow = first.getDay(); // 0 = domingo
  const start = new Date(year, month, 1 - startDow);
  const days: Day[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dow = d.getDay();
    days.push({
      n: d.getDate(),
      date: key,
      other: d.getMonth() !== month,
      weekend: dow === 0 || dow === 6,
      today: key === todayKey,
    });
  }
  return days;
}

function buildWeekGrid(ref: Date, todayKey: string): Day[] {
  const start = new Date(ref);
  start.setDate(ref.getDate() - ref.getDay()); // domingo
  const days: Day[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dow = d.getDay();
    days.push({ n: d.getDate(), date: key, weekend: dow === 0 || dow === 6, today: key === todayKey });
  }
  return days;
}

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type ViewMode = "dia" | "semana" | "mes" | "ano";

type EventType = "meeting" | "eval" | "report" | "plan" | "pcd" | "personal";
type Event = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  time?: string;
  type: EventType;
  notes?: string;
};

const TYPE_LABEL: Record<EventType, string> = {
  meeting: "Reunião",
  eval: "Avaliação",
  report: "Entrega",
  plan: "Planejamento",
  pcd: "Inclusão",
  personal: "Pessoal",
};
const TYPE_COLOR: Record<EventType, string> = {
  meeting: "var(--meeting)",
  eval: "var(--eval)",
  report: "var(--report)",
  plan: "var(--plan)",
  pcd: "var(--pcd)",
  personal: "var(--personal)",
};

const TYPE_SUGGESTIONS: Record<EventType, string[]> = {
  meeting: [
    "Pauta: rendimento da turma, ocorrências, próximos passos.",
    "Levar boletim parcial e exemplos de produções dos alunos.",
    "Reservar 10min finais para dúvidas das famílias.",
  ],
  eval: [
    "Conteúdo: revisar objetivos da BNCC trabalhados no bimestre.",
    "Material: prova impressa, gabarito e folha de respostas.",
    "Adaptações para alunos PCD (tempo extra, leitura assistida).",
  ],
  report: [
    "Conferir pareceres pendentes antes da entrega.",
    "Anexar evidências (atividades, registros) ao relatório.",
    "Validar prazos com a coordenação.",
  ],
  plan: [
    "Tema da semana e habilidades BNCC envolvidas.",
    "Sequência didática: abertura, desenvolvimento, fechamento.",
    "Recursos necessários e avaliação prevista.",
  ],
  pcd: [
    "Revisar PEI do aluno e metas do bimestre.",
    "Combinar adaptações com a equipe (AEE, família).",
    "Registrar avanços e pontos de atenção.",
  ],
  personal: [
    "Compromisso pessoal — lembrar de avisar a escola se conflitar.",
    "Reservar tempo de deslocamento.",
    "Adicionar lembrete 1h antes.",
  ],
};

function SuggestionsButton({ type, onPick }: { type: EventType; onPick: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const items = TYPE_SUGGESTIONS[type] || [];
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="ag-btn"
        style={{ padding: "6px 10px", fontSize: 12 }}
        onClick={() => setOpen((v) => !v)}
      >
        <Sparkles size={13} /> Sugestões para {TYPE_LABEL[type].toLowerCase()}
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 10,
          background: "#fff", border: "1px solid var(--border)", borderRadius: 10,
          boxShadow: "0 12px 28px rgba(15,27,54,.12)", padding: 6, display: "flex", flexDirection: "column", gap: 2,
        }}>
          {items.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { onPick(s); setOpen(false); }}
              style={{
                textAlign: "left", padding: "8px 10px", fontSize: 12.5, lineHeight: 1.4,
                background: "transparent", border: "none", borderRadius: 7, cursor: "pointer",
                color: "var(--text)", fontFamily: "inherit",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Agenda() {
  const today = brNow();
  const todayKey = dateKey(today);
  const [nowTick, setNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const nowHHMM = useMemo(() => {
    const n = brNow();
    void nowTick;
    return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
  }, [nowTick]);
  const [view, setView] = useState<ViewMode>("mes");
  const [cursor, setCursor] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [events, setEvents] = usePersistentState<Event[]>("agenda_events", []);
  const [openDate, setOpenDate] = useState<string | null>(null);
  const ALL_TYPES: EventType[] = ["meeting", "eval", "report", "plan", "pcd", "personal"];
  const [typeFilter, setTypeFilter] = useState<EventType[]>(ALL_TYPES);
  const [filterOpen, setFilterOpen] = useState(false);
  const filteredEvents = useMemo(
    () => events.filter((e) => typeFilter.includes(e.type)),
    [events, typeFilter]
  );
  const toggleType = (t: EventType) =>
    setTypeFilter((arr) => (arr.includes(t) ? arr.filter((x) => x !== t) : [...arr, t]));
  const [editing, setEditing] = useState<Event | null>(null);
  const [draft, setDraft] = useState<{ title: string; time: string; type: EventType; notes: string }>({
    title: "", time: "", type: "meeting", notes: "",
  });

  const eventsByDate = useMemo(() => {
    const m = new Map<string, Event[]>();
    for (const e of filteredEvents) {
      const arr = m.get(e.date) || [];
      arr.push(e);
      m.set(e.date, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    return m;
  }, [filteredEvents]);

  const openDayPanel = (key: string) => {
    setOpenDate(key);
    setEditing(null);
    setDraft({ title: "", time: "", type: "meeting", notes: "" });
  };
  const closePanel = () => { setOpenDate(null); setEditing(null); };
  const startEdit = (ev: Event) => {
    setEditing(ev);
    setDraft({ title: ev.title, time: ev.time || "", type: ev.type, notes: ev.notes || "" });
  };
  const cancelEdit = () => {
    setEditing(null);
    setDraft({ title: "", time: "", type: "meeting", notes: "" });
  };
  const saveDraft = () => {
    if (!openDate || !draft.title.trim()) return;
    if (editing) {
      setEvents((arr) => arr.map((e) => e.id === editing.id ? { ...e, ...draft, title: draft.title.trim() } : e));
    } else {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setEvents((arr) => [...arr, { id, date: openDate, ...draft, title: draft.title.trim() }]);
    }
    cancelEdit();
  };
  const deleteEvent = (id: string) => setEvents((arr) => arr.filter((e) => e.id !== id));

  // Drag and drop: arrastar evento para outro dia
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const onDragStartEvent = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", id); } catch { /* noop */ }
  };
  const onDragOverDay = (e: React.DragEvent) => {
    if (draggedId) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }
  };
  const onDropDay = (e: React.DragEvent, targetDate: string) => {
    if (!draggedId) return;
    e.preventDefault();
    setEvents((arr) => arr.map((ev) => ev.id === draggedId ? { ...ev, date: targetDate } : ev));
    setDraggedId(null);
  };

  const tomorrowKey = useMemo(() => {
    const t = new Date(today);
    t.setDate(t.getDate() + 1);
    return dateKey(t);
  }, [today]);
  const weekRange = useMemo(() => {
    const start = new Date(today); start.setDate(today.getDate() - today.getDay());
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return { start: dateKey(start), end: dateKey(end) };
  }, [today]);

  const counts = useMemo(() => {
    const todayCount = filteredEvents.filter((e) => e.date === todayKey).length;
    const tomorrowCount = filteredEvents.filter((e) => e.date === tomorrowKey).length;
    const weekCount = filteredEvents.filter((e) => e.date >= weekRange.start && e.date <= weekRange.end).length;
    const deadlinesCount = filteredEvents.filter(
      (e) => e.date >= todayKey && (e.type === "report" || e.type === "eval")
    ).length;
    const nextDeadline = filteredEvents
      .filter((e) => e.date >= todayKey && (e.type === "report" || e.type === "eval"))
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    return { todayCount, tomorrowCount, weekCount, deadlinesCount, nextDeadline };
  }, [filteredEvents, todayKey, tomorrowKey, weekRange]);

  // Próximos compromissos: ordenados por data+hora, removendo os que já passaram.
  const upcoming = useMemo(() => {
    return filteredEvents
      .filter((e) => {
        if (e.date > todayKey) return true;
        if (e.date < todayKey) return false;
        if (!e.time) return true; // sem horário, conta o dia inteiro
        return e.time >= nowHHMM;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.time || "99:99").localeCompare(b.time || "99:99");
      });
  }, [filteredEvents, todayKey, nowHHMM]);

  const formatShortBR = (key: string) => {
    const [, m, d] = key.split("-");
    return `${d}/${m}`;
  };

  const holidays = useMemo(() => holidayMap(cursor.getFullYear()), [cursor]);
  const panelHolidays = useMemo(
    () => openDate ? holidayMap(Number(openDate.slice(0, 4))) : null,
    [openDate]
  );

  const dayEvents = openDate ? (eventsByDate.get(openDate) || []) : [];
  const openDateLabel = openDate ? (() => {
    const [y, m, d] = openDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return `${["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"][dt.getDay()]}, ${d} de ${MONTHS_PT[m - 1]} ${y}`;
  })() : "";
  const openDateHoliday = openDate && panelHolidays ? panelHolidays.get(openDate) : undefined;

  // Atalhos de teclado no modal do dia: ←/→ navega, Esc fecha.
  useEffect(() => {
    if (!openDate) return;
    const shiftDay = (delta: number) => {
      const [y, m, d] = openDate.split("-").map(Number);
      const dt = new Date(y, m - 1, d + delta);
      const p = (n: number) => String(n).padStart(2, "0");
      setOpenDate(`${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`);
      cancelEdit();
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable);
      if (e.key === "Escape") { e.preventDefault(); closePanel(); return; }
      if (typing) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); shiftDay(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); shiftDay(1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openDate]);

  const shift = (dir: 1 | -1) => {
    const d = new Date(cursor);
    if (view === "dia") d.setDate(d.getDate() + dir);
    else if (view === "semana") d.setDate(d.getDate() + 7 * dir);
    else if (view === "mes") d.setMonth(d.getMonth() + dir);
    else d.setFullYear(d.getFullYear() + dir);
    setCursor(d);
  };
  const goToday = () => setCursor(new Date(today.getFullYear(), today.getMonth(), today.getDate()));

  const headerLabel = useMemo(() => {
    if (view === "dia") {
      return `${String(cursor.getDate()).padStart(2, "0")} de ${MONTHS_PT[cursor.getMonth()]} ${cursor.getFullYear()}`;
    }
    if (view === "semana") {
      const start = new Date(cursor); start.setDate(cursor.getDate() - cursor.getDay());
      const end = new Date(start); end.setDate(start.getDate() + 6);
      return `${String(start.getDate()).padStart(2, "0")} ${MONTHS_PT[start.getMonth()].slice(0,3)} – ${String(end.getDate()).padStart(2, "0")} ${MONTHS_PT[end.getMonth()].slice(0,3)} ${end.getFullYear()}`;
    }
    if (view === "mes") return `${MONTHS_PT[cursor.getMonth()]} ${cursor.getFullYear()}`;
    return `${cursor.getFullYear()}`;
  }, [view, cursor]);

  const monthDays = useMemo(
    () => buildMonthGrid(cursor.getFullYear(), cursor.getMonth(), todayKey),
    [cursor, todayKey]
  );
  const weekDays = useMemo(() => buildWeekGrid(cursor, todayKey), [cursor, todayKey]);
  const dayKey = dateKey(cursor);
  const dayHoliday = holidays.get(dayKey);

  return (
    <div className="ag-root">
      <style>{sidebarCss}</style>
      <style>{css}</style>
      <div className="ag-app">
        <AppSidebar active="agenda" />
        <main className="ag-main">
          <AppHeader
            breadcrumb={[{ label: "Sua sala" }, { label: "Agenda" }, { label: headerLabel }]}
            actions={
              <>
                <div style={{ position: "relative" }}>
                  <button
                    className="ag-btn"
                    onClick={() => setFilterOpen((v) => !v)}
                    aria-expanded={filterOpen}
                  >
                    <Filter size={14} /> Filtrar
                    {typeFilter.length < ALL_TYPES.length && (
                      <span style={{
                        marginLeft: 6, background: "var(--primary, #2563eb)", color: "#fff",
                        borderRadius: 999, padding: "0 6px", fontSize: 11, lineHeight: "16px",
                      }}>{typeFilter.length}</span>
                    )}
                  </button>
                  {filterOpen && (
                    <>
                      <div
                        onClick={() => setFilterOpen(false)}
                        style={{ position: "fixed", inset: 0, zIndex: 70 }}
                      />
                      <div style={{
                        position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 71,
                        background: "#fff", border: "1px solid rgba(15,27,54,.12)",
                        borderRadius: 10, boxShadow: "0 10px 28px rgba(15,27,54,.14)",
                        padding: 10, minWidth: 200,
                      }}>
                        <div style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          marginBottom: 8, fontSize: 12, color: "#5b6478", fontWeight: 600,
                        }}>
                          <span>Tipos de evento</span>
                          <button
                            className="ag-btn"
                            style={{ padding: "2px 8px", fontSize: 11 }}
                            onClick={() => setTypeFilter(
                              typeFilter.length === ALL_TYPES.length ? [] : ALL_TYPES
                            )}
                          >
                            {typeFilter.length === ALL_TYPES.length ? "Limpar" : "Todos"}
                          </button>
                        </div>
                        {ALL_TYPES.map((t) => (
                          <label
                            key={t}
                            style={{
                              display: "flex", alignItems: "center", gap: 8,
                              padding: "6px 4px", cursor: "pointer", fontSize: 13,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={typeFilter.includes(t)}
                              onChange={() => toggleType(t)}
                            />
                            <span style={{
                              width: 10, height: 10, borderRadius: 3,
                              background: TYPE_COLOR[t], display: "inline-block",
                            }} />
                            {TYPE_LABEL[t]}
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <button className="ag-btn primary" onClick={() => openDayPanel(todayKey)}><Plus size={14} /> Novo evento</button>
              </>
            }
          />
          <div style={{ padding: "16px 32px 0" }}>
            <h1 className="ag-title" style={{ margin: 0 }}>Agenda · Radar pedagógico</h1>
            <div className="ag-meta">
              <span><b>{counts.weekCount} {counts.weekCount === 1 ? "evento" : "eventos"}</b> esta semana</span>
            </div>
          </div>

          <div className="ag-content">
            <div className="ag-col-main">
              <div className="ag-radar">
                <div className="ag-radar-card" onClick={() => openDayPanel(todayKey)}>
                  <span className="ag-radar-label">Hoje</span>
                  <div className="ag-radar-count">{counts.todayCount}</div>
                  <div className="ag-radar-desc">
                    {counts.todayCount === 0
                      ? "Nenhum evento cadastrado para hoje."
                      : `${counts.todayCount} ${counts.todayCount === 1 ? "evento" : "eventos"} hoje.`}
                  </div>
                </div>
                <div className="ag-radar-card" onClick={() => openDayPanel(tomorrowKey)}>
                  <span className="ag-radar-label">Amanhã</span>
                  <div className="ag-radar-count">{counts.tomorrowCount}</div>
                  <div className="ag-radar-desc">
                    {counts.tomorrowCount === 0
                      ? "Sem compromissos previstos."
                      : `${counts.tomorrowCount} ${counts.tomorrowCount === 1 ? "evento" : "eventos"} amanhã.`}
                  </div>
                </div>
                <div className="ag-radar-card" onClick={() => setView("semana")}>
                  <span className="ag-radar-label">Esta semana</span>
                  <div className="ag-radar-count">{counts.weekCount} <small>eventos</small></div>
                  <div className="ag-radar-desc">
                    {counts.weekCount === 0 ? "Cadastre eventos para visualizar aqui." : "Domingo a sábado."}
                  </div>
                </div>
                <div className="ag-radar-card" onClick={() => counts.nextDeadline && openDayPanel(counts.nextDeadline.date)}>
                  <span className="ag-radar-label">Próximos prazos</span>
                  <div className="ag-radar-count">{counts.deadlinesCount}</div>
                  <div className="ag-radar-desc">
                    {counts.nextDeadline
                      ? <><b>{counts.nextDeadline.title}</b><br />{formatShortBR(counts.nextDeadline.date)}</>
                      : "Nenhum prazo próximo."}
                  </div>
                </div>
              </div>

              <div className="ag-drag-hint" role="note">
                <span className="ag-drag-hint-ic">↔</span>
                Evento mudou? Arraste!
              </div>
              <div className="ag-cal-card">
                <div className="ag-cal-head">
                  <div className="ag-cal-nav">
                    <button className="ag-cal-nav-btn" aria-label="Anterior" onClick={() => shift(-1)}><ChevronLeft size={14} /></button>
                    <div className="ag-cal-month">{headerLabel}</div>
                    <button className="ag-cal-nav-btn" aria-label="Próximo" onClick={() => shift(1)}><ChevronRight size={14} /></button>
                    <button className="ag-btn" style={{ padding: "5px 10px", fontSize: 11.5, marginLeft: 4 }} onClick={goToday}>Hoje</button>
                  </div>
                  <div className="ag-cal-views">
                    <button className={"ag-cal-view" + (view === "dia" ? " active" : "")} onClick={() => setView("dia")}>Dia</button>
                    <button className={"ag-cal-view" + (view === "semana" ? " active" : "")} onClick={() => setView("semana")}>Semana</button>
                    <button className={"ag-cal-view" + (view === "mes" ? " active" : "")} onClick={() => setView("mes")}>Mês</button>
                    <button className={"ag-cal-view" + (view === "ano" ? " active" : "")} onClick={() => setView("ano")}>Ano</button>
                  </div>
                  <div className="ag-cal-legend">
                    <span className="ag-legend-item"><span className="ag-legend-dot" style={{ background: "var(--meeting)" }} />Reunião</span>
                    <span className="ag-legend-item"><span className="ag-legend-dot" style={{ background: "var(--eval)" }} />Avaliação</span>
                    <span className="ag-legend-item"><span className="ag-legend-dot" style={{ background: "var(--report)" }} />Entrega</span>
                    <span className="ag-legend-item"><span className="ag-legend-dot" style={{ background: "var(--plan)" }} />Planejamento</span>
                    <span className="ag-legend-item"><span className="ag-legend-dot" style={{ background: "var(--pcd)" }} />Inclusão</span>
                    <span className="ag-legend-item"><span className="ag-legend-dot" style={{ background: "var(--personal)" }} />Pessoal</span>
                    <span className="ag-legend-item"><span className="ag-legend-dot" style={{ background: "var(--holiday)" }} />Feriado</span>
                  </div>
                </div>

                {(view === "mes" || view === "semana") && (
                  <div className="ag-cal-weekdays">
                    {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((d) => <div key={d} className="ag-cal-weekday">{d}</div>)}
                  </div>
                )}

                {view === "mes" && (
                  <div className="ag-cal-grid">
                    {monthDays.map((d, i) => {
                      const holiday = holidays.get(d.date);
                      const evs = eventsByDate.get(d.date) || [];
                      return (
                        <div
                          key={i}
                          className={"ag-cal-day" + (d.other ? " other" : "") + (d.weekend ? " weekend" : "") + (d.today ? " today" : "")}
                          onClick={() => openDayPanel(d.date)}
                          onDragOver={onDragOverDay}
                          onDrop={(e) => onDropDay(e, d.date)}
                        >
                          <span className="ag-cal-num">{d.n}</span>
                          {d.today && <span className="ag-cal-day-flag">Hoje</span>}
                          {holiday && !d.other && (
                            <div className="ag-cal-event holiday" title={holiday}>{holiday}</div>
                          )}
                          {!d.other && evs.slice(0, 3).map((e) => (
                            <div
                              key={e.id}
                              className={"ag-cal-event " + e.type}
                              title={e.title}
                              draggable
                              onDragStart={(ev) => { ev.stopPropagation(); onDragStartEvent(ev, e.id); }}
                              onClick={(ev) => { ev.stopPropagation(); openDayPanel(d.date); }}
                            >
                              {e.time ? `${e.time} · ` : ""}{e.title}
                            </div>
                          ))}
                          {!d.other && evs.length > 3 && (
                            <div style={{ fontSize: 10.5, color: "var(--text-mute)", fontWeight: 600 }}>+{evs.length - 3} mais</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {view === "semana" && (
                  <div className="ag-cal-grid" style={{ gridAutoRows: "minmax(180px,auto)" }}>
                    {weekDays.map((d, i) => {
                      const holiday = holidays.get(d.date);
                      const evs = eventsByDate.get(d.date) || [];
                      return (
                        <div
                          key={i}
                          className={"ag-cal-day" + (d.weekend ? " weekend" : "") + (d.today ? " today" : "")}
                          onClick={() => openDayPanel(d.date)}
                          onDragOver={onDragOverDay}
                          onDrop={(e) => onDropDay(e, d.date)}
                        >
                          <span className="ag-cal-num">{d.n}</span>
                          {d.today && <span className="ag-cal-day-flag">Hoje</span>}
                          {holiday && (
                            <div className="ag-cal-event holiday" title={holiday}>{holiday}</div>
                          )}
                          {evs.map((e) => (
                            <div
                              key={e.id}
                              className={"ag-cal-event " + e.type}
                              title={e.title}
                              draggable
                              onDragStart={(ev) => { ev.stopPropagation(); onDragStartEvent(ev, e.id); }}
                              onClick={(ev) => { ev.stopPropagation(); openDayPanel(d.date); }}
                            >
                              {e.time ? `${e.time} · ` : ""}{e.title}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}

                {view === "dia" && (
                  <div style={{ padding: 24 }}>
                    <div style={{ fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                      {["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"][cursor.getDay()]}, {cursor.getDate()} de {MONTHS_PT[cursor.getMonth()]}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-mute)", marginBottom: 16 }}>
                      {dayKey === todayKey ? "Hoje" : ""}
                    </div>
                    {dayHoliday && (
                      <div className="ag-cal-event holiday" style={{ display: "inline-block", marginBottom: 12 }}>
                        Feriado nacional · {dayHoliday}
                      </div>
                    )}
                    {(eventsByDate.get(dayKey) || []).length === 0 ? (
                      <div style={{ fontSize: 13, color: "var(--text-mute)", marginBottom: 12 }}>
                        Nenhum evento cadastrado para este dia.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                        {(eventsByDate.get(dayKey) || []).map((e) => (
                          <div key={e.id} className={"ag-cal-event " + e.type} style={{ fontSize: 13, padding: "8px 12px" }}>
                            {e.time ? `${e.time} · ` : ""}{e.title}
                          </div>
                        ))}
                      </div>
                    )}
                    <button className="ag-btn primary" onClick={() => openDayPanel(dayKey)}>
                      <Plus size={14} /> Gerenciar eventos do dia
                    </button>
                  </div>
                )}

                {view === "ano" && (
                  <div style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                    {MONTHS_PT.map((mn, mi) => {
                      const mDays = buildMonthGrid(cursor.getFullYear(), mi, todayKey);
                      return (
                        <button
                          key={mi}
                          onClick={() => { setCursor(new Date(cursor.getFullYear(), mi, 1)); setView("mes"); }}
                          style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 10, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                        >
                          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{mn}</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, fontSize: 10, color: "var(--text-mute)" }}>
                            {["D","S","T","Q","Q","S","S"].map((w, wi) => (
                              <div key={"w"+wi} style={{ textAlign: "center", fontWeight: 700 }}>{w}</div>
                            ))}
                            {mDays.map((d, di) => {
                              const isHol = holidays.has(d.date) && !d.other;
                              return (
                                <div key={di} style={{
                                  textAlign: "center", padding: "2px 0", borderRadius: 4,
                                  color: d.other ? "#cdd4e0" : isHol ? "#C2410C" : "var(--text)",
                                  background: d.today ? "var(--accent)" : isHol ? "#FFF1E8" : "transparent",
                                  fontWeight: d.today ? 700 : 500,
                                }}>
                                  {d.n}
                                </div>
                              );
                            })}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="ag-col-side">
              <AgendaSofiaSide />

              <div className="ag-up-card">
                <div className="ag-up-head">
                  <div className="ag-up-title">Próximos compromissos</div>
                  {upcoming.length > 8 && (
                    <button
                      type="button"
                      className="ag-up-link"
                      style={{ background: "transparent", border: 0, padding: 0, font: "inherit" }}
                      onClick={() => setShowAllUpcoming(true)}
                    >
                      Ver todos ({upcoming.length})
                    </button>
                  )}
                </div>
                <div className="ag-up-list">
                  {upcoming.length === 0 ? (
                    <div style={{ padding: "14px 16px", fontSize: 12.5, color: "var(--text-mute)" }}>
                      Nenhum compromisso futuro.
                    </div>
                  ) : (
                    upcoming.slice(0, 8).map((ev) => {
                      const [, mm, dd] = ev.date.split("-");
                      return (
                        <div key={ev.id} className="ag-up-item" onClick={() => openDayPanel(ev.date)}>
                          <div className="ag-up-day">
                            <div className="ag-up-day-num">{dd}</div>
                            <div className="ag-up-day-mo">{MONTHS_PT[Number(mm) - 1].slice(0, 3)}</div>
                          </div>
                          <div className="ag-up-body">
                            <span
                              className="ag-up-tag"
                              style={{ background: "color-mix(in oklab, " + TYPE_COLOR[ev.type] + " 18%, white)", color: TYPE_COLOR[ev.type] }}
                            >
                              {TYPE_LABEL[ev.type]}
                            </span>
                            <div className="ag-up-name">{ev.title}</div>
                            {ev.time && (
                              <div className="ag-up-meta">
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                  <Clock size={11} /> {ev.time}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
        {openDate && (
          <div className="ag-overlay" onClick={closePanel}>
            <div className="ag-panel" onClick={(e) => e.stopPropagation()}>
              <div className="ag-panel-head">
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                  <button
                    className="ag-panel-close"
                    aria-label="Dia anterior"
                    onClick={() => {
                      const [y, m, d] = openDate!.split("-").map(Number);
                      const dt = new Date(y, m - 1, d - 1);
                      const p = (n: number) => String(n).padStart(2, "0");
                      setOpenDate(`${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`);
                      cancelEdit();
                    }}
                  ><ChevronLeft size={16} /></button>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="ag-panel-title">{openDateLabel}</div>
                    <div className="ag-panel-sub">
                      {openDate === todayKey ? "Hoje" : ""}
                      {openDateHoliday ? (openDate === todayKey ? " · " : "") + "Feriado · " + openDateHoliday : ""}
                    </div>
                  </div>
                  <button
                    className="ag-panel-close"
                    aria-label="Próximo dia"
                    onClick={() => {
                      const [y, m, d] = openDate!.split("-").map(Number);
                      const dt = new Date(y, m - 1, d + 1);
                      const p = (n: number) => String(n).padStart(2, "0");
                      setOpenDate(`${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`);
                      cancelEdit();
                    }}
                  ><ChevronRight size={16} /></button>
                </div>
                <button className="ag-panel-close" onClick={closePanel} aria-label="Fechar"><X size={16} /></button>
              </div>
              <div className="ag-panel-body">
                <div className="ag-panel-section-title">Eventos do dia</div>
                {dayEvents.length === 0 ? (
                  <div className="ag-empty">Nenhum evento cadastrado.</div>
                ) : (
                  dayEvents.map((e) => (
                    <div key={e.id} className="ag-panel-event">
                      <span className="ev-dot" style={{ background: TYPE_COLOR[e.type] }} />
                      <div className="ev-body">
                        <div className="ev-title">{e.title}</div>
                        <div className="ev-meta">
                          <span>{TYPE_LABEL[e.type]}</span>
                          {e.time && <span>· {e.time}</span>}
                        </div>
                        {e.notes && <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 4 }}>{e.notes}</div>}
                      </div>
                      <div className="ev-actions">
                        <button className="ag-icon-btn" onClick={() => startEdit(e)} aria-label="Editar"><Pencil size={13} /></button>
                        <button className="ag-icon-btn danger" onClick={() => deleteEvent(e.id)} aria-label="Excluir"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))
                )}

                <div className="ag-panel-section-title" style={{ marginTop: 6 }}>
                  {editing ? "Editar evento" : "Adicionar evento"}
                </div>
                <div className="ag-form">
                  <label>
                    Título
                    <input
                      type="text"
                      autoFocus
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                      placeholder="Ex.: Reunião de pais 5ºA"
                    />
                  </label>
                  <div className="ag-form-row">
                    <label>
                      Tipo
                      <select
                        value={draft.type}
                        onChange={(e) => setDraft({ ...draft, type: e.target.value as EventType })}
                      >
                        <option value="meeting">Reunião</option>
                        <option value="eval">Avaliação</option>
                        <option value="report">Entrega</option>
                        <option value="plan">Planejamento</option>
                        <option value="pcd">Inclusão</option>
                        <option value="personal">Pessoal</option>
                      </select>
                    </label>
                    <label>
                      Horário
                      <input
                        type="time"
                        value={draft.time}
                        onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                      />
                    </label>
                  </div>
                  <label>
                    Observações
                    <textarea
                      rows={3}
                      value={draft.notes}
                      onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                      placeholder="Detalhes, pauta, materiais…"
                    />
                  </label>
                  <SuggestionsButton
                    type={draft.type}
                    onPick={(s) =>
                      setDraft((prev) => ({
                        ...prev,
                        notes: prev.notes ? prev.notes.replace(/\s+$/, "") + "\n" + s : s,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="ag-panel-foot">
                {editing && (
                  <button className="ag-btn" onClick={cancelEdit}>Cancelar</button>
                )}
                <button className="ag-btn primary" onClick={saveDraft} disabled={!draft.title.trim()}>
                  <Plus size={14} /> {editing ? "Salvar alterações" : "Adicionar evento"}
                </button>
              </div>
            </div>
          </div>
        )}
        {showAllUpcoming && (
          <div className="ag-overlay" onClick={() => setShowAllUpcoming(false)}>
            <div className="ag-panel" onClick={(e) => e.stopPropagation()}>
              <div className="ag-panel-head">
                <div style={{ minWidth: 0 }}>
                  <div className="ag-panel-title">Todos os próximos compromissos</div>
                  <div className="ag-panel-sub">{upcoming.length} {upcoming.length === 1 ? "compromisso" : "compromissos"} agendados</div>
                </div>
                <button className="ag-panel-close" onClick={() => setShowAllUpcoming(false)} aria-label="Fechar"><X size={16} /></button>
              </div>
              <div className="ag-panel-body">
                {upcoming.length === 0 ? (
                  <div className="ag-empty">Nenhum compromisso futuro.</div>
                ) : (
                  upcoming.map((ev) => {
                    const [, mm, dd] = ev.date.split("-");
                    return (
                      <div
                        key={ev.id}
                        className="ag-up-item"
                        style={{ cursor: "pointer" }}
                        onClick={() => { setShowAllUpcoming(false); openDayPanel(ev.date); }}
                      >
                        <div className="ag-up-day">
                          <div className="ag-up-day-num">{dd}</div>
                          <div className="ag-up-day-mo">{MONTHS_PT[Number(mm) - 1].slice(0, 3)}</div>
                        </div>
                        <div className="ag-up-body">
                          <span
                            className="ag-up-tag"
                            style={{ background: "color-mix(in oklab, " + TYPE_COLOR[ev.type] + " 18%, white)", color: TYPE_COLOR[ev.type] }}
                          >
                            {TYPE_LABEL[ev.type]}
                          </span>
                          <div className="ag-up-name">{ev.title}</div>
                          {ev.time && (
                            <div className="ag-up-meta">
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <Clock size={11} /> {ev.time}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
