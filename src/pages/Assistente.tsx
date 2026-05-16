import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search, Plus, ChevronsLeft, Share2, HelpCircle, Pencil,
  FileText, Send, User, Sparkles, ArrowRight,
  Calendar, CheckSquare, Star, X, ChevronLeft, ChevronRight,
  GraduationCap, Users, BookOpen, Brain, ClipboardList, Clock, ChevronUp, ChevronDown,
} from "lucide-react";
import { AppSidebar, sidebarCss } from "@/components/AppSidebar";
import ReactMarkdown from "react-markdown";
import { SOFIA_CONSTITUTION_VERSION } from "@/lib/sofia-constitution";
import { useSofia } from "@/components/sofia/SofiaProvider";
import { SofiaActiveChip } from "@/components/sofia/SofiaActiveChip";
import { useSofiaContext } from "@/lib/sofia/sofiaContext";
import { gerarFalaSofia } from "@/lib/sofia/gerarFala";
import { Header as AppHeader } from "@/components/Header";
import { brDateKey, diffDaysBR } from "@/lib/datetime";
import { usePersistentState } from "@/lib/persist/usePersistentState";
import { parseQuickOptions, isFreeTextOption } from "@/lib/sofia/quickOptions";
import { useDashClasses, useDashStudents, type LegacyDashStudent } from "@/hooks/useDashLegacyData";

function CtxChipGroup({ options, value, onToggle }: { options: string[]; value: string[]; onToggle: (v: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);
  const customs = value.filter((v) => !options.includes(v));
  const commit = () => {
    const v = draft.trim();
    if (v && !value.includes(v)) onToggle(v);
    setDraft(""); setAdding(false);
  };
  return (
    <div className="ctx-chips">
      {options.map((o) => (
        <button key={o} type="button" className={"ctx-chip" + (value.includes(o) ? " on" : "")} onClick={() => onToggle(o)}>{o}</button>
      ))}
      {customs.map((o) => (
        <button key={o} type="button" className="ctx-chip on" onClick={() => onToggle(o)} title="Clique para remover">{o} ×</button>
      ))}
      {adding ? (
        <span className="ctx-chip-input">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") { setDraft(""); setAdding(false); } }}
            onBlur={commit}
            placeholder="Digite e Enter"
            maxLength={60}
          />
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={commit}>Adicionar</button>
        </span>
      ) : (
        <button type="button" className="ctx-chip-add" onClick={() => setAdding(true)}>+ Outro</button>
      )}
    </div>
  );
}

const css = `
.ap-root{
  --primary:#1B2A4E;--primary-dark:#0F1B36;--accent:#FF6A2C;--accent-warm:#FF9466;
  --paper:#F6F4EE;--paper-2:#FBFAF6;--text:#0B1220;--text-soft:#3B4256;--muted:#7A8194;
  --line-soft:#E7E9EF;--violet:#6E5BE6;--green:#16A36B;
  font-family:'Inter',-apple-system,sans-serif;background:var(--paper);color:var(--text);
  -webkit-font-smoothing:antialiased;line-height:1.5;font-size:14px;min-height:100vh;
}
.ap-root *{box-sizing:border-box;}
.ap-root h1,.ap-root h3,.ap-root h4{margin:0;}
.ap-root button{font-family:inherit;cursor:pointer;border:none;background:transparent;color:inherit;}
.ap-root a{color:inherit;text-decoration:none;}
.ap-root p{margin:0;}
.ai-app{display:grid;grid-template-columns:240px 1fr 320px;min-height:100vh;transition:grid-template-columns .25s ease;}
.ai-app.collapsed{grid-template-columns:240px 1fr 56px;}

/* Main */
.ai-main{display:flex;flex-direction:column;min-width:0;}
.ai-topbar{display:flex;align-items:center;gap:14px;padding:14px 22px;background:var(--paper);
  border-bottom:1px solid rgba(17,24,39,.06);position:sticky;top:0;z-index:5;}
.ai-crumbs{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted);}
.ai-crumbs b{color:var(--text);font-weight:700;}
.ai-crumbs .sep{opacity:.5;}
.sofia-id{display:flex;align-items:center;gap:10px;}
.sofia-avatar{width:36px;height:36px;border-radius:10px;
  background:radial-gradient(120% 120% at 30% 20%,#FFD2B7 0%,#FF6A2C 60%,#C84A14 100%);
  display:grid;place-items:center;color:#fff;box-shadow:0 8px 18px -8px rgba(255,106,44,.6);}
.sofia-name{font-family:'Fraunces',serif;font-weight:700;font-size:18px;display:flex;align-items:center;gap:8px;color:var(--text);}
.tag-beta{font-size:10px;background:#0B1220;color:#fff;padding:2px 6px;border-radius:6px;letter-spacing:.06em;font-weight:700;}
.sofia-sub{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:6px;}
.dot-online{width:6px;height:6px;border-radius:50%;background:#16A36B;display:inline-block;}
.topbar-right{margin-left:auto;display:flex;align-items:center;gap:10px;}
.credits{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--line-soft);
  padding:8px 12px;border-radius:12px;box-shadow:0 1px 0 rgba(17,24,39,.04),0 8px 24px -12px rgba(17,24,39,.18);}
.ring{--p:67;width:28px;height:28px;border-radius:50%;
  background:conic-gradient(var(--accent) calc(var(--p)*1%),#F2D9C8 0);display:grid;place-items:center;}
.ring::after{content:"";width:18px;height:18px;border-radius:50%;background:#fff;}
.credits b{font-size:13px;}
.credits small{display:block;color:var(--muted);font-size:11px;}
.icon-btn{width:34px;height:34px;border-radius:10px;background:#fff;border:1px solid var(--line-soft);
  display:grid;place-items:center;color:#3B4256;box-shadow:0 1px 0 rgba(17,24,39,.04),0 8px 24px -12px rgba(17,24,39,.18);}
.icon-btn:hover{border-color:#cfd4e1;}

/* Context */
.ai-context{display:flex;align-items:center;gap:10px;padding:10px 22px;background:var(--paper-2);
  border-bottom:1px solid rgba(17,24,39,.06);flex-wrap:wrap;}
.ctx-label{font-size:12px;color:var(--muted);font-weight:600;letter-spacing:.02em;}
.chip{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line-soft);
  padding:6px 10px;border-radius:999px;font-size:12px;color:var(--text-soft);}
.chip .d{width:6px;height:6px;border-radius:50%;}
.chip.orange .d{background:var(--accent);}
.chip.violet .d{background:var(--violet);}
.chip.green .d{background:var(--green);}
.chip.blue .d{background:#3B82F6;}
.ap-root .edit-context{margin-left:auto;font-size:12px;color:#fff !important;background:var(--accent) !important;font-weight:700;display:inline-flex;align-items:center;gap:6px;cursor:pointer;padding:6px 12px;border-radius:999px;border:none;box-shadow:0 6px 14px -6px rgba(255,106,44,.55);}
.ap-root .edit-context:hover{filter:brightness(1.05);}

/* Modal Editar contexto */
.ctx-modal-overlay{position:fixed;inset:0;background:rgba(11,18,32,.55);backdrop-filter:blur(4px);display:grid;place-items:center;z-index:80;padding:20px;}
.ctx-modal{background:#fff;border-radius:18px;width:100%;max-width:560px;max-height:85vh;overflow:auto;box-shadow:0 30px 80px -20px rgba(11,18,32,.45);border:1px solid var(--line-soft);}
.ctx-modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--line-soft);position:sticky;top:0;background:#fff;}
.ctx-modal-head h3{font-family:'Fraunces',serif;font-size:20px;font-weight:600;color:var(--text);}
.ctx-modal-head p{font-size:12px;color:var(--muted);margin-top:2px;}
.ctx-modal-close{width:32px;height:32px;border-radius:8px;display:grid;place-items:center;color:var(--muted);background:transparent;border:1px solid var(--line-soft);}
.ctx-modal-close:hover{background:var(--paper);}
.ctx-modal-body{padding:18px 22px;display:flex;flex-direction:column;gap:16px;}
.ctx-section{display:flex;flex-direction:column;gap:8px;}
.ctx-section-label{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);}
.ctx-field{display:flex;flex-direction:column;gap:4px;}
.ctx-field label{font-size:12px;color:var(--text-soft);font-weight:600;}
.ctx-field input,.ctx-field select,.ctx-field textarea{padding:9px 12px;border-radius:10px;border:1px solid var(--line-soft);font-size:13px;font-family:inherit;color:var(--text);background:#fff;}
.ctx-field input:focus,.ctx-field select:focus,.ctx-field textarea:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px rgba(255,106,44,.15);}
.ctx-chips{display:flex;flex-wrap:wrap;gap:6px;}
.ctx-chip{padding:6px 10px;border-radius:999px;border:1px solid var(--line-soft);background:#fff;font-size:12px;color:var(--text-soft);font-weight:500;cursor:pointer;transition:all .15s ease;}
.ctx-chip:hover{border-color:#cfd4e1;}
.ctx-chip.on{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600;box-shadow:0 4px 10px -4px rgba(255,106,44,.45);}
.ctx-chip-add{padding:6px 10px;border-radius:999px;border:1px dashed var(--line-soft);background:#fff;font-size:12px;color:var(--text-soft);font-weight:500;cursor:pointer;transition:all .15s ease;}
.ctx-chip-add:hover{border-color:#cfd4e1;color:var(--text);}
.ctx-chip-input{display:inline-flex;align-items:center;gap:4px;padding:2px 4px 2px 10px;border-radius:999px;border:1px solid var(--accent);background:#fff;}
.ctx-chip-input input{border:none;outline:none;font-size:12px;background:transparent;width:130px;color:var(--text);}
.ctx-chip-input button{border:none;background:var(--accent);color:#fff;font-size:11px;font-weight:600;border-radius:999px;padding:4px 10px;cursor:pointer;}
.ctx-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
@media (max-width:520px){.ctx-grid2{grid-template-columns:1fr;}}
.ctx-field-inline{display:flex;flex-direction:column;gap:6px;}
.ctx-field-inline > label{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);}
.ctx-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.ctx-pcd-list{display:flex;flex-wrap:wrap;gap:6px;padding:10px;background:var(--paper);border-radius:10px;border:1px solid var(--line-soft);}
.ctx-pcd-tag{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid var(--line-soft);padding:5px 10px;border-radius:999px;font-size:11.5px;color:var(--text-soft);}
.ctx-pcd-tag b{color:var(--text);font-weight:700;}
.ctx-turma-list{display:flex;flex-direction:column;gap:8px;}
.ctx-turma-card{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-radius:12px;border:1px solid var(--line-soft);background:#fff;text-align:left;cursor:pointer;transition:.18s;font-family:inherit;width:100%;}
.ctx-turma-card:hover{border-color:var(--accent);background:#FFF8F3;}
.ctx-turma-card.selected{border-color:var(--accent);background:#FFF1E7;box-shadow:0 0 0 3px rgba(255,106,44,.12);}
.ctx-turma-card .tname{font-weight:700;color:var(--text);font-size:13.5px;}
.ctx-turma-card .tmeta{font-size:11.5px;color:var(--muted);margin-top:2px;}
.ctx-turma-card .tcounts{display:flex;flex-direction:column;align-items:flex-end;gap:2px;font-size:11px;color:var(--text-soft);}
.ctx-turma-card .tcounts b{font-size:14px;color:var(--accent);font-weight:800;}
.ctx-empty-turma{padding:14px;background:var(--paper);border:1px dashed var(--line-soft);border-radius:10px;font-size:12.5px;color:var(--muted);text-align:center;}
.ctx-modal-foot{padding:14px 22px;border-top:1px solid var(--line-soft);display:flex;justify-content:flex-end;gap:8px;position:sticky;bottom:0;background:#fff;}
.ctx-btn-cancel{padding:9px 16px;border-radius:10px;border:1px solid var(--line-soft);background:#fff;color:var(--text-soft);font-weight:600;font-size:13px;}
.ctx-btn-save{padding:9px 16px;border-radius:10px;border:none;background:var(--accent);color:#fff;font-weight:700;font-size:13px;box-shadow:0 6px 14px -6px rgba(255,106,44,.55);}

/* Convo */
.convo{flex:1;display:flex;flex-direction:column;align-items:center;padding:48px 24px 24px;}
.convo-inner{width:100%;max-width:760px;}
.stamp{display:inline-flex;align-items:center;gap:8px;background:rgba(255,106,44,.10);color:var(--accent);
  padding:6px 12px;border-radius:999px;font-size:12px;font-weight:600;letter-spacing:.04em;}
.greet{font-family:'Fraunces',serif;font-weight:600;font-size:40px;line-height:1.12;letter-spacing:-.01em;
  margin:18px 0 10px;color:var(--text);}
.greet em{font-style:normal;color:var(--accent);}
.greet u{text-decoration:none;background:linear-gradient(180deg,transparent 62%,rgba(255,106,44,.22) 62%);}
.greet-sub{color:var(--text-soft);font-size:15.5px;line-height:1.55;max-width:640px;}
.greet-sub b{color:var(--text);font-weight:600;}

.suggest{margin-top:26px;background:linear-gradient(135deg,#0E1422 0%,#1a2238 100%);
  border:1px solid #1f2a44;border-radius:18px;padding:18px;
  display:grid;grid-template-columns:54px 1fr auto;gap:16px;align-items:center;color:#fff;
  box-shadow:0 30px 60px -30px rgba(11,18,32,.45);}
.suggest .ico-tile{width:54px;height:54px;border-radius:14px;
  background:linear-gradient(135deg,#FF6A2C,#FF8A4C);display:grid;place-items:center;color:#fff;
  box-shadow:0 10px 24px -10px rgba(255,106,44,.7);}
.suggest .label{font-size:11px;letter-spacing:.08em;color:#FFB47A;font-weight:700;
  text-transform:uppercase;display:inline-flex;align-items:center;gap:6px;}
.suggest h3{margin:6px 0 4px;font-family:'Fraunces',serif;font-weight:600;font-size:22px;line-height:1.25;color:#fff;}
.suggest p{margin:0;color:#aab2c8;font-size:13px;}
.suggest{position:relative;overflow:hidden;}
.suggest::before{content:"";position:absolute;inset:-40% -10% auto auto;width:280px;height:280px;
  background:radial-gradient(circle,rgba(255,106,44,.18) 0%,transparent 70%);pointer-events:none;
  animation:suggestGlow 8s ease-in-out infinite;}
@keyframes suggestGlow{0%,100%{transform:translate(0,0) scale(1);opacity:.8;}50%{transform:translate(-20px,20px) scale(1.15);opacity:1;}}
.suggest-body{display:contents;}
.suggest-fade{animation:suggestFade .45s ease;}
@keyframes suggestFade{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
.suggest-foot{grid-column:1 / -1;display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.08);}
.suggest-dots{display:flex;gap:6px;}
.suggest-dot{width:6px;height:6px;border-radius:99px;background:rgba(255,255,255,.18);transition:all .25s;cursor:pointer;border:none;padding:0;}
.suggest-dot.on{background:#FF8A4C;width:18px;}
.suggest-nav{display:flex;gap:6px;align-items:center;}
.suggest-nav button{width:28px;height:28px;border-radius:8px;background:rgba(255,255,255,.06);color:#cbd1e3;display:grid;place-items:center;border:1px solid rgba(255,255,255,.08);transition:all .15s;}
.suggest-nav button:hover{background:rgba(255,106,44,.18);color:#fff;border-color:rgba(255,106,44,.35);}
.suggest-counter{font-size:11px;color:#7c8499;font-family:'JetBrains Mono',monospace;letter-spacing:.04em;}
.suggest .ico-tile{transition:transform .35s cubic-bezier(.34,1.56,.64,1);}
.suggest:hover .ico-tile{transform:rotate(-6deg) scale(1.05);}
.ap-root .btn-cta{background:linear-gradient(180deg,#FF7A3D,#FF5A14) !important;color:#fff !important;padding:12px 18px;border-radius:12px;
  font-weight:700;font-size:14px;display:inline-flex;align-items:center;gap:8px;border:none;
  box-shadow:0 12px 24px -8px rgba(255,90,20,.55),inset 0 1px 0 rgba(255,255,255,.25);}
.btn-cta:hover{filter:brightness(1.05);}

.composer-wrap{margin-top:22px;}
.composer{background:#fff;border:1px solid var(--line-soft);border-radius:16px;padding:14px 14px 10px;
  box-shadow:0 1px 0 rgba(17,24,39,.04),0 8px 24px -12px rgba(17,24,39,.18);}
.composer textarea{width:100%;border:0;outline:0;resize:none;min-height:54px;font-size:14.5px;color:var(--text);
  font-family:inherit;line-height:1.5;background:transparent;}
.composer textarea::placeholder{color:#9aa3b8;}
.composer-row{display:flex;align-items:center;gap:6px;margin-top:6px;}
.tool{display:inline-flex;align-items:center;gap:6px;color:#5b6478;font-size:12.5px;padding:6px 10px;border-radius:8px;}
.tool:hover{background:#F1EFE8;}
.send{margin-left:auto;background:#0B1220;color:#fff;padding:9px 14px;border-radius:10px;font-size:13px;font-weight:600;
  display:inline-flex;align-items:center;gap:8px;opacity:.9;}
.send:hover{opacity:1;}
.composer-hint{display:flex;justify-content:space-between;color:var(--muted);font-size:11.5px;margin-top:8px;padding:0 4px;flex-wrap:wrap;gap:8px;}
.kbd{font-size:10px;border:1px solid var(--line-soft);padding:2px 6px;border-radius:6px;background:#fff;color:#5b6478;}
.sf-quick{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-self:flex-start;max-width:85%;}
.sf-quick-btn{min-height:44px;padding:10px 14px;border-radius:999px;border:1px solid var(--line-soft);background:#FFF7F1;color:var(--text);font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:8px;line-height:1.1;transition:all .15s ease;font-family:inherit;box-shadow:0 1px 0 rgba(17,24,39,.04);}
.sf-quick-btn:hover{border-color:var(--accent);background:#FFE7D6;color:var(--accent);transform:translateY(-1px);box-shadow:0 6px 14px -8px rgba(255,106,44,.45);}
.sf-quick-btn:active{transform:translateY(0);}
.sf-quick-ico{opacity:.7;font-size:13px;}

/* Tasks block */
.tasks-wrap{margin-top:28px;}
.tasks-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;}
.tasks-title{font-family:'Fraunces',serif;font-weight:600;font-size:18px;color:var(--text);letter-spacing:-.01em;}
.tasks-tabs{display:inline-flex;gap:4px;background:#fff;border:1px solid var(--line-soft);border-radius:10px;padding:4px;}
.tasks-tab{font-size:12px;color:var(--text-soft);font-weight:600;padding:6px 12px;border-radius:7px;transition:all .15s;}
.tasks-tab.active{background:var(--accent);color:#fff;}
.tasks-tab:not(.active):hover{background:#F1EFE8;}
.tasks-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;align-items:stretch;}
.task-card{background:#FFFFFF !important;border:2px solid #E7E9EF;border-radius:12px;padding:30px 10px 12px;text-align:left;
  display:flex;flex-direction:column;gap:6px;transition:all .18s;position:relative;
  box-shadow:0 1px 0 rgba(17,24,39,.04);min-width:0;height:180px;justify-content:flex-start;cursor:pointer;}
.task-card:hover{border-color:var(--accent);box-shadow:0 0 0 2px rgba(255,106,44,.18),0 10px 22px -12px rgba(255,106,44,.5);transform:translateY(-2px);}
.task-top{display:flex;align-items:flex-start;justify-content:space-between;gap:4px;}
.task-emoji{width:30px;height:30px;border-radius:8px;background:#FBF7F0;display:grid;place-items:center;font-size:15px;flex-shrink:0;}
.task-top-pill{position:absolute;top:8px;left:10px;font-size:8px;font-weight:800;color:#9A3412;background:#FFEDD5;padding:2px 6px;border-radius:999px;letter-spacing:.04em;}
.task-shortcut{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted);font-weight:700;background:#F6F4EE;border:1px solid var(--line-soft);padding:3px 7px;border-radius:6px;white-space:nowrap;display:inline-flex;align-items:center;line-height:1;margin-top:auto;align-self:flex-start;height:20px;}
.task-name{font-family:'Fraunces',serif;font-weight:600;font-size:13px;color:var(--text);line-height:1.2;margin-top:4px;}
.task-desc{font-size:10.5px;color:var(--text-soft);line-height:1.35;}
@media(max-width:1100px){.tasks-grid{grid-template-columns:repeat(3,1fr);}}
@media(max-width:520px){.tasks-grid{grid-template-columns:repeat(2,1fr);}}

/* History */
.history{background:var(--paper-2);border-left:1px solid rgba(17,24,39,.06);
  display:flex;flex-direction:column;height:100vh;position:sticky;top:0;transition:all .25s ease;overflow:hidden;}
.history-head{display:flex;align-items:center;gap:8px;padding:14px 16px;}
.history-title{font-weight:700;font-size:14px;}
.history-actions{margin-left:auto;display:flex;gap:6px;align-items:center;}
.btn-new{background:#0B1220;color:#fff;padding:6px 10px;border-radius:8px;font-size:12px;font-weight:600;
  display:inline-flex;align-items:center;gap:6px;}
.btn-collapse{width:28px;height:28px;border-radius:8px;border:1px solid var(--line-soft);background:#fff;
  display:grid;place-items:center;color:#3B4256;}
.btn-collapse:hover{border-color:#cfd4e1;}
.history-search{margin:0 16px 10px;display:flex;align-items:center;gap:8px;background:#fff;
  border:1px solid var(--line-soft);border-radius:10px;padding:8px 10px;}
.history-search input{border:0;outline:0;width:100%;font-size:13px;background:transparent;}
.history-section{padding:8px 16px 4px;font-size:10.5px;letter-spacing:.14em;color:#7a8194;text-transform:uppercase;}
.history-list{display:flex;flex-direction:column;gap:2px;padding:0 8px;overflow:auto;}
.h-item{display:flex;gap:10px;align-items:flex-start;padding:9px 10px;border-radius:10px;cursor:pointer;text-align:left;width:100%;}
.h-item:hover{background:#fff;}
.h-icon{width:26px;height:26px;border-radius:7px;background:#fff;border:1px solid var(--line-soft);
  display:grid;place-items:center;color:#3B4256;flex:none;}
.h-text{font-size:13px;line-height:1.35;color:var(--text);}
.h-meta{font-size:11px;color:var(--muted);margin-top:2px;}
.plan{margin:auto 12px 12px;background:linear-gradient(180deg,#FFEDD5 0%,#FFD7B5 100%);
  border:1px solid #F7C9A8;border-radius:12px;padding:10px 12px;color:#3a1f0b;}
.plan-tag{font-size:9.5px;font-weight:800;color:#9A3412;letter-spacing:.08em;display:inline-flex;align-items:center;gap:5px;}
.plan h4{margin:5px 0 2px;font-family:'Fraunces',serif;font-weight:700;font-size:13px;color:#3a1f0b;line-height:1.25;}
.plan p{margin:0;font-size:11px;color:#5a3a20;line-height:1.35;}
.btn-plan{margin-top:8px;display:inline-flex;align-items:center;gap:5px;background:var(--accent);color:#fff;
  padding:6px 10px;border-radius:8px;font-size:11.5px;font-weight:700;}

.history.collapsed{overflow:visible;}
.history.collapsed .history-head{flex-direction:column;gap:8px;padding:12px 8px;align-items:center;}
.history.collapsed .history-actions{flex-direction:column;gap:8px;margin-left:0;}
.history.collapsed .history-title,
.history.collapsed .history-search,
.history.collapsed .history-section,
.history.collapsed .history-list,
.history.collapsed .plan,
.history.collapsed .empty-today,
.history.collapsed .btn-new span{display:none;}
.history.collapsed .btn-new{padding:6px;width:32px;height:32px;justify-content:center;}
.history.collapsed .btn-collapse svg{transform:rotate(180deg);}

@media(max-width:1100px){.ai-app{grid-template-columns:72px 1fr 280px;}.ai-app.collapsed{grid-template-columns:72px 1fr 56px;}}
@media(max-width:820px){.ai-app,.ai-app.collapsed{grid-template-columns:1fr;}.history{display:none;}.greet{font-size:30px;}}
`;

type TaskTab = "Mais usadas" | "Inclusão" | "Avaliação" | "Tudo";
type TaskCategory = "Inclusão" | "Avaliação" | "Outros";
const TASKS: Array<{ emoji: string; name: string; desc: string; shortcut: string; top?: boolean; categories: TaskCategory[] }> = [
  { emoji: "📚", name: "Plano de aula", desc: "BNCC alinhado, com objetivos e avaliação", shortcut: "⌘ + 1", top: true, categories: ["Outros"] },
  { emoji: "📝", name: "Parecer descritivo", desc: "Bimestral, individual, em 4 minutos", shortcut: "⌘ + 2", top: true, categories: ["Avaliação"] },
  { emoji: "✨", name: "Adaptar conteúdo", desc: "Para alunos PCD ou com dificuldades", shortcut: "⌘ + 3", categories: ["Inclusão"] },
  { emoji: "📊", name: "Atividade avaliativa", desc: "Com gabarito e níveis de dificuldade", shortcut: "⌘ + 4", categories: ["Avaliação"] },
  { emoji: "💬", name: "Feedback ao aluno", desc: "Construtivo, alinhado à neurociência", shortcut: "⌘ + 5", categories: ["Avaliação"] },
  { emoji: "🎲", name: "Dinâmica de grupo", desc: "Para socialização e aprendizado ativo", shortcut: "⌘ + 6", categories: ["Inclusão"] },
];

export function Assistente() {
  const navigate = useNavigate();
  const sofia = useSofia();
  const ctx = useSofiaContext();
  const fala = gerarFalaSofia(ctx);
  const isPro = ctx.user.plano === "pro";
  const periodoLabel = ctx.temporal.periodo === "manha" ? "Bom dia" : ctx.temporal.periodo === "tarde" ? "Boa tarde" : "Boa noite";
  const mesAtual = new Date().toLocaleDateString("pt-BR", { month: "long", timeZone: "America/Sao_Paulo" }).toUpperCase();
  const proxima = ctx.dataState.proxima_aula;
  const pcdComAula = isPro && proxima && proxima.minutos_ate <= 180 && ctx.entity.todos_alunos_pcd[0] ? ctx.entity.todos_alunos_pcd[0] : null;
  const [collapsed, setCollapsed] = useState(true);
  const [tab, setTab] = useState<TaskTab>("Mais usadas");
  const [search, setSearch] = useState("");
  const [ctxOpen, setCtxOpen] = useState(false);
  // Permite recolher a barra de contexto para liberar espaço vertical no chat.
  // Persiste em localStorage para respeitar a preferência entre sessões.
  const [ctxCollapsed, setCtxCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("assistente_ctx_collapsed") === "1";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("assistente_ctx_collapsed", ctxCollapsed ? "1" : "0");
  }, [ctxCollapsed]);
  const [observacoes, setObservacoes] = usePersistentState<string>("assist_ctx_obs", "");
  const [selectedTurma, setSelectedTurma] = usePersistentState<string | null>("assist_ctx_turma", null);
  // Novos campos de contexto, todos persistidos para a Sofia "lembrar".
  const [ctxBimestre, setCtxBimestre] = usePersistentState<string>("assist_ctx_bimestre", "");
  const [ctxDuracao, setCtxDuracao] = usePersistentState<string>("assist_ctx_duracao", "");
  const [ctxFocos, setCtxFocos] = usePersistentState<string[]>("assist_ctx_focos", []);
  const [ctxEstilo, setCtxEstilo] = usePersistentState<string[]>("assist_ctx_estilo", []);
  const [ctxRecursos, setCtxRecursos] = usePersistentState<string[]>("assist_ctx_recursos", []);
  const [ctxEvitar, setCtxEvitar] = usePersistentState<string[]>("assist_ctx_evitar", []);
  const [ctxDocs, setCtxDocs] = usePersistentState<string[]>("assist_ctx_docs", []);
  const [ctxMomento, setCtxMomento] = usePersistentState<string[]>("assist_ctx_momento", []);
  const toggleIn = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) =>
    setter((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  const OPT_FOCOS = ["Alfabetização","Letramento","Numeralização","Leitura","Escrita","Compreensão de texto","Resolução de problemas","Habilidades socioemocionais","Projeto interdisciplinar","Preparação para avaliações"];
  const OPT_ESTILO = ["Respostas mais objetivas","Respostas mais detalhadas","Tom acolhedor","Linguagem técnica","Com exemplos práticos","Sempre citar BNCC","Sempre sugerir adaptação PCD"];
  const OPT_RECURSOS = ["Projetor","Quadro digital","Computadores","Tablets","Internet em sala","Materiais manipuláveis","Biblioteca","Pátio / área externa","Sala de informática"];
  const OPT_EVITAR = ["Som alto","Grupos grandes","Atividades com tela","Exposição individual","Estímulo visual excessivo","Tarefa para casa longa"];
  const OPT_DOCS = ["BNCC","Currículo estadual","Currículo municipal","PPP da escola","Material apostilado","Plano de ação da coordenação"];
  const OPT_MOMENTO = ["Início do turno","Antes do recreio","Após o recreio","Final do turno"];
  const OPT_BIMESTRE = ["1º bimestre","2º bimestre","3º bimestre","4º bimestre","1º trimestre","2º trimestre","3º trimestre","Recuperação"];
  const OPT_DURACAO = ["30 min","45 min","50 min","60 min","90 min","2 aulas geminadas"];

  const dashClasses = useDashClasses();
  const dashStudents = useDashStudents();
  type DashStudent = LegacyDashStudent;

  // Agrupa alunos por turma e identifica PCDs
  const turmasInfo = useMemo(() => {
    const map = new Map<string, { name: string; school?: string; grade?: string; shift?: string; alunos: DashStudent[]; pcds: DashStudent[] }>();
    dashClasses.forEach((c) => {
      map.set(c.name, { name: c.name, school: c.school, grade: c.grade, shift: c.shift, alunos: [], pcds: [] });
    });
    dashStudents.forEach((s) => {
      const key = s.classRef || "Sem turma";
      if (!map.has(key)) map.set(key, { name: key, alunos: [], pcds: [] });
      const entry = map.get(key)!;
      entry.alunos.push(s);
      if (s.pcd && s.pcd.trim()) entry.pcds.push(s);
    });
    return Array.from(map.values()).filter((t) => t.alunos.length > 0 || dashClasses.some((c) => c.name === t.name));
  }, [dashClasses, dashStudents]);

  const turmaSelecionada = selectedTurma ? turmasInfo.find((t) => t.name === selectedTurma) : null;
  const messages = sofia.messages;
  const loading = sofia.loading;
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const handleQuickOption = (opt: string) => {
    if (isFreeTextOption(opt)) {
      setTimeout(() => composerRef.current?.focus(), 0);
      return;
    }
    sofia.send(opt);
  };

  // ---------- Sugestões dinâmicas com base em contexto real ----------
  type Sugestao = {
    id: string;
    label: string;
    title: string;
    subtitle: string;
    cta: string;
    icon: React.ReactNode;
    onAction: () => void;
  };
  const sugestoes: Sugestao[] = useMemo(() => {
    const out: Sugestao[] = [];
    const ds = ctx.dataState;
    const turma = ctx.entity.turma_atual?.nome || turmaSelecionada?.name || "sua turma";
    const pcd = ctx.entity.todos_alunos_pcd[0];
    const goto = (to: string) => () => navigate({ to });
    const ask = (prompt: string) => () => sofia.openSofia({ prompt, send: false });

    // Sugestão da Sofia (regras)
    if (fala.texto) {
      out.push({
        id: "fala",
        label: "Sugestão pra você agora",
        title: fala.texto.replace(/<\/?em>/g, ""),
        subtitle: "A Sofia analisou seu contexto agora e sugere essa próxima ação.",
        cta: fala.acoes[0]?.label || "Começar agora",
        icon: <Sparkles size={22} />,
        onAction: () => {
          const a = fala.acoes[0];
          if (a?.prompt) sofia.openSofia({ prompt: a.prompt, send: false });
          else if (a?.to) navigate({ to: a.to as string });
          else navigate({ to: "/" });
        },
      });
    }

    // Pareceres pendentes
    const pendentes = Math.max(0, (ds.pareceres_total_bimestre ?? 0) - (ds.pareceres_finalizados ?? 0));
    if (pendentes > 0) {
      out.push({
        id: "pareceres",
        label: `${pendentes} parecer${pendentes > 1 ? "es" : ""} pendente${pendentes > 1 ? "s" : ""}`,
        title: `Faltam ${pendentes} pareceres do bimestre em ${turma}`,
        subtitle: "Posso gerar todos em ordem de prioridade — começando pelos PCDs.",
        cta: "Começar pareceres",
        icon: <ClipboardList size={22} />,
        onAction: ask(`Vamos gerar os ${pendentes} pareceres pendentes do bimestre da ${turma}, começando pelos alunos PCD.`),
      });
    }

    // Próxima aula
    if (proxima && proxima.minutos_ate >= 0 && proxima.minutos_ate <= 240) {
      const min = proxima.minutos_ate;
      const quando = min < 60 ? `em ${min} min` : `em ${Math.round(min / 60)}h`;
      out.push({
        id: "proxima",
        label: "Sua próxima aula",
        title: `${proxima.disciplina} ${quando} · ${proxima.turma}`,
        subtitle: pcd
          ? `Posso adaptar a aula para ${pcd.nome} (${pcd.condicao}) antes do sinal.`
          : "Quer um plano enxuto pronto para imprimir?",
        cta: pcd ? "Adaptar para PCD" : "Gerar plano rápido",
        icon: <Clock size={22} />,
        onAction: ask(
          pcd
            ? `Adapte rapidamente o plano da próxima aula (${proxima.disciplina}, ${proxima.turma}) para ${pcd.nome} — ${pcd.condicao}.`
            : `Crie um plano de aula enxuto e pronto para imprimir para ${proxima.disciplina} na ${proxima.turma}, começando ${quando}.`
        ),
      });
    }

    // Onboarding (sem turmas)
    if (ds.turmas_count === 0) {
      out.push({
        id: "onb-turma",
        label: "Primeiro passo",
        title: "Cadastre sua primeira turma para liberar o contexto",
        subtitle: "Sem turma minhas sugestões ficam genéricas. Em 30 s já fica pronto.",
        cta: "Cadastrar turma",
        icon: <GraduationCap size={22} />,
        onAction: goto("/"),
      });
    } else if (ds.alunos_count === 0) {
      out.push({
        id: "onb-alunos",
        label: "Quase lá",
        title: `A turma ${turma} ainda não tem alunos`,
        subtitle: "Cadastre a lista para que eu personalize pareceres, planos e adaptações.",
        cta: "Adicionar alunos",
        icon: <Users size={22} />,
        onAction: goto("/"),
      });
    }

    // PCD sem PEI / inclusão
    if (pcd) {
      out.push({
        id: "pei",
        label: "Inclusão",
        title: `${pcd.nome} (${pcd.condicao}) precisa de plano individualizado`,
        subtitle: "Posso montar o PEI a partir da anamnese e dos eixos da BNCC.",
        cta: "Gerar PEI",
        icon: <Brain size={22} />,
        onAction: ask(`Monte um PEI completo para ${pcd.nome} (${pcd.condicao}) com objetivos de curto e longo prazo.`),
      });
    }

    // Agenda
    if (ds.eventos_agenda_mes > 0) {
      out.push({
        id: "agenda",
        label: "Sua agenda do mês",
        title: `${ds.eventos_agenda_mes} eventos marcados em ${new Date().toLocaleDateString("pt-BR", { month: "long" })}`,
        subtitle: "Quer que eu destaque os que precisam de preparação prévia?",
        cta: "Ver prioridades",
        icon: <Calendar size={22} />,
        onAction: ask("Liste os eventos da minha agenda deste mês que precisam de preparação e me diga por onde começar."),
      });
    }

    // Planejamento
    if (ds.alunos_count > 0) {
      out.push({
        id: "plano",
        label: "Planejamento da semana",
        title: `Quer um plano semanal completo para ${turma}?`,
        subtitle: "Defino objetivos, BNCC, materiais e adaptações em uma só passada.",
        cta: "Montar a semana",
        icon: <BookOpen size={22} />,
        onAction: goto("/planejamento"),
      });
    }

    // Streak / parabéns
    if (ctx.user.streak_dias && ctx.user.streak_dias >= 3) {
      out.push({
        id: "streak",
        label: "Você está em sequência",
        title: `${ctx.user.streak_dias} dias seguidos por aqui — bora manter o ritmo?`,
        subtitle: "Posso te entregar o foco do dia em 10 segundos.",
        cta: "Ver foco de hoje",
        icon: <Star size={22} />,
        onAction: goto("/"),
      });
    }

    // fallback se nada bater
    if (out.length === 0) {
      out.push({
        id: "fallback",
        label: "Comece por aqui",
        title: "Conte o que está pegando hoje e eu já te ajudo",
        subtitle: "Pareceres, planos, adaptações, dinâmicas — é só pedir em linguagem natural.",
        cta: "Abrir conversa",
        icon: <Sparkles size={22} />,
        onAction: () => sofia.openSofia({ prompt: "", send: false }),
      });
    }
    return out;
  }, [ctx, fala, proxima, navigate, sofia, turmaSelecionada]);

  // Apenas a sugestão mais relevante do contexto atual (sem rotação automática).
  const sugAtual = sugestoes[0];

  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Carrega lista de conversas ao montar
  useEffect(() => { sofia.refreshConversations(); }, [sofia.refreshConversations]);

  const handleNew = () => { sofia.startNew(); };

  const sendMessage = (raw?: string) => {
    const content = (raw ?? sofia.draft).trim();
    if (!content || loading) return;
    sofia.send(content);
  };

  // Agrupa conversas por data
  const { today, week, older } = useMemo(() => {
    const todayKey = brDateKey();
    const dayMs = 24 * 3600 * 1000;
    const t: typeof sofia.conversations = [];
    const w: typeof sofia.conversations = [];
    const o: typeof sofia.conversations = [];
    const filter = search.trim().toLowerCase();
    const list = Array.isArray(sofia.conversations) ? sofia.conversations : [];
    for (const c of list) {
      if (filter && !(c.title || "").toLowerCase().includes(filter)) continue;
      const updated = new Date(c.updated_at);
      const updatedKey = brDateKey(updated);
      const ageDays = diffDaysBR(updatedKey, todayKey);
      if (updatedKey === todayKey) t.push(c);
      else if (ageDays >= 0 && ageDays < 7) w.push(c);
      else if (Date.now() - updated.getTime() < dayMs && updatedKey !== todayKey) w.push(c);
      else o.push(c);
    }
    return { today: t, week: w, older: o };
  }, [sofia.conversations, search]);

  return (
    <div className="ap-root">
      <style dangerouslySetInnerHTML={{ __html: sidebarCss + css }} />
      <div className={"ai-app" + (collapsed ? " collapsed" : "")}>
        <AppSidebar active="assistant" />

        <section className="ai-main">
          <AppHeader
            actions={
              <>
                <button className="ah-icon" aria-label="Compartilhar"><Share2 size={16} /></button>
                <button className="ah-icon" aria-label="Ajuda"><HelpCircle size={16} /></button>
              </>
            }
          />

          {ctxCollapsed ? (
            <div className="ai-context" style={{ padding: "6px 22px" }}>
              <span className="ctx-label">Contexto ativo</span>
              <button
                onClick={() => setCtxCollapsed(false)}
                aria-label="Mostrar contexto"
                title="Mostrar contexto"
                style={{ marginLeft: "auto", background: "transparent", border: "1px solid var(--line-soft)", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "var(--text-soft)", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}
              >
                <ChevronDown size={13} /> Mostrar
              </button>
            </div>
          ) : (
            <div className="ai-context">
              <span className="ctx-label">Contexto ativo:</span>
              <SofiaActiveChip />
              <button className="edit-context" aria-label="Editar contexto" onClick={() => setCtxOpen(true)}><Pencil size={13} /> Editar contexto</button>
              <button
                onClick={() => setCtxCollapsed(true)}
                aria-label="Recolher contexto"
                title="Recolher contexto"
                style={{ background: "transparent", border: "1px solid var(--line-soft)", borderRadius: 999, padding: "6px 10px", fontSize: 11, fontWeight: 700, color: "var(--text-soft)", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}
              >
                <ChevronUp size={13} /> Recolher
              </button>
            </div>
          )}

          <div className="convo">
            <div className="convo-inner" ref={scrollRef}>
              {pcdComAula && proxima && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ background: "linear-gradient(135deg,#1E1B2E 0%,#15131F 100%)", border: "1px solid #2A2438", borderRadius: 16, padding: "18px 20px", color: "#fff", boxShadow: "0 14px 36px rgba(15,13,30,.28)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#F97316,#EA580C)", display: "grid", placeItems: "center", color: "#fff" }}><Sparkles size={16} /></div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#F97316", letterSpacing: ".04em", textTransform: "uppercase" }}>✨ Foco de hoje · sugerido pela IA</div>
                    </div>
                    <div style={{ fontSize: 15, lineHeight: 1.5, color: "rgba(255,255,255,.95)", fontWeight: 500, marginBottom: 6 }}>
                      <b>{pcdComAula.nome}</b> ({pcdComAula.condicao}) precisa de uma atividade adaptada para a aula de <b>{proxima.disciplina}</b> de hoje. A próxima aula dele(a) é em <span style={{ color: "#FDBA74", fontWeight: 700 }}>~{proxima.minutos_ate}min</span>. Quer que eu adapte agora?
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", marginBottom: 14 }}>~<b style={{ color: "#FDBA74" }}>2 minutos</b> para gerar · baseado no laudo já cadastrado</div>
                    <button onClick={() => sofia.openSofia({ prompt: `Adapte a aula de ${proxima.disciplina} (${proxima.bncc_codigo || "BNCC"}) para ${pcdComAula.nome} (${pcdComAula.condicao}). Sugira 3 ajustes práticos com tempo estimado.`, send: false })} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, background: "linear-gradient(135deg,#F97316,#EA580C)", color: "#fff", border: 0, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                      Adaptar agora <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
              {messages.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>
                  {messages.map((m, i) => {
                    const parsed = m.role === "assistant" ? parseQuickOptions(m.content) : null;
                    const isLastAssistant = m.role === "assistant" && i === messages.length - 1;
                    return (
                    <React.Fragment key={i}>
                    <div
                      style={{
                        alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                        maxWidth: "85%",
                        background: m.role === "user" ? "var(--accent)" : "#fff",
                        color: m.role === "user" ? "#fff" : "var(--text)",
                        border: m.role === "user" ? "none" : "1px solid var(--line-soft)",
                        borderRadius: 14,
                        padding: "12px 14px",
                        fontSize: 14,
                        lineHeight: 1.55,
                        boxShadow: "0 1px 0 rgba(17,24,39,.04),0 8px 24px -16px rgba(17,24,39,.18)",
                      }}
                    >
                      {m.role === "assistant" ? (
                        <>
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown>{parsed?.clean ?? m.content}</ReactMarkdown>
                          </div>
                          {m.issues && m.issues.length > 0 && (
                            <div style={{ marginTop: 10, padding: "8px 10px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 8, fontSize: 12, color: "#7C2D12" }}>
                              <b>Linguagem ajustada automaticamente</b> ({m.issues.length} termo{m.issues.length > 1 ? "s" : ""}): {m.issues.map((i, k) => (
                                <span key={k}>{k > 0 ? ", " : " "}<i>"{i.term}"</i> → <b>{i.suggestion}</b></span>
                              ))}
                            </div>
                          )}
                          {m.truncated && i === messages.length - 1 && (
                            <div style={{ marginTop: 10, padding: "8px 10px", background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 8, fontSize: 12, color: "#78350F", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span>⚠️ A resposta foi muito longa e precisou ser dividida. Deseja continuar?</span>
                              <button
                                type="button"
                                onClick={() => sofia.send("Continue de onde parou, sem repetir o que já foi dito.")}
                                disabled={loading}
                                style={{ background: "#92400E", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}
                              >
                                Continuar
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                      )}
                    </div>
                    {isLastAssistant && !loading && parsed && parsed.options.length > 0 && (
                      <div className="sf-quick" role="group" aria-label="Respostas rápidas">
                        {parsed.options.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            className="sf-quick-btn"
                            onClick={() => handleQuickOption(opt)}
                          >
                            <span className="sf-quick-ico">👆</span>
                            <span>{opt}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    </React.Fragment>
                    );
                  })}
                  {loading && (
                    <div style={{ alignSelf: "flex-start", color: "var(--muted)", fontSize: 13, padding: "8px 12px" }}>
                      Sofia está pensando…
                    </div>
                  )}
                </div>
              ) : (
                <>
              {isPro ? (
                <h1 className="greet">
                  {periodoLabel}, <em>{ctx.user.primeiro_nome}</em>.<br />
                  O que vamos resolver agora?
                </h1>
              ) : (
                <h1 className="greet">
                  Olá, <em>{ctx.user.primeiro_nome}</em> 👋<br />
                  Por onde <em><u>a gente começa hoje?</u></em>
                </h1>
              )}
              <p className="greet-sub">
                {isPro
                  ? `Tô de olho na ${ctx.entity.turma_atual?.nome || "sua turma"} · ${ctx.dataState.alunos_count} alunos. Pode pedir parecer, plano, adaptação ou registro.`
                  : "Cadastre suas turmas e alunos para que eu tenha contexto e possa gerar pareceres, planos e adaptações em minutos."}
              </p>

              <div className="suggest" key={sugAtual?.id}>
                <div className="ico-tile suggest-fade">{sugAtual?.icon ?? <FileText size={22} />}</div>
                <div className="suggest-fade">
                  <div className="label"><Star size={11} fill="currentColor" /> {sugAtual?.label?.toUpperCase() ?? "SUGESTÃO PRA VOCÊ AGORA"}</div>
                  <h3>{sugAtual?.title ?? "Comece cadastrando sua primeira turma"}</h3>
                  <p>{sugAtual?.subtitle ?? "Conforme você usa a Sofia, sugestões personalizadas aparecerão aqui."}</p>
                </div>
                <button className="btn-cta" onClick={() => sugAtual?.onAction?.()} aria-label={sugAtual?.cta || "Começar agora"}>
                  {sugAtual?.cta || "Começar agora"} <ArrowRight size={14} />
                </button>
              </div>

              <div className="tasks-wrap">
                <div className="tasks-head">
                  <div className="tasks-title">Ou escolha uma tarefa</div>
                  <div className="tasks-tabs" role="tablist">
                    {(["Mais usadas","Inclusão","Avaliação","Tudo"] as const).map((t) => (
                      <button
                        key={t}
                        role="tab"
                        aria-selected={tab === t}
                        className={"tasks-tab" + (tab === t ? " active" : "")}
                        onClick={() => setTab(t)}
                      >{t}</button>
                    ))}
                  </div>
                </div>
                <div className="tasks-grid">
                  {TASKS.filter((t) => {
                    if (tab === "Tudo") return true;
                    if (tab === "Mais usadas") return t.top;
                    return t.categories.includes(tab as TaskCategory);
                  }).map((t) => (
                    <button key={t.shortcut} className="task-card" aria-label={t.name} onClick={() => sendMessage(`${t.name}: ${t.desc}`)}>
                      {t.top && <span className="task-top-pill">🔥 Top</span>}
                      <div className="task-emoji">{t.emoji}</div>
                      <div className="task-name">{t.name}</div>
                      <div className="task-desc">{t.desc}</div>
                      <span className="task-shortcut">{t.shortcut}</span>
                    </button>
                  ))}
                  {TASKS.filter((t) => {
                    if (tab === "Tudo") return true;
                    if (tab === "Mais usadas") return t.top;
                    return t.categories.includes(tab as TaskCategory);
                  }).length === 0 && (
                    <div style={{ gridColumn: "1 / -1", padding: 16, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                      Nenhuma tarefa nesta categoria.
                    </div>
                  )}
                </div>
              </div>
                </>
              )}

              <div className="composer-wrap">
                <div className="composer">
                  <textarea
                    ref={composerRef}
                    value={sofia.draft}
                    onChange={(e) => sofia.setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Pergunte qualquer coisa pedagógica... ex: 'crie um plano de aula sobre frações para o 4º ano'"
                    aria-label="Mensagem para a Sofia"
                  />
                  <div className="composer-row">
                    <button className="send" aria-label="Enviar mensagem" onClick={() => sendMessage()} disabled={loading}>
                      {loading ? "Enviando…" : "Enviar"} <Send size={14} />
                    </button>
                  </div>
                </div>
                <div className="composer-hint">
                  <span>💡 Dica: use <span className="kbd">⌘</span> + <span className="kbd">1-6</span> para abrir uma tarefa direto</span>
                  <span>A Sofia pode cometer erros · sempre revise antes de usar</span>
                </div>
                <div
                  className="text-xs"
                  style={{ marginTop: 4, color: "#6B7280", textAlign: "right" }}
                  title="Esta assistente opera sob princípios éticos e pedagógicos. Clique em Configurações > Princípios da Sofia para ler na íntegra."
                >
                  🛡️ Sofia v{SOFIA_CONSTITUTION_VERSION} · BNCC · LBI · Lei 14.254/2021 · linguagem não-capacitista
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className={"history" + (collapsed ? " collapsed" : "")}>
          <div
            className="history-head"
            onClick={() => setCollapsed((v) => !v)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCollapsed((v) => !v); } }}
            style={{ cursor: "pointer" }}
            aria-label={collapsed ? "Expandir histórico" : "Recolher histórico"}
          >
            <div className="history-title">Histórico</div>
            <div className="history-actions">
              <button className="btn-new" onClick={(e) => { e.stopPropagation(); handleNew(); }} aria-label="Nova conversa">
                <Plus size={12} /><span>Novo</span>
              </button>
              <button
                className="btn-collapse"
                onClick={(e) => { e.stopPropagation(); setCollapsed((v) => !v); }}
                aria-label={collapsed ? "Expandir histórico" : "Recolher histórico"}
              >
                <ChevronsLeft size={14} />
              </button>
            </div>
          </div>

          <div className="history-search">
            <Search size={13} color="#7a8194" />
            <input
              placeholder="Buscar conversa..."
              aria-label="Buscar conversa"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="history-list" style={{ flex: 1 }}>
            {!sofia.isAuthed && (
              <div style={{ padding: "8px 16px", fontSize: 12, color: "var(--muted)" }}>
                Faça login para ver suas conversas.
              </div>
            )}
            {sofia.isAuthed && sofia.conversations.length === 0 && (
              <div style={{ padding: "8px 16px", fontSize: 12, color: "var(--muted)" }}>
                Suas conversas com a Sofia aparecerão aqui.
              </div>
            )}
            {today.length > 0 && <div className="history-section">Hoje</div>}
            {today.map((c) => (
              <button
                key={c.id}
                className="h-item"
                onClick={() => sofia.loadConversation(c.id)}
                style={c.id === sofia.conversationId ? { background: "#FFF5EE" } : undefined}
              >
                <div className="h-icon"><FileText size={13} /></div>
                <div style={{ minWidth: 0 }}>
                  <div className="h-text" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                  <div className="h-meta">{new Date(c.updated_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" })}</div>
                </div>
              </button>
            ))}
            {week.length > 0 && <div className="history-section">Esta semana</div>}
            {week.map((c) => (
              <button
                key={c.id}
                className="h-item"
                onClick={() => sofia.loadConversation(c.id)}
                style={c.id === sofia.conversationId ? { background: "#FFF5EE" } : undefined}
              >
                <div className="h-icon"><FileText size={13} /></div>
                <div style={{ minWidth: 0 }}>
                  <div className="h-text" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                  <div className="h-meta">{new Date(c.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" })}</div>
                </div>
              </button>
            ))}
            {older.length > 0 && <div className="history-section">Anteriores</div>}
            {older.map((c) => (
              <button
                key={c.id}
                className="h-item"
                onClick={() => sofia.loadConversation(c.id)}
                style={c.id === sofia.conversationId ? { background: "#FFF5EE" } : undefined}
              >
                <div className="h-icon"><FileText size={13} /></div>
                <div style={{ minWidth: 0 }}>
                  <div className="h-text" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                  <div className="h-meta">{new Date(c.updated_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</div>
                </div>
              </button>
            ))}
          </div>

        </aside>
      </div>
      {ctxOpen && (
        <div className="ctx-modal-overlay" onClick={() => setCtxOpen(false)}>
          <div className="ctx-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ctx-modal-head">
              <div>
                <h3>Editar contexto</h3>
                <p>Ajuste as informações que a Sofia usa para personalizar respostas.</p>
              </div>
              <button className="ctx-modal-close" onClick={() => setCtxOpen(false)} aria-label="Fechar"><X size={16} /></button>
            </div>
            <div className="ctx-modal-body">
              <div className="ctx-section">
                <div className="ctx-section-label">Suas turmas (clique para selecionar)</div>
                {turmasInfo.length === 0 ? (
                  <div className="ctx-empty-turma">
                    Você ainda não cadastrou turmas. Cadastre suas turmas e alunos no painel inicial para a Sofia identificar automaticamente a quantidade de alunos e os PCDs.
                  </div>
                ) : (
                  <div className="ctx-turma-list">
                    {turmasInfo.map((t) => {
                      const isSel = selectedTurma === t.name;
                      return (
                        <button
                          key={t.name}
                          type="button"
                          className={"ctx-turma-card" + (isSel ? " selected" : "")}
                          onClick={() => setSelectedTurma(isSel ? null : t.name)}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div className="tname">{t.name}</div>
                            <div className="tmeta">
                              {[t.school, t.grade, t.shift].filter(Boolean).join(" · ") || "Turma cadastrada"}
                            </div>
                          </div>
                          <div className="tcounts">
                            <span><b>{t.alunos.length}</b> alunos</span>
                            <span><b>{t.pcds.length}</b> PCD</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {turmaSelecionada && turmaSelecionada.pcds.length > 0 && (
                <div className="ctx-section">
                  <div className="ctx-section-label">Alunos PCD em {turmaSelecionada.name} ({turmaSelecionada.pcds.length})</div>
                  <div className="ctx-pcd-list">
                    {turmaSelecionada.pcds.map((a, i) => (
                      <span key={i} className="ctx-pcd-tag"><b>{a.name}</b> · {a.pcd}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="ctx-section">
                <div className="ctx-grid2">
                  <div className="ctx-field-inline">
                    <label>Etapa atual</label>
                    <select className="" value={ctxBimestre} onChange={(e) => setCtxBimestre(e.target.value)} style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid var(--line-soft)", fontSize: 13, fontFamily: "inherit", background: "#fff" }}>
                      <option value="">Selecione…</option>
                      {OPT_BIMESTRE.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="ctx-field-inline">
                    <label>Duração típica da aula</label>
                    <select value={ctxDuracao} onChange={(e) => setCtxDuracao(e.target.value)} style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid var(--line-soft)", fontSize: 13, fontFamily: "inherit", background: "#fff" }}>
                      <option value="">Selecione…</option>
                      {OPT_DURACAO.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="ctx-section">
                <div className="ctx-section-label">Foco pedagógico do momento</div>
                <CtxChipGroup options={OPT_FOCOS} value={ctxFocos} onToggle={toggleIn(setCtxFocos)} />
              </div>

              <div className="ctx-section">
                <div className="ctx-section-label">Estilo de resposta da Sofia</div>
                <CtxChipGroup options={OPT_ESTILO} value={ctxEstilo} onToggle={toggleIn(setCtxEstilo)} />
              </div>

              <div className="ctx-section">
                <div className="ctx-section-label">Recursos disponíveis em sala</div>
                <CtxChipGroup options={OPT_RECURSOS} value={ctxRecursos} onToggle={toggleIn(setCtxRecursos)} />
              </div>

              <div className="ctx-section">
                <div className="ctx-section-label">Restrições / o que evitar</div>
                <CtxChipGroup options={OPT_EVITAR} value={ctxEvitar} onToggle={toggleIn(setCtxEvitar)} />
              </div>

              <div className="ctx-section">
                <div className="ctx-section-label">Documentos pedagógicos seguidos</div>
                <div className="ctx-chips">
                  {OPT_DOCS.map((o) => (
                    <button key={o} type="button" className={"ctx-chip" + (ctxDocs.includes(o) ? " on" : "")} onClick={() => toggleIn(setCtxDocs)(o)}>{o}</button>
                  ))}
                </div>
              </div>

              <div className="ctx-section">
                <div className="ctx-section-label">Momento do dia em foco</div>
                <div className="ctx-chips">
                  {OPT_MOMENTO.map((o) => (
                    <button key={o} type="button" className={"ctx-chip" + (ctxMomento.includes(o) ? " on" : "")} onClick={() => toggleIn(setCtxMomento)(o)}>{o}</button>
                  ))}
                </div>
              </div>

              <div className="ctx-section">
                <div className="ctx-section-label">Observações para a Sofia</div>
                <div className="ctx-field">
                  <textarea
                    rows={3}
                    placeholder="Ex.: Foco em alfabetização, evitar atividades com som alto, etc."
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="ctx-modal-foot">
              <button className="ctx-btn-cancel" onClick={() => setCtxOpen(false)}>Cancelar</button>
              <button
                className="ctx-btn-save"
                onClick={() => {
                  const partes: string[] = [];
                  if (turmaSelecionada) {
                    const pcdTxt = turmaSelecionada.pcds.length
                      ? ` Alunos PCD: ${turmaSelecionada.pcds.map((p) => `${p.name} (${p.pcd})`).join(", ")}.`
                      : " Sem alunos PCD registrados.";
                    partes.push(`Foque na turma ${turmaSelecionada.name} com ${turmaSelecionada.alunos.length} alunos.${pcdTxt}`);
                  }
                  if (ctxBimestre) partes.push(`Etapa atual: ${ctxBimestre}.`);
                  if (ctxDuracao) partes.push(`Duração típica da aula: ${ctxDuracao}.`);
                  if (ctxFocos.length) partes.push(`Foco pedagógico: ${ctxFocos.join(", ")}.`);
                  if (ctxEstilo.length) partes.push(`Estilo de resposta: ${ctxEstilo.join("; ")}.`);
                  if (ctxRecursos.length) partes.push(`Recursos disponíveis: ${ctxRecursos.join(", ")}.`);
                  if (ctxEvitar.length) partes.push(`Evitar: ${ctxEvitar.join(", ")}.`);
                  if (ctxDocs.length) partes.push(`Documentos seguidos: ${ctxDocs.join(", ")}.`);
                  if (ctxMomento.length) partes.push(`Momento do dia em foco: ${ctxMomento.join(", ")}.`);
                  if (observacoes.trim()) partes.push(observacoes.trim());
                  if (partes.length) {
                    sofia.openSofia({ prompt: `Atualize meu contexto: ${partes.join(" ")}`, send: false });
                  }
                  setCtxOpen(false);
                }}
              >
                Salvar contexto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}