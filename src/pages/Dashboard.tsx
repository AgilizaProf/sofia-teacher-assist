import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { AppSidebar } from "@/components/AppSidebar";
import { EmptyState, emptyStateCss } from "@/components/EmptyState";
import { useUser, greeting } from "@/lib/mockData";
import { updateLoginStreak } from "@/lib/datetime";
import { CID_OPTIONS } from "@/lib/cidsBR";
import { useSofia } from "@/components/sofia/SofiaProvider";
import { SofiaSuggestionList } from "@/components/sofia/SofiaSuggestionCard";
import { SofiaFocoCard } from "@/components/sofia/SofiaFocoCard";
import { useSofiaSuggestions } from "@/components/sofia/useSofiaSuggestions";
import { SofiaActiveChip } from "@/components/sofia/SofiaActiveChip";
import { Header as AppHeader } from "@/components/Header";
import { usePersistentState } from "@/lib/persist/usePersistentState";

type AgendaType = "meeting" | "eval" | "report" | "plan" | "pcd" | "personal";
type AgendaEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  time?: string;
  type: AgendaType;
  notes?: string;
};
const AGENDA_TYPE_LABEL: Record<AgendaType, string> = {
  meeting: "Reunião", eval: "Avaliação", report: "Entrega",
  plan: "Planejamento", pcd: "Inclusão", personal: "Pessoal",
};
const AGENDA_TYPE_COLOR: Record<AgendaType, string> = {
  meeting: "#6366F1", eval: "#EF4444", report: "#F59E0B",
  plan: "#10B981", pcd: "#8B5CF6", personal: "#64748B",
};
const MONTHS_PT_SHORT = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

const css = `
.ap-root{
  --primary:#1B2A4E;--primary-dark:#0F1B36;--primary-light:#2A3D6B;--primary-soft:#EEF1F8;
  --accent:#FF7A45;--accent-warm:#FF9466;--accent-deep:#E85F2C;--accent-soft:#FFF1E8;
  --success:#10B981;--success-soft:#D1FAE5;
  --bg:#F4F6FB;--bg-soft:#F7F8FB;--card:#FFFFFF;
  --text:#1B2A4E;--text-soft:#5B6B82;--text-muted:#8A98AE;
  --border:#E4E8F0;--border-soft:#EEF1F6;
  --shadow-sm:0 1px 2px rgba(27,42,78,.05);
  --shadow-md:0 4px 12px rgba(27,42,78,.06), 0 1px 3px rgba(27,42,78,.04);
  --shadow-lg:0 14px 32px rgba(27,42,78,.08), 0 2px 6px rgba(27,42,78,.04);
  --shadow-accent:0 12px 28px rgba(255,122,69,.35);
  font-family:'Inter',-apple-system,sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased;line-height:1.5;font-size:14px;min-height:100vh;
}
.ap-root *{box-sizing:border-box;}
.ap-root h1,.ap-root h2,.ap-root h3,.ap-root h4{letter-spacing:-0.02em;color:var(--primary);line-height:1.2;margin:0;}
.ap-root button{font-family:inherit;cursor:pointer;border:none;background:transparent;}
.ap-root a{color:inherit;text-decoration:none;}
.ap-root p{margin:0;}
.ap-root ul{margin:0;padding:0;list-style:none;}
.ap-app{display:grid;grid-template-columns:240px 1fr;min-height:100vh;}
.ap-sidebar{background:linear-gradient(180deg,var(--primary) 0%,var(--primary-dark) 100%);color:#fff;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow:hidden;align-self:flex-start;}
.ap-sidebar::before{content:"";position:absolute;top:-100px;right:-100px;width:300px;height:300px;background:radial-gradient(circle,rgba(255,122,69,.14) 0%,transparent 65%);border-radius:50%;pointer-events:none;}
.sb-head{padding:18px 18px 12px;display:flex;align-items:center;gap:10px;position:relative;z-index:1;}
.sb-logo-icon{width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,var(--accent),var(--accent-warm));display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-weight:900;font-size:17px;color:#fff;box-shadow:0 6px 18px rgba(255,122,69,.40);flex-shrink:0;}
.sb-logo-text{font-family:'Fraunces',serif;font-weight:900;font-size:16px;color:#fff;letter-spacing:-0.03em;line-height:1;}
.sb-logo-text span{color:var(--accent);}
.sb-cmdk{margin:6px 14px 14px;padding:8px 11px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);border-radius:8px;display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,.55);cursor:pointer;transition:all .2s;position:relative;z-index:1;}
.sb-cmdk:hover{background:rgba(255,255,255,.10);border-color:rgba(255,255,255,.16);}
.sb-cmdk svg{width:13px;height:13px;flex-shrink:0;}
.sb-cmdk-shortcut{margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:10px;background:rgba(255,255,255,.10);padding:1px 6px;border-radius:4px;color:rgba(255,255,255,.70);font-weight:700;}
.sb-section-label{font-size:9.5px;font-weight:800;color:rgba(255,255,255,.36);text-transform:uppercase;letter-spacing:.14em;padding:8px 20px 6px;}
.sb-nav{padding:0 10px;flex:1;position:relative;z-index:1;display:flex;flex-direction:column;gap:1px;}
.sb-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:7px;color:rgba(255,255,255,.74);font-weight:500;font-size:13px;width:100%;text-align:left;transition:all .15s;position:relative;}
.sb-item:hover{background:rgba(255,255,255,.06);color:#fff;}
.sb-item.active{background:rgba(255,122,69,.13);color:#fff;font-weight:700;box-shadow:inset 0 0 0 1px rgba(255,122,69,.26);}
.sb-item.active::before{content:"";position:absolute;left:-10px;top:50%;transform:translateY(-50%);width:3px;height:18px;background:var(--accent);border-radius:0 3px 3px 0;}
.sb-icon{width:15px;height:15px;flex-shrink:0;stroke-width:2;}
.sb-badge{margin-left:auto;background:var(--accent);color:#fff;font-size:9px;font-weight:800;padding:1.5px 6px;border-radius:100px;line-height:1.4;}
.sb-shortcut{margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:9.5px;color:rgba(255,255,255,.40);font-weight:600;}
.sb-foot{padding:12px;position:relative;z-index:1;border-top:1px solid rgba(255,255,255,.06);margin-top:8px;}
.sb-bruna{display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);margin-bottom:10px;transition:background .2s;cursor:pointer;}
.sb-bruna:hover{background:rgba(255,255,255,.08);}
.sb-bruna-avatar{width:32px;height:32px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,var(--accent),var(--accent-warm));display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-weight:800;color:#fff;font-size:13px;border:2px solid rgba(255,255,255,.14);}
.sb-bruna-text{flex:1;min-width:0;}
.sb-bruna-name{font-size:11.5px;font-weight:700;color:#fff;line-height:1.2;}
.sb-bruna-role{font-size:10px;color:rgba(255,255,255,.55);margin-top:1px;}
.sb-bruna-badge{font-size:8.5px;font-weight:800;color:var(--accent);background:rgba(255,122,69,.14);padding:2px 5px;border-radius:4px;text-transform:uppercase;letter-spacing:.06em;display:inline-block;margin-top:3px;}
.sb-version{font-size:10px;color:rgba(255,255,255,.30);text-align:center;font-family:'JetBrains Mono',monospace;font-weight:600;}
.sb-plan{margin:0 10px 10px;background:linear-gradient(180deg,#FFEDD5 0%,#FFD7B5 100%);border:1px solid #F7C9A8;border-radius:10px;padding:8px 10px;color:#3a1f0b;position:relative;z-index:1;}
.sb-plan-tag{font-size:8.5px;font-weight:800;color:#9A3412;letter-spacing:.08em;display:inline-flex;align-items:center;gap:4px;}
.sb-plan h4{margin:3px 0 1px;font-family:'Fraunces',serif;font-weight:700;font-size:11px;color:#3a1f0b;line-height:1.2;}
.sb-plan p{margin:0;font-size:9.5px;color:#5a3a20;line-height:1.3;}
.ap-main{padding:22px 32px 48px;overflow-x:hidden;max-width:1320px;}
.topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;gap:18px;}
.crumbs{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted);font-weight:600;}
.crumbs strong{color:var(--text);font-weight:700;}
.crumbs svg{width:11px;height:11px;}
.streak-pill{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,var(--accent-soft),#fff);border:1px solid #FFD9BF;border-radius:100px;padding:5px 11px 5px 8px;font-size:11.5px;font-weight:700;color:var(--accent-deep);margin-left:10px;}
.streak-pill .num{font-family:'Fraunces',serif;font-weight:800;font-size:13px;}
.topbar-actions{display:flex;align-items:center;gap:8px;}
.icon-action{width:34px;height:34px;border-radius:9px;background:#fff;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--text-soft);transition:all .15s;position:relative;}
.icon-action:hover{border-color:var(--primary);color:var(--primary);box-shadow:var(--shadow-sm);}
.icon-action svg{width:14px;height:14px;}
.notif-dot{position:absolute;top:6px;right:6px;width:7px;height:7px;background:var(--accent);border-radius:50%;border:2px solid #fff;}
.user-pill{display:flex;align-items:center;gap:9px;background:#fff;border:1px solid var(--border);border-radius:100px;padding:4px 13px 4px 4px;cursor:pointer;transition:border .2s;}
.user-pill:hover{border-color:var(--primary);}
.user-avatar{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,var(--primary-light),var(--primary));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:10.5px;flex-shrink:0;}
.user-name{font-size:11.5px;font-weight:700;color:var(--text);line-height:1.2;}
.user-plan{font-size:9px;color:var(--accent);font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-top:1px;}
.hero{background:linear-gradient(135deg,var(--primary) 0%,var(--primary-dark) 100%);border-radius:20px;padding:30px 36px;color:#fff;position:relative;overflow:hidden;margin-bottom:18px;display:grid;grid-template-columns:1.4fr 1fr;gap:28px;align-items:center;}
.hero::before{content:"";position:absolute;top:-180px;right:-100px;width:480px;height:480px;background:radial-gradient(circle,rgba(255,122,69,.26) 0%,transparent 60%);border-radius:50%;pointer-events:none;}
.hero::after{content:"";position:absolute;bottom:-160px;left:-80px;width:380px;height:380px;background:radial-gradient(circle,rgba(255,148,102,.10) 0%,transparent 65%);border-radius:50%;pointer-events:none;}
.hero-left{position:relative;z-index:1;}
.hero-greet{font-size:11.5px;color:rgba(255,255,255,.65);font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:8px;letter-spacing:.04em;text-transform:uppercase;}
.hero-greet .live-dot{width:6px;height:6px;background:var(--success);border-radius:50%;box-shadow:0 0 0 0 rgba(16,185,129,.5);animation:ap-pulse 2s infinite;}
@keyframes ap-pulse{0%{box-shadow:0 0 0 0 rgba(16,185,129,.5);}70%{box-shadow:0 0 0 8px rgba(16,185,129,0);}100%{box-shadow:0 0 0 0 rgba(16,185,129,0);}}
.ap-root .hero-title{font-family:'Fraunces',serif;font-weight:800;font-size:36px;color:#fff;line-height:1.08;margin-bottom:12px;letter-spacing:-0.025em;}
.hero-title .accent{color:var(--accent);position:relative;display:inline-block;}
.hero-title .accent::after{content:"";position:absolute;left:0;right:0;bottom:3px;height:9px;background:rgba(255,122,69,.22);z-index:-1;border-radius:3px;}
.hero-sub{font-size:14px;color:rgba(255,255,255,.78);line-height:1.55;max-width:480px;margin-bottom:22px;}
.hero-cta-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.ap-root .hero-cta{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#FF7A45,#FF9466) !important;color:#fff !important;border:none;border-radius:10px;padding:10px 16px;font-size:13px;font-weight:700;box-shadow:0 10px 22px rgba(255,122,69,.32);transition:all .25s;width:auto;}
.hero-cta:hover{transform:translateY(-2px);box-shadow:0 16px 36px rgba(255,122,69,.55);}
.hero-cta svg{width:15px;height:15px;transition:transform .2s;}
.hero-cta:hover svg{transform:translateX(3px);}
.hero-cta-ghost{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);color:#fff;border-radius:11px;padding:12px 16px;font-size:13px;font-weight:700;transition:all .2s;backdrop-filter:blur(10px);}
.hero-cta-ghost:hover{background:rgba(255,255,255,.14);}
.hero-cta-ghost svg{width:13px;height:13px;}
.hero-metric{position:relative;z-index:1;background:rgba(255,255,255,.05);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:22px;}
.hero-metric-tag{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:800;color:rgba(255,255,255,.68);text-transform:uppercase;letter-spacing:.12em;margin-bottom:12px;}
.hero-metric-tag svg{width:12px;height:12px;color:var(--accent);}
.hero-metric-value{font-family:'Fraunces',serif;font-weight:800;font-size:54px;color:#fff;line-height:1;letter-spacing:-0.03em;margin-bottom:6px;display:flex;align-items:baseline;gap:4px;}
.hero-metric-unit{font-size:22px;color:rgba(255,255,255,.62);font-weight:600;}
.hero-metric-label{font-size:12px;color:rgba(255,255,255,.74);margin-bottom:16px;}
.hero-metric-bar{height:5px;background:rgba(255,255,255,.10);border-radius:100px;overflow:hidden;margin-bottom:8px;position:relative;}
.hero-metric-fill{height:100%;width:78%;background:linear-gradient(90deg,var(--accent),var(--accent-warm));border-radius:100px;box-shadow:0 0 12px rgba(255,122,69,.50);position:relative;}
.hero-metric-fill::after{content:"";position:absolute;right:0;top:50%;transform:translateY(-50%);width:8px;height:8px;background:#fff;border-radius:50%;box-shadow:0 0 8px rgba(255,255,255,.8);}
.hero-metric-foot{display:flex;align-items:center;justify-content:space-between;font-size:10.5px;color:rgba(255,255,255,.62);font-weight:600;}
.hero-metric-foot strong{color:var(--success);font-weight:800;}
.today-focus{background:#fff;border:1px solid var(--border);border-radius:14px;padding:14px 18px;margin-bottom:18px;display:flex;align-items:center;gap:14px;position:relative;overflow:hidden;box-shadow:var(--shadow-sm);}
.today-focus::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,var(--accent),var(--accent-warm));}
.today-focus-icon{width:40px;height:40px;border-radius:11px;background:linear-gradient(135deg,var(--accent-soft),#fff);border:1px solid #FFD9BF;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.today-focus-icon-inner{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,var(--accent),var(--accent-warm));display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(255,122,69,.32);}
.today-focus-icon-inner svg{width:12px;height:12px;color:#fff;stroke-width:2.5;}
.today-focus-content{flex:1;min-width:0;}
.today-focus-tag{display:inline-flex;align-items:center;gap:5px;font-size:9.5px;font-weight:800;color:var(--accent);background:var(--accent-soft);padding:2px 7px;border-radius:100px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;}
.today-focus-title{font-size:14px;font-weight:700;color:var(--text);line-height:1.35;}
.today-focus-title strong{color:var(--accent-deep);font-weight:800;}
.today-focus-meta{font-size:11.5px;color:var(--text-soft);margin-top:2px;display:flex;align-items:center;gap:8px;}
.today-focus-meta .sep{width:3px;height:3px;background:var(--text-muted);border-radius:50%;}
.today-focus-action{display:inline-flex;align-items:center;gap:6px;background:var(--primary);color:#fff;padding:9px 14px;border-radius:9px;font-size:12px;font-weight:700;flex-shrink:0;transition:all .2s;}
.today-focus-action:hover{background:var(--primary-dark);transform:translateY(-1px);}
.today-focus-action svg{width:12px;height:12px;}
.today-focus-dismiss{width:28px;height:28px;border-radius:7px;border:1px solid var(--border);background:#fff;color:var(--text-muted);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;}
.today-focus-dismiss:hover{border-color:var(--text-soft);color:var(--text);}
.today-focus-dismiss svg{width:11px;height:11px;}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px;}
.ap-root .stat,.ap-root button.stat{background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;transition:all .2s;cursor:pointer;}
.ap-root .stat:hover,.ap-root button.stat:hover{border-color:var(--primary-soft);box-shadow:var(--shadow-md);transform:translateY(-1px);background:#fff;}
.stat-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.stat-icon svg{width:16px;height:16px;stroke-width:2;}
.stat-icon.s1{background:#FFF1E8;color:var(--accent);}
.stat-icon.s2{background:#E0F2FE;color:#0284C7;}
.stat-icon.s3{background:#DCFCE7;color:#059669;}
.stat-icon.s4{background:#FEF3C7;color:#D97706;}
.stat-body{flex:1;min-width:0;}
.stat-value{font-family:'Fraunces',serif;font-weight:800;font-size:22px;color:var(--primary);line-height:1;letter-spacing:-0.02em;display:flex;align-items:baseline;gap:6px;}
.stat-value-trend{font-family:'Inter',sans-serif;font-size:10px;font-weight:700;color:var(--success);background:var(--success-soft);padding:2px 6px;border-radius:100px;letter-spacing:0;}
.stat-label{font-size:11px;color:var(--text-soft);font-weight:600;margin-top:3px;}
.grid-2{display:grid;grid-template-columns:1.5fr 1fr;gap:18px;margin-bottom:18px;}
.card{background:#fff;border:1px solid var(--border);border-radius:14px;padding:20px;}
.card-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:12px;flex-wrap:wrap;}
.card-title{font-family:'Fraunces',serif;font-weight:800;font-size:16px;color:var(--primary);display:flex;align-items:center;gap:9px;}
.card-title-count{background:var(--primary-soft);color:var(--primary);font-size:10px;font-weight:800;padding:2.5px 8px;border-radius:100px;font-family:'Inter',sans-serif;}
.card-link{font-size:11.5px;font-weight:700;color:var(--accent);display:inline-flex;align-items:center;gap:4px;transition:gap .2s;}
.card-link:hover{gap:7px;}
.card-link svg{width:11px;height:11px;}
.filter-pills{display:flex;gap:4px;background:var(--bg-soft);padding:3px;border-radius:8px;}
.filter-pill{padding:5px 11px;border-radius:6px;font-size:11px;font-weight:700;color:var(--text-soft);transition:all .15s;display:inline-flex;align-items:center;gap:5px;}
.filter-pill.active{background:#fff;color:var(--primary);box-shadow:var(--shadow-sm);}
.filter-pill .count{font-size:9.5px;background:var(--primary-soft);color:var(--primary);padding:1px 5px;border-radius:100px;font-weight:800;}
.filter-pill.active .count{background:var(--accent-soft);color:var(--accent);}
.class-group{margin-bottom:10px;}
.class-group:last-child{margin-bottom:0;}
.class-head{display:flex;align-items:center;gap:10px;padding:8px 11px;background:var(--bg-soft);border-radius:8px;cursor:pointer;transition:background .15s;}
.class-head:hover{background:var(--primary-soft);}
.class-toggle{width:16px;height:16px;display:flex;align-items:center;justify-content:center;color:var(--text-soft);transition:transform .2s;}
.class-toggle.collapsed{transform:rotate(-90deg);}
.class-info{flex:1;min-width:0;}
.class-name{font-size:12.5px;font-weight:800;color:var(--primary);line-height:1.2;}
.class-meta{font-size:10.5px;color:var(--text-soft);margin-top:2px;}
.class-count{font-size:10px;font-weight:700;color:var(--text-soft);background:#fff;border:1px solid var(--border);padding:2.5px 8px;border-radius:100px;}
.student{display:flex;align-items:center;gap:11px;padding:9px 11px;margin-top:4px;border-radius:8px;transition:background .15s;border:1px solid transparent;}
.student:hover{background:var(--bg-soft);border-color:var(--border-soft);}
.student-avatar{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;color:#fff;flex-shrink:0;font-family:'Fraunces',serif;}
.av-1{background:linear-gradient(135deg,#FF7A45,#FF9466);}
.av-2{background:linear-gradient(135deg,#3B82F6,#60A5FA);}
.av-3{background:linear-gradient(135deg,#10B981,#34D399);}
.student-info{flex:1;min-width:0;}
.student-name{font-size:12.5px;font-weight:700;color:var(--text);line-height:1.2;display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.student-tag{display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:800;padding:1.5px 5px;border-radius:100px;background:var(--accent-soft);color:var(--accent);text-transform:uppercase;letter-spacing:.04em;}
.student-meta{font-size:10.5px;color:var(--text-soft);margin-top:2px;}
.student-actions{display:flex;align-items:center;gap:5px;}
.icon-btn{width:26px;height:26px;border-radius:6px;border:1px solid var(--border);background:#fff;display:flex;align-items:center;justify-content:center;color:var(--text-soft);transition:all .15s;}
.icon-btn:hover{border-color:var(--primary);color:var(--primary);}
.icon-btn svg{width:11px;height:11px;}
.activity-list{display:flex;flex-direction:column;}
.activity{display:flex;align-items:flex-start;gap:11px;padding:10px 0;border-bottom:1px solid var(--border-soft);}
.activity:last-child{border-bottom:none;padding-bottom:0;}
.activity:first-child{padding-top:0;}
.activity-dot{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;}
.activity-dot.ad-rel{background:#FFF1E8;}
.activity-dot.ad-plan{background:#E0F2FE;}
.activity-dot.ad-inc{background:#DCFCE7;}
.activity-body{flex:1;min-width:0;}
.activity-title{font-size:12px;color:var(--text);line-height:1.3;}
.activity-title strong{font-weight:700;color:var(--primary);}
.activity-meta{font-size:10.5px;color:var(--text-muted);margin-top:3px;display:flex;align-items:center;gap:7px;}
.activity-meta .sep{width:3px;height:3px;background:var(--text-muted);border-radius:50%;}
.agenda-empty{text-align:center;padding:20px 14px;background:var(--bg-soft);border-radius:11px;}
.agenda-empty-icon{width:42px;height:42px;border-radius:11px;background:#fff;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:18px;box-shadow:var(--shadow-sm);}
.agenda-empty-title{font-family:'Fraunces',serif;font-weight:800;font-size:14px;color:var(--primary);margin-bottom:3px;}
.agenda-empty-sub{font-size:11.5px;color:var(--text-soft);margin-bottom:10px;line-height:1.45;}
.btn-add{display:inline-flex;align-items:center;gap:5px;background:var(--primary);color:#fff;padding:7px 12px;border-radius:7px;font-size:11px;font-weight:700;transition:all .2s;}
.btn-add:hover{background:var(--primary-dark);transform:translateY(-1px);}
.btn-add svg{width:11px;height:11px;}
.sofia-week-ask{margin-top:12px;width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,#FFF4EC,#FFE7D6);border:1px dashed #F97316;color:#9A3F12;padding:10px 14px;border-radius:10px;font-size:12.5px;font-weight:700;cursor:pointer;transition:.18s;font-family:inherit;}
.sofia-week-ask:hover{background:linear-gradient(135deg,#FFE7D6,#FFD8BF);border-style:solid;color:#7A2E08;transform:translateY(-1px);box-shadow:0 6px 16px rgba(249,115,22,.18);}
.viral-strip{background:linear-gradient(135deg,#fff,var(--accent-soft));border:1px solid #FFD9BF;border-radius:14px;padding:14px 18px;display:flex;align-items:center;gap:14px;margin-bottom:18px;}
.viral-icon{width:42px;height:42px;border-radius:11px;flex-shrink:0;background:linear-gradient(135deg,var(--accent),var(--accent-warm));display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-accent);font-size:19px;}
.viral-content{flex:1;min-width:0;}
.viral-title{font-size:13px;font-weight:800;color:var(--text);line-height:1.3;}
.viral-title strong{color:var(--accent-deep);}
.viral-sub{font-size:11.5px;color:var(--text-soft);margin-top:2px;}
.viral-action{display:inline-flex;align-items:center;gap:6px;background:#fff;color:var(--accent-deep);border:1px solid #FFD9BF;padding:9px 14px;border-radius:9px;font-size:12px;font-weight:800;flex-shrink:0;transition:all .2s;}
.viral-action:hover{background:var(--accent);color:#fff;border-color:var(--accent);}
.viral-action svg{width:12px;height:12px;}
.authorize{background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:12px;}
.authorize-icon{width:34px;height:34px;border-radius:9px;background:var(--bg-soft);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;}
.authorize-content{flex:1;min-width:0;}
.authorize-title{font-size:12.5px;font-weight:700;color:var(--text);line-height:1.3;}
.authorize-sub{font-size:11px;color:var(--text-soft);margin-top:2px;}
.toggle-switch{position:relative;width:36px;height:20px;border-radius:100px;background:#CBD5E1;cursor:pointer;transition:background .25s;flex-shrink:0;}
.toggle-switch::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.20);transition:transform .25s;}
.toggle-switch.on{background:var(--accent);}
.toggle-switch.on::after{transform:translateX(16px);}
.cmdk-overlay{position:fixed;inset:0;background:rgba(15,27,54,.55);backdrop-filter:blur(6px);display:none;align-items:flex-start;justify-content:center;padding-top:120px;z-index:100;}
.cmdk-overlay.show{display:flex;}
.cmdk{width:100%;max-width:560px;background:#fff;border-radius:14px;box-shadow:0 25px 60px rgba(15,27,54,.40);overflow:hidden;border:1px solid var(--border);}
.cmdk-input{width:100%;padding:16px 18px;border:none;border-bottom:1px solid var(--border);font-size:15px;font-family:inherit;color:var(--text);outline:none;}
.cmdk-list{padding:8px;max-height:380px;overflow-y:auto;}
.cmdk-section{font-size:10px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:.10em;padding:8px 12px 4px;}
.cmdk-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;font-size:13px;color:var(--text);cursor:pointer;transition:background .12s;}
.cmdk-item:hover,.cmdk-item.active{background:var(--bg-soft);}
.cmdk-item svg{width:14px;height:14px;color:var(--text-soft);}
.cmdk-item-shortcut{margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted);font-weight:600;}
.school-modal{width:100%;max-width:480px;background:#fff;border-radius:16px;box-shadow:0 25px 60px rgba(15,27,54,.40);overflow:hidden;border:1px solid var(--border);}
.school-modal-head{padding:18px 20px 12px;border-bottom:1px solid var(--border-soft);display:flex;align-items:flex-start;gap:12px;}
.school-modal-icon{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--accent),var(--accent-warm));display:grid;place-items:center;color:#fff;flex-shrink:0;}
.school-modal-icon svg{width:18px;height:18px;}
.school-modal-title{font-family:'Fraunces',serif;font-weight:700;font-size:18px;color:var(--text);line-height:1.2;}
.school-modal-sub{font-size:12px;color:var(--text-soft);margin-top:3px;}
.school-modal-close{margin-left:auto;width:28px;height:28px;border-radius:8px;border:1px solid var(--border);background:#fff;display:grid;place-items:center;color:var(--text-soft);cursor:pointer;}
.school-modal-close:hover{border-color:var(--primary);color:var(--primary);}
.school-modal-body{padding:16px 20px;display:flex;flex-direction:column;gap:12px;}
.school-field{display:flex;flex-direction:column;gap:5px;}
.school-field label{font-size:11.5px;font-weight:700;color:var(--text);text-transform:uppercase;letter-spacing:.04em;}
.school-field input,.school-field select{padding:10px 12px;border:1px solid var(--border);border-radius:9px;font-size:13.5px;font-family:inherit;color:var(--text);background:#fff;outline:none;transition:border .15s;}
.school-field input:focus,.school-field select:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(255,122,69,.15);}
.school-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.school-mode{display:inline-flex;background:var(--bg-soft);border:1px solid var(--border);border-radius:9px;padding:3px;gap:2px;align-self:flex-start;margin-top:2px;}
.school-mode button{padding:6px 12px;border-radius:7px;font-size:12px;font-weight:700;color:var(--text-soft);background:transparent;border:none;cursor:pointer;}
.school-mode button.active{background:#fff;color:var(--text);box-shadow:0 1px 2px rgba(15,27,54,.08);}
.school-field textarea{padding:10px 12px;border:1px solid var(--border);border-radius:9px;font-size:13.5px;font-family:inherit;color:var(--text);background:#fff;outline:none;transition:border .15s;resize:vertical;min-height:110px;line-height:1.5;}
.school-field textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(255,122,69,.15);}
.school-hint{font-size:11.5px;color:var(--text-soft);margin-top:-2px;}
.school-modal-foot{padding:14px 20px;border-top:1px solid var(--border-soft);display:flex;align-items:center;gap:10px;background:var(--bg-soft);}
.school-cancel{margin-left:auto;padding:9px 14px;border-radius:9px;border:1px solid var(--border);background:#fff;font-size:13px;font-weight:700;color:var(--text-soft);cursor:pointer;}
.school-cancel:hover{border-color:var(--primary);color:var(--primary);}
.ap-root .school-save{padding:9px 16px;border-radius:9px;border:none !important;background:linear-gradient(135deg,#FF7A45,#FF9466) !important;color:#fff !important;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 8px 18px rgba(255,122,69,.45);display:inline-flex;align-items:center;gap:6px;}
.ap-root .school-save:hover{filter:brightness(1.05);}
.school-clickable{cursor:pointer;transition:transform .15s, box-shadow .15s;}
.school-clickable:hover{transform:translateY(-2px);box-shadow:var(--shadow-md);}
@media(max-width:1200px){.hero{grid-template-columns:1fr;gap:22px;padding:24px;}.stats{grid-template-columns:1fr 1fr;}.grid-2{grid-template-columns:1fr;}}
@media(max-width:900px){.ap-app{grid-template-columns:1fr;}.ap-sidebar{display:none;}.ap-main{padding:18px;}}
@media(max-width:560px){.hero{padding:20px 18px;}.hero-title{font-size:26px;}.hero-metric-value{font-size:42px;}.stats{grid-template-columns:1fr;}.today-focus{flex-direction:column;align-items:flex-start;}.today-focus-action{width:100%;justify-content:center;}}

/* Highlight visual quando a Sofia abre uma seção via deep-link. */
.sofia-highlight{position:relative;outline:2px solid var(--accent, #FF7A45);outline-offset:3px;border-radius:14px;animation:sofiaPulseHighlight 1.6s ease-out 1;box-shadow:0 0 0 6px rgba(255,122,69,.15);}
@keyframes sofiaPulseHighlight{0%{box-shadow:0 0 0 0 rgba(255,122,69,.55);}100%{box-shadow:0 0 0 14px rgba(255,122,69,0);}}
`;

const CID_LABEL: Record<string, { label: string; cid: string }> = Object.fromEntries(
  CID_OPTIONS.map((o) => [o.value, { label: o.label, cid: o.cid }])
);

const Svg = ({ c, ...rest }: { c: React.ReactNode } & React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {c}
  </svg>
);

export function Dashboard() {
  const user = useUser();
  const heroGreeting = greeting(user.name);
  const [cmdk, setCmdk] = useState(false);
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [schools, setSchools] = usePersistentState<Array<{ name: string; network: string; stage: string; city: string; uf: string; classes: string }>>("dash_schools", []);
  const baseSchools = 0;
  const [classOpen, setClassOpen] = useState(false);
  const [classes, setClasses] = usePersistentState<Array<{ name: string; school: string; grade: string; shift: string; students: string }>>("dash_classes", []);
  const baseClasses = 0;
  const [studentOpen, setStudentOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  type DashStudent = { name: string; classRef: string; birth: string; pcd: string; notes: string; createdAt?: string };
  const [students, setStudents] = usePersistentState<DashStudent[]>("dash_students", []);
  const [studentDetail, setStudentDetail] = useState<{ index: number; student: DashStudent } | null>(null);
  const [editingStudent, setEditingStudent] = useState(false);
  const [editForm, setEditForm] = useState<DashStudent | null>(null);
  // Estado controlado para os selects do modal de aluno (turma → escola sincroniza automaticamente).
  const [studentClassSel, setStudentClassSel] = useState<string>("");
  const [studentSchoolSel, setStudentSchoolSel] = useState<string>("");
  const baseStudents = 0;
  const [authorize, setAuthorize] = useState(false);
  const [filter, setFilter] = useState<"all" | "pcd" | "reg">("all");
  const [collapsedClasses, setCollapsedClasses] = useState<Record<string, boolean>>({});
  const [editingClassIdx, setEditingClassIdx] = useState<number | null>(null);
  const totalSchools = baseSchools + schools.length;
  const totalClasses = baseClasses + classes.length;
  const totalStudents = baseStudents + students.length;
  const documentsGenerated = user.documentsGenerated;
  // Tempo devolvido cresce conforme o usuário cadastra/usa funcionalidades
  const earnedMinutes =
    totalSchools * 10 +
    totalClasses * 20 +
    totalStudents * 5 +
    documentsGenerated * 30;
  const totalMinutes = user.hoursSavedWeek * 60 + user.minutesSavedWeek + earnedMinutes;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const goalMinutes = Math.max(1, user.weeklyGoalHours * 60);
  const goalPct = Math.min(100, Math.round((totalMinutes / goalMinutes) * 100));
  const goalReached = totalMinutes >= goalMinutes;
  const onboardingDone = totalClasses > 0 && totalStudents > 0 && documentsGenerated > 0;

  const [streak, setStreak] = useState<number>(0);
  const sofia = useSofia();
  const navigate = useNavigate();

  // ── Deep-link vindo das notificações da Sofia ─────────────────────────────
  // Lê ?open=schools|classes|students|agenda&target=<nome>, rola até a seção
  // correspondente, destaca-a e abre o modal certo. O target é casado por
  // nome (case-insensitive) com a turma ou aluno cadastrado pelo usuário.
  const search = useSearch({ from: "/" }) as { open?: string; target?: string; m?: "m1" | "m3" | "m5" };
  const schoolsRef = useRef<HTMLElement | null>(null);
  const classesRef = useRef<HTMLElement | null>(null);
  const studentsRef = useRef<HTMLElement | null>(null);
  const agendaRef = useRef<HTMLElement | null>(null);
  const [highlight, setHighlight] = useState<null | "schools" | "classes" | "students" | "agenda">(null);
  // Contexto PCD vindo do parâmetro ?m=m1|m3|m5. Persiste em estado para
  // sobreviver ao cleanup que remove os search params da URL.
  const [pcdMomento, setPcdMomento] = useState<null | "m1" | "m3" | "m5">(null);
  // Índice do aluno destacado pela Sofia via deep-link (?m=...&target=...).
  const [highlightedStudentIdx, setHighlightedStudentIdx] = useState<number | null>(null);
  // Quando a Sofia tenta abrir um aluno via deep-link mas o nome/slug não
  // casa com nenhum aluno cadastrado, guardamos o termo procurado para
  // mostrar um empty state com sugestões.
  const [missingTarget, setMissingTarget] = useState<null | { term: string; momento: "m1" | "m3" | "m5" | null }>(null);
  const lastDeepLink = useRef<string>("");
  // Quando a Sofia abre o painel com um momento PCD, já filtra a lista por PCD.
  // (declarado depois junto com o filter — ver useEffect logo abaixo)
  useEffect(() => {
    const open = search.open;
    const m = search.m;
    if (!open && !m) return;
    const key = `${open ?? ""}|${search.target ?? ""}|${m ?? ""}`;
    if (key === lastDeepLink.current) return;
    lastDeepLink.current = key;
    if (m) setPcdMomento(m);
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const scrollTo = (el: HTMLElement | null) => {
      if (!el) return;
      requestAnimationFrame(() => el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }));
    };
    // Helper: encontra o aluno PCD por target (nome OU slug do id) e
    // prepara highlight + modal aberto. Sofia nunca inventa: se não casar
    // com nenhum aluno cadastrado, simplesmente não abre nada.
    const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const findStudentByTarget = (tgt: string): number => {
      const t = tgt.trim().toLowerCase();
      if (!t) return -1;
      // 1) match exato por nome
      let idx = students.findIndex((s) => s.name.toLowerCase() === t);
      if (idx >= 0) return idx;
      // 2) match por slug do nome (casa com o id exposto pelo SofiaUserContext)
      const ts = slug(t);
      idx = students.findIndex((s) => slug(s.name) === ts);
      if (idx >= 0) return idx;
      // 3) match parcial (ex.: primeiro nome)
      idx = students.findIndex((s) => s.name.toLowerCase().includes(t));
      return idx;
    };
    if (open === "schools") {
      scrollTo(schoolsRef.current); setHighlight("schools");
      setSchoolOpen(true);
    } else if (open === "classes") {
      scrollTo(classesRef.current); setHighlight("classes");
      // Se o target casa com uma turma existente, abre o modal de edição;
      // caso contrário, abre o modal de criar nova turma.
      const t = (search.target ?? "").trim().toLowerCase();
      if (t) {
        const idx = classes.findIndex((c) => c.name.toLowerCase() === t);
        if (idx >= 0) setEditingClassIdx(idx);
        else setClassOpen(true);
      } else {
        setClassOpen(true);
      }
    } else if (open === "students") {
      scrollTo(studentsRef.current); setHighlight("students");
      const t = (search.target ?? "").trim().toLowerCase();
      if (t) {
        const idx = findStudentByTarget(t);
        if (idx >= 0) {
          // Garante que o grupo da turma do aluno esteja expandido.
          const turmaKey = students[idx].classRef || "Sem turma";
          setCollapsedClasses((p) => ({ ...p, [turmaKey]: false }));
          setHighlightedStudentIdx(idx);
          // Se veio com momento, mantém o modal fechado e foca o card.
          // Sem momento, abre o modal de detalhe direto.
          if (m) {
            setStudentDetail(null);
          } else {
            setStudentDetail({ index: idx, student: students[idx] });
          }
        } else {
          // Não casou — mostra empty state em vez de inventar.
          setMissingTarget({ term: search.target ?? "", momento: m ?? null });
        }
      } else {
        setStudentOpen(true);
      }
    } else if (open === "agenda") {
      scrollTo(agendaRef.current); setHighlight("agenda");
    } else if (m && !open) {
      // Só recebeu ?m=... — rola até a lista de alunos para evidenciar PCDs.
      scrollTo(studentsRef.current); setHighlight("students");
      const t = (search.target ?? "").trim();
      if (t) {
        const idx = findStudentByTarget(t);
        if (idx >= 0) {
          const turmaKey = students[idx].classRef || "Sem turma";
          setCollapsedClasses((p) => ({ ...p, [turmaKey]: false }));
          setHighlightedStudentIdx(idx);
          // Após pequena pausa, abre o modal do aluno PCD para mostrar o
          // bloco "Contexto Sofia · M{X}".
          setTimeout(() => {
            setStudentDetail({ index: idx, student: students[idx] });
          }, reduce ? 0 : 450);
        } else {
          setMissingTarget({ term: t, momento: m });
        }
      }
    }
    // Limpa o destaque após 2.5s.
    const t = setTimeout(() => setHighlight(null), 2500);
    // Highlight individual do aluno dura um pouco mais (até o usuário fechar o modal).
    const tStudent = setTimeout(() => setHighlightedStudentIdx(null), 6000);
    // Remove os search params para não reabrir ao voltar.
    const cleanup = setTimeout(() => {
      navigate({ to: "/", search: {}, replace: true });
    }, 600);
    return () => { clearTimeout(t); clearTimeout(tStudent); clearTimeout(cleanup); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.open, search.target, search.m]);

  // Quando entra um momento PCD via deep-link, aplica o filtro PCD na lista.
  useEffect(() => {
    if (pcdMomento) setFilter("pcd");
  }, [pcdMomento]);

  // Texto contextual exibido no banner / modal conforme o momento.
  const pcdMomentoMeta: Record<"m1" | "m3" | "m5", { titulo: string; sub: string; cta: string }> = {
    m1: {
      titulo: "Sofia destacou os alunos PCD para a montagem da semana (M1).",
      sub: "Antes de gerar o plano, revise as anotações pedagógicas para que a Sofia inclua adaptações.",
      cta: "Voltar ao M1",
    },
    m3: {
      titulo: "Edição conversacional (M3) — incluir suportes específicos.",
      sub: "Verifique o que cada aluno PCD precisa antes de pedir à Sofia para ajustar o plano.",
      cta: "Voltar ao M3",
    },
    m5: {
      titulo: "Antes de replicar entre turmas (M5), confira os PCDs.",
      sub: "A turma de destino pode precisar de adaptações que não existem na turma de origem.",
      cta: "Voltar ao M5",
    },
  };

  // Lê os mesmos eventos da Agenda (mesma chave do usePersistentState).
  const [agendaEvents] = usePersistentState<AgendaEvent[]>("agenda_events", []);
  const upcomingAgenda = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const nowHHMM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    return [...agendaEvents]
      .filter((e) => {
        if (e.date > todayKey) return true;
        if (e.date < todayKey) return false;
        if (!e.time) return true;
        return e.time >= nowHHMM;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.time || "99:99").localeCompare(b.time || "99:99");
      });
  }, [agendaEvents]);
  const todayKeyMemo = useMemo(() => {
    const d = new Date(); const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }, []);
  const todayEvents = upcomingAgenda.filter((e) => e.date === todayKeyMemo);
  const agendaToShow = todayEvents.length > 0 ? todayEvents.slice(0, 4) : upcomingAgenda.slice(0, 1);
  const agendaSectionTitle = todayEvents.length > 0 ? "Hoje" : (upcomingAgenda.length > 0 ? "Próximo compromisso" : "");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdk(true); }
      if (e.key === "Escape") setCmdk(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setStreak(updateLoginStreak());
  }, []);

  return (
    <div className="ap-root">
      <style dangerouslySetInnerHTML={{ __html: css + emptyStateCss }} />
      <div className="ap-app">
        <AppSidebar active="home" onCmdK={() => setCmdk(true)} />

        <main className="ap-main">
          <AppHeader
            actions={
              <>
                <button className="ah-icon" aria-label="Buscar" onClick={() => setCmdk(true)}>
                  <Svg c={<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>} />
                </button>
                <button className="ah-icon" aria-label="Notificações">
                  <Svg c={<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>} />
                </button>
                <button className="ah-icon" aria-label="Ajuda">
                  <Svg c={<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>} />
                </button>
              </>
            }
          />

          <section className="hero">
            <div className="hero-left">
              <div className="hero-greet"><span className="live-dot" />Bem-vinda à Sofia</div>
              <h1 className="hero-title">{heroGreeting}.<br />Comece configurando <span className="accent">sua primeira turma.</span></h1>
              <p className="hero-sub">Cadastre suas turmas e alunos para que a Sofia possa te ajudar a gerar pareceres, planos de aula e adaptações em minutos.</p>
              <div className="hero-cta-row">
                <button className="hero-cta" onClick={() => setClassOpen(true)}>
                  Criar primeira turma
                  <Svg strokeWidth={2.5} c={<path d="M5 12h14M13 5l7 7-7 7"/>} />
                </button>
                <button className="hero-cta-ghost">
                  <Svg strokeWidth={2.5} c={<polygon points="5 3 19 12 5 21 5 3"/>} />
                  Tutorial · 90s
                </button>
              </div>
            </div>
            <div className="hero-metric">
              <div className="hero-metric-tag">
                <Svg strokeWidth={2.5} c={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} />
                Tempo devolvido a você
              </div>
              <div className="hero-metric-value">
                <span>{h}</span>h<span className="hero-metric-unit"><span>{m}</span>min</span>
              </div>
              <div className="hero-metric-label">comece a usar a Sofia pra economizar tempo</div>
              <div className="hero-metric-bar"><div className="hero-metric-fill" /></div>
              <div className="hero-metric-foot"><span>Meta: {user.weeklyGoalHours}h</span><span>0%</span></div>
            </div>
          </section>

          {!onboardingDone && (
            <div style={{ marginBottom: 18 }}>
              <SofiaFocoCard showEmptyFallback />
            </div>
          )}

          <div
            className="stats"
            data-sofia-section="stats"
          >
            <button
              ref={schoolsRef as unknown as React.Ref<HTMLButtonElement>}
              className={`stat school-clickable${highlight === "schools" ? " sofia-highlight" : ""}`}
              type="button"
              onClick={() => setSchoolOpen(true)}
              aria-label="Adicionar escola"
              style={{ textAlign: "left" }}
            >
              <div className="stat-icon s1"><Svg c={<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-5h-2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>} /></div>
              <div className="stat-body"><div className="stat-value">{baseSchools + schools.length} {schools.length > 0 && <span className="stat-value-trend">+{schools.length}</span>}</div><div className="stat-label">Escolas</div></div>
            </button>
            <button ref={classesRef as unknown as React.Ref<HTMLButtonElement>} className={`stat school-clickable${highlight === "classes" ? " sofia-highlight" : ""}`} type="button" onClick={() => setClassOpen(true)} aria-label="Adicionar turma" style={{ textAlign: "left" }}>
              <div className="stat-icon s2"><Svg c={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>} /></div>
              <div className="stat-body"><div className="stat-value">{baseClasses + classes.length} {classes.length > 0 && <span className="stat-value-trend">+{classes.length}</span>}</div><div className="stat-label">Turmas ativas</div></div>
            </button>
            <button className="stat school-clickable" type="button" onClick={() => setStudentOpen(true)} aria-label="Adicionar aluno" style={{ textAlign: "left" }}>
              <div className="stat-icon s3"><Svg c={<><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></>} /></div>
              <div className="stat-body"><div className="stat-value">{baseStudents + students.length} {students.length > 0 && <span className="stat-value-trend">+{students.length}</span>}</div><div className="stat-label">Alunos</div></div>
            </button>
            <div className="stat">
              <div className="stat-icon s4"><Svg c={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>} /></div>
              <div className="stat-body"><div className="stat-value">{documentsGenerated}</div><div className="stat-label">Documentos gerados</div></div>
            </div>
          </div>

          <div className="grid-2">
            <div ref={studentsRef as unknown as React.Ref<HTMLDivElement>} className={`card${highlight === "students" ? " sofia-highlight" : ""}`}>
              {pcdMomento && (
                <div
                  role="status"
                  style={{
                    margin: "-2px 0 14px",
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "linear-gradient(135deg,#EDE9FE,#F5F3FF)",
                    border: "1px solid #DDD6FE",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 20, lineHeight: 1 }}>🧒</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "#5B21B6" }}>
                      {pcdMomentoMeta[pcdMomento].titulo}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#6D28D9", marginTop: 3, lineHeight: 1.4 }}>
                      {pcdMomentoMeta[pcdMomento].sub}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => navigate({ to: "/planejamento", search: { m: pcdMomento } })}
                        style={{
                          padding: "6px 12px", borderRadius: 8, border: "none",
                          background: "#7C3AED", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer",
                        }}
                      >
                        {pcdMomentoMeta[pcdMomento].cta}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPcdMomento(null)}
                        style={{
                          padding: "6px 10px", borderRadius: 8, border: "1px solid #DDD6FE",
                          background: "#fff", color: "#6D28D9", fontWeight: 700, fontSize: 12, cursor: "pointer",
                        }}
                      >
                        Dispensar
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div className="card-head">
                <h3 className="card-title">Seus alunos<span className="card-title-count">{totalStudents}</span></h3>
                <div className="filter-pills">
                  <button className={`filter-pill ${filter==="all"?"active":""}`} onClick={() => setFilter("all")}>Todos <span className="count">{totalStudents}</span></button>
                  <button className={`filter-pill ${filter==="pcd"?"active":""}`} onClick={() => setFilter("pcd")}>PCD <span className="count">{students.filter(s => s.pcd && s.pcd !== "nao").length}</span></button>
                  <button className={`filter-pill ${filter==="reg"?"active":""}`} onClick={() => setFilter("reg")}>Regular <span className="count">{students.filter(s => !s.pcd || s.pcd === "nao").length}</span></button>
                </div>
              </div>

              {totalStudents === 0 && totalClasses === 0 ? (
                <EmptyState
                  icon="👥"
                  title="Você ainda não cadastrou alunos."
                  description="Crie sua primeira turma e cadastre os alunos para começar a usar a Sofia."
                  ctaLabel="Cadastrar primeiro aluno"
                  onCta={() => setStudentOpen(true)}
                />
              ) : (
                <div>
                  {(() => {
                    const filtered = students.filter((s) => {
                      if (filter === "pcd") return s.pcd && s.pcd !== "nao";
                      if (filter === "reg") return !s.pcd || s.pcd === "nao";
                      return true;
                    });
                    const grouped = new Map<string, typeof filtered>();
                    classes.forEach((c) => grouped.set(c.name, []));
                    filtered.forEach((s) => {
                      const key = s.classRef || "Sem turma";
                      if (!grouped.has(key)) grouped.set(key, []);
                      grouped.get(key)!.push(s);
                    });
                    const entries = Array.from(grouped.entries()).filter(([k, list]) => list.length > 0 || classes.some((c) => c.name === k));
                    if (entries.length === 0) {
                      return <div style={{ fontSize: 12, color: "var(--text-soft)", padding: "8px 4px" }}>Nenhum aluno neste filtro.</div>;
                    }
                    return entries.map(([turma, list]) => {
                      const classMeta = classes.find((c) => c.name === turma);
                      const isCollapsed = !!collapsedClasses[turma];
                      return (
                        <div key={turma} className="class-group">
                          <div
                            className="class-head"
                            role="button"
                            tabIndex={0}
                            onClick={() => setCollapsedClasses((p) => ({ ...p, [turma]: !p[turma] }))}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCollapsedClasses((p) => ({ ...p, [turma]: !p[turma] })); } }}
                            aria-expanded={!isCollapsed}
                            style={{ cursor: "pointer", userSelect: "none" }}
                          >
                            <div className="class-info">
                              <div className="class-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ display: "inline-block", transition: "transform .15s", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>
                                  <Svg width={12} height={12} c={<polyline points="6 9 12 15 18 9"/>} />
                                </span>
                                {turma}
                              </div>
                              {classMeta && (
                                <div className="class-meta">
                                  {classMeta.school && `${classMeta.school} · `}
                                  {classMeta.shift && `Turno: ${classMeta.shift}`}
                                </div>
                              )}
                            </div>
                            <span className="class-count">{list.length} {list.length === 1 ? "aluno" : "alunos"}</span>
                            {classMeta && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setEditingClassIdx(classes.indexOf(classMeta)); }}
                                aria-label={`Editar turma ${turma}`}
                                title="Editar turma"
                                style={{ marginLeft: 8, background: "transparent", border: "1px solid var(--border, #E4E8F0)", borderRadius: 6, padding: "3px 6px", cursor: "pointer", color: "var(--text-soft, #6B7691)", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600 }}
                              >
                                <Svg width={12} height={12} c={<><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></>} />
                                Editar
                              </button>
                            )}
                          </div>
                          {!isCollapsed && list.map((s, i) => {
                            const initials = s.name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";
                            const isPcd = s.pcd && s.pcd !== "nao";
                            const cidInfo = isPcd ? CID_LABEL[s.pcd] : null;
                            const avClass = `av-${(i % 3) + 1}`;
                            const realIndex = students.indexOf(s);
                            const isHighlighted = realIndex === highlightedStudentIdx;
                            return (
                              <button
                                key={`${turma}-${i}`}
                                type="button"
                                className={`student${isHighlighted ? " sofia-highlight" : ""}`}
                                onClick={() => setStudentDetail({ index: realIndex, student: s })}
                                style={{ width: "100%", textAlign: "left", background: "transparent", cursor: "pointer", font: "inherit" }}
                              >
                                <div className={`student-avatar ${avClass}`}>{initials}</div>
                                <div className="student-info">
                                  <div className="student-name">
                                    {s.name}
                                    {isPcd && (
                                      <span className="student-tag">
                                        PCD{cidInfo?.cid && cidInfo.cid !== "—" ? ` · ${cidInfo.cid}` : ""}
                                      </span>
                                    )}
                                  </div>
                                  {(s.notes || cidInfo?.label) && (
                                    <div className="student-meta">{s.notes || cidInfo?.label}</div>
                                  )}
                                </div>
                                <Svg width={14} height={14} c={<polyline points="9 18 15 12 9 6"/>} />
                              </button>
                            );
                          })}
                        </div>
                      );
                    });
                  })()}
                  <button
                    type="button"
                    className="btn-add"
                    onClick={() => setStudentOpen(true)}
                    style={{ marginTop: 12 }}
                  >
                    <Svg c={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>} />
                    Adicionar aluno
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div className="card">
                <div className="card-head">
                  <h3 className="card-title">📈 Esta semana</h3>
                  <a href="#" className="card-link">Ver tudo<Svg strokeWidth={2.5} c={<path d="M5 12h14M13 5l7 7-7 7"/>} /></a>
                </div>
                <EmptyState
                  icon="📈"
                  title="Suas atividades aparecerão aqui conforme você usar a Sofia."
                />
                <button
                  type="button"
                  className="sofia-week-ask"
                  onClick={() => sofia.openSofia({
                    prompt: "Me dê um panorama desta semana: o que aconteceu, o que falta e onde devo focar amanhã?",
                    context: "Tela: Página inicial · card Esta semana",
                  })}
                >
                  💬 Pergunte à Sofia sobre esta semana
                </button>
              </div>

              <div ref={agendaRef as unknown as React.Ref<HTMLDivElement>} className={`card${highlight === "agenda" ? " sofia-highlight" : ""}`}>
                <div className="card-head">
                  <h3 className="card-title">🗓️ Agenda</h3>
                  <button
                    type="button"
                    className="card-link"
                    onClick={() => navigate({ to: "/agenda" })}
                    style={{ background: "transparent", border: 0, padding: 0, font: "inherit", cursor: "pointer", color: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    Abrir<Svg strokeWidth={2.5} c={<path d="M5 12h14M13 5l7 7-7 7"/>} />
                  </button>
                </div>
                {agendaToShow.length === 0 ? (
                  <div className="agenda-empty">
                    <div className="agenda-empty-icon">📭</div>
                    <div className="agenda-empty-title">Sua semana está livre</div>
                    <p className="agenda-empty-sub">Adicione provas, entregas e reuniões pra não esquecer.</p>
                    <button className="btn-add" onClick={() => navigate({ to: "/agenda" })}>
                      <Svg strokeWidth={2.5} c={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>} />
                      Adicionar evento
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".08em" }}>
                      {agendaSectionTitle}
                    </div>
                    {agendaToShow.map((ev) => {
                      const [, mm, dd] = ev.date.split("-");
                      const color = AGENDA_TYPE_COLOR[ev.type];
                      const isToday = ev.date === todayKeyMemo;
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => navigate({ to: "/agenda" })}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "10px 12px", borderRadius: 10,
                            background: isToday ? "color-mix(in oklab, var(--accent) 8%, white)" : "var(--bg-soft)",
                            border: isToday ? "2px solid var(--accent)" : "1px solid var(--border-soft)",
                            boxShadow: isToday ? "0 4px 12px color-mix(in oklab, var(--accent) 22%, transparent)" : "none",
                            cursor: "pointer", textAlign: "left", width: "100%",
                          }}
                        >
                          <div style={{
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                            minWidth: 38, padding: "4px 0", borderRadius: 8,
                            background: "#fff", border: "1px solid var(--border)",
                          }}>
                            <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 800, fontSize: 14, color: "var(--primary)", lineHeight: 1 }}>{dd}</div>
                            <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginTop: 2 }}>
                              {MONTHS_PT_SHORT[Number(mm) - 1]}
                            </div>
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                              <span style={{
                                fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em",
                                padding: "2px 6px", borderRadius: 5,
                                background: `color-mix(in oklab, ${color} 18%, white)`, color,
                              }}>
                                {AGENDA_TYPE_LABEL[ev.type]}
                              </span>
                              {isToday && (
                                <span style={{
                                  fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em",
                                  padding: "2px 7px", borderRadius: 100,
                                  background: "var(--accent)", color: "#fff",
                                  boxShadow: "0 2px 6px color-mix(in oklab, var(--accent) 35%, transparent)",
                                }}>
                                  ● Hoje
                                </span>
                              )}
                              {ev.time && (
                                <span style={{ fontSize: 11, color: "var(--text-soft)", fontWeight: 600 }}>{ev.time}</span>
                              )}
                            </div>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {ev.title}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {upcomingAgenda.length > agendaToShow.length && (
                      <button
                        type="button"
                        onClick={() => navigate({ to: "/agenda" })}
                        style={{
                          marginTop: 2, padding: "6px 0", border: 0, background: "transparent",
                          color: "var(--accent)", fontWeight: 700, fontSize: 11.5, cursor: "pointer",
                          textTransform: "uppercase", letterSpacing: ".05em", textAlign: "center",
                        }}
                      >
                        Ver todos ({upcomingAgenda.length})
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="viral-strip">
            <div className="viral-icon">🎁</div>
            <div className="viral-content">
              <div className="viral-title">Convide outra professora e <strong>ganhe 1 mês grátis</strong> · ela também ganha 30 dias</div>
              <div className="viral-sub">Compartilhe seu link único com colegas que também sofrem com pareceres no fim do bimestre.</div>
            </div>
            <button className="viral-action">
              Compartilhar link
              <Svg strokeWidth={2.5} c={<><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></>} />
            </button>
          </div>

          <div className="authorize">
            <div className="authorize-icon">📝</div>
            <div className="authorize-content">
              <div className="authorize-title">Autorizar nome nos documentos gerados</div>
              <div className="authorize-sub">Seu nome será incluído como autor(a) nos relatórios e planejamentos exportados.</div>
            </div>
            <button className={`toggle-switch ${authorize ? "on" : ""}`} aria-label="Autorizar" onClick={() => setAuthorize(v => !v)} />
          </div>
        </main>
      </div>

      <div className={`cmdk-overlay ${schoolOpen ? "show" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) setSchoolOpen(false); }}>
        <div className="school-modal" role="dialog" aria-label="Cadastrar escola">
          <div className="school-modal-head">
            <div className="school-modal-icon">
              <Svg c={<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-5h-2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>} />
            </div>
            <div>
              <div className="school-modal-title">Cadastrar nova escola</div>
              <div className="school-modal-sub">Preencha os dados para vincular turmas e alunos.</div>
            </div>
            <button className="school-modal-close" aria-label="Fechar" onClick={() => setSchoolOpen(false)}>
              <Svg c={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />
            </button>
          </div>
          <form className="school-modal-body" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const name = String(fd.get("name") || "").trim();
            if (!name) return;
            setSchools((arr) => [...arr, {
              name,
              network: String(fd.get("network") || ""),
              stage: String(fd.get("stage") || ""),
              city: String(fd.get("city") || ""),
              uf: String(fd.get("uf") || "").toUpperCase(),
              classes: String(fd.get("classes") || ""),
            }]);
            (e.currentTarget as HTMLFormElement).reset();
            setSchoolOpen(false);
          }}>
            <div className="school-field">
              <label htmlFor="school-name">Nome da escola</label>
              <input id="school-name" name="name" placeholder="Ex.: nome da sua escola" required />
            </div>
            <div className="school-row">
              <div className="school-field">
                <label htmlFor="school-network">Rede</label>
                <select id="school-network" name="network" defaultValue="municipal">
                  <option value="municipal">Municipal</option>
                  <option value="estadual">Estadual</option>
                  <option value="federal">Federal</option>
                  <option value="privada">Privada</option>
                </select>
              </div>
              <div className="school-field">
                <label htmlFor="school-stage">Etapa</label>
                <select id="school-stage" name="stage" defaultValue="fundamental1">
                  <option value="infantil">Educação Infantil</option>
                  <option value="fundamental1">Fund. I</option>
                  <option value="fundamental2">Fund. II</option>
                  <option value="medio">Ensino Médio</option>
                </select>
              </div>
            </div>
            <div className="school-row">
              <div className="school-field">
                <label htmlFor="school-city">Cidade</label>
                <input id="school-city" name="city" placeholder="Cidade" />
              </div>
              <div className="school-field">
                <label htmlFor="school-uf">UF</label>
                <input id="school-uf" name="uf" placeholder="UF" maxLength={2} />
              </div>
            </div>
            <div className="school-field">
              <label htmlFor="school-classes">Turmas que você leciona</label>
              <input id="school-classes" name="classes" placeholder="Ex.: 2º ano A, 3º ano B" />
            </div>
            <div className="school-modal-foot" style={{ margin: "4px -20px -16px", borderRadius: 0 }}>
              <button type="button" className="school-cancel" onClick={() => setSchoolOpen(false)}>Cancelar</button>
              <button type="submit" className="school-save">
                Salvar escola
                <Svg width={14} height={14} c={<><polyline points="20 6 9 17 4 12"/></>} />
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className={`cmdk-overlay ${classOpen ? "show" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) setClassOpen(false); }}>
        <div className="school-modal" role="dialog" aria-label="Cadastrar turma">
          <div className="school-modal-head">
            <div className="school-modal-icon">
              <Svg c={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>} />
            </div>
            <div>
              <div className="school-modal-title">Cadastrar nova turma</div>
              <div className="school-modal-sub">Vincule a turma a uma escola e defina turno e série.</div>
            </div>
            <button className="school-modal-close" aria-label="Fechar" onClick={() => setClassOpen(false)}>
              <Svg c={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />
            </button>
          </div>
          <form className="school-modal-body" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const name = String(fd.get("name") || "").trim();
            if (!name) return;
            setClasses((arr) => [...arr, {
              name,
              school: String(fd.get("school") || ""),
              grade: String(fd.get("grade") || ""),
              shift: String(fd.get("shift") || ""),
              students: String(fd.get("students") || ""),
            }]);
            (e.currentTarget as HTMLFormElement).reset();
            setClassOpen(false);
          }}>
            <div className="school-field">
              <label htmlFor="class-name">Nome da turma</label>
              <input id="class-name" name="name" placeholder="Ex.: 2º ano A" required />
            </div>
            <div className="school-field">
              <label htmlFor="class-school">Escola</label>
              {schools.length > 0 ? (
                <select id="class-school" name="school" defaultValue="">
                  <option value="">Sem escola vinculada</option>
                  {schools.map((sch, i) => (
                    <option key={`${sch.name}-${i}`} value={sch.name}>{sch.name}</option>
                  ))}
                </select>
              ) : (
                <input id="class-school" name="school" placeholder="Cadastre uma escola para vincular" />
              )}
              {schools.length === 0 && (
                <span className="school-hint">
                  <button
                    type="button"
                    onClick={() => { setClassOpen(false); setSchoolOpen(true); }}
                    style={{ background: "none", border: 0, color: "var(--accent)", padding: 0, cursor: "pointer", font: "inherit", fontWeight: 700 }}
                  >+ Cadastrar nova escola</button>
                </span>
              )}
            </div>
            <div className="school-row">
              <div className="school-field">
                <label htmlFor="class-grade">Série / Ano</label>
                <select id="class-grade" name="grade" defaultValue="2">
                  {["1","2","3","4","5","6","7","8","9"].map((g) => <option key={g} value={g}>{g}º ano</option>)}
                </select>
              </div>
              <div className="school-field">
                <label htmlFor="class-shift">Turno</label>
                <select id="class-shift" name="shift" defaultValue="manha">
                  <option value="manha">Manhã</option>
                  <option value="tarde">Tarde</option>
                  <option value="integral">Integral</option>
                  <option value="noite">Noite</option>
                </select>
              </div>
            </div>
            <div className="school-field">
              <label htmlFor="class-students">Nº de alunos</label>
              <input id="class-students" name="students" type="number" min={1} placeholder="Ex.: 24" />
            </div>
            <div className="school-modal-foot" style={{ margin: "4px -20px -16px", borderRadius: 0 }}>
              <button type="button" className="school-cancel" onClick={() => setClassOpen(false)}>Cancelar</button>
              <button type="submit" className="school-save">
                Salvar turma
                <Svg width={14} height={14} c={<><polyline points="20 6 9 17 4 12"/></>} />
              </button>
            </div>
          </form>
        </div>
      </div>

      {editingClassIdx !== null && classes[editingClassIdx] && (
        <div className="cmdk-overlay show" onClick={(e) => { if (e.target === e.currentTarget) setEditingClassIdx(null); }}>
          <div className="school-modal" role="dialog" aria-label="Editar turma">
            <div className="school-modal-head">
              <div className="school-modal-icon">
                <Svg c={<><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></>} />
              </div>
              <div>
                <div className="school-modal-title">Editar turma</div>
                <div className="school-modal-sub">Atualize os dados da turma selecionada.</div>
              </div>
              <button className="school-modal-close" aria-label="Fechar" onClick={() => setEditingClassIdx(null)}>
                <Svg c={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />
              </button>
            </div>
            <form className="school-modal-body" onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const name = String(fd.get("name") || "").trim();
              if (!name) return;
              const oldName = classes[editingClassIdx!].name;
              const updated = {
                name,
                school: String(fd.get("school") || ""),
                grade: String(fd.get("grade") || ""),
                shift: String(fd.get("shift") || ""),
                students: String(fd.get("students") || ""),
              };
              setClasses((arr) => arr.map((c, i) => i === editingClassIdx ? updated : c));
              if (oldName !== name) {
                setStudents((arr) => arr.map((s) => s.classRef === oldName ? { ...s, classRef: name } : s));
              }
              setEditingClassIdx(null);
            }}>
              <div className="school-field">
                <label htmlFor="edit-class-name">Nome da turma</label>
                <input id="edit-class-name" name="name" defaultValue={classes[editingClassIdx].name} required />
              </div>
              <div className="school-field">
                <label htmlFor="edit-class-school">Escola</label>
                {schools.length > 0 ? (
                  <select id="edit-class-school" name="school" defaultValue={classes[editingClassIdx].school}>
                    <option value="">Sem escola vinculada</option>
                    {schools.map((sch, i) => (
                      <option key={`${sch.name}-${i}`} value={sch.name}>{sch.name}</option>
                    ))}
                  </select>
                ) : (
                  <input id="edit-class-school" name="school" defaultValue={classes[editingClassIdx].school} />
                )}
              </div>
              <div className="school-row">
                <div className="school-field">
                  <label htmlFor="edit-class-grade">Série / Ano</label>
                  <select id="edit-class-grade" name="grade" defaultValue={classes[editingClassIdx].grade || "2"}>
                    {["1","2","3","4","5","6","7","8","9"].map((g) => <option key={g} value={g}>{g}º ano</option>)}
                  </select>
                </div>
                <div className="school-field">
                  <label htmlFor="edit-class-shift">Turno</label>
                  <select id="edit-class-shift" name="shift" defaultValue={classes[editingClassIdx].shift || "manha"}>
                    <option value="manha">Manhã</option>
                    <option value="tarde">Tarde</option>
                    <option value="integral">Integral</option>
                    <option value="noite">Noite</option>
                  </select>
                </div>
              </div>
              <div className="school-field">
                <label htmlFor="edit-class-students">Nº de alunos</label>
                <input id="edit-class-students" name="students" type="number" min={1} defaultValue={classes[editingClassIdx].students} />
              </div>
              <div className="school-modal-foot" style={{ margin: "4px -20px -16px", borderRadius: 0, justifyContent: "space-between" }}>
                <button
                  type="button"
                  className="school-cancel"
                  style={{ color: "#DC2626" }}
                  onClick={() => {
                    if (!confirm("Excluir esta turma? Os alunos vinculados ficarão sem turma.")) return;
                    const oldName = classes[editingClassIdx!].name;
                    setClasses((arr) => arr.filter((_, i) => i !== editingClassIdx));
                    setStudents((arr) => arr.map((s) => s.classRef === oldName ? { ...s, classRef: "" } : s));
                    setEditingClassIdx(null);
                  }}
                >Excluir</button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="school-cancel" onClick={() => setEditingClassIdx(null)}>Cancelar</button>
                  <button type="submit" className="school-save">
                    Salvar
                    <Svg width={14} height={14} c={<><polyline points="20 6 9 17 4 12"/></>} />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={`cmdk-overlay ${studentOpen ? "show" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) setStudentOpen(false); }}>
        <div className="school-modal" role="dialog" aria-label="Cadastrar aluno">
          <div className="school-modal-head">
            <div className="school-modal-icon">
              <Svg c={<><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></>} />
            </div>
            <div>
              <div className="school-modal-title">Cadastrar novo aluno</div>
              <div className="school-modal-sub">Adicione um aluno ou cole vários nomes de uma vez.</div>
            </div>
            <button className="school-modal-close" aria-label="Fechar" onClick={() => setStudentOpen(false)}>
              <Svg c={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />
            </button>
          </div>
          <form className="school-modal-body" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const className = studentClassSel || String(fd.get("classRefManual") || "").trim();
            const schoolName = studentSchoolSel || (classes.find((c) => c.name === studentClassSel)?.school || "");
            const classRef = className
              ? (schoolName ? `${className} · ${schoolName}` : className)
              : (schoolName || "");
            const pcd = String(fd.get("pcd") || "nao");
            if (bulkMode) {
              const raw = String(fd.get("names") || "");
              const names = raw
                .split(/[\n,;]+/)
                .map((s) => s.trim())
                .filter((s) => s.length > 0 && s.length <= 120);
              if (names.length === 0) return;
              setStudents((arr) => [
                ...arr,
                ...names.map((name) => ({ name, classRef, birth: "", pcd, notes: "", createdAt: new Date().toISOString() })),
              ]);
            } else {
              const name = String(fd.get("name") || "").trim();
              if (!name) return;
              setStudents((arr) => [...arr, {
                name,
                classRef,
                birth: String(fd.get("birth") || ""),
                pcd,
                notes: String(fd.get("notes") || ""),
                createdAt: new Date().toISOString(),
              }]);
            }
            (e.currentTarget as HTMLFormElement).reset();
            setStudentClassSel(""); setStudentSchoolSel("");
            setStudentOpen(false);
          }}>
            <div className="school-mode" role="tablist" aria-label="Modo de cadastro">
              <button type="button" role="tab" aria-selected={!bulkMode} className={!bulkMode ? "active" : ""} onClick={() => setBulkMode(false)}>Individual</button>
              <button type="button" role="tab" aria-selected={bulkMode} className={bulkMode ? "active" : ""} onClick={() => setBulkMode(true)}>Em massa</button>
            </div>
            {bulkMode ? (
              <div className="school-field">
                <label htmlFor="student-names">Nomes dos alunos</label>
                <textarea
                  id="student-names"
                  name="names"
                  placeholder={"Cole um nome por linha (um nome por aluno)."}
                  required
                />
                <span className="school-hint">Um nome por linha (também aceita vírgula ou ponto e vírgula).</span>
              </div>
            ) : (
              <div className="school-field">
                <label htmlFor="student-name">Nome completo</label>
                <input id="student-name" name="name" placeholder="Ex.: Nome completo do aluno" required maxLength={120} />
              </div>
            )}
            <div className="school-row">
              <div className="school-field">
                <label htmlFor="student-school">Escola</label>
                {schools.length > 0 ? (
                  <select
                    id="student-school"
                    value={studentSchoolSel}
                    onChange={(e) => {
                      setStudentSchoolSel(e.target.value);
                      // Se a turma selecionada não pertence à escola escolhida, limpa
                      const cls = classes.find((c) => c.name === studentClassSel);
                      if (cls && e.target.value && cls.school !== e.target.value) setStudentClassSel("");
                    }}
                  >
                    <option value="">Sem escola</option>
                    {schools.map((sch, i) => (
                      <option key={`${sch.name}-${i}`} value={sch.name}>{sch.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="student-school"
                    value={studentSchoolSel}
                    onChange={(e) => setStudentSchoolSel(e.target.value)}
                    placeholder="Cadastre uma escola"
                  />
                )}
              </div>
              <div className="school-field">
                <label htmlFor="student-class">Turma</label>
                {classes.length > 0 ? (
                  <select
                    id="student-class"
                    value={studentClassSel}
                    onChange={(e) => {
                      const v = e.target.value;
                      setStudentClassSel(v);
                      // Auto-vincula escola da turma escolhida
                      const cls = classes.find((c) => c.name === v);
                      if (cls?.school) setStudentSchoolSel(cls.school);
                    }}
                  >
                    <option value="">Sem turma</option>
                    {classes
                      .filter((c) => !studentSchoolSel || c.school === studentSchoolSel || !c.school)
                      .map((c, i) => (
                        <option key={`${c.name}-${i}`} value={c.name}>
                          {c.name}{c.school ? ` · ${c.school}` : ""}
                        </option>
                      ))}
                  </select>
                ) : (
                  <input
                    id="student-class"
                    name="classRefManual"
                    placeholder="Cadastre uma turma"
                  />
                )}
              </div>
            </div>
            {!bulkMode && (
              <div className="school-field">
                <label htmlFor="student-birth">Data de nascimento</label>
                <input id="student-birth" name="birth" type="date" />
              </div>
            )}
            {(classes.length === 0 || schools.length === 0) && (
              <span className="school-hint" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {schools.length === 0 && (
                  <button
                    type="button"
                    onClick={() => { setStudentOpen(false); setSchoolOpen(true); }}
                    style={{ background: "none", border: 0, color: "var(--accent)", padding: 0, cursor: "pointer", font: "inherit", fontWeight: 700 }}
                  >+ Cadastrar escola</button>
                )}
                {classes.length === 0 && (
                  <button
                    type="button"
                    onClick={() => { setStudentOpen(false); setClassOpen(true); }}
                    style={{ background: "none", border: 0, color: "var(--accent)", padding: 0, cursor: "pointer", font: "inherit", fontWeight: 700 }}
                  >+ Cadastrar turma</button>
                )}
              </span>
            )}
            {!bulkMode && (
              <div className="school-field">
                <label htmlFor="student-pcd">PCD / laudo</label>
                <select id="student-pcd" name="pcd" defaultValue="nao">
                  <option value="nao">Não é PCD</option>
                  <option value="nao_informado">PCD — Não informado</option>
                  {CID_OPTIONS.filter((o) => o.value !== "nao_informado").map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.cid && o.cid !== "—" ? `${o.label} · CID ${o.cid}` : o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {!bulkMode && (
              <div className="school-field">
                <label htmlFor="student-notes">Observações pedagógicas</label>
                <input id="student-notes" name="notes" placeholder="Pontos fortes, atenção, etc." />
              </div>
            )}
            <div className="school-modal-foot" style={{ margin: "4px -20px -16px", borderRadius: 0 }}>
              <button type="button" className="school-cancel" onClick={() => setStudentOpen(false)}>Cancelar</button>
              <button type="submit" className="school-save">
                {bulkMode ? "Salvar alunos" : "Salvar aluno"}
                <Svg width={14} height={14} c={<><polyline points="20 6 9 17 4 12"/></>} />
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className={`cmdk-overlay ${cmdk ? "show" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) setCmdk(false); }}>
        <div className="cmdk">
          <input className="cmdk-input" placeholder="O que você quer fazer? (ex: gerar parecer, adicionar aluno...)" autoComplete="off" autoFocus={cmdk} />
          <div className="cmdk-list">
              <div className="cmdk-section">Sugestões da IA</div>
              <DashboardCmdkSuggestions />
            <div className="cmdk-section">Ir para</div>
            <div className="cmdk-item">
              <Svg c={<rect x="3" y="4" width="18" height="18" rx="2"/>} />
              Planejamento<span className="cmdk-item-shortcut">G P</span>
            </div>
            <div className="cmdk-item">
              <Svg c={<><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></>} />
              Inclusão<span className="cmdk-item-shortcut">G I</span>
            </div>
            <div className="cmdk-section">Ações rápidas</div>
            <div className="cmdk-item">
              <Svg c={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>} />
              Cadastrar novo aluno<span className="cmdk-item-shortcut">N A</span>
            </div>
            <div className="cmdk-item">
              <Svg c={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>} />
              Importar lista de alunos (CSV)
            </div>
          </div>
        </div>
      </div>

      <div
        className={`cmdk-overlay ${studentDetail ? "show" : ""}`}
        onClick={(e) => { if (e.target === e.currentTarget) { setStudentDetail(null); setEditingStudent(false); } }}
        style={{ paddingTop: 80 }}
      >
        {studentDetail && (() => {
          const s = studentDetail.student;
          const isPcd = s.pcd && s.pcd !== "nao";
          const cidInfo = isPcd ? CID_LABEL[s.pcd] : null;
          const initials = s.name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";
          const fmt = (iso?: string) => {
            if (!iso) return "—";
            try { return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); } catch { return iso; }
          };
          const fmtBirth = (d?: string) => {
            if (!d) return "—";
            try { return new Date(d + "T00:00:00").toLocaleDateString("pt-BR"); } catch { return d; }
          };
          const f = editForm ?? s;
          const updateField = <K extends keyof DashStudent>(k: K, v: DashStudent[K]) =>
            setEditForm((prev) => ({ ...(prev ?? s), [k]: v }));
          const closeAll = () => { setStudentDetail(null); setEditingStudent(false); setEditForm(null); };
          return (
            <div className="school-modal" role="dialog" aria-label={`Detalhes de ${s.name}`}>
              <div className="school-modal-head">
                <div className="student-avatar av-1" style={{ width: 44, height: 44, fontSize: 14 }}>{initials}</div>
                <div>
                  <div className="school-modal-title">{s.name}</div>
                  <div className="school-modal-sub">{s.classRef || "Sem turma"}</div>
                </div>
                <button className="school-modal-close" aria-label="Fechar" onClick={closeAll}>
                  <Svg c={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />
                </button>
              </div>
              <div className="school-modal-body">
                {editingStudent ? (
                  <>
                    <div className="school-field">
                      <label htmlFor="edit-name">Nome completo</label>
                      <input id="edit-name" value={f.name} onChange={(e) => updateField("name", e.target.value)} maxLength={120} required />
                    </div>
                    <div className="school-row">
                      <div className="school-field">
                        <label htmlFor="edit-school">Escola</label>
                        {(() => {
                          const [curClass, curSchool] = (f.classRef || "").split(" · ").map((p) => p.trim());
                          const setClassRef = (cls: string, sch: string) =>
                            updateField("classRef", cls ? (sch ? `${cls} · ${sch}` : cls) : (sch || ""));
                          return schools.length > 0 ? (
                            <select
                              id="edit-school"
                              value={curSchool || ""}
                              onChange={(e) => {
                                const sch = e.target.value;
                                const cls = classes.find((c) => c.name === curClass);
                                const newCls = cls && cls.school && cls.school !== sch ? "" : (curClass || "");
                                setClassRef(newCls, sch);
                              }}
                            >
                              <option value="">Sem escola</option>
                              {schools.map((sch, i) => (
                                <option key={`${sch.name}-${i}`} value={sch.name}>{sch.name}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              id="edit-school"
                              value={curSchool || ""}
                              onChange={(e) => setClassRef(curClass || "", e.target.value)}
                              placeholder="Sem escolas cadastradas"
                            />
                          );
                        })()}
                      </div>
                      <div className="school-field">
                        <label htmlFor="edit-class">Turma</label>
                        {(() => {
                          const [curClass, curSchool] = (f.classRef || "").split(" · ").map((p) => p.trim());
                          const setClassRef = (cls: string, sch: string) =>
                            updateField("classRef", cls ? (sch ? `${cls} · ${sch}` : cls) : (sch || ""));
                          return classes.length > 0 ? (
                            <select
                              id="edit-class"
                              value={curClass || ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                const cls = classes.find((c) => c.name === v);
                                setClassRef(v, cls?.school || curSchool || "");
                              }}
                            >
                              <option value="">Sem turma</option>
                              {classes
                                .filter((c) => !curSchool || c.school === curSchool || !c.school)
                                .map((c, i) => (
                                  <option key={`${c.name}-${i}`} value={c.name}>
                                    {c.name}{c.school ? ` · ${c.school}` : ""}
                                  </option>
                                ))}
                            </select>
                          ) : (
                            <input
                              id="edit-class"
                              value={curClass || ""}
                              onChange={(e) => setClassRef(e.target.value, curSchool || "")}
                              placeholder="Sem turmas cadastradas"
                            />
                          );
                        })()}
                      </div>
                    </div>
                    <div className="school-row">
                      <div className="school-field">
                        <label htmlFor="edit-birth">Nascimento</label>
                        <input id="edit-birth" type="date" value={f.birth} onChange={(e) => updateField("birth", e.target.value)} />
                      </div>
                      <div className="school-field" />
                    </div>
                    <div className="school-field">
                      <label htmlFor="edit-pcd">PCD / laudo</label>
                      <select id="edit-pcd" value={f.pcd} onChange={(e) => updateField("pcd", e.target.value)}>
                        <option value="nao">Não é PCD</option>
                        <option value="nao_informado">PCD — Não informado</option>
                        {CID_OPTIONS.filter((o) => o.value !== "nao_informado").map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.cid && o.cid !== "—" ? `${o.label} · CID ${o.cid}` : o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="school-field">
                      <label htmlFor="edit-notes">Anotações pedagógicas</label>
                      <textarea id="edit-notes" value={f.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder="Pontos fortes, atenção, etc." />
                    </div>
                  </>
                ) : (
                <>
                <div className="school-row">
                  <div className="school-field">
                    <label>Turma</label>
                    <div style={{ fontSize: 13.5, color: "var(--text)", padding: "8px 0" }}>{s.classRef || "—"}</div>
                  </div>
                  <div className="school-field">
                    <label>Nascimento</label>
                    <div style={{ fontSize: 13.5, color: "var(--text)", padding: "8px 0" }}>{fmtBirth(s.birth)}</div>
                  </div>
                </div>

                <div className="school-field">
                  <label>PCD / CID</label>
                  <div style={{ fontSize: 13.5, color: "var(--text)", padding: "8px 0", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {isPcd ? (
                      <>
                        <span className="student-tag">PCD</span>
                        <span>{cidInfo?.label || s.pcd}</span>
                        {cidInfo?.cid && cidInfo.cid !== "—" && (
                          <span style={{ fontSize: 11, color: "var(--text-soft)", fontWeight: 700 }}>CID {cidInfo.cid}</span>
                        )}
                      </>
                    ) : <span style={{ color: "var(--text-soft)" }}>Não é PCD</span>}
                  </div>
                </div>

                {isPcd && pcdMomento && (
                  <div
                    style={{
                      padding: "10px 12px", borderRadius: 9,
                      background: "#F5F3FF", border: "1px solid #DDD6FE",
                      fontSize: 12.5, color: "#5B21B6", lineHeight: 1.45,
                      display: "flex", flexDirection: "column", gap: 6,
                    }}
                  >
                    <strong>Contexto Sofia · {pcdMomento.toUpperCase()}</strong>
                    <span>{pcdMomentoMeta[pcdMomento].sub}</span>
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/planejamento", search: { m: pcdMomento } })}
                      style={{
                        alignSelf: "flex-start",
                        padding: "5px 10px", borderRadius: 7, border: "none",
                        background: "#7C3AED", color: "#fff", fontWeight: 700, fontSize: 11.5, cursor: "pointer",
                      }}
                    >
                      {pcdMomentoMeta[pcdMomento].cta}
                    </button>
                  </div>
                )}

                <div className="school-field">
                  <label>Anotações pedagógicas</label>
                  <div style={{
                    fontSize: 13.5, color: "var(--text)", padding: "10px 12px",
                    background: "var(--bg-soft)", border: "1px solid var(--border-soft)",
                    borderRadius: 9, lineHeight: 1.5, minHeight: 60, whiteSpace: "pre-wrap",
                  }}>
                    {s.notes || <span style={{ color: "var(--text-soft)" }}>Sem anotações.</span>}
                  </div>
                </div>

                <div className="school-field">
                  <label>Histórico de cadastro</label>
                  <div style={{
                    fontSize: 12.5, color: "var(--text-soft)",
                    padding: "10px 12px", background: "var(--bg-soft)",
                    border: "1px solid var(--border-soft)", borderRadius: 9,
                    display: "flex", flexDirection: "column", gap: 6,
                  }}>
                    <div>📌 Cadastrado em: <strong style={{ color: "var(--text)" }}>{fmt(s.createdAt)}</strong></div>
                    <div>🏷️ Turma vinculada: <strong style={{ color: "var(--text)" }}>{s.classRef || "—"}</strong></div>
                    <div>🩺 Status PCD: <strong style={{ color: "var(--text)" }}>{isPcd ? (cidInfo?.label || s.pcd) : "Não é PCD"}</strong></div>
                  </div>
                </div>
                </>
                )}
              </div>
              <div className="school-modal-foot">
                {editingStudent ? (
                  <>
                    <button
                      type="button"
                      className="school-cancel"
                      style={{ marginLeft: 0 }}
                      onClick={() => { setEditingStudent(false); setEditForm(null); }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="school-save"
                      onClick={() => {
                        if (!editForm) { setEditingStudent(false); return; }
                        const trimmed = { ...editForm, name: editForm.name.trim() };
                        if (!trimmed.name) return;
                        setStudents((arr) => arr.map((x, idx) => idx === studentDetail.index ? trimmed : x));
                        setStudentDetail({ index: studentDetail.index, student: trimmed });
                        setEditingStudent(false);
                        setEditForm(null);
                      }}
                    >
                      Salvar alterações
                      <Svg width={14} height={14} c={<><polyline points="20 6 9 17 4 12"/></>} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="school-cancel"
                      style={{ marginLeft: 0, color: "#B91C1C", borderColor: "#FCA5A5" }}
                      onClick={() => {
                        if (!confirm(`Remover ${s.name}?`)) return;
                        setStudents((arr) => arr.filter((_, idx) => idx !== studentDetail.index));
                        closeAll();
                      }}
                    >
                      <Svg width={13} height={13} c={<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>} />
                      Remover
                    </button>
                    <button
                      type="button"
                      className="school-save"
                      onClick={() => { setEditForm(s); setEditingStudent(true); }}
                    >
                      <Svg width={13} height={13} c={<><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></>} />
                      Editar
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function DashboardCmdkSuggestions() {
  const { suggestions } = useSofiaSuggestions("cmdk");
  return <SofiaSuggestionList suggestions={suggestions} variant="compact" />;
}
