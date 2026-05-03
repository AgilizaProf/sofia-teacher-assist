import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppSidebar, sidebarCss } from "@/components/AppSidebar";
import { EmptyState, emptyStateCss } from "@/components/EmptyState";
import { useUser } from "@/lib/mockData";
import {
  Search, Bell, Star, Sparkles, ArrowRight, PlayCircle, Clock, Edit3,
  CheckCircle2, FileText, Users, Calendar, Filter, ChevronDown, MoreHorizontal,
  MessageSquare, Download, Copy,
} from "lucide-react";

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
  box-shadow:0 10px 30px -10px rgba(17,24,39,.24);min-width:180px;padding:6px;z-index:10;}
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

export function Relatorios() {
  const user = useUser();
  const navigate = useNavigate();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [search, setSearch] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [preview, setPreview] = useState<Parecer | null>(null);

  const [filterTurma, setFilterTurma] = useState("Todas");
  const [filterBimestre, setFilterBimestre] = useState("1º");
  const [filterPcd, setFilterPcd] = useState("Todos");

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
        <header className="rel-topbar">
          <div className="rel-crumbs">
            <span>Sua sala</span><span className="sep">/</span><b>Relatórios</b>
            <span className="sep">·</span><span className="accent">Pareceres descritivos</span>
          </div>
          <div className="rel-topbar-right">
            <button className="rel-icon-btn" aria-label="Buscar"><Search size={16} /></button>
            <button className="rel-icon-btn" aria-label="Notificações"><Bell size={16} /></button>
            <div className="rel-user-pill" aria-label={`Usuária ${user.name}, Plano ${user.plan}`}>
              <div className="av">{user.initials}</div>
              <div><b>{user.name}</b><small>PLANO {user.plan}</small></div>
            </div>
          </div>
        </header>

        <div className="rel-page">
          {/* HERO */}
          <section className="rel-hero">
            <div className="rel-hero-grid">
              <div>
                <span className="rel-eyebrow"><Star size={12} fill="currentColor" /> COMECE PELOS PARECERES</span>
                <h1>Nenhum parecer<br />gerado ainda.</h1>
                <p>Cadastre seus alunos e gere o primeiro parecer descritivo com a Sofia em poucos minutos.</p>
                <div className="rel-hero-cta">
                  <button className="rel-btn-primary" onClick={goLote} aria-label="Gerar todos com a Sofia">
                    <Sparkles size={14} strokeWidth={2.4} /> Gerar primeiro parecer <ArrowRight size={14} strokeWidth={2.4} />
                  </button>
                  <button className="rel-btn-ghost" aria-label="Ver vídeo de como funciona">
                    <PlayCircle size={14} /> Como funciona · 60s
                  </button>
                </div>
              </div>
              <div className="rel-pc">
                <div className="rel-pc-title">PROGRESSO DO BIMESTRE</div>
                <div className="rel-pc-num">{user.reportsDoneBimester}<span>/{user.reportsTotalBimester} alunos</span></div>
                <div className="rel-pc-bar"><i style={{ width: "0%" }} /></div>
                <div className="rel-pc-meta"><span>0% concluído</span><span>—</span></div>
              </div>
            </div>
          </section>

          {/* KPIs */}
          <div className="rel-kpis">
            <div className="rel-kpi">
              <div className="rel-kpi-top"><span className="rel-kpi-label">A FAZER</span><div className="rel-kpi-icon amber"><Clock size={15} strokeWidth={2.2} /></div></div>
              <div className="rel-kpi-num">0<small> alunos</small></div>
              <div className="rel-kpi-foot">—</div>
            </div>
            <div className="rel-kpi">
              <div className="rel-kpi-top"><span className="rel-kpi-label">EM RASCUNHO</span><div className="rel-kpi-icon violet"><Edit3 size={15} strokeWidth={2.2} /></div></div>
              <div className="rel-kpi-num">0<small> pareceres</small></div>
              <div className="rel-kpi-foot">—</div>
            </div>
            <div className="rel-kpi">
              <div className="rel-kpi-top"><span className="rel-kpi-label">FINALIZADOS</span><div className="rel-kpi-icon green"><CheckCircle2 size={15} strokeWidth={2.2} /></div></div>
              <div className="rel-kpi-num">0<small>/0</small></div>
              <div className="rel-kpi-foot">—</div>
            </div>
            <div className="rel-kpi">
              <div className="rel-kpi-top"><span className="rel-kpi-label">TEMPO ECONOMIZADO</span><div className="rel-kpi-icon orange"><Sparkles size={15} strokeWidth={2.2} /></div></div>
              <div className="rel-kpi-num">0h<small>00min</small></div>
              <div className="rel-kpi-foot">—</div>
            </div>
          </div>

          {/* Section header */}
          <div className="rel-sec-head">
            <div>
              <h2>Pareceres deste bimestre</h2>
              <p>Filtre por status, turma ou aluno. Clique para gerar com a Sofia ou abrir o rascunho.</p>
            </div>
          </div>

          {/* Filters */}
          <div className="rel-filters">
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
                options={["Todas"]} />
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
          </div>

          {/* Cards grid */}
          <div className="rel-grid">
            {filtered.length === 0 && (
              <EmptyState
                icon="📝"
                title="Nenhum parecer gerado ainda."
                description="Cadastre seus alunos e gere o primeiro parecer descritivo com a Sofia."
                ctaLabel="Gerar primeiro parecer"
                onCta={goLote}
              />
            )}

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
              <button className="rel-pill" aria-label="Ver todos">Ver todos →</button>
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
            {HISTORY.map((h) => (
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
    </div>
  );
}