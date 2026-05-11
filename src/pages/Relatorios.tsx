import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { AppSidebar, sidebarCss } from "@/components/AppSidebar";
import { EmptyState, emptyStateCss } from "@/components/EmptyState";
import { useUser } from "@/lib/mockData";
import { useSofiaContext } from "@/lib/sofia/sofiaContext";
import { useSofia } from "@/components/sofia/SofiaProvider";
import { Header as AppHeader } from "@/components/Header";
import { usePersistentState } from "@/lib/persist/usePersistentState";
import { useEiMode } from "@/lib/ei/useEiMode";
import {
  Search, Bell, Star, Sparkles, ArrowRight, PlayCircle, Clock, Edit3,
  CheckCircle2, FileText, Users, Calendar, Filter, ChevronDown, MoreHorizontal,
  MessageSquare, Download, Copy, X, ClipboardList, UserPlus,
} from "lucide-react";
import { toast } from "sonner";

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
  display:flex;align-items:center;gap:8px;box-shadow:var(--shadow-card);flex-wrap:nowrap;overflow-x:auto;}
.rel-tabs{display:flex;gap:4px;background:#F1EFE8;padding:4px;border-radius:10px;}
.rel-tab{padding:6px 10px;border-radius:8px;font-size:12px;font-weight:600;color:#5b6478;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;}
.rel-tab.active{background:#fff;color:var(--text);box-shadow:0 1px 2px rgba(0,0,0,.06);}
.rel-tab .count{background:#E7E9EF;color:#5b6478;padding:1px 7px;border-radius:999px;font-size:11px;font-weight:700;}
.rel-tab.active .count{background:rgba(255,106,44,.12);color:var(--accent);}
.rel-divider{width:1px;height:22px;background:var(--line-soft);flex:none;}
.rel-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:8px;
  border:1px solid var(--line-soft);background:#fff;font-size:12px;color:var(--text-soft);position:relative;white-space:nowrap;flex:none;}
.rel-pill:hover{border-color:#cfd4e1;}
.rel-search-mini{margin-left:auto;display:flex;align-items:center;gap:8px;background:#F8F6F0;border:1px solid var(--line-soft);
  padding:6px 10px;border-radius:10px;min-width:180px;flex:0 1 220px;}
.rel-search-mini input{border:0;outline:0;background:transparent;font-size:12.5px;width:100%;min-width:0;}
.rel-dropdown{position:absolute;top:calc(100% + 6px);left:0;background:#fff;border:1px solid var(--line-soft);border-radius:10px;
  box-shadow:0 10px 30px -10px rgba(17,24,39,.24);min-width:180px;padding:6px;z-index:60;max-height:280px;overflow-y:auto;}
.rel-pill[aria-haspopup="menu"]{z-index:1;}
.rel-pill[aria-haspopup="menu"]:focus-within,.rel-pill[aria-haspopup="menu"]:hover{z-index:60;}
.rel-dropdown button{display:block;width:100%;text-align:left;padding:8px 10px;border-radius:6px;font-size:12.5px;color:var(--text);}
.rel-dropdown button:hover{background:#F4F2EC;}

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
  type DashClass = { name: string; school: string; grade: string; shift: string; students: string };
  type DashSchool = { name: string; network: string; stage: string; city: string; uf: string; classes: string };
  const [dashStudents, setDashStudents] = usePersistentState<DashStudent[]>("dash_students", []);
  const [dashClasses] = usePersistentState<DashClass[]>("dash_classes", []);
  const [dashSchools] = usePersistentState<DashSchool[]>("dash_schools", []);

  // Cadastro rápido de aluno (vincula a uma turma já criada)
  const [novoAlunoOpen, setNovoAlunoOpen] = useState(false);
  const [novoAluno, setNovoAluno] = useState<DashStudent>({ name: "", classRef: "", birth: "", pcd: "nao", notes: "" });
  const abrirNovoAluno = () => {
    setNovoAluno({ name: "", classRef: dashClasses[0]?.name || "", birth: "", pcd: "nao", notes: "" });
    setNovoAlunoOpen(true);
  };
  const salvarNovoAluno = () => {
    const nome = novoAluno.name.trim();
    if (!nome) { toast.error("Informe o nome do(a) aluno(a)."); return; }
    setDashStudents((cur) => [...cur, { ...novoAluno, name: nome, createdAt: new Date().toISOString() }]);
    setNovoAlunoOpen(false);
    toast.success(`${nome} cadastrado(a) com sucesso.`);
  };

  // Rubrica BNCC por aluno (persistido)
  const [bnccByAluno, setBnccByAluno] = usePersistentState<Record<string, Record<string, BnccStatus>>>("rel_bncc", {});
  // Override de ano de referência por aluno (sobretudo PCD)
  const [yearOverride, setYearOverride] = usePersistentState<Record<string, string>>("rel_bncc_year", {});
  const [bnccOpen, setBnccOpen] = useState<{ id: string; nome: string; turma: string; pcd?: string } | null>(null);
  const [verTodosHist, setVerTodosHist] = useState(false);
  const HIST_LIMIT = 5;

  // Modal unificado por aluno (todo / draft / review / done)
  type AlunoModalData = { id: string; nome: string; turma: string; pcd: string; status: "todo" | "draft" | "review" | "done"; statusLabel: string };
  const [alunoModal, setAlunoModal] = useState<AlunoModalData | null>(null);

  // Tutorial "Como funciona"
  const [tutorialOpen, setTutorialOpen] = useState(false);

  const yearForAluno = (id: string, turma: string): string => {
    if (yearOverride[id]) return yearOverride[id];
    const cls = dashClasses.find((c) => c.name === turma);
    const g = cls?.grade?.replace(/\D/g, "");
    return g && YEAR_OPTIONS.includes(g) ? g : "2";
  };
  const areasFor = (id: string, turma: string, pcd?: string): BnccArea[] => {
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
    keys.forEach((k) => {
      const s = rub[k];
      pesoTotal += 3;
      if (s && s !== "no") preenchido += 1;
      if (s === "na") pontos += 0;
      else if (s === "ed") pontos += 2;
      else if (s === "co") pontos += 3;
    });
    const pctPreenchido = keys.length ? Math.round((preenchido / keys.length) * 100) : 0;
    const pctDesempenho = pesoTotal ? Math.round((pontos / pesoTotal) * 100) : 0;
    return { pctPreenchido, pctDesempenho };
  };

  // Deriva valores reais do SofiaContext
  const totalBim = ctx.dataState.pareceres_total_bimestre;
  const finalizados = ctx.dataState.pareceres_finalizados;
  const alunosCount = dashStudents.length > 0 ? dashStudents.length : ctx.dataState.alunos_count;
  const pct = totalBim > 0 ? Math.round((finalizados / totalBim) * 100) : 0;
  const restantes = Math.max(0, totalBim - finalizados);
  const aFazer = Math.max(0, alunosCount - finalizados - Math.min(3, restantes));
  const rascunhos = Math.min(3, restantes);
  const horasEcon = ctx.user.horas_economizadas_mes;

  // Mesmo cálculo da página inicial (Tempo devolvido)
  const earnedMinutes =
    dashSchools.length * 10 +
    dashClasses.length * 20 +
    dashStudents.length * 5 +
    (user.documentsGenerated || finalizados) * 30;
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
  const isPro = ctx.user.plano === "pro" || dashStudents.length > 0;
  const alunoFoco = ctx.entity.todos_alunos_pcd[0]?.nome || "o primeiro aluno";

  // Lista por aluno (estado Pro)
  const alunosLista = useMemo(() => {
    type Item = { id: string; nome: string; turma: string; pcd: string; status: "done" | "draft" | "todo"; statusLabel: string };
    if (dashStudents.length > 0) {
      return dashStudents.map((s, i): Item => {
        let status: "done" | "draft" | "todo" = "todo";
        let statusLabel = "A FAZER";
        if (i < finalizados) { status = "done"; statusLabel = "FINALIZADO"; }
        else if (i < finalizados + rascunhos) { status = "draft"; statusLabel = "RASCUNHO"; }
        return { id: `al-${i}`, nome: s.name, turma: s.classRef || "", pcd: s.pcd && s.pcd !== "nao" ? s.pcd : "", status, statusLabel };
      });
    }
    if (!isPro || alunosCount === 0) return [] as Item[];
    const out: Item[] = [];
    const pcd = ctx.entity.todos_alunos_pcd;
    for (let i = 0; i < alunosCount; i++) {
      const nome = i < pcd.length ? pcd[i].nome : `Aluno(a) ${i + 1}`;
      let status: "done" | "draft" | "todo" = "todo";
      let statusLabel = "A FAZER";
      if (i < finalizados) { status = "done"; statusLabel = "FINALIZADO"; }
      else if (i < finalizados + rascunhos) { status = "draft"; statusLabel = "RASCUNHO"; }
      out.push({ id: `al-${i}`, nome, turma: ctx.entity.turma_atual?.nome || "", pcd: "", status, statusLabel });
    }
    return out;
  }, [isPro, alunosCount, finalizados, rascunhos, ctx.entity.todos_alunos_pcd, ctx.entity.turma_atual, dashStudents]);

  const alunosFiltered = useMemo(() => alunosLista.filter((a) => {
    if (tab !== "all" && a.status !== tab) return false;
    if (search && !a.nome.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTurma !== "Todas" && a.turma !== filterTurma) return false;
    if (filterPcd === "Apenas PCD" && !a.pcd) return false;
    return true;
  }), [alunosLista, tab, search, filterTurma, filterPcd]);

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
      <div className="rel-dropdown" role="menu">
        {options.map((o) => (
          <button key={o} onClick={() => { onChange(o); setOpenDropdown(null); }}>{o}</button>
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
              <span className="rel-eyebrow"><Star size={12} fill="currentColor" /> {totalBim > 0 ? `BIMESTRE ${bimestreNum}º · EM ANDAMENTO` : (isEi ? "COMECE PELOS RELATÓRIOS DE DESENVOLVIMENTO" : "COMECE PELOS PARECERES")}</span>
                {totalBim === 0 ? (
                  <>
                    <h1>{isEi ? <>Nenhum relatório<br />gerado ainda.</> : <>Nenhum parecer<br />gerado ainda.</>}</h1>
                    <p>{isEi ? "Cadastre as crianças e gere o primeiro relatório de desenvolvimento com a Sofia em poucos minutos." : "Cadastre seus alunos e gere o primeiro parecer descritivo com a Sofia em poucos minutos."}</p>
                  </>
                ) : (
                  <>
                    <h1>{isEi ? "Relatórios" : "Pareceres"} do {bimestreNum}º bimestre<br /><em>{finalizados}/{alunosCount}</em> prontos.</h1>
                    <p>{restantes > 0 ? `Faltam ${restantes} pra fechar o bimestre. A Sofia gera em rascunho e você só revisa.` : `Todos os ${isEi ? "relatórios" : "pareceres"} do bimestre estão fechados. Bora exportar pra coordenação?`}</p>
                  </>
                )}
                <div className="rel-hero-cta">
                  <button className="rel-btn-primary" onClick={goLote} aria-label="Gerar com a Sofia">
                    <Sparkles size={14} strokeWidth={2.4} /> {totalBim === 0 ? (isEi ? "Gerar primeiro relatório" : "Gerar primeiro parecer") : restantes > 0 ? `Gerar ${restantes} restantes` : "Exportar tudo (PDF)"} <ArrowRight size={14} strokeWidth={2.4} />
                  </button>
                  <button className="rel-btn-ghost" aria-label="Ver vídeo de como funciona">
                    <PlayCircle size={14} /> Como funciona · 60s
                  </button>
                </div>
              </div>
              <div className="rel-pc">
                <div className="rel-pc-title">PROGRESSO DO BIMESTRE</div>
                <div className="rel-pc-num">{finalizados}<span>/{alunosCount} alunos</span></div>
                <div className="rel-pc-bar"><i style={{ width: `${pct}%` }} /></div>
                <div className="rel-pc-meta"><span>{pct}% concluído</span><span>{horasEcon > 0 ? `~${horasEcon}h economizadas` : "—"}</span></div>
              </div>
            </div>
          </section>

          {/* KPIs */}
          <div className="rel-kpis">
            <div className="rel-kpi">
              <div className="rel-kpi-top"><span className="rel-kpi-label">A FAZER</span><div className="rel-kpi-icon amber"><Clock size={15} strokeWidth={2.2} /></div></div>
              <div className="rel-kpi-num">{aFazer}<small> alunos</small></div>
              <div className="rel-kpi-foot">{aFazer > 0 ? `${aFazer} pendente(s)` : "—"}</div>
            </div>
            <div className="rel-kpi">
              <div className="rel-kpi-top"><span className="rel-kpi-label">EM RASCUNHO</span><div className="rel-kpi-icon violet"><Edit3 size={15} strokeWidth={2.2} /></div></div>
              <div className="rel-kpi-num">{rascunhos}<small> pareceres</small></div>
              <div className="rel-kpi-foot">{rascunhos > 0 ? "aguardando revisão" : "—"}</div>
            </div>
            <div className="rel-kpi" id="rel-kpi-pareceres">
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
                  <li><span>Alunos cadastrados · {dashStudents.length} × 5min</span><b>{dashStudents.length * 5}min</b></li>
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
          </div>

          {/* Filters */}
          <div className="rel-filters" id="rel-filters-anchor">
            <div className="rel-tabs" role="tablist">
              {TABS.map((t) => (
                <button key={t.key} role="tab" aria-selected={tab === t.key}
                  className={"rel-tab" + (tab === t.key ? " active" : "")}
                  onClick={() => setTab(t.key)}>
                  {t.label} <span className="count">{t.count}</span>
                </button>
              ))}
            </div>
            <div className="rel-divider" />
            <button className="rel-pill" onClick={() => setOpenDropdown(openDropdown === "turma" ? null : "turma")} aria-haspopup="menu">
              <Calendar size={13} /> Turma · {filterTurma} <ChevronDown size={11} strokeWidth={2.4} />
              <Dropdown id="turma" value={filterTurma} onChange={setFilterTurma}
                options={["Todas", ...dashClasses.map((c) => c.name)]} />
            </button>
            <button className="rel-pill" onClick={() => setOpenDropdown(openDropdown === "bim" ? null : "bim")} aria-haspopup="menu">
              <Calendar size={13} /> Bimestre · {filterBimestre} <ChevronDown size={11} strokeWidth={2.4} />
              <Dropdown id="bim" value={filterBimestre} onChange={setFilterBimestre}
                options={["1º", "2º", "3º", "4º"]} />
            </button>
            <button className="rel-pill" onClick={() => setOpenDropdown(openDropdown === "pcd" ? null : "pcd")} aria-haspopup="menu">
              <Filter size={13} /> {filterPcd === "Todos" ? "PCD" : `PCD · ${filterPcd}`} <ChevronDown size={11} strokeWidth={2.4} />
              <Dropdown id="pcd" value={filterPcd} onChange={setFilterPcd}
                options={["Todos", "Apenas PCD"]} />
            </button>
            <div className="rel-search-mini">
              <Search size={13} color="#7a8194" />
              <input placeholder="Buscar aluno..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar aluno" />
            </div>
            <button
              className="rel-pill"
              onClick={abrirNovoAluno}
              style={{ marginLeft: "auto", background: "var(--primary-dark)", color: "#fff", border: 0 }}
              title="Cadastrar novo aluno e vincular a uma turma"
            >
              <UserPlus size={13} /> Cadastrar aluno
            </button>
          </div>

          {/* Cards grid */}
          <div className="rel-grid">
            {filtered.length === 0 && alunosFiltered.length === 0 && (
              <EmptyState
                icon="📝"
                title="Nenhum parecer gerado ainda."
                description="Cadastre seus alunos e gere o primeiro parecer descritivo com a Sofia."
                ctaLabel="Gerar primeiro parecer"
                onCta={goLote}
              />
            )}

            {alunosFiltered.map((a) => (
              <article key={a.id} className="rel-card">
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
                   const { pctPreenchido, pctDesempenho } = computeProgress(a.id, a.turma, a.pcd);
                  return (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-soft)", marginBottom: 4 }}>
                        <span>BNCC · {pctPreenchido}% avaliado</span>
                        <span>Desempenho {pctDesempenho}%</span>
                      </div>
                      <div className="rel-progress"><i style={{ width: `${pctPreenchido}%` }} /></div>
                    </div>
                  );
                })()}
                <div className="rel-card-foot">
                  <button
                    className="rel-btn-card"
                    onClick={() => setBnccOpen({ id: a.id, nome: a.nome, turma: a.turma, pcd: a.pcd })}
                    aria-label={`Avaliar competências BNCC de ${a.nome}`}
                  >
                    <ClipboardList size={13} /> Avaliar BNCC
                  </button>
                  {a.status === "todo" && (
                    <button className="rel-btn-card accent" onClick={() => sofia.openSofia({ prompt: `Gere o parecer descritivo bimestral de ${a.nome} alinhado à BNCC.`, send: false })}>
                      <Sparkles size={13} /> Gerar com Sofia
                    </button>
                  )}
                  {a.status === "draft" && (
                    <button className="rel-btn-card dark" onClick={() => sofia.openSofia({ prompt: `Vamos revisar o rascunho do parecer de ${a.nome}.`, send: false })}>
                      <Edit3 size={13} /> Abrir rascunho
                    </button>
                  )}
                  {a.status === "done" && (
                    <button className="rel-btn-card" onClick={() => sofia.openSofia({ prompt: `Mostre o parecer finalizado de ${a.nome}.`, send: false })}>
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
              <p>Acesse, baixe em PDF ou duplique para o próximo bimestre.</p>
            </div>
            <div className="rel-sec-actions">
              <button className="rel-pill" aria-label="Exportar tudo em PDF"><Download size={13} /> Exportar tudo (PDF)</button>
              <button
                className="rel-pill"
                aria-label={verTodosHist ? "Recolher lista" : "Ver todos os finalizados"}
                aria-expanded={verTodosHist}
                disabled={HISTORY.length === 0}
                onClick={() => setVerTodosHist((v) => !v)}
                title={HISTORY.length === 0 ? "Sem finalizados ainda" : undefined}
              >
                {verTodosHist ? "Recolher" : `Ver todos (${HISTORY.length}) →`}
              </button>
            </div>
          </div>

          <div className="rel-history">
            {HISTORY.length === 0 && (
              <EmptyState
                icon="📂"
                title="Nenhum parecer finalizado ainda."
                description="Finalize seus primeiros pareceres pra acompanhar o histórico aqui."
              />
            )}
            {(verTodosHist ? HISTORY : HISTORY.slice(0, HIST_LIMIT)).map((h) => (
              <div key={h.initials} className="rel-h-row">
                <div className="rel-h-av" style={{ background: h.bg }}>{h.initials}</div>
                <div className="rel-h-name"><b>{h.name} · 1º bimestre</b><small>{h.meta}</small></div>
                <span className="rel-status done"><span className="dot" />ASSINADO</span>
                <div className="rel-h-date">{h.date}</div>
                <div className="rel-h-actions">
                  <button className="rel-h-icon" aria-label="Baixar PDF"><Download size={13} /></button>
                  <button className="rel-h-icon" aria-label="Duplicar"><Copy size={13} /></button>
                  <button className="rel-h-icon" aria-label="Abrir"><ArrowRight size={13} /></button>
                </div>
              </div>
            ))}
            {!verTodosHist && HISTORY.length > HIST_LIMIT && (
              <div style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
                <button className="rel-pill" onClick={() => setVerTodosHist(true)}>
                  Ver todos os {HISTORY.length} finalizados →
                </button>
              </div>
            )}
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
        return (
          <div className="rel-modal-bg" role="dialog" aria-modal="true" onClick={() => setBnccOpen(null)}>
            <div className="rel-modal" style={{ maxWidth: 760, width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "18px 20px", borderBottom: "1px solid var(--line-soft)" }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: 18 }}>Avaliação BNCC · {nome}</h3>
                  <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 2, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span>{turma || "Sem turma"} · {bimestreNum}º bimestre</span>
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
                  {BNCC_STATUS.map((s) => (
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
                        {BNCC_STATUS.map((s) => (
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
                              {BNCC_STATUS.map((s) => {
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
                      const linhas = areas.flatMap((area, ai) => area.comps.map((c, ci) => {
                        const s = rub[`${ai}.${ci}`];
                        const lbl = BNCC_STATUS.find((x) => x.k === s)?.label || "Não observada";
                        return `- (${area.area}) ${c}: ${lbl}`;
                      })).join("\n");
                      sofia.openSofia({
                        prompt: `Gere um parecer descritivo bimestral para ${nome} (${turma || "sem turma"}), ${bimestreNum}º bimestre, ALINHADO À BNCC do ${year}º ano do Ensino Fundamental${isPcd && yearOverride[id] ? " (ano de referência ajustado para aluno PCD)" : ""}. Use estritamente esta rubrica de competências e níveis de consolidação:\n${linhas}\n\nEstruture por áreas, mencione avanços (consolidadas), focos de trabalho (em desenvolvimento), pontos de atenção (não alcançadas) e o que ainda precisa ser observado. Linguagem profissional, acolhedora e objetiva.`,
                        send: true,
                      });
                      setBnccOpen(null);
                    }}
                    style={{ background: "linear-gradient(135deg,#FF6A2C,#EA580C)", color: "#fff", border: 0, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                  ><Sparkles size={13} /> Gerar parecer com a Sofia</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {novoAlunoOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setNovoAlunoOpen(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(15,27,54,.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,.25)", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line-soft)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--primary-dark)" }}>Cadastrar aluno</h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>Vincule o(a) aluno(a) a uma turma já cadastrada.</p>
              </div>
              <button onClick={() => setNovoAlunoOpen(false)} aria-label="Fechar" style={{ border: 0, background: "transparent", cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
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
              <button onClick={() => setNovoAlunoOpen(false)} style={{ background: "transparent", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
              <button onClick={salvarNovoAluno} style={{ background: "var(--primary-dark)", color: "#fff", border: 0, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <UserPlus size={13} /> Cadastrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}