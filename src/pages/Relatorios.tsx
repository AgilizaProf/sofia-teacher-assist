import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { AppSidebar, sidebarCss } from "@/components/AppSidebar";
import { EmptyState, emptyStateCss } from "@/components/EmptyState";
import { useUser } from "@/lib/mockData";
import { useSofiaContext } from "@/lib/sofia/sofiaContext";
import { useSofia } from "@/components/sofia/SofiaProvider";
import { Header as AppHeader } from "@/components/Header";
import { usePersistentState } from "@/lib/persist/usePersistentState";
import { useEiMode } from "@/lib/ei/useEiMode";
import { useInclusaoStudents } from "@/hooks/useInclusaoStudents";
import { useDashClasses } from "@/hooks/useDashLegacyData";
import { Skeleton } from "@/components/ui/skeleton";
import { consumirCreditos, descricaoDoc } from "@/lib/creditos/consume";
import { CUSTOS } from "@/lib/creditos/policy";
import { isEducacaoInfantilGrade, EI_GRADE_LABELS } from "@/lib/turmaGrade";
import {
  Search, Bell, Star, Sparkles, ArrowRight, PlayCircle, Clock, Edit3,
  CheckCircle2, FileText, Users, Calendar, Filter, ChevronDown, MoreHorizontal,
  MessageSquare, Download, Copy, X, ClipboardList, UserPlus, RefreshCw, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { wrapEditorialPrintHtml as wrapStandardPrintHtml } from "@/lib/print/editorialPrint";
import { GerarRelatorioButton } from "@/components/documentos/RelatorioDialog";

const css = `
.rel-root{
  --primary:#1B2A4E;--primary-dark:#0F1B36;
  --panel:#0E1422;--muted:#7A8194;--line-soft:#E7E9EF;
  --paper:#F6F4EE;--paper-2:#FBFAF6;
  --accent:#FF6A2C;--accent-2:#FFB47A;
  --violet:#6E5BE6;--violet-soft:#EDEAFE;
  --green:#16A36B;--green-soft:#E7F6EE;
  --amber:#E9A23B;--amber-soft:#FCF1DC;
  --red:#DC2626;--red-soft:#FDECEC;
  --text:#0B1220;--text-soft:#3B4256;
  --shadow-card:0 1px 0 rgba(17,24,39,.04), 0 8px 24px -12px rgba(17,24,39,.18);
  font-family:'Inter',ui-sans-serif,system-ui,sans-serif;background:var(--paper);color:var(--text);
  -webkit-font-smoothing:antialiased;min-height:100vh;display:flex;width:100%;
}
.rel-root *{box-sizing:border-box;}
.rel-root button{font-family:inherit;cursor:pointer;border:0;background:none;color:inherit;}
.rel-root a{color:inherit;text-decoration:none;}
.rel-main{display:flex;flex-direction:column;min-width:0;flex:1;}
.rel-topbar{display:flex;align-items:center;gap:14px;padding:14px 28px;background:var(--paper);
  border-bottom:1px solid rgba(17,24,39,.06);position:sticky;top:0;z-index:5;}
.rel-crumbs{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13px;}
.rel-crumbs b{color:var(--text);font-weight:600;}
.rel-crumbs .sep{opacity:.5;}
.rel-crumbs .accent{color:var(--accent);font-weight:600;}
.rel-topbar-right{margin-left:auto;display:flex;align-items:center;gap:10px;}
.rel-icon-btn{width:34px;height:34px;border-radius:10px;background:#fff;border:1px solid var(--line-soft);
  display:grid;place-items:center;color:#3B4256;box-shadow:var(--shadow-card);transition:border-color .15s;}
.rel-icon-btn:hover{border-color:#cfd4e1;}
.rel-user-pill{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line-soft);
  padding:6px 10px 6px 6px;border-radius:999px;box-shadow:var(--shadow-card);}
.rel-user-pill .av{width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#FF6A2C,#6E5BE6);
  display:grid;place-items:center;color:#fff;font-weight:700;font-size:11px;}
.rel-user-pill b{font-size:12.5px;}
.rel-user-pill small{color:var(--accent);font-size:10.5px;display:block;letter-spacing:.06em;font-weight:700;}

.rel-page{padding:28px 28px 60px;max-width:1280px;width:100%;margin:0 auto;}

.rel-hero{background:linear-gradient(135deg,var(--primary) 0%,var(--primary-dark) 100%);
  border-radius:22px;padding:28px 30px;color:#fff;position:relative;overflow:hidden;
  box-shadow:0 30px 60px -30px rgba(11,18,32,.45);}
.rel-hero::before{content:"";position:absolute;top:-180px;right:-100px;width:480px;height:480px;
  background:radial-gradient(circle, rgba(255,122,69,.26) 0%, transparent 60%);border-radius:50%;pointer-events:none;}
.rel-hero::after{content:"";position:absolute;bottom:-160px;left:-80px;width:380px;height:380px;
  background:radial-gradient(circle, rgba(255,148,102,.10) 0%, transparent 65%);border-radius:50%;pointer-events:none;}
.rel-hero-grid{display:grid;grid-template-columns:1fr 360px;gap:30px;align-items:center;position:relative;}
.rel-eyebrow{font-size:11px;letter-spacing:.16em;color:#FFB47A;font-weight:700;display:inline-flex;align-items:center;gap:8px;}
.rel-hero h1{font-family:'Fraunces',serif;font-weight:600;font-size:38px;line-height:1.12;margin:10px 0 8px;letter-spacing:-.01em;}
.rel-hero h1 em{font-style:normal;color:var(--accent);}
.rel-hero p{margin:0 0 18px;color:#aab2c8;font-size:14.5px;max-width:560px;line-height:1.55;}
.rel-hero-cta{display:flex;gap:10px;flex-wrap:wrap;}
.rel-root .rel-btn-primary{background:linear-gradient(180deg,#FF7A3D,#FF5A14);color:#fff;padding:12px 18px;border-radius:12px;
  font-weight:600;font-size:14px;display:inline-flex;align-items:center;gap:8px;
  box-shadow:0 12px 24px -8px rgba(255,90,20,.55), inset 0 1px 0 rgba(255,255,255,.25);transition:filter .15s;}
.rel-root .rel-btn-primary:hover{filter:brightness(1.05);}
.rel-root .rel-btn-ghost{background:rgba(255,255,255,.06);color:#fff;padding:12px 16px;border-radius:12px;
  font-weight:500;font-size:13.5px;display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,.12);transition:background .15s;}
.rel-root .rel-btn-ghost:hover{background:rgba(255,255,255,.10);}

.rel-pc{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);
  border-radius:16px;padding:18px;backdrop-filter:blur(6px);}
.rel-pc-title{font-size:11px;letter-spacing:.14em;color:#aab2c8;font-weight:700;text-transform:uppercase;}
.rel-pc-num{font-family:'Fraunces',serif;font-weight:600;font-size:34px;line-height:1;margin:8px 0 4px;}
.rel-pc-num span{color:#aab2c8;font-size:18px;font-weight:500;}
.rel-pc-bar{height:8px;background:rgba(255,255,255,.10);border-radius:999px;overflow:hidden;margin-top:12px;}
.rel-pc-bar i{display:block;height:100%;background:linear-gradient(90deg,#FF6A2C,#FF8A4C);border-radius:999px;
  box-shadow:0 0 24px rgba(255,106,44,.6);}
.rel-pc-meta{display:flex;justify-content:space-between;font-size:11.5px;color:#aab2c8;margin-top:8px;}
.rel-pc-tag{display:inline-flex;align-items:center;gap:6px;background:rgba(22,163,107,.18);color:#7EE0AF;
  padding:4px 8px;border-radius:999px;font-size:11px;font-weight:600;margin-top:10px;}

.rel-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:18px;}
.rel-kpi{background:#fff;border:1px solid var(--line-soft);border-radius:14px;padding:16px;
  box-shadow:var(--shadow-card);display:flex;flex-direction:column;gap:6px;}
.rel-kpi-top{display:flex;align-items:center;justify-content:space-between;}
.rel-kpi-label{font-size:11.5px;color:var(--muted);font-weight:600;letter-spacing:.04em;}
.rel-kpi-icon{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;}
.rel-kpi-icon.amber{background:var(--amber-soft);color:#9C6B1F;}
.rel-kpi-icon.violet{background:var(--violet-soft);color:#4B3CA8;}
.rel-kpi-icon.green{background:var(--green-soft);color:#0E7A4F;}
.rel-kpi-icon.orange{background:rgba(255,106,44,.10);color:#C84A14;}
.rel-kpi-num{font-family:'Fraunces',serif;font-weight:600;font-size:28px;line-height:1;margin-top:4px;}
.rel-kpi-num small{font-size:14px;color:var(--muted);font-weight:500;font-family:'Inter';}
.rel-kpi-foot{font-size:11.5px;color:var(--muted);}
.rel-kpi-foot b.up{color:var(--green);}
.rel-kpi-foot b.urg{color:var(--red);}

.rel-sec-head{display:flex;align-items:flex-end;justify-content:space-between;margin:26px 0 14px;gap:18px;flex-wrap:wrap;}
.rel-sec-head h2{margin:0;font-family:'Fraunces',serif;font-weight:600;font-size:22px;letter-spacing:-.005em;}
.rel-sec-head p{margin:4px 0 0;color:var(--muted);font-size:13px;}
.rel-sec-actions{display:flex;gap:8px;align-items:center;}

.rel-filters{background:#fff;border:1px solid var(--line-soft);border-radius:14px;padding:10px 12px;
  display:flex;align-items:center;gap:8px;box-shadow:var(--shadow-card);flex-wrap:wrap;}
.rel-tabs{display:flex;gap:4px;background:#F1EFE8;padding:4px;border-radius:10px;}
.rel-tab{padding:6px 10px;border-radius:8px;font-size:12px;font-weight:600;color:#5b6478;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;}
.rel-tab.active{background:#fff;color:var(--text);box-shadow:0 1px 2px rgba(0,0,0,.06);}
.rel-tab .count{background:#E7E9EF;color:#5b6478;padding:1px 7px;border-radius:999px;font-size:11px;font-weight:700;}
.rel-tab.active .count{background:rgba(255,106,44,.12);color:var(--accent);}
.rel-divider{width:1px;height:22px;background:var(--line-soft);flex:none;}
.rel-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:8px;
  border:1px solid var(--line-soft);background:#fff;font-size:12px;color:var(--text-soft);position:relative;white-space:nowrap;flex:none;cursor:pointer;user-select:none;}
.rel-pill:hover{border-color:#cfd4e1;}
.rel-pill:focus-visible{outline:2px solid var(--accent);outline-offset:2px;}
.rel-search-mini{margin-left:auto;display:flex;align-items:center;gap:8px;background:#F8F6F0;border:1px solid var(--line-soft);
  padding:6px 10px;border-radius:10px;min-width:160px;flex:1 1 200px;}
.rel-search-mini input{border:0;outline:0;background:transparent;font-size:12.5px;width:100%;min-width:0;}
.rel-dropdown{position:absolute;top:calc(100% + 6px);left:0;background:#fff;border:1px solid var(--line-soft);border-radius:10px;
  box-shadow:0 10px 30px -10px rgba(17,24,39,.24);min-width:180px;padding:6px;z-index:60;max-height:280px;overflow-y:auto;}
.rel-pill[aria-haspopup="menu"]{z-index:1;}
.rel-pill[aria-haspopup="menu"]:focus-within,.rel-pill[aria-haspopup="menu"]:hover{z-index:60;}
.rel-dropdown button{display:block;width:100%;text-align:left;padding:8px 10px;border-radius:6px;font-size:12.5px;color:var(--text);background:transparent;border:0;cursor:pointer;}
.rel-dropdown button:hover{background:#F4F2EC;}
@media (max-width: 720px){
  .rel-filters{padding:10px;gap:6px;}
  .rel-tabs{flex-wrap:wrap;}
  .rel-divider{display:none;}
  .rel-search-mini{margin-left:0;flex:1 1 100%;}
}

.rel-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:14px;}
.rel-card{background:#fff;border:1px solid var(--line-soft);border-radius:16px;padding:18px;
  box-shadow:var(--shadow-card);position:relative;display:flex;flex-direction:column;gap:12px;
  transition:transform .15s ease, box-shadow .15s ease, border-color .15s;}
.rel-card:hover{transform:translateY(-2px);border-color:#d8dbe4;box-shadow:0 12px 32px -16px rgba(17,24,39,.22);}
.rel-card-head{display:flex;align-items:center;gap:12px;}
.rel-av{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;color:#fff;font-weight:700;font-size:13px;flex:none;
  background:linear-gradient(135deg,#FF6A2C,#FF8A4C);}
.rel-av.violet{background:linear-gradient(135deg,#6E5BE6,#9C8CFA);}
.rel-av.green{background:linear-gradient(135deg,#16A36B,#48C893);}
.rel-av.blue{background:linear-gradient(135deg,#3B82F6,#60A5FA);}
.rel-av.pink{background:linear-gradient(135deg,#EC4899,#F472B6);}
.rel-av.amber{background:linear-gradient(135deg,#E9A23B,#F5C26B);}
.rel-stu b{display:block;font-size:14.5px;font-weight:600;letter-spacing:-.005em;}
.rel-stu small{font-size:12px;color:var(--muted);}
.rel-badge{display:inline-flex;align-items:center;gap:6px;padding:3px 8px;border-radius:999px;
  font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;}
.rel-badge.pcd{background:#EEF0FF;color:#4B3CA8;}
.rel-more{margin-left:auto;width:30px;height:30px;border-radius:8px;display:grid;place-items:center;color:#7a8194;}
.rel-more:hover{background:#F4F2EC;color:var(--text);}

.rel-status{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;
  font-size:11.5px;font-weight:700;letter-spacing:.02em;width:fit-content;}
.rel-status .dot{width:6px;height:6px;border-radius:50%;}
.rel-status.todo{background:var(--amber-soft);color:#9C6B1F;}
.rel-status.todo .dot{background:var(--amber);}
.rel-status.draft{background:var(--violet-soft);color:#4B3CA8;}
.rel-status.draft .dot{background:var(--violet);}
.rel-status.review{background:rgba(255,106,44,.12);color:#C84A14;}
.rel-status.review .dot{background:var(--accent);}
.rel-status.done{background:var(--green-soft);color:#0E7A4F;}
.rel-status.done .dot{background:var(--green);}

.rel-progress{height:6px;background:#F1EFE8;border-radius:999px;overflow:hidden;}
.rel-progress i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#FF6A2C,#FF8A4C);}
.rel-meta{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:12px;flex-wrap:wrap;}
.rel-meta .sep{width:3px;height:3px;border-radius:50%;background:#cfd4e1;}

.rel-card-foot{display:flex;align-items:center;gap:8px;margin-top:auto;padding-top:8px;border-top:1px dashed var(--line-soft);}
.rel-btn-card{flex:1;padding:9px 10px;border-radius:10px;font-size:12.5px;font-weight:600;
  display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--line-soft);background:#fff;color:var(--text);transition:background .15s,filter .15s;}
.rel-btn-card:hover{background:#F8F6F0;}
.rel-root .rel-btn-card.dark{background:#0B1220;color:#fff;border-color:#0B1220;}
.rel-root .rel-btn-card.dark:hover{filter:brightness(1.1);background:#0B1220;}
.rel-root .rel-btn-card.accent{background:linear-gradient(180deg,#FF7A3D,#FF5A14);color:#fff;border-color:transparent;
  box-shadow:0 8px 18px -8px rgba(255,90,20,.5);}
.rel-root .rel-btn-card.accent:hover{filter:brightness(1.05);}

.rel-bulk{grid-column:span 3;background:linear-gradient(135deg,#FFF6EE 0%,#FFE3CC 100%);border:1px dashed #F4B58A;
  border-radius:16px;padding:18px 20px;display:flex;align-items:center;gap:18px;}
.rel-bulk-icon{width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#FF6A2C,#FF8A4C);
  display:grid;place-items:center;color:#fff;flex:none;box-shadow:0 10px 22px -10px rgba(255,106,44,.6);}
.rel-bulk h3{margin:0 0 2px;font-family:'Fraunces',serif;font-weight:600;font-size:18px;}
.rel-bulk p{margin:0;font-size:13px;color:#5a3a20;}
.rel-bulk .rel-btn-primary{margin-left:auto;}

.rel-history{background:#fff;border:1px solid var(--line-soft);border-radius:14px;box-shadow:var(--shadow-card);
  margin-top:8px;overflow:hidden;}
.rel-h-row{display:grid;grid-template-columns:36px 1fr auto auto auto;gap:14px;align-items:center;padding:14px 16px;border-bottom:1px solid #F1EFE8;}
.rel-h-row:last-child{border-bottom:0;}
.rel-h-row:hover{background:#FBFAF6;}
.rel-h-av{width:36px;height:36px;border-radius:10px;color:#fff;font-weight:700;font-size:12px;display:grid;place-items:center;}
.rel-h-name b{font-size:13.5px;}
.rel-h-name small{display:block;color:var(--muted);font-size:11.5px;margin-top:2px;}
.rel-h-date{color:var(--muted);font-size:12px;text-align:right;}
.rel-h-actions{display:flex;gap:6px;}
.rel-h-icon{width:30px;height:30px;border-radius:8px;border:1px solid var(--line-soft);background:#fff;
  display:grid;place-items:center;color:#5b6478;}
.rel-h-icon:hover{color:var(--text);border-color:#cfd4e1;}

.rel-modal-bg{position:fixed;inset:0;background:rgba(11,18,32,.55);display:grid;place-items:center;z-index:50;padding:20px;}
.rel-modal{background:#fff;border-radius:18px;max-width:640px;width:100%;max-height:85vh;overflow:auto;padding:28px;box-shadow:0 30px 80px -20px rgba(0,0,0,.4);}
.rel-modal h3{margin:0 0 8px;font-family:'Fraunces',serif;font-size:22px;font-weight:600;}
.rel-modal .rel-modal-meta{color:var(--muted);font-size:12.5px;margin-bottom:18px;}
.rel-modal-body{font-size:14px;line-height:1.65;color:var(--text-soft);background:var(--paper-2);padding:18px;border-radius:12px;border:1px solid var(--line-soft);}
.rel-modal-foot{display:flex;justify-content:flex-end;gap:8px;margin-top:18px;}

@media (max-width:1100px){
  .rel-hero-grid{grid-template-columns:1fr;}
  .rel-grid{grid-template-columns:repeat(2,1fr);}
  .rel-kpis{grid-template-columns:repeat(2,1fr);}
  .rel-bulk{grid-column:span 2;}
}
@media (max-width:720px){
  .rel-grid,.rel-kpis{grid-template-columns:1fr;}
  .rel-bulk{grid-column:span 1;}
  .rel-hero h1{font-size:28px;}
  .rel-page{padding:18px;}
}
@media (max-width:480px){
  .rel-page{padding:14px 12px;}
  .rel-hero h1{font-size:clamp(22px,6vw,26px);line-height:1.18;}
  .rel-hero p,.rel-hero .sub{font-size:13px;}
  .rel-kpis,.rel-grid{gap:10px;}
  .rel-modal{padding:18px;border-radius:14px;max-height:92dvh;}
  .rel-modal h3{font-size:18px;}
  .rel-modal .rel-modal-meta{font-size:12px;}
  .rel-modal-body{font-size:13.5px;padding:14px;}
  .rel-modal-foot{flex-direction:column-reverse;align-items:stretch;gap:8px;}
  .rel-modal-foot button{width:100%;justify-content:center;}
  /* Evita zoom no iOS quando os inputs estão abaixo de 16px */
  .rel-page input,.rel-page select,.rel-page textarea{font-size:16px;}
}
.kpi-tip-host{position:relative;}
.kpi-tip{position:absolute;left:50%;top:calc(100% + 10px);transform:translate(-50%,4px);min-width:280px;max-width:320px;background:#0B1220;color:#fff;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px 14px;box-shadow:0 18px 40px -16px rgba(0,0,0,.6);font-size:12px;line-height:1.45;opacity:0;pointer-events:none;transition:opacity .18s ease, transform .18s ease;z-index:40;}
.kpi-tip-host:hover .kpi-tip,.kpi-tip-host:focus-visible .kpi-tip,.kpi-tip-host:focus-within .kpi-tip{opacity:1;transform:translate(-50%,0);}
.kpi-tip-title{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.6);font-weight:700;margin-bottom:8px;}
.kpi-tip-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;}
.kpi-tip-list li{display:flex;justify-content:space-between;gap:14px;color:rgba(255,255,255,.85);}
.kpi-tip-list li b{color:#fff;font-weight:700;white-space:nowrap;}
.kpi-tip-total{margin-top:10px;padding-top:10px;border-top:1px dashed rgba(255,255,255,.14);display:flex;justify-content:space-between;font-weight:700;color:#FFB47A;}
.kpi-tip-arrow{position:absolute;top:-6px;left:50%;transform:translateX(-50%) rotate(45deg);width:12px;height:12px;background:#0B1220;border-left:1px solid rgba(255,255,255,.08);border-top:1px solid rgba(255,255,255,.08);border-radius:2px;}
`;

type Status = "todo" | "draft" | "review" | "done";
type Avatar = "" | "violet" | "green" | "blue" | "pink" | "amber";

type Parecer = {
  id: string;
  name: string;
  initials: string;
  meta: string;
  avatar: Avatar;
  status: Status;
  statusLabel: string;
  pcd?: string;
  metaInfo: { icon: "calendar" | "file" | "home" | "clock" | "check" | "user" | "msg" | "edit"; text: string }[];
  progress?: number;
  actions: { label: string; variant?: "default" | "dark" | "accent"; icon?: "preview" | "sofia" | "arrow" | "pdf" | null; action?: "preview" | "sofia" | "edit" }[];
};

const PARECERES: Parecer[] = [];
const HISTORY: { initials: string; name: string; bg: string; meta: string; date: string }[] = [];

const TABS = [
  { key: "all", label: "Todos", count: 0 },
  { key: "todo", label: "A fazer", count: 0 },
  { key: "draft", label: "Rascunho", count: 0 },
  { key: "review", label: "Para revisar", count: 0 },
  { key: "done", label: "Finalizados", count: 0 },
] as const;

const MetaIcon = ({ name }: { name: Parecer["metaInfo"][number]["icon"] }) => {
  const props = { size: 13, strokeWidth: 2 } as const;
  switch (name) {
    case "calendar": return <Calendar {...props} />;
    case "file": return <FileText {...props} />;
    case "home": return <Users {...props} />;
    case "clock": return <Clock {...props} />;
    case "check": return <CheckCircle2 {...props} />;
    case "user": return <Users {...props} />;
    case "msg": return <MessageSquare {...props} />;
    case "edit": return <Edit3 {...props} />;
  }
};

const ActionIcon = ({ name }: { name: NonNullable<Parecer["actions"][number]["icon"]> }) => {
  const props = { size: 13, strokeWidth: 2.2 } as const;
  switch (name) {
    case "preview": return <FileText {...props} />;
    case "sofia": return <Sparkles {...props} />;
    case "arrow": return <ArrowRight {...props} />;
    case "pdf": return <Download {...props} />;
  }
};

function useAnimatedNumber(target: number, duration = 800) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (target === value) return;
    fromRef.current = value;
    startRef.current = null;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const p = Math.min(1, (ts - startRef.current) / duration);
      const next = fromRef.current + (target - fromRef.current) * ease(p);
      setValue(p === 1 ? target : next);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);
  return value;
}

// Status BNCC clicáveis
type BnccStatus = "no" | "na" | "ed" | "co"; // não observada / não alcançada / em desenvolvimento / consolidada
const BNCC_STATUS: Array<{ k: BnccStatus; label: string; short: string; color: string; bg: string }> = [
  { k: "no", label: "Não observada", short: "NO", color: "#6B7280", bg: "#F3F4F6" },
  { k: "na", label: "Não alcançada", short: "NA", color: "#DC2626", bg: "#FDECEC" },
  { k: "ed", label: "Em desenvolvimento", short: "ED", color: "#E9A23B", bg: "#FCF1DC" },
  { k: "co", label: "Consolidada", short: "CO", color: "#16A36B", bg: "#E7F6EE" },
];
// Mesma chave, rótulos adequados à Educação Infantil (sem linguagem comparativa/capacitista).
const BNCC_STATUS_EI: Array<{ k: BnccStatus; label: string; short: string; color: string; bg: string }> = [
  { k: "no", label: "Não observada", short: "NO", color: "#6B7280", bg: "#F3F4F6" },
  { k: "na", label: "Em construção", short: "EC", color: "#6E5BE6", bg: "#EDEAFE" },
  { k: "ed", label: "Desenvolvendo", short: "DE", color: "#E9A23B", bg: "#FCF1DC" },
  { k: "co", label: "Consolidado", short: "CO", color: "#16A36B", bg: "#E7F6EE" },
];

// ===== Educação Infantil — Campos de Experiência + Direitos de Aprendizagem (BNCC) =====
const EI_CAMPOS_EXPERIENCIA: BnccArea[] = [
  { area: "O eu, o outro e o nós", comps: [
    "Conviver com colegas e adultos respeitando diferenças",
    "Brincar em grupo e participar de combinados coletivos",
    "Expressar sentimentos, necessidades e opiniões",
    "Demonstrar autonomia nas rotinas do dia a dia",
  ]},
  { area: "Corpo, gestos e movimentos", comps: [
    "Explorar movimentos corporais em brincadeiras e jogos",
    "Desenvolver coordenação motora ampla e fina",
    "Cuidar do próprio corpo e da higiene com apoio",
    "Vivenciar diferentes ritmos, sons e expressões corporais",
  ]},
  { area: "Traços, sons, cores e formas", comps: [
    "Explorar materiais artísticos e produções gráficas",
    "Apreciar e produzir música, dança e teatro",
    "Manifestar curiosidade por cores, formas e texturas",
  ]},
  { area: "Escuta, fala, pensamento e imaginação", comps: [
    "Participar de rodas de conversa e narrativas",
    "Demonstrar interesse por livros, histórias e leitura compartilhada",
    "Expressar ideias por meio da oralidade e do faz de conta",
    "Reconhecer letras do próprio nome e da turma",
  ]},
  { area: "Espaços, tempos, quantidades, relações e transformações", comps: [
    "Explorar elementos da natureza e fenômenos do cotidiano",
    "Estabelecer relações de quantidade, ordem e medida",
    "Reconhecer rotinas, sequências e marcações de tempo",
    "Investigar causas e transformações com curiosidade",
  ]},
];

const EI_DIREITOS_APRENDIZAGEM = "Conviver · Brincar · Participar · Explorar · Expressar · Conhecer-se";

type BnccArea = { area: string; comps: string[] };
// Comportamento e socialização — avaliado para todos os alunos, mesmo padrão das demais áreas
const BNCC_SOCIO: string[] = [
  "Autonomia e responsabilidade nas tarefas",
  "Cooperação e respeito nas relações",
  "Autorregulação e persistência diante de desafios",
  "Cumprimento de combinados e regras de convivência",
  "Participação em atividades coletivas e trabalhos em grupo",
  "Resolução de conflitos pelo diálogo",
];
// Inclusão (PEI) — adicionado apenas para alunos PCD, mesmo padrão das demais áreas
const BNCC_INCLUSAO: string[] = [
  "Resposta às adaptações curriculares e recursos de acessibilidade",
  "Comunicação e expressão de necessidades",
  "Autonomia nas atividades da rotina escolar",
  "Interação social e vínculo com colegas",
  "Regulação emocional e tolerância à frustração",
  "Progresso em relação às metas do PEI",
];

// Habilidades BNCC por ano de escolaridade (Ensino Fundamental).
// Resumos didáticos por ano — mantidos curtos pra interface.
const BNCC_BY_YEAR: Record<string, BnccArea[]> = {
  "1": [
    { area: "Língua Portuguesa", comps: ["Reconhecer letras, sílabas e sons", "Ler palavras e frases curtas", "Escrever o próprio nome e palavras simples", "Participar de rodas de conversa"] },
    { area: "Matemática", comps: ["Contar, ler e escrever números até 100", "Adição e subtração com material concreto", "Identificar formas geométricas básicas", "Comparar grandezas (maior/menor)"] },
    { area: "Ciências", comps: ["Observar plantas, animais e fenômenos do dia a dia", "Reconhecer partes do corpo e cuidados de higiene"] },
    { area: "Humanas (História/Geografia)", comps: ["Reconhecer-se na família e na escola", "Identificar lugares de vivência"] },
    { area: "Comportamento e socialização", comps: BNCC_SOCIO },
  ],
  "2": [
    { area: "Língua Portuguesa", comps: ["Ler frases e pequenos textos com fluência inicial", "Escrever frases com coerência ortográfica básica", "Compreender textos lidos pela professora", "Relatar experiências oralmente"] },
    { area: "Matemática", comps: ["Números até 1000 e valor posicional", "Adição e subtração com reagrupamento", "Medidas de tempo, comprimento e massa", "Sólidos e figuras planas"] },
    { area: "Ciências", comps: ["Ciclo de vida de plantas e animais", "Materiais e suas propriedades"] },
    { area: "Humanas (História/Geografia)", comps: ["Comunidade, bairro e regras de convivência", "Linha do tempo pessoal e familiar"] },
    { area: "Comportamento e socialização", comps: BNCC_SOCIO },
  ],
  "3": [
    { area: "Língua Portuguesa", comps: ["Leitura fluente de textos curtos", "Produção de textos narrativos simples", "Ortografia regular e pontuação básica", "Oralidade em apresentações curtas"] },
    { area: "Matemática", comps: ["Multiplicação e divisão (ideias iniciais)", "Resolução de problemas em uma operação", "Frações como parte do todo (intuição)", "Leitura de tabelas e gráficos simples"] },
    { area: "Ciências", comps: ["Sistema solar e ambiente terrestre", "Saúde, alimentação e higiene"] },
    { area: "Humanas (História/Geografia)", comps: ["Município, paisagem e mobilidade", "Marcadores de tempo (calendário, gerações)"] },
    { area: "Comportamento e socialização", comps: BNCC_SOCIO },
  ],
  "4": [
    { area: "Língua Portuguesa", comps: ["Compreensão de textos informativos", "Produção de relatos e cartas", "Ortografia: regras contextuais", "Argumentação oral em debates"] },
    { area: "Matemática", comps: ["Operações com números naturais (até milhar)", "Frações e decimais (introdução)", "Perímetro, área e medidas", "Probabilidade e leitura de gráficos"] },
    { area: "Ciências", comps: ["Cadeia alimentar e ecossistemas", "Ciclo da água e estados físicos"] },
    { area: "Humanas (História/Geografia)", comps: ["Estado, regiões do Brasil e diversidade", "Patrimônio cultural"] },
    { area: "Comportamento e socialização", comps: BNCC_SOCIO },
  ],
  "5": [
    { area: "Língua Portuguesa", comps: ["Leitura crítica e inferência", "Produção de textos com coesão e revisão", "Análise linguística (classes de palavras)", "Oralidade argumentativa"] },
    { area: "Matemática", comps: ["Operações com naturais e decimais", "Frações: equivalência e operações", "Geometria: ângulos e simetria", "Estatística: média, tabelas e gráficos"] },
    { area: "Ciências", comps: ["Corpo humano e saúde", "Materiais, energia e sustentabilidade"] },
    { area: "Humanas (História/Geografia)", comps: ["Brasil: povos originários e colonização", "Cartografia e representação do espaço"] },
    { area: "Comportamento e socialização", comps: BNCC_SOCIO },
  ],
  "6": [
    { area: "Língua Portuguesa", comps: ["Gêneros textuais variados (notícia, artigo)", "Produção de textos com revisão autoral", "Análise linguística: morfologia básica", "Práticas de oralidade formal"] },
    { area: "Matemática", comps: ["Números racionais e operações", "Razão, proporção e porcentagem (intro)", "Geometria: figuras e construções", "Estatística e probabilidade"] },
    { area: "Ciências", comps: ["Célula, vida e organização dos seres vivos", "Terra, universo e fenômenos naturais"] },
    { area: "Humanas (História/Geografia)", comps: ["Civilizações antigas e formação cultural", "Espaço geográfico e paisagens"] },
    { area: "Comportamento e socialização", comps: BNCC_SOCIO },
  ],
  "7": [
    { area: "Língua Portuguesa", comps: ["Argumentação em textos opinativos", "Análise crítica de mídias", "Sintaxe: períodos simples", "Oralidade em debates regrados"] },
    { area: "Matemática", comps: ["Inteiros e racionais: operações", "Equações de 1º grau", "Geometria: ângulos, polígonos e simetrias", "Estatística: amostra e gráficos"] },
    { area: "Ciências", comps: ["Ecossistemas e impactos ambientais", "Máquinas simples, energia e movimento"] },
    { area: "Humanas (História/Geografia)", comps: ["Idade Média e Moderna; Brasil colonial", "Regionalização e dinâmicas populacionais"] },
    { area: "Comportamento e socialização", comps: BNCC_SOCIO },
  ],
  "8": [
    { area: "Língua Portuguesa", comps: ["Textos argumentativos e dissertativos", "Análise de discursos e ideologia", "Sintaxe: período composto (intro)", "Oralidade: apresentações estruturadas"] },
    { area: "Matemática", comps: ["Potências, raízes e notação científica", "Equações e sistemas de 1º grau", "Geometria: triângulos e quadriláteros", "Probabilidade e estatística aplicadas"] },
    { area: "Ciências", comps: ["Corpo humano: sistemas integrados", "Eletricidade, magnetismo e ondas (intro)"] },
    { area: "Humanas (História/Geografia)", comps: ["Revoluções modernas e Brasil Império", "Globalização e geopolítica"] },
    { area: "Comportamento e socialização", comps: BNCC_SOCIO },
  ],
  "9": [
    { area: "Língua Portuguesa", comps: ["Produção de artigos de opinião e ensaios", "Leitura crítica de literatura e mídia", "Análise sintática e semântica", "Oralidade em situações públicas"] },
    { area: "Matemática", comps: ["Funções (intro) e equações de 2º grau", "Teorema de Pitágoras e semelhança", "Trigonometria no triângulo retângulo", "Estatística: medidas e inferências"] },
    { area: "Ciências", comps: ["Genética, hereditariedade e evolução", "Química: substâncias, reações e ambiente"] },
    { area: "Humanas (História/Geografia)", comps: ["Século XX: guerras, ditaduras, redemocratização", "Brasil contemporâneo e territórios"] },
    { area: "Comportamento e socialização", comps: BNCC_SOCIO },
  ],
};
const YEAR_OPTIONS = ["1","2","3","4","5","6","7","8","9"];
function bnccAreasFor(year: string): BnccArea[] {
  return BNCC_BY_YEAR[year] || BNCC_BY_YEAR["2"];
}

function isEiTurma(grade?: string | null): boolean {
  return isEducacaoInfantilGrade(grade || "");
}

export function Relatorios() {
  const user = useUser();
  const ctx = useSofiaContext();
  const sofia = useSofia();
  const navigate = useNavigate();
  const isEi = useEiMode();
  const routeSearch = useSearch({ from: "/relatorios" }) as {
    tab?: "all" | "todo" | "draft" | "review" | "done";
    turma?: string;
    pcd?: "todos" | "apenas";
    focus?: "turmas" | "alunos" | "pareceres" | "horas";
  };
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>(routeSearch.tab ?? "all");
  // Sincroniza com mudanças no search param (ex.: deep-link).
  useEffect(() => {
    if (routeSearch.tab && routeSearch.tab !== tab) setTab(routeSearch.tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSearch.tab]);
  const [search, setSearch] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [preview, setPreview] = useState<Parecer | null>(null);

  // Fecha qualquer dropdown da barra de filtros ao clicar fora.
  useEffect(() => {
    if (!openDropdown) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest('.rel-pill') || t.closest('.rel-dropdown')) return;
      setOpenDropdown(null);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [openDropdown]);

  const [filterTurma, setFilterTurma] = useState(routeSearch.turma ?? "Todas");
  const [filterBimestre, setFilterBimestre] = useState("1º");
  const [filterPcd, setFilterPcd] = useState(routeSearch.pcd === "apenas" ? "Apenas PCD" : "Todos");

  // Sincroniza filtros com mudanças nos search params (deep-link vindo do Dashboard).
  useEffect(() => {
    if (routeSearch.turma && routeSearch.turma !== filterTurma) setFilterTurma(routeSearch.turma);
    if (routeSearch.pcd === "apenas" && filterPcd !== "Apenas PCD") setFilterPcd("Apenas PCD");
    if (routeSearch.pcd === "todos" && filterPcd !== "Todos") setFilterPcd("Todos");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSearch.turma, routeSearch.pcd]);

  // Rolagem suave para a seção apropriada quando focus= é informado.
  useEffect(() => {
    if (!routeSearch.focus) return;
    const targetId =
      routeSearch.focus === "horas" ? "rel-kpi-horas" :
      routeSearch.focus === "pareceres" ? "rel-kpi-pareceres" :
      "rel-filters-anchor";
    const el = document.getElementById(targetId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [routeSearch.focus]);

  type DashStudent = { name: string; classRef: string; birth: string; pcd: string; notes: string; createdAt?: string };
  // Identidade estável por aluno — usada como CHAVE para todas as avaliações
  // (BNCC, observações, parecer, ano de referência) persistidas em localStorage.
  // CRÍTICO: jamais derivar este id de índices de array; sempre vincular ao
  // registro do aluno (UUID do banco para alunos cadastrados em Inclusão,
  // ou hash determinístico nome+nascimento para alunos legados em localStorage).
  type DashStudentWithId = DashStudent & { id: string };
  type DashClass = { name: string; school: string; grade: string; shift: string; students: string };
  type DashSchool = { name: string; network: string; stage: string; city: string; uf: string; classes: string };
  const dashClasses: DashClass[] = useDashClasses();
  const [dashSchools] = usePersistentState<DashSchool[]>("dash_schools", []);

  // Alunos cadastrados no banco (Inclusão) — entram automaticamente na lista de Relatórios.
  const { students: dbStudents, update: updateDbStudent, create: createDbStudent, loading: studentsLoading } = useInclusaoStudents();
  const combinedStudents = useMemo<DashStudentWithId[]>(() => {
    const seen = new Set<string>();
    const out: DashStudentWithId[] = [];
    const push = (s: DashStudent, id: string) => {
      const key = s.name.trim().toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push({ ...s, id });
    };
    // Alunos do banco (Inclusão) — fonte única de verdade.
    dbStudents.forEach((s) =>
      push(
        {
          name: s.name,
          classRef: s.turma && s.turma !== "Sem turma" ? s.turma : "",
          birth: s.birth ?? "",
          pcd: s.diag || s.pcd || "nao",
          notes: s.notes ?? "",
          createdAt: s.createdAt,
        },
        `db:${s.id}`,
      ),
    );
    return out;
  }, [dbStudents]);

  // Lookup utilitário — sempre por id estável, nunca por nome.
  // Garante que um aluno homônimo NUNCA receba dados de outro registro.
  const getStudentById = useCallback(
    (id: string) => combinedStudents.find((s) => s.id === id),
    [combinedStudents],
  );

  // Cadastro rápido de aluno (vincula a uma turma já criada)
  const [novoAlunoOpen, setNovoAlunoOpen] = useState(false);
  const [novoAluno, setNovoAluno] = useState<DashStudent>({ name: "", classRef: "", birth: "", pcd: "nao", notes: "" });
  // Quando preenchido, o modal opera em modo "editar dados" do aluno selecionado.
  // Guarda o id estável (local:* ou db:*) e os dados originais para localizar
  // o registro correto ao salvar.
  const [editAluno, setEditAluno] = useState<{ id: string; originalName: string; originalBirth: string } | null>(null);
  const abrirNovoAluno = () => {
    setEditAluno(null);
    setNovoAluno({ name: "", classRef: dashClasses[0]?.name || "", birth: "", pcd: "nao", notes: "" });
    setNovoAlunoOpen(true);
  };
  const abrirEditarAluno = (id: string) => {
    const s = getStudentById(id);
    if (!s) { toast.error("Aluno não encontrado."); return; }
    setEditAluno({ id, originalName: s.name, originalBirth: s.birth || "" });
    setNovoAluno({
      name: s.name,
      classRef: s.classRef || "",
      birth: s.birth || "",
      pcd: s.pcd || "nao",
      notes: s.notes || "",
    });
    setNovoAlunoOpen(true);
  };
  const fecharModalAluno = () => {
    setNovoAlunoOpen(false);
    setEditAluno(null);
  };
  const salvarNovoAluno = () => {
    const nome = novoAluno.name.trim();
    if (!nome) { toast.error("Informe o nome do(a) aluno(a)."); return; }
    if (editAluno) {
      if (editAluno.id.startsWith("db:")) {
        const dbId = editAluno.id.slice(3);
        updateDbStudent(dbId, {
          name: nome,
          turma: novoAluno.classRef || "Sem turma",
          birth: novoAluno.birth || undefined,
          notes: novoAluno.notes || undefined,
          pcd: novoAluno.pcd || undefined,
          diag: novoAluno.pcd && novoAluno.pcd !== "nao" ? novoAluno.pcd : "",
        })
          .then(() => {
            toast.success(`Dados de ${nome} atualizados.`);
            fecharModalAluno();
            setAlunoModal((m) => (m && m.id === editAluno.id ? { ...m, nome, turma: novoAluno.classRef || m.turma, pcd: novoAluno.pcd } : m));
          })
          .catch((err: unknown) => toast.error(`Não foi possível atualizar. ${err instanceof Error ? err.message : ""}`));
      } else {
        toast.error("Aluno legado não encontrado no banco. Recadastre-o.");
      }
      return;
    }
    createDbStudent({
      name: nome,
      initials:
        nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0] ?? "").join("").toUpperCase() || "AL",
      age: "—",
      turma: novoAluno.classRef || "Sem turma",
      diag: novoAluno.pcd && novoAluno.pcd !== "nao" ? novoAluno.pcd : "",
      cid: "",
      aee: "",
      anamnese: "0/14",
      registros: "0",
      trend: "—",
      trendTone: "muted",
      birth: novoAluno.birth || undefined,
      notes: novoAluno.notes || undefined,
      pcd: novoAluno.pcd || undefined,
    })
      .then(() => {
        fecharModalAluno();
        toast.success(`${nome} cadastrado(a) com sucesso.`);
      })
      .catch((err: unknown) => toast.error(`Não foi possível cadastrar. ${err instanceof Error ? err.message : ""}`));
  };

  // Rubrica BNCC por aluno (persistido)
  const [bnccByAluno, setBnccByAluno] = usePersistentState<Record<string, Record<string, BnccStatus>>>("rel_bncc", {});
  // Override de ano de referência por aluno (sobretudo PCD)
  const [yearOverride, setYearOverride] = usePersistentState<Record<string, string>>("rel_bncc_year", {});
  // Observações livres do(a) professor(a) por aluno (persistido junto à avaliação BNCC)
  const [bnccObsByAluno, setBnccObsByAluno] = usePersistentState<Record<string, string>>("rel_bncc_obs", {});
  const [bnccOpen, setBnccOpen] = useState<{ id: string; nome: string; turma: string; pcd?: string } | null>(null);
  // Estado de expansão do campo de observações no modal BNCC.
  // Começa sempre recolhido (Set vazio) para liberar espaço visual.
  const [bnccObsExpanded, setBnccObsExpanded] = useState<Set<string>>(new Set());
  // Sempre que o modal abre para outro aluno, garantimos início recolhido.
  useEffect(() => {
    if (bnccOpen) setBnccObsExpanded(new Set());
  }, [bnccOpen?.id]);
  const [verTodosHist, setVerTodosHist] = useState(false);
  const HIST_LIMIT = 5;

  // Modal unificado por aluno (todo / draft / review / done)
  type AlunoModalData = { id: string; nome: string; turma: string; pcd: string; status: "todo" | "draft" | "review" | "done"; statusLabel: string };
  const [alunoModal, setAlunoModal] = useState<AlunoModalData | null>(null);

  // Modal de status (A FAZER / EM RASCUNHO / FINALIZADOS) acionado nos KPIs
  const [statusModal, setStatusModal] = useState<"todo" | "draft" | "done" | null>(null);

  // Impressão em lote
  const [printSelectOpen, setPrintSelectOpen] = useState(false);
  const [printSelected, setPrintSelected] = useState<Set<string>>(new Set());
  const abrirImpressaoLote = () => {
    // Pré-seleciona os finalizados.
    const finals = alunosLista.filter((a) => a.status === "done").map((a) => a.id);
    setPrintSelected(new Set(finals));
    setPrintSelectOpen(true);
  };
  const togglePrintSelected = (id: string) =>
    setPrintSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  // Tutorial "Como funciona"
  const [tutorialOpen, setTutorialOpen] = useState(false);

  // ===== Parecer descritivo (mesmo modelo da aba Relatórios da Inclusão) =====
  type ParecerNarrativo = {
    titulo?: string; resumo?: string;
    pedagogico?: string; comportamental?: string; sensorial?: string; familia?: string;
    avancos?: string[]; desafios?: string[]; encaminhamentos?: string[];
    comunicacao_familias?: string;
    texto?: string;
    periodoLabel?: string;
    formato?: "topicos" | "texto";
    geradoEm?: string;
    tipo_relatorio?: "parecer_descritivo" | "relatorio_fundamental" | "relatorio_medio";
    nivel_ensino?: string;
  };
  const [parecerByAluno, setParecerByAluno] = usePersistentState<Record<string, ParecerNarrativo>>("rel_parecer", {});
  const [gerandoParecerId, setGerandoParecerId] = useState<string | null>(null);
  const [formatoParecer, setFormatoParecer] = useState<"topicos" | "texto">("topicos");
  type TipoPeriodo = "Bimestral" | "Trimestral" | "Semestral" | "Anual";
  const [tipoPeriodo, setTipoPeriodo] = usePersistentState<TipoPeriodo>("rel_tipo_periodo", "Bimestral");
  const [editandoParecer, setEditandoParecer] = useState(false);
  const [parecerDraft, setParecerDraft] = useState<ParecerNarrativo | null>(null);

  const handleGerarParecerSofia = async (a: { id: string; nome: string; turma: string; pcd: string }) => {
    setGerandoParecerId(a.id);
    try {
      const areas = areasFor(a.id, a.turma, a.pcd);
      const rub = getAlunoRubric(a.id);
      const ei = isEiAluno(a.turma);
      const linhas = areas.map((area, ai) => {
        const itens = area.comps.map((c, ci) => {
          const lbl = statusLabel(a.turma, rub[`${ai}.${ci}`]);
          return `  - ${c}: ${lbl}`;
        }).join("\n");
        return `${area.area}\n${itens}`;
      }).join("\n\n");
      const aluno = getStudentById(a.id);
      const cls = dashClasses.find((c) => c.name === a.turma);
      const periodoLabel = `${bimestreNum}º bimestre · ${new Date().getFullYear()}`;
      const gradeRaw = (cls?.grade || "").trim();
      const isMedio = /medio|médio|EM\b/i.test(`${gradeRaw} ${a.turma}`);
      const nivelEnsino = ei ? "Educação Infantil"
        : isMedio ? "Ensino Médio" : "Ensino Fundamental";
      const tipoRelatorio: ParecerNarrativo["tipo_relatorio"] = ei
        ? "parecer_descritivo"
        : isMedio ? "relatorio_medio" : "relatorio_fundamental";
      const instrucoesEI = ei
        ? `\n\nINSTRUÇÕES OBRIGATÓRIAS (Educação Infantil):\nGere um PARECER DESCRITIVO para criança da Educação Infantil. Use linguagem afetiva, humanizada e acessível à família. Cite os Campos de Experiência da BNCC Infantil trabalhados (${EI_CAMPOS_EXPERIENCIA.map(c => c.area).join("; ")}). Use os Direitos de Aprendizagem como base da avaliação (${EI_DIREITOS_APRENDIZAGEM}). NUNCA use linguagem comparativa entre crianças ou capacitista. Descreva o desenvolvimento de forma narrativa e individualizada. NUNCA mencione ou cite que a informação veio de "observações", "registros", "anotações" ou notas do(a) educador(a) — escreva sempre como conhecimento direto sobre a criança. Prefira expressões como "está desenvolvendo", "demonstra interesse em", "avança em", "em construção" — nunca "não sabe", "não consegue", "fraco" ou similares.`
        : `\n\nINSTRUÇÕES OBRIGATÓRIAS (regra de redação inviolável):\nNUNCA mencione, cite ou faça referência a que a informação veio de "observações", "registros", "anotações", "diário", "anamnese", "PEI", "rubrica BNCC" ou "notas do(a) professor(a)". Escreva sempre como conhecimento direto e consolidado sobre o(a) aluno(a). Evite expressões como "segundo as observações", "de acordo com os registros", "conforme observado", "com base na anamnese" ou "as anotações indicam" — descreva os fatos diretamente, sem citar a origem.`;
      const peiResumo = [
        a.pcd ? `Condição/PCD: ${a.pcd}` : "",
        cls?.grade ? `Ano/Etapa: ${cls.grade}` : "",
        `Nível de ensino: ${nivelEnsino}`,
        aluno?.notes ? `Observações: ${aluno.notes}` : "",
        bnccObsByAluno[a.id]?.trim()
          ? `Observações do professor sobre o aluno: ${bnccObsByAluno[a.id].trim()}`
          : "",
        `${ei ? "Observações por Campos de Experiência (BNCC Infantil)" : "Avaliação BNCC do bimestre por área"}:\n${linhas}${instrucoesEI}`,
      ].filter(Boolean).join("\n");
      const { data, error } = await supabase.functions.invoke("gerar-parecer-inclusao", {
        body: {
          aluno: a.nome,
          diagnostico: a.pcd || "",
          periodo: "Bimestral",
          intervalo: periodoLabel,
          formato: formatoParecer,
          anamneseResumo: "",
          peiResumo,
          registros: [],
          nivel_ensino: nivelEnsino,
          tipo_relatorio: tipoRelatorio,
        },
      });
      if (error) throw error;
      const parecer: ParecerNarrativo = {
        ...((data as { parecer?: ParecerNarrativo })?.parecer || {}),
        periodoLabel,
        formato: formatoParecer,
        geradoEm: new Date().toLocaleString("pt-BR"),
        tipo_relatorio: tipoRelatorio,
        nivel_ensino: nivelEnsino,
      };
      setParecerByAluno((all) => ({ ...all, [a.id]: parecer }));
      toast.success(ei ? "Parecer descritivo gerado pela Sofia." : "Parecer gerado pela Sofia.");
      void consumirCreditos(CUSTOS.parecer_descritivo, descricaoDoc("Parecer descritivo", a.nome));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Não foi possível gerar o parecer. ${msg}`);
    } finally {
      setGerandoParecerId(null);
    }
  };

  const yearForAluno = (id: string, turma: string): string => {
    if (yearOverride[id]) return yearOverride[id];
    const cls = dashClasses.find((c) => c.name === turma);
    const g = cls?.grade?.replace(/\D/g, "");
    return g && YEAR_OPTIONS.includes(g) ? g : "2";
  };
  // EI por aluno: usa o grade da turma (ex.: "pre-2", "maternal-1").
  const isEiAluno = (turma: string): boolean => {
    if (isEi) return true; // perfil docente em EI: trata tudo como EI
    const cls = dashClasses.find((c) => c.name === turma);
    return isEiTurma(cls?.grade);
  };
  // Status (rubrica) adaptado por nível.
  const statusListFor = (turma: string) =>
    isEiAluno(turma) ? BNCC_STATUS_EI : BNCC_STATUS;
  const statusLabel = (turma: string, k?: BnccStatus) =>
    (statusListFor(turma).find((x) => x.k === k)?.label) || "Não observada";

  const areasFor = (id: string, turma: string, pcd?: string): BnccArea[] => {
    if (isEiAluno(turma)) {
      const base = EI_CAMPOS_EXPERIENCIA;
      if (pcd) return [...base, { area: "Inclusão (PEI)", comps: BNCC_INCLUSAO }];
      return base;
    }
    const base = bnccAreasFor(yearForAluno(id, turma));
    if (pcd) return [...base, { area: "Inclusão (PEI)", comps: BNCC_INCLUSAO }];
    return base;
  };
  const competKeysFor = (id: string, turma: string, pcd?: string) => {
    const out: string[] = [];
    areasFor(id, turma, pcd).forEach((a, i) => a.comps.forEach((_c, j) => out.push(`${i}.${j}`)));
    return out;
  };
  const getAlunoRubric = (id: string) => bnccByAluno[id] || {};
  const setAlunoStatus = (id: string, key: string, status: BnccStatus) =>
    setBnccByAluno((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: status } }));
  const setAreaStatus = (id: string, areaIdx: number, count: number, status: BnccStatus) =>
    setBnccByAluno((prev) => {
      const cur = { ...(prev[id] || {}) };
      for (let j = 0; j < count; j++) cur[`${areaIdx}.${j}`] = status;
      return { ...prev, [id]: cur };
    });
  const clearAreaStatus = (id: string, areaIdx: number, count: number) =>
    setBnccByAluno((prev) => {
      const cur = { ...(prev[id] || {}) };
      for (let j = 0; j < count; j++) delete cur[`${areaIdx}.${j}`];
      return { ...prev, [id]: cur };
    });
  const cycleStatus = (cur: BnccStatus | undefined): BnccStatus => {
    const order: BnccStatus[] = ["no", "na", "ed", "co"];
    return order[(order.indexOf(cur || "no") + 1) % order.length];
  };
  const computeProgress = (id: string, turma: string, pcd?: string) => {
    const rub = getAlunoRubric(id);
    const keys = competKeysFor(id, turma, pcd);
    let preenchido = 0; let pesoTotal = 0; let pontos = 0;
    let naoObservadas = 0; let semAvaliacao = 0;
    keys.forEach((k) => {
      const s = rub[k];
      if (!s) { semAvaliacao += 1; return; }
      if (s === "no") { naoObservadas += 1; return; }
      preenchido += 1;
      pesoTotal += 3;
      if (s === "ed") pontos += 2;
      else if (s === "co") pontos += 3;
    });
    // Itens marcados como "Não observada" são desconsiderados do denominador.
    const universo = Math.max(0, keys.length - naoObservadas);
    const pctPreenchido = universo > 0 ? Math.round((preenchido / universo) * 100) : 0;
    const pctDesempenho = pesoTotal ? Math.round((pontos / pesoTotal) * 100) : 0;
    return { pctPreenchido, pctDesempenho, naoObservadas, semAvaliacao, total: keys.length };
  };

  // ===== Helpers de impressão (parecer único e em lote) =====
  const escHtmlBasic = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /** Bloco editorial de identificação: só renderiza campos preenchidos. */
  const buildIdentBlock = (info: {
    aluno: { nome: string; turma?: string; pcd?: string };
    escola?: string;
    professor?: string;
    periodo?: string;
  }): string => {
    const fields: Array<{ label: string; value: string }> = [];
    if (info.aluno.nome) fields.push({ label: "Estudante", value: info.aluno.nome });
    if (info.aluno.turma) fields.push({ label: "Turma", value: info.aluno.turma });
    if (info.escola) fields.push({ label: "Escola", value: info.escola });
    if (info.periodo) fields.push({ label: "Período avaliado", value: info.periodo });
    if (info.professor) fields.push({ label: "Professor(a)", value: info.professor });
    if (info.aluno.pcd) fields.push({ label: "PCD", value: info.aluno.pcd });
    if (fields.length === 0) return "";
    const cells = fields
      .map(
        (f) => `<div class="field-box">
    <div class="field-label">${escHtmlBasic(f.label)}</div>
    <div class="field-value">${escHtmlBasic(f.value)}</div>
  </div>`,
      )
      .join("");
    return `<div class="grid-2">${cells}</div>`;
  };

  const buildReportBodyFor = (a: { id: string; nome: string; turma: string; pcd: string }) => {
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const ulHtml = (arr?: string[]) => (arr && arr.length ? `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "");
    const areas = areasFor(a.id, a.turma, a.pcd);
    const rub = getAlunoRubric(a.id);
    const dataStr = new Date().toLocaleDateString("pt-BR");
    const aluno = getStudentById(a.id);
    const cls = dashClasses.find((c) => c.name === a.turma);
    const escola = dashSchools.find((s) => s.name === cls?.school);
    const parecerAluno = parecerByAluno[a.id] || null;
    const parecerHtml = parecerAluno
      ? (parecerAluno.formato === "texto" && parecerAluno.texto
          ? `<section><h2>Parecer descritivo</h2><div>${esc(parecerAluno.texto).split(/\n+/).map((p) => `<p style="text-align:justify;margin:0 0 8pt;">${p}</p>`).join("")}</div></section>`
          : `<section><h2>Parecer descritivo</h2>
              ${parecerAluno.resumo ? `<p><b>Resumo:</b> ${esc(parecerAluno.resumo)}</p>` : ""}
              ${parecerAluno.pedagogico ? `<h3>Pedagógico</h3><p>${esc(parecerAluno.pedagogico)}</p>` : ""}
              ${parecerAluno.comportamental ? `<h3>Comportamental</h3><p>${esc(parecerAluno.comportamental)}</p>` : ""}
              ${parecerAluno.sensorial ? `<h3>Sensorial</h3><p>${esc(parecerAluno.sensorial)}</p>` : ""}
              ${parecerAluno.familia ? `<h3>Família</h3><p>${esc(parecerAluno.familia)}</p>` : ""}
              ${parecerAluno.avancos?.length ? `<h3>Avanços</h3>${ulHtml(parecerAluno.avancos)}` : ""}
              ${parecerAluno.desafios?.length ? `<h3>Desafios</h3>${ulHtml(parecerAluno.desafios)}` : ""}
              ${parecerAluno.encaminhamentos?.length ? `<h3>Encaminhamentos</h3>${ulHtml(parecerAluno.encaminhamentos)}` : ""}
              ${parecerAluno.comunicacao_familias ? `<h3>Comunicação à família</h3><p>${esc(parecerAluno.comunicacao_familias)}</p>` : ""}
            </section>`)
      : "";
    // Habilidades BNCC removidas do documento exportado — manter somente texto corrido.
    void areas; void rub;
    return `<article class="report">
<h1>Parecer descritivo · ${esc(a.nome)}</h1>
${buildIdentBlock({ aluno: a, escola: escola?.name, professor: user.name, periodo: `${bimestreNum}º bimestre` })}
${aluno?.notes ? `<section><h2>Observações</h2><p>${esc(aluno.notes)}</p></section>` : ""}
${parecerHtml}
<div class="sig">
  <div>Professor(a) responsável<br/>${esc(user.name || "")}</div>
  <div>Coordenação pedagógica</div>
  <div>Família / Responsável</div>
</div>
<div class="foot">Documento gerado em ${esc(dataStr)} · Sofia · Pareceres descritivos</div>
</article>`;
  };

  // Apenas regras de quebra de página — toda a tipografia/cores
  // herdam do CSS editorial (editorialPrint.ts).
  const PRINT_CSS = `
.report{page-break-after:always;}
.report:last-of-type{page-break-after:auto;}
article.report > section{ page-break-inside:avoid; break-inside:avoid; }
`;

  const printBatchReports = (alunos: { id: string; nome: string; turma: string; pcd: string }[]) => {
    if (alunos.length === 0) { toast.error("Selecione ao menos um aluno."); return; }
    const bodies = alunos.map((a) => buildReportBodyFor(a)).join("\n");
    const html = wrapStandardPrintHtml(`Pareceres · ${alunos.length} aluno(s)`, bodies, {
      extraCss: PRINT_CSS,
      professorNome: user.name,
      docType: "parecer",
    });
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) { toast.error("Permita pop-ups para imprimir."); return; }
    w.document.open(); w.document.write(html); w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch { /* ignore */ } }, 400);
    toast.success(`Abrindo impressão de ${alunos.length} parecer(es) — escolha 'Salvar como PDF' se preferir.`);
  };

  // Deriva valores do SofiaContext (fallback) — os valores REAIS são recalculados
  // mais abaixo a partir da `alunosLista` desta página (estado real do usuário).
  const alunosCount = combinedStudents.length > 0 ? combinedStudents.length : ctx.dataState.alunos_count;

  // Mesmo cálculo da página inicial (Tempo devolvido)
  const earnedMinutes =
    dashSchools.length * 10 +
    dashClasses.length * 20 +
    dbStudents.length * 5 +
    (user.documentsGenerated || ctx.dataState.pareceres_finalizados) * 45;
  const totalSavedMin = (user.hoursSavedWeek * 60) + user.minutesSavedWeek + earnedMinutes;
  const animatedMin = useAnimatedNumber(totalSavedMin, 900);
  const savedH = Math.floor(animatedMin / 60);
  const savedM = Math.round(animatedMin % 60);
  const [bump, setBump] = useState(false);
  const prevTotalRef = useRef(totalSavedMin);
  useEffect(() => {
    if (prevTotalRef.current !== totalSavedMin) {
      prevTotalRef.current = totalSavedMin;
      setBump(true);
      const t = setTimeout(() => setBump(false), 700);
      return () => clearTimeout(t);
    }
  }, [totalSavedMin]);
  const bimestreNum = (() => { const m = new Date().getMonth() + 1; return Math.min(4, Math.ceil(m / 3)); })();
  // Período de avaliação selecionado pelo professor (Bimestral/Trimestral/Semestral/Anual)
  const periodoQtd = tipoPeriodo === "Bimestral" ? 4 : tipoPeriodo === "Trimestral" ? 3 : tipoPeriodo === "Semestral" ? 2 : 1;
  const periodoNum = (() => { const m = new Date().getMonth() + 1; return Math.min(periodoQtd, Math.ceil((m * periodoQtd) / 12)); })();
  const periodoNomeLower = tipoPeriodo === "Bimestral" ? "bimestre" : tipoPeriodo === "Trimestral" ? "trimestre" : tipoPeriodo === "Semestral" ? "semestre" : "ano letivo";
  const periodoNomeUpper = periodoNomeLower.toUpperCase();
  const periodoOrdinal = tipoPeriodo === "Anual" ? "" : `${periodoNum}º `;
  const periodoTituloUpper = tipoPeriodo === "Anual" ? "ANO LETIVO" : `${periodoNomeUpper} ${periodoNum}º`;
  const periodoTituloLower = tipoPeriodo === "Anual" ? "ano letivo" : `${periodoNum}º ${periodoNomeLower}`;
  const isPro = ctx.user.plano === "pro" || combinedStudents.length > 0;
  const alunoFoco = ctx.entity.todos_alunos_pcd[0]?.nome || "o primeiro aluno";

  // Lista por aluno (estado Pro)
  const alunosLista = useMemo(() => {
    type Item = { id: string; nome: string; turma: string; pcd: string; status: "done" | "draft" | "review" | "todo"; statusLabel: string; naoObservadas: number };
    const STATUS_LABEL: Record<Item["status"], string> = {
      todo: "A FAZER", draft: "RASCUNHO", review: "PARA REVISAR", done: "FINALIZADO",
    };
    const deriveStatus = (id: string, turma: string, pcd: string): { status: Item["status"]; naoObservadas: number } => {
      const { pctPreenchido, naoObservadas, total } = computeProgress(id, turma, pcd);
      const temParecer = Boolean(parecerByAluno[id]);
      if (temParecer) return { status: "done", naoObservadas };
      if (total === 0) return { status: "todo", naoObservadas };
      // pctPreenchido considera apenas o universo avaliável (exclui "Não observada").
      if (pctPreenchido >= 100) return { status: "review", naoObservadas };
      if (pctPreenchido > 0) return { status: "draft", naoObservadas };
      return { status: "todo", naoObservadas };
    };
    if (combinedStudents.length > 0) {
      return combinedStudents.map((s): Item => {
        const id = s.id;
        const turma = s.classRef || "";
        const pcd = s.pcd && s.pcd !== "nao" ? s.pcd : "";
        const { status, naoObservadas } = deriveStatus(id, turma, pcd);
        return { id, nome: s.name, turma, pcd, status, statusLabel: STATUS_LABEL[status], naoObservadas };
      });
    }
    if (!isPro || alunosCount === 0) return [] as Item[];
    const out: Item[] = [];
    const pcd = ctx.entity.todos_alunos_pcd;
    for (let i = 0; i < alunosCount; i++) {
      const nome = i < pcd.length ? pcd[i].nome : `Aluno(a) ${i + 1}`;
      const id = `al-${i}`;
      const turma = ctx.entity.turma_atual?.nome || "";
      const { status, naoObservadas } = deriveStatus(id, turma, "");
      out.push({ id, nome, turma, pcd: "", status, statusLabel: STATUS_LABEL[status], naoObservadas });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro, alunosCount, ctx.entity.todos_alunos_pcd, ctx.entity.turma_atual, combinedStudents, bnccByAluno, parecerByAluno, yearOverride]);

  const alunosFiltered = useMemo(() => alunosLista.filter((a) => {
    if (tab !== "all" && a.status !== tab) return false;
    if (search && !a.nome.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTurma !== "Todas" && a.turma !== filterTurma) return false;
    if (filterPcd === "Apenas PCD" && !a.pcd) return false;
    return true;
  }), [alunosLista, tab, search, filterTurma, filterPcd]);

  // Contagens reais derivadas da lista de alunos (PROGRESSO DO BIMESTRE / KPIs).
  const finalizados = alunosLista.filter((a) => a.status === "done").length;
  const rascunhos = alunosLista.filter((a) => a.status === "draft").length;
  const aRevisar = alunosLista.filter((a) => a.status === "review").length;
  const aFazer = alunosLista.filter((a) => a.status === "todo").length;
  const totalAlunos = alunosLista.length || alunosCount;
  const pct = totalAlunos > 0 ? Math.round((finalizados / totalAlunos) * 100) : 0;
  const restantes = Math.max(0, totalAlunos - finalizados);

  // Valores reais para o banner — refletem a página, não dados mockados.
  // "Iniciado" = qualquer aluno com observação preenchida ou parecer gerado.
  const iniciados = rascunhos + aRevisar + finalizados;
  const totalBim = iniciados;
  // Estimativa: cada parecer finalizado economiza ~30min de redação manual.
  const horasEcon = Math.round((finalizados * 45) / 60);

  // Bubble Sofia contextual (proativo)
  const bubbleMsg = (() => {
    if (!isPro) return null;
    if (totalBim === 0 && alunosCount > 0) return `${alunosCount} alunos prontos pra parecer. Gero todos em rascunho de uma vez ou começamos pelo ${alunoFoco}?`;
    if (pct >= 100) return `Bimestre fechado! 🧡 ${horasEcon}h economizadas. Quer exportar tudo em PDF pra coordenação?`;
    if (pct > 0 && pct < 100) return `${finalizados} prontos, faltam ${restantes}. Sigo gerando ou você quer revisar antes?`;
    return null;
  })();

  const filtered = useMemo(() => {
    return PARECERES.filter((p) => {
      if (tab !== "all" && p.status !== tab) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterPcd === "Apenas PCD" && !p.pcd) return false;
      return true;
    });
  }, [tab, search, filterPcd]);

  const goSofia = (p: Parecer) => navigate({ to: "/assistente", search: { aluno: p.id } as never });
  const goEdit = (p: Parecer) => navigate({ to: "/assistente", search: { aluno: p.id, mode: "editar" } as never });
  const goLote = () => navigate({ to: "/assistente", search: { mode: "lote" } as never });

  const handleAction = (p: Parecer, action?: string) => {
    if (action === "sofia") goSofia(p);
    else if (action === "edit") goEdit(p);
    else if (action === "preview") setPreview(p);
  };

  const Dropdown = ({ id, options, value, onChange }: { id: string; options: string[]; value: string; onChange: (v: string) => void }) =>
    openDropdown === id ? (
      <div className="rel-dropdown" role="menu" onClick={(e) => e.stopPropagation()}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-checked={value === o}
            role="menuitemradio"
            onClick={(e) => { e.stopPropagation(); onChange(o); setOpenDropdown(null); }}
          >{o}</button>
        ))}
      </div>
    ) : null;

  return (
    <div className="rel-root">
      <style dangerouslySetInnerHTML={{ __html: sidebarCss + css + emptyStateCss }} />
      <AppSidebar active="reports" />

      <main className="rel-main">
        <AppHeader
          breadcrumb={[{ label: "Sua sala" }, { label: "Relatórios" }, { label: isEi ? "Relatórios de desenvolvimento" : "Pareceres descritivos" }]}
          actions={
            <>
              <button className="ah-icon" aria-label="Buscar"><Search size={16} /></button>
              <button className="ah-icon" aria-label="Notificações"><Bell size={16} /></button>
            </>
          }
        />

        <div className="rel-page">
          {/* HERO */}
          <section className="rel-hero">
            <div className="rel-hero-grid">
              <div>
              <span className="rel-eyebrow"><Star size={12} fill="currentColor" /> {
                alunosCount === 0
                  ? "CADASTRE SUA TURMA PARA COMEÇAR"
                  : totalBim === 0
                    ? (isEi ? "COMECE PELOS RELATÓRIOS DE DESENVOLVIMENTO" : "COMECE PELOS PARECERES")
                    : pct >= 100
                      ? `BIMESTRE ${bimestreNum}º · TUDO FINALIZADO`
                      : aRevisar > 0
                        ? `BIMESTRE ${bimestreNum}º · ${aRevisar} PRONTO${aRevisar > 1 ? "S" : ""} PARA REVISAR`
                        : rascunhos > 0
                          ? `BIMESTRE ${bimestreNum}º · ${rascunhos} RASCUNHO${rascunhos > 1 ? "S" : ""} EM ANDAMENTO`
                          : `BIMESTRE ${bimestreNum}º · ${pct}% CONCLUÍDO`
              }</span>
                {alunosCount === 0 ? (
                  <>
                    <h1>Cadastre sua turma<br />para começar.</h1>
                    <p>Adicione seus alunos em <b>Inclusão</b> ou no <b>Dashboard</b> para gerar {isEi ? "relatórios" : "pareceres"} aqui.</p>
                  </>
                ) : totalBim === 0 ? (
                  <>
                    <h1>{isEi ? <>Nenhum relatório<br />gerado ainda.</> : <>Nenhum parecer<br />gerado ainda.</>}</h1>
                    <p>{isEi
                      ? `${alunosCount} criança(s) cadastrada(s). Gere o primeiro relatório de desenvolvimento com a Sofia em poucos minutos.`
                      : `${alunosCount} aluno(s) cadastrado(s). Gere o primeiro parecer descritivo com a Sofia em poucos minutos.`}</p>
                  </>
                ) : pct >= 100 ? (
                  <>
                    <h1>{isEi ? "Relatórios" : "Pareceres"} do {bimestreNum}º bimestre<br /><em>todos prontos</em>: {finalizados}/{totalAlunos}.</h1>
                    <p>Bimestre fechado{horasEcon > 0 ? ` — cerca de ${horasEcon}h economizadas` : ""}. Exporte em PDF para a coordenação ou siga para o próximo bimestre.</p>
                  </>
                ) : (
                  <>
                    <h1>{isEi ? "Relatórios" : "Pareceres"} do {bimestreNum}º bimestre<br /><em>{finalizados}/{totalAlunos}</em> prontos.</h1>
                    <p>{(() => {
                      const parts: string[] = [];
                      if (aRevisar > 0) parts.push(`${aRevisar} ${aRevisar > 1 ? "prontos" : "pronto"} para revisar (100% observado, falta gerar)`);
                      if (rascunhos > 0) parts.push(`${rascunhos} em rascunho (observações parciais)`);
                      if (aFazer > 0) parts.push(`${aFazer} ainda sem observações`);
                      const head = parts.length ? parts.join(" · ") + "." : "Quase lá.";
                      const tail =
                        aRevisar > 0
                          ? ` Comece pelos ${aRevisar} prontos para revisar — é o caminho mais rápido para fechar o bimestre.`
                          : rascunhos > 0
                            ? ` Continue de onde parou nos rascunhos para destravar a geração.`
                            : aFazer > 0
                              ? ` Registre as primeiras observações para destravar a Sofia.`
                              : restantes > 0 ? ` Faltam ${restantes} para fechar o bimestre.` : "";
                      return head + tail;
                    })()}</p>
                  </>
                )}
                <div className="rel-hero-cta">
                  <button className="rel-btn-primary" onClick={goLote} aria-label="Gerar com a Sofia">
                    <Sparkles size={14} strokeWidth={2.4} /> {
                      alunosCount === 0
                        ? "Cadastrar alunos"
                        : totalBim === 0
                          ? (isEi ? "Gerar primeiro relatório" : "Gerar primeiro parecer")
                          : aRevisar > 0
                            ? `Revisar ${aRevisar} pronto${aRevisar > 1 ? "s" : ""}`
                            : rascunhos > 0
                              ? `Continuar ${rascunhos} rascunho${rascunhos > 1 ? "s" : ""}`
                              : aFazer > 0
                                ? `Iniciar ${aFazer} a fazer`
                                : "Exportar tudo (PDF)"
                    } <ArrowRight size={14} strokeWidth={2.4} />
                  </button>
                  <button className="rel-btn-ghost" aria-label="Ver como funciona" onClick={() => setTutorialOpen(true)}>
                    <PlayCircle size={14} /> Como funciona · 60s
                  </button>
                </div>
              </div>
              <div className="rel-pc">
                <div className="rel-pc-title">PROGRESSO DO BIMESTRE</div>
                <div className="rel-pc-num">{finalizados}<span>/{totalAlunos} alunos</span></div>
                <div className="rel-pc-bar"><i style={{ width: `${pct}%` }} /></div>
                <div className="rel-pc-meta"><span>{pct}% concluído</span><span>{horasEcon > 0 ? `~${horasEcon}h economizadas` : "sem economia ainda"}</span></div>
              </div>
            </div>
          </section>

          {/* KPIs */}
          <div className="rel-kpis">
            <div
              className="rel-kpi"
              role="button"
              tabIndex={0}
              onClick={() => setStatusModal("todo")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setStatusModal("todo"); } }}
              style={{ cursor: "pointer" }}
              aria-label={`Ver ${aFazer} aluno(s) a fazer`}
            >
              <div className="rel-kpi-top"><span className="rel-kpi-label">A FAZER</span><div className="rel-kpi-icon amber"><Clock size={15} strokeWidth={2.2} /></div></div>
              <div className="rel-kpi-num">{aFazer}<small> alunos</small></div>
              <div className="rel-kpi-foot">{aFazer > 0 ? `${aFazer} pendente(s)` : "—"}</div>
            </div>
            <div
              className="rel-kpi"
              role="button"
              tabIndex={0}
              onClick={() => setStatusModal("draft")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setStatusModal("draft"); } }}
              style={{ cursor: "pointer" }}
              aria-label={`Ver ${rascunhos} aluno(s) em rascunho`}
            >
              <div className="rel-kpi-top"><span className="rel-kpi-label">EM RASCUNHO</span><div className="rel-kpi-icon violet"><Edit3 size={15} strokeWidth={2.2} /></div></div>
              <div className="rel-kpi-num">{rascunhos}<small> pareceres</small></div>
              <div className="rel-kpi-foot">{rascunhos > 0 ? "aguardando revisão" : "—"}</div>
            </div>
            <div
              className="rel-kpi"
              id="rel-kpi-pareceres"
              role="button"
              tabIndex={0}
              onClick={() => setStatusModal("done")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setStatusModal("done"); } }}
              style={{ cursor: "pointer" }}
              aria-label={`Ver ${finalizados} aluno(s) finalizados`}
            >
              <div className="rel-kpi-top"><span className="rel-kpi-label">FINALIZADOS</span><div className="rel-kpi-icon green"><CheckCircle2 size={15} strokeWidth={2.2} /></div></div>
              <div className="rel-kpi-num">{finalizados}<small>/{alunosCount}</small></div>
              <div className="rel-kpi-foot">{pct}% do bimestre</div>
            </div>
            <div
              id="rel-kpi-horas"
              className={"rel-kpi rel-kpi-dark kpi-tip-host" + (bump ? " is-bump" : "")}
              tabIndex={0}
              aria-label="Como calculamos o tempo economizado"
              style={{ background: "linear-gradient(135deg,#0F1B36 0%,#1B2A4E 100%)", color: "#fff", borderColor: "transparent", position: "relative", cursor: "help" }}
            >
              <div className="rel-kpi-top">
                <span className="rel-kpi-label" style={{ color: "rgba(255,255,255,.7)" }}>TEMPO ECONOMIZADO</span>
                <div className="rel-kpi-icon orange"><Sparkles size={15} strokeWidth={2.2} /></div>
              </div>
              <div className="rel-kpi-num rel-kpi-anim" style={{ color: "#fff", transition: "transform .4s cubic-bezier(.2,.8,.2,1)", transform: bump ? "scale(1.06)" : "scale(1)" }}>
                {savedH}h<small style={{ color: "rgba(255,255,255,.75)" }}>{String(savedM).padStart(2, "0")}min</small>
              </div>
              <div className="rel-kpi-foot" style={{ color: "rgba(255,255,255,.7)" }}>
                {totalSavedMin > 0 ? "vs. escrita manual" : "comece a usar a Sofia"}
              </div>
              <span aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 80% 0%, rgba(255,106,44,.25), transparent 60%)", opacity: bump ? 1 : 0, transition: "opacity .6s ease" }} />
              <div className="kpi-tip" role="tooltip">
                <div className="kpi-tip-title">Como calculamos</div>
                <ul className="kpi-tip-list">
                  <li><span>Baseline semanal</span><b>{user.hoursSavedWeek}h {String(user.minutesSavedWeek).padStart(2,"0")}min</b></li>
                  <li><span>Escolas cadastradas · {dashSchools.length} × 10min</span><b>{dashSchools.length * 10}min</b></li>
                  <li><span>Turmas cadastradas · {dashClasses.length} × 20min</span><b>{dashClasses.length * 20}min</b></li>
                  <li><span>Alunos cadastrados · {dbStudents.length} × 5min</span><b>{dbStudents.length * 5}min</b></li>
                  <li><span>Documentos finalizados · {(user.documentsGenerated || finalizados)} × 30min</span><b>{(user.documentsGenerated || finalizados) * 30}min</b></li>
                </ul>
                <div className="kpi-tip-total"><span>Total</span><b>{Math.floor(totalSavedMin/60)}h {String(totalSavedMin%60).padStart(2,"0")}min</b></div>
                <span className="kpi-tip-arrow" aria-hidden />
              </div>
            </div>
          </div>

          {bubbleMsg && (
            <div style={{ marginTop: 18, background: "linear-gradient(135deg,#1E1B2E 0%,#15131F 100%)", border: "1px solid #2A2438", borderRadius: 14, padding: "16px 18px", color: "#fff", display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#F97316,#EA580C)", display: "grid", placeItems: "center" }}><Sparkles size={16} color="#fff" /></div>
              <div style={{ flex: 1, fontSize: 14, lineHeight: 1.5 }}>{bubbleMsg}</div>
              <button onClick={goLote} style={{ background: "linear-gradient(135deg,#F97316,#EA580C)", color: "#fff", padding: "9px 14px", borderRadius: 10, fontWeight: 700, fontSize: 13, border: 0, cursor: "pointer" }}>Continuar com a Sofia</button>
            </div>
          )}

          {/* Section header */}
          <div className="rel-sec-head">
            <div>
              <h2>Pareceres deste bimestre</h2>
              <p>Filtre por status, turma ou aluno. Clique para gerar com a Sofia ou abrir o rascunho.</p>
            </div>
            <div className="rel-sec-actions">
              <button
                className="rel-pill"
                onClick={abrirImpressaoLote}
                title="Selecionar vários alunos e imprimir/exportar em PDF de uma só vez"
              >
                <Download size={13} /> Imprimir vários
              </button>
              <GerarRelatorioButton label="Editor de Relatório" />
              <button
                className="rel-pill"
                onClick={abrirNovoAluno}
                style={{ background: "var(--primary-dark)", color: "#fff", border: 0 }}
                title="Cadastrar novo aluno e vincular a uma turma"
              >
                <UserPlus size={13} /> Cadastrar aluno
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="rel-filters" id="rel-filters-anchor">
            <div className="rel-tabs" role="tablist">
              {TABS.map((t) => {
                const count = t.key === "all"
                  ? alunosLista.length
                  : alunosLista.filter((a) => a.status === t.key).length;
                return (
                  <button key={t.key} role="tab" aria-selected={tab === t.key}
                    className={"rel-tab" + (tab === t.key ? " active" : "")}
                    onClick={() => setTab(t.key)}>
                    {t.label} <span className="count">{count}</span>
                  </button>
                );
              })}
            </div>
            <div className="rel-divider" />
            <div
              className="rel-pill"
              role="button"
              tabIndex={0}
              aria-haspopup="menu"
              aria-expanded={openDropdown === "turma"}
              onClick={() => setOpenDropdown(openDropdown === "turma" ? null : "turma")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenDropdown(openDropdown === "turma" ? null : "turma"); } }}
            >
              <Calendar size={13} /> Turma · {filterTurma} <ChevronDown size={11} strokeWidth={2.4} />
              <Dropdown id="turma" value={filterTurma} onChange={setFilterTurma}
                options={["Todas", ...dashClasses.map((c) => c.name)]} />
            </div>
            <div
              className="rel-pill"
              role="button"
              tabIndex={0}
              aria-haspopup="menu"
              aria-expanded={openDropdown === "bim"}
              onClick={() => setOpenDropdown(openDropdown === "bim" ? null : "bim")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenDropdown(openDropdown === "bim" ? null : "bim"); } }}
            >
              <Calendar size={13} /> Bimestre · {filterBimestre} <ChevronDown size={11} strokeWidth={2.4} />
              <Dropdown id="bim" value={filterBimestre} onChange={setFilterBimestre}
                options={["1º", "2º", "3º", "4º"]} />
            </div>
            <div
              className="rel-pill"
              role="button"
              tabIndex={0}
              aria-haspopup="menu"
              aria-expanded={openDropdown === "pcd"}
              onClick={() => setOpenDropdown(openDropdown === "pcd" ? null : "pcd")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenDropdown(openDropdown === "pcd" ? null : "pcd"); } }}
            >
              <Filter size={13} /> {filterPcd === "Todos" ? "PCD" : `PCD · ${filterPcd}`} <ChevronDown size={11} strokeWidth={2.4} />
              <Dropdown id="pcd" value={filterPcd} onChange={setFilterPcd}
                options={["Todos", "Apenas PCD"]} />
            </div>
            <div className="rel-search-mini">
              <Search size={13} color="#7a8194" />
              <input placeholder="Buscar aluno..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar aluno" />
            </div>
          </div>

          {/* Cards grid */}
          <div className="rel-grid">
            {studentsLoading && combinedStudents.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <article key={`sk-${i}`} className="rel-card" style={{ pointerEvents: "none" }}>
                  <div className="rel-card-head">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="rel-stu" style={{ flex: 1 }}>
                      <Skeleton className="h-3 w-32 mb-2" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-24 mt-2" />
                  <Skeleton className="h-2 w-full mt-3" />
                  <Skeleton className="h-2 w-2/3 mt-2" />
                </article>
              ))
            ) : null}
            {!studentsLoading && filtered.length === 0 && alunosFiltered.length === 0 && (
              <EmptyState
                icon="📝"
                title="Nenhum parecer gerado ainda."
                description="Cadastre seus alunos e gere o primeiro parecer descritivo com a Sofia."
                ctaLabel="Gerar primeiro parecer"
                onCta={goLote}
              />
            )}

            {!studentsLoading && alunosFiltered.map((a) => (
              <article
                key={a.id}
                className="rel-card"
                onClick={() => setAlunoModal({ id: a.id, nome: a.nome, turma: a.turma, pcd: a.pcd, status: a.status, statusLabel: a.statusLabel })}
                style={{ cursor: "pointer" }}
              >
                <div className="rel-card-head">
                  <div className="rel-av">{a.nome.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}</div>
                  <div className="rel-stu">
                    <b>{a.nome}</b>
                    <small>{a.turma || ctx.entity.turma_atual?.nome || "Sem turma"} · {bimestreNum}º bimestre</small>
                  </div>
                  {a.pcd && <span className="rel-badge pcd">PCD</span>}
                </div>
                <span className={"rel-status " + a.status}><span className="dot" />{a.statusLabel}</span>
                {(() => {
                   const { pctPreenchido, pctDesempenho, naoObservadas } = computeProgress(a.id, a.turma, a.pcd);
                  return (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-soft)", marginBottom: 4 }}>
                        <span>BNCC · {pctPreenchido}% avaliado</span>
                        <span>Desempenho {pctDesempenho}%</span>
                      </div>
                      <div className="rel-progress"><i style={{ width: `${pctPreenchido}%` }} /></div>
                      {naoObservadas > 0 && (
                        <div
                          title="Itens marcados como 'Não observada' não entram no cálculo. Avalie-os para refletir no parecer."
                          style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px", borderRadius: 999, background: "#FFF7ED", color: "#9A3412", border: "1px solid #FED7AA", fontSize: 11, fontWeight: 600 }}
                        >
                          <span aria-hidden>⚠</span>
                          {naoObservadas} {naoObservadas === 1 ? "item não observado" : "itens não observados"}
                        </div>
                      )}
                    </div>
                  );
                })()}
                <div className="rel-card-foot" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="rel-btn-card"
                    onClick={() => setBnccOpen({ id: a.id, nome: a.nome, turma: a.turma, pcd: a.pcd })}
                    aria-label={`${isEiAluno(a.turma) ? "Avaliar por Campos de Experiência" : "Avaliar competências BNCC"} de ${a.nome}`}
                  >
                    <ClipboardList size={13} /> {isEiAluno(a.turma) ? "Avaliar Campos" : "Avaliar BNCC"}
                  </button>
                  {a.status === "todo" && (
                    <button className="rel-btn-card accent" onClick={() => setAlunoModal({ id: a.id, nome: a.nome, turma: a.turma, pcd: a.pcd, status: a.status, statusLabel: a.statusLabel })}>
                      <Sparkles size={13} /> Gerar com Sofia
                    </button>
                  )}
                  {a.status === "draft" && (
                    <button className="rel-btn-card dark" onClick={() => setAlunoModal({ id: a.id, nome: a.nome, turma: a.turma, pcd: a.pcd, status: a.status, statusLabel: a.statusLabel })}>
                      <Edit3 size={13} /> Abrir rascunho
                    </button>
                  )}
                  {a.status === "review" && (
                    <button className="rel-btn-card accent" onClick={() => setAlunoModal({ id: a.id, nome: a.nome, turma: a.turma, pcd: a.pcd, status: a.status, statusLabel: a.statusLabel })}>
                      <CheckCircle2 size={13} /> Revisar e gerar
                    </button>
                  )}
                  {a.status === "done" && (
                    <button className="rel-btn-card" onClick={() => setAlunoModal({ id: a.id, nome: a.nome, turma: a.turma, pcd: a.pcd, status: a.status, statusLabel: a.statusLabel })}>
                      <CheckCircle2 size={13} /> Ver finalizado
                    </button>
                  )}
                </div>
              </article>
            ))}

            {filtered.map((p) => (
              <article key={p.id} className="rel-card">
                <div className="rel-card-head">
                  <div className={"rel-av " + p.avatar}>{p.initials}</div>
                  <div className="rel-stu">
                    <b>{p.name}</b>
                    <small>{p.meta}</small>
                  </div>
                  {p.pcd && <span className="rel-badge pcd">{p.pcd}</span>}
                  <button className="rel-more" aria-label="Mais opções"><MoreHorizontal size={14} /></button>
                </div>
                <span className={"rel-status " + p.status}><span className="dot" />{p.statusLabel}</span>
                {typeof p.progress === "number" && (
                  <div className="rel-progress"><i style={{ width: `${p.progress}%` }} /></div>
                )}
                <div className="rel-meta">
                  {p.metaInfo.map((m, i) => (
                    <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <MetaIcon name={m.icon} /> {m.text}
                      {i < p.metaInfo.length - 1 && <span className="sep" style={{ marginLeft: 10 }} />}
                    </span>
                  ))}
                </div>
                <div className="rel-card-foot">
                  {p.actions.map((a, i) => (
                    <button key={i}
                      className={"rel-btn-card" + (a.variant === "dark" ? " dark" : a.variant === "accent" ? " accent" : "")}
                      onClick={() => handleAction(p, a.action)}
                      aria-label={a.label}>
                      {a.icon && <ActionIcon name={a.icon} />}
                      {a.label}
                      {a.icon === "arrow" ? null : null}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>

          {/* Finalizados recentemente */}
          <div className="rel-sec-head" style={{ marginTop: 34 }}>
            <div>
              <h2>Finalizados recentemente</h2>
              <p>Clique em um(a) aluno(a) para abrir o parecer finalizado.</p>
            </div>
            {(() => {
              const finList = alunosLista.filter((a) => a.status === "done");
              return (
                <div className="rel-sec-actions">
                  <button
                    className="rel-pill"
                    aria-label={verTodosHist ? "Recolher lista" : "Ver todos os finalizados"}
                    aria-expanded={verTodosHist}
                    disabled={finList.length <= HIST_LIMIT}
                    onClick={() => setVerTodosHist((v) => !v)}
                  >
                    {verTodosHist ? "Recolher" : `Ver todos (${finList.length}) →`}
                  </button>
                </div>
              );
            })()}
          </div>

          <div className="rel-history">
            {(() => {
              const finList = alunosLista.filter((a) => a.status === "done");
              if (finList.length === 0) {
                return (
                  <EmptyState
                    icon="📂"
                    title="Nenhum parecer finalizado ainda."
                    description="Finalize seus primeiros pareceres pra acompanhar o histórico aqui."
                  />
                );
              }
              const visible = verTodosHist ? finList : finList.slice(0, HIST_LIMIT);
              const palette = ["#FF6A2C", "#6E5BE6", "#16A36B", "#3B82F6", "#EC4899", "#E9A23B"];
              return visible.map((a, idx) => {
                const initials = a.nome.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
                return (
                  <button
                    key={a.id}
                    className="rel-h-row"
                    onClick={() => setAlunoModal({ id: a.id, nome: a.nome, turma: a.turma, pcd: a.pcd, status: a.status, statusLabel: a.statusLabel })}
                    style={{ width: "100%", textAlign: "left", cursor: "pointer", background: "transparent", border: 0, borderBottom: "1px solid #F1EFE8" }}
                  >
                    <div className="rel-h-av" style={{ background: palette[idx % palette.length] }}>{initials}</div>
                    <div className="rel-h-name">
                      <b>{a.nome}</b>
                      <small>{a.turma || "Sem turma"} · {bimestreNum}º bimestre{a.pcd ? ` · ${a.pcd}` : ""}</small>
                    </div>
                    <span className="rel-status done"><span className="dot" />FINALIZADO</span>
                    <div className="rel-h-date">Bimestre atual</div>
                    <div className="rel-h-actions">
                      <span className="rel-h-icon" aria-hidden><ArrowRight size={13} /></span>
                    </div>
                  </button>
                );
              });
            })()}
          </div>
        </div>
      </main>

      {preview && (
        <div className="rel-modal-bg" role="dialog" aria-modal="true" onClick={() => setPreview(null)}>
          <div className="rel-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Pré-visualização · {preview.name}</h3>
            <div className="rel-modal-meta">{preview.meta} · {preview.statusLabel}</div>
            <div className="rel-modal-body">
              <p><b>{preview.name}</b> demonstrou avanços significativos nas competências esperadas para o bimestre, alinhadas à BNCC. Participa ativamente das atividades coletivas, colabora com colegas e apresenta autonomia crescente nas produções escritas.</p>
              <p style={{ marginTop: 12 }}>Sugestão de continuidade: aprofundar leituras compartilhadas e propor desafios de escrita autoral para consolidar a fluência.</p>
            </div>
            <div className="rel-modal-foot">
              <button className="rel-btn-card" onClick={() => setPreview(null)}>Fechar</button>
              <button className="rel-btn-card dark" onClick={() => { setPreview(null); goEdit(preview); }}>
                Revisar e finalizar <ArrowRight size={13} strokeWidth={2.4} />
              </button>
            </div>
          </div>
        </div>
      )}

      {bnccOpen && (() => {
        const { id, nome, turma, pcd } = bnccOpen;
        const rub = getAlunoRubric(id);
        const { pctPreenchido, pctDesempenho } = computeProgress(id, turma, pcd);
        const year = yearForAluno(id, turma);
        const areas = areasFor(id, turma, pcd);
        const cls = dashClasses.find((c) => c.name === turma);
        const turmaYear = cls?.grade?.replace(/\D/g, "") || "";
        const isPcd = !!pcd;
        const ei = isEiAluno(turma);
        const STATUS = ei ? BNCC_STATUS_EI : BNCC_STATUS;
        const tituloModal = ei
          ? `Avaliação por Campos de Experiência · ${nome}`
          : `Avaliação BNCC · ${nome}`;
        return (
          <div className="rel-modal-bg" role="dialog" aria-modal="true" onClick={() => setBnccOpen(null)}>
            <div className="rel-modal" style={{ maxWidth: 760, width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "18px 20px", borderBottom: "1px solid var(--line-soft)" }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{tituloModal}</h3>
                  <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 2, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span>{turma || "Sem turma"} · {bimestreNum}º bimestre</span>
                    {ei ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 8px", borderRadius: 99, background: "#EDEAFE", color: "#4338CA", fontWeight: 700 }}>
                        Direitos de Aprendizagem: {EI_DIREITOS_APRENDIZAGEM}
                      </span>
                    ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 8px", borderRadius: 99, background: "#F3F4F6", color: "var(--text)", fontWeight: 700 }}>
                      Ano de referência:
                      <select
                        value={year}
                        disabled={!isPcd && !!turmaYear}
                        onChange={(e) => setYearOverride((p) => ({ ...p, [id]: e.target.value }))}
                        title={isPcd ? "Aluno PCD: você pode ajustar o ano de referência" : (turmaYear ? "Definido pela turma" : "Selecione")}
                        style={{ border: 0, background: "transparent", fontWeight: 800, color: "var(--text)", cursor: isPcd ? "pointer" : (turmaYear ? "not-allowed" : "pointer") }}
                      >
                        {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}º ano EF</option>)}
                      </select>
                      {isPcd && yearOverride[id] && (
                        <button
                          type="button"
                          onClick={() => setYearOverride((p) => { const cp = { ...p }; delete cp[id]; return cp; })}
                          style={{ background: "transparent", border: 0, color: "var(--text-soft)", cursor: "pointer", fontSize: 11 }}
                          title="Voltar ao ano da turma"
                        >resetar</button>
                      )}
                    </span>
                    )}
                    {isPcd && <span style={{ background: "#FDECEC", color: "#DC2626", fontWeight: 800, padding: "2px 8px", borderRadius: 99 }}>PCD</span>}
                  </div>
                </div>
                <button onClick={() => setBnccOpen(null)} aria-label="Fechar" style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--text-soft)" }}><X size={18} /></button>
              </div>

              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--line-soft)", background: "#FAF8F2" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
                  <span>Progresso da avaliação</span>
                  <span>{pctPreenchido}% avaliado · Desempenho {pctDesempenho}%</span>
                </div>
                <div style={{ height: 8, background: "#EEE9DC", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ width: `${pctPreenchido}%`, height: "100%", background: "linear-gradient(90deg,#FF6A2C,#FFB47A)", transition: "width .3s" }} />
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                  {STATUS.map((s) => (
                    <span
                      key={s.k}
                      title={s.label}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, padding: "3px 8px 3px 3px", borderRadius: 99, border: `1px solid ${s.color}22` }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 22, height: 18, padding: "0 6px", borderRadius: 99, background: s.color, color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: ".04em" }}>{s.short}</span>
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ overflowY: "auto", padding: "8px 20px 16px" }}>
                {areas.map((area, ai) => (
                  <div key={area.area} style={{ marginTop: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-soft)", flex: 1 }}>{area.area}</div>
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        <span style={{ fontSize: 10, color: "var(--text-soft)", alignSelf: "center", marginRight: 4 }}>Aplicar a todos:</span>
                        {STATUS.map((s) => (
                          <button
                            key={s.k}
                            type="button"
                            onClick={() => setAreaStatus(id, ai, area.comps.length, s.k)}
                            title={`Marcar todas como ${s.label}`}
                            style={{ cursor: "pointer", border: `1px dashed ${s.color}`, background: "#fff", color: s.color, borderRadius: 8, padding: "3px 7px", fontSize: 10, fontWeight: 800 }}
                          >{s.short}</button>
                        ))}
                        <button
                          type="button"
                          onClick={() => clearAreaStatus(id, ai, area.comps.length)}
                          title="Resetar competências desta área para o estado padrão (não observada)"
                          style={{ cursor: "pointer", border: "1px dashed var(--line)", background: "#fff", color: "var(--text-soft)", borderRadius: 8, padding: "3px 7px", fontSize: 10, fontWeight: 800 }}
                        >Limpar área</button>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {area.comps.map((comp, ci) => {
                        const key = `${ai}.${ci}`;
                        const cur = rub[key];
                        return (
                          <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid var(--line-soft)", borderRadius: 10, background: "#fff" }}>
                            <div style={{ flex: 1, fontSize: 13, color: "var(--text)" }}>{comp}</div>
                            <div style={{ display: "inline-flex", gap: 4 }}>
                              {STATUS.map((s) => {
                                const active = cur === s.k;
                                return (
                                  <button
                                    key={s.k}
                                    type="button"
                                    onClick={() => setAlunoStatus(id, key, s.k)}
                                    title={s.label}
                                    aria-pressed={active}
                                    style={{
                                      cursor: "pointer", border: `1px solid ${active ? s.color : "var(--line-soft)"}`,
                                      background: active ? s.color : "#fff", color: active ? "#fff" : s.color,
                                      borderRadius: 8, padding: "5px 9px", fontSize: 11, fontWeight: 800, minWidth: 38,
                                      transition: "all .15s",
                                    }}
                                  >{s.short}</button>
                                );
                              })}
                              <button
                                type="button"
                                onClick={() => setAlunoStatus(id, key, cycleStatus(cur))}
                                title="Alternar status"
                                aria-label="Alternar status"
                                style={{ cursor: "pointer", border: "1px solid var(--line-soft)", background: "#fff", borderRadius: 8, padding: "5px 7px", color: "var(--text-soft)" }}
                              >↻</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding: "12px 20px 16px", borderTop: "1px solid var(--line-soft)", background: "#fff" }}>
                {(() => {
                  const obsOpen = bnccObsExpanded.has(id);
                  const obsVal = bnccObsByAluno[id] || "";
                  const obsCount = obsVal.trim().length;
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => setBnccObsExpanded((prev) => {
                          const next = new Set(prev);
                          if (next.has(id)) next.delete(id); else next.add(id);
                          return next;
                        })}
                        aria-expanded={obsOpen}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "transparent", border: 0, padding: 0, cursor: "pointer", marginBottom: obsOpen ? 6 : 0 }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-soft)" }}>
                          {ei ? "Observações sobre a criança" : "Observações sobre o aluno"}
                          {obsCount > 0 && (
                            <span style={{ marginLeft: 8, color: "#EA580C", textTransform: "none", letterSpacing: 0, fontWeight: 700 }}>· preenchido</span>
                          )}
                        </span>
                        <ChevronDown size={16} style={{ color: "var(--text-soft)", transform: obsOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .15s" }} />
                      </button>
                      {obsOpen && (
                        <>
                          <textarea
                            value={obsVal}
                            onChange={(e) => setBnccObsByAluno((p) => ({ ...p, [id]: e.target.value }))}
                            rows={4}
                            placeholder={ei
                              ? "Descreva o desenvolvimento da criança: interações com os colegas, autonomia, participação nas brincadeiras, linguagem, movimento, expressões artísticas e avanços observados no período…"
                              : "Descreva avanços, dificuldades, comportamentos e informações relevantes sobre o aluno no período…"}
                            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line-soft)", fontSize: 13, resize: "vertical", fontFamily: "inherit", background: "#FAFAFB" }}
                          />
                          <div style={{ fontSize: 11, color: "var(--text-soft)", marginTop: 6 }}>
                            Essas observações ficam salvas com a avaliação e são consideradas pela Sofia ao gerar o {ei ? "parecer descritivo" : "parecer"}.
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "space-between", padding: "14px 20px", borderTop: "1px solid var(--line-soft)", background: "#fff" }}>
                <button
                  onClick={() => { setBnccByAluno((p) => { const cp = { ...p }; delete cp[id]; return cp; }); }}
                  style={{ background: "transparent", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "var(--text-soft)", cursor: "pointer" }}
                >Limpar avaliação</button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setBnccOpen(null)}
                    style={{ background: "transparent", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >Fechar</button>
                  <button
                    onClick={() => {
                      const alunoArg = { id, nome, turma, pcd: pcd || "" };
                      setBnccOpen(null);
                      setAlunoModal({ id, nome, turma, pcd: pcd || "", status: "review", statusLabel: "Parecer para revisar" });
                      void handleGerarParecerSofia(alunoArg);
                    }}
                    style={{ background: "linear-gradient(135deg,#FF6A2C,#EA580C)", color: "#fff", border: 0, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                  ><Sparkles size={13} /> {ei ? "Gerar parecer descritivo com a Sofia" : "Gerar parecer com a Sofia"}</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {novoAlunoOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) fecharModalAluno(); }}
          style={{ position: "fixed", inset: 0, background: "rgba(15,27,54,.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,.25)", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line-soft)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--primary-dark)" }}>{editAluno ? "Editar dados do aluno" : "Cadastrar aluno"}</h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>{editAluno ? "Atualize nome, turma, nascimento, PCD e observações." : "Vincule o(a) aluno(a) a uma turma já cadastrada."}</p>
              </div>
              <button onClick={fecharModalAluno} aria-label="Fechar" style={{ border: 0, background: "transparent", cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 700, color: "var(--primary-dark)" }}>
                Nome completo
                <input
                  value={novoAluno.name}
                  onChange={(e) => setNovoAluno((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Ex.: Pedro Henrique Silva"
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--line-soft)", fontSize: 13 }}
                  autoFocus
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 700, color: "var(--primary-dark)" }}>
                Turma
                {dashClasses.length === 0 ? (
                  <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500, padding: "9px 12px", border: "1px dashed var(--line-soft)", borderRadius: 8 }}>
                    Nenhuma turma cadastrada — o(a) aluno(a) ficará como “Sem turma”.
                  </span>
                ) : (
                  <select
                    value={novoAluno.classRef}
                    onChange={(e) => setNovoAluno((s) => ({ ...s, classRef: e.target.value }))}
                    style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--line-soft)", fontSize: 13, background: "#fff" }}
                  >
                    <option value="">Sem turma</option>
                    {dashClasses.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}{c.grade ? ` · ${c.grade}` : ""}{c.shift ? ` · ${c.shift}` : ""}</option>
                    ))}
                  </select>
                )}
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 700, color: "var(--primary-dark)" }}>
                  Data de nascimento
                  <input
                    type="date"
                    value={novoAluno.birth}
                    onChange={(e) => setNovoAluno((s) => ({ ...s, birth: e.target.value }))}
                    style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--line-soft)", fontSize: 13 }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 700, color: "var(--primary-dark)" }}>
                  PCD
                  <select
                    value={novoAluno.pcd}
                    onChange={(e) => setNovoAluno((s) => ({ ...s, pcd: e.target.value }))}
                    style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--line-soft)", fontSize: 13, background: "#fff" }}
                  >
                    <option value="nao">Não</option>
                    <option value="TEA">TEA</option>
                    <option value="TDAH">TDAH</option>
                    <option value="Dislexia">Dislexia</option>
                    <option value="Discalculia">Discalculia</option>
                    <option value="Deficiência intelectual">Deficiência intelectual</option>
                    <option value="Deficiência física">Deficiência física</option>
                    <option value="Deficiência visual">Deficiência visual</option>
                    <option value="Deficiência auditiva">Deficiência auditiva</option>
                    <option value="AH/SD">Altas habilidades / Superdotação</option>
                    <option value="Outro">Outro</option>
                  </select>
                </label>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 700, color: "var(--primary-dark)" }}>
                Observações (opcional)
                <textarea
                  value={novoAluno.notes}
                  onChange={(e) => setNovoAluno((s) => ({ ...s, notes: e.target.value }))}
                  rows={3}
                  placeholder="Informações relevantes para o parecer…"
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--line-soft)", fontSize: 13, resize: "vertical", fontFamily: "inherit" }}
                />
              </label>
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--line-soft)", display: "flex", gap: 8, justifyContent: "flex-end", background: "#FAFAFB" }}>
              <button onClick={fecharModalAluno} style={{ background: "transparent", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
              <button onClick={salvarNovoAluno} style={{ background: "var(--primary-dark)", color: "#fff", border: 0, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <UserPlus size={13} /> {editAluno ? "Salvar alterações" : "Cadastrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {alunoModal && (() => {
        const a = alunoModal;
        const isTodo = a.status === "todo";
        const isDraft = a.status === "draft";
        const isReview = a.status === "review";
        const isDone = a.status === "done";
        const headerColor = isTodo ? "#9C6B1F" : isDraft ? "#4B3CA8" : isReview ? "#C84A14" : "#0E7A4F";
        const titulo = isTodo ? "Parecer a fazer" : isDraft ? "Rascunho do parecer" : isReview ? "Parecer para revisar" : "Parecer finalizado";
        const descricao = isTodo
          ? "Ainda não há parecer gerado. Use a Sofia para criar um rascunho a partir da anamnese, registros e PEI."
          : isDraft
          ? "Existe um rascunho salvo. Continue editando ou peça para a Sofia complementar."
          : isReview
          ? "Rascunho pronto para revisão final. Confira o texto, ajuste e finalize."
          : "Parecer finalizado. Você pode reabrir, exportar em PDF/Word ou imprimir.";
        const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const parecerAluno = parecerByAluno[a.id] || null;
        const gerando = gerandoParecerId === a.id;
        const ulHtml = (arr?: string[]) => arr && arr.length ? `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
        const parecerHtml = parecerAluno
          ? (parecerAluno.formato === "texto" && parecerAluno.texto
              ? `<section><h2>Parecer descritivo</h2><div>${esc(parecerAluno.texto).split(/\n+/).map((p) => `<p style="text-align:justify;margin:0 0 8pt;">${p}</p>`).join("")}</div></section>`
              : `<section><h2>Parecer descritivo</h2>
                  ${parecerAluno.resumo ? `<p><b>Resumo:</b> ${esc(parecerAluno.resumo)}</p>` : ""}
                  ${parecerAluno.pedagogico ? `<h3>Pedagógico</h3><p>${esc(parecerAluno.pedagogico)}</p>` : ""}
                  ${parecerAluno.comportamental ? `<h3>Comportamental</h3><p>${esc(parecerAluno.comportamental)}</p>` : ""}
                  ${parecerAluno.sensorial ? `<h3>Sensorial</h3><p>${esc(parecerAluno.sensorial)}</p>` : ""}
                  ${parecerAluno.familia ? `<h3>Família</h3><p>${esc(parecerAluno.familia)}</p>` : ""}
                  ${parecerAluno.avancos?.length ? `<h3>Avanços</h3>${ulHtml(parecerAluno.avancos)}` : ""}
                  ${parecerAluno.desafios?.length ? `<h3>Desafios</h3>${ulHtml(parecerAluno.desafios)}` : ""}
                  ${parecerAluno.encaminhamentos?.length ? `<h3>Encaminhamentos</h3>${ulHtml(parecerAluno.encaminhamentos)}` : ""}
                  ${parecerAluno.comunicacao_familias ? `<h3>Comunicação à família</h3><p>${esc(parecerAluno.comunicacao_familias)}</p>` : ""}
                </section>`)
          : "";
        const buildReportHtml = () => {
          const dataStr = new Date().toLocaleDateString("pt-BR");
          const aluno = getStudentById(a.id);
          const cls = dashClasses.find((c) => c.name === a.turma);
          const escola = dashSchools.find((s) => s.name === cls?.school);
          const bodyInner = `
<h1>Parecer descritivo · ${esc(a.nome)}</h1>
${buildIdentBlock({ aluno: a, escola: escola?.name, professor: user.name, periodo: `${bimestreNum}º bimestre` })}
${aluno?.notes ? `<section><h2>Observações</h2><p>${esc(aluno.notes)}</p></section>` : ""}
${parecerHtml}
<div class="sig">
  <div>Professor(a) responsável<br/>${esc(user.name || "")}</div>
  <div>Coordenação pedagógica</div>
  <div>Família / Responsável</div>
</div>
<div class="foot">Documento gerado em ${esc(dataStr)} · Sofia · Pareceres descritivos</div>`;
          return wrapStandardPrintHtml(`Parecer · ${esc(a.nome)}`, bodyInner, {
            extraCss: PRINT_CSS,
            professorNome: user.name,
            docType: "parecer",
          });
        };
        const exportPdf = () => {
          const html = buildReportHtml();
          const w = window.open("", "_blank", "width=900,height=1000");
          if (!w) { toast.error("Permita pop-ups para gerar o PDF."); return; }
          w.document.open(); w.document.write(html); w.document.close();
          w.focus();
          setTimeout(() => { try { w.print(); } catch { /* ignore */ } }, 350);
          toast.success("Abrindo janela de impressão (escolha 'Salvar como PDF').");
        };
        const exportWord = () => {
          // Layout simplificado e legível para Word (.doc): fontes seguras
          // (Georgia para títulos, Arial para corpo), HEX simples, sem grid
          // moderno nem Google Fonts. Layout em 2 colunas via <table>.
          const dataStr = new Date().toLocaleDateString("pt-BR");
          const aluno = getStudentById(a.id);
          const cls = dashClasses.find((c) => c.name === a.turma);
          const escola = dashSchools.find((s) => s.name === cls?.school);

          const ACCENT = "#1F3A5F";
          const INK = "#111111";
          const GRAY = "#6B6B6B";
          const BORDER = "#DDDDDD";
          const SOFT = "#F5F1EA";
          const GOLD = "#C9B98A";

          const titleFont = "Georgia, 'Times New Roman', serif";
          const bodyFont = "Arial, Helvetica, sans-serif";

          const cellLabel = (label: string) =>
            `<td width="50%" style="padding:6px 10px;background:${SOFT};border:1px solid ${BORDER};border-bottom:none;font-family:${bodyFont};font-size:9pt;font-weight:bold;color:${ACCENT};letter-spacing:1px;text-transform:uppercase;">${esc(label)}</td>`;
          const cellValue = (value: string) =>
            `<td width="50%" style="padding:8px 10px;background:#FFFFFF;border:1px solid ${BORDER};border-top:none;font-family:${bodyFont};font-size:11pt;color:${INK};">${esc(value || "—")}</td>`;

          // Identificação dinâmica: só inclui campos preenchidos.
          const identFields: Array<{ label: string; value: string }> = [];
          if (a.nome) identFields.push({ label: "Estudante", value: a.nome });
          if (a.turma) identFields.push({ label: "Turma", value: a.turma });
          if (escola?.name) identFields.push({ label: "Escola", value: escola.name });
          identFields.push({ label: "Período avaliado", value: `${bimestreNum}º bimestre` });
          if (user.name) identFields.push({ label: "Professor(a)", value: user.name });
          if (a.pcd) identFields.push({ label: "PCD", value: a.pcd });

          const identRows: string[] = [];
          for (let i = 0; i < identFields.length; i += 2) {
            const left = identFields[i];
            const right = identFields[i + 1];
            identRows.push(
              `<tr>${cellLabel(left.label)}${right ? cellLabel(right.label) : `<td width="50%" style="border:none;"></td>`}</tr>`,
            );
            identRows.push(
              `<tr>${cellValue(left.value)}${right ? cellValue(right.value) : `<td width="50%" style="border:none;"></td>`}</tr>`,
            );
          }
          const ident = `
<table width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;margin:0 0 14pt;">
  ${identRows.join("\n")}
</table>`;

          const sectionTitle = (t: string) =>
            `<h2 style="font-family:${titleFont};font-size:14pt;color:${ACCENT};margin:18pt 0 8pt;font-weight:bold;border-bottom:1px solid ${GOLD};padding-bottom:4pt;">${esc(t)}</h2>`;
          const para = (txt: string) =>
            `<p style="font-family:${bodyFont};font-size:11pt;color:${INK};line-height:1.5;text-align:justify;margin:0 0 8pt;">${esc(txt)}</p>`;
          const subTitle = (t: string) =>
            `<h3 style="font-family:${titleFont};font-size:11pt;color:${ACCENT};margin:10pt 0 4pt;font-weight:bold;">${esc(t)}</h3>`;
          const ulList = (arr?: string[]) =>
            arr && arr.length
              ? `<ul style="font-family:${bodyFont};font-size:11pt;color:${INK};line-height:1.5;margin:0 0 8pt 18pt;padding:0;">${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`
              : "";

          let parecerWord = "";
          if (parecerAluno) {
            parecerWord += sectionTitle("Parecer descritivo");
            if (parecerAluno.formato === "texto" && parecerAluno.texto) {
              parecerWord += parecerAluno.texto.split(/\n+/).map((p) => para(p)).join("");
            } else {
              if (parecerAluno.resumo) parecerWord += para(parecerAluno.resumo);
              if (parecerAluno.pedagogico) parecerWord += subTitle("Pedagógico") + para(parecerAluno.pedagogico);
              if (parecerAluno.comportamental) parecerWord += subTitle("Comportamental") + para(parecerAluno.comportamental);
              if (parecerAluno.sensorial) parecerWord += subTitle("Sensorial") + para(parecerAluno.sensorial);
              if (parecerAluno.familia) parecerWord += subTitle("Família") + para(parecerAluno.familia);
              if (parecerAluno.avancos?.length) parecerWord += subTitle("Avanços") + ulList(parecerAluno.avancos);
              if (parecerAluno.desafios?.length) parecerWord += subTitle("Desafios") + ulList(parecerAluno.desafios);
              if (parecerAluno.encaminhamentos?.length) parecerWord += subTitle("Encaminhamentos") + ulList(parecerAluno.encaminhamentos);
              if (parecerAluno.comunicacao_familias) parecerWord += subTitle("Comunicação à família") + para(parecerAluno.comunicacao_familias);
            }
          }

          // Habilidades BNCC removidas — somente texto corrido.
          const areasWord = "";

          const obs = aluno?.notes ? sectionTitle("Observações") + para(aluno.notes) : "";

          const sigCell = (role: string) =>
            `<td width="33%" style="padding:24pt 8pt 6pt;border-top:1px solid ${GRAY};font-family:${bodyFont};font-size:10pt;color:${GRAY};text-align:center;">${esc(role)}</td>`;
          const signatures = `
<table width="100%" cellspacing="0" cellpadding="20" border="0" style="border-collapse:collapse;margin:36pt 0 0;">
  <tr><td colspan="3" style="height:30pt;">&nbsp;</td></tr>
  <tr>
    ${sigCell("Professor(a) responsável")}
    ${sigCell("Coordenação pedagógica")}
    ${sigCell("Família / Responsável")}
  </tr>
</table>`;

          const docHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8"/>
<title>Parecer · ${esc(a.nome)}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page Section1 { size: 21cm 29.7cm; margin: 2cm 2cm 2cm 2.5cm; }
  div.Section1 { page: Section1; }
  body { font-family: ${bodyFont}; color: ${INK}; font-size: 11pt; }
  h1, h2, h3, p, td, div { font-family: ${bodyFont}; }
</style>
</head>
<body>
<div class="Section1">
  <table width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;background:${ACCENT};margin:0 0 18pt;">
    <tr><td style="padding:10pt 14pt;color:#FFFFFF;font-family:${titleFont};font-size:11pt;font-weight:bold;letter-spacing:1px;">AGILIZAPROF · RELATÓRIO PEDAGÓGICO</td></tr>
  </table>
  <div style="text-align:center;margin:0 0 18pt;">
    <div style="font-family:${bodyFont};font-size:9pt;font-weight:bold;color:${ACCENT};letter-spacing:1px;">DOCUMENTO PEDAGÓGICO • AGILIZAPROF</div>
    <h1 style="font-family:${titleFont};font-size:24pt;color:${INK};margin:8pt 0 4pt;font-weight:bold;">Parecer Descritivo</h1>
    <div style="width:80pt;border-top:1.5pt solid ${GOLD};margin:6pt auto;"></div>
    <div style="font-family:${titleFont};font-style:italic;font-size:11pt;color:${GRAY};">${esc(a.nome)}</div>
  </div>
  ${sectionTitle("Identificação")}
  ${ident}
  ${obs}
  ${parecerWord}
  ${areasWord}
  ${signatures}
  <p style="margin-top:24pt;padding-top:6pt;border-top:1px solid ${GOLD};font-family:${bodyFont};font-size:9pt;color:${GRAY};text-align:center;font-style:italic;">
    Documento gerado pela plataforma AgilizaProf em ${esc(dataStr)}<br/>
    Fundamentação legal: LDB – Lei nº 9.394/96 (Art. 24, V) | BNCC – Resolução CNE/CP nº 2/2017
  </p>
</div>
</body>
</html>`;
          const blob = new Blob(['\ufeff', docHtml], { type: "application/msword" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `Parecer_${a.nome.replace(/\s+/g, "_")}_${bimestreNum}bim.doc`;
          document.body.appendChild(link); link.click(); document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 1500);
          toast.success("Documento Word exportado.");
        };
        return (
          <div className="rel-modal-bg" role="dialog" aria-modal="true" onClick={() => setAlunoModal(null)}>
            <div className="rel-modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: headerColor, marginBottom: 4 }}>{titulo}</div>
                  <h3 style={{ margin: 0 }}>{a.nome}</h3>
                  <div className="rel-modal-meta" style={{ marginBottom: 0 }}>
                    {a.turma || "Sem turma"} · {bimestreNum}º bimestre{a.pcd ? ` · PCD: ${a.pcd}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    onClick={() => { setAlunoModal(null); abrirEditarAluno(a.id); }}
                    title="Editar dados do aluno"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "var(--primary-dark)" }}
                  >
                    <Edit3 size={13} /> Editar dados
                  </button>
                  <button onClick={() => setAlunoModal(null)} aria-label="Fechar" style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--text-soft)" }}><X size={18} /></button>
                </div>
              </div>
              <div style={{ marginTop: 14 }} className="rel-modal-body">
                <p style={{ margin: 0 }}>{descricao}</p>
                {(() => {
                  const { pctPreenchido, pctDesempenho } = computeProgress(a.id, a.turma, a.pcd);
                  return (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
                        <span>Avaliação BNCC</span>
                        <span>{pctPreenchido}% avaliado · Desempenho {pctDesempenho}%</span>
                      </div>
                      <div className="rel-progress" style={{ marginTop: 6 }}><i style={{ width: `${pctPreenchido}%` }} /></div>
                    </div>
                  );
                })()}

                {/* Geração com a Sofia — mesmo modelo da Inclusão */}
                {!isDone && (
                  <div style={{ marginTop: 16, padding: 12, background: "#FBFAF6", border: "1px solid var(--line-soft)", borderRadius: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>Formato</label>
                        <select value={formatoParecer} onChange={(e) => setFormatoParecer(e.target.value as "topicos" | "texto")} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line-soft)", fontSize: 13, background: "#fff" }}>
                          <option value="topicos">Tópicos (estruturado)</option>
                          <option value="texto">Texto corrido</option>
                        </select>
                      </div>
                      <button
                        className="rel-btn-card accent"
                        disabled={gerando}
                        onClick={() => handleGerarParecerSofia({ id: a.id, nome: a.nome, turma: a.turma, pcd: a.pcd })}
                      >
                        <Sparkles size={13} /> {gerando ? "Gerando…" : (parecerAluno ? "Regenerar com a Sofia" : "Gerar com a Sofia")}
                      </button>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                      A Sofia consolida a avaliação BNCC e observações em um parecer descritivo pronto para revisão.
                    </div>
                  </div>
                )}

                {/* Render do parecer + edição */}
                {parecerAluno && (
                  <div style={{ marginTop: 14, padding: 14, background: "#fff", border: "1px solid var(--line-soft)", borderRadius: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <b style={{ fontFamily: "'Fraunces',serif", fontSize: 15 }}>{parecerAluno.titulo || "Parecer descritivo"}</b>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>
                        {parecerAluno.periodoLabel ? `${parecerAluno.periodoLabel} · ` : ""}Gerado em {parecerAluno.geradoEm}
                      </span>
                    </div>
                    {!editandoParecer ? (
                      <>
                        {parecerAluno.formato === "texto" && parecerAluno.texto ? (
                          <div style={{ fontSize: 13, lineHeight: 1.6, textAlign: "justify" }}>
                            {parecerAluno.texto.split(/\n+/).map((p, i) => <p key={i} style={{ margin: "0 0 8px" }}>{p}</p>)}
                          </div>
                        ) : (
                          <>
                            {parecerAluno.resumo && <p style={{ margin: 0, fontSize: 13 }}>{parecerAluno.resumo}</p>}
                            {parecerAluno.pedagogico && (<div><b style={{ fontSize: 12 }}>Pedagógico</b><p style={{ margin: "4px 0 0", fontSize: 13 }}>{parecerAluno.pedagogico}</p></div>)}
                            {parecerAluno.comportamental && (<div><b style={{ fontSize: 12 }}>Comportamental</b><p style={{ margin: "4px 0 0", fontSize: 13 }}>{parecerAluno.comportamental}</p></div>)}
                            {parecerAluno.sensorial && (<div><b style={{ fontSize: 12 }}>Sensorial</b><p style={{ margin: "4px 0 0", fontSize: 13 }}>{parecerAluno.sensorial}</p></div>)}
                            {parecerAluno.familia && (<div><b style={{ fontSize: 12 }}>Família</b><p style={{ margin: "4px 0 0", fontSize: 13 }}>{parecerAluno.familia}</p></div>)}
                            {parecerAluno.avancos && parecerAluno.avancos.length > 0 && (
                              <div><b style={{ fontSize: 12 }}>Avanços</b>
                                <ul style={{ margin: "4px 0 0 18px", fontSize: 13 }}>{parecerAluno.avancos.map((x, i) => <li key={i}>{x}</li>)}</ul>
                              </div>
                            )}
                            {parecerAluno.desafios && parecerAluno.desafios.length > 0 && (
                              <div><b style={{ fontSize: 12 }}>Desafios</b>
                                <ul style={{ margin: "4px 0 0 18px", fontSize: 13 }}>{parecerAluno.desafios.map((x, i) => <li key={i}>{x}</li>)}</ul>
                              </div>
                            )}
                            {parecerAluno.encaminhamentos && parecerAluno.encaminhamentos.length > 0 && (
                              <div><b style={{ fontSize: 12 }}>Encaminhamentos</b>
                                <ul style={{ margin: "4px 0 0 18px", fontSize: 13 }}>{parecerAluno.encaminhamentos.map((x, i) => <li key={i}>{x}</li>)}</ul>
                              </div>
                            )}
                            {parecerAluno.comunicacao_familias && (
                              <div style={{ background: "#FFF7ED", padding: 10, borderRadius: 8 }}>
                                <b style={{ fontSize: 12 }}>Comunicação à família</b>
                                <p style={{ margin: "4px 0 0", fontSize: 13 }}>{parecerAluno.comunicacao_familias}</p>
                              </div>
                            )}
                          </>
                        )}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                          <button className="rel-btn-card" onClick={() => { setParecerDraft({ ...parecerAluno }); setEditandoParecer(true); }}>
                            <Edit3 size={13} /> Editar texto
                          </button>
                          <button
                            className="rel-btn-card"
                            disabled={gerando}
                            onClick={() => handleGerarParecerSofia({ id: a.id, nome: a.nome, turma: a.turma, pcd: a.pcd })}
                            title="Gerar novamente com a Sofia substituindo o parecer atual"
                          >
                            <RefreshCw size={13} /> {gerando ? "Refazendo…" : "Refazer com a Sofia"}
                          </button>
                          <button
                            className="rel-btn-card"
                            style={{ color: "#B91C1C", borderColor: "#FECACA" }}
                            onClick={() => {
                              if (!confirm(`Excluir o parecer de ${a.nome}? Esta ação não pode ser desfeita.`)) return;
                              setParecerByAluno((all) => {
                                const next = { ...all };
                                delete next[a.id];
                                return next;
                              });
                              setEditandoParecer(false);
                              setParecerDraft(null);
                              toast.success("Parecer excluído.");
                            }}
                          >
                            <Trash2 size={13} /> Excluir parecer
                          </button>
                          <button className="rel-btn-card" onClick={() => {
                            const p = parecerAluno;
                            const partes: string[] = [];
                            partes.push(`${p.titulo || "Parecer descritivo"}`);
                            partes.push(`${a.nome}${a.turma ? ` · ${a.turma}` : ""}${p.periodoLabel ? ` · ${p.periodoLabel}` : ""}`);
                            partes.push("");
                            if (p.formato === "texto" && p.texto) {
                              partes.push(p.texto);
                            } else {
                              if (p.resumo) partes.push(`Resumo:\n${p.resumo}\n`);
                              if (p.pedagogico) partes.push(`Pedagógico:\n${p.pedagogico}\n`);
                              if (p.comportamental) partes.push(`Comportamental:\n${p.comportamental}\n`);
                              if (p.sensorial) partes.push(`Sensorial:\n${p.sensorial}\n`);
                              if (p.familia) partes.push(`Família:\n${p.familia}\n`);
                              if (p.avancos?.length) partes.push(`Avanços:\n${p.avancos.map((x) => `- ${x}`).join("\n")}\n`);
                              if (p.desafios?.length) partes.push(`Desafios:\n${p.desafios.map((x) => `- ${x}`).join("\n")}\n`);
                              if (p.encaminhamentos?.length) partes.push(`Encaminhamentos:\n${p.encaminhamentos.map((x) => `- ${x}`).join("\n")}\n`);
                              if (p.comunicacao_familias) partes.push(`Comunicação à família:\n${p.comunicacao_familias}\n`);
                            }
                            const blob = new Blob([partes.join("\n")], { type: "text/plain;charset=utf-8" });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = `Parecer_${a.nome.replace(/\s+/g, "_")}_${bimestreNum}bim.txt`;
                            document.body.appendChild(link); link.click(); document.body.removeChild(link);
                            setTimeout(() => URL.revokeObjectURL(url), 1500);
                            toast.success("Texto do parecer salvo.");
                          }}>
                            <Download size={13} /> Salvar texto
                          </button>
                          <button className="rel-btn-card" onClick={exportWord}>
                            <Download size={13} /> Salvar em Word
                          </button>
                          <button className="rel-btn-card dark" onClick={exportPdf}>
                            <Download size={13} /> Imprimir / PDF
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {parecerDraft?.formato === "texto" ? (
                          <textarea
                            value={parecerDraft?.texto || ""}
                            onChange={(e) => setParecerDraft((d) => d ? { ...d, texto: e.target.value } : d)}
                            style={{ minHeight: 220, padding: 10, border: "1px solid var(--line-soft)", borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical" }}
                          />
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {(["resumo","pedagogico","comportamental","sensorial","familia","comunicacao_familias"] as const).map((k) => (
                              <div key={k}>
                                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "capitalize", color: "var(--muted)" }}>{k.replace("_", " ")}</label>
                                <textarea
                                  value={(parecerDraft?.[k] as string) || ""}
                                  onChange={(e) => setParecerDraft((d) => d ? { ...d, [k]: e.target.value } : d)}
                                  style={{ width: "100%", minHeight: 60, padding: 8, border: "1px solid var(--line-soft)", borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical" }}
                                />
                              </div>
                            ))}
                            {(["avancos","desafios","encaminhamentos"] as const).map((k) => (
                              <div key={k}>
                                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "capitalize", color: "var(--muted)" }}>{k} (uma por linha)</label>
                                <textarea
                                  value={(parecerDraft?.[k] as string[] | undefined)?.join("\n") || ""}
                                  onChange={(e) => setParecerDraft((d) => d ? { ...d, [k]: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) } : d)}
                                  style={{ width: "100%", minHeight: 60, padding: 8, border: "1px solid var(--line-soft)", borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical" }}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="rel-btn-card accent" onClick={() => {
                            if (parecerDraft) setParecerByAluno((all) => ({ ...all, [a.id]: { ...parecerDraft } }));
                            setEditandoParecer(false); setParecerDraft(null);
                            toast.success("Parecer salvo.");
                          }}><CheckCircle2 size={13} /> Salvar alterações</button>
                          <button className="rel-btn-card" onClick={() => { setEditandoParecer(false); setParecerDraft(null); }}>Cancelar</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="rel-modal-foot" style={{ flexWrap: "wrap" }}>
                <button className="rel-btn-card" onClick={() => { setAlunoModal(null); setBnccOpen({ id: a.id, nome: a.nome, turma: a.turma, pcd: a.pcd }); }}>
                  <ClipboardList size={13} /> Avaliar BNCC
                </button>
                {isDone && (
                  <>
                    <button className="rel-btn-card" onClick={() => { setAlunoModal(null); sofia.openSofia({ prompt: `Mostre o parecer finalizado de ${a.nome}.`, send: false }); }}>
                      <FileText size={13} /> Ver parecer
                    </button>
                    <button className="rel-btn-card" onClick={exportWord}>
                      <Download size={13} /> Word
                    </button>
                    <button className="rel-btn-card dark" onClick={exportPdf}>
                      <Download size={13} /> PDF
                    </button>
                  </>
                )}
                <button className="rel-btn-card" onClick={() => setAlunoModal(null)}>Fechar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {tutorialOpen && (
        <div className="rel-modal-bg" role="dialog" aria-modal="true" onClick={() => setTutorialOpen(false)}>
          <div className="rel-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 4 }}>Tutorial · 60s</div>
                <h3 style={{ margin: 0 }}>Como funciona esta página</h3>
                <div className="rel-modal-meta">Um passo a passo rápido para gerar pareceres com a Sofia.</div>
              </div>
              <button onClick={() => setTutorialOpen(false)} aria-label="Fechar" style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--text-soft)" }}><X size={18} /></button>
            </div>
            <div className="rel-modal-body">
              <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                <li><b>Cadastre o(a) aluno(a)</b> no botão <i>Cadastrar aluno</i>, vinculando a uma turma já criada.</li>
                <li><b>Avalie a BNCC</b> clicando em <i>Avaliar BNCC</i> no card do aluno: marque cada competência como NO, NA, ED ou CO.</li>
                <li><b>Gere o parecer com a Sofia</b>: ela usa anamnese, registros, PEI e a rubrica BNCC para escrever um rascunho.</li>
                <li><b>Revise e finalize</b>: edite o texto, salve em PDF/Word ou imprima quando estiver pronto.</li>
                <li><b>Acompanhe o progresso</b> nos KPIs do topo (a fazer, rascunho, finalizados e tempo economizado).</li>
                <li><b>Filtre</b> por status, turma, bimestre ou apenas alunos PCD usando os filtros acima da lista.</li>
              </ol>
              <p style={{ marginTop: 14, fontSize: 12, color: "var(--muted)" }}>Dica: clique em qualquer card de aluno (ou em um(a) aluno(a) finalizado(a) abaixo) para abrir as ações específicas daquele status.</p>
            </div>
            <div className="rel-modal-foot">
              <button className="rel-btn-card" onClick={() => setTutorialOpen(false)}>Fechar</button>
              <button className="rel-btn-card dark" onClick={() => { setTutorialOpen(false); abrirNovoAluno(); }}>
                Começar agora <ArrowRight size={13} strokeWidth={2.4} />
              </button>
            </div>
          </div>
        </div>
      )}

      {statusModal && (() => {
        const labelMap: Record<"todo" | "draft" | "done", { title: string; eyebrow: string; desc: string }> = {
          todo:  { title: "Alunos a fazer",      eyebrow: "A FAZER",      desc: "Estes alunos ainda não tiveram a BNCC avaliada neste bimestre." },
          draft: { title: "Pareceres em rascunho", eyebrow: "EM RASCUNHO", desc: "Avaliações iniciadas que ainda não foram concluídas." },
          done:  { title: "Pareceres finalizados", eyebrow: "FINALIZADOS", desc: "Pareceres já gerados — clique para revisar e exportar." },
        };
        const info = labelMap[statusModal];
        const lista = alunosLista.filter((a) => a.status === statusModal);
        return (
          <div className="rel-modal-bg" role="dialog" aria-modal="true" onClick={() => setStatusModal(null)}>
            <div className="rel-modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 4 }}>{info.eyebrow} · {lista.length}</div>
                  <h3 style={{ margin: 0 }}>{info.title}</h3>
                  <div className="rel-modal-meta">{info.desc}</div>
                </div>
                <button onClick={() => setStatusModal(null)} aria-label="Fechar" style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--text-soft)" }}><X size={18} /></button>
              </div>
              <div className="rel-modal-body" style={{ padding: 8 }}>
                {lista.length === 0 ? (
                  <div style={{ padding: 18, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Nenhum aluno nesta categoria.</div>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    {lista.map((a) => (
                      <li key={a.id}>
                        <button
                          onClick={() => { setStatusModal(null); setAlunoModal({ id: a.id, nome: a.nome, turma: a.turma, pcd: a.pcd, status: a.status, statusLabel: a.statusLabel }); }}
                          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line-soft)", background: "#fff", cursor: "pointer", textAlign: "left" }}
                        >
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text)" }}>{a.nome}</span>
                            <span style={{ fontSize: 12, color: "var(--muted)" }}>{a.turma || "Sem turma"}{a.pcd ? ` · PCD: ${a.pcd}` : ""}{a.naoObservadas ? ` · ${a.naoObservadas} não observada(s)` : ""}</span>
                          </div>
                          <ArrowRight size={14} strokeWidth={2.2} color="var(--muted)" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rel-modal-foot">
                <button className="rel-btn-card" onClick={() => setStatusModal(null)}>Fechar</button>
                <button className="rel-btn-card dark" onClick={() => { setTab(statusModal); setStatusModal(null); document.getElementById("rel-filters-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                  Ver na lista <ArrowRight size={13} strokeWidth={2.4} />
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {printSelectOpen && (() => {
        const total = alunosLista.length;
        const allSelected = total > 0 && printSelected.size === total;
        const semParecer = alunosLista.filter((a) => printSelected.has(a.id) && !parecerByAluno[a.id]).length;
        return (
          <div className="rel-modal-bg" role="dialog" aria-modal="true" onClick={() => setPrintSelectOpen(false)}>
            <div className="rel-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 4 }}>IMPRIMIR EM LOTE · {printSelected.size}/{total}</div>
                  <h3 style={{ margin: 0 }}>Selecione os alunos para imprimir</h3>
                  <div className="rel-modal-meta">Cada aluno gera uma folha. Use <i>Salvar como PDF</i> na janela de impressão para um único arquivo.</div>
                </div>
                <button onClick={() => setPrintSelectOpen(false)} aria-label="Fechar" style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--text-soft)" }}><X size={18} /></button>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 8px" }}>
                <button className="rel-btn-card" onClick={() => setPrintSelected(new Set(alunosLista.map((a) => a.id)))}>Selecionar todos</button>
                <button className="rel-btn-card" onClick={() => setPrintSelected(new Set(alunosLista.filter((a) => a.status === "done").map((a) => a.id)))}>Apenas finalizados</button>
                <button className="rel-btn-card" onClick={() => setPrintSelected(new Set())}>Limpar</button>
                {allSelected && <span style={{ alignSelf: "center", fontSize: 12, color: "var(--muted)" }}>Todos selecionados</span>}
              </div>

              <div className="rel-modal-body" style={{ padding: 6, maxHeight: "48vh", overflow: "auto" }}>
                {alunosLista.length === 0 ? (
                  <div style={{ padding: 18, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Nenhum aluno cadastrado ainda.</div>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                    {alunosLista.map((a) => {
                      const checked = printSelected.has(a.id);
                      const tem = Boolean(parecerByAluno[a.id]);
                      return (
                        <li key={a.id}>
                          <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, border: "1px solid var(--line-soft)", background: checked ? "rgba(255,106,44,.06)" : "#fff", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePrintSelected(a.id)}
                              style={{ width: 16, height: 16, accentColor: "var(--accent)" }}
                            />
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                              <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text)" }}>{a.nome}</span>
                              <span style={{ fontSize: 12, color: "var(--muted)" }}>{a.turma || "Sem turma"} · {a.statusLabel}{a.pcd ? ` · PCD: ${a.pcd}` : ""}</span>
                            </div>
                            {!tem && (
                              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#9C6B1F", background: "#FFF7ED", padding: "2px 8px", borderRadius: 999 }}>Sem parecer</span>
                            )}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {semParecer > 0 && (
                <div style={{ marginTop: 10, fontSize: 12, color: "#9C6B1F", background: "#FFF7ED", border: "1px solid #FBE2C2", padding: "8px 10px", borderRadius: 8 }}>
                  {semParecer} aluno(s) selecionado(s) ainda não têm parecer gerado — só a rubrica BNCC será impressa.
                </div>
              )}

              <div className="rel-modal-foot">
                <button className="rel-btn-card" onClick={() => setPrintSelectOpen(false)}>Cancelar</button>
                <button
                  className="rel-btn-card dark"
                  onClick={() => {
                    const sel = alunosLista.filter((a) => printSelected.has(a.id)).map((a) => ({ id: a.id, nome: a.nome, turma: a.turma, pcd: a.pcd }));
                    if (sel.length === 0) { toast.error("Selecione ao menos um aluno."); return; }
                    setPrintSelectOpen(false);
                    printBatchReports(sel);
                  }}
                >
                  <Download size={13} strokeWidth={2.4} /> Imprimir {printSelected.size > 0 ? `(${printSelected.size})` : ""}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}