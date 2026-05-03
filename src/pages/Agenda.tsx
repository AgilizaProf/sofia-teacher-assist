import { AppSidebar, sidebarCss } from "@/components/AppSidebar";
import { ChevronLeft, ChevronRight, Plus, Filter, RefreshCw, Users, FileText, Calendar as CalIcon, Heart, Sparkles, Clock } from "lucide-react";

const css = `
.ag-root{
  --primary:#1B2A4E;--primary-dark:#0F1B36;--primary-deep:#0a1226;
  --accent:#FF7A45;--accent-warm:#FF9466;--accent-soft:#FFF1E8;
  --success:#10B981;--warn:#F59E0B;--danger:#EF4444;--info:#3B82F6;
  --bg:#F4F6FB;--card:#FFFFFF;--text:#1B2A4E;--text-mute:#64708A;
  --border:#E4E8F0;--border-soft:#EEF1F7;
  --pcd:#8B5CF6;--plan:#3B82F6;--report:#10B981;--meeting:#FF7A45;--eval:#F59E0B;--holiday:#94A3B8;
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
`;

type Ev = { type: "holiday" | "meeting" | "eval" | "report" | "plan" | "pcd"; t: string; urgent?: boolean };
type Day = { n: number; other?: boolean; weekend?: boolean; today?: boolean; events?: Ev[] };

const WEEKS: Day[][] = [
  [
    { n: 29, other: true, weekend: true }, { n: 30, other: true }, { n: 31, other: true },
    { n: 1, events: [{ type: "plan", t: "📘 Plano Mat. 5ºA" }] },
    { n: 2, events: [{ type: "eval", t: "📝 Atividade Port." }] },
    { n: 3, events: [{ type: "holiday", t: "🎉 Sexta-feira Santa" }] },
    { n: 4, weekend: true },
  ],
  [
    { n: 5, weekend: true, events: [{ type: "holiday", t: "🥚 Páscoa" }] },
    { n: 6, events: [{ type: "plan", t: "📘 Sequência didática" }] },
    { n: 7, today: true, events: [
      { type: "meeting", t: "👥 Reunião pais 5ºA · 14h", urgent: true },
      { type: "report", t: "📄 Corrigir Port. 4ºB" },
      { type: "pcd", t: "💜 Acomp. Pedrinho TEA" },
    ]},
    { n: 8, events: [{ type: "eval", t: "📝 Prova Mat. 4ºB · 8h", urgent: true }] },
    { n: 9, events: [{ type: "plan", t: "📘 Planejar Ciências" }] },
    { n: 10, events: [{ type: "meeting", t: "👥 HTPC · 18h" }] },
    { n: 11, weekend: true },
  ],
  [
    { n: 12, weekend: true },
    { n: 13, events: [{ type: "report", t: "📄 Entrega notas" }] },
    { n: 14, events: [{ type: "meeting", t: "👥 Conselho de classe" }, { type: "plan", t: "📘 Sofia prepara" }] },
    { n: 15, events: [{ type: "report", t: "📄 Boletins 1º bim · 27", urgent: true }] },
    { n: 16, events: [{ type: "pcd", t: "💜 Reunião AEE · TDAH" }] },
    { n: 17, events: [{ type: "eval", t: "📝 Atividade interdisc." }] },
    { n: 18, weekend: true },
  ],
  [
    { n: 19, weekend: true },
    { n: 20, events: [{ type: "plan", t: "📘 Projeto Folclore" }] },
    { n: 21, events: [{ type: "holiday", t: "🇧🇷 Tiradentes" }] },
    { n: 22, events: [{ type: "meeting", t: "👥 Reunião pedag." }] },
    { n: 23, events: [{ type: "eval", t: "📝 Avaliação Hist." }] },
    { n: 24, events: [{ type: "plan", t: "📘 Plano 2º bim" }] },
    { n: 25, weekend: true },
  ],
  [
    { n: 26, weekend: true },
    { n: 27, events: [{ type: "report", t: "📄 Pareceres descritivos" }] },
    { n: 28, events: [{ type: "pcd", t: "💜 PEI · 3 alunos" }] },
    { n: 29, events: [{ type: "meeting", t: "👥 Reunião de pais 4ºB" }] },
    { n: 30, events: [{ type: "plan", t: "📘 Festa Junina" }] },
    { n: 1, other: true, weekend: true }, { n: 2, other: true, weekend: true },
  ],
];

export function Agenda() {
  return (
    <div className="ag-root">
      <style>{sidebarCss}</style>
      <style>{css}</style>
      <div className="ag-app">
        <AppSidebar active="agenda" />
        <main className="ag-main">
          <div className="ag-topbar">
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="ag-breadcrumb">
                <span>Organização</span><span className="sep">›</span>
                <span>Agenda</span><span className="sep">›</span>
                <b>Abril 2026</b>
              </div>
              <h1 className="ag-title">Agenda · Radar pedagógico</h1>
              <div className="ag-meta">
                <span><b>7 eventos</b> esta semana</span>
                <span className="mdot" />
                <span><b>2</b> precisam de preparação</span>
                <span className="mdot" />
                <span className="pill">⚡ Sofia preparou 4 reuniões automaticamente</span>
              </div>
            </div>
            <div className="ag-actions">
              <button className="ag-btn"><Filter size={14} /> Filtrar</button>
              <button className="ag-btn"><RefreshCw size={14} /> Sincronizar Google</button>
              <button className="ag-btn primary"><Plus size={14} /> Novo evento</button>
            </div>
          </div>

          <div className="ag-content">
            <div className="ag-col-main">
              <div className="ag-radar">
                <div className="ag-radar-card urgent">
                  <span className="ag-radar-label">🔴 Hoje</span>
                  <div className="ag-radar-count">3</div>
                  <div className="ag-radar-desc"><b>Reunião de pais</b> 5ºA · 14h<br />+ 2 atividades para corrigir</div>
                  <span className="ag-radar-tag">Ver hoje →</span>
                </div>
                <div className="ag-radar-card warn">
                  <span className="ag-radar-label">🟠 Amanhã</span>
                  <div className="ag-radar-count">2</div>
                  <div className="ag-radar-desc"><b>Prova de Matemática</b> 4ºB<br />Sofia sugere revisar 3 alunos</div>
                  <span className="ag-radar-tag">Preparar →</span>
                </div>
                <div className="ag-radar-card">
                  <span className="ag-radar-label">Esta semana</span>
                  <div className="ag-radar-count">7 <small>eventos</small></div>
                  <div className="ag-radar-desc">2 reuniões · 1 prova · 1 conselho · 3 prazos</div>
                  <span className="ag-radar-tag" style={{ color: "var(--text-mute)" }}>Ver semana</span>
                </div>
                <div className="ag-radar-card">
                  <span className="ag-radar-label">Próximos prazos</span>
                  <div className="ag-radar-count">15 <small>/abr</small></div>
                  <div className="ag-radar-desc"><b>Boletins 1º bimestre</b><br />27 pareceres pendentes</div>
                  <span className="ag-radar-tag">Sofia ajuda →</span>
                </div>
              </div>

              <div className="ag-cal-card">
                <div className="ag-cal-head">
                  <div className="ag-cal-nav">
                    <button className="ag-cal-nav-btn" aria-label="Mês anterior"><ChevronLeft size={14} /></button>
                    <div className="ag-cal-month">Abril 2026 <small>· 1º bimestre · semana 14</small></div>
                    <button className="ag-cal-nav-btn" aria-label="Próximo mês"><ChevronRight size={14} /></button>
                    <button className="ag-btn" style={{ padding: "5px 10px", fontSize: 11.5, marginLeft: 4 }}>Hoje</button>
                  </div>
                  <div className="ag-cal-views">
                    <button className="ag-cal-view">Dia</button>
                    <button className="ag-cal-view">Semana</button>
                    <button className="ag-cal-view active">Mês</button>
                    <button className="ag-cal-view">Ano</button>
                  </div>
                  <div className="ag-cal-legend">
                    <span className="ag-legend-item"><span className="ag-legend-dot" style={{ background: "var(--meeting)" }} />Reunião</span>
                    <span className="ag-legend-item"><span className="ag-legend-dot" style={{ background: "var(--eval)" }} />Avaliação</span>
                    <span className="ag-legend-item"><span className="ag-legend-dot" style={{ background: "var(--report)" }} />Entrega</span>
                    <span className="ag-legend-item"><span className="ag-legend-dot" style={{ background: "var(--plan)" }} />Planejamento</span>
                    <span className="ag-legend-item"><span className="ag-legend-dot" style={{ background: "var(--pcd)" }} />Inclusão</span>
                    <span className="ag-legend-item"><span className="ag-legend-dot" style={{ background: "var(--holiday)" }} />Feriado</span>
                  </div>
                </div>

                <div className="ag-cal-weekdays">
                  {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((d) => <div key={d} className="ag-cal-weekday">{d}</div>)}
                </div>

                <div className="ag-cal-grid">
                  {WEEKS.flat().map((d, i) => (
                    <div key={i} className={"ag-cal-day" + (d.other ? " other" : "") + (d.weekend ? " weekend" : "") + (d.today ? " today" : "")}>
                      <span className="ag-cal-num">{d.n}</span>
                      {d.today && <span className="ag-cal-day-flag">Hoje</span>}
                      {(d.events || []).map((e, j) => (
                        <div key={j} className={"ag-cal-event " + e.type + (e.urgent ? " urgent" : "")}>{e.t}</div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="ag-col-side">
              <div className="ag-sofia-card">
                <div className="ag-sofia-head">
                  <div className="ag-sofia-avatar">S</div>
                  <div className="ag-sofia-name">Sofia <small>Sua assistente · online</small></div>
                </div>
                <div className="ag-sofia-msg">
                  Camila, vi que <b>hoje 14h você tem reunião de pais do 5ºA</b>. Já preparei a pauta com base nas notas do bimestre e em 2 alertas que merecem atenção (Pedrinho/TEA e Júlia/leitura).
                </div>
                <div className="ag-sofia-actions">
                  <button className="ag-sofia-action">
                    <div className="ag-sofia-action-ic"><FileText size={14} /></div>
                    <div><b>Ver pauta da reunião</b><small>Pronta · 12 tópicos</small></div>
                    <span className="ag-sofia-arrow">›</span>
                  </button>
                  <button className="ag-sofia-action">
                    <div className="ag-sofia-action-ic"><CalIcon size={14} /></div>
                    <div><b>Preparar prova de amanhã</b><small>4ºB · Mat · BNCC EF04MA10</small></div>
                    <span className="ag-sofia-arrow">›</span>
                  </button>
                  <button className="ag-sofia-action">
                    <div className="ag-sofia-action-ic"><Sparkles size={14} /></div>
                    <div><b>Adiantar 27 pareceres</b><small>Prazo dia 15 · economiza 3h</small></div>
                    <span className="ag-sofia-arrow">›</span>
                  </button>
                </div>
              </div>

              <div className="ag-stat-card">
                <div className="ag-stat-head"><Clock size={11} style={{ display: "inline", marginRight: 4 }} />Você esta semana</div>
                <div className="ag-stat-big">3h 47min <small>economizadas</small></div>
                <div className="ag-stat-desc">Sofia preparou <b>4 reuniões</b>, sugeriu <b>9 ajustes</b> e adiantou <b>12 pareceres</b>. Equivale a um <b>domingo livre</b>.</div>
              </div>

              <div className="ag-up-card">
                <div className="ag-up-head">
                  <div className="ag-up-title">Próximos compromissos</div>
                  <span className="ag-up-link">Ver todos</span>
                </div>
                <div className="ag-up-list">
                  {[
                    { d: "07", m: "Hoje", tag: "meeting", tagL: "Reunião · 14h", n: "Reunião de pais — 5ºA", meta: ["👥 22 famílias", "Sala 12"], prep: "✓ Sofia preparou pauta + boletins", pending: false },
                    { d: "08", m: "Qua", tag: "eval", tagL: "Avaliação · 8h", n: "Prova de Matemática — 4ºB", meta: ["📐 Frações · BNCC EF04MA10"], prep: "⚠ Sofia precisa: ajustar prova p/ Pedrinho (TEA)", pending: true },
                    { d: "14", m: "Ter", tag: "meeting", tagL: "Conselho · 19h", n: "Conselho de classe — 1º bimestre", meta: ["🏫 Toda a escola"], prep: "✓ Sofia preparou síntese de 27 alunos", pending: false },
                    { d: "15", m: "Qua", tag: "report", tagL: "Prazo · 23h59", n: "Boletins 1º bimestre", meta: ["📄 27 pareceres", "Sec. escolar"], prep: "⚠ 4h estimadas · Sofia faz em 30min", pending: true },
                    { d: "16", m: "Qui", tag: "pcd", tagL: "Inclusão · 16h", n: "Reunião AEE — Lucas (TDAH)", meta: ["💜 PEI revisão"], prep: "✓ Sofia atualizou plano individualizado", pending: false },
                  ].map((it, i) => (
                    <div key={i} className="ag-up-item">
                      <div className="ag-up-day">
                        <div className="ag-up-day-num">{it.d}</div>
                        <div className="ag-up-day-mo">{it.m}</div>
                      </div>
                      <div className="ag-up-body">
                        <span className={"ag-up-tag " + it.tag}>{it.tagL}</span>
                        <div className="ag-up-name">{it.n}</div>
                        <div className="ag-up-meta">
                          {it.meta.map((m, j) => (
                            <span key={j} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                              {j > 0 && <span className="mdot" />}<span>{m}</span>
                            </span>
                          ))}
                        </div>
                        <span className={"ag-up-prep" + (it.pending ? " pending" : "")}>{it.prep}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
