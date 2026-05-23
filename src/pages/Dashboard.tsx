import { Header as AppHeader, appHeaderCss } from "@/components/Header";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { AppSidebar, sidebarCss } from "@/components/AppSidebar";
import { EmptyState, emptyStateCss } from "@/components/EmptyState";
import { useUser, greeting } from "@/lib/mockData";
import { updateLoginStreak } from "@/lib/datetime";
import { useSofiaContext } from "@/lib/sofia/sofiaContext";
import { useHydrated } from "@/hooks/useHydrated";
import { CID_OPTIONS } from "@/lib/cidsBR";
import { useSofia } from "@/components/sofia/SofiaProvider";
import { useEiMode } from "@/lib/ei/useEiMode";
import { SofiaSuggestionList } from "@/components/sofia/SofiaSuggestionCard";
import { SofiaFocoCard } from "@/components/sofia/SofiaFocoCard";
import { SofiaAdaptacaoCard } from "@/components/sofia/SofiaAdaptacaoCard";
import { SofiaErrorBoundary } from "@/components/sofia/SofiaErrorBoundary";
import { AtividadeFeed } from "@/components/dashboard/AtividadeFeed";
import { CreditosPainel } from "@/components/dashboard/CreditosPainel";
import { CurriculoMunicipalCard } from "@/components/settings/CurriculoMunicipalCard";
import { useCurriculoMunicipal } from "@/hooks/useCurriculoMunicipal";
import { useActivityFeed, relativeTime, type ActivityType } from "@/lib/activity/activityLog";
import { useSofiaSuggestions } from "@/components/sofia/useSofiaSuggestions";
import { SofiaActiveChip } from "@/components/sofia/SofiaActiveChip";
import { RealtimeStatusBadge } from "@/components/RealtimeStatusBadge";
import { usePersistentState } from "@/lib/persist/usePersistentState";
import { useTurmas } from "@/hooks/useTurmas";
import { useAgenda } from "@/hooks/useAgenda";
import { useInclusaoStudents } from "@/hooks/useInclusaoStudents";
import type { StudentInput } from "@/lib/db/inclusao";
import { toast } from "sonner";

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
.hero-tier-badge{display:inline-flex;align-items:center;gap:10px;margin-bottom:10px;font-size:13px;font-weight:800;color:#fff;letter-spacing:.01em;line-height:1;}
.hero-tier-badge .tier-emoji{font-size:30px;line-height:1;filter:drop-shadow(0 4px 10px rgba(0,0,0,.35));transition:transform .3s ease;}
.hero-tier-badge:hover .tier-emoji{transform:scale(1.12) rotate(-4deg);}
.hero-tier-badge .tier-name{font-family:'Fraunces',serif;font-weight:700;font-size:14px;color:#fff;}
.hero-tier-badge.tier-8 .tier-emoji{animation:tierPulse 2.4s ease-in-out infinite;filter:drop-shadow(0 0 12px rgba(250,204,21,.65)) drop-shadow(0 4px 10px rgba(0,0,0,.3));}
@keyframes tierPulse{0%,100%{transform:scale(1);}50%{transform:scale(1.12);}}
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
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:18px;}
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
.card-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:12px;flex-wrap:wrap;min-width:0;}
.card-head>*{min-width:0;}
.card-title{font-family:'Fraunces',serif;font-weight:800;font-size:16px;color:var(--primary);display:flex;align-items:center;gap:9px;flex-wrap:wrap;min-width:0;}
.card-title-count{background:var(--primary-soft);color:var(--primary);font-size:10px;font-weight:800;padding:2.5px 8px;border-radius:100px;font-family:'Inter',sans-serif;}
.card-link{font-size:11.5px;font-weight:700;color:var(--accent);display:inline-flex;align-items:center;gap:4px;transition:gap .2s;}
.card-link:hover{gap:7px;}
.card-link svg{width:11px;height:11px;}
.filter-pills{display:flex;gap:4px;background:var(--bg-soft);padding:3px;border-radius:8px;flex-wrap:nowrap;max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
.filter-pills::-webkit-scrollbar{display:none;}
.filter-pill{padding:5px 11px;border-radius:6px;font-size:11px;font-weight:700;color:var(--text-soft);transition:all .15s;display:inline-flex;align-items:center;gap:5px;flex:0 0 auto;white-space:nowrap;}
.filter-pill.active{background:#fff;color:var(--primary);box-shadow:var(--shadow-sm);}
.filter-pill .count{font-size:9.5px;background:var(--primary-soft);color:var(--primary);padding:1px 5px;border-radius:100px;font-weight:800;}
.filter-pill.active .count{background:var(--accent-soft);color:var(--accent);}
.class-group{margin-bottom:10px;}
.class-group:last-child{margin-bottom:0;}
.class-head{display:flex;align-items:center;gap:10px;padding:8px 11px;background:var(--bg-soft);border-radius:8px;cursor:pointer;transition:background .15s;overflow:hidden;max-width:100%;}
.class-head:hover{background:var(--primary-soft);}
.class-toggle{width:16px;height:16px;display:flex;align-items:center;justify-content:center;color:var(--text-soft);transition:transform .2s;}
.class-toggle.collapsed{transform:rotate(-90deg);}
.class-info{flex:1;min-width:0;}
.class-name{font-size:12.5px;font-weight:800;color:var(--primary);line-height:1.2;}
.class-meta{font-size:10.5px;color:var(--text-soft);margin-top:2px;}
.class-count{font-size:10px;font-weight:700;color:var(--text-soft);background:#fff;border:1px solid var(--border);padding:2.5px 8px;border-radius:100px;flex-shrink:0;white-space:nowrap;}
.btn-label-desktop{display:inline;}
@media(max-width:400px){
  .btn-label-desktop{display:none;}
  .class-head{gap:6px;padding:8px;}
  .bulk-action-bar .bulk-selected-text{display:none;}
}
.student{display:flex;align-items:center;gap:11px;padding:9px 11px;margin-top:4px;border-radius:8px;transition:background .15s;border:1px solid transparent;}
.student:hover{background:var(--bg-soft);border-color:var(--border-soft);}
.student-row{display:flex;align-items:stretch;gap:6px;}
.student-row .student{flex:1;min-width:0;}
.student-row.is-selected .student{background:var(--accent-soft);border-color:var(--accent);}
.student-check{display:flex;align-items:center;justify-content:center;padding:0 6px;cursor:pointer;border-radius:8px;border:1px solid transparent;transition:background .15s,border-color .15s;}
.student-check:hover{background:var(--bg-soft);border-color:var(--border-soft);}
.student-check input{width:16px;height:16px;cursor:pointer;accent-color:var(--accent);}
.bulk-toolbar{display:flex;align-items:center;gap:10px;padding:8px 11px;margin-top:6px;background:var(--bg-soft);border:1px solid var(--border-soft);border-radius:8px;font-size:12px;color:var(--text-soft);}
.bulk-toolbar input{width:16px;height:16px;cursor:pointer;accent-color:var(--accent);}
.bulk-toolbar label{display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;color:var(--text);}
.bulk-action-bar{position:fixed;left:50%;bottom:max(20px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:55;display:flex;align-items:center;gap:10px;padding:10px 14px;background:#0f172a;color:#fff;border-radius:14px;box-shadow:0 16px 40px rgba(15,23,42,.32);font-size:13px;font-weight:600;max-width:calc(100vw - 32px);flex-wrap:wrap;}
.bulk-action-bar .bulk-count{background:rgba(255,255,255,.15);padding:4px 10px;border-radius:999px;font-size:12px;}
.bulk-action-bar button{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#fff;font-weight:700;font-size:12.5px;cursor:pointer;transition:background .15s,border-color .15s;}
.bulk-action-bar button:hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.4);}
.bulk-action-bar button.danger{background:#dc2626;border-color:#dc2626;}
.bulk-action-bar button.danger:hover{background:#b91c1c;border-color:#b91c1c;}
.bulk-action-bar button.ghost{opacity:.85;}
.bulk-action-bar button:disabled{opacity:.5;cursor:not-allowed;}
@media (max-width:820px){.bulk-action-bar{font-size:12px;padding:9px 12px;gap:8px;}}
@media (max-width:480px){
  .class-head{flex-wrap:nowrap;overflow:hidden;}
  .class-name{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .class-meta{font-size:9.5px;}
  .class-count{font-size:9px;flex-shrink:0;}
}
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
.toggle-switch{position:relative;width:36px;height:20px;border-radius:100px;background:#CBD5E1;cursor:pointer;transition:background .25s;flex-shrink:0;}
.toggle-switch::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.20);transition:transform .25s;}
.toggle-switch.on{background:var(--accent);}
.toggle-switch.on::after{transform:translateX(16px);}
.cmdk-overlay{position:fixed;inset:0;background:rgba(15,27,54,.55);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:max(24px,4vh) 16px;z-index:100;overflow-y:auto;-webkit-overflow-scrolling:touch;}
.cmdk-overlay.show{display:flex;}
.cmdk{width:100%;max-width:560px;max-height:90dvh;display:flex;flex-direction:column;background:#fff;border-radius:14px;box-shadow:0 25px 60px rgba(15,27,54,.40);overflow:hidden;border:1px solid var(--border);}
.cmdk-input{width:100%;padding:16px 18px;border:none;border-bottom:1px solid var(--border);font-size:15px;font-family:inherit;color:var(--text);outline:none;}
.cmdk-list{padding:8px;max-height:380px;overflow-y:auto;}
.cmdk-section{font-size:10px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:.10em;padding:8px 12px 4px;}
.cmdk-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;font-size:13px;color:var(--text);cursor:pointer;transition:background .12s;}
.cmdk-item:hover,.cmdk-item.active{background:var(--bg-soft);}
.cmdk-item svg{width:14px;height:14px;color:var(--text-soft);}
.cmdk-item-shortcut{margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted);font-weight:600;}
.school-modal{width:100%;max-width:480px;max-height:90dvh;display:flex;flex-direction:column;background:#fff;border-radius:16px;box-shadow:0 25px 60px rgba(15,27,54,.40);overflow:hidden;border:1px solid var(--border);}
.school-modal-head{padding:18px 20px 12px;border-bottom:1px solid var(--border-soft);display:flex;align-items:flex-start;gap:12px;flex-shrink:0;}
.school-modal-icon{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--accent),var(--accent-warm));display:grid;place-items:center;color:#fff;flex-shrink:0;}
.school-modal-icon svg{width:18px;height:18px;}
.school-modal-title{font-family:'Fraunces',serif;font-weight:700;font-size:18px;color:var(--text);line-height:1.2;}
.school-modal-sub{font-size:12px;color:var(--text-soft);margin-top:3px;}
.school-modal-close{margin-left:auto;width:28px;height:28px;border-radius:8px;border:1px solid var(--border);background:#fff;display:grid;place-items:center;color:var(--text-soft);cursor:pointer;}
.school-modal-close:hover{border-color:var(--primary);color:var(--primary);}
.school-modal-body{padding:16px 20px;display:flex;flex-direction:column;gap:12px;flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;}
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
.school-modal-foot{padding:14px 20px;border-top:1px solid var(--border-soft);display:flex;align-items:center;gap:10px;background:var(--bg-soft);flex-shrink:0;position:sticky;bottom:-16px;z-index:2;}
.school-cancel{margin-left:auto;padding:9px 14px;border-radius:9px;border:1px solid var(--border);background:#fff;font-size:13px;font-weight:700;color:var(--text-soft);cursor:pointer;}
.school-cancel:hover{border-color:var(--primary);color:var(--primary);}
.ap-root .school-save{padding:9px 16px;border-radius:9px;border:none !important;background:linear-gradient(135deg,#FF7A45,#FF9466) !important;color:#fff !important;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 8px 18px rgba(255,122,69,.45);display:inline-flex;align-items:center;gap:6px;}
.ap-root .school-save:hover{filter:brightness(1.05);}
.school-clickable{cursor:pointer;transition:transform .15s, box-shadow .15s;}
.school-clickable:hover{transform:translateY(-2px);box-shadow:var(--shadow-md);}
@media(max-width:1200px){.hero{grid-template-columns:1fr;gap:22px;padding:24px;}.grid-2{grid-template-columns:1fr;}}
@media(max-width:820px){.ap-app{grid-template-columns:1fr;}.ap-sidebar{display:none;}.ap-main{padding:74px 18px 18px;}}
@media(max-width:820px){
  .hero-metric{position:relative;}
  .hero-metric-tag{flex-wrap:nowrap;gap:6px;}
  .hero-tier-badge{position:absolute;top:14px;right:14px;margin-bottom:0;}
  .hero-tier-badge .tier-name{display:none;}
}
@media(max-width:560px){.hero{padding:20px 18px;}.hero-title{font-size:26px;}.hero-metric-value{font-size:42px;}.today-focus{flex-direction:column;align-items:flex-start;}.today-focus-action{width:100%;justify-content:center;}.card-head{align-items:flex-start;}.filter-pills{width:100%;}}
@media(max-width:480px){
  .ap-main{padding:70px 12px 100px;max-width:100%;}
  .ap-main{padding:14px 12px 100px;max-width:100%;}
  .hero{padding:18px 16px;border-radius:16px;gap:16px;}
  .ap-root .hero-title{font-size:clamp(20px,5.5vw,26px);line-height:1.25;word-break:normal;overflow-wrap:break-word;hyphens:none;}
  .hero-sub{font-size:13px;margin-bottom:16px;}
  .hero-metric{padding:16px;}
  .hero-metric-value{font-size:36px;}
  .hero-cta-row{display:flex;flex-wrap:wrap;gap:10px;width:100%;}
  .hero-cta,.hero-cta-ghost{width:100%;max-width:100%;justify-content:center;white-space:normal;flex:1 1 auto;min-width:0;}
  .stats{grid-template-columns:1fr;gap:10px;}
  .school-row{grid-template-columns:1fr;}
  .grid-2{gap:12px;}
}
@media(max-width:390px){
  .ap-main{padding:10px 10px 100px;}
  .hero{padding:16px 14px;border-radius:14px;}
  .ap-root .hero-title{font-size:clamp(18px,5vw,22px);}
  .hero-metric-value{font-size:30px !important;}
  .hero-metric-unit{font-size:16px !important;}
  .hero-metric{padding:12px;}
  .hero-cta,.hero-cta-ghost{font-size:12px;padding:9px 12px;}
  .stats{grid-template-columns:1fr !important;}
  .hero-metric-tag{font-size:9px;}
  .filter-pills{flex-wrap:wrap;gap:4px;}
  .filter-pill{font-size:11px;padding:5px 10px;}
}
@media(max-width:360px){
  .ag-up-item{grid-template-columns:44px 1fr;gap:8px;}
  .ag-event-title{font-size:12px;word-break:break-word;}
  .ap-main{padding:8px 8px 100px;}
  .hero{padding:14px 12px;}
  .ap-root .hero-title{font-size:18px;}
  .hero-metric-value{font-size:26px !important;}
  .card-head{flex-direction:column;align-items:flex-start;gap:8px;}
  .hero-cta,.hero-cta-ghost{padding:8px 10px;font-size:11px;}
}
}

/* Modais (Cadastrar turma / Cadastrar aluno) — mobile */
@media(max-width:640px){
  .cmdk-overlay{padding:0 !important;align-items:flex-end !important;}
  .school-modal{max-width:100% !important;max-height:92dvh;display:flex;flex-direction:column;border-radius:16px 16px 0 0;}
  .school-modal-head{padding:14px 16px 10px;}
  .school-modal-title{font-size:16px;}
  .school-modal-sub{font-size:11.5px;}
  .school-modal-body{padding:14px 16px;gap:10px;overflow-y:auto;-webkit-overflow-scrolling:touch;}
  .school-modal-foot{margin:8px -16px -14px !important;padding:12px 16px calc(12px + env(safe-area-inset-bottom)) !important;flex-direction:column-reverse;align-items:stretch;gap:8px;position:sticky;bottom:calc(-14px - env(safe-area-inset-bottom));background:#fff;z-index:2;border-top:1px solid var(--border-soft);}
  .school-modal-foot button,.school-cancel,.ap-root .school-save{width:100%;margin:0 !important;justify-content:center;}
  .school-field input,.school-field select,.school-field textarea{font-size:16px !important;}
}

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
  const sofiaCtx = useSofiaContext();
  const hydrated = useHydrated();
  const isEi = useEiMode();
  // Nome real do usuário logado (perfil) com fallback seguro pra SSR.
  const realName = (sofiaCtx.user?.primeiro_nome || sofiaCtx.user?.nome || user.name || "").trim();
  // Tick a cada 30s pra manter o relógio em dia.
  const [, setClockTick] = useState(0);
  useEffect(() => {
    if (!hydrated) return;
    const id = setInterval(() => setClockTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [hydrated]);
  // Saudação Bom dia/Boa tarde/Boa noite usando hora real do dispositivo.
  // Durante SSR usa um fallback estável pra evitar hydration mismatch.
  const heroGreeting = useMemo(() => {
    const nameNode = realName ? <span className="accent">{realName}</span> : null;
    if (!hydrated) {
      return nameNode ? <>Olá, {nameNode}</> : <>Olá</>;
    }
    const h = new Date().getHours();
    const slot = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
    return nameNode ? <>{slot}, {nameNode}</> : <>{slot}</>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, realName]);
  const [cmdk, setCmdk] = useState(false);
  const [cmdkQuery, setCmdkQuery] = useState("");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [curricuoOpen, setCurricuoOpen] = useState(false);
  const { isAtivo: curricuoAtivo, nomeExibicao: curricuoNome } = useCurriculoMunicipal();
  const [schools, setSchools] = usePersistentState<Array<{ name: string; network: string; stage: string; city: string; uf: string; classes: string }>>("dash_schools", []);
  const baseSchools = 0;
  const [classOpen, setClassOpen] = useState(false);
  const { turmas: classes, create: createTurmaDb, update: updateTurmaDb, remove: removeTurmaDb } = useTurmas();
  const baseClasses = 0;
  const [studentOpen, setStudentOpen] = useState(false);

  // Foco automático no primeiro campo + Esc para fechar (turma / aluno)
  useEffect(() => {
    if (!classOpen && !studentOpen && !schoolOpen) return;
    const close = () => {
      if (classOpen) setClassOpen(false);
      if (studentOpen) setStudentOpen(false);
      if (schoolOpen) setSchoolOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => {
      const sel = '.cmdk-overlay.show .school-modal input:not([type="hidden"]), .cmdk-overlay.show .school-modal select, .cmdk-overlay.show .school-modal textarea';
      const el = document.querySelector<HTMLElement>(sel);
      el?.focus();
    }, 60);
    return () => { window.removeEventListener("keydown", onKey); window.clearTimeout(t); };
  }, [classOpen, studentOpen, schoolOpen]);
  const [bulkMode, setBulkMode] = useState(false);
  const [submittingStudent, setSubmittingStudent] = useState(false);
  type DashStudent = { id?: string; name: string; classRef: string; birth: string; pcd: string; notes: string; createdAt?: string };
  const {
    students: dbStudents,
    create: createDbStudent,
    update: updateDbStudent,
    remove: removeDbStudent,
    bulkRemove: bulkRemoveDbStudents,
    bulkAssignTurma: bulkAssignTurmaDbStudents,
  } = useInclusaoStudents();
  const students = useMemo<DashStudent[]>(
    () =>
      dbStudents.map((s) => ({
        id: s.id,
        name: s.name,
        classRef: s.turma && s.turma !== "Sem turma" ? s.turma : "",
        birth: s.birth ?? "",
        pcd: s.pcd ?? "nao",
        notes: s.notes ?? "",
        createdAt: s.createdAt,
      })),
    [dbStudents],
  );
  const buildStudentInput = (d: DashStudent): StudentInput => ({
    name: d.name,
    initials:
      d.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0] ?? "")
        .join("")
        .toUpperCase() || "AL",
    age: "—",
    turma: d.classRef || "Sem turma",
    diag: "",
    cid: "",
    aee: "",
    anamnese: "0/14",
    registros: "0",
    trend: "—",
    trendTone: "muted",
    birth: d.birth,
    notes: d.notes,
    pcd: d.pcd,
  });
  const renameClassRefRipple = async (oldName: string, newName: string) => {
    const affected = dbStudents.filter((s) => (s.turma ?? "") === oldName);
    for (const s of affected) {
      try {
        await updateDbStudent(s.id, { turma: newName });
      } catch (err) {
        console.error("[Dashboard] erro ao atualizar turma da aluna:", err);
      }
    }
  };
  const clearClassRefRipple = async (oldName: string) => {
    const affected = dbStudents.filter((s) => (s.turma ?? "") === oldName);
    for (const s of affected) {
      try {
        await updateDbStudent(s.id, { turma: "Sem turma" });
      } catch (err) {
        console.error("[Dashboard] erro ao limpar turma da aluna:", err);
      }
    }
  };
  const [studentDetail, setStudentDetail] = useState<{ index: number; student: DashStudent } | null>(null);
  const [editingStudent, setEditingStudent] = useState(false);
  const [editForm, setEditForm] = useState<DashStudent | null>(null);
  // Estado controlado para os selects do modal de aluno (turma → escola sincroniza automaticamente).
  const [studentClassSel, setStudentClassSel] = useState<string>("");
  const [studentSchoolSel, setStudentSchoolSel] = useState<string>("");
  const baseStudents = 0;
  
  const [filter, setFilter] = useState<"all" | "pcd" | "reg">("all");
  const [collapsedClasses, setCollapsedClasses] = useState<Record<string, boolean>>({});
  const [editingClassIdx, setEditingClassIdx] = useState<number | null>(null);
  // Exclusão de turma (com confirmação em duas etapas)
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);
  const [deletingClassBusy, setDeletingClassBusy] = useState(false);
  // Seleção em massa de alunos (Dashboard "Seus alunos")
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [bulkConfirmDelete, setBulkConfirmDelete] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkTurmaPick, setBulkTurmaPick] = useState<string>("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const clearStudentSelection = () => setSelectedStudentIds(new Set());
  const toggleStudentSelected = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const totalSchools = baseSchools + schools.length;
  const totalClasses = baseClasses + classes.length;
  const totalStudents = baseStudents + students.length;
  // Conta documentos realmente produzidos pela professora (planos de
  // atividade regular/PCD, planos de inclusão por aluno e registros M6).
  // Assim a barra de "Tempo devolvido" cresce em tempo real conforme ela
  // gera materiais, sem depender de mocks.
  const [atvHistRegular] = usePersistentState<unknown[]>("plan_atividade_regular_hist_v1", []);
  const [atvHistPcd] = usePersistentState<unknown[]>("plan_atividade_pcd_hist_v1", []);
  const [incPlans] = usePersistentState<Record<string, unknown[]>>("inc_plans", {});
  const [m6Entries] = usePersistentState<unknown[]>("plan_m6_entries", []);
  // Quantos alunos foram cadastrados em massa (cadastro individual NÃO conta
  // pro tempo devolvido, conforme regra do produto).
  const [bulkStudentsCount, setBulkStudentsCount] = usePersistentState<number>(
    "bulk_students_count_v1",
    0,
  );
  const generatedDocsCount = useMemo(() => {
    const incTotal = Object.values(incPlans || {}).reduce(
      (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0,
    );
    return (
      (Array.isArray(atvHistRegular) ? atvHistRegular.length : 0) +
      (Array.isArray(atvHistPcd) ? atvHistPcd.length : 0) +
      (Array.isArray(m6Entries) ? m6Entries.length : 0) +
      incTotal
    );
  }, [atvHistRegular, atvHistPcd, incPlans, m6Entries]);
  const documentsGenerated = Math.max(user.documentsGenerated, generatedDocsCount);
  // Tempo devolvido — regras de produto:
  //   • Cada aluno vinculado a uma turma: 1 min (individual ou em massa).
  //   • Cada planejamento de aula: 60 min × quantidade.
  //   • Cada relatório/parecer escrito: 45 min × quantidade.
  //   • Cada PEI: 300 min (5 h) × quantidade.
  const lessonPlansCount =
    (Array.isArray(atvHistRegular) ? atvHistRegular.length : 0) +
    (Array.isArray(atvHistPcd) ? atvHistPcd.length : 0);
  const peiCount = useMemo(
    () =>
      Object.values(incPlans || {}).reduce(
        (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
        0,
      ),
    [incPlans],
  );
  // Pareceres finalizados: usamos o counter mock (`user.documentsGenerated`)
  // como proxy do que foi escrito de fato em Relatórios.
  const reportsCount = Math.max(0, user.documentsGenerated);
  // Conta todos os alunos efetivamente vinculados a uma turma.
  const studentsWithClassCount = useMemo(
    () => students.filter((s) => (s.classRef || "").trim().length > 0).length,
    [students],
  );
  const earnedMinutes =
    Math.max(studentsWithClassCount, bulkStudentsCount) * 1 +
    lessonPlansCount * 60 +
    reportsCount * 45 +
    peiCount * 300;
  const totalMinutes = user.hoursSavedTotal * 60 + earnedMinutes;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  // Faixas (tiers) para a mensagem do contador "Tempo devolvido".
  // Baseadas no total de horas acumuladas — escolhemos a faixa onde
  // `h` cai (min ≤ h ≤ max). 500h tem mensagem própria de marco histórico.
  const HOUR_TIERS = [
    { min: 0,   max: 3,    icon: "🌱",  name: "Semente",        tone: "tier-0", text: "Você já começou. Esse tempo que voltou pra você é só o início." },
    { min: 4,   max: 7,    icon: "☕",  name: "Manhã livre",    tone: "tier-1", text: "Uma manhã inteira de volta. Tempo que foi pro café, pro descanso, pra você." },
    { min: 8,   max: 19,   icon: "📚",  name: "Dia inteiro",    tone: "tier-2", text: "Um dia inteiro que não virou pilha de documentos. Você merecia isso há muito tempo." },
    { min: 20,  max: 39,   icon: "🌅",  name: "Rotina leve",    tone: "tier-3", text: "Você ganhou dias inteiros de volta. Dias que eram seus e que a burocracia tinha tomado." },
    { min: 40,  max: 79,   icon: "🏖️", name: "Semana extra",   tone: "tier-4", text: "Uma semana de trabalho devolvida. Sabe aquele fôlego que faltava? Ele está aqui." },
    { min: 80,  max: 129,  icon: "✈️",  name: "Vida de volta",  tone: "tier-5", text: "Dois meses de noites e fins de semana que ficaram com você. Com sua família. Com sua vida." },
    { min: 130, max: 199,  icon: "🎯",  name: "Mais leveza",    tone: "tier-6", text: "Você ensina com mais leveza agora. A gente vê isso nesses números." },
    { min: 200, max: 499,  icon: "🏆",  name: "Extraordinário", tone: "tier-7", text: "200 horas. Cada uma delas foi escolhida por você — não tomada pela papelada." },
    { min: 500, max: 9999, icon: "🌟",  name: "Lendário",       tone: "tier-8", text: "500 horas de volta pra você. Obrigado por confiar na gente pra cuidar do que era burocracia, enquanto você cuidava do que importa." },
  ] as const;
  const currentTier = HOUR_TIERS.find((t) => h >= t.min && h <= t.max) || HOUR_TIERS[0];
  const onboardingDone = totalClasses > 0 && totalStudents > 0 && documentsGenerated > 0;

  // Cálculo: alunos sem parecer no bimestre.
  // Mesma regra usada em Relatórios: os primeiros `documentsGenerated` alunos
  // contam como já entregues; os demais estão pendentes.
  const pareceresPendentes = useMemo(() => {
    const pendentes = Math.max(0, totalStudents - documentsGenerated);
    const turmasComPendencia = new Set<string>();
    if (pendentes > 0) {
      students.slice(documentsGenerated).forEach((s) => {
        if (s?.classRef) turmasComPendencia.add(s.classRef);
      });
    }
    return { alunos: pendentes, turmas: turmasComPendencia.size };
  }, [students, documentsGenerated, totalStudents]);
  const heroSubText = useMemo(() => {
    if (totalStudents === 0) {
      return "Cadastre suas turmas e alunos para que a Sofia possa te ajudar a gerar pareceres, planos de aula e adaptações em minutos.";
    }
    if (pareceresPendentes.alunos === 0) {
      return "Todos os pareceres do bimestre estão em dia 🎉";
    }
    const a = pareceresPendentes.alunos;
    const t = Math.max(1, pareceresPendentes.turmas);
    return `Você tem ${a} ${a === 1 ? "aluno" : "alunos"} em ${t} ${t === 1 ? "turma" : "turmas"} aguardando o relatório descritivo do bimestre.`;
  }, [pareceresPendentes, totalStudents]);

  const [streak, setStreak] = useState<number>(0);
  const sofia = useSofia();
  const navigate = useNavigate();

  // ── Card principal dinâmico ───────────────────────────────────────────────
  // O hero muda conforme o "estado de jornada" do usuário. Quando várias
  // condições estão verdadeiras ao mesmo tempo, decidimos por PRIORIDADE
  // numérica (maior vence). Empate → ordem de declaração (estável).
  //
  // Escala de prioridade (mantenha as faixas para evitar conflitos):
  //  100  BLOCKER          → fluxo travado sem isto (sem turma, sem aluno).
  //   80  DEADLINE_ALTA    → prazo pedagógico sensível (PCD sem plano).
  //   70  DEADLINE         → prazo institucional (pareceres do bimestre).
  //   60  RESUME_QUENTE    → última ação <2h (usuário ainda no contexto).
  //   50  NUDGE            → lembrete leve (diário M6 da semana).
  //   40  RESUME_FRIO      → última ação 2h–24h.
  //   10  ALL_GOOD         → fallback "tudo em dia".
  const { all: activityAll } = useActivityFeed();
  const heroDynamic = useMemo(() => {
    type Hero = {
      kind: string;
      titleExtra: React.ReactNode | null;
      sub: string;
      ctaLabel: string;
      onCta: () => void;
    };
    type Candidate = Hero & { priority: number; when: boolean };

    // ── Sinais derivados ────────────────────────────────────────────────────
    const recent = activityAll[0];
    const recentTs = recent ? Date.parse(recent.ts) : 0;
    const recentAgeMs = recent ? Date.now() - recentTs : Number.POSITIVE_INFINITY;
    const recentMap: Record<ActivityType, { label: string; cta: string; to: string; search?: Record<string, string> }> = {
      parecer:      { label: "no parecer",            cta: "Voltar para os pareceres",   to: "/relatorios",   search: { tab: "todo" } },
      planejamento: { label: "no planejamento",       cta: "Continuar planejamento",     to: "/planejamento" },
      adaptacao:    { label: "nas adaptações",        cta: "Voltar para inclusão",       to: "/inclusao" },
      aluno:        { label: "no cadastro de aluno",  cta: "Cadastrar próximo aluno",    to: "/" },
      exportacao:   { label: "na exportação",         cta: "Ver documentos",             to: "/relatorios" },
    };
    const recentMeta = recent ? (recentMap[recent.type] ?? recentMap.parecer) : null;
    const recentCta = () => {
      if (!recent || !recentMeta) return;
      if (recent.type === "aluno") { setStudentOpen(true); return; }
      navigate({ to: recentMeta.to, ...(recentMeta.search ? { search: recentMeta.search } : {}) } as Parameters<typeof navigate>[0]);
    };

    const pcdSemPlano = students.filter((s) => s.pcd && s.pcd !== "nao").find((s) => {
      const key = (s.name || "").toLowerCase();
      const plans = (incPlans as Record<string, unknown[]> | undefined)?.[key];
      return !plans || plans.length === 0;
    });

    const m6Week = (Array.isArray(m6Entries) ? m6Entries : []).some((e) => {
      const ts = (e as { createdAt?: string; ts?: string })?.createdAt ?? (e as { ts?: string })?.ts;
      const t = ts ? Date.parse(ts) : 0;
      return Number.isFinite(t) && Date.now() - t < 7 * 24 * 60 * 60 * 1000;
    });
    const turma0 = classes[0]?.name;
    const aPend = pareceresPendentes.alunos;
    const tPend = Math.max(1, pareceresPendentes.turmas);

    // ── Candidatos (declarados em ordem de tie-break) ───────────────────────
    const candidates: Candidate[] = [
      {
        kind: "no-classes", priority: 100, when: totalClasses === 0,
        titleExtra: <><br />Comece configurando <span className="accent">sua primeira turma.</span></>,
        sub: "Cadastre suas turmas e alunos para que a Sofia possa te ajudar a gerar pareceres, planos de aula e adaptações em minutos.",
        ctaLabel: "Criar primeira turma",
        onCta: () => setClassOpen(true),
      },
      {
        kind: "no-students", priority: 95, when: totalClasses > 0 && totalStudents === 0,
        titleExtra: <><br />Adicione alunos {turma0 ? <>à turma <span className="accent">{turma0}</span></> : <span className="accent">à sua turma</span>}.</>,
        sub: "Com os alunos cadastrados, a Sofia já consegue sugerir pareceres, adaptações e planos personalizados.",
        ctaLabel: "Cadastrar aluno",
        onCta: () => setStudentOpen(true),
      },
      {
        kind: "pcd-sem-plano", priority: 80, when: !!pcdSemPlano,
        titleExtra: <><br />Crie o plano de inclusão de <span className="accent">{pcdSemPlano?.name}</span>.</>,
        sub: "A Sofia já tem o contexto deste aluno e pode montar um PEI inicial em poucos minutos.",
        ctaLabel: "Abrir inclusão",
        onCta: () => navigate({ to: "/inclusao" }),
      },
      {
        kind: "pareceres", priority: 70, when: aPend > 0,
        titleExtra: <><br />Foque agora <span className="accent">nos pareceres do bimestre</span>.</>,
        sub: `Você tem ${aPend} ${aPend === 1 ? "aluno" : "alunos"} em ${tPend} ${tPend === 1 ? "turma" : "turmas"} aguardando o relatório descritivo.`,
        ctaLabel: "Começar pelos pareceres",
        onCta: () => navigate({ to: "/relatorios", search: { tab: "todo" } }),
      },
      {
        kind: recent ? `resume-quente:${recent.type}` : "resume-quente",
        priority: 60,
        when: !!recent && recentAgeMs < 2 * 60 * 60 * 1000,
        titleExtra: <><br />Continue <span className="accent">de onde parou</span>.</>,
        sub: recent && recentMeta
          ? `Você estava trabalhando ${recentMeta.label} ${relativeTime(recent.ts)} — ${recent.description}.`
          : "",
        ctaLabel: recentMeta?.cta ?? "Continuar",
        onCta: recentCta,
      },
      {
        kind: "diario", priority: 50, when: !m6Week && totalStudents > 0,
        titleExtra: <><br />Que tal um <span className="accent">registro rápido no diário</span>?</>,
        sub: "Anotar como foi a aula desta semana ajuda a Sofia a sugerir intervenções mais precisas.",
        ctaLabel: "Abrir diário (M6)",
        onCta: () => navigate({ to: "/planejamento" }),
      },
      {
        kind: recent ? `resume-frio:${recent.type}` : "resume-frio",
        priority: 40,
        when: !!recent && recentAgeMs < 24 * 60 * 60 * 1000,
        titleExtra: <><br />Retome <span className="accent">o que ficou em aberto</span>.</>,
        sub: recent && recentMeta
          ? `Sua última ação foi ${recentMeta.label} ${relativeTime(recent.ts)} — ${recent.description}.`
          : "",
        ctaLabel: recentMeta?.cta ?? "Continuar",
        onCta: recentCta,
      },
      {
        kind: "tudo-em-dia", priority: 10, when: true,
        titleExtra: <><br />Tudo <span className="accent">em dia por aqui</span> ✨</>,
        sub: "Pareceres entregues, alunos atualizados. Que tal adiantar o planejamento da próxima semana?",
        ctaLabel: "Planejar próxima semana",
        onCta: () => navigate({ to: "/planejamento" }),
      },
    ];

    // Maior prioridade vence; sort estável preserva ordem de declaração no empate.
    const winner = candidates.filter((c) => c.when).sort((a, b) => b.priority - a.priority)[0];
    return winner;
  }, [totalClasses, totalStudents, classes, activityAll, pareceresPendentes, students, incPlans, m6Entries, navigate]);

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

  // Lê os eventos diretamente do banco (tabela agenda_eventos), mesma fonte da tela /agenda.
  const { events: agendaEventsRaw } = useAgenda();
  const agendaEvents = agendaEventsRaw as unknown as AgendaEvent[];
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
      <style dangerouslySetInnerHTML={{ __html: css + emptyStateCss + sidebarCss + appHeaderCss }} />
      <div className="ap-app">
        <AppSidebar active="home" onCmdK={() => setCmdk(true)} />

      <main className="ap-main">
  <AppHeader
  breadcrumb={[{ label: "Sua sala" }, { label: "Página inicial" }]}
/>

          <section className="hero">
            <div className="hero-left">
              <h1 className="hero-title" suppressHydrationWarning>
                {heroGreeting}.
                {heroDynamic.titleExtra}
              </h1>
              <p className="hero-sub" suppressHydrationWarning>{heroDynamic.sub}</p>
              <div className="hero-cta-row">
                <button className="hero-cta" onClick={heroDynamic.onCta}>
                  {heroDynamic.ctaLabel}
                  <Svg strokeWidth={2.5} c={<path d="M5 12h14M13 5l7 7-7 7"/>} />
                </button>
                <button
                  className="hero-cta-ghost"
                  onClick={() => { setTutorialStep(0); setTutorialOpen(true); }}
                  aria-label="Abrir tutorial"
                >
                  <Svg strokeWidth={2.5} c={<polygon points="5 3 19 12 5 21 5 3"/>} />
                  Tutorial
                </button>
              </div>
            </div>
            <div className="hero-metric">
              <div className="hero-metric-tag" style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Svg strokeWidth={2.5} c={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} />
                <span>Tempo devolvido a você</span>
                <RealtimeStatusBadge compact={typeof window !== "undefined" && window.innerWidth <= 820} />
              </div>
              <div
                className={`hero-tier-badge ${currentTier.tone}`}
                title={`Nível ${currentTier.name} · ${currentTier.min}${currentTier.max < 9999 ? `–${currentTier.max}` : "+"} h`}
                aria-label={`Selo ${currentTier.name}`}
              >
                <span className="tier-emoji" aria-hidden>{currentTier.icon}</span>
              </div>
              <div className="hero-metric-value">
                <span>{h}</span>h<span className="hero-metric-unit"><span>{m}</span>min</span>
              </div>
              <div className="hero-metric-label">
                <span style={{ marginRight: 6 }}>{currentTier.icon}</span>
                {currentTier.text}
              </div>
            </div>
          </section>

          <CreditosPainel />

          {!onboardingDone && (
            <div style={{ marginBottom: 18 }}>
              <SofiaErrorBoundary area="o foco do dia">
                <SofiaFocoCard showEmptyFallback />
              </SofiaErrorBoundary>
            </div>
          )}

          <div style={{ marginBottom: 18 }}>
            <SofiaErrorBoundary area="as adaptações da Sofia">
              <SofiaAdaptacaoCard showEmptyFallback />
            </SofiaErrorBoundary>
          </div>

          <div
            className="stats"
            data-sofia-section="stats"
          >
            <button
              ref={classesRef as unknown as React.Ref<HTMLButtonElement>}
              className={`stat school-clickable${highlight === "classes" ? " sofia-highlight" : ""}`}
              type="button"
              onClick={() => setClassOpen(true)}
              aria-label="Cadastrar nova turma"
              style={{ textAlign: "left" }}
            >
              <div className="stat-icon s2"><Svg c={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>} /></div>
              <div className="stat-body"><div className="stat-value">{totalClasses} {classes.length > 0 && <span className="stat-value-trend">+{classes.length}</span>}</div><div className="stat-label">Turmas ativas</div></div>
            </button>
            <button
              className="stat school-clickable"
              type="button"
              onClick={() => setStudentOpen(true)}
              aria-label="Cadastrar novo aluno"
              style={{ textAlign: "left" }}
            >
              <div className="stat-icon s3"><Svg c={<><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></>} /></div>
              <div className="stat-body"><div className="stat-value">{totalStudents} {students.length > 0 && <span className="stat-value-trend">+{students.length}</span>}</div><div className="stat-label">Alunos</div></div>
            </button>
            <button
              className="stat school-clickable"
              type="button"
              onClick={() => navigate({ to: "/relatorios", search: { tab: "todo", focus: "pareceres" } })}
              aria-label={isEi ? "Ver relatórios pendentes" : "Ver pareceres pendentes"}
              style={{ textAlign: "left" }}
            >
              <div className="stat-icon s1"><Svg c={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>} /></div>
              <div className="stat-body">
                <div className="stat-value">
                  {documentsGenerated}<span className="hero-metric-unit" style={{ fontSize: 14, color: "var(--text-muted)" }}>/{totalStudents}</span>
                  {pareceresPendentes.alunos > 0 && <span className="stat-value-trend" style={{ color: "var(--accent-deep)", background: "var(--accent-soft)" }}>{pareceresPendentes.alunos} pendentes</span>}
                </div>
                <div className="stat-label">{isEi ? "Relatórios do bimestre" : "Pareceres do bimestre"}</div>
              </div>
            </button>
            <button
              className="stat school-clickable"
              type="button"
              onClick={() => navigate({ to: "/relatorios", search: { tab: "done", focus: "horas" } })}
              aria-label="Ver tempo economizado em Relatórios"
              style={{ textAlign: "left" }}
            >
              <div className="stat-icon s4"><Svg c={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} /></div>
              <div className="stat-body">
                <div className="stat-value">{h}<span className="hero-metric-unit" style={{ fontSize: 14, color: "var(--text-muted)" }}>h</span>{m > 0 && <>{m}<span className="hero-metric-unit" style={{ fontSize: 14, color: "var(--text-muted)" }}>min</span></>}</div>
                <div className="stat-label">Horas economizadas</div>
              </div>
            </button>
          </div>

          <div className="grid-2">
            <div ref={studentsRef as unknown as React.Ref<HTMLDivElement>} className={`card${highlight === "students" ? " sofia-highlight" : ""}`}>
              {missingTarget && (() => {
                const term = missingTarget.term.trim();
                const termLow = term.toLowerCase();
                // Sugestões: alunos cujo nome contém qualquer parte do termo.
                const tokens = termLow.split(/[\s-]+/).filter(Boolean);
                const sugeridos = students
                  .map((s, i) => ({ s, i, score: tokens.reduce((acc, t) => acc + (s.name.toLowerCase().includes(t) ? 1 : 0), 0) }))
                  .filter((x) => x.score > 0)
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 5);
                return (
                  <div
                    role="status"
                    style={{
                      margin: "-2px 0 14px",
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: "linear-gradient(135deg,#FEF3C7,#FFFBEB)",
                      border: "1px solid #FDE68A",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <span style={{ fontSize: 22, lineHeight: 1 }}>🔍</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 13.5, color: "#92400E" }}>
                          Não encontrei {term ? <>um aluno chamado <em>“{term}”</em></> : "esse aluno"} no seu cadastro.
                        </div>
                        <div style={{ fontSize: 12.5, color: "#92400E", marginTop: 4, lineHeight: 1.45 }}>
                          A Sofia só fala sobre alunos que você já cadastrou. Selecione o aluno correto abaixo
                          {missingTarget.momento ? <> para continuar o contexto de <strong>{missingTarget.momento.toUpperCase()}</strong></> : null}, ou cadastre um novo.
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label="Dispensar aviso"
                        onClick={() => setMissingTarget(null)}
                        style={{
                          background: "transparent", border: "none", color: "#92400E",
                          fontSize: 18, lineHeight: 1, cursor: "pointer", padding: 4,
                        }}
                      >×</button>
                    </div>

                    {sugeridos.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {sugeridos.map(({ s, i }) => (
                          <button
                            key={`sug-${i}`}
                            type="button"
                            onClick={() => {
                              const turmaKey = s.classRef || "Sem turma";
                              setCollapsedClasses((p) => ({ ...p, [turmaKey]: false }));
                              setHighlightedStudentIdx(i);
                              setStudentDetail({ index: i, student: s });
                              setMissingTarget(null);
                            }}
                            style={{
                              padding: "5px 10px", borderRadius: 999,
                              border: "1px solid #FDE68A", background: "#fff",
                              fontSize: 12, fontWeight: 700, color: "#92400E", cursor: "pointer",
                              display: "inline-flex", alignItems: "center", gap: 6,
                            }}
                          >
                            {s.name}
                            {s.classRef && <span style={{ fontWeight: 500, color: "#B45309" }}>· {s.classRef}</span>}
                          </button>
                        ))}
                      </div>
                    ) : students.length > 0 ? (
                      <div style={{ fontSize: 12, color: "#92400E", fontStyle: "italic" }}>
                        Nenhum nome parecido entre os {students.length} alunos cadastrados. Use o filtro acima ou cadastre um novo.
                      </div>
                    ) : null}

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => { setStudentOpen(true); setMissingTarget(null); }}
                        style={{
                          padding: "7px 12px", borderRadius: 8, border: "none",
                          background: "#D97706", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer",
                        }}
                      >
                        + Cadastrar novo aluno
                      </button>
                      <button
                        type="button"
                        onClick={() => setMissingTarget(null)}
                        style={{
                          padding: "7px 10px", borderRadius: 8, border: "1px solid #FDE68A",
                          background: "#fff", color: "#92400E", fontWeight: 700, fontSize: 12, cursor: "pointer",
                        }}
                      >
                        Agora não
                      </button>
                    </div>
                  </div>
                );
              })()}
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
              {(() => {
                const visible = students.filter((s) => {
                  if (filter === "pcd") return s.pcd && s.pcd !== "nao";
                  if (filter === "reg") return !s.pcd || s.pcd === "nao";
                  return true;
                });
                const visibleIds = visible.map((s) => s.id).filter((id): id is string => !!id);
                if (visibleIds.length === 0) return null;
                const allSelected = visibleIds.every((id) => selectedStudentIds.has(id));
                const someSelected = visibleIds.some((id) => selectedStudentIds.has(id));
                return (
                  <div className="bulk-toolbar">
                    <label>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = !allSelected && someSelected; }}
                        onChange={() => {
                          setSelectedStudentIds((prev) => {
                            const next = new Set(prev);
                            if (allSelected) visibleIds.forEach((id) => next.delete(id));
                            else visibleIds.forEach((id) => next.add(id));
                            return next;
                          });
                        }}
                      />
                      Selecionar todos
                    </label>
                    <span style={{ marginLeft: "auto" }}>
                      {selectedStudentIds.size > 0
                        ? `${selectedStudentIds.size} selecionado${selectedStudentIds.size === 1 ? "" : "s"}`
                        : "Nenhum selecionado"}
                    </span>
                  </div>
                );
              })()}

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
                      const groupIds = list.map((s) => s.id).filter((id): id is string => !!id);
                      const allGroupSelected = groupIds.length > 0 && groupIds.every((id) => selectedStudentIds.has(id));
                      const someGroupSelected = groupIds.some((id) => selectedStudentIds.has(id));
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
                            {groupIds.length > 0 && (
                              <label
                                className="student-check"
                                onClick={(e) => e.stopPropagation()}
                                style={{ marginRight: 2 }}
                                title={allGroupSelected ? "Desmarcar todos da turma" : "Selecionar todos da turma"}
                              >
                                <input
                                  type="checkbox"
                                  checked={allGroupSelected}
                                  ref={(el) => { if (el) el.indeterminate = !allGroupSelected && someGroupSelected; }}
                                  onChange={() => {
                                    setSelectedStudentIds((prev) => {
                                      const next = new Set(prev);
                                      if (allGroupSelected) groupIds.forEach((id) => next.delete(id));
                                      else groupIds.forEach((id) => next.add(id));
                                      return next;
                                    });
                                  }}
                                  aria-label={`Selecionar todos os alunos da turma ${turma}`}
                                />
                              </label>
                            )}
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
  style={{ marginLeft: 4, background: "transparent", border: "1px solid var(--border, #E4E8F0)", borderRadius: 6, padding: "3px 5px", cursor: "pointer", color: "var(--text-soft, #6B7691)", display: "inline-flex", alignItems: "center", gap: 0, fontSize: 11, fontWeight: 600, flexShrink: 0 }}
>
  <Svg width={12} height={12} c={<><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></>} />
</button>
                            )}
                            {classMeta && (
                             <button
  type="button"
  onClick={(e) => { e.stopPropagation(); setDeletingClassId(classMeta.id); }}
  aria-label={`Excluir turma ${turma}`}
  title="Excluir turma"
  style={{ marginLeft: 4, background: "transparent", border: "1px solid #FCA5A5", borderRadius: 6, padding: "3px 5px", cursor: "pointer", color: "#DC2626", display: "inline-flex", alignItems: "center", gap: 0, fontSize: 11, fontWeight: 600, flexShrink: 0 }}
>
  <Svg width={12} height={12} c={<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></>} />
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
                            const sid = s.id;
                            const isSelected = !!sid && selectedStudentIds.has(sid);
                            return (
                              <div key={`${turma}-${i}`} className={`student-row${isSelected ? " is-selected" : ""}`}>
                                {sid && (
                                  <label className="student-check" title={isSelected ? "Desmarcar" : "Selecionar"}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleStudentSelected(sid)}
                                      aria-label={`Selecionar ${s.name}`}
                                    />
                                  </label>
                                )}
                                <button
                                  type="button"
                                  className={`student${isHighlighted ? " sofia-highlight" : ""}`}
                                  onClick={() => setStudentDetail({ index: realIndex, student: s })}
                                  style={{ textAlign: "left", background: "transparent", cursor: "pointer", font: "inherit" }}
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
                              </div>
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
                  <button
                    type="button"
                    className="card-link"
                    onClick={() => navigate({ to: "/relatorios", search: { range: "week", tab: "all" } })}
                    style={{ background: "transparent", border: 0, padding: 0, font: "inherit", cursor: "pointer", color: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    Ver tudo<Svg strokeWidth={2.5} c={<path d="M5 12h14M13 5l7 7-7 7"/>} />
                  </button>
                </div>
                <SofiaErrorBoundary area="o feed desta semana">
                  <AtividadeFeed />
                </SofiaErrorBoundary>
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
                            width: 56, flexShrink: 0, padding: "6px 0", borderRadius: 8,
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
                            <div style={{
                              fontSize: 12.5, fontWeight: 700, color: "var(--primary)",
                              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
                              overflow: "hidden", overflowWrap: "anywhere", lineHeight: 1.3,
                            }}>
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
              <div className="viral-title">Convide outro(a) educador(a) e <strong>ganhe 1 mês grátis</strong> · quem você indicar também ganha 30 dias</div>
              <div className="viral-sub">Compartilhe seu link único com colegas que também sofrem com pareceres no fim do bimestre.</div>
            </div>
            <button className="viral-action">
              Compartilhar link
              <Svg strokeWidth={2.5} c={<><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></>} />
            </button>
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
          <form className="school-modal-body" onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const name = String(fd.get("name") || "").trim();
            if (!name) return;
            const form = e.currentTarget as HTMLFormElement;
            try {
              await createTurmaDb({
                name,
                school: String(fd.get("school") || ""),
                grade: String(fd.get("grade") || ""),
                shift: String(fd.get("shift") || ""),
                students: String(fd.get("students") || ""),
              });
              form.reset();
              setClassOpen(false);
              toast.success("Turma cadastrada", { description: name });
            } catch (err) {
              console.error("[Dashboard] erro ao criar turma:", err);
              toast.error("Não foi possível salvar a turma", {
                description: (err as Error)?.message ?? "Tente novamente em alguns instantes.",
              });
            }
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
                  <optgroup label="Educação Infantil">
                    <option value="bercario-1">Berçário I (0–1 ano)</option>
                    <option value="bercario-2">Berçário II (1–2 anos)</option>
                    <option value="maternal-1">Maternal I (2–3 anos)</option>
                    <option value="maternal-2">Maternal II (3–4 anos)</option>
                    <option value="pre-1">Pré I (4–5 anos)</option>
                    <option value="pre-2">Pré II (5–6 anos)</option>
                  </optgroup>
                  <optgroup label="Ensino Fundamental">
                    {["1","2","3","4","5","6","7","8","9"].map((g) => <option key={g} value={g}>{g}º ano</option>)}
                  </optgroup>
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
            <form className="school-modal-body" onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const name = String(fd.get("name") || "").trim();
              if (!name) return;
              const oldName = classes[editingClassIdx!].name;
              const turmaId = classes[editingClassIdx!].id;
              const updated = {
                name,
                school: String(fd.get("school") || ""),
                grade: String(fd.get("grade") || ""),
                shift: String(fd.get("shift") || ""),
                students: String(fd.get("students") || ""),
              };
              try {
                await updateTurmaDb(turmaId, updated);
                if (oldName !== name) {
                  await renameClassRefRipple(oldName, name);
                }
                setEditingClassIdx(null);
              } catch (err) {
                console.error("[Dashboard] erro ao atualizar turma:", err);
                toast.error("Não foi possível atualizar a turma. Tente novamente.");
              }
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
                    <optgroup label="Educação Infantil">
                      <option value="bercario-1">Berçário I (0–1 ano)</option>
                      <option value="bercario-2">Berçário II (1–2 anos)</option>
                      <option value="maternal-1">Maternal I (2–3 anos)</option>
                      <option value="maternal-2">Maternal II (3–4 anos)</option>
                      <option value="pre-1">Pré I (4–5 anos)</option>
                      <option value="pre-2">Pré II (5–6 anos)</option>
                    </optgroup>
                    <optgroup label="Ensino Fundamental">
                      {["1","2","3","4","5","6","7","8","9"].map((g) => <option key={g} value={g}>{g}º ano</option>)}
                    </optgroup>
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
                    const turmaId = classes[editingClassIdx!].id;
                    setEditingClassIdx(null);
                    setDeletingClassId(turmaId);
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

      {deletingClassId !== null && (() => {
        const turma = classes.find((c) => c.id === deletingClassId);
        if (!turma) return null;
        const linkedStudents = dbStudents.filter((s) => (s.turma ?? "") === turma.name);
        const linkedIds = linkedStudents.map((s) => s.id).filter(Boolean) as string[];
        const count = linkedStudents.length;
        const close = () => { if (!deletingClassBusy) setDeletingClassId(null); };
        return (
          <div className="cmdk-overlay show" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
            <div className="school-modal" role="dialog" aria-label="Excluir turma" aria-modal="true">
              <div className="school-modal-head">
                <div className="school-modal-icon" style={{ background: "#FEE2E2", color: "#DC2626" }}>
                  <Svg c={<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></>} />
                </div>
                <div>
                  <div className="school-modal-title">Excluir turma</div>
                  <div className="school-modal-sub">Esta ação é permanente e não pode ser desfeita.</div>
                </div>
                <button className="school-modal-close" aria-label="Fechar" onClick={close} disabled={deletingClassBusy}>
                  <Svg c={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />
                </button>
              </div>
              <div className="school-modal-body" style={{ paddingTop: 4 }}>
                <p style={{ fontSize: 14, color: "var(--text)", margin: "8px 0 12px" }}>
                  ⚠️ Tem certeza que deseja excluir a turma <b>{turma.name}</b>?
                </p>
                {count > 0 ? (
                  <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 8, padding: "10px 12px", color: "#92400E", fontSize: 13, lineHeight: 1.5 }}>
                    Esta ação também excluirá permanentemente <b>{count} aluno{count === 1 ? "" : "s"}</b> vinculado{count === 1 ? "" : "s"} a esta turma.
                  </div>
                ) : (
                  <div style={{ background: "#F1F5F9", border: "1px solid var(--border, #E4E8F0)", borderRadius: 8, padding: "10px 12px", color: "var(--text-soft, #475569)", fontSize: 13 }}>
                    Nenhum aluno está vinculado a esta turma.
                  </div>
                )}
                <p style={{ fontSize: 12, color: "var(--text-soft, #6B7691)", margin: "12px 0 0" }}>
                  Essa ação não pode ser desfeita.
                </p>
              </div>
              <div className="school-modal-foot" style={{ margin: "4px -20px -16px", borderRadius: 0, justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className="school-cancel" onClick={close} disabled={deletingClassBusy}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="school-save"
                  style={{ background: "#DC2626", borderColor: "#DC2626" }}
                  disabled={deletingClassBusy}
                  onClick={async () => {
                    setDeletingClassBusy(true);
                    try {
                      if (linkedIds.length > 0) {
                        await bulkRemoveDbStudents(linkedIds);
                      }
                      await removeTurmaDb(turma.id);
                      setDeletingClassId(null);
                      toast.success(count > 0 ? "Turma e alunos excluídos com sucesso." : "Turma excluída com sucesso.");
                    } catch (err) {
                      console.error("[Dashboard] erro ao excluir turma:", err);
                      toast.error("Não foi possível excluir a turma. Tente novamente.");
                    } finally {
                      setDeletingClassBusy(false);
                    }
                  }}
                >
                  {deletingClassBusy ? "Excluindo…" : (count > 0 ? "Sim, excluir tudo" : "Sim, excluir turma")}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
          <form className="school-modal-body" onSubmit={async (e) => {
            e.preventDefault();
            if (submittingStudent) return;
            const fd = new FormData(e.currentTarget);
            const className = studentClassSel || String(fd.get("classRefManual") || "").trim();
            const schoolName = studentSchoolSel || (classes.find((c) => c.name === studentClassSel)?.school || "");
            const classRef = className
              ? (schoolName ? `${className} · ${schoolName}` : className)
              : (schoolName || "");
            const pcd = String(fd.get("pcd") || "nao");
            const formEl = e.currentTarget as HTMLFormElement;
            const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
            setSubmittingStudent(true);
            if (bulkMode) {
              const raw = String(fd.get("names") || "");
              const names = raw
                .split(/[\n,;]+/)
                .map((s) => s.trim())
                .filter((s) => s.length > 0 && s.length <= 120);
              if (names.length === 0) { setSubmittingStudent(false); return; }
              const existingNames = new Set(students.map((s) => norm(s.name)));
              const novos = names.filter((n) => !existingNames.has(norm(n)));
              const duplicados = names.length - novos.length;
              if (novos.length === 0) {
                toast.error("Já existe(m) aluno(s) cadastrado(s) com esses nomes.");
                setSubmittingStudent(false);
                return;
              }
              try {
                for (const name of novos) {
                  await createDbStudent(buildStudentInput({ name, classRef, birth: "", pcd, notes: "" }));
                }
                // Cada aluno em massa vale 1 min de tempo devolvido.
                setBulkStudentsCount((n) => (Number.isFinite(n) ? n : 0) + novos.length);
                toast.success(
                  duplicados > 0
                    ? `${novos.length} aluno(s) cadastrado(s) · ${duplicados} já existia(m)`
                    : `${novos.length} aluno(s) cadastrado(s)`,
                );
              } catch (err) {
                console.error("[Dashboard] erro no cadastro em massa:", err);
                toast.error("Não foi possível cadastrar todos os alunos. Tente novamente.");
                setSubmittingStudent(false);
                return;
              }
            } else {
              const name = String(fd.get("name") || "").trim();
              if (!name) { setSubmittingStudent(false); return; }
              const birth = String(fd.get("birth") || "");
              const dup = students.find(
                (s) => norm(s.name) === norm(name) && (s.birth || "") === birth,
              );
              if (dup) {
                toast.error("Já existe um aluno cadastrado com esses dados.");
                setSubmittingStudent(false);
                return;
              }
              try {
                await createDbStudent(
                  buildStudentInput({
                    name,
                    classRef,
                    birth,
                    pcd,
                    notes: String(fd.get("notes") || ""),
                  }),
                );
                toast.success("Aluno(a) cadastrado(a)", { description: name });
              } catch (err) {
                console.error("[Dashboard] erro ao cadastrar aluno:", err);
                toast.error("Não foi possível cadastrar. Tente novamente.");
                setSubmittingStudent(false);
                return;
              }
            }
            formEl.reset();
            setStudentClassSel(""); setStudentSchoolSel("");
            setStudentOpen(false);
            setSubmittingStudent(false);
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
              <button type="submit" className="school-save" disabled={submittingStudent} aria-busy={submittingStudent}>
                {submittingStudent ? "Cadastrando…" : (bulkMode ? "Salvar alunos" : "Salvar aluno")}
                <Svg width={14} height={14} c={<><polyline points="20 6 9 17 4 12"/></>} />
              </button>
            </div>
          </form>
        </div>
      </div>

      {cmdk && (() => {
        const cmdkItems = [
          { label: "Página inicial", shortcut: "G H", icon: <Svg c={<><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>} />, action: () => { navigate({ to: "/" }); setCmdk(false); }, keywords: "home dashboard início" },
          { label: "Assistente IA (Sofia)", shortcut: "G S", icon: <Svg c={<><path d="M12 2v3"/><path d="M12 19v3"/><circle cx="12" cy="12" r="6"/><path d="M5 12H2"/><path d="M22 12h-3"/></>} />, action: () => { navigate({ to: "/assistente" }); setCmdk(false); }, keywords: "sofia chat ia" },
          { label: "Planejamento", shortcut: "G P", icon: <Svg c={<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></>} />, action: () => { navigate({ to: "/planejamento" }); setCmdk(false); }, keywords: "aulas plano" },
          { label: "Relatórios e pareceres", shortcut: "G R", icon: <Svg c={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>} />, action: () => { navigate({ to: "/relatorios" }); setCmdk(false); }, keywords: "parecer bimestral bncc" },
          { label: "Inclusão", shortcut: "G I", icon: <Svg c={<><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></>} />, action: () => { navigate({ to: "/inclusao" }); setCmdk(false); }, keywords: "pcd anamnese pei" },
          { label: "Agenda escolar", shortcut: "G A", icon: <Svg c={<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></>} />, action: () => { navigate({ to: "/agenda" }); setCmdk(false); }, keywords: "calendario eventos" },
          { label: "Configurações", icon: <Svg c={<><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></>} />, action: () => { navigate({ to: "/configuracoes" }); setCmdk(false); }, keywords: "perfil ajustes conta" },
          { label: "Cadastrar novo aluno", shortcut: "N A", icon: <Svg c={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>} />, action: () => { setCmdk(false); setStudentOpen(true); }, keywords: "criar adicionar" },
        ];
        const [cmdkQ, setCmdkQ] = [cmdkQuery, setCmdkQuery];
        const filtered = cmdkQ.trim()
          ? cmdkItems.filter(i => (i.label + " " + (i.keywords || "")).toLowerCase().includes(cmdkQ.trim().toLowerCase()))
          : cmdkItems;
        return (
          <div className="cmdk-overlay show" onClick={(e) => { if (e.target === e.currentTarget) { setCmdk(false); setCmdkQuery(""); } }}>
            <div className="cmdk">
              <input
                className="cmdk-input"
                placeholder="Buscar páginas, ações, atalhos…"
                autoComplete="off"
                autoFocus
                value={cmdkQ}
                onChange={(e) => setCmdkQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setCmdk(false); setCmdkQuery(""); }
                  if (e.key === "Enter" && filtered.length > 0) { filtered[0].action(); setCmdkQuery(""); }
                }}
              />
              <div className="cmdk-list">
                {filtered.length === 0 && (
                  <div style={{ padding: "20px 14px", textAlign: "center", color: "#6B7691", fontSize: 13 }}>Nada encontrado para "{cmdkQ}".</div>
                )}
                {filtered.length > 0 && <div className="cmdk-section">Ir para / Ações</div>}
                {filtered.map((item, i) => (
                  <div key={i} className="cmdk-item" onClick={() => { item.action(); setCmdkQuery(""); }}>
                    {item.icon}
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.shortcut && <span className="cmdk-item-shortcut">{item.shortcut}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

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
                      onClick={async () => {
                        if (!editForm) { setEditingStudent(false); return; }
                        const trimmed = { ...editForm, name: editForm.name.trim() };
                        if (!trimmed.name) return;
                        const target = dbStudents[studentDetail.index];
                        if (!target) { setEditingStudent(false); setEditForm(null); return; }
                        try {
                          await updateDbStudent(target.id, buildStudentInput(trimmed));
                          setStudentDetail({ index: studentDetail.index, student: trimmed });
                          setEditingStudent(false);
                          setEditForm(null);
                          toast.success("Alterações salvas");
                        } catch (err) {
                          console.error("[Dashboard] erro ao salvar aluno:", err);
                          toast.error("Não foi possível salvar. Tente novamente.");
                        }
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
                      onClick={async () => {
                        if (!confirm(`Remover ${s.name}?`)) return;
                        const target = dbStudents[studentDetail.index];
                        if (!target) { closeAll(); return; }
                        try {
                          await removeDbStudent(target.id);
                          closeAll();
                          toast.success("Aluno(a) removido(a)");
                        } catch (err) {
                          console.error("[Dashboard] erro ao remover aluno:", err);
                          toast.error("Não foi possível remover. Tente novamente.");
                        }
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

      {selectedStudentIds.size > 0 && (
        <div className="bulk-action-bar" role="toolbar" aria-label="Ações em massa de alunos">
          <span className="bulk-count">
            {selectedStudentIds.size} {selectedStudentIds.size === 1 ? "aluno selecionado" : "alunos selecionados"}
          </span>
          <button type="button" onClick={() => setBulkAssignOpen(true)} disabled={bulkBusy}>
            🏫 Vincular à turma
          </button>
          <button type="button" className="danger" onClick={() => setBulkConfirmDelete(true)} disabled={bulkBusy}>
            🗑 Excluir
          </button>
          <button type="button" className="ghost" onClick={clearStudentSelection} disabled={bulkBusy}>
            Limpar
          </button>
        </div>
      )}

      <div className={`cmdk-overlay ${bulkConfirmDelete ? "show" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) setBulkConfirmDelete(false); }}>
        <div className="school-modal" role="dialog" aria-label="Confirmar exclusão em massa">
          <div className="school-modal-head">
            <div className="school-modal-icon" style={{ background: "#FEE2E2", color: "#B91C1C" }}>
              <Svg c={<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></>} />
            </div>
            <div>
              <div className="school-modal-title">Excluir alunos selecionados</div>
              <div className="school-modal-sub">
                Deseja excluir {selectedStudentIds.size} {selectedStudentIds.size === 1 ? "aluno" : "alunos"}? Essa ação não pode ser desfeita.
              </div>
            </div>
            <button className="school-modal-close" aria-label="Fechar" onClick={() => setBulkConfirmDelete(false)}>
              <Svg c={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />
            </button>
          </div>
          <div className="school-modal-foot" style={{ marginTop: 4 }}>
            <button type="button" className="school-cancel" onClick={() => setBulkConfirmDelete(false)} disabled={bulkBusy}>Cancelar</button>
            <button
              type="button"
              className="school-save"
              style={{ background: "#DC2626", borderColor: "#DC2626" }}
              disabled={bulkBusy}
              onClick={async () => {
                const ids = Array.from(selectedStudentIds);
                if (ids.length === 0) { setBulkConfirmDelete(false); return; }
                setBulkBusy(true);
                try {
                  await bulkRemoveDbStudents(ids);
                  toast.success(`${ids.length} ${ids.length === 1 ? "aluno excluído" : "alunos excluídos"}`);
                  clearStudentSelection();
                  setBulkConfirmDelete(false);
                } catch (err) {
                  console.error("[Dashboard] erro ao excluir alunos em massa:", err);
                  toast.error("Não foi possível excluir", {
                    description: (err as Error)?.message ?? "Tente novamente.",
                  });
                } finally {
                  setBulkBusy(false);
                }
              }}
            >
              {bulkBusy ? "Excluindo…" : "Excluir definitivamente"}
            </button>
          </div>
        </div>
      </div>

      <div className={`cmdk-overlay ${bulkAssignOpen ? "show" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) setBulkAssignOpen(false); }}>
        <div className="school-modal" role="dialog" aria-label="Vincular alunos à turma">
          <div className="school-modal-head">
            <div className="school-modal-icon">
              <Svg c={<><path d="M3 9l9-6 9 6"/><path d="M5 10v10h14V10"/></>} />
            </div>
            <div>
              <div className="school-modal-title">Vincular à turma</div>
              <div className="school-modal-sub">
                {selectedStudentIds.size} {selectedStudentIds.size === 1 ? "aluno será vinculado" : "alunos serão vinculados"} à turma escolhida.
              </div>
            </div>
            <button className="school-modal-close" aria-label="Fechar" onClick={() => setBulkAssignOpen(false)}>
              <Svg c={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />
            </button>
          </div>
          <div className="school-modal-body">
            <div className="school-field">
              <label htmlFor="bulk-turma-pick">Turma</label>
              {classes.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-soft)", padding: "6px 0" }}>
                  Nenhuma turma cadastrada. Cadastre uma turma primeiro.
                </div>
              ) : (
                <select
                  id="bulk-turma-pick"
                  value={bulkTurmaPick}
                  onChange={(e) => setBulkTurmaPick(e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {classes.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}{c.school ? ` · ${c.school}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="school-modal-foot">
            <button type="button" className="school-cancel" onClick={() => setBulkAssignOpen(false)} disabled={bulkBusy}>Cancelar</button>
            <button
              type="button"
              className="school-save"
              disabled={bulkBusy || !bulkTurmaPick || classes.length === 0}
              onClick={async () => {
                const ids = Array.from(selectedStudentIds);
                if (ids.length === 0 || !bulkTurmaPick) return;
                setBulkBusy(true);
                try {
                  await bulkAssignTurmaDbStudents(ids, bulkTurmaPick);
                  toast.success(`${ids.length} ${ids.length === 1 ? "aluno vinculado" : "alunos vinculados"}`, {
                    description: `Turma: ${bulkTurmaPick}`,
                  });
                  clearStudentSelection();
                  setBulkAssignOpen(false);
                  setBulkTurmaPick("");
                } catch (err) {
                  console.error("[Dashboard] erro ao vincular turma em massa:", err);
                  toast.error("Não foi possível vincular", {
                    description: (err as Error)?.message ?? "Tente novamente.",
                  });
                } finally {
                  setBulkBusy(false);
                }
              }}
            >
              {bulkBusy ? "Vinculando…" : "Vincular à turma"}
              <Svg width={14} height={14} c={<><polyline points="20 6 9 17 4 12"/></>} />
            </button>
          </div>
        </div>
      </div>
      {tutorialOpen && (() => {
        const steps: { title: string; body: string }[] = [
          { title: "Bem-vindo(a) ao AgilizaProf", body: "Esta é a sua página inicial. Aqui você acompanha o seu dia, vê as sugestões da Sofia e abre rapidamente os fluxos de parecer, plano, inclusão e agenda." },
          { title: "Saudação, ação principal e Tempo devolvido", body: "No topo, a Sofia te cumprimenta e sugere uma ação imediata (botão laranja). Ao lado, o selo \"Tempo devolvido a você\" mostra quantas horas a plataforma já te economizou e o seu nível atual." },
          { title: "Painel de créditos", body: "Logo abaixo da saudação fica o painel de créditos do seu plano (Free, Mensal ou Anual). Acompanhe o consumo do período e use o botão de upgrade quando quiser mais espaço para gerar documentos." },
          { title: "Foco do dia & Adaptações da Sofia", body: "A Sofia destaca o foco do dia e propõe adaptações sob medida para suas turmas e alunos PCD. Clique nos cards para abrir a conversa já direcionada." },
          { title: "Estatísticas e Seus alunos", body: "Mais abaixo aparecem os indicadores (documentos gerados, tempo economizado) e o card \"Seus alunos\", com a lista de turmas e alunos cadastrados. Clique em um aluno para abrir o perfil completo." },
          { title: "Esta semana & Agenda", body: "Nos dois cards finais você vê o que aconteceu na semana e os próximos compromissos da agenda escolar. Use-os como bússola rápida do que vem pela frente." },
          { title: "Assistente IA", body: "No menu lateral, abra \"Assistente IA\" para conversar com a Sofia em formato chat. Lá você pede pareceres, planos, adaptações e relatórios — sempre com o contexto das suas turmas." },
          { title: "Planejamento", body: "Em \"Planejamento\" você cria planos de aula, trilhas semestrais, roteiros de Educação Infantil e atividades adaptadas em poucos cliques." },
          { title: "Relatórios", body: "Em \"Relatórios\" você gera pareceres descritivos por bimestre, com avaliação BNCC e exportação em DOCX/PDF — pronto pra revisão e entrega à família." },
          { title: "Inclusão", body: "Em \"Inclusão\" você cadastra alunos PCD, monta o PEI (Plano Educacional Individualizado) e mantém anamnese, registros e adaptações organizados num só lugar." },
          { title: "Agenda e Configurações", body: "Em \"Agenda\" você organiza eventos, reuniões e prazos da escola. Em \"Configurações\" ajusta perfil, plano, indicação de amigos e preferências da plataforma." },
        ];
        const total = steps.length;
        const idx = Math.min(tutorialStep, total - 1);
        const s = steps[idx];
        const close = () => setTutorialOpen(false);
        return (
          <div
            onClick={close}
            style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 200, display: "grid", placeItems: "center", padding: 16 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: "#FBFAF6", color: "#0B1220", borderRadius: 18, maxWidth: 560, width: "100%", padding: 26, boxShadow: "0 20px 60px rgba(0,0,0,.28)", border: "1px solid #E7E9EF" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", color: "#FF6A2C", textTransform: "uppercase" }}>
                  Tutorial · {idx + 1}/{total}
                </span>
                <button onClick={close} aria-label="Fechar tutorial" style={{ background: "transparent", border: 0, cursor: "pointer", color: "#7A8194", fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, fontFamily: "'Fraunces', serif", color: "#1B2A4E" }}>{s.title}</h3>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: "#3B4256" }}>{s.body}</p>
              <div style={{ display: "flex", gap: 6, marginTop: 20, marginBottom: 20 }}>
                {steps.map((_, i) => (
                  <span key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i <= idx ? "#1B2A4E" : "#E7E9EF" }} />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <button
                  onClick={() => setTutorialStep((n) => Math.max(0, n - 1))}
                  disabled={idx === 0}
                  style={{ padding: "9px 16px", borderRadius: 10, border: "1px solid #E7E9EF", background: "transparent", cursor: idx === 0 ? "not-allowed" : "pointer", opacity: idx === 0 ? 0.5 : 1, color: "#1B2A4E", fontWeight: 600 }}
                >
                  Voltar
                </button>
                {idx < total - 1 ? (
                  <button
                    onClick={() => setTutorialStep((n) => Math.min(total - 1, n + 1))}
                    style={{ padding: "9px 18px", borderRadius: 10, border: 0, background: "#1B2A4E", color: "#fff", cursor: "pointer", fontWeight: 700 }}
                  >
                    Próximo
                  </button>
                ) : (
                  <button
                    onClick={close}
                    style={{ padding: "9px 18px", borderRadius: 10, border: 0, background: "#FF6A2C", color: "#fff", cursor: "pointer", fontWeight: 700 }}
                  >
                    Entendi, vamos lá
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function DashboardCmdkSuggestions() {
  return null;
}
