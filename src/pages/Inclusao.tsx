import { useState, useEffect, useMemo, useRef, useCallback, type ReactNode } from "react";
import { AlunoCard } from "@/components/inclusao/AlunoCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearch, useNavigate } from "@tanstack/react-router";
import {
  HelpCircle, Download, X, Sparkles, BookOpen, FileText, Printer,
  ChevronRight, ArrowLeft, Plus, Search, Send, CheckCircle2, Lightbulb,
  Pencil, Save, FileDown,
} from "lucide-react";
import { AppSidebar, sidebarCss } from "@/components/AppSidebar";
import { EmptyState, emptyStateCss } from "@/components/EmptyState";
import { CID_OPTIONS } from "@/lib/cidsBR";
import { buildCidsPromptBlock } from "@/lib/inclusao/cidPrompt";
import { toast } from "sonner";
import { consumirCreditos, descricaoDoc } from "@/lib/creditos/consume";
import { CUSTOS } from "@/lib/creditos/policy";
import { useCreditosGate } from "@/lib/creditos/CreditosGate";
import { acumularTempo } from "@/lib/tempo/acumular";
import { useTempoEconomizado } from "@/lib/tempo/useTempoEconomizado";
import { useSofia } from "@/components/sofia/SofiaProvider";
import { SofiaSuggestionList } from "@/components/sofia/SofiaSuggestionCard";
import { useCurriculoMunicipal } from "@/hooks/useCurriculoMunicipal";
import { SofiaErrorBoundary } from "@/components/sofia/SofiaErrorBoundary";
import { wrapEditorialPrintHtml as wrapStandardPrintHtml } from "@/lib/print/editorialPrint";
import { GerarRelatorioButton } from "@/components/documentos/RelatorioDialog";
import {
  printAnamneseDocument,
  downloadAnamneseDocx,
  type AnamneseData,
} from "@/lib/print/anamnesePrint";
import { useUser } from "@/lib/mockData";
import { useSofiaSuggestions } from "@/components/sofia/useSofiaSuggestions";
import { SofiaContextChip } from "@/components/sofia/SofiaContextChip";
import { useSofiaContext } from "@/lib/sofia/sofiaContext";
import { Header as AppHeader } from "@/components/Header";
import { usePersistentState } from "@/lib/persist/usePersistentState";
import { useInclusaoStudents } from "@/hooks/useInclusaoStudents";
import { useTurmas } from "@/hooks/useTurmas";
import {
  ANO_REFERENCIA_GROUPS,
  buildAnoReferenciaPromptBlock,
  isAnoReferenciaDivergente,
} from "@/lib/inclusao/anoReferencia";
import { PlanoInclusaoModal, type PlanoInclusao } from "@/components/inclusao/PlanoInclusaoModal";
import { PlanoPeriodoModal } from "@/components/inclusao/PlanoPeriodoModal";
import { PlanoInclusaoVisualizarModal } from "@/components/inclusao/PlanoInclusaoVisualizarModal";
import { PEIFormModal, buildPEIContext, type PEIData } from "@/components/inclusao/PEIFormModal";
import { createAgendaEvent } from "@/lib/db/agenda";
import { supabase } from "@/integrations/supabase/client";

const css = `
.inc-root{
  --primary:#1B2A4E;--primary-dark:#0F1B36;--accent:#FF7A45;--accent-warm:#FF9466;--accent-soft:#FFF1E8;
  --success:#10B981;--warn:#F59E0B;--danger:#EF4444;
  --bg:#F4F6FB;--card:#FFFFFF;--text:#1B2A4E;--muted:#6B7691;--border:#E4E8F0;
  font-family:'Inter',-apple-system,sans-serif;background:var(--bg);color:var(--text);
  -webkit-font-smoothing:antialiased;line-height:1.5;font-size:14px;min-height:100vh;
}
.inc-root *{box-sizing:border-box;}
.inc-root h1,.inc-root h2,.inc-root h3,.inc-root h4{margin:0;letter-spacing:-.02em;color:var(--text);}
.inc-root button{font-family:inherit;cursor:pointer;border:none;background:transparent;color:inherit;}
.inc-root p{margin:0;}
.inc-root input,.inc-root textarea,.inc-root select{font-family:inherit;font-size:13px;}

.inc-app{display:grid;grid-template-columns:240px 1fr;min-height:100vh;}
@media(max-width:820px){.inc-app{grid-template-columns:1fr;}.inc-sidebar{display:none;}.inc-main{padding-top:18px;}}
.inc-main{display:flex;flex-direction:column;min-width:0;}

.inc-topbar{background:#fff;border-bottom:1px solid var(--border);padding:14px 26px;display:flex;align-items:center;gap:14px;position:sticky;top:0;z-index:50;flex-wrap:wrap;}
.inc-crumbs{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--muted);}
.inc-crumbs a{color:var(--muted);cursor:pointer;}
.inc-crumbs a:hover{color:var(--accent);}
.inc-crumbs .sep{opacity:.4;}
.inc-crumbs .now{color:var(--text);font-weight:600;}
.inc-spacer{flex:1;}
.inc-status-pill{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:var(--muted);}
.inc-status-pill .dot{width:7px;height:7px;border-radius:50%;background:var(--success);box-shadow:0 0 6px var(--success);}
.inc-btn-ghost{padding:8px 13px;border:1px solid var(--border);background:#fff;border-radius:9px;font-weight:600;font-size:12.5px;color:var(--text);display:inline-flex;align-items:center;gap:6px;transition:.15s;}
.inc-btn-ghost:hover{border-color:var(--accent);color:var(--accent);}

.inc-content{padding:22px 26px 48px;}

/* LIST VIEW */
.list-hero h1{font-family:'Fraunces',serif;font-weight:800;font-size:30px;letter-spacing:-.4px;margin-bottom:5px;}
.list-hero p{color:var(--muted);font-size:13.5px;}
.list-toolbar{margin-top:18px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.list-search{flex:1;max-width:380px;position:relative;}
.list-search input{width:100%;padding:11px 14px 11px 38px;border:1px solid var(--border);border-radius:10px;outline:none;background:#fff;font-size:13px;}
.list-search input:focus{border-color:var(--accent);}
.list-search svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted);}
.list-filter{padding:10px 14px;border:1px solid var(--border);border-radius:10px;background:#fff;cursor:pointer;font-weight:600;font-size:12.5px;color:var(--text);}
.list-actions{margin-left:auto;}
.list-grid{margin-top:18px;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;}
.student-card{background:#fafbfd;border:1.5px dashed #C9D2E0;border-radius:14px;padding:18px;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease,background .18s ease;position:relative;overflow:hidden;text-align:left;width:100%;color:var(--text);}
.student-card:hover{background:#fff;border-color:var(--accent);border-style:solid;transform:translateY(-3px);box-shadow:0 16px 32px rgba(255,122,69,.22);}
.student-card:hover .sc-info b{color:var(--accent);}
.student-card:hover .sc-tag.muted{background:var(--accent-soft);color:#B8410E;}
.student-card::before{content:"";position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--accent),var(--accent-warm));opacity:0;transition:.15s;}
.student-card:hover::before{opacity:1;}
.sc-head{display:flex;gap:12px;align-items:center;margin-bottom:12px;}
.sc-avatar{width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#fff;display:grid;place-items:center;font-family:'Fraunces',serif;font-weight:800;font-size:18px;flex-shrink:0;}
.sc-avatar.featured{background:linear-gradient(135deg,var(--accent),var(--accent-warm));box-shadow:0 0 0 3px rgba(255,122,69,.2);}
.sc-info b{display:block;font-family:'Fraunces',serif;font-weight:700;font-size:16px;color:var(--text);letter-spacing:-.2px;transition:color .18s ease;}
.sc-info span{font-size:12px;color:var(--muted);font-weight:500;}
.sc-tags{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;}
.sc-tag{font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:6px;background:var(--accent-soft);color:#B8410E;letter-spacing:.2px;}
.sc-tag.muted{background:#EEF1F6;color:#4A586F;}
.sc-stats{display:flex;justify-content:space-between;padding-top:12px;border-top:1px dashed #D6DCE6;font-size:11.5px;color:var(--muted);font-weight:600;}
.sc-stats > div{flex:1;}
.sc-stats b{color:var(--text);font-family:'JetBrains Mono',monospace;font-weight:800;font-size:14px;display:block;margin-bottom:2px;}

/* DETAIL VIEW */
.hero{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:end;}
@media(max-width:1024px){.hero{grid-template-columns:1fr;}}
.back{font-size:12.5px;color:var(--muted);display:inline-flex;align-items:center;gap:5px;margin-bottom:10px;}
.back:hover{color:var(--accent);}
.hero-l h1{font-family:'Fraunces',serif;font-weight:800;font-size:34px;letter-spacing:-.6px;line-height:1.05;margin-bottom:8px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
.hero-l h1 .age{font-family:'Inter',sans-serif;font-weight:500;font-size:15px;color:var(--muted);letter-spacing:0;}
.diagnostic{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#FFF1E8,#FFE4D2);border:1px solid #FFD4B8;color:#B8410E;padding:7px 13px;border-radius:10px;font-weight:700;font-size:13px;margin-right:8px;}
.diagnostic .pulse{width:8px;height:8px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 0 rgba(255,122,69,.6);animation:incPulse 2s infinite;}
@keyframes incPulse{0%{box-shadow:0 0 0 0 rgba(255,122,69,.6);}70%{box-shadow:0 0 0 8px rgba(255,122,69,0);}100%{box-shadow:0 0 0 0 rgba(255,122,69,0);}}
.tag{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:8px;background:#fff;border:1px solid var(--border);font-size:12px;color:var(--muted);font-weight:500;}
.tag b{color:var(--text);font-weight:600;}
.tag-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.hero-r{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;justify-content:flex-end;}
.inc-root .btn{padding:10px 16px;border-radius:10px;font-weight:600;font-size:13px;display:inline-flex;align-items:center;gap:7px;transition:.15s;white-space:nowrap;border:none;cursor:pointer;}
 .inc-root .btn-primary{border:1px solid var(--border);box-shadow:none;}
.inc-root .btn-primary:hover{border-color:var(--accent);color:var(--accent)!important;}
.inc-root .btn-secondary{background:#fff;border:1px solid var(--border);color:var(--text);}
.inc-root .btn-secondary:hover{border-color:var(--accent);color:var(--accent);}
/* Exceção: botão Cadastrar aluno mantém o destaque laranja. */
.inc-root .btn-cadastrar{background:linear-gradient(135deg,var(--accent),var(--accent-warm))!important;color:#fff!important;border:none!important;box-shadow:0 6px 16px rgba(255,122,69,.35);}
.inc-root .btn-cadastrar:hover{transform:translateY(-1px);box-shadow:0 10px 22px rgba(255,122,69,.45);filter:brightness(1.03);color:#fff!important;}

.kpis{margin-top:18px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
@media(max-width:1024px){.kpis{grid-template-columns:repeat(2,1fr);}}
.kpi{background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px 16px;position:relative;overflow:hidden;}
.kpi-label{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600;margin-bottom:6px;}
.kpi-value{font-family:'Fraunces',serif;font-weight:700;font-size:24px;letter-spacing:-.4px;line-height:1;}
.kpi-value .small{font-size:14px;color:var(--muted);font-weight:500;}
.kpi-sub{font-size:11.5px;color:var(--muted);margin-top:4px;}
.kpi-sub .up{color:var(--success);font-weight:700;}
.kpi-accent{background:#0F1B36;border:1px solid #0F1B36;color:#fff;position:relative;overflow:hidden;}
.kpi-accent::before{display:none;}
.kpi-accent .kpi-label{color:rgba(255,255,255,.75);}
.kpi-accent .kpi-value{color:#fff;}
.kpi-accent .kpi-sub{color:rgba(255,255,255,.7);}

.tabs{margin-top:18px;display:flex;background:linear-gradient(180deg,var(--primary) 0%,var(--primary-dark) 100%);border:1px solid var(--navy-darker,#0F1A36);border-radius:11px;padding:5px;gap:2px;overflow-x:auto;box-shadow:0 6px 18px rgba(15,26,54,.18);}
.tab{flex:1;min-width:0;padding:9px 12px;border-radius:8px;font-size:12.5px;font-weight:600;color:#fff !important;text-align:center;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid transparent;transition:.15s;white-space:nowrap;}
.tab:hover{background:rgba(255,255,255,.08);color:#fff;}
.tab.active{background:linear-gradient(135deg,var(--accent),#FF9466);color:#fff;box-shadow:0 4px 10px rgba(255,122,69,.35);}
.tab-count{display:inline-grid;place-items:center;padding:2px 6px;border-radius:5px;background:var(--accent);color:#fff !important;font-size:10.5px;font-weight:700;font-family:'JetBrains Mono',monospace;}
.tab.active .tab-count{background:rgba(255,255,255,.22);color:#fff;}

.panel{display:none;flex-direction:column;gap:14px;margin-top:14px;}
.panel.active{display:flex;}

.action-card{background:linear-gradient(135deg,#1B2A4E 0%,#0F1A36 100%);border:1px solid #0F1A36;border-radius:14px;padding:20px 22px;color:#fff;position:relative;overflow:hidden;box-shadow:0 10px 28px rgba(15,26,54,.22);}
.action-card::before{display:none;}
.ac-head{display:flex;align-items:center;gap:10px;margin-bottom:10px;position:relative;z-index:2;}
.ac-head .sofia{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent-warm));display:grid;place-items:center;font-family:'Fraunces',serif;font-weight:800;color:#fff;font-size:13px;box-shadow:0 0 0 3px rgba(255,122,69,.2);}
.ac-head-txt{flex:1;}
.ac-head-txt b{display:block;font-weight:700;font-size:13px;color:#fff;}
.ac-head-txt span{font-size:11.5px;color:rgba(255,255,255,.7);}
.ac-tag{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;background:var(--accent);color:#fff;padding:4px 8px;border-radius:6px;}
.inc-root .ac-title{font-family:'Fraunces',serif;font-weight:700;font-size:22px;line-height:1.2;letter-spacing:-.3px;margin-bottom:8px;color:#fff;position:relative;z-index:2;}
.inc-root .ac-title em{color:var(--accent-warm);font-style:normal;font-weight:800;}
.ac-body{font-size:13px;line-height:1.55;color:rgba(255,255,255,.78);margin-bottom:16px;position:relative;z-index:2;}
.ac-body .bncc{font-family:'JetBrains Mono',monospace;color:#fff;background:rgba(255,122,69,.3);padding:1px 5px;border-radius:4px;font-size:11.5px;font-weight:700;}
.ac-strats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px;position:relative;z-index:2;}
@media(max-width:1024px){.ac-strats{grid-template-columns:1fr;}}
.ac-strat{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:9px;padding:10px;font-size:11.5px;line-height:1.4;}
.ac-strat b{display:flex;align-items:center;gap:5px;font-weight:700;color:var(--accent-warm);font-size:11px;margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em;}
.ac-strat span{color:rgba(255,255,255,.78);}
.ac-cta{display:flex;gap:8px;position:relative;z-index:2;flex-wrap:wrap;}
.btn-ghost-dark{background:#fff;border:1px solid var(--border);color:var(--text);padding:10px 14px;border-radius:10px;font-size:12.5px;font-weight:600;}
.btn-ghost-dark:hover{border-color:var(--accent);color:var(--accent);}

.section{background:#fff;border:1px solid var(--border);border-radius:13px;padding:18px 20px;}
.section-head h3{font-family:'Fraunces',serif;font-weight:700;font-size:18px;letter-spacing:-.2px;flex:1 1 100%;min-width:0;overflow-wrap:break-word;word-break:normal;}
.section-head h3{font-family:'Fraunces',serif;font-weight:700;font-size:18px;letter-spacing:-.2px;flex:1;}
.section-head .legal{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--muted);background:var(--bg);padding:4px 8px;border-radius:6px;font-weight:500;}
.section-head .more{color:var(--muted);font-size:12px;font-weight:600;}
.section-head .more:hover{color:var(--accent);}
.pei-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
@media(max-width:720px){.pei-grid{grid-template-columns:1fr;}}
.pei{padding:13px 14px;border:1.5px solid var(--accent);border-radius:11px;background:linear-gradient(180deg,#fff,#FAFBFE);cursor:pointer;transition:.15s;text-align:left;width:100%;}
.pei:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:0 8px 20px rgba(255,122,69,.18);}
.pei-icon{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;font-size:14px;font-weight:800;margin-bottom:8px;font-family:'Fraunces',serif;}
.pei-cog{background:#FFF1E8;color:#B8410E;}
.pei-soc{background:#E0F2FE;color:#0C4A6E;}
.pei-mot{background:#DCFCE7;color:#14532D;}
.pei-com{background:#FEF3C7;color:#78350F;}
.pei h4{font-weight:700;font-size:13px;margin-bottom:4px;}
.pei .pei-status{font-size:11px;color:var(--muted);font-weight:500;margin-bottom:8px;display:flex;align-items:center;gap:5px;}
.pei-status .ok{color:var(--success);font-weight:700;}
.pei-status .warn{color:var(--warn);font-weight:700;}
.pei .meta{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--muted);background:var(--bg);padding:3px 6px;border-radius:5px;display:inline-block;}
.pei p{font-size:12px;line-height:1.5;color:var(--muted);margin:6px 0 0;}
.pei p b{color:var(--text);font-weight:600;}

.simple{background:#fff;border:1px solid var(--border);border-radius:13px;padding:18px 20px;}
.simple h4{font-family:'Fraunces',serif;font-weight:700;font-size:17px;margin-bottom:6px;}
.simple p{color:var(--muted);font-size:13px;}

/* Visão de hoje · 2 colunas */
.hoje-grid{display:grid;grid-template-columns:1fr 320px;gap:24px;align-items:start;}
@media(max-width:1024px){.hoje-grid{grid-template-columns:1fr;}}
.col-l{display:flex;flex-direction:column;gap:14px;min-width:0;}
.col-r{display:flex;flex-direction:column;gap:14px;position:sticky;top:80px;}
@media(max-width:1024px){.col-r{position:static;}}

/* Sofia card */
.sofia-card{background:linear-gradient(135deg,#1B2A4E 0%,#0F1A36 100%);border:1px solid #0F1A36;border-radius:14px;padding:18px;color:#fff;position:relative;overflow:hidden;box-shadow:0 10px 28px rgba(15,26,54,.22);}
.sofia-card::before{display:none;}
.sofia-card > *{position:relative;z-index:1;}
.sofia-head{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.sofia-head .av{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent-warm));display:grid;place-items:center;font-family:'Fraunces',serif;font-weight:800;color:#fff;font-size:14px;flex-shrink:0;}
.sofia-head b{display:block;font-weight:700;font-size:13.5px;color:#fff;}
.sofia-head span{font-size:11.5px;color:rgba(255,255,255,.7);}
.sofia-q{font-style:italic;font-size:12.5px;color:rgba(255,255,255,.82);line-height:1.5;margin-bottom:12px;}
.sofia-actions{display:flex;flex-direction:column;gap:6px;}
.sofia-action{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:9px;padding:10px 12px;font-size:12.5px;display:flex;align-items:center;gap:8px;text-align:left;width:100%;color:#fff;font-weight:500;transition:.15s;}
.sofia-action:hover{border-color:var(--accent-warm);background:rgba(255,122,69,.14);color:#fff;}
.sofia-action .ico{color:var(--accent-warm);flex-shrink:0;}
.sofia-action .arrow{margin-left:auto;color:rgba(255,255,255,.6);font-size:14px;}

/* Contexto rápido */
.context-card{background:#fff;border:1px solid var(--border);border-radius:14px;padding:16px 18px;}
.context-card h4{font-family:'Fraunces',serif;font-weight:700;font-size:15px;margin-bottom:12px;}
.ctx-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px dashed var(--border);font-size:12px;}
.ctx-row:last-child{border-bottom:none;}
.ctx-row .lbl{color:var(--muted);font-weight:500;}
.ctx-pill{font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:6px;text-transform:uppercase;letter-spacing:.04em;background:var(--bg);color:var(--text);}
.ctx-pill.warn{background:#FEF3C7;color:#78350F;}
.ctx-pill.ok{background:#DCFCE7;color:#14532D;}

/* Skills card */
.skills-card{background:#fff;border:1px solid var(--border);border-radius:14px;padding:16px 18px;}
.skills-card h4{font-family:'Fraunces',serif;font-weight:700;font-size:15px;display:flex;align-items:center;gap:8px;margin-bottom:14px;}
.skills-card h4 .badge{margin-left:auto;font-family:'Inter',sans-serif;font-size:10.5px;font-weight:700;background:#DCFCE7;color:#14532D;padding:3px 7px;border-radius:6px;}
.skill{margin-bottom:11px;}
.skill:last-child{margin-bottom:0;}
.skill-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px;font-size:12px;}
.skill-head b{font-weight:600;color:var(--text);}
.skill-head span{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);font-weight:700;}
.skill-bar{height:6px;background:var(--bg);border-radius:99px;overflow:hidden;}
.skill-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--accent),var(--accent-warm));}
.skill-fill.green{background:linear-gradient(90deg,#10B981,#34D399);}
.skill-fill.warn{background:linear-gradient(90deg,#F59E0B,#FBBF24);}

/* Trust */
.trust-card{background:var(--accent-soft);border:1px dashed #FFD4B8;border-radius:12px;padding:14px;font-size:12px;color:#7A2E0A;line-height:1.5;display:flex;gap:9px;align-items:flex-start;}
.trust-card .dot{width:10px;height:10px;border-radius:50%;background:var(--accent);flex-shrink:0;margin-top:4px;}
.trust-card b{font-weight:700;}

/* Timeline */
.tl{display:flex;flex-direction:column;position:relative;padding-left:6px;}
.tl::before{content:"";position:absolute;left:15px;top:14px;bottom:14px;width:0;border-left:2px dashed var(--border);}
.tl-item{display:grid;grid-template-columns:24px 1fr auto;gap:12px;padding:10px 0;align-items:start;position:relative;}
.tl-dot{width:18px;height:18px;border-radius:50%;background:#fff;border:3px solid var(--accent);margin-top:3px;position:relative;z-index:2;}
.tl-dot.pulse{box-shadow:0 0 0 0 rgba(255,122,69,.6);animation:incPulse 2s infinite;}
.tl-dot.done{background:var(--success);border-color:var(--success);}
.tl-dot.warn{background:#fff;border-color:var(--warn);}
.tl-content b{display:block;font-size:13px;font-weight:600;color:var(--text);margin-bottom:2px;}
.tl-content span{font-size:11.5px;color:var(--muted);line-height:1.4;}
.tl-date{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--muted);font-weight:600;white-space:nowrap;}

/* MODAL */
.inc-modal-overlay{position:fixed;inset:0;background:rgba(15,27,54,.55);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;z-index:200;padding:24px;}
.inc-modal-overlay.open{display:flex;}
.inc-modal{background:#fff;border-radius:16px;width:100%;max-width:880px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 30px 80px rgba(15,27,54,.4);}
.inc-modal-bar{height:5px;background:linear-gradient(90deg,var(--accent),var(--accent-warm));}
.inc-modal-head{padding:18px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:14px;}
.inc-modal-head h2{font-family:'Fraunces',serif;font-weight:800;font-size:20px;flex:1;}
.inc-modal-head .meta{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--muted);text-align:right;line-height:1.5;}
.inc-modal-close{background:var(--bg);width:34px;height:34px;border-radius:9px;display:grid;place-items:center;color:var(--muted);border:0;cursor:pointer;padding:0;font:inherit;}
.inc-modal-close:hover{background:var(--danger);color:#fff;}
.inc-modal-close > *{pointer-events:none;}
.inc-modal-body{padding:22px 24px;overflow-y:auto;flex:1;background:#F0F2F7;}
.inc-modal-body.plain{background:#fff;}
.inc-modal-foot{padding:14px 24px;border-top:1px solid var(--border);background:var(--bg);display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.inc-modal-foot .legal{font-size:11.5px;color:var(--muted);flex:1;min-width:180px;}

@media (max-width: 640px){
  .inc-modal-overlay{padding:0;align-items:flex-end;}
  /* Abas (Visão de hoje / Anamnese / …): em vez de rolar para o lado,
   * dispõem-se em grade de 2 por linha (2+2+1). */
  .tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;overflow-x:visible;}
  .tab{flex:none;width:100%;}
  .inc-modal{max-width:100% !important;max-height:100dvh;height:100dvh;border-radius:14px 14px 0 0;}
  .inc-modal-head{padding:14px 16px;gap:10px;}
  .inc-modal-head h2{font-size:17px;line-height:1.25;}
  .inc-modal-body{padding:16px;-webkit-overflow-scrolling:touch;padding-bottom:calc(16px + env(safe-area-inset-bottom));}
  .inc-modal-foot{padding:12px 16px calc(12px + env(safe-area-inset-bottom)) !important;flex-direction:column-reverse;align-items:stretch;gap:8px;position:sticky;bottom:0;background:#fff;z-index:5;border-top:1px solid var(--border);}
  .inc-modal-foot .legal{display:none;}
  .inc-modal-foot button,.inc-modal-foot .inc-btn-ghost,.inc-modal-foot .btn{width:100%;justify-content:center;margin:0 !important;}
  .inc-modal-body.plain > div[style*="flex-end"],
  .inc-modal-body.plain > div:last-child{flex-direction:column-reverse !important;align-items:stretch !important;}
  .inc-modal-body.plain > div:last-child > button{width:100%;justify-content:center;}
  .inc-modal-body.plain > div > div[style*="display: flex"]{flex-wrap:wrap;}
  .inc-modal-body.plain select,
  .inc-modal-body.plain input{font-size:16px !important;}
}

.inc-tut-step{display:grid;grid-template-columns:36px 1fr;gap:14px;padding:14px;border:1px solid var(--border);border-radius:11px;background:linear-gradient(180deg,#fff,#FAFBFE);margin-bottom:8px;}
.inc-tut-num{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent-warm));color:#fff;display:grid;place-items:center;font-family:'Fraunces',serif;font-weight:800;font-size:15px;}
.inc-tut-step b{display:block;font-weight:700;font-size:14px;margin-bottom:2px;}
.inc-tut-step p{font-size:12.5px;color:var(--muted);line-height:1.5;}

.inc-adapt-item{display:grid;grid-template-columns:32px 1fr auto;gap:14px;align-items:start;padding:14px;border:1px solid var(--border);border-radius:11px;margin-bottom:8px;background:#fff;}
.inc-adapt-num{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent-warm));color:#fff;display:grid;place-items:center;font-family:'Fraunces',serif;font-weight:800;font-size:14px;}
.inc-adapt-item h4{font-weight:700;font-size:14px;}
.inc-adapt-item p{font-size:12.5px;color:var(--muted);line-height:1.5;margin-top:3px;}
.inc-adapt-item .meta{margin-top:6px;font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--accent);font-weight:700;}

.inc-a4{background:#fff;width:100%;max-width:760px;margin:0 auto;padding:40px 50px;font-family:'Fraunces',serif;color:#000;border:1px solid var(--border);border-radius:6px;}
.inc-a4-head{display:grid;grid-template-columns:60px 1fr auto;gap:14px;align-items:center;border-bottom:3px double #000;padding-bottom:14px;margin-bottom:18px;}
.inc-a4-logo{width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#fff;display:grid;place-items:center;font-family:'Fraunces',serif;font-weight:900;font-size:22px;}
.inc-a4-head .center{text-align:center;font-family:'Inter',sans-serif;}
.inc-a4-head .center b{display:block;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;}
.inc-a4-head .center span{font-size:11px;color:#444;}
.inc-a4-head .stamp{font-family:'JetBrains Mono',monospace;font-size:10px;color:#666;text-align:right;line-height:1.5;}
.inc-a4 h1{font-family:'Fraunces',serif;font-weight:800;font-size:18px;text-align:center;margin-bottom:18px;text-transform:uppercase;letter-spacing:.05em;}
.inc-a4 .ident{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;font-size:12.5px;margin-bottom:18px;border:1px solid #000;padding:10px 14px;font-family:'Inter',sans-serif;}
.inc-a4 h2{font-family:'Fraunces',serif;font-weight:700;font-size:13px;background:#000;color:#fff;padding:5px 12px;margin:14px 0 8px;text-transform:uppercase;letter-spacing:.06em;}
.inc-a4 p{font-size:13px;line-height:1.6;text-align:justify;margin-bottom:8px;}
.inc-a4 ul{font-size:12.5px;line-height:1.7;padding-left:22px;margin-bottom:8px;font-family:'Inter',sans-serif;}

@media(max-width:720px){.inc-app{grid-template-columns:1fr;}}
@media(max-width:480px){
  .kpis{grid-template-columns:1fr;}
  .list-grid{grid-template-columns:1fr;gap:10px;}
  .plan-hero{padding:16px;}
  .plan-hero h3{font-size:18px;}
  .inc-a4{padding:16px !important;}
  input,select,textarea{font-size:16px !important;}
  .list-toolbar{flex-direction:column;align-items:stretch;gap:8px;}
  .list-toolbar .list-search{max-width:100%;width:100%;}
  .list-toolbar .list-filter,
  .list-toolbar .list-actions{width:100%;}
  .list-toolbar .list-actions{margin-left:0;}
  .list-toolbar .list-actions > *{width:100%;justify-content:center;}
}

/* PLAN tab */
.plan-hero{background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#fff;border-radius:14px;padding:20px 22px;position:relative;overflow:hidden;margin-bottom:14px;}
.plan-hero::before{content:"";position:absolute;top:-40%;right:-15%;width:70%;height:140%;background:radial-gradient(circle,rgba(255,122,69,.32) 0%,transparent 60%);pointer-events:none;}
.plan-hero > *{position:relative;z-index:1;}
.plan-hero .tag-line{font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.7);margin-bottom:8px;}
.plan-hero h3{font-family:'Fraunces',serif;font-size:22px;font-weight:700;margin-bottom:10px;color:#fff;}
.plan-hero p{color:rgba(255,255,255,.85);font-size:13px;margin-bottom:14px;}
.plan-strats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;}
@media(max-width:1024px){.plan-strats{grid-template-columns:1fr;}}
.plan-strat{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:12px 14px;}
.plan-strat b{display:block;color:var(--accent-warm);font-size:12px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px;}
.plan-strat span{color:rgba(255,255,255,.85);font-size:12.5px;line-height:1.45;}
.plan-list{display:flex;flex-direction:column;gap:10px;margin-top:14px;}
.plan-item{background:#fff;border:1px solid var(--border);border-radius:11px;padding:14px 16px;display:grid;grid-template-columns:80px 1fr auto;gap:14px;align-items:center;}
@media(max-width:720px){.plan-item{grid-template-columns:1fr;}}
.plan-item .when{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;}
.plan-item .when b{display:block;font-size:14px;color:var(--text);}
.plan-item h5{font-weight:700;font-size:13.5px;margin-bottom:4px;}
.plan-item .meta-row{display:flex;flex-wrap:wrap;gap:6px;font-size:11.5px;color:var(--muted);}
.plan-item .bncc{font-family:'JetBrains Mono',monospace;background:var(--bg);padding:2px 7px;border-radius:5px;color:var(--text);font-weight:600;}
.plan-item .adapted{background:var(--accent-soft);color:#B8410E;padding:2px 7px;border-radius:5px;font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;}

/* REG tab */
.reg-filters{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;}
.reg-filter{padding:7px 12px;border-radius:8px;background:#fff;border:1px solid var(--border);font-size:12px;font-weight:600;color:var(--text);cursor:pointer;transition:.15s;}
.reg-filter.active,.reg-filter:hover{background:var(--accent);border-color:var(--accent);color:#fff;}
.reg-list{display:flex;flex-direction:column;gap:10px;}
.reg-item{background:#fff;border:1px solid var(--border);border-radius:11px;padding:14px 16px;}
.reg-item-head{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap;}
.reg-when{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);font-weight:700;}
.reg-author{font-size:12px;font-weight:600;color:var(--text);}
.reg-cat{font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:5px;text-transform:uppercase;letter-spacing:.04em;margin-left:auto;}
.reg-cat.ped{background:#E0F2FE;color:#0C4A6E;}
.reg-cat.com{background:#FEF3C7;color:#78350F;}
.reg-cat.sen{background:#FCE7F3;color:#831843;}
.reg-cat.fam{background:#DCFCE7;color:#14532D;}
.reg-body{font-size:13px;color:var(--text);line-height:1.5;}
.reg-att{margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;}
.reg-att span{font-size:11px;background:var(--bg);padding:4px 8px;border-radius:6px;color:var(--muted);font-weight:600;display:inline-flex;align-items:center;gap:4px;}

/* REL tab */
.rel-feature{background:linear-gradient(135deg,var(--accent-soft),#FFE4D2);border:1px solid #FFD4B8;border-radius:14px;padding:18px 20px;margin-bottom:14px;}
.rel-feature h4{font-family:'Fraunces',serif;font-size:18px;color:#7A2E0A;margin-bottom:6px;}
.rel-feature p{color:#7A2E0A;font-size:12.5px;margin-bottom:12px;}
.rel-list{display:flex;flex-direction:column;gap:10px;}
.rel-row{background:#fff;border:1px solid var(--border);border-radius:11px;padding:14px 16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
.rel-row .ico{width:36px;height:36px;border-radius:8px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;flex-shrink:0;}
.rel-row .info{flex:1;min-width:200px;}
.rel-row .info b{display:block;font-size:13.5px;font-weight:700;}
.rel-row .info span{font-size:11.5px;color:var(--muted);}
.rel-status{font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:6px;text-transform:uppercase;letter-spacing:.04em;}
.rel-status.ok{background:#DCFCE7;color:#14532D;}
.rel-status.draft{background:#FEF3C7;color:#78350F;}
.rel-actions{display:flex;gap:6px;}
.rel-suggest{margin-top:14px;background:#fff;border:1px dashed var(--accent);border-radius:12px;padding:14px 16px;}
.rel-suggest h5{font-family:'Fraunces',serif;font-size:14.5px;margin-bottom:10px;color:var(--text);}
.rel-suggest ul{list-style:none;display:flex;flex-direction:column;gap:8px;}
.rel-suggest li{font-size:12.5px;color:var(--text);display:flex;gap:8px;align-items:flex-start;}
.rel-suggest li::before{content:"•";color:var(--accent);font-weight:900;}

/* DOC tab */
.doc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;}
.doc-card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;}
.doc-card .doc-head{display:flex;align-items:center;gap:10px;}
.doc-card .doc-ic{width:36px;height:36px;border-radius:8px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;font-family:'Fraunces',serif;font-weight:800;font-size:12px;flex-shrink:0;}
.doc-card b{font-size:13.5px;font-weight:700;line-height:1.3;}
.doc-card .doc-meta{font-size:11.5px;color:var(--muted);}
.doc-card .doc-acts{display:flex;gap:6px;margin-top:6px;}
.doc-card .doc-acts button{flex:1;padding:7px 10px;border-radius:7px;font-size:11.5px;font-weight:600;border:1px solid var(--border);background:#fff;color:var(--text);cursor:pointer;transition:.15s;display:inline-flex;align-items:center;justify-content:center;gap:5px;}
.doc-card .doc-acts button:hover{border-color:var(--accent);color:var(--accent);}
.doc-card .doc-acts .primary{background:linear-gradient(135deg,var(--accent),var(--accent-warm));color:#fff;border:none;}

/* Anamnese eixos */
.anam-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 18px;margin-top:14px;}
@media(max-width:720px){.anam-grid{grid-template-columns:1fr;}}
.anam-row{display:flex;flex-direction:column;gap:5px;padding:8px 0;border-bottom:1px dashed var(--border);}
.anam-row-head{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12.5px;}
.anam-row-head b{font-weight:600;color:var(--text);}
.anam-row-head span{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);font-weight:700;}
.anam-bar{height:6px;background:var(--bg);border-radius:99px;overflow:hidden;}
.anam-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--accent),var(--accent-warm));transition:width .3s;}
.anam-fill.ok{background:linear-gradient(90deg,#10B981,#34D399);}
.anam-fill.warn{background:linear-gradient(90deg,#F59E0B,#FBBF24);}
.anam-fill.muted{background:var(--border);}

/* Anamnese accordion */
.anam-list{display:flex;flex-direction:column;gap:8px;margin-top:14px;}
.anam-item{background:#fff;border:1px solid var(--border);border-radius:11px;overflow:hidden;}
.anam-summary{width:100%;display:grid;grid-template-columns:1fr auto auto;gap:14px;align-items:center;padding:12px 14px;background:#fff;cursor:pointer;text-align:left;border:none;}
.anam-summary:hover{background:#FAFBFE;}
.anam-summary .label{display:flex;flex-direction:column;gap:6px;min-width:0;}
.anam-summary .label b{font-weight:600;font-size:13px;color:var(--text);display:flex;align-items:center;gap:8px;}
.anam-summary .label .bar{height:5px;background:var(--bg);border-radius:99px;overflow:hidden;width:100%;max-width:280px;}
.anam-summary .label .bar > div{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--accent),var(--accent-warm));transition:width .25s;}
.anam-summary .label .bar > div.ok{background:linear-gradient(90deg,#10B981,#34D399);}
.anam-summary .label .bar > div.warn{background:linear-gradient(90deg,#F59E0B,#FBBF24);}
.anam-summary .label .bar > div.muted{background:var(--border);}
.anam-summary .pct{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--muted);}
.anam-summary .chev{color:var(--muted);transition:transform .2s;}
.anam-summary.open .chev{transform:rotate(90deg);color:var(--accent);}
.anam-body{padding:6px 14px 14px;border-top:1px dashed var(--border);background:#FAFBFE;display:flex;flex-direction:column;gap:8px;}
.anam-desc{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:10px 12px;background:#fff;border:1px solid var(--border);border-radius:9px;}
@media(max-width:720px){.anam-desc{grid-template-columns:1fr;}}
.anam-desc p{font-size:12.5px;color:var(--text);line-height:1.4;margin:0;}
.anam-status-group{display:flex;gap:4px;flex-wrap:wrap;}
.anam-status-btn{padding:5px 10px;border-radius:6px;font-size:11px;font-weight:600;border:1px solid var(--border);background:#fff;color:var(--muted);cursor:pointer;transition:.15s;white-space:nowrap;}
.anam-status-btn:hover{border-color:var(--accent);color:var(--accent);}
.anam-status-btn.active.consolidado{background:#DCFCE7;border-color:#10B981;color:#14532D;}
.anam-status-btn.active.desenvolvimento{background:var(--accent-soft);border-color:var(--accent);color:#7A2E0A;}
.anam-status-btn.active.naoAlcancado{background:#FEE2E2;border-color:#EF4444;color:#7F1D1D;}
.anam-status-btn.active.naoObservado{background:var(--bg);border-color:var(--border);color:var(--text);}
`;

const printCss = `
@media print {
  body * { visibility: hidden !important; }
  #anam-print-area, #anam-print-area * { visibility: visible !important; }
  #anam-print-area { position: absolute !important; inset: 0 !important; padding: 0 !important; background:#fff !important; }
  .inc-modal-bar, .inc-modal-head, .inc-modal-foot { display: none !important; }
  .inc-modal { box-shadow: none !important; max-width: 100% !important; }
  .inc-modal-body { background:#fff !important; padding: 0 !important; overflow: visible !important; }
}
`;

type TabKey = "hoje" | "anam" | "plan" | "reg" | "rel";
type ViewKey = "list" | "detail";

type Student = {
  id: string; name: string; initials: string; age: string; turma: string;
  diag: string; cid: string; cids?: string[]; aee: string; anoEscolar?: string; featured?: boolean;
  anamnese: string; registros: string; trend: string; trendTone: "ok" | "warn" | "muted";
};

const PEI_EIXOS: Array<{ ic: string; cls: string; h: string; status: string; tone: "ok" | "warn"; meta: string; body: ReactNode }> = [];

const TUTORIAL_STEPS = [
  { t: "Selecione o aluno", d: "Na lista de Inclusão, clique no card do aluno para abrir KPIs, eixos do PEI e timeline pedagógica." },
  { t: "Confira a Visão de hoje", d: "A Sofia destaca a aula do dia que precisa de adaptação e propõe estratégias visual, pacing e mediação." },
  { t: "Preencha a Anamnese", d: "Use os 14 eixos guiados. Em cada campo há sugestões rápidas contextuais ao ano e ao diagnóstico." },
  { t: "Gere o Planejamento", d: "Configure período, escolha disciplinas e gere atividades já adaptadas conforme o PEI vigente." },
  { t: "Faça Registros frequentes", d: "Cada registro alimenta o relatório anual. Use observações rápidas para ganhar velocidade." },
  { t: "Gere o Relatório IA", d: "Selecione o período e a Sofia consolida registros + PEI + anamnese em um parecer pronto para exportar." },
];

const REG_ITEMS: Array<{ when: string; who: string; cat: "ped" | "fam" | "sen" | "com"; catLabel: string; body: string; att: string[] }> = [];

const REL_PAST: Array<{ bim: string; date: string; status: "ok"; statusLabel: string }> = [];

const DOCS: Array<{ ic: string; t: string; who: string; date: string; size: string }> = [];

type AnamStatus = "consolidado" | "desenvolvimento" | "naoAlcancado" | "naoObservado";
const ANAM_STATUS_VALUE: Record<AnamStatus, number> = {
  consolidado: 100, desenvolvimento: 60, naoAlcancado: 20, naoObservado: 0,
};
const ANAM_STATUS_LABEL: Record<AnamStatus, string> = {
  consolidado: "Consolidado", desenvolvimento: "Em desenvolvimento", naoAlcancado: "Não alcançado", naoObservado: "Não observado",
};

/** Converte os eixos da Anamnese (estrutura interna do app) em
 *  `AnamneseData` para o gerador de documento padronizado (PDF/Word). */
function buildAnamneseDocData(
  student: Student | undefined | null,
  anamData: Array<{ l: string; items: Array<{ d: string; s: AnamStatus }>; obs: string }>,
  mode: "completo" | "preenchido",
): AnamneseData {
  const secoesCustom = anamData
    .map((e) => {
      const items = mode === "completo"
        ? e.items
        : e.items.filter((i) => i.s !== "naoObservado");
      const obs = (e.obs || "").trim();
      if (mode === "preenchido" && items.length === 0 && !obs) return null;
      const linhasItens = items.map((it) => `• ${ANAM_STATUS_LABEL[it.s]}: ${it.d}`);
      const corpoItens = linhasItens.length > 0
        ? linhasItens.join("\n")
        : (mode === "completo" ? "Nenhum descritor avaliado." : "");
      const corpoObs = obs ? `\nObservações: ${obs}` : "";
      return { titulo: e.l, conteudo: (corpoItens + corpoObs).trim() || "—" };
    })
    .filter((s): s is { titulo: string; conteudo: string } => s !== null);

  return {
    identificacao: {
      nomeAluno: student?.name || "",
      idade: student?.age || "",
      turma: student?.turma || "",
      anoReferencia: student?.anoEscolar || "",
      diagnosticoCid: [student?.diag, student?.cid].filter(Boolean).join(" · "),
      dataPreenchimento: new Date().toISOString().slice(0, 10),
    },
    secoesCustom,
  };
}

const ANAMNESE_EIXOS: Array<{ l: string; items: Array<{ d: string; s: AnamStatus }> }> = [
  { l: "Ano de Referência", items: [
    { d: "Reconhece o ano/etapa em que está matriculado", s: "naoObservado" },
    { d: "Identifica a turma e a professora regente", s: "naoObservado" },
  ]},
  { l: "Desempenho Acadêmico", items: [
    { d: "Leitura de palavras com sílabas simples (CV)", s: "naoObservado" },
    { d: "Resolução de adição até 20 com material concreto", s: "naoObservado" },
    { d: "Escrita do próprio nome", s: "naoObservado" },
    { d: "Cópia de frases curtas do quadro", s: "naoObservado" },
  ]},
  { l: "Aspectos Pedagógicos", items: [
    { d: "Permanece na atividade por 15 min com mediação", s: "naoObservado" },
    { d: "Aceita apoio visual (pictogramas, fichas)", s: "naoObservado" },
    { d: "Tolera mudanças na rotina avisadas previamente", s: "naoObservado" },
  ]},
  { l: "Psicomotores", items: [
    { d: "Coordenação motora ampla (correr, pular, equilíbrio)", s: "naoObservado" },
    { d: "Coordenação motora fina (preensão do lápis, recorte)", s: "naoObservado" },
    { d: "Lateralidade definida", s: "naoObservado" },
  ]},
  { l: "Interações Sociais", items: [
    { d: "Inicia contato com colegas em duplas", s: "naoObservado" },
    { d: "Participa de brincadeiras coletivas com mediação", s: "naoObservado" },
    { d: "Respeita turnos em jogos simples", s: "naoObservado" },
  ]},
  { l: "Independência", items: [
    { d: "Vai ao banheiro sem auxílio", s: "naoObservado" },
    { d: "Organiza o próprio material escolar", s: "naoObservado" },
    { d: "Lancha sozinho", s: "naoObservado" },
  ]},
  { l: "Autonomia", items: [
    { d: "Pede ajuda quando precisa", s: "naoObservado" },
    { d: "Toma decisões simples (escolher atividade)", s: "naoObservado" },
    { d: "Identifica e nomeia próprias dificuldades", s: "naoObservado" },
  ]},
  { l: "Emoção", items: [
    { d: "Reconhece emoções básicas em si", s: "naoObservado" },
    { d: "Solicita pausa ao perceber sobrecarga", s: "naoObservado" },
    { d: "Aceita estratégias de autorregulação (respiração, fone)", s: "naoObservado" },
  ]},
  { l: "Memória", items: [
    { d: "Recupera informações de aulas anteriores com pistas", s: "naoObservado" },
    { d: "Memoriza rotinas visuais", s: "naoObservado" },
    { d: "Lembra combinados da turma", s: "naoObservado" },
  ]},
  { l: "Dificuldades & Potencialidades", items: [
    { d: "Dificuldade: leitura coletiva em voz alta", s: "naoObservado" },
    { d: "Potencialidade: raciocínio lógico-matemático concreto", s: "naoObservado" },
    { d: "Potencialidade: memória visual", s: "naoObservado" },
  ]},
  { l: "Estratégias", items: [
    { d: "Material concreto em Matemática", s: "naoObservado" },
    { d: "Apoio visual (pictogramas) em Português", s: "naoObservado" },
    { d: "Mediação de pares em atividades em dupla", s: "naoObservado" },
  ]},
  { l: "Recursos", items: [
    { d: "Fones abafadores disponíveis em sala", s: "naoObservado" },
    { d: "Canto da calma estruturado", s: "naoObservado" },
    { d: "Sala AEE 2x/semana", s: "naoObservado" },
    { d: "Software de comunicação alternativa", s: "naoObservado" },
  ]},
  { l: "Contexto Familiar", items: [
    { d: "Família participa de reuniões bimestrais", s: "naoObservado" },
    { d: "O responsável acompanha tarefas em casa", s: "naoObservado" },
    { d: "Comunicação família-escola via agenda diária", s: "naoObservado" },
  ]},
  { l: "Observações", items: [
    { d: "Observações abertas da equipe pedagógica", s: "naoObservado" },
    { d: "Observações abertas da família", s: "naoObservado" },
  ]},
];

/**
 * Versão da Anamnese específica para Educação Infantil (0 a 5 anos).
 * Os eixos foram redesenhados em torno dos campos de experiência da BNCC,
 * dos cuidados da rotina e dos marcos do desenvolvimento típicos da etapa.
 */
const ANAMNESE_EIXOS_EI: Array<{ l: string; items: Array<{ d: string; s: AnamStatus }> }> = [
  { l: "Ano de Referência", items: [
    { d: "Reconhece a sala, a professora e os adultos da rotina", s: "naoObservado" },
    { d: "Adapta-se à rotina da turma (entrada, roda, parque, saída)", s: "naoObservado" },
  ]},
  { l: "O eu, o outro e o nós", items: [
    { d: "Reconhece o próprio nome quando chamado(a)", s: "naoObservado" },
    { d: "Brinca lado a lado com colegas", s: "naoObservado" },
    { d: "Aceita o toque afetuoso dos adultos de referência", s: "naoObservado" },
    { d: "Participa de pequenas combinações da turma", s: "naoObservado" },
  ]},
  { l: "Corpo, gestos e movimentos", items: [
    { d: "Sustenta o equilíbrio em pé e ao andar", s: "naoObservado" },
    { d: "Sobe e desce degraus baixos com apoio", s: "naoObservado" },
    { d: "Realiza rabiscos circulares e lineares", s: "naoObservado" },
    { d: "Manuseia objetos pequenos com pinça funcional", s: "naoObservado" },
  ]},
  { l: "Traços, sons, cores e formas", items: [
    { d: "Explora diferentes materiais (tinta, massinha, areia)", s: "naoObservado" },
    { d: "Reage a estímulos sonoros e musicais", s: "naoObservado" },
    { d: "Nomeia cores primárias em situações lúdicas", s: "naoObservado" },
    { d: "Participa de brincadeiras de imitação e faz de conta", s: "naoObservado" },
  ]},
  { l: "Escuta, fala, pensamento e imaginação", items: [
    { d: "Atende ao próprio nome e segue comando simples", s: "naoObservado" },
    { d: "Usa palavras, gestos ou CAA para se comunicar", s: "naoObservado" },
    { d: "Aponta para o que deseja em vez de chorar/gritar", s: "naoObservado" },
    { d: "Demonstra interesse por histórias e livros de imagens", s: "naoObservado" },
  ]},
  { l: "Espaços, tempos, quantidades e relações", items: [
    { d: "Reconhece pertences próprios na sala", s: "naoObservado" },
    { d: "Encaixa peças de quebra-cabeças de 4 a 8 peças", s: "naoObservado" },
    { d: "Organiza objetos por cor, tamanho ou forma com apoio", s: "naoObservado" },
    { d: "Compreende noções de antes/depois na rotina visual", s: "naoObservado" },
  ]},
  { l: "Autonomia e cuidados de si", items: [
    { d: "Alimenta-se sozinho(a) com colher (com mínima ajuda)", s: "naoObservado" },
    { d: "Comunica a necessidade de ir ao banheiro (gesto/fala/CAA)", s: "naoObservado" },
    { d: "Lava as mãos seguindo a sequência da rotina", s: "naoObservado" },
    { d: "Calça e descalça sapatos com velcro de forma autônoma", s: "naoObservado" },
  ]},
  { l: "Emoção e autorregulação", items: [
    { d: "Reconhece emoções básicas em figuras ou no espelho", s: "naoObservado" },
    { d: "Procura adulto de referência em situações de desconforto", s: "naoObservado" },
    { d: "Aceita estratégias de acolhimento (colo, canto calmo, música)", s: "naoObservado" },
    { d: "Despede-se do responsável na entrada sem crise prolongada", s: "naoObservado" },
  ]},
  { l: "Memória e atenção", items: [
    { d: "Permanece em atividade dirigida por pelo menos 5–10 minutos", s: "naoObservado" },
    { d: "Imita sequências curtas de gestos ou sons", s: "naoObservado" },
    { d: "Lembra de combinados simples ao longo do dia", s: "naoObservado" },
  ]},
  { l: "Dificuldades & Potencialidades", items: [
    { d: "Dificuldade: transições entre atividades sem aviso prévio", s: "naoObservado" },
    { d: "Potencialidade: curiosidade ativa em brincadeiras sensoriais", s: "naoObservado" },
    { d: "Potencialidade: vínculo afetivo com adulto de referência", s: "naoObservado" },
  ]},
  { l: "Estratégias", items: [
    { d: "Rotina visual fixa com pictogramas em todos os momentos", s: "naoObservado" },
    { d: "Antecipação de transições com música ou objeto de referência", s: "naoObservado" },
    { d: "Mediação afetiva e modelagem do adulto em brincadeiras", s: "naoObservado" },
  ]},
  { l: "Recursos", items: [
    { d: "Cantinho calmo com almofadas e materiais sensoriais", s: "naoObservado" },
    { d: "Pranchas de CAA com vocabulário da rotina", s: "naoObservado" },
    { d: "Brinquedos adaptados (encaixe grande, livros táteis)", s: "naoObservado" },
    { d: "Acompanhamento de AEE ou estimulação precoce", s: "naoObservado" },
  ]},
  { l: "Contexto Familiar", items: [
    { d: "Família mantém rotina previsível em casa", s: "naoObservado" },
    { d: "Comunicação diária via agenda ou aplicativo", s: "naoObservado" },
    { d: "Família participa de atendimentos externos quando indicados", s: "naoObservado" },
  ]},
  { l: "Observações", items: [
    { d: "Observações abertas da equipe pedagógica", s: "naoObservado" },
    { d: "Observações abertas da família", s: "naoObservado" },
  ]},
];

const ANAM_SUGESTOES: Record<string, string[]> = {
  "Ano de Referência": [
    "Há defasagem de 1 ano entre idade e ano cursado.",
    "Vivenciou retenção anterior — orientação é manter a turma atual.",
    "Adaptação ao novo ano ocorreu sem resistência significativa.",
  ],
  "Desempenho Acadêmico": [
    "Avanços são mais consistentes em atividades individuais do que coletivas.",
    "Demonstra maior facilidade em tarefas concretas e visuais.",
    "Necessita de tempo estendido para concluir avaliações.",
    "Produz melhor quando há modelo escrito disponível para consulta.",
  ],
  "Aspectos Pedagógicos": [
    "Engajamento aumenta quando a atividade é dividida em etapas curtas.",
    "Reage melhor a comandos diretos e objetivos, um de cada vez.",
    "Demonstra interesse por temas ligados a [completar com interesse específico].",
  ],
  "Psicomotores": [
    "Apresenta cansaço motor após períodos longos de escrita.",
    "Necessita de adaptação de pegador no lápis ou tesoura.",
    "Equilíbrio e postura sentada exigem reposicionamento frequente.",
  ],
  "Interações Sociais": [
    "Apresenta vínculo mais forte com 1 ou 2 colegas específicos.",
    "Em conflitos, tende a se retrair em vez de verbalizar.",
    "Aceita melhor a aproximação de pares quando proposta por adulto.",
  ],
  "Independência": [
    "Realiza a rotina de higiene com supervisão à distância.",
    "Esquece itens pessoais com frequência ao final do turno.",
    "Tem preferências alimentares marcadas que impactam o lanche.",
  ],
  "Autonomia": [
    "Recorre ao adulto antes de tentar resolver sozinho.",
    "Aceita escolhas dirigidas (entre 2 opções) com mais segurança.",
    "Tem dificuldade em verbalizar do que precisa, mas aponta ou mostra.",
  ],
  "Emoção": [
    "Frustração aparece principalmente diante de erros em público.",
    "Sinais de sobrecarga: cobrir ouvidos, isolar-se, recusar atividade.",
    "Responde bem ao acolhimento individual antes de retornar à tarefa.",
  ],
  "Memória": [
    "Retém melhor conteúdos associados a imagens ou músicas.",
    "Dificuldade em recuperar instruções verbais longas.",
    "Necessita revisão frequente de conteúdos da semana anterior.",
  ],
  "Dificuldades & Potencialidades": [
    "Habilidade marcante em [arte/música/montagem/tecnologia] — usar como ponte.",
    "Maior barreira hoje é a sustentação da atenção em tarefas longas.",
    "Demonstra interesse por temas específicos que podem servir de gancho pedagógico.",
  ],
  "Estratégias": [
    "Antecipar a rotina do dia com cronograma visual no início da aula.",
    "Combinar sinal não-verbal para pedir pausa sem expor o aluno.",
    "Reduzir a quantidade de itens por folha mantendo o objetivo.",
  ],
  "Recursos": [
    "Faz uso de relatório de terapia (fono/TO/psicologia) — anexar quando possível.",
    "Material adaptado é confeccionado pela professora de apoio.",
    "Família dispõe de equipamento de tecnologia assistiva em casa.",
  ],
  "Contexto Familiar": [
    "Mudanças recentes na rotina familiar podem impactar o comportamento.",
    "Responsável demonstra abertura para orientações da escola.",
    "Há outro profissional (terapeuta/médico) acompanhando fora da escola.",
  ],
  "Observações": [
    "Evolução percebida principalmente em [área específica] neste período.",
    "Ponto que merece reavaliação no próximo bimestre.",
    "Encaminhamento sugerido à equipe multidisciplinar para alinhamento.",
  ],
};

const ANAM_SUGESTOES_EI: Record<string, string[]> = {
  "Ano de Referência": [
    "Em processo de adaptação à rotina escolar.",
    "Já reconhece adultos de referência e o espaço da sala.",
    "Necessita de objeto de transição na chegada.",
  ],
  "O eu, o outro e o nós": [
    "Brinca preferencialmente sozinho(a), com aproximações pontuais.",
    "Apresenta vínculo seguro com 1 ou 2 adultos da equipe.",
    "Aceita melhor o contato com pares quando mediado por adulto.",
  ],
  "Corpo, gestos e movimentos": [
    "Cansaço motor rápido em atividades de coordenação fina.",
    "Prefere brincadeiras corporais amplas (correr, pular, rodar).",
    "Necessita de adaptação na pegada de lápis e tesoura.",
  ],
  "Traços, sons, cores e formas": [
    "Demonstra forte interesse por música e movimento.",
    "Hipersensibilidade a alguns sons (sinos, gritos).",
    "Engaja-se bem com materiais sensoriais (tinta, massinha, areia).",
  ],
  "Escuta, fala, pensamento e imaginação": [
    "Comunicação predominantemente por gestos e apontar.",
    "Vocabulário expressivo restrito a 5–10 palavras funcionais.",
    "Compreende ordens simples acompanhadas de gesto.",
  ],
  "Espaços, tempos, quantidades e relações": [
    "Organiza objetos por cor com apoio do adulto.",
    "Necessita rotina visual para compreender a sequência do dia.",
    "Demonstra interesse por encaixes e empilhamento.",
  ],
  "Autonomia e cuidados de si": [
    "Em desfralde — comunica a necessidade por gesto.",
    "Alimenta-se sozinho(a) com pequena supervisão.",
    "Necessita auxílio para vestir-se e calçar-se.",
  ],
  "Emoção e autorregulação": [
    "Crises de choro em transições não antecipadas.",
    "Procura cantinho calmo quando sobrecarregado(a).",
    "Responde bem ao colo e ao acolhimento individual.",
  ],
  "Memória e atenção": [
    "Lembra de cantigas e rotinas musicais com facilidade.",
    "Atenção sustentada por períodos curtos (5–10 min).",
    "Necessita revisão diária dos combinados.",
  ],
  "Dificuldades & Potencialidades": [
    "Maior barreira: comunicação verbal expressiva.",
    "Potencialidade marcante em [música/encaixes/movimento].",
    "Demonstra interesse por animais/personagens específicos — usar como ponte.",
  ],
  "Estratégias": [
    "Antecipar transições com música, objeto ou pictograma.",
    "Reduzir o tempo de exposição a atividades dirigidas.",
    "Combinar sinal não-verbal para pedir pausa.",
  ],
  "Recursos": [
    "Família dispõe de prancha CAA simples em casa.",
    "Atendimento de estimulação precoce em andamento.",
    "Necessita de mobiliário adaptado para a faixa etária.",
  ],
  "Contexto Familiar": [
    "Mudanças recentes na rotina familiar afetam o sono.",
    "Responsável demonstra abertura para orientações da escola.",
    "Outros profissionais (fono/TO) acompanham fora da escola.",
  ],
  "Observações": [
    "Evolução percebida principalmente em [campo de experiência] neste período.",
    "Ponto que merece reavaliação no próximo trimestre.",
    "Encaminhamento sugerido à equipe multidisciplinar.",
  ],
};

/** Detecta se a turma/ano informado corresponde à Educação Infantil. */
function isEducacaoInfantilSerie(s?: string | null): boolean {
  const t = (s || "").toLowerCase();
  if (!t) return false;
  return /(infantil|bercário|berçario|berc[aá]rio|maternal|pr[eé]\b|pr[eé]-escola|jardim|g[1-5]\b|creche)/.test(t);
}

export function Inclusao() {
  const user = useUser();
  const search = useSearch({ from: "/inclusao" }) as { tab?: TabKey; view?: ViewKey; aluno?: string };
  const navigate = useNavigate({ from: "/inclusao" });
  const {
    students: allStudents,
    create: createStudent,
    update: updateStudent,
    loading: studentsLoading,
  } = useInclusaoStudents();
  const { isAtivo: municipalAtivo, curriculo: curriculoMunicipalDados } = useCurriculoMunicipal();
  const creditosGate = useCreditosGate();
  // Filtro PCD: a página de Inclusão só lista alunos PCD.
  // Considera PCD quando o campo `pcd` está preenchido e diferente de "nao",
  // OU quando há CID cadastrado (cadastro feito pela própria Inclusão).
  const students = useMemo(
    () =>
      allStudents.filter((s) => {
        // Exclui apenas quem foi explicitamente marcado como "não PCD".
        // Todos os demais registros em alunos_inclusao são PCD por definição —
        // a tabela é exclusiva para inclusão. Garante que alunos cadastrados
        // sem CID (ex.: diagnóstico informado só pelo nome) também apareçam.
        const pcdFlag = (s.pcd ?? "").toString().trim().toLowerCase();
        if (pcdFlag === "nao") return false;
        const hasCid = (s.cid ?? "").trim() !== "" && (s.cid ?? "").trim() !== "CID não informado";
        const hasCids = Array.isArray(s.cids) && s.cids.length > 0;
        const hasDiag = (s.diag ?? "").trim() !== "" && (s.diag ?? "").trim() !== "Não informado";
        const hasPcdFlag = pcdFlag !== "";
        return hasCid || hasCids || hasDiag || hasPcdFlag || true;
      }),
    [allStudents],
  );
  // Observação: o "espelho" dash_students no Dashboard NÃO é sincronizado
  // automaticamente para o banco — para evitar criar alunos sem ação
  // explícita do(a) professor(a). O cadastro em Inclusão é a fonte oficial.
  const [view, setView] = useState<ViewKey>(students.length === 0 ? "list" : (search.view || "list"));
  const [selectedId, setSelectedId] = useState<string | null>(search.aluno || null);
  const [nsName, setNsName] = useState("");
  const [nsTurma, setNsTurma] = useState("");
  const [nsAnoEscolar, setNsAnoEscolar] = useState("");
  const [nsCids, setNsCids] = useState<string[]>([]);
  const [nsCidPick, setNsCidPick] = useState<string>("nao_informado");
  const [nsAeeDays, setNsAeeDays] = useState<string>("");
  const [nsMediadora, setNsMediadora] = useState<string>("");
  const [tab, setTab] = useState<TabKey>(search.tab || "hoje");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [adaptOpen, setAdaptOpen] = useState(false);
  const [periodoOpen, setPeriodoOpen] = useState(false);
  const sofia = useSofia();
  const sofiaCtx = useSofiaContext();
  const [peiOpen, setPeiOpen] = useState(false);
  const [anamPrintOpen, setAnamPrintOpen] = useState(false);
  const [anamPrintMode, setAnamPrintMode] = useState<"completo" | "preenchido">("completo");
  const [sugOpenFor, setSugOpenFor] = useState<string | null>(null);
  const [newStudentOpen, setNewStudentOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  const abrirEditarAluno = (s: typeof allStudents[number]) => {
    setEditingStudentId(s.id);
    setNsName(s.name || "");
    setNsTurma(s.turma && s.turma !== "Sem turma" ? s.turma : "");
    setNsAnoEscolar(s.anoEscolar || "");
    // Reconstroi nsCids: prioriza o array dedicado `cids`; cai para
    // o parsing do texto legado "CID F84.0, F71" se vazio.
    let codes: string[] = Array.isArray(s.cids) ? s.cids.filter(Boolean) : [];
    if (codes.length === 0) {
      const cidStr = (s.cid || "").replace(/^CID\s*/i, "").trim();
      codes = cidStr && cidStr.toLowerCase() !== "não informado" && cidStr !== "—"
        ? cidStr.split(/[,;]/).map((c) => c.trim()).filter(Boolean)
        : [];
    }
    const matched = codes
      .map((code) => CID_OPTIONS.find((o) => o.cid === code)?.value)
      .filter((v): v is string => Boolean(v));
    setNsCids(matched);
    setNsCidPick("nao_informado");
    // Reconstroi AEE e mediadora a partir de "AEE 2x/sem · Mediadora: Maria"
    const aeeStr = s.aee || "";
    const days = aeeStr.match(/AEE\s*(\d)x\/sem/i)?.[1] || "";
    const med = aeeStr.match(/Mediadora:\s*(.+?)$/i)?.[1]?.trim() || "";
    setNsAeeDays(days);
    setNsMediadora(med);
    setNewStudentOpen(true);
  };

  const fecharModalAluno = () => {
    setNewStudentOpen(false);
    setEditingStudentId(null);
    setNsName(""); setNsTurma(""); setNsAnoEscolar("");
    setNsCids([]); setNsCidPick("nao_informado");
    setNsAeeDays(""); setNsMediadora("");
  };

  // Foco automático no primeiro campo + Esc para fechar o modal de cadastrar aluno
  useEffect(() => {
    if (!newStudentOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") fecharModalAluno(); };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>('.inc-modal-overlay.open .inc-modal input:not([type="hidden"]), .inc-modal-overlay.open .inc-modal select, .inc-modal-overlay.open .inc-modal textarea');
      el?.focus();
    }, 60);
    return () => { window.removeEventListener("keydown", onKey); window.clearTimeout(t); };
  }, [newStudentOpen]);
  const [savingStudent, setSavingStudent] = useState(false);
  const [query, setQuery] = useState("");
  const [turmaFilter, setTurmaFilter] = useState<string[]>([]);
  const [diagFilter, setDiagFilter] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState<null | "turma" | "diag">(null);
  const [planYearFilter, setPlanYearFilter] = useState<string>("");
  type RegCat = "ped" | "com" | "sen" | "fam";
  type RegItem = { id: string; when: string; who: string; cat: RegCat; body: string };
  const [regByStudent, setRegByStudent] = usePersistentState<Record<string, RegItem[]>>("inc_reg", {});
  const [regFilter, setRegFilter] = useState<"todos" | RegCat>("todos");
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [nrBodies, setNrBodies] = useState<Record<RegCat, string>>({ ped: "", com: "", sen: "", fam: "" });
  const REG_CAT_LABEL: Record<RegCat, string> = { ped: "Pedagógico", com: "Comportamental", sen: "Sensorial", fam: "Família" };
  const REG_QUICK: Record<RegCat, string[]> = {
    ped: [
      "Demonstrou progresso na atividade proposta.",
      "Necessitou de apoio individualizado.",
      "Concluiu a tarefa com adaptação visual.",
      "Apresentou dificuldade na compreensão da consigna.",
    ],
    com: [
      "Manteve postura colaborativa com os colegas.",
      "Apresentou episódio de desregulação emocional.",
      "Recusou-se a iniciar a atividade.",
      "Respondeu bem ao redirecionamento positivo.",
    ],
    sen: [
      "Reagiu a estímulos sonoros do ambiente.",
      "Buscou recurso sensorial (fone/abafador).",
      "Apresentou desconforto com texturas.",
      "Necessitou de pausa sensorial durante a aula.",
    ],
    fam: [
      "Família relatou boa rotina de sono na semana.",
      "Comunicado enviado sobre evolução pedagógica.",
      "Reunião agendada com responsáveis.",
      "Família solicitou orientações sobre rotina em casa.",
    ],
  };
  const toggleQuick = (cat: RegCat, s: string) => {
    setNrBodies((prev) => {
      const cur = prev[cat] || "";
      // split por ". " mantendo conteúdo livre digitado
      const parts = cur.split(/\.\s+/).map((p) => p.replace(/\.$/, "").trim()).filter(Boolean);
      const has = parts.includes(s.replace(/\.$/, "").trim());
      const next = has
        ? parts.filter((p) => p !== s.replace(/\.$/, "").trim())
        : [...parts, s.replace(/\.$/, "").trim()];
      return { ...prev, [cat]: next.length ? next.join(". ") + "." : "" };
    });
  };
  const handleSaveReg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentKey || studentKey === "_none") return;
    const cats = (["ped", "com", "sen", "fam"] as RegCat[]).filter((c) => (nrBodies[c] || "").trim());
    if (cats.length === 0) return;
    const now = new Date();
    const when = now.toLocaleDateString("pt-BR") + " · " + now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const items: RegItem[] = cats.map((c, i) => ({ id: `r_${Date.now()}_${i}`, when, who: "Você", cat: c, body: nrBodies[c].trim() }));
    setRegByStudent((all) => ({ ...all, [studentKey]: [...items, ...(all[studentKey] || [])] }));
    setNrBodies({ ped: "", com: "", sen: "", fam: "" });
    setRegModalOpen(false);
  };
  const [anamOpen, setAnamOpen] = useState<Record<string, boolean>>({});
  const studentKey = selectedId || "_none";
  const selected = students.find((s) => s.id === selectedId) ?? null;
  const studentRegs = regByStudent[studentKey] || [];
  const selectedForAnam = students.find((s) => s.id === selectedId);
  // Tempo economizado neste aluno (escopo Inclusão): soma ações com o nome do
  // aluno no `motivo`. Esses minutos já fazem parte do contador global
  // "Tempo devolvido a você" do Painel.
  const { minutos: tempoAlunoMin } = useTempoEconomizado(
    selected?.name
      ? {
          acoes: ["anamnese_baixa", "anamnese_alta", "pei_aluno", "planejamento_inclusao", "registro", "relatorio_pcd"],
          motivoContains: selected.name,
        }
      : undefined,
  );
  const isEISelected = isEducacaoInfantilSerie(selectedForAnam?.anoEscolar);
  const buildBlankAnam = () => {
    const base = isEISelected ? ANAMNESE_EIXOS_EI : ANAMNESE_EIXOS;
    return base.map((e) => ({ l: e.l, items: e.items.map((i) => ({ ...i })), obs: "" }));
  };
  const [anamByStudent, setAnamByStudent] = usePersistentState<Record<string, ReturnType<typeof buildBlankAnam>>>("inc_anam", {});
  const anamData = anamByStudent[studentKey] || buildBlankAnam();
  // Observação geral da anamnese (texto livre por aluno) — usada pela Sofia ao montar pareceres/relatórios.
  const [anamObsGeralByStudent, setAnamObsGeralByStudent] = usePersistentState<Record<string, string>>("inc_anam_obs_geral", {});
  const anamObsGeral = anamObsGeralByStudent[studentKey] || "";
  const setAnamObsGeral = (txt: string) => {
    if (!studentKey || studentKey === "_none") return;
    setAnamObsGeralByStudent((all) => ({ ...all, [studentKey]: txt }));
  };
  // Atualiza o "Ano de referência pedagógico" do aluno selecionado.
  // Persistido na coluna `ano_referencia_pedagogico` (e replicado em `data`).
  const setAnoReferenciaPedagogico = async (value: string) => {
    if (!selected) return;
    const novo = value || undefined;
    try {
      await updateStudent(selected.id, { anoReferenciaPedagogico: novo });
      toast.success(
        novo
          ? `Ano de referência: ${novo}`
          : "Ano de referência removido",
      );
    } catch (e) {
      toast.error(
        "Não foi possível salvar o ano de referência. " +
        (e instanceof Error ? e.message : ""),
      );
    }
  };
  // PEI persistido pelo PEIFormModal — mesmo storage key
  const [peiByStudent, setPeiByStudent] = usePersistentState<Record<string, Record<string, unknown>>>("inc_pei", {});
  const [objetivosModalOpen, setObjetivosModalOpen] = useState(false);
  const [previewParecerOpen, setPreviewParecerOpen] = useState(false);
  const [editandoParecer, setEditandoParecer] = useState(false);
  const [parecerDraft, setParecerDraft] = useState<Parecer | null>(null);

  const startEditParecer = () => {
    if (!parecerAtual) return;
    setParecerDraft({ ...parecerAtual });
    setEditandoParecer(true);
  };
  const cancelEditParecer = () => {
    setParecerDraft(null);
    setEditandoParecer(false);
  };
  const saveEditParecer = () => {
    if (!selected || !parecerDraft) return;
    setParecerByStudent((all) => ({ ...all, [selected.id]: { ...parecerDraft } }));
    setEditandoParecer(false);
    setParecerDraft(null);
    toast.success("Parecer salvo.");
  };

  const exportarParecerWord = () => {
    if (!parecerAtual || !selected) return;
    const esc = (s: string) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
    const ul = (arr?: string[]) => arr && arr.length ? `<ul>${arr.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>` : "";
    const textoFallback = parecerAtual.texto || [
      parecerAtual.resumo,
      parecerAtual.pedagogico,
      parecerAtual.comportamental,
      parecerAtual.sensorial,
      parecerAtual.familia,
      parecerAtual.comunicacao_familias,
    ].filter(Boolean).join("\n\n");
    const corpo = parecerAtual.formato === "texto" && textoFallback
      ? `<div>${esc(textoFallback).split(/\n+/).map((p) => `<p style="text-align:justify;margin:0 0 10pt;">${p}</p>`).join("")}</div>`
      : `
        ${parecerAtual.resumo ? `<p><b>Resumo:</b> ${esc(parecerAtual.resumo)}</p>` : ""}
        ${parecerAtual.pedagogico ? `<h3>Pedagógico</h3><p>${esc(parecerAtual.pedagogico)}</p>` : ""}
        ${parecerAtual.comportamental ? `<h3>Comportamental</h3><p>${esc(parecerAtual.comportamental)}</p>` : ""}
        ${parecerAtual.sensorial ? `<h3>Sensorial</h3><p>${esc(parecerAtual.sensorial)}</p>` : ""}
        ${parecerAtual.familia ? `<h3>Família</h3><p>${esc(parecerAtual.familia)}</p>` : ""}
        ${parecerAtual.avancos?.length ? `<h3>Avanços</h3>${ul(parecerAtual.avancos)}` : ""}
        ${parecerAtual.desafios?.length ? `<h3>Desafios</h3>${ul(parecerAtual.desafios)}` : ""}
        ${parecerAtual.encaminhamentos?.length ? `<h3>Encaminhamentos</h3>${ul(parecerAtual.encaminhamentos)}` : ""}
        ${parecerAtual.comunicacao_familias ? `<h3>Comunicação à família</h3><p>${esc(parecerAtual.comunicacao_familias)}</p>` : ""}
      `;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"/><title>Parecer · ${esc(selected.name)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
  @page WordSection1 { size: A4; mso-page-orientation: portrait; margin: 2cm; mso-border-surround-header: 1pt solid #000; mso-border-surround-footer: 1pt solid #000; }
  div.WordSection1 { page: WordSection1; border:1px solid #000; padding:6mm; }
  body, p, li, td, h1, h2, h3, h4 { font-family: Arial, sans-serif !important; line-height:1.5 !important; }
  body { color:#0F1B36; font-size:12pt; }
  h1 { font-size:16pt; margin:0 0 6pt; border-bottom:2px solid #FF7A45; padding-bottom:4pt; page-break-after:avoid; }
  h3 { font-size:12pt; margin:12pt 0 4pt; color:#FF7A45; text-transform:uppercase; page-break-after:avoid; }
  .meta { font-size:11pt; color:#6B7691; margin-bottom:10pt; }
  ul, p, table { page-break-inside:avoid; }
  ul { margin:4pt 0 0 18pt; }
  .legal { margin-top:16pt; font-size:10pt; color:#6B7691; border-top:1px dashed #ccc; padding-top:6pt; }
  table.sig { width:100%; margin-top:24pt; }
  table.sig td { border-top:1px solid #333; padding-top:4pt; font-size:11pt; text-align:center; width:50%; }
</style></head>
<body><div class="WordSection1">
<h1>${esc(parecerAtual.titulo || "Parecer descritivo")}</h1>
<div class="meta">
  <b>Aluno(a):</b> ${esc(selected.name)} · ${esc(selected.anoEscolar || "")} · ${esc(selected.turma || "")}<br/>
  <b>Diagnóstico:</b> ${esc(selected.diag || "—")} ${selected.cid ? "· " + esc(selected.cid) : ""}<br/>
  <b>Período:</b> ${esc(parecerAtual.periodoLabel || "")} · <b>Gerado em:</b> ${esc(parecerAtual.geradoEm || "")}
</div>
${corpo}
<table class="sig"><tr><td>Professor(a) regente</td><td>Coordenação pedagógica</td></tr></table>
<div class="legal">Documento gerado conforme a Lei nº 14.254/2021, Lei nº 13.146/2015 (LBI) e BNCC.</div>
</div></body></html>`;
    const blob = new Blob(["\ufeff", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = selected.name.replace(/[^\p{L}\p{N}_-]+/gu, "_");
    a.href = url;
    a.download = `Parecer_${safeName}_${(parecerAtual.periodoLabel || "").replace(/\s+/g, "_") || "Inclusao"}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const setAnamData = (updater: (prev: ReturnType<typeof buildBlankAnam>) => ReturnType<typeof buildBlankAnam>) => {
    setAnamByStudent((all) => ({ ...all, [studentKey]: updater(all[studentKey] || buildBlankAnam()) }));
  };
  const eixoPct = (items: Array<{ s: AnamStatus }>) => {
    if (!items.length) return 0;
    const sum = items.reduce((a, i) => a + ANAM_STATUS_VALUE[i.s], 0);
    return Math.round(sum / items.length);
  };
  const eixoTone = (p: number, items: Array<{ s: AnamStatus }>): "ok" | "warn" | "muted" => {
    if (items.every((i) => i.s === "naoObservado")) return "muted";
    if (p >= 80) return "ok";
    if (p >= 40) return "warn";
    return "muted";
  };
  const setItemStatus = (eixoIdx: number, itemIdx: number, s: AnamStatus) => {
    setAnamData((prev) => prev.map((e, i) => i !== eixoIdx ? e : ({
      ...e, items: e.items.map((it, j) => j === itemIdx ? { ...it, s } : it)
    })));
  };
  const setEixoObs = (eixoIdx: number, obs: string) => {
    setAnamData((prev) => prev.map((e, i) => i !== eixoIdx ? e : ({ ...e, obs })));
  };
  const appendEixoSugestao = (eixoIdx: number, txt: string) => {
    setAnamData((prev) => prev.map((e, i) => {
      if (i !== eixoIdx) return e;
      const cur = (e.obs || "").trim();
      const next = cur ? cur + (cur.endsWith(".") ? " " : ". ") + txt : txt;
      return { ...e, obs: next };
    }));
  };
  const eixosPreenchidos = useMemo(
    () => anamData.filter((e) => e.items.some((i) => i.s !== "naoObservado") || (e.obs && e.obs.trim())).length,
    [anamData]
  );

  // Detecta se a Anamnese preenchida usa o conjunto de eixos da Educação Infantil
  // (independente do segmento atual do aluno — permite trocar o ano sem perder o
  // contexto rápido / habilidades já calculados).
  const anamUsesEI = useMemo(
    () => anamData.some((e) =>
      e.l === "O eu, o outro e o nós" ||
      e.l === "Autonomia e cuidados de si" ||
      e.l === "Emoção e autorregulação" ||
      e.l === "Escuta, fala, pensamento e imaginação"
    ),
    [anamData],
  );
  // Habilidades · evolução — recalcula automaticamente sempre que muda anamnese ou registros
  const skillsEvolucao = useMemo(() => {
    const POS = ["progresso", "avanço", "avancou", "avançou", "consegui", "conclu", "evolu", "melhor", "interagiu", "participou", "iniciou", "consolidou", "autônom", "autonom", "calmo", "regulou", "respondeu bem", "colabor"];
    const NEG = ["dificuldade", "recusou", "não conseguiu", "nao conseguiu", "agitad", "desregul", "não participou", "nao participou", "frustr", "chorou", "isolou", "regrediu", "abandonou"];
    const regs = regByStudent[studentKey] || [];
    const calc = (label: string, eixoLabel: string, cats: string[]) => {
      const e = anamData.find((x) => x.l === eixoLabel);
      const observed = e ? e.items.some((i) => i.s !== "naoObservado") : false;
      const baseline = e && observed ? eixoPct(e.items) : 0;
      const relevantes = regs.filter((r) => cats.includes(r.cat));
      let pos = 0, neg = 0;
      for (const r of relevantes) {
        const t = (r.body || "").toLowerCase();
        const isNeg = NEG.some((k) => t.includes(k));
        const isPos = POS.some((k) => t.includes(k));
        if (isNeg && !isPos) neg++;
        else pos++; // todo registro relevante conta como evolução positiva por padrão
      }
      const delta = (pos - neg) * 3 + Math.min(relevantes.length, 5); // bônus por engajamento
      const p = Math.max(0, Math.min(100, baseline + delta));
      const c: "" | "warn" | "green" = !observed && relevantes.length === 0 ? "" : p >= 80 ? "green" : p >= 40 ? "" : "warn";
      const trend: "up" | "down" | "flat" = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
      return { l: label, p, c, observed, baseline, delta, trend, pos, neg, count: relevantes.length };
    };
    if (anamUsesEI) {
      return [
        calc("Atenção e permanência", "Memória e atenção", ["ped", "com"]),
        calc("Linguagem e expressão", "Escuta, fala, pensamento e imaginação", ["ped", "com"]),
        calc("Interação com pares", "O eu, o outro e o nós", ["com", "ped"]),
        calc("Autonomia nos cuidados de si", "Autonomia e cuidados de si", ["ped", "com"]),
        calc("Autorregulação emocional", "Emoção e autorregulação", ["com", "sen"]),
      ];
    }
    return [
      calc("Atenção sustentada", "Aspectos Pedagógicos", ["ped", "com"]),
      calc("Leitura / Escrita / Cálculo", "Desempenho Acadêmico", ["ped"]),
      calc("Interação em dupla", "Interações Sociais", ["com", "ped"]),
      calc("Autonomia", "Autonomia", ["ped", "com"]),
      calc("Autorregulação", "Emoção", ["com", "sen"]),
    ];
  }, [anamData, regByStudent, studentKey, anamUsesEI]);

  // Planos adaptados gerados pela Sofia, persistidos por aluno
  const [plansByStudent, setPlansByStudent] = usePersistentState<Record<string, PlanoInclusao[]>>("inc_plans", {});
  const studentPlansRaw = (selectedId && plansByStudent[selectedId]) || [];
  // Ordena por data (mais próxima → mais distante). Sem data vai para o fim.
  const studentPlans = [...studentPlansRaw].sort((a, b) => {
    if (!a.data && !b.data) return 0;
    if (!a.data) return 1;
    if (!b.data) return -1;
    return a.data.localeCompare(b.data);
  });
  const [viewPlanId, setViewPlanId] = useState<string | null>(null);
  // Seleção de aulas por aluno, persistida no storage
  const [agendarSelByStudent, setAgendarSelByStudent] = usePersistentState<Record<string, Record<string, boolean>>>("inc_plan_sel", {});
  const agendarSel = (selectedId && agendarSelByStudent[selectedId]) || {};
  const setAgendarSel = (updater: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => {
    if (!selectedId) return;
    setAgendarSelByStudent((all) => {
      const prev = all[selectedId] || {};
      const next = typeof updater === "function" ? (updater as (p: Record<string, boolean>) => Record<string, boolean>)(prev) : updater;
      return { ...all, [selectedId]: next };
    });
  };
  const [agendando, setAgendando] = useState(false);
  const [agendarPeriodOpen, setAgendarPeriodOpen] = useState(false);
  type PeriodoAg = "dia" | "semana" | "mes" | "bimestre" | "trimestre" | "semestre";
  const [periodoAg, setPeriodoAg] = useState<PeriodoAg>("semana");
  const [planViewMode, setPlanViewMode] = useState<"completo" | "topicos">("completo");
  const viewingPlan = studentPlans.find((p) => p.id === viewPlanId) || null;
  const selecionadosCount = Object.values(agendarSel).filter(Boolean).length;
  const todosSelecionados = studentPlans.length > 0 && studentPlans.every((p) => agendarSel[p.id]);
  const toggleSelTodos = () => {
    if (todosSelecionados) {
      setAgendarSel({});
    } else {
      const next: Record<string, boolean> = {};
      for (const p of studentPlans) next[p.id] = true;
      setAgendarSel(next);
    }
  };

  const updatePlan = (planId: string, patch: Partial<PlanoInclusao>) => {
    if (!selectedId) return;
    setPlansByStudent((all) => ({
      ...all,
      [selectedId]: (all[selectedId] || []).map((p) => (p.id === planId ? { ...p, ...patch } : p)),
    }));
  };

  const nextWeekday = (from: Date): Date => {
    const d = new Date(from);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d;
  };

  // Janela total de dias para cada período (a partir de hoje)
  const PERIODO_DIAS: Record<PeriodoAg, number> = {
    dia: 1, semana: 7, mes: 30, bimestre: 60, trimestre: 90, semestre: 180,
  };
  const PERIODO_LABEL: Record<PeriodoAg, string> = {
    dia: "no mesmo dia", semana: "ao longo da semana", mes: "ao longo do mês",
    bimestre: "ao longo do bimestre", trimestre: "ao longo do trimestre", semestre: "ao longo do semestre",
  };

  // Gera N datas distribuídas em dias úteis dentro da janela do período.
  const gerarDatasDistribuidas = (n: number, periodo: PeriodoAg): string[] => {
    const start = nextWeekday(new Date());
    if (periodo === "dia") {
      const iso = start.toISOString().slice(0, 10);
      return Array(n).fill(iso);
    }
    const totalDias = PERIODO_DIAS[periodo];
    // Lista de dias úteis dentro da janela
    const uteis: Date[] = [];
    for (let i = 0; i < totalDias; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      if (d.getDay() !== 0 && d.getDay() !== 6) uteis.push(d);
    }
    if (uteis.length === 0) return [];
    const resultado: string[] = [];
    if (n <= uteis.length) {
      // espaça uniformemente
      const step = uteis.length / n;
      for (let i = 0; i < n; i++) {
        const idx = Math.min(uteis.length - 1, Math.floor(i * step));
        resultado.push(uteis[idx].toISOString().slice(0, 10));
      }
    } else {
      // mais planos do que dias — ciclo
      for (let i = 0; i < n; i++) resultado.push(uteis[i % uteis.length].toISOString().slice(0, 10));
    }
    return resultado;
  };

  const abrirAgendarPeriodo = () => {
    if (!selectedId) return;
    const ids = Object.keys(agendarSel).filter((k) => agendarSel[k]);
    if (ids.length === 0) {
      toast.error("Selecione ao menos uma atividade para agendar.");
      return;
    }
    setAgendarPeriodOpen(true);
  };

  const imprimirSelecionados = () => {
    if (!selected) return;
    const ids = Object.keys(agendarSel).filter((k) => agendarSel[k]);
    const escolhidos = studentPlans.filter((p) => ids.includes(p.id));
    if (escolhidos.length === 0) {
      toast.error("Selecione ao menos uma atividade para imprimir.");
      return;
    }
    const esc = (s: string) =>
      String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
    const fmtData = (d: string) => (d ? d.split("-").reverse().join("/") : "—");
    const blocos = escolhidos.map((p) => {
      if (planViewMode === "topicos") {
        return `
          <article class="topico">
            <header>
              <span class="data">${esc(fmtData(p.data))}</span>
              <span class="disc">${esc(p.disciplina || "")}</span>
            </header>
            <h2>${esc(p.titulo || "")}</h2>
            ${p.tema ? `<p class="tema"><b>Conteúdo:</b> ${esc(p.tema)}</p>` : ""}
          </article>`;
      }
      return `
        <article class="plano">
          <header>
            <span class="data">${esc(fmtData(p.data))}</span>
            <span class="disc">${esc(p.disciplina || "")} · ${esc(p.duracao || "")}</span>
          </header>
          <h2>${esc(p.titulo || "")}</h2>
          ${p.tema ? `<p><b>Conteúdo:</b> ${esc(p.tema)}</p>` : ""}
          ${p.objetivo ? `<p><b>Objetivo:</b> ${esc(p.objetivo)}</p>` : ""}
          ${p.abertura ? `<p><b>Abertura:</b> ${esc(p.abertura)}</p>` : ""}
          ${p.desenvolvimento ? `<p><b>Desenvolvimento:</b> ${esc(p.desenvolvimento)}</p>` : ""}
          ${p.fechamento ? `<p><b>Fechamento:</b> ${esc(p.fechamento)}</p>` : ""}
          ${p.materiais?.length ? `<p><b>Materiais:</b> ${p.materiais.map(esc).join(", ")}</p>` : ""}
          ${p.metodologia ? `<p><b>Metodologia:</b> ${esc(p.metodologia)}</p>` : ""}
          ${p.avaliacao ? `<p><b>Avaliação:</b> ${esc(p.avaliacao)}</p>` : ""}
          ${p.habilidades?.length ? `<p><b>BNCC:</b> ${p.habilidades.map((h) => esc(h.codigo) + " — " + esc(h.descricao)).join("; ")}</p>` : ""}
          ${p.adaptacoes?.length ? `<p><b>Adaptações:</b> ${p.adaptacoes.map((a) => esc(a.categoria) + ": " + esc(a.texto)).join("; ")}</p>` : ""}
          ${p.observacoes ? `<p><b>Observações:</b> ${esc(p.observacoes)}</p>` : ""}
        </article>`;
    }).join("");
    const extra = `
      h1{font-size:16pt;margin:0 0 4mm;}
      .meta{color:#6B7691;font-size:11pt;margin-bottom:8mm;}
      article{border:1px solid #E4E8F0;border-radius:6px;padding:6mm;margin-bottom:5mm;}
      article.topico{padding:4mm 5mm;}
      article header{display:flex;justify-content:space-between;font-size:11pt;color:#6B7691;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2mm;}
      article .disc{font-weight:700;color:#B8410E;}
      article h2{font-size:13pt;margin:0 0 3mm;}
      article p{margin:1.5mm 0;}
      .toolbar{position:fixed;top:8px;right:8px;}
      .toolbar button{padding:8px 14px;background:#FF7A45;color:#fff;border:0;border-radius:6px;font-weight:600;cursor:pointer;}
    `;
    const inner = `
      <div class="toolbar"><button onclick="window.print()">Imprimir</button></div>
      <h1>Atividades · ${esc(selected.name)}</h1>
      <div class="meta">${esc(selected.anoEscolar || "")} · ${esc(selected.turma || "")} · ${escolhidos.length} atividade(s) · modo ${planViewMode === "topicos" ? "tópicos" : "completo"}</div>
      ${blocos}
      <script>setTimeout(function(){ window.print(); }, 400);</script>
    `;
    const html = wrapStandardPrintHtml(`Atividades · ${esc(selected.name)}`, inner, {
      extraCss: extra,
      professorNome: user.name,
      docType: "plano-adaptado",
    });
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    iframe.contentDocument!.open();
    iframe.contentDocument!.write(html);
    iframe.contentDocument!.close();
    iframe.onload = () => {
      try { iframe.contentWindow!.focus(); iframe.contentWindow!.print(); } catch { /* ignore */ }
      setTimeout(() => { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); }, 1000);
    };
  };

  const agendarPlanos = async () => {
    if (!selectedId || !selected) return;
    const ids = Object.keys(agendarSel).filter((k) => agendarSel[k]);
    const escolhidos = studentPlans.filter((p) => ids.includes(p.id));
    if (escolhidos.length === 0) {
      toast.error("Selecione ao menos uma atividade para agendar.");
      return;
    }
    setAgendando(true);
    try {
      const datas = gerarDatasDistribuidas(escolhidos.length, periodoAg);
      let okCount = 0;
      for (let i = 0; i < escolhidos.length; i++) {
        const p = escolhidos[i];
        const dataEvento = datas[i] || datas[datas.length - 1];
        updatePlan(p.id, { data: dataEvento });
        await createAgendaEvent({
          title: `${p.titulo} · ${selected.name.split(" ")[0]}`,
          date: dataEvento,
          type: "aula",
          notes: `Plano adaptado · ${p.disciplina}${p.tema ? " · " + p.tema : ""}\nObjetivo: ${p.objetivo || "—"}`,
        });
        okCount++;
      }
      toast.success(`Sofia agendou ${okCount} atividade(s) ${PERIODO_LABEL[periodoAg]}.`);
      setAgendarSel({});
      setAgendarPeriodOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao agendar", { description: e instanceof Error ? e.message : "" });
    } finally {
      setAgendando(false);
    }
  };
  const anamneseResumo = useMemo(() => {
    if (!selectedId) return "";
    const data = anamByStudent[selectedId];
    const obsGeral = (anamObsGeralByStudent[selectedId] || "").trim();
    if (!data && !obsGeral) return "";
    const eixosTxt = (data || [])
      .map((e) => {
        const itens = e.items
          .filter((i) => i.s !== "naoObservado")
          .map((i) => `${i.d} (${ANAM_STATUS_LABEL[i.s]})`)
          .join("; ");
        const obs = (e.obs || "").trim();
        if (!itens && !obs) return "";
        return `• ${e.l}: ${itens}${obs ? ` — Obs.: ${obs}` : ""}`;
      })
      .filter(Boolean)
      .join("\n");
    const partes: string[] = [];
    if (eixosTxt) partes.push(eixosTxt);
    if (obsGeral) partes.push(`Observações gerais do(a) professor(a):\n${obsGeral}`);
    return partes.join("\n\n");
  }, [selectedId, anamByStudent, anamObsGeralByStudent]);

  // Parecer descritivo gerado pela Sofia (por aluno)
  type Parecer = {
    titulo?: string; resumo?: string;
    pedagogico?: string; comportamental?: string; sensorial?: string; familia?: string;
    avancos?: string[]; desafios?: string[]; encaminhamentos?: string[];
    comunicacao_familias?: string;
    texto?: string;
    periodoLabel?: string;
    formato?: "topicos" | "texto";
    geradoEm?: string;
    peiReferenciaId?: string;
    peiAtualizadoEm?: string;
    peiConsiderado?: boolean;
  };
  const [parecerByStudent, setParecerByStudent] = usePersistentState<Record<string, Parecer>>("inc_parecer", {});
  const [anamHistByStudent, setAnamHistByStudent] = usePersistentState<Record<string, { resumo: string; data: string }[]>>("inc_anam_hist_v1", {});
  const [m6EntriesGlobal] = usePersistentState<Array<{ id: string; emoji?: string; title?: string; text?: string; tags?: string[]; date?: string; turma?: string; atividadeTitulo?: string }>>("plan_m6_entries", []);
  const [gerandoParecer, setGerandoParecer] = useState(false);
  const parecerAtual = (selectedId && parecerByStudent[selectedId]) || null;

  // Período / formato do relatório IA
  type RelTipo = "bimestre" | "trimestre" | "semestre" | "anual";
  const [relTipo, setRelTipo] = useState<RelTipo>("bimestre");
  // Default: período atual (bimestre vigente) baseado no mês corrente,
  // para que registros recém-criados caiam no intervalo automaticamente.
  const [relNumero, setRelNumero] = useState<number>(() => {
    const m = new Date().getMonth(); // 0-based
    return Math.min(4, Math.floor(m / 3) + 1);
  });
  const [relAno, setRelAno] = useState<number>(new Date().getFullYear());
  const [relFormato, setRelFormato] = useState<"" | "topicos" | "texto">("");

  const relMaxNumero = relTipo === "bimestre" ? 4 : relTipo === "trimestre" ? 3 : relTipo === "semestre" ? 2 : 1;
  // Garante que o número não ultrapassa o máximo do tipo
  useEffect(() => { if (relNumero > relMaxNumero) setRelNumero(1); }, [relTipo, relMaxNumero, relNumero]);

  const relIntervalo = useMemo((): { inicio: Date; fim: Date; label: string } => {
    const ano = relAno;
    if (relTipo === "anual") {
      return { inicio: new Date(ano, 0, 1), fim: new Date(ano, 11, 31, 23, 59, 59), label: `Ano letivo ${ano}` };
    }
    const span = relTipo === "bimestre" ? 3 : relTipo === "trimestre" ? 4 : 6;
    const startMonth = (relNumero - 1) * span;
    const endMonth = Math.min(startMonth + span - 1, 11);
    const tipoLbl = relTipo === "bimestre" ? "Bimestre" : relTipo === "trimestre" ? "Trimestre" : "Semestre";
    return {
      inicio: new Date(ano, startMonth, 1),
      fim: new Date(ano, endMonth + 1, 0, 23, 59, 59),
      label: `${relNumero}º ${tipoLbl} · ${ano}`,
    };
  }, [relTipo, relNumero, relAno]);

  // Parse "DD/MM/YYYY · HH:MM" do registro
  const parseRegDate = (when: string): Date | null => {
    const m = (when || "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!m) return null;
    return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
  };
  const regsDoPeriodo = useMemo(() => {
    if (!selectedId) return [] as RegItem[];
    const all = regByStudent[selectedId] || [];
    return all.filter((r) => {
      const d = parseRegDate(r.when);
      return d ? d >= relIntervalo.inicio && d <= relIntervalo.fim : false;
    });
  }, [selectedId, regByStudent, relIntervalo]);

  const handleGerarParecer = async () => {
    if (!selected) return;
    if (relFormato !== "topicos" && relFormato !== "texto") {
      toast.error("Selecione o formato (texto corrido ou estruturado) antes de gerar.");
      return;
    }
    const okGate = await creditosGate.checar({
      custo: CUSTOS.relatorio_inclusao,
      acao: descricaoDoc("Relatório de inclusão", selected.name),
    });
    if (!okGate) return;
    setGerandoParecer(true);
    try {
      // Usa registros do período; se vazio, faz fallback para TODOS os
      // registros do aluno para garantir que a Sofia tenha contexto real
      // mesmo quando o período padrão não cobre as datas dos registros.
      const todosRegs = regByStudent[selected.id] || [];
      const usarTodos = regsDoPeriodo.length === 0 && todosRegs.length > 0;
      const fonteRegs = usarTodos ? todosRegs : regsDoPeriodo;
      const regs = fonteRegs.map((r) => ({
        when: r.when, cat: r.cat, body: r.body,
      }));
      const intervaloLabel = usarTodos
        ? `${relIntervalo.inicio.toLocaleDateString("pt-BR")} a ${relIntervalo.fim.toLocaleDateString("pt-BR")} (sem registros no período — considerando todos os registros disponíveis do aluno)`
        : `${relIntervalo.inicio.toLocaleDateString("pt-BR")} a ${relIntervalo.fim.toLocaleDateString("pt-BR")}`;
      // Resumo do PEI real do aluno (não dos planos de aula)
      const pei = (peiByStudent[selected.id] || {}) as Partial<PEIData>;
      // Apenas campos preenchidos pelo educador são enviados — campos vazios nunca vão ao prompt da Sofia
      const peiResumo = buildPEIContext(pei);
      const peiAtualizadoEm = typeof pei.atualizadoEm === "string" && pei.atualizadoEm
        ? new Date(pei.atualizadoEm).toLocaleString("pt-BR")
        : "";
      const temPei = Boolean(peiResumo);
      const peiReferenciaId = temPei ? `${selected.id}::${(pei.atualizadoEm as string) || "sem-data"}` : "";
      const m6DoAluno = (m6EntriesGlobal || [])
  .filter((e) => {
    const alunoIds = (e as unknown as { alunoIds?: unknown }).alunoIds;
    if (Array.isArray(alunoIds)) {
      return (alunoIds as string[]).includes(selected.id);
    }
    // fallback para entradas antigas que ainda não têm alunoIds
    const nomeAluno = selected.name.toLowerCase().trim();
    const primeiroNome = nomeAluno.split(" ")[0];
    const txt = `${e.title || ""} ${e.text || ""} ${e.atividadeTitulo || ""}`.toLowerCase();
    return txt.includes(primeiroNome) || txt.includes(nomeAluno);
  })
        .slice(0, 20)
        .map((e) => ({ when: e.date || "—", cat: "diario", body: `${e.emoji || ""} ${e.title || ""}${e.text ? ` — ${e.text}` : ""}${e.tags?.length ? ` [${e.tags.join(", ")}]` : ""}` }));
      const anamSnaps = anamHistByStudent[selected.id] ?? [];
      const anamAnteriorResumo = anamSnaps.length > 0
        ? `Registro anterior (${anamSnaps[anamSnaps.length - 1].data}):\n${anamSnaps[anamSnaps.length - 1].resumo}`
        : "";
      const { data, error } = await supabase.functions.invoke("gerar-parecer-inclusao", {
        body: {
          aluno: selected.name,
          diagnostico: selected.diag || "",
          periodo: relIntervalo.label,
          intervalo: intervaloLabel,
          formato: relFormato,
          anamneseResumo,
          anamAnteriorResumo,
          registros: [...regs, ...m6DoAluno],
          peiResumo,
          peiAtualizadoEm,
          anoEscolar: selected.anoEscolar || "",
          anoReferenciaPedagogico: selected.anoReferenciaPedagogico || "",
          anoReferenciaInstrucao: buildAnoReferenciaPromptBlock(
            selected.anoEscolar,
            selected.anoReferenciaPedagogico,
          ),
        },
      });
      if (error) throw error;
      const parecer: Parecer = {
        ...(data?.parecer || {}),
        periodoLabel: relIntervalo.label,
        formato: relFormato,
        geradoEm: new Date().toLocaleString("pt-BR"),
        peiConsiderado: temPei,
        peiReferenciaId,
        peiAtualizadoEm,
      };
      setParecerByStudent((all) => ({ ...all, [selected.id]: parecer }));
      const partesToast: string[] = ["Parecer gerado"];
      partesToast.push(temPei ? "PEI considerado" : "sem PEI cadastrado");
      partesToast.push(`${regs.length} registro${regs.length === 1 ? "" : "s"}${usarTodos ? " (todos disponíveis)" : ""}`);
      if (anamneseResumo) partesToast.push("anamnese considerada");
      toast.success(partesToast.join(" · "));
      void import("@/lib/admin/track").then(({ trackEvent }) =>
        trackEvent("parecer_inclusao_gerado", {
          formato: relFormato,
          tem_pei: temPei,
          num_registros: regs.length,
          diagnostico: selected.diag || null,
        })
      );
      void consumirCreditos(CUSTOS.relatorio_inclusao, descricaoDoc("Relatório de inclusão", selected?.name));
      void acumularTempo("relatorio_pcd", `Relatório PCD — ${selected?.name ?? ""}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Não foi possível gerar o parecer. ${msg}`);
    } finally {
      setGerandoParecer(false);
    }
  };

  const imprimirParecer = () => {
    if (!parecerAtual || !selected) return;
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    const esc = (s: string) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
    const ul = (arr?: string[]) => arr && arr.length ? `<ul>${arr.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>` : "";
    const textoFallback = parecerAtual.texto || [
      parecerAtual.resumo,
      parecerAtual.pedagogico,
      parecerAtual.comportamental,
      parecerAtual.sensorial,
      parecerAtual.familia,
      parecerAtual.comunicacao_familias,
    ].filter(Boolean).join("\n\n");
    const corpo = parecerAtual.formato === "texto" && textoFallback
      ? `<div class="texto">${esc(textoFallback).split(/\n+/).map((p) => `<p>${p}</p>`).join("")}</div>`
      : `
        ${parecerAtual.resumo ? `<p><b>Resumo:</b> ${esc(parecerAtual.resumo)}</p>` : ""}
        ${parecerAtual.pedagogico ? `<h3>Pedagógico</h3><p>${esc(parecerAtual.pedagogico)}</p>` : ""}
        ${parecerAtual.comportamental ? `<h3>Comportamental</h3><p>${esc(parecerAtual.comportamental)}</p>` : ""}
        ${parecerAtual.sensorial ? `<h3>Sensorial</h3><p>${esc(parecerAtual.sensorial)}</p>` : ""}
        ${parecerAtual.familia ? `<h3>Família</h3><p>${esc(parecerAtual.familia)}</p>` : ""}
        ${parecerAtual.avancos?.length ? `<h3>Avanços</h3>${ul(parecerAtual.avancos)}` : ""}
        ${parecerAtual.desafios?.length ? `<h3>Desafios</h3>${ul(parecerAtual.desafios)}` : ""}
        ${parecerAtual.encaminhamentos?.length ? `<h3>Encaminhamentos</h3>${ul(parecerAtual.encaminhamentos)}` : ""}
        ${parecerAtual.comunicacao_familias ? `<h3>Comunicação à família</h3><p>${esc(parecerAtual.comunicacao_familias)}</p>` : ""}
      `;
    const extra = `
      h1{font-size:16pt;margin:0 0 6pt;border-bottom:2px solid #FF7A45;padding-bottom:4pt;}
      h3{font-size:12pt;margin:12pt 0 4pt;color:#FF7A45;text-transform:uppercase;letter-spacing:.05em;}
      .meta{font-size:11pt;color:#6B7691;margin-bottom:10pt;}
      ul{margin:4pt 0 0 16pt;}
      .texto p{text-align:justify;margin:0 0 8pt;}
      .legal{margin-top:16pt;font-size:10pt;color:#6B7691;border-top:1px dashed #ccc;padding-top:6pt;}
      .sig{margin-top:24pt;display:grid;grid-template-columns:1fr 1fr;gap:24pt;}
      .sig div{border-top:1px solid #333;padding-top:4pt;font-size:11pt;text-align:center;}
      .toolbar{position:fixed;top:8px;right:8px;}
    `;
    const inner = `
      <div class="toolbar"><button onclick="window.print()">Imprimir</button></div>
      <h1>${esc(parecerAtual.titulo || "Parecer descritivo")}</h1>
      <div class="meta">
        <b>Aluno(a):</b> ${esc(selected.name)} · ${esc(selected.anoEscolar || "")} · ${esc(selected.turma || "")}<br/>
        <b>Diagnóstico:</b> ${esc(selected.diag || "—")} ${selected.cid ? "· " + esc(selected.cid) : ""}<br/>
        <b>Período:</b> ${esc(parecerAtual.periodoLabel || "")} · <b>Gerado em:</b> ${esc(parecerAtual.geradoEm || "")}
      </div>
      ${corpo}
      <div class="sig">
        <div>Professor(a) regente</div>
        <div>Coordenação pedagógica</div>
      </div>
      <div class="legal">Documento gerado conforme a Lei nº 14.254/2021, Lei nº 13.146/2015 (LBI) e BNCC.</div>
    `;
    iframe.contentDocument!.open();
    iframe.contentDocument!.write(wrapStandardPrintHtml(`Parecer · ${esc(selected.name)}`, inner, {
      extraCss: extra,
      professorNome: user.name,
      docType: "plano-adaptado",
    }));
    iframe.contentDocument!.close();
    iframe.onload = () => {
      try { iframe.contentWindow!.focus(); iframe.contentWindow!.print(); } catch { /* ignore */ }
      setTimeout(() => { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); }, 1000);
    };
  };

  const goView = (v: ViewKey) => {
    const safe: ViewKey = v === "detail" && students.length === 0 ? "list" : v;
    setView(safe);
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, view: v }) as never, replace: true });
  };
  const openStudent = useCallback((id: string) => {
    setSelectedId(id);
    setView("detail");
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, view: "detail", aluno: id }) as never, replace: true });
  }, [navigate]);
   // Injeta o aluno selecionado no contexto da Sofia para que ela responda
  // de forma contextualizada quando a professora fizer perguntas no chat.
  // setAlunoAtual é estável (setter de useState), então pode ser dependência
  // do efeito sem causar re-execução em loop a cada recálculo do contexto.
  const { setAlunoAtual } = sofiaCtx;
  useEffect(() => {
    if (!selected) {
      setAlunoAtual(null);
      return;
    }
    const anamData = anamByStudent[selected.id] || [];
    const eixosPreenchidos = anamData.filter(
      (e: { items: Array<{ s: string }>; obs: string }) =>
        e.items.some((i) => i.s !== "naoObservado") || (e.obs && e.obs.trim())
    ).length;
    const peiObj = (peiByStudent[selected.id] || {}) as Record<string, unknown>;
    const peiKeys = ["diagnostico", "caracterizacao", "habilidadesDesenvolvidas", "adaptacoesCurriculares", "formasAvaliacao", "familiaParticipacao"];
    const peiPreenchido = peiKeys.filter((k) => String(peiObj[k] || "").trim().length > 5).length;
    const peiStatus = peiPreenchido >= 6 ? "completo" : peiPreenchido > 0 ? "rascunho" : "nao_criado";
    const totalRegs = (regByStudent[selected.id] || []).length;
    setAlunoAtual({
      id: selected.id,
      nome: selected.name,
      primeiro_nome: selected.name.split(" ")[0],
      ano_escolar: selected.anoEscolar || "",
      turma: selected.turma || "",
      cid: selected.cid || null,
      condicao_label: selected.diag || null,
      mediadora: null,
      anamnese_eixos_preenchidos: eixosPreenchidos,
      anamnese_eixos_total: anamData.length || 14,
      pei_status: peiStatus,
      adaptacoes_registradas: totalRegs,
    };
  }, [selected, anamByStudent, peiByStudent, regByStudent, sofiaCtx]);

  /**
   * Garante que TODOS os CIDs do(a) aluno(a) selecionado(a) sejam enviados
   * para a Sofia em qualquer interação, evitando que ela considere apenas
   * o primeiro diagnóstico (ou ignore comorbidades).
   */
  const openSofiaForSelected = useCallback(
    (opts: { prompt: string; context?: string }) => {
      if (!selected) {
        sofia.openSofia(opts);
        return;
      }
      const cidBlock = buildCidsPromptBlock(selected.cids, selected.cid);
      const baseCtx = opts.context ?? "";
      const ctx = cidBlock
        ? (baseCtx ? `${baseCtx}\n\n${cidBlock}` : cidBlock)
        : baseCtx || undefined;
      sofia.openSofia({ prompt: opts.prompt, context: ctx });
    },
    [selected, sofia],
  );

  // ---- Sugestões proativas da Sofia (Tray) ----
  // Dispara apenas uma vez por aluno por sessão para não virar ruído.
  const proactiveSeen = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (view !== "detail" || !selected) return;
    const key = `aluno:${selected.id}`;
    if (proactiveSeen.current.has(key)) return;
    proactiveSeen.current.add(key);
    const firstName = selected.name.split(" ")[0];
    const proxima = sofiaCtx.dataState.proxima_aula;
    const eixosPreench = (anamByStudent[selected.id] || []).filter(
      (e) => e.items.some((i) => i.s !== "naoObservado") || (e.obs && e.obs.trim())
    ).length;
    const totalEixosAnam = (anamByStudent[selected.id] || []).length;
    const anamCompletaPro = totalEixosAnam > 0 && eixosPreench >= totalEixosAnam;
    const peiObj = (peiByStudent[selected.id] || {}) as Record<string, unknown>;
    const peiKeysPro = [
      "diagnostico", "caracterizacao", "habilidadesDesenvolvidas",
      "adaptacoesCurriculares", "formasAvaliacao", "familiaParticipacao",
    ];
    let peiFilledPro = 0;
    peiKeysPro.forEach((k) => { if (String(peiObj[k] || "").trim().length > 5) peiFilledPro++; });
    if (Array.isArray(peiObj.objetivos) && (peiObj.objetivos as unknown[]).length > 0) peiFilledPro++;
    if (Array.isArray(peiObj.equipe) && (peiObj.equipe as unknown[]).length > 0) peiFilledPro++;
    const peiCompletoPro = peiFilledPro >= 8;
    let message: string;
    let actionLabel = `Adaptar para ${firstName}`;
    let actionPrompt = `Adapte uma atividade para ${selected.name}${selected.diag ? ` (${selected.diag})` : ""}.`;
    if (proxima && proxima.minutos_ate <= 180) {
      message = `Tô vendo o perfil do(a) ${firstName}. Próxima aula em ${proxima.minutos_ate}min (${proxima.disciplina}). Adapto agora?`;
      actionPrompt = `Adapte a aula de ${proxima.disciplina} (${proxima.bncc_codigo || "BNCC"}) para ${selected.name}${selected.diag ? ` (${selected.diag})` : ""}. Sugira 3 ajustes práticos com tempo estimado.`;
    } else if (anamCompletaPro && peiCompletoPro) {
      message = `Perfil do(a) ${firstName} está completo (Anamnese e PEI 8/8). Quer que eu gere uma adaptação para a próxima aula?`;
      actionLabel = "Sugerir adaptação";
    } else if (peiCompletoPro && !anamCompletaPro) {
      message = `PEI do(a) ${firstName} está pronto. Falta concluir a Anamnese (${eixosPreench}/${totalEixosAnam}) para refinar as adaptações. Continuamos?`;
      actionLabel = "Continuar Anamnese";
      actionPrompt = `Vamos continuar a Anamnese de ${selected.name} do ponto onde paramos.`;
    } else if (anamCompletaPro && !peiCompletoPro) {
      message = `Anamnese do(a) ${firstName} concluída. Faltam ${8 - peiFilledPro} eixo${8 - peiFilledPro > 1 ? "s" : ""} do PEI — vamos formalizar agora?`;
      actionLabel = "Abrir PEI";
      actionPrompt = `Vamos preencher os eixos restantes do PEI de ${selected.name}.`;
    } else if (eixosPreench >= 4) {
      message = `Já dá pra eu sugerir uma adaptação simples pra próxima aula do(a) ${firstName}. Continuar Anamnese ou gerar adaptação agora?`;
      actionLabel = "Sugerir adaptação";
    } else {
      const cidTxt = selected.cid && selected.cid !== "nao_informado" ? selected.cid : "";
      const condTxt = selected.diag || "perfil singular";
      const med = "apoio AEE/mediadora se houver";
      message = `Tô vendo o perfil do(a) ${firstName}. ${condTxt}${cidTxt ? ` (${cidTxt})` : ""} e ${med} já é boa base. Pra eu sugerir adaptações reais preciso da Anamnese — 8 minutos guiados. Topa?`;
      actionLabel = "Começar Anamnese";
      actionPrompt = `Vamos começar a Anamnese de ${selected.name}, eixo por eixo.`;
    }
    const t = setTimeout(() => {
      sofia.pushProactive({
        message,
        action: { label: actionLabel, prompt: actionPrompt },
      });
    }, 800);
    return () => clearTimeout(t);
  }, [view, selected, sofia, sofiaCtx, anamByStudent, peiByStudent]);

  useEffect(() => {
    if (view !== "list") return;
    const key = "list:inclusao";
    if (proactiveSeen.current.has(key)) return;
    proactiveSeen.current.add(key);
    const t = setTimeout(() => {
      sofia.pushProactive({
        message: "Bem-vindo(a) à Inclusão. Quer que eu te mostre quem precisa de atenção esta semana?",
        action: {
          label: "Ver prioridades da semana",
          prompt: "Quais alunos da Inclusão precisam de atenção esta semana? Liste em ordem de urgência.",
        },
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [view, sofia]);

  const setActiveTab = (t: TabKey) => {
    setTab(t);
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, tab: t }) as never, replace: true });
  };

  const { turmas: turmasCadastradas } = useTurmas();
  const turmasUnicas = Array.from(
    new Set([
      ...turmasCadastradas.map((t) => t.name).filter(Boolean),
      ...students.map((s) => s.turma).filter(Boolean),
    ])
  ).sort();
  const diagsUnicos = Array.from(new Set(students.map((s) => s.diag).filter(Boolean))).sort();
  const filtered = students.filter((s) => {
    if (turmaFilter.length > 0 && !turmaFilter.includes(s.turma)) return false;
    if (diagFilter.length > 0 && !diagFilter.includes(s.diag)) return false;
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.turma.toLowerCase().includes(q) || s.diag.toLowerCase().includes(q);
  });

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingStudent) return;
    const name = nsName.trim();
    if (!name) return;
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
    const turmaNorm = norm(nsTurma.trim() || "Sem turma");
    const dup = allStudents.find(
      (s) => norm(s.name) === norm(name) && norm(s.turma || "Sem turma") === turmaNorm && s.id !== editingStudentId,
    );
    if (dup) {
      toast.error("Já existe um aluno cadastrado com esses dados.");
      return;
    }
    const initials = name.split(/\s+/).map((p) => p[0] || "").join("").slice(0, 2).toUpperCase();
    const cidOpts = nsCids
      .map((v) => CID_OPTIONS.find((o) => o.value === v))
      .filter((o): o is (typeof CID_OPTIONS)[number] => !!o && o.value !== "nao_informado");
    const diagLabel = cidOpts.length > 0
      ? cidOpts.map((o) => o.label.split(" — ")[0]).join(" + ")
      : "Não informado";
    const cidCodes = cidOpts.map((o) => o.cid).filter((c) => c && c !== "—");
    const cidCode = cidCodes.length > 0 ? `CID ${cidCodes.join(", ")}` : "CID não informado";
    const aeeLabel = nsAeeDays
      ? `AEE ${nsAeeDays}x/sem`
      : "AEE a definir";
    const mediadora = nsMediadora.trim();
    const baseStudent: Omit<Student, "id"> = {
      name,
      initials: initials || "AL",
      age: "—",
      turma: nsTurma.trim() || "Sem turma",
      anoEscolar: nsAnoEscolar.trim() || "",
      diag: diagLabel,
      cid: cidCode,
      cids: cidCodes,
      aee: mediadora ? `${aeeLabel} · Mediadora: ${mediadora}` : aeeLabel,
      anamnese: "0/14",
      registros: "0",
      trend: "—",
      trendTone: "muted",
    };
    try {
      setSavingStudent(true);
      if (editingStudentId) {
        // Em edição, preserva campos calculados (anamnese, registros, trend, etc.)
        await updateStudent(editingStudentId, {
          name: baseStudent.name,
          initials: baseStudent.initials,
          turma: baseStudent.turma,
          anoEscolar: baseStudent.anoEscolar,
          diag: baseStudent.diag,
          cid: baseStudent.cid,
          cids: baseStudent.cids,
          aee: baseStudent.aee,
        });
        toast.success("Dados do(a) aluno(a) atualizados", { description: name });
      } else {
        await createStudent(baseStudent);
        toast.success("Aluno(a) cadastrado(a)", { description: name });
      }
      fecharModalAluno();
    } catch (err) {
      console.error("[Inclusao] erro ao salvar aluno:", err);
      toast.error("Não foi possível salvar o(a) aluno(a)", {
        description: (err as Error)?.message ?? "Tente novamente em alguns instantes.",
      });
    } finally {
      setSavingStudent(false);
    }
  };

  const saveTab = (label: string) => {
    if (!selected) {
      toast.error("Selecione um aluno antes de salvar.");
      return;
    }

    // Recalcula contadores reais do localStorage e sincroniza no banco
    const regsDoAluno = regByStudent[selected.id] || [];
    const anamDoAluno = anamByStudent[selected.id] || buildBlankAnam();
    const eixosTotal = anamDoAluno.length;
    const eixosOk = anamDoAluno.filter(
      (e) => e.items.some((i) => i.s !== "naoObservado") || (e.obs && e.obs.trim())
    ).length;
    const peiDoAluno = (peiByStudent[selected.id] || {}) as Record<string, unknown>;
    const peiCheck = ["diagnostico","caracterizacao","habilidadesDesenvolvidas","estrategias","adaptacoesCurriculares","adaptacoesAvaliativas","recursos","comunicacao"];
    let peiFilled = 0;
    peiCheck.forEach((k) => { if (String(peiDoAluno[k] || "").trim().length > 5) peiFilled++; });
    if (Array.isArray(peiDoAluno.objetivos) && (peiDoAluno.objetivos as unknown[]).length > 0) peiFilled++;
    if (Array.isArray(peiDoAluno.equipe) && (peiDoAluno.equipe as unknown[]).length > 0) peiFilled++;
    const objsArr = (Array.isArray(peiDoAluno.objetivos) ? peiDoAluno.objetivos : []) as Array<{ status?: string }>;
    const objsTotal = objsArr.length;
    const objsAtingidos = objsArr.filter((o) => o.status === "realizado" || o.status === "atingido").length;
    const trendTone: "ok" | "warn" | "muted" =
      objsTotal === 0 ? "muted" : objsAtingidos / objsTotal >= 0.5 ? "ok" : "warn";
    const trendLabel =
      objsTotal === 0 ? "—" : `${objsAtingidos}/${objsTotal}`;

    void updateStudent(selected.id, {
      anamnese: `${eixosOk}/${eixosTotal}`,
      registros: String(regsDoAluno.length),
      trend: trendLabel,
      trendTone,
    });

    // Tempo devolvido — Anamnese (idempotente por aluno)
    if (label === "Anamnese" && eixosTotal > 0 && eixosOk > 0) {
      const pct = eixosOk / eixosTotal;
      const keyBaixa = `tempo:anamnese:baixa:${selected.id}`;
      const keyAlta = `tempo:anamnese:alta:${selected.id}`;
      try {
        if (!localStorage.getItem(keyBaixa)) {
          localStorage.setItem(keyBaixa, "1");
          void acumularTempo("anamnese_baixa", `Anamnese iniciada — ${selected.name}`);
        }
        if (pct >= 0.5 && !localStorage.getItem(keyAlta)) {
          localStorage.setItem(keyAlta, "1");
          void acumularTempo("anamnese_alta", `Anamnese ≥ 50% — ${selected.name}`);
        }
      } catch { /* localStorage indisponível */ }
    }

    toast.success(`${label} salvo`, { description: `Sincronizado para ${selected.name}.` });
  };

  return (
    <div className="inc-root">
      <style dangerouslySetInnerHTML={{ __html: sidebarCss + css + emptyStateCss + printCss }} />
      <div className="inc-app">
        <AppSidebar active="inclusion" />

        <main className="inc-main">
          {(() => {
            const alunoCtx = sofiaCtx.entity.aluno_atual;
            const eixos = alunoCtx?.anamnese_eixos_preenchidos ?? 0;
            const proxAula = sofiaCtx.dataState.proxima_aula;
            const adaptarDisabled = eixos < 4 || !proxAula;
            const adaptarTooltip = "Disponível após Anamnese 4/16 + planejamento da semana cadastrado";
            const crumbs =
              view === "list"
                ? [{ label: "Sua sala" }, { label: "Inclusão" }]
                : [
                    { label: "Sua sala" },
                    { label: "Inclusão", onClick: () => goView("list") },
                    { label: selected?.turma || "Aluno", onClick: () => goView("list") },
                    { label: selected?.name || "—" },
                  ];
            return (
              <AppHeader
                breadcrumb={crumbs}
                actions={
                  <>
                    <button className="inc-btn-ghost" onClick={() => setTutorialOpen(true)}>
                      <HelpCircle size={14} /> Tutorial Inclusão
                    </button>
                    {view === "detail" && (
                      <button className="inc-btn-ghost" onClick={() => setPeiOpen(true)}>
                        <Download size={14} /> Exportar PEI
                      </button>
                    )}
                  </>
                }
              />
            );
          })()}

          <div className="inc-content">
            {view === "list" && (
              <>
                <div className="list-hero">
                  <h1>Alunos · Educação Inclusiva</h1>
                  <p>Selecione um aluno para acessar PEI, Anamnese, Planejamento, Registros e Relatórios.</p>
                </div>
                <div className="list-toolbar">
                  <div className="list-search">
                    <Search size={14} />
                    <input
                      placeholder="Buscar por nome, turma ou diagnóstico…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                  <div style={{ position: "relative" }}>
                    <button
                      className="list-filter"
                      onClick={() => setFilterOpen(filterOpen === "turma" ? null : "turma")}
                      aria-expanded={filterOpen === "turma"}
                    >
                      Turma: {turmaFilter.length === 0 ? "Todas" : turmaFilter.length === 1 ? turmaFilter[0] : `${turmaFilter.length} selecionadas`}
                    </button>
                    {filterOpen === "turma" && (
                      <FilterPopover
                        options={turmasUnicas}
                        selected={turmaFilter}
                        onToggle={(v) => setTurmaFilter((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])}
                        onClear={() => setTurmaFilter([])}
                        onClose={() => setFilterOpen(null)}
                        emptyLabel="Nenhuma turma cadastrada."
                      />
                    )}
                  </div>
                  <div style={{ position: "relative" }}>
                    <button
                      className="list-filter"
                      onClick={() => setFilterOpen(filterOpen === "diag" ? null : "diag")}
                      aria-expanded={filterOpen === "diag"}
                    >
                      Diagnóstico: {diagFilter.length === 0 ? "Todos" : diagFilter.length === 1 ? diagFilter[0] : `${diagFilter.length} selecionados`}
                    </button>
                    {filterOpen === "diag" && (
                      <FilterPopover
                        options={diagsUnicos}
                        selected={diagFilter}
                        onToggle={(v) => setDiagFilter((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])}
                        onClear={() => setDiagFilter([])}
                        onClose={() => setFilterOpen(null)}
                        emptyLabel="Nenhum diagnóstico registrado."
                      />
                    )}
                  </div>
                  <div className="list-actions">
                    <button className="btn btn-primary bg-orange-400 text-orange-400 btn-cadastrar" onClick={() => setNewStudentOpen(true)}><Plus size={14} /> Cadastrar aluno</button>
                  </div>
                </div>
                <div className="list-grid">
                  {studentsLoading && allStudents.length === 0 ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={`sk-${i}`} className="student-card" style={{ pointerEvents: "none" }}>
                        <div className="sc-head">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="sc-info" style={{ flex: 1 }}>
                            <Skeleton className="h-3 w-32 mb-2" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </div>
                        <div className="sc-tags">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-12" />
                          <Skeleton className="h-5 w-14" />
                        </div>
                        <div className="sc-stats">
                          <Skeleton className="h-8" />
                          <Skeleton className="h-8" />
                          <Skeleton className="h-8" />
                        </div>
                      </div>
                    ))
                  ) : null}
                  {!studentsLoading && filtered.length === 0 && (
                    <EmptyState
                      icon="🤝"
                      title={
                        allStudents.length === 0
                          ? "Nenhum aluno PCD cadastrado ainda."
                          : "Nenhum aluno PCD encontrado com os filtros atuais."
                      }
                      description="A página de Inclusão exibe apenas alunos marcados como PCD. A Sofia organiza PEI, anamnese, registros e relatórios para cada um."
                      ctaLabel="Cadastrar aluno PCD"
                      onCta={() => setNewStudentOpen(true)}
                    />
                  )}
                  {!studentsLoading && filtered.map((s) => (
                    <AlunoCard key={s.id} student={s} onSelect={openStudent} />
                  ))}
                </div>
              </>
            )}

            {view === "detail" && selected && (
              <>
                <div className="hero">
                  <div className="hero-l">
                    <button className="back" onClick={() => goView("list")}><ArrowLeft size={13} /> Voltar à lista</button>
                    <h1>{selected.name} <span className="age">· {selected.age} · {selected.turma}</span></h1>
                    <div className="tag-row">
                      <span className="diagnostic"><span className="pulse" />{selected.diag}</span>
                      {selected.anoEscolar && <span className="tag"><b>Ano escolar:</b> {selected.anoEscolar}</span>}
                      {selected.anoReferenciaPedagogico && (
                        <span
                          className="tag"
                          style={{ background: "#FFF7ED", borderColor: "#FED7AA", color: "#9A3412" }}
                          title="Ano usado pela Sofia ao gerar conteúdos pedagógicos"
                        >
                          📚 <b>Ano de referência:</b> {selected.anoReferenciaPedagogico}
                          {isAnoReferenciaDivergente(selected.anoEscolar, selected.anoReferenciaPedagogico) && (
                            <span style={{ marginLeft: 6 }}>⚠️</span>
                          )}
                        </span>
                      )}
                      <span className="tag"><b>Turma:</b> {selected.turma}</span>
                      <span className="tag"><b>{selected.cid}</b></span>
                      <span className="tag"><b>{selected.aee}</b></span>
                      {(() => {
                        const peiSel = (peiByStudent[selected.id] || {}) as Record<string, unknown>;
                        const objsArr = (Array.isArray(peiSel.objetivos) ? peiSel.objetivos : []) as unknown[];
                        const temPEI = Boolean(
                          objsArr.length || peiSel.caracterizacao || peiSel.habilidadesDesenvolvidas ||
                          peiSel.adaptacoesCurriculares || peiSel.metodologias
                        );
                        if (!temPEI) return null;
                        const at = typeof peiSel.atualizadoEm === "string" && peiSel.atualizadoEm
                          ? new Date(peiSel.atualizadoEm).toLocaleDateString("pt-BR")
                          : "";
                        return (
                          <span
                            className="tag"
                            style={{ background: "#ECFDF5", borderColor: "#A7F3D0", color: "#065F46" }}
                            title="Plano Educacional Individualizado salvo — será usado pela Sofia ao gerar relatórios"
                          >
                            📋 <b>PEI ativo</b>{at ? ` — atualizado em ${at}` : ""}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="hero-r">
                    <button className="btn btn-secondary" onClick={() => setPeiOpen(true)}><FileText size={14} /> Ver PEI completo</button>
                    <button className="btn btn-secondary" onClick={() => abrirEditarAluno(selected)} title="Editar nome, turma, ano escolar, CIDs e AEE"><Pencil size={14} /> Editar dados</button>
                     <button className="btn btn-primary bg-orange-400 text-orange-400" onClick={() => openSofiaForSelected({ prompt: `Adapte a aula de hoje para ${selected.name}`, context: `Aluno PCD: ${selected.name} · Inclusão` })}><Sparkles size={14} /> Adaptar aula de hoje</button>
                  </div>
                </div>

                <div className="kpis">
                  <div className="kpi kpi-accent">
                    <div className="kpi-label">Tempo economizado neste aluno</div>
                    <div className="kpi-value">
                      {Math.floor(tempoAlunoMin / 60)}h
                      <span className="small"> {String(tempoAlunoMin % 60).padStart(2, "0")}min</span>
                    </div>
                    <div className="kpi-sub">
                      {tempoAlunoMin > 0
                        ? "integra o contador do Painel"
                        : "comece a usar a Sofia para acumular ganhos"}
                    </div>
                  </div>
                  <div className="kpi">
                    <div className="kpi-label">Aulas adaptadas</div>
                    <div className="kpi-value">{selecionadosCount}<span className="small"> /{studentPlans.length}</span></div>
                    <div className="kpi-sub">
                      {studentPlans.length === 0
                        ? "gere atividades em Planejamento"
                        : selecionadosCount === 0
                        ? `${studentPlans.length} disponível(is) · selecione em Planejamento`
                        : `${selecionadosCount} selecionada(s) em Planejamento`}
                    </div>
                  </div>
                  {(() => {
                    const peiSel = (peiByStudent[selected.id] || {}) as Record<string, unknown>;
                    const objs = (Array.isArray(peiSel.objetivos) ? peiSel.objetivos : []) as Array<{ id: string; texto: string; status: string; prazo?: string }>;
                    const atingidos = objs.filter((o) => o.status === "realizado" || o.status === "atingido").length;
                    return (
                      <button
                        type="button"
                        className="kpi"
                        onClick={() => setObjetivosModalOpen(true)}
                        style={{ textAlign: "left", cursor: "pointer", border: "1px solid var(--border)", background: "#fff" }}
                        title="Abrir lista de objetivos do PEI"
                      >
                        <div className="kpi-label">Objetivos do PEI realizados</div>
                        <div className="kpi-value">{atingidos}<span className="small"> /{objs.length}</span></div>
                        <div className="kpi-sub">
                          {objs.length === 0 ? "defina objetivos no PEI" : `clique para revisar status`}
                        </div>
                      </button>
                    );
                  })()}
                  <div className="kpi">
                    <div className="kpi-label">Evolução pedagógica</div>
                    {(() => {
                      const totalRegs = (regByStudent[studentKey] || []).length;
                      const hasData = eixosPreenchidos > 0 || totalRegs > 0;
                      if (!hasData) {
                        return (
                          <>
                            <div className="kpi-value" style={{ color: "var(--muted)" }}>Sem dados</div>
                            <div className="kpi-sub">aguardando primeiros registros</div>
                          </>
                        );
                      }
                      const avg = skillsEvolucao.reduce((acc, s) => acc + s.p, 0) / skillsEvolucao.length;
                      let label = "Em desenvolvimento";
                      let color = "var(--warn, #b8860b)";
                      if (avg >= 70) { label = "Progredindo"; color = "var(--success, #16a34a)"; }
                      else if (avg < 40) { label = "Necessita apoio"; color = "var(--danger, #dc2626)"; }
                      else { color = "var(--accent, #d97706)"; }
                      return (
                        <>
                          <div className="kpi-value" style={{ color }}>{label}</div>
                          <div className="kpi-sub">média {Math.round(avg)}% · {totalRegs} registro{totalRegs === 1 ? "" : "s"}</div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="tabs" role="tablist">
                  {([
                    { k: "hoje", label: "Visão de hoje" },
                    { k: "anam", label: "Anamnese" },
                    { k: "plan", label: "Planejamento" },
                    { k: "reg", label: "Registros" },
                    { k: "rel", label: "Relatório IA" },
                  ] as Array<{ k: TabKey; label: string; count?: string }>).map((t) => (
                    <button key={t.k} className={"tab" + (tab === t.k ? " active" : "")} onClick={() => setActiveTab(t.k)} role="tab" aria-selected={tab === t.k}>
                      {t.label}{t.count && <span className="tab-count">{t.count}</span>}
                    </button>
                  ))}
                </div>

                {/* PANEL: HOJE */}
                <div className={"panel" + (tab === "hoje" ? " active" : "")}>
                  <div className="section-head" style={{ marginBottom: 10 }}>
                    <h3>Visão de hoje · {selected.name}</h3>
                    <span className="legal">{selected.anoEscolar || "Ano escolar não informado"}</span>
                    <button className="btn btn-primary bg-orange-400 text-orange-400" onClick={() => saveTab("Visão de hoje")}><CheckCircle2 size={14} /> Salvar</button>
                  </div>
                  <div className="hoje-grid">
                    <div className="col-l">
                  <div className="action-card">
                    {(() => {
                      const firstName = selected.name.split(" ")[0];
                      const totalEixos = anamData.length;
                      const totalRegs = (regByStudent[selected.id] || []).length;
                      const pei = (peiByStudent[selected.id] || {}) as Record<string, unknown>;
                      const peiCheck: string[] = [
                        "diagnostico", "caracterizacao", "habilidadesDesenvolvidas",
                        "adaptacoesCurriculares", "formasAvaliacao", "familiaParticipacao",
                      ];
                      let peiFilled = 0;
                      peiCheck.forEach((k) => { if (String(pei[k] || "").trim().length > 5) peiFilled++; });
                      if (Array.isArray(pei.objetivos) && (pei.objetivos as unknown[]).length > 0) peiFilled++;
                      if (Array.isArray(pei.equipe) && (pei.equipe as unknown[]).length > 0) peiFilled++;
                      const peiPct = Math.round((peiFilled / 8) * 100);
                      const anamPct = Math.round((eixosPreenchidos / Math.max(totalEixos, 1)) * 100);
                      const ultimoReg = (regByStudent[selected.id] || [])[0];
                      const anamCompleta = eixosPreenchidos >= totalEixos && totalEixos > 0;
                      const peiCompleto = peiFilled >= 8;

                      // Estágio 0 — sem nada
                      if (eixosPreenchidos === 0 && peiFilled === 0 && totalRegs === 0) {
                        return (
                          <>
                            <div className="ac-head">
                              <div className="sofia">S</div>
                              <div className="ac-head-txt">
                                <b>Sofia ainda está conhecendo {firstName}</b>
                                <span>Preencha a Anamnese e o PEI para receber sugestões personalizadas</span>
                              </div>
                              <span className="ac-tag">Novo</span>
                            </div>
                            <h2 className="ac-title">Vamos começar pela <em>Anamnese</em> de {firstName}</h2>
                            <p className="ac-body">Sem registros ainda. Preencha os eixos da Anamnese e cadastre o PEI para que a Sofia possa sugerir adaptações de aula alinhadas ao perfil e à BNCC.</p>
                            <div className="ac-cta">
                              <button className="btn btn-primary bg-orange-400 text-orange-400" onClick={() => setActiveTab("anam")}>Preencher Anamnese <ChevronRight size={14} /></button>
                              <button className="btn-ghost-dark" onClick={() => setPeiOpen(true)}>Abrir PEI</button>
                            </div>
                          </>
                        );
                      }

                      // Estágio 1 — Anamnese em andamento (ainda incompleta) e PEI ainda fraco
                      if (!anamCompleta && peiFilled < 4) {
                        const restantes = totalEixos - eixosPreenchidos;
                        return (
                          <>
                            <div className="ac-head">
                              <div className="sofia">S</div>
                              <div className="ac-head-txt">
                                <b>Anamnese em andamento</b>
                                <span>{eixosPreenchidos} de {totalEixos} eixos preenchidos · {anamPct}%</span>
                              </div>
                              <span className="ac-tag" style={{ background: "#FEF3C7", color: "#92400E" }}>Em progresso</span>
                            </div>
                            <h2 className="ac-title">Faltam <em>{restantes} eixo{restantes > 1 ? "s" : ""}</em> para liberar adaptações personalizadas</h2>
                            <p className="ac-body">
                              Já estou conhecendo {firstName}{ultimoReg ? `. Último registro: "${ultimoReg.body.slice(0, 90)}${ultimoReg.body.length > 90 ? "…" : ""}"` : ""}. Continue preenchendo a Anamnese ou já adiante o PEI.
                            </p>
                            <div className="ac-cta">
                              <button className="btn btn-primary bg-orange-400 text-orange-400" onClick={() => setActiveTab("anam")}>Continuar Anamnese <ChevronRight size={14} /></button>
                              <button className="btn-ghost-dark" onClick={() => setPeiOpen(true)}>Abrir PEI ({peiFilled}/8)</button>
                            </div>
                          </>
                        );
                      }

                      // Estágio 1b — PEI completo mas Anamnese ainda incompleta
                      if (!anamCompleta && peiCompleto) {
                        const restantes = totalEixos - eixosPreenchidos;
                        return (
                          <>
                            <div className="ac-head">
                              <div className="sofia">S</div>
                              <div className="ac-head-txt">
                                <b>PEI 8/8 · falta concluir a Anamnese</b>
                                <span>Anamnese {anamPct}% · PEI 100% · {totalRegs} registro{totalRegs !== 1 ? "s" : ""}</span>
                              </div>
                              <span className="ac-tag" style={{ background: "#FEF3C7", color: "#92400E" }}>Quase lá</span>
                            </div>
                            <h2 className="ac-title">Falta{restantes > 1 ? "m" : ""} <em>{restantes} eixo{restantes > 1 ? "s" : ""}</em> da Anamnese para refinar as adaptações</h2>
                            <p className="ac-body">O PEI de {firstName} está completo. Concluir a Anamnese me dá a linha de base para sugerir adaptações ainda mais precisas.</p>
                            <div className="ac-cta">
                              <button className="btn btn-primary bg-orange-400 text-orange-400" onClick={() => setActiveTab("anam")}>Concluir Anamnese <ChevronRight size={14} /></button>
                              <button className="btn-ghost-dark" onClick={() => setActiveTab("plan")}>Adaptar atividade</button>
                            </div>
                          </>
                        );
                      }

                      // Estágio 2 — Anamnese completa, PEI ainda fraco (<4)
                      if (anamCompleta && peiFilled < 4) {
                        return (
                          <>
                            <div className="ac-head">
                              <div className="sofia">S</div>
                              <div className="ac-head-txt">
                                <b>Anamnese pronta · agora o PEI</b>
                                <span>{peiFilled} de 8 eixos do PEI preenchidos</span>
                              </div>
                              <span className="ac-tag" style={{ background: "#DBEAFE", color: "#1E40AF" }}>Próximo passo</span>
                            </div>
                            <h2 className="ac-title">Hora de cadastrar o <em>PEI</em> de {firstName}</h2>
                            <p className="ac-body">Já tenho o perfil pedagógico de {firstName}. Vamos formalizar o Plano Educacional Individualizado (Lei 14.254/2021) para alinhar metas, adaptações e equipe responsável.</p>
                            <div className="ac-cta">
                              <button className="btn btn-primary bg-orange-400 text-orange-400" onClick={() => setPeiOpen(true)}>Preencher PEI <ChevronRight size={14} /></button>
                              <button className="btn-ghost-dark" onClick={() => setActiveTab("anam")}>Revisar Anamnese</button>
                            </div>
                          </>
                        );
                      }

                      // Estágio 3 — PEI parcial (4-7/8), independente da Anamnese
                      if (!peiCompleto) {
                        return (
                          <>
                            <div className="ac-head">
                              <div className="sofia">S</div>
                              <div className="ac-head-txt">
                                <b>PEI quase completo · {peiPct}%</b>
                                <span>{peiFilled} de 8 eixos · Anamnese {anamPct}% · {totalRegs} registro{totalRegs !== 1 ? "s" : ""}</span>
                              </div>
                              <span className="ac-tag" style={{ background: "#DBEAFE", color: "#1E40AF" }}>Avançando</span>
                            </div>
                            <h2 className="ac-title">Já consigo sugerir <em>adaptações</em> para {firstName}</h2>
                            <p className="ac-body">
                              Faltam <b>{8 - peiFilled} eixo{8 - peiFilled > 1 ? "s" : ""}</b> do PEI para um plano completo conforme a Lei 14.254/2021.
                              {ultimoReg ? ` Último registro: "${ultimoReg.body.slice(0, 80)}${ultimoReg.body.length > 80 ? "…" : ""}"` : ""}
                            </p>
                            <div className="ac-cta">
                              <button className="btn btn-primary bg-orange-400 text-orange-400" onClick={() => setPeiOpen(true)}>Concluir PEI <ChevronRight size={14} /></button>
                              <button className="btn-ghost-dark" onClick={() => setActiveTab("plan")}>Adaptar atividade</button>
                            </div>
                          </>
                        );
                      }

                      // Estágio 4 — Anamnese 100% e PEI 8/8: foco em evolução + adaptações
                      return (
                        <>
                          <div className="ac-head">
                            <div className="sofia">S</div>
                            <div className="ac-head-txt">
                              <b>Perfil completo · acompanhando evolução</b>
                              <span>Anamnese 100% · PEI 8/8 · {totalRegs} registro{totalRegs !== 1 ? "s" : ""} pedagógico{totalRegs !== 1 ? "s" : ""}</span>
                            </div>
                            <span className="ac-tag" style={{ background: "#DCFCE7", color: "#166534" }}>Pronto</span>
                          </div>
                          <h2 className="ac-title">Sigo acompanhando a evolução de <em>{firstName}</em></h2>
                          <p className="ac-body">
                            {ultimoReg
                              ? <>Último registro ({ultimoReg.when}): "{ultimoReg.body.slice(0, 110)}{ultimoReg.body.length > 110 ? "…" : ""}". Posso adaptar a próxima aula com base nesse contexto.</>
                              : <>Cadastre registros pedagógicos para que eu acompanhe a evolução e refine as adaptações automaticamente.</>}
                          </p>
                          <div className="ac-cta">
                            <button className="btn btn-primary bg-orange-400 text-orange-400" onClick={() => setActiveTab("plan")}>Adaptar próxima aula <ChevronRight size={14} /></button>
                            <button className="btn-ghost-dark" onClick={() => setActiveTab("reg")}>Novo registro</button>
                            <button className="btn-ghost-dark" onClick={() => setPeiOpen(true)}>Revisar PEI</button>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="section">
                    <div className="section-head">
                      <h3>Plano Educacional Individualizado · Eixos ativos</h3>
                      <span className="legal">Lei 14.254/2021 · BNCC Inclusão</span>
                      <button className="more" onClick={() => setPeiOpen(true)}>Ver completo →</button>
                    </div>
                    <div className="pei-grid">
                      {PEI_EIXOS.map((e) => (
                        <button key={e.h} className="pei" onClick={() => setActiveTab("anam")}>
                          <div className={"pei-icon " + e.cls}>{e.ic}</div>
                          <h4>{e.h}</h4>
                          <div className="pei-status">
                            <span className={e.tone === "ok" ? "ok" : "warn"}>●</span> {e.status}
                          </div>
                          <span className="meta">{e.meta}</span>
                          <p>{e.body}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="section">
                    <div className="section-head">
                      <h3>Linha do tempo pedagógica</h3>
                      <button className="more" onClick={() => setActiveTab("reg")}>Todos os {studentRegs.length} registros →</button>
                    </div>
                    <div className="tl">
                      {studentRegs.length === 0 ? (
                        <p style={{ color: "var(--muted)", fontSize: 12.5 }}>Nenhum registro ainda. Os eventos pedagógicos de {selected.name.split(" ")[0]} aparecerão aqui.</p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {studentRegs.slice(0, 5).map((r) => (
                            <div key={r.id} className="reg-item">
                              <div className="reg-item-head">
                                <span className="reg-when">{r.when}</span>
                                <span className="reg-author">· {r.who}</span>
                                <span className={"reg-cat " + r.cat}>{REG_CAT_LABEL[r.cat]}</span>
                              </div>
                              <div className="reg-body">{r.body}</div>
                            </div>
                          ))}
                          {studentRegs.length > 5 && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ alignSelf: "flex-start", fontSize: 12 }}
                              onClick={() => setActiveTab("reg")}
                            >
                              Ver todos os {studentRegs.length} registros
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                    </div>

                    <aside className="col-r">
                       <InclusaoSuggestions
                         entityId={selected.id ? String(selected.id) : selected.name}
                         onAction={(s) => {
                           if (s.id === "inc-adapt" || s.id.startsWith("rule-adapt-")) {
                             setActiveTab("plan");
                             openSofiaForSelected({
                               prompt: s.prompt.replace(/este aluno/gi, selected.name),
                               context: s.context,
                             });
                             return;
                           }
                           if (s.id === "inc-parecer") {
                             setActiveTab("rel");
                             const temRegs = (regByStudent[selected.id] || []).length > 0;
                             if (!temRegs) {
                               toast.info("Cadastre ao menos um registro para gerar o parecer.");
                               return;
                             }
                             handleGerarParecer();
                             return;
                           }
                           openSofiaForSelected({ prompt: s.prompt, context: s.context });
                         }}
                       />

                      <div className="context-card">
                        <h4>Contexto rápido</h4>
                        {eixosPreenchidos === 0 ? (
                          <>
                            {([
                              { l: "Ano escolar", v: selected.anoEscolar || "Não informado" },
                              { l: "Turma", v: selected.turma },
                              { l: "Diagnóstico", v: selected.diag },
                              { l: "CID", v: selected.cid },
                              { l: "AEE / Mediação", v: selected.aee },
                            ] as Array<{ l: string; v: string }>).map((r) => (
                              <div className="ctx-row" key={r.l}>
                                <span className="lbl">{r.l}</span>
                                <span className="ctx-pill">{r.v || "—"}</span>
                              </div>
                            ))}
                            <div style={{
                              marginTop: 12, padding: 12, borderRadius: 10,
                              background: "var(--accent-soft)", border: "1px dashed var(--accent)",
                              display: "flex", flexDirection: "column", gap: 8,
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>
                                <Lightbulb size={14} /> Anamnese ainda não preenchida
                              </div>
                              <p style={{ margin: 0, fontSize: 12, color: "var(--text)" }}>
                                Sem a Anamnese, o contexto rápido fica limitado. Preencha os eixos para que a Sofia traga aqui o desempenho, destaques e pontos de atenção de {selected.name.split(" ")[0]}.
                              </p>
                              <button
                                className="btn btn-primary bg-orange-400 text-orange-400"
                                style={{ alignSelf: "flex-start" }}
                                onClick={() => setActiveTab("anam")}
                              >
                                <Plus size={14} /> Preencher Anamnese
                              </button>
                            </div>
                          </>
                        ) : (() => {
                          const findEixo = (label: string) => anamData.find((e) => e.l === label);
                          const pillFor = (label: string): { v: string; t: "" | "warn" | "ok" } => {
                            const e = findEixo(label);
                            if (!e) return { v: "Sem dados", t: "" };
                            const obs = e.items.filter((i) => i.s !== "naoObservado");
                            if (obs.length === 0) return { v: "Sem dados", t: "" };
                            const p = eixoPct(e.items);
                            return { v: `${p}%`, t: p >= 80 ? "ok" : p >= 40 ? "warn" : "warn" };
                          };
                          const baseLinhas: Array<{ l: string; v: string; t: "" | "warn" | "ok" }> = [
                            { l: "Ano escolar", v: selected.anoEscolar || "Não informado", t: "" },
                            { l: "Turma", v: selected.turma, t: "" },
                            { l: "Diagnóstico", v: selected.diag, t: "" },
                            { l: "CID", v: selected.cid, t: "" },
                            { l: "AEE / Mediação", v: selected.aee, t: "" },
                            { l: "Anamnese", v: `${eixosPreenchidos}/${anamData.length} eixos`, t: eixosPreenchidos === 0 ? "warn" : eixosPreenchidos >= anamData.length / 2 ? "ok" : "warn" },
                          ];
                          const linhas: Array<{ l: string; v: string; t: "" | "warn" | "ok" }> = anamUsesEI
                            ? [
                                ...baseLinhas,
                                { l: "Linguagem e expressão", ...pillFor("Escuta, fala, pensamento e imaginação") },
                                { l: "Quantidades e relações", ...pillFor("Espaços, tempos, quantidades e relações") },
                                { l: "Eu, outro e nós", ...pillFor("O eu, o outro e o nós") },
                                { l: "Autonomia e cuidados de si", ...pillFor("Autonomia e cuidados de si") },
                                { l: "Emoção e autorregulação", ...pillFor("Emoção e autorregulação") },
                              ]
                            : [
                                ...baseLinhas,
                                { l: "Desempenho acadêmico", ...pillFor("Desempenho Acadêmico") },
                                { l: "Aspectos pedagógicos", ...pillFor("Aspectos Pedagógicos") },
                                { l: "Interações sociais", ...pillFor("Interações Sociais") },
                                { l: "Autonomia", ...pillFor("Autonomia") },
                                { l: "Emoção / Autorregulação", ...pillFor("Emoção") },
                              ];
                          return linhas.map((r) => (
                            <div className="ctx-row" key={r.l}>
                              <span className="lbl">{r.l}</span>
                              <span className={"ctx-pill" + (r.t ? " " + r.t : "")}>{r.v}</span>
                            </div>
                          ));
                        })()}
                        {eixosPreenchidos > 0 && (() => {
                          const consolidados: string[] = [];
                          const naoAlcancados: string[] = [];
                          anamData.forEach((e) => {
                            e.items.forEach((i) => {
                              if (i.s === "consolidado") consolidados.push(i.d);
                              else if (i.s === "naoAlcancado") naoAlcancados.push(i.d);
                            });
                          });
                          if (consolidados.length === 0 && naoAlcancados.length === 0) {
                            return (
                              <p style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
                                Preencha a Anamnese para ver destaques e pontos de atenção do(a) aluno(a) aqui.
                              </p>
                            );
                          }
                          return (
                            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                              {consolidados.length > 0 && (
                                <div>
                                  <b style={{ fontSize: 11, color: "var(--success)" }}>Destaques</b>
                                  <ul style={{ margin: "4px 0 0 16px", padding: 0, fontSize: 12 }}>
                                    {consolidados.slice(0, 3).map((c) => <li key={c}>{c}</li>)}
                                  </ul>
                                </div>
                              )}
                              {naoAlcancados.length > 0 && (
                                <div>
                                  <b style={{ fontSize: 11, color: "var(--warn)" }}>Pontos de atenção</b>
                                  <ul style={{ margin: "4px 0 0 16px", padding: 0, fontSize: 12 }}>
                                    {naoAlcancados.slice(0, 3).map((c) => <li key={c}>{c}</li>)}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      <div className="skills-card">
                        <h4 style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Sparkles size={14} style={{ color: "var(--accent)" }} />
                          Habilidades · evolução
                          <span style={{ fontSize: 10, fontWeight: 500, color: "var(--muted)", marginLeft: "auto" }}>
                            base Anamnese + {studentRegs.length} registro{studentRegs.length === 1 ? "" : "s"}
                          </span>
                        </h4>
                        {(() => {
                          const MIN_REGS = 3;
                          const totalRegs = studentRegs.length;
                          const catsPresentes = new Set(studentRegs.map((r) => r.cat));
                          const catsFaltantes = (["ped","com","sen","fam"] as RegCat[]).filter((c) => !catsPresentes.has(c));
                          const eixosFaltantes = anamData.length - eixosPreenchidos;
                          if (eixosPreenchidos === 0) {
                            return (
                              <div style={{ marginTop: 8, padding: 10, borderRadius: 8, background: "color-mix(in oklab, var(--warn) 12%, transparent)", border: "1px solid color-mix(in oklab, var(--warn) 35%, transparent)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--warn)" }}>
                                  <Lightbulb size={14} /> Sem dados para calcular evolução
                                </div>
                                <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 8px" }}>
                                  Preencha a <b>Anamnese</b> do aluno para definir a linha de base das habilidades.
                                </p>
                                <button className="btn btn-secondary" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => setActiveTab("anam")}>
                                  Preencher Anamnese
                                </button>
                              </div>
                            );
                          }
                          if (totalRegs < MIN_REGS) {
                            return (
                              <div style={{ marginTop: 8, padding: 10, borderRadius: 8, background: "color-mix(in oklab, var(--warn) 12%, transparent)", border: "1px solid color-mix(in oklab, var(--warn) 35%, transparent)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--warn)" }}>
                                  <Lightbulb size={14} /> Poucos registros para calcular evolução
                                </div>
                                <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 6px" }}>
                                  Você tem <b>{totalRegs}</b> de <b>{MIN_REGS}</b> registros mínimos. Adicione novos registros do aluno para que a Sofia possa identificar tendências.
                                </p>
                                {catsFaltantes.length > 0 && (
                                  <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 6px" }}>
                                    Sugestão: registrar nas áreas {catsFaltantes.map((c) => <b key={c} style={{ color: "var(--text)" }}>{REG_CAT_LABEL[c]}</b>).reduce<React.ReactNode[]>((acc, el, i) => acc.length ? [...acc, ", ", el] : [el], [])}.
                                  </p>
                                )}
                                {eixosFaltantes > 0 && (
                                  <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 8px" }}>
                                    Faltam ainda <b>{eixosFaltantes}</b> eixo{eixosFaltantes === 1 ? "" : "s"} da Anamnese para uma linha de base completa.
                                  </p>
                                )}
                                <button className="btn btn-secondary" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => { setActiveTab("reg"); setRegModalOpen(true); }}>
                                  Novo registro
                                </button>
                              </div>
                            );
                          }
                          return (
                            <>
                            {
                          skillsEvolucao.map((s) => {
                            const arrow = s.trend === "up" ? "↑" : s.trend === "down" ? "↓" : "→";
                            const arrowColor = s.trend === "up" ? "var(--success)" : s.trend === "down" ? "var(--danger)" : "var(--muted)";
                            const visible = s.observed || s.count > 0;
                            return (
                              <div className="skill" key={s.l}>
                                <div className="skill-head">
                                  <b>{s.l}</b>
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                    {visible && s.delta !== 0 && (
                                      <span style={{ color: arrowColor, fontSize: 11, fontWeight: 700 }} title={`Anamnese ${s.baseline}% · ${s.pos > 0 ? `+${s.pos}` : ""}${s.pos > 0 && s.neg > 0 ? " / " : ""}${s.neg > 0 ? `-${s.neg}` : ""} registros`}>
                                        {arrow} {s.delta > 0 ? `+${s.delta}` : s.delta}
                                      </span>
                                    )}
                                    <span>{visible ? `${s.p}%` : "—"}</span>
                                  </span>
                                </div>
                                <div className="skill-bar"><div className={"skill-fill" + (s.c ? " " + s.c : "")} style={{ width: s.p + "%" }} /></div>
                              </div>
                            );
                          })
                            }
                            </>
                          );
                        })()}
                      </div>

                      <div className="trust-card">
                        <span className="dot" />
                        <span><b>PEI conforme Lei 14.254/2021.</b> Documentos exportados pelo AgilizaProf têm validade institucional na secretaria.</span>
                      </div>
                    </aside>
                  </div>
                </div>

                {/* PANEL: ANAMNESE (placeholder retains existing content) */}
                <div className={"panel" + (tab === "anam" ? " active" : "")}>
                  <div className="section">
                    <div className="section-head">
                      <h3>Anamnese · {eixosPreenchidos} de {anamData.length} eixos preenchidos</h3>
                      <span className="legal">{selected?.anoEscolar ? selected.anoEscolar + " · " : ""}{selected?.turma || ""} · {selected?.diag || ""}</span>
                      <button className="btn btn-secondary" onClick={() => { setAnamPrintMode("completo"); setAnamPrintOpen(true); }}><Printer size={14} /> Imprimir Anamnese</button>
                      <button className="btn btn-primary bg-orange-400 text-orange-400"><Sparkles size={14} /> Sugerir com a Sofia</button>
                      <button className="btn btn-primary bg-orange-400 text-orange-400" onClick={() => saveTab("Anamnese")}><CheckCircle2 size={14} /> Salvar</button>
                    </div>
                    {/* Ano de Referência Pedagógico — define o parâmetro
                        pedagógico real do aluno, que pode diferir do ano de
                        matrícula. A Sofia respeita este valor em toda geração
                        de conteúdo (atividades, adaptações, pareceres, PEI). */}
                    {selected && (() => {
                      const ref = selected.anoReferenciaPedagogico || "";
                      const divergente = isAnoReferenciaDivergente(
                        selected.anoEscolar,
                        ref,
                      );
                      return (
                        <div
                          style={{
                            marginTop: 10,
                            background: "#fff",
                            border: "1px solid var(--border)",
                            borderRadius: 10,
                            padding: "12px 14px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                          }}
                        >
                          <label
                            htmlFor="ano-ref-pedagogico"
                            style={{ fontSize: 13, fontWeight: 700 }}
                          >
                            📚 Ano de Referência Pedagógico
                          </label>
                          <select
                            id="ano-ref-pedagogico"
                            value={ref}
                            onChange={(e) =>
                              setAnoReferenciaPedagogico(e.target.value)
                            }
                            style={{
                              padding: "8px 10px",
                              border: "1px solid var(--border)",
                              borderRadius: 8,
                              fontSize: 13,
                              background: "#fff",
                              maxWidth: 460,
                            }}
                          >
                            <option value="">Selecione…</option>
                            {ANO_REFERENCIA_GROUPS.map((g) => (
                              <optgroup
                                key={g.label}
                                label={`${g.emoji} ${g.label.toUpperCase()}`}
                              >
                                {g.options.map((o) => (
                                  <option key={o} value={o}>{o}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 11.5,
                              color: "var(--muted)",
                            }}
                          >
                            O ano de referência indica o nível pedagógico em
                            que o aluno se encontra — pode ser diferente do
                            ano escolar em que está matriculado. A Sofia usa
                            este valor ao gerar atividades, adaptações,
                            planejamentos, pareceres e PEI.
                          </p>
                          {divergente && (
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 11.5,
                                color: "#9A3412",
                                background: "#FFF7ED",
                                border: "1px solid #FED7AA",
                                borderRadius: 8,
                                padding: "6px 10px",
                              }}
                            >
                              ⚠️ Ano de referência diferente do ano de
                              matrícula
                              {selected.anoEscolar
                                ? ` (matriculado em ${selected.anoEscolar})`
                                : ""}.
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    <p style={{ color: "var(--muted)", fontSize: 13 }}>Clique em cada eixo para abrir os descritores e marcar o status: <b>Não observado</b>, <b>Não alcançado</b>, <b>Em desenvolvimento</b> ou <b>Consolidado</b>. As barras se atualizam automaticamente.</p>
                    <div className="anam-list">
                      {anamData.map((e, ei) => {
                        const p = eixoPct(e.items);
                        const tone = eixoTone(p, e.items);
                        const open = !!anamOpen[e.l];
                        const sugs = (isEISelected ? ANAM_SUGESTOES_EI[e.l] : ANAM_SUGESTOES[e.l]) || ANAM_SUGESTOES[e.l] || [];
                        const sugVisible = sugOpenFor === e.l;
                        return (
                          <div className="anam-item" key={e.l}>
                            <button
                              className={"anam-summary" + (open ? " open" : "")}
                              onClick={() => setAnamOpen((o) => ({ ...o, [e.l]: !o[e.l] }))}
                              aria-expanded={open}
                            >
                              <div className="label">
                                <b>{e.l} <span style={{ fontWeight: 500, color: "var(--muted)", fontSize: 11 }}>· {e.items.length} descritores</span></b>
                                <div className="bar"><div className={tone} style={{ width: p + "%" }} /></div>
                              </div>
                              <span className="pct">{p}%</span>
                              <ChevronRight size={16} className="chev" />
                            </button>
                            {open && (
                              <div className="anam-body">
                                {e.items.map((it, ii) => (
                                  <div className="anam-desc" key={ii}>
                                    <p>{it.d}</p>
                                    <div className="anam-status-group" role="radiogroup" aria-label={it.d}>
                                      {(["naoObservado", "naoAlcancado", "desenvolvimento", "consolidado"] as AnamStatus[]).map((s) => (
                                        <button
                                          key={s}
                                          className={"anam-status-btn " + s + (it.s === s ? " active" : "")}
                                          onClick={() => setItemStatus(ei, ii, s)}
                                          role="radio"
                                          aria-checked={it.s === s}
                                        >
                                          {ANAM_STATUS_LABEL[s]}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                                <div style={{ background:"#fff", border:"1px solid var(--border)", borderRadius:9, padding:"10px 12px", display:"flex", flexDirection:"column", gap:8 }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                                    <b style={{ fontSize:12.5 }}>Observações do eixo</b>
                                    <span style={{ fontSize:11, color:"var(--muted)" }}>(salva automaticamente)</span>
                                    {sugs.length > 0 && (
                                      <button
                                        type="button"
                                        className="inc-btn-ghost"
                                        style={{ marginLeft:"auto" }}
                                        onClick={() => setSugOpenFor(sugVisible ? null : e.l)}
                                      >
                                        <Lightbulb size={13} /> Sugestões rápidas
                                      </button>
                                    )}
                                  </div>
                                  {sugVisible && (
                                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                                      {sugs.map((s) => (
                                        <button
                                          key={s}
                                          type="button"
                                          className="anam-status-btn"
                                          onClick={() => appendEixoSugestao(ei, s)}
                                          title="Adicionar à observação"
                                        >
                                          + {s}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  <textarea
                                    value={e.obs || ""}
                                    onChange={(ev) => setEixoObs(ei, ev.target.value)}
                                    placeholder="Anote observações sobre este eixo…"
                                    style={{ width:"100%", minHeight:70, padding:"8px 10px", border:"1px solid var(--border)", borderRadius:8, resize:"vertical", fontFamily:"inherit", fontSize:12.5, color:"var(--text)", background:"#fff" }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: 16, background:"#fff", border:"1px solid var(--border)", borderRadius:10, padding:"12px 14px", display:"flex", flexDirection:"column", gap:8 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                        <b style={{ fontSize: 13 }}>Observações gerais sobre o(a) aluno(a)</b>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>
                          (a Sofia usa este texto ao gerar PEI, pareceres e relatórios)
                        </span>
                      </div>
                      <textarea
                        value={anamObsGeral}
                        onChange={(ev) => setAnamObsGeral(ev.target.value)}
                        placeholder="Descreva aqui contexto familiar, comportamentos recorrentes, avanços, dificuldades, hipóteses pedagógicas ou qualquer informação relevante que a Sofia deva considerar…"
                        style={{ width:"100%", minHeight:120, padding:"10px 12px", border:"1px solid var(--border)", borderRadius:8, resize:"vertical", fontFamily:"inherit", fontSize:13, color:"var(--text)", background:"#fff" }}
                      />
                    </div>
                  </div>
                </div>

                <div className={"panel" + (tab === "plan" ? " active" : "")}>
                  <div className="section">
                    <div className="section-head">
                      <h3>Planejamento adaptado · {selected?.name || ""}</h3>
                      <span className="legal">{selected?.anoEscolar || "Ano escolar não informado"} · {selected?.turma || ""}</span>
                      <button className="btn btn-primary bg-orange-400 text-orange-400" onClick={() => setAdaptOpen(true)}><Sparkles size={14} /> Gerar novo plano adaptado</button>
                      <button className="btn btn-primary bg-orange-400 text-orange-400" onClick={() => setPeriodoOpen(true)}><Sparkles size={14} /> Atividades do período</button>
                      {studentPlans.length > 0 && (
                        <button
                          className="btn btn-primary bg-orange-400 text-orange-400"
                          onClick={abrirAgendarPeriodo}
                          disabled={agendando}
                          title="A Sofia distribui as atividades selecionadas em dias úteis na sua agenda."
                        >
                          <Sparkles size={14} /> {agendando ? "Agendando…" : `Sofia preencher agenda${selecionadosCount ? ` (${selecionadosCount})` : ""}`}
                        </button>
                      )}
                      {studentPlans.length > 0 && (
                        <button
                          className="btn btn-primary bg-orange-400 text-orange-400"
                          onClick={imprimirSelecionados}
                          disabled={selecionadosCount === 0}
                          title="Imprime as atividades selecionadas no modo escolhido."
                        >
                          <Printer size={14} /> Imprimir{selecionadosCount ? ` (${selecionadosCount})` : ""}
                        </button>
                      )}
                      <button className="btn btn-primary bg-orange-400 text-orange-400" onClick={() => saveTab("Planejamento")}><CheckCircle2 size={14} /> Salvar</button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "8px 0 14px" }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>Ano de referência</label>
                      <select
                        value={planYearFilter}
                        onChange={(e) => setPlanYearFilter(e.target.value)}
                        style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "#fff", fontFamily: "inherit", fontSize: 13, minWidth: 220 }}
                      >
                        <option value="">Apenas este aluno</option>
                        {[
                          "Educação Infantil",
                          "1º Ano EF","2º Ano EF","3º Ano EF","4º Ano EF","5º Ano EF",
                          "6º Ano EF","7º Ano EF","8º Ano EF","9º Ano EF",
                          "1ª Série EM","2ª Série EM","3ª Série EM",
                        ].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    {planYearFilter ? (
                      <div className="plan-list">
                        {students.filter(s => s.anoEscolar === planYearFilter).length === 0 ? (
                          <div style={{ background: "#fff", border: "1px dashed var(--border)", borderRadius: 11, padding: 18, color: "var(--muted)", fontSize: 13 }}>
                            Nenhum aluno encontrado em <b>{planYearFilter}</b>.
                          </div>
                        ) : students.filter(s => s.anoEscolar === planYearFilter).map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => openStudent(s.id)}
                            className="plan-item"
                            style={{ textAlign: "left", cursor: "pointer", background: s.id === selectedId ? "var(--accent-soft)" : "#fff" }}
                          >
                            <div className="when">Aluno<b>{s.initials}</b></div>
                            <div>
                              <h5>{s.name}</h5>
                              <div className="meta-row">
                                <span>{s.turma}</span>
                                <span className="bncc">{s.anoEscolar}</span>
                                <span>{s.diag}</span>
                              </div>
                            </div>
                            <span className="inc-btn-ghost"><ChevronRight size={12} /> Abrir</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="plan-list">
                        {studentPlans.length > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 2px" }}>
                            <button type="button" className="inc-btn-ghost" onClick={toggleSelTodos}>
                              {todosSelecionados ? "Desmarcar todos" : "Selecionar todos"}
                            </button>
                            <span style={{ fontSize: 12, color: "var(--muted)" }}>
                              {selecionadosCount} de {studentPlans.length} selecionado(s)
                            </span>
                            <div style={{ marginLeft: "auto", display: "inline-flex", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                              {(["completo", "topicos"] as const).map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setPlanViewMode(m)}
                                  style={{
                                    padding: "6px 12px", fontSize: 12, fontWeight: 600,
                                    background: planViewMode === m ? "var(--accent)" : "#fff",
                                    color: planViewMode === m ? "#fff" : "var(--text)",
                                    border: "none", cursor: "pointer",
                                  }}
                                >
                                  {m === "completo" ? "Plano completo" : "Apenas tópicos"}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {studentPlans.length === 0 ? (
                          <div style={{ background: "#fff", border: "1px dashed var(--border)", borderRadius: 11, padding: 22, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                            Nenhum plano de aula registrado para <b>{selected?.name || "este aluno"}</b> ainda.<br />
                            Use <b>Gerar novo plano adaptado</b> para começar.
                          </div>
                        ) : studentPlans.map((p) => (
                          planViewMode === "topicos" ? (
                          <div className="plan-item" key={p.id} style={{ gridTemplateColumns: "auto 1fr auto", padding: "10px 14px" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11.5, color: "var(--muted)" }}>
                              <input
                                type="checkbox"
                                checked={!!agendarSel[p.id]}
                                onChange={(e) => setAgendarSel((s) => ({ ...s, [p.id]: e.target.checked }))}
                                style={{ cursor: "pointer" }}
                              />
                              {p.data ? p.data.split("-").reverse().slice(0,2).join("/") : "—"}
                            </label>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
                              <span className="bncc" style={{ fontSize: 11 }}>{p.disciplina || "Aula"}</span>
                              <b style={{ fontSize: 13.5 }}>{p.tema || p.titulo}</b>
                            </div>
                            <button className="inc-btn-ghost" onClick={() => setViewPlanId(p.id)}>
                              <BookOpen size={12} /> Abrir
                            </button>
                          </div>
                          ) : (
                          <div className="plan-item" key={p.id}>
                            <div className="when">
                              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", textTransform: "none", fontSize: 11 }}>
                                <input
                                  type="checkbox"
                                  checked={!!agendarSel[p.id]}
                                  onChange={(e) => setAgendarSel((s) => ({ ...s, [p.id]: e.target.checked }))}
                                  style={{ cursor: "pointer" }}
                                />
                                Agendar
                              </label>
                              <b style={{ marginTop: 4 }}>{p.disciplina || "Aula"}</b>
                            </div>
                            <div>
                              <h5>{p.titulo}</h5>
                              <div className="meta-row">
                                <span>{p.tema || p.tipoAtividade}</span>
                                {p.habilidades?.[0]?.codigo && <span className="bncc">{p.habilidades[0].codigo}</span>}
                                <span className="adapted">Adaptado pela Sofia</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>Dia</label>
                                <input
                                  type="date"
                                  value={p.data}
                                  onChange={(e) => updatePlan(p.id, { data: e.target.value })}
                                  style={{ padding: "5px 8px", border: "1px solid var(--border)", borderRadius: 7, fontSize: 12, fontFamily: "inherit", background: "#fff" }}
                                />
                              </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <button
                                className="inc-btn-ghost"
                                onClick={() => setViewPlanId(p.id)}
                              ><BookOpen size={12} /> Abrir / Editar</button>
                              <button
                                className="inc-btn-ghost"
                                onClick={() => {
                                  if (!selectedId) return;
                                  if (!confirm(`Excluir o plano "${p.titulo}"?`)) return;
                                  setPlansByStudent((all) => ({ ...all, [selectedId]: (all[selectedId] || []).filter((x) => x.id !== p.id) }));
                                  toast.success("Plano excluído");
                                }}
                              ><X size={12} /> Excluir</button>
                            </div>
                          </div>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className={"panel" + (tab === "reg" ? " active" : "")}>
                  <div className="section">
                    <div className="section-head">
                      <h3>Registros pedagógicos · {studentRegs.length}</h3>
                      <button className="btn btn-primary bg-orange-400 text-orange-400" onClick={() => setRegModalOpen(true)}><Plus size={14} /> Novo registro</button>
                      <button className="btn btn-primary bg-orange-400 text-orange-400" onClick={() => saveTab("Registros")}><CheckCircle2 size={14} /> Salvar</button>
                    </div>
                    <div className="reg-filters">
                      {([
                        { k: "todos", l: "Todos" },
                        { k: "ped", l: "Pedagógicos" },
                        { k: "com", l: "Comportamentais" },
                        { k: "sen", l: "Sensoriais" },
                        { k: "fam", l: "Família" },
                      ] as const).map(f => {
                        const count = f.k === "todos" ? studentRegs.length : studentRegs.filter(r => r.cat === f.k).length;
                        return (
                          <button key={f.k} type="button" onClick={() => setRegFilter(f.k)} className={"reg-filter" + (regFilter === f.k ? " active" : "")}>{f.l} · {count}</button>
                        );
                      })}
                    </div>
                    <div className="reg-list">
                      {studentRegs.filter(r => regFilter === "todos" || r.cat === regFilter).length === 0 ? (
                        <div style={{ background: "#fff", border: "1px dashed var(--border)", borderRadius: 11, padding: 22, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                          Nenhum registro ainda. Clique em <b>Novo registro</b> para começar.
                        </div>
                      ) : studentRegs.filter(r => regFilter === "todos" || r.cat === regFilter).map((r) => (
                        <div className="reg-item" key={r.id}>
                          <div className="reg-item-head">
                            <span className="reg-when">{r.when}</span>
                            <span className="reg-author">· {r.who}</span>
                            <span className={"reg-cat " + r.cat}>{REG_CAT_LABEL[r.cat]}</span>
                          </div>
                          <div className="reg-body">{r.body}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={"panel" + (tab === "rel" ? " active" : "")}>
                  <div className="section">
                    <div className="section-head">
                      <h3>Relatórios · Pareceres descritivos</h3>
                      <span className="legal">Lei 14.254/2021</span>
                      <button className="btn btn-primary bg-orange-400 text-orange-400" onClick={() => saveTab("Relatórios")}><CheckCircle2 size={14} /> Salvar</button>
                    </div>
                    <div className="rel-feature">
                      <h4>Parecer descritivo · {relIntervalo.label}</h4>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", marginBottom: 12, padding: 12, background: "#fff", border: "1px solid var(--border)", borderRadius: 10 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>Período</label>
                          <select value={relTipo} onChange={(e) => setRelTipo(e.target.value as RelTipo)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, background: "#fff" }}>
                            <option value="bimestre">Bimestral</option>
                            <option value="trimestre">Trimestral</option>
                            <option value="semestre">Semestral</option>
                            <option value="anual">Anual</option>
                          </select>
                        </div>
                        {relTipo !== "anual" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>Qual</label>
                            <select value={relNumero} onChange={(e) => setRelNumero(parseInt(e.target.value))} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, background: "#fff" }}>
                              {Array.from({ length: relMaxNumero }).map((_, i) => (
                                <option key={i + 1} value={i + 1}>{i + 1}º</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>Ano letivo</label>
                          <select value={relAno} onChange={(e) => setRelAno(parseInt(e.target.value))} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, background: "#fff" }}>
                            {[0, -1, -2].map((d) => {
                              const y = new Date().getFullYear() + d;
                              return <option key={y} value={y}>{y}</option>;
                            })}
                          </select>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>Formato</label>
                          <select value={relFormato} onChange={(e) => setRelFormato(e.target.value as "" | "topicos" | "texto")} style={{ padding: "6px 10px", borderRadius: 8, border: relFormato ? "1px solid var(--border)" : "1px solid #F97316", fontSize: 13, background: "#fff" }}>
                            <option value="" disabled>Escolha o formato…</option>
                            <option value="topicos">Tópicos (estruturado)</option>
                            <option value="texto">Texto corrido</option>
                          </select>
                        </div>
                        <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>
                          {relIntervalo.inicio.toLocaleDateString("pt-BR")} → {relIntervalo.fim.toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                      <p>
                        A Sofia consolida <b>{regsDoPeriodo.length} registro(s)</b> do período
                        {studentPlans.length ? `, ${studentPlans.length} plano(s) PEI` : ""}
                        {anamneseResumo ? " e a anamnese" : ""} de {selected.name.split(" ")[0]} em um parecer pronto para exportar e assinar.
                      </p>
                      {(() => {
                        const peiSel = (peiByStudent[selected.id] || {}) as Record<string, unknown>;
                        const objsArr = (Array.isArray(peiSel.objetivos) ? peiSel.objetivos : []) as unknown[];
                        const temPEI = Boolean(
                          objsArr.length || peiSel.caracterizacao || peiSel.habilidadesDesenvolvidas ||
                          peiSel.adaptacoesCurriculares || peiSel.metodologias
                        );
                        const temAnam = Boolean(anamneseResumo);
                        const temRegs = regsDoPeriodo.length > 0;
                        const items = [
                          { ok: temAnam, label: "Anamnese", detail: temAnam ? "eixos preenchidos" : "ainda não preenchida" },
                          { ok: temRegs, label: "Registros do período", detail: temRegs ? `${regsDoPeriodo.length} registro(s)` : "nenhum no período" },
                          { ok: temPEI, label: "PEI", detail: temPEI ? `${objsArr.length} objetivo(s)` : "ainda não cadastrado" },
                        ];
                        return (
                          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: 12, margin: "10px 0", display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                              Fontes que serão usadas no parecer
                            </div>
                            {items.map((it) => (
                              <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                                <span aria-hidden style={{
                                  width: 18, height: 18, borderRadius: 5, display: "inline-flex", alignItems: "center", justifyContent: "center",
                                  background: it.ok ? "#DCFCE7" : "#F3F4F6",
                                  color: it.ok ? "#166534" : "#9CA3AF",
                                  border: `1px solid ${it.ok ? "#86EFAC" : "#E5E7EB"}`,
                                  fontWeight: 800, fontSize: 12, lineHeight: 1,
                                }}>{it.ok ? "✓" : "—"}</span>
                                <b style={{ color: it.ok ? "var(--text)" : "var(--muted)" }}>{it.label}</b>
                                <span style={{ color: "var(--muted)", fontSize: 12 }}>· {it.detail}</span>
                              </div>
                            ))}
                            {!items.some((i) => i.ok) && (
                              <p style={{ fontSize: 11.5, color: "#B45309", margin: "4px 0 0" }}>
                                Preencha pelo menos uma fonte (anamnese, PEI ou registros) para gerar o parecer.
                              </p>
                            )}
                            {!temPEI && items.some((i) => i.ok) && (
                              <p style={{ fontSize: 11.5, color: "#B45309", margin: "4px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
                                ⚠️ Este aluno não possui PEI salvo. O relatório será gerado com base na anamnese e nos registros disponíveis.{" "}
                                <button type="button" className="inc-btn-ghost" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => setPeiOpen(true)}>
                                  Criar PEI antes
                                </button>
                              </p>
                            )}
                            {temPEI && (
                              <p style={{ fontSize: 11.5, color: "#065F46", margin: "4px 0 0" }}>
                                📋 PEI do aluno será considerado pela Sofia ao gerar este relatório.
                              </p>
                            )}
                          </div>
                        );
                      })()}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {(() => {
                          const peiSel = (peiByStudent[selected.id] || {}) as Record<string, unknown>;
                          const temPEI = Boolean(
                            (Array.isArray(peiSel.objetivos) && peiSel.objetivos.length) ||
                            peiSel.caracterizacao || peiSel.habilidadesDesenvolvidas ||
                            peiSel.adaptacoesCurriculares || peiSel.metodologias
                          );
                          const semDados = regsDoPeriodo.length === 0 && !anamneseResumo && !temPEI;
                          return (
                        <button
                          className="btn btn-primary bg-orange-400 text-orange-400"
                          onClick={handleGerarParecer}
                          disabled={gerandoParecer || semDados || !relFormato}
                          title={!relFormato ? "Escolha o formato (texto corrido ou estruturado) antes de gerar." : (semDados ? "Preencha a anamnese, o PEI ou adicione registros para gerar o parecer." : "")}
                        >
                          <Sparkles size={14} /> {gerandoParecer ? "Gerando…" : (parecerAtual ? "Regenerar com a Sofia" : "Gerar com a Sofia")}
                        </button>
                          );
                        })()}
                        {parecerAtual && (
                          <button className="inc-btn-ghost" onClick={() => setPreviewParecerOpen(true)}>
                            <FileText size={14} /> Pré-visualizar
                          </button>
                        )}
                        {parecerAtual && (
                          <button className="inc-btn-ghost" onClick={() => { startEditParecer(); setPreviewParecerOpen(true); }}>
                            <Pencil size={14} /> Editar
                          </button>
                        )}
                        {parecerAtual && (
                          <button className="inc-btn-ghost" onClick={exportarParecerWord}>
                            <FileDown size={14} /> Salvar em Word
                          </button>
                        )}
                        {parecerAtual && (
                          <button className="inc-btn-ghost" onClick={imprimirParecer}>
                            <Printer size={14} /> Imprimir / PDF
                          </button>
                        )}
                        {selected && (
                          <GerarRelatorioButton
                            defaultAlunoClientId={selected.id}
                            forcarTipo="pcd"
                            label="Novo editor de Relatório"
                          />
                        )}
                      </div>
                      {parecerAtual && (
                        <div style={{ marginTop: 14, padding: 14, background: "#fff", border: "1px solid var(--border)", borderRadius: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <b style={{ fontFamily: "'Fraunces',serif", fontSize: 15 }}>{parecerAtual.titulo || "Parecer descritivo"}</b>
                            <span style={{ fontSize: 11, color: "var(--muted)" }}>
                              {parecerAtual.periodoLabel ? `${parecerAtual.periodoLabel} · ` : ""}Gerado em {parecerAtual.geradoEm}
                            </span>
                          </div>
                          {parecerAtual.peiConsiderado ? (
                            <div style={{ fontSize: 11.5, color: "#065F46", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 6, padding: "6px 10px" }}>
                              ✅ PEI do aluno considerado na geração deste relatório
                              {parecerAtual.peiAtualizadoEm ? ` (versão de ${parecerAtual.peiAtualizadoEm})` : ""}.
                            </div>
                          ) : (
                            <div style={{ fontSize: 11.5, color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 6, padding: "6px 10px" }}>
                              ⚠️ Gerado sem PEI cadastrado — para um relatório mais preciso, cadastre o PEI do aluno.
                            </div>
                          )}
                          {parecerAtual.formato === "texto" && parecerAtual.texto ? (
                            <div style={{ fontSize: 13, lineHeight: 1.6, textAlign: "justify" }}>
                              {parecerAtual.texto.split(/\n+/).map((p, i) => <p key={i} style={{ margin: "0 0 8px" }}>{p}</p>)}
                            </div>
                          ) : (
                            <>
                          {parecerAtual.resumo && <p style={{ margin: 0, fontSize: 13 }}>{parecerAtual.resumo}</p>}
                          {parecerAtual.pedagogico && (<div><b style={{ fontSize: 12 }}>Pedagógico</b><p style={{ margin: "4px 0 0", fontSize: 13 }}>{parecerAtual.pedagogico}</p></div>)}
                          {parecerAtual.comportamental && (<div><b style={{ fontSize: 12 }}>Comportamental</b><p style={{ margin: "4px 0 0", fontSize: 13 }}>{parecerAtual.comportamental}</p></div>)}
                          {parecerAtual.sensorial && (<div><b style={{ fontSize: 12 }}>Sensorial</b><p style={{ margin: "4px 0 0", fontSize: 13 }}>{parecerAtual.sensorial}</p></div>)}
                          {parecerAtual.familia && (<div><b style={{ fontSize: 12 }}>Família</b><p style={{ margin: "4px 0 0", fontSize: 13 }}>{parecerAtual.familia}</p></div>)}
                          {parecerAtual.avancos && parecerAtual.avancos.length > 0 && (
                            <div><b style={{ fontSize: 12 }}>Avanços</b>
                              <ul style={{ margin: "4px 0 0 18px", fontSize: 13 }}>{parecerAtual.avancos.map((a, i) => <li key={i}>{a}</li>)}</ul>
                            </div>
                          )}
                          {parecerAtual.desafios && parecerAtual.desafios.length > 0 && (
                            <div><b style={{ fontSize: 12 }}>Desafios</b>
                              <ul style={{ margin: "4px 0 0 18px", fontSize: 13 }}>{parecerAtual.desafios.map((a, i) => <li key={i}>{a}</li>)}</ul>
                            </div>
                          )}
                          {parecerAtual.encaminhamentos && parecerAtual.encaminhamentos.length > 0 && (
                            <div><b style={{ fontSize: 12 }}>Encaminhamentos</b>
                              <ul style={{ margin: "4px 0 0 18px", fontSize: 13 }}>{parecerAtual.encaminhamentos.map((a, i) => <li key={i}>{a}</li>)}</ul>
                            </div>
                          )}
                          {parecerAtual.comunicacao_familias && (
                            <div style={{ background: "var(--accent-soft)", padding: 10, borderRadius: 8 }}>
                              <b style={{ fontSize: 12 }}>Comunicação à família</b>
                              <p style={{ margin: "4px 0 0", fontSize: 13 }}>{parecerAtual.comunicacao_familias}</p>
                            </div>
                          )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <h4 style={{ fontFamily: "'Fraunces',serif", fontSize: 15, margin: "16px 0 10px" }}>Pareceres anteriores · 2025</h4>
                    <div className="rel-list">
                      {REL_PAST.map((r) => (
                        <div className="rel-row" key={r.bim}>
                          <div className="ico"><FileText size={16} /></div>
                          <div className="info">
                            <b>{r.bim}</b>
                            <span>Emitido em {r.date}</span>
                          </div>
                          <span className={"rel-status " + r.status}>{r.statusLabel}</span>
                          <div className="rel-actions">
                            <button className="inc-btn-ghost"><Download size={12} /> PDF</button>
                            <button className="inc-btn-ghost">Reabrir</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="rel-suggest">
                      <h5>Próximos pareceres sugeridos pela Sofia</h5>
                      <ul>
                        <li>Relatório intermediário de progresso · objetivo PEI #1 (Leitura silábica) — sugerido para 20/05.</li>
                        <li>Comunicado à família · avanços em Matemática concreta — pronto para enviar.</li>
                        <li>Anexo BNCC Inclusão para conselho de classe de junho — base já consolidada.</li>
                      </ul>
                    </div>
                  </div>
                </div>

              </>
            )}
          </div>
        </main>
      </div>

      {/* Tutorial */}
      <div className={"inc-modal-overlay" + (tutorialOpen ? " open" : "")} onClick={(e) => { if (e.target === e.currentTarget) setTutorialOpen(false); }}>
        <div className="inc-modal" style={{ maxWidth: 680 }}>
          <div className="inc-modal-bar" />
          <div className="inc-modal-head">
            <h2>Tutorial · Como usar a Inclusão</h2>
            <span className="meta">~3 min de leitura</span>
            <button className="inc-modal-close" onClick={() => setTutorialOpen(false)} aria-label="Fechar"><X size={16} /></button>
          </div>
          <div className="inc-modal-body plain">
            {TUTORIAL_STEPS.map((s, i) => (
              <div className="inc-tut-step" key={i}>
                <div className="inc-tut-num">{i + 1}</div>
                <div><b>{s.t}</b><p>{s.d}</p></div>
              </div>
            ))}
          </div>
          <div className="inc-modal-foot">
            <span className="legal">Pode chamar a Sofia a qualquer momento clicando em "Assistente IA"</span>
            <button className="btn btn-primary bg-orange-400 text-orange-400" onClick={() => setTutorialOpen(false)}>Entendi, começar</button>
          </div>
        </div>
      </div>

      {/* Adaptar aula */}
      <PlanoInclusaoModal
        open={adaptOpen}
        onClose={() => setAdaptOpen(false)}
        aluno={selected ? { id: selected.id, name: selected.name, diag: selected.diag, cid: selected.cid, anoEscolar: selected.anoEscolar, anoReferenciaPedagogico: selected.anoReferenciaPedagogico, turma: selected.turma } : null}
        anamneseResumo={anamneseResumo}
        peiResumo={selectedId ? buildPEIContext(peiByStudent[selectedId] as PEIData || {}) : ""}
        historico={studentPlans.slice(0, 6).map((p) => {
          const habs = (p.habilidades ?? []).map((h) => h.codigo).filter(Boolean).join(", ");
          return `${p.data ?? ""} — "${p.tema || p.disciplina || "atividade"}"${habs ? ` [${habs}]` : ""}`;
        })}
        diarioBordo={m6EntriesGlobal
          .filter((e) => !selected?.turma || e.turma === selected.turma)
          .slice(0, 8)
          .map((e) => ({ emoji: e.emoji, titulo: e.title, texto: e.text, tags: e.tags, data: e.date, turma: e.turma, atividadeTitulo: e.atividadeTitulo }))}
        onSaved={(novo) => {
          setPlansByStudent((all) => ({ ...all, [novo.alunoId]: [novo, ...(all[novo.alunoId] || [])] }));
        }}
      />

      {/* Atividades do período (bimestre/trimestre/semestre) */}
      <PlanoPeriodoModal
        open={periodoOpen}
        onClose={() => setPeriodoOpen(false)}
       aluno={selected ? { id: selected.id, name: selected.name, diag: selected.diag, cid: selected.cid, anoEscolar: selected.anoEscolar, anoReferenciaPedagogico: selected.anoReferenciaPedagogico, turma: selected.turma } : null}
        anamneseResumo={anamneseResumo}
        peiResumo={selectedId ? buildPEIContext(peiByStudent[selectedId] as PEIData || {}) : ""}
        onSavedMany={(novos) => {
          if (!novos.length) return;
          const aid = novos[0].alunoId;
          setPlansByStudent((all) => ({ ...all, [aid]: [...novos, ...(all[aid] || [])] }));
        }}
      />

      {/* Visualizar / editar plano salvo */}
      <PlanoInclusaoVisualizarModal
        open={!!viewingPlan}
        plano={viewingPlan}
        onClose={() => setViewPlanId(null)}
        onSave={(patch) => {
          if (viewPlanId) {
            updatePlan(viewPlanId, patch);
            toast.success("Plano atualizado");
          }
        }}
      />

      {/* Período do agendamento */}
      <div className={"inc-modal-overlay" + (agendarPeriodOpen ? " open" : "")} onClick={(e) => { if (e.target === e.currentTarget) setAgendarPeriodOpen(false); }}>
        <div className="inc-modal" style={{ maxWidth: 520 }}>
          <div className="inc-modal-bar" />
          <div className="inc-modal-head">
            <h2>Como distribuir as atividades?</h2>
            <span className="meta">{selecionadosCount} atividade(s) selecionada(s)</span>
            <button className="inc-modal-close" onClick={() => setAgendarPeriodOpen(false)} aria-label="Fechar"><X size={16} /></button>
          </div>
          <div className="inc-modal-body plain" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>
              A Sofia distribui as atividades em dias úteis a partir de hoje, conforme o período escolhido.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {([
                { k: "dia", l: "Dia", d: "Todas no mesmo dia útil" },
                { k: "semana", l: "Semana", d: "Próximos 7 dias" },
                { k: "mes", l: "Mês", d: "Próximos 30 dias" },
                { k: "bimestre", l: "Bimestre", d: "Próximos 60 dias" },
                { k: "trimestre", l: "Trimestre", d: "Próximos 90 dias" },
                { k: "semestre", l: "Semestre", d: "Próximos 180 dias" },
              ] as Array<{ k: PeriodoAg; l: string; d: string }>).map((opt) => {
                const ativo = periodoAg === opt.k;
                return (
                  <button
                    key={opt.k}
                    type="button"
                    onClick={() => setPeriodoAg(opt.k)}
                    style={{
                      textAlign: "left", padding: "10px 12px", borderRadius: 9, cursor: "pointer",
                      border: ativo ? "2px solid var(--accent)" : "1px solid var(--border)",
                      background: ativo ? "var(--accent-soft)" : "#fff",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{opt.l}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{opt.d}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="inc-btn-ghost" onClick={() => setAgendarPeriodOpen(false)}>Cancelar</button>
            <button
              className="btn btn-primary bg-orange-400 text-orange-400"
              onClick={agendarPlanos}
              disabled={agendando}
            >
              <Sparkles size={14} /> {agendando ? "Agendando…" : "Confirmar e agendar"}
            </button>
          </div>
        </div>
      </div>

      {/* PEI completo */}
      <PEIFormModal
        open={peiOpen}
        onClose={() => setPeiOpen(false)}
        aluno={selected ? {
          id: selected.id,
          name: selected.name,
          diag: selected.diag,
          cid: selected.cid,
          anoEscolar: selected.anoEscolar,
          turma: selected.turma,
        } : null}
      />

      {/* Objetivos PEI atingidos */}
      {/* Pré-visualização do Parecer */}
      {selected && parecerAtual && (
        <div
          className={"inc-modal-overlay" + (previewParecerOpen ? " open" : "")}
          onClick={(e) => { if (e.target === e.currentTarget && !editandoParecer) setPreviewParecerOpen(false); }}
        >
          <div className="inc-modal" style={{ maxWidth: 860 }}>
            <div className="inc-modal-bar" />
            <div className="inc-modal-head">
              <div>
                <h2>{editandoParecer ? "Editando parecer" : "Pré-visualização do parecer"}</h2>
                <span className="meta" style={{ display: "block", marginTop: 4 }}>
                  {parecerAtual.periodoLabel || ""} · Formato: {parecerAtual.formato === "texto" ? "Texto corrido" : "Tópicos"}
                </span>
              </div>
              <button className="inc-modal-close" onClick={() => { cancelEditParecer(); setPreviewParecerOpen(false); }} aria-label="Fechar"><X size={16} /></button>
            </div>
            <div className="inc-modal-body" style={{ background: "#E5E7EB", padding: 20 }}>
              <div style={{
                background: "#fff",
                margin: "0 auto",
                maxWidth: 720,
                padding: "32px 36px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                fontFamily: "'Inter',Arial,sans-serif",
                color: "#0F1B36",
                fontSize: 13,
                lineHeight: 1.55,
              }}>
                <h1 style={{ fontSize: 22, margin: "0 0 6px", borderBottom: "2px solid #FF7A45", paddingBottom: 6 }}>
                  {parecerAtual.titulo || "Parecer descritivo"}
                </h1>
                <div style={{ fontSize: 11.5, color: "#6B7691", marginBottom: 14 }}>
                  <b>Aluno(a):</b> {selected.name} · {selected.anoEscolar || ""} · {selected.turma || ""}<br />
                  <b>Diagnóstico:</b> {selected.diag || "—"} {selected.cid ? `· ${selected.cid}` : ""}<br />
                  <b>Período:</b> {parecerAtual.periodoLabel || ""} · <b>Gerado em:</b> {parecerAtual.geradoEm || ""}
                </div>
                {editandoParecer && parecerDraft ? (
                  (() => {
                    const taStyle: React.CSSProperties = { width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: 8, fontFamily: "inherit", fontSize: 13, lineHeight: 1.5, color: "#0F1B36", resize: "vertical" };
                    const upd = (patch: Partial<Parecer>) => setParecerDraft((d) => d ? { ...d, ...patch } : d);
                    const updList = (key: "avancos" | "desafios" | "encaminhamentos") => (v: string) =>
                      upd({ [key]: v.split("\n").map((s) => s.trim()).filter(Boolean) } as Partial<Parecer>);
                    const Section = ({ title, value, onChange, rows = 3 }: { title: string; value: string; onChange: (v: string) => void; rows?: number }) => (
                      <div style={{ marginTop: 12 }}>
                        <h3 style={{ fontSize: 12.5, margin: "0 0 4px", color: "#FF7A45", textTransform: "uppercase", letterSpacing: ".05em" }}>{title}</h3>
                        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} style={taStyle} />
                      </div>
                    );
                    if (parecerDraft.formato === "texto") {
                      return (
                        <textarea
                          value={parecerDraft.texto || ""}
                          onChange={(e) => upd({ texto: e.target.value })}
                          rows={18}
                          style={taStyle}
                          placeholder="Texto corrido do parecer…"
                        />
                      );
                    }
                    return (
                      <>
                        <Section title="Resumo" value={parecerDraft.resumo || ""} onChange={(v) => upd({ resumo: v })} rows={2} />
                        <Section title="Pedagógico" value={parecerDraft.pedagogico || ""} onChange={(v) => upd({ pedagogico: v })} />
                        <Section title="Comportamental" value={parecerDraft.comportamental || ""} onChange={(v) => upd({ comportamental: v })} />
                        <Section title="Sensorial" value={parecerDraft.sensorial || ""} onChange={(v) => upd({ sensorial: v })} />
                        <Section title="Família" value={parecerDraft.familia || ""} onChange={(v) => upd({ familia: v })} />
                        <Section title="Avanços (1 por linha)" value={(parecerDraft.avancos || []).join("\n")} onChange={updList("avancos")} rows={4} />
                        <Section title="Desafios (1 por linha)" value={(parecerDraft.desafios || []).join("\n")} onChange={updList("desafios")} rows={3} />
                        <Section title="Encaminhamentos (1 por linha)" value={(parecerDraft.encaminhamentos || []).join("\n")} onChange={updList("encaminhamentos")} rows={4} />
                        <Section title="Comunicação à família" value={parecerDraft.comunicacao_familias || ""} onChange={(v) => upd({ comunicacao_familias: v })} rows={3} />
                      </>
                    );
                  })()
                ) : parecerAtual.formato === "texto" && parecerAtual.texto ? (
                  <div style={{ textAlign: "justify" }}>
                    {parecerAtual.texto.split(/\n+/).map((p, i) => (
                      <p key={i} style={{ margin: "0 0 10px" }}>{p}</p>
                    ))}
                  </div>
                ) : (
                  <>
                    {parecerAtual.resumo && <p><b>Resumo:</b> {parecerAtual.resumo}</p>}
                    {([
                      ["Pedagógico", parecerAtual.pedagogico],
                      ["Comportamental", parecerAtual.comportamental],
                      ["Sensorial", parecerAtual.sensorial],
                      ["Família", parecerAtual.familia],
                    ] as Array<[string, string | undefined]>).map(([t, c]) => c ? (
                      <div key={t}>
                        <h3 style={{ fontSize: 12.5, margin: "14px 0 4px", color: "#FF7A45", textTransform: "uppercase", letterSpacing: ".05em" }}>{t}</h3>
                        <p style={{ margin: 0 }}>{c}</p>
                      </div>
                    ) : null)}
                    {([
                      ["Avanços", parecerAtual.avancos],
                      ["Desafios", parecerAtual.desafios],
                      ["Encaminhamentos", parecerAtual.encaminhamentos],
                    ] as Array<[string, string[] | undefined]>).map(([t, arr]) => arr && arr.length ? (
                      <div key={t}>
                        <h3 style={{ fontSize: 12.5, margin: "14px 0 4px", color: "#FF7A45", textTransform: "uppercase", letterSpacing: ".05em" }}>{t}</h3>
                        <ul style={{ margin: "4px 0 0 18px" }}>
                          {arr.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      </div>
                    ) : null)}
                    {parecerAtual.comunicacao_familias && (
                      <div>
                        <h3 style={{ fontSize: 12.5, margin: "14px 0 4px", color: "#FF7A45", textTransform: "uppercase", letterSpacing: ".05em" }}>Comunicação à família</h3>
                        <p style={{ margin: 0 }}>{parecerAtual.comunicacao_familias}</p>
                      </div>
                    )}
                  </>
                )}
                <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  <div style={{ borderTop: "1px solid #333", paddingTop: 4, fontSize: 10.5, textAlign: "center" }}>Professor(a) regente</div>
                  <div style={{ borderTop: "1px solid #333", paddingTop: 4, fontSize: 10.5, textAlign: "center" }}>Coordenação pedagógica</div>
                </div>
                <div style={{ marginTop: 18, fontSize: 10, color: "#6B7691", borderTop: "1px dashed #ccc", paddingTop: 6 }}>
                  Documento gerado conforme a Lei nº 14.254/2021, Lei nº 13.146/2015 (LBI) e BNCC.
                </div>
              </div>
            </div>
            <div className="inc-modal-foot" style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              {editandoParecer ? (
                <>
                  <button className="inc-btn-ghost" onClick={cancelEditParecer}>Cancelar</button>
                  <button className="btn btn-primary bg-orange-400 text-orange-400" onClick={saveEditParecer}>
                    <Save size={14} /> Salvar alterações
                  </button>
                </>
              ) : (
                <>
                  <button className="inc-btn-ghost" onClick={() => { cancelEditParecer(); setPreviewParecerOpen(false); }}>Fechar</button>
                  <button className="inc-btn-ghost" onClick={startEditParecer}>
                    <Pencil size={14} /> Editar
                  </button>
                  <button className="inc-btn-ghost" onClick={exportarParecerWord}>
                    <FileDown size={14} /> Salvar em Word
                  </button>
                  <button className="btn btn-primary bg-orange-400 text-orange-400" onClick={() => { setPreviewParecerOpen(false); imprimirParecer(); }}>
                    <Printer size={14} /> Imprimir / PDF
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {selected && (() => {
        const STATUS_OPTS: Array<{ v: string; l: string; color: string }> = [
          { v: "a_fazer", l: "A fazer", color: "#6B7280" },
          { v: "em_construcao", l: "Em construção", color: "#B45309" },
          { v: "realizado", l: "Realizado", color: "#166534" },
        ];
        const PRAZO_LBL: Record<string, string> = { curto: "Curto prazo", medio: "Médio prazo", longo: "Longo prazo" };
        const peiSel = (peiByStudent[selected.id] || {}) as Record<string, unknown>;
        const objs = (Array.isArray(peiSel.objetivos) ? peiSel.objetivos : []) as Array<{ id: string; texto: string; status: string; prazo?: string; criterios?: string }>;
        const atingidos = objs.filter((o) => o.status === "realizado" || o.status === "atingido").length;
        const setStatus = (id: string, status: string) => {
          setPeiByStudent((all) => {
            const cur = (all[selected.id] || {}) as Record<string, unknown>;
            const arr = (Array.isArray(cur.objetivos) ? cur.objetivos : []) as Array<Record<string, unknown>>;
            const next = arr.map((o) => (o.id === id ? { ...o, status } : o));
            return { ...all, [selected.id]: { ...cur, objetivos: next, atualizadoEm: new Date().toISOString() } };
          });
        };
        return (
          <div
            className={"inc-modal-overlay" + (objetivosModalOpen ? " open" : "")}
            onClick={(e) => { if (e.target === e.currentTarget) setObjetivosModalOpen(false); }}
          >
            <div className="inc-modal" style={{ maxWidth: 720 }}>
              <div className="inc-modal-bar" />
              <div className="inc-modal-head">
                <div>
                  <h2>Objetivos do PEI · {selected.name}</h2>
                  <span className="meta" style={{ display: "block", marginTop: 4 }}>
                    {atingidos} de {objs.length} realizado(s) · Lei 14.254/2021
                  </span>
                </div>
                <button className="inc-modal-close" onClick={() => setObjetivosModalOpen(false)} aria-label="Fechar"><X size={16} /></button>
              </div>
              <div className="inc-modal-body" style={{ background: "var(--bg)" }}>
                {objs.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 12px" }}>
                    <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
                      Nenhum objetivo cadastrado no PEI ainda. Abra o PEI para definir metas pedagógicas individualizadas.
                    </p>
                    <button className="btn btn-primary bg-orange-400 text-orange-400" onClick={() => { setObjetivosModalOpen(false); setPeiOpen(true); }}>
                      <FileText size={14} /> Abrir PEI
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {objs.map((o, i) => {
                      const st = STATUS_OPTS.find((s) => s.v === o.status) || STATUS_OPTS[0];
                      return (
                        <div key={o.id} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 999, background: "#E9F0FF", color: "#1F4FB8" }}>#{i + 1}</span>
                            {o.prazo && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
                                {PRAZO_LBL[o.prazo] || o.prazo}
                              </span>
                            )}
                            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: st.color, padding: "3px 8px", borderRadius: 999, background: `${st.color}15` }}>
                              ● {st.l}
                            </span>
                          </div>
                          <p style={{ fontSize: 13, margin: "0 0 8px", color: "var(--text)" }}>{o.texto || <i style={{ color: "var(--muted)" }}>(sem descrição)</i>}</p>
                          {o.criterios && (
                            <p style={{ fontSize: 11.5, margin: "0 0 8px", color: "var(--muted)" }}>
                              <b>Critérios:</b> {o.criterios}
                            </p>
                          )}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {STATUS_OPTS.map((s) => (
                              <button
                                key={s.v}
                                type="button"
                                onClick={() => setStatus(o.id, s.v)}
                                style={{
                                  fontSize: 11, padding: "4px 10px", borderRadius: 999,
                                  border: o.status === s.v ? `1.5px solid ${s.color}` : "1px solid var(--border)",
                                  background: o.status === s.v ? `${s.color}18` : "#fff",
                                  color: o.status === s.v ? s.color : "var(--text)",
                                  cursor: "pointer", fontWeight: o.status === s.v ? 700 : 500,
                                }}
                              >
                                {s.l}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="inc-modal-foot">
                <span className="legal">Status sincronizado com o PEI · Lei 14.254/2021</span>
                <button className="inc-btn-ghost" onClick={() => { setObjetivosModalOpen(false); setPeiOpen(true); }}>
                  <FileText size={14} /> Editar no PEI
                </button>
                <button className="btn btn-primary" onClick={() => setObjetivosModalOpen(false)}>Fechar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Anamnese: Imprimir */}
      <div className={"inc-modal-overlay" + (anamPrintOpen ? " open" : "")} onClick={(e) => { if (e.target === e.currentTarget) setAnamPrintOpen(false); }}>
        <div className="inc-modal" style={{ maxWidth: 880 }}>
          <div className="inc-modal-bar" />
          <div className="inc-modal-head">
            <h2>Anamnese · {selected?.name || ""}</h2>
            <span className="meta">{selected?.anoEscolar || ""}<br />{selected?.turma || ""}</span>
            <button className="inc-modal-close" onClick={() => setAnamPrintOpen(false)} aria-label="Fechar"><X size={16} /></button>
          </div>
          <div className="inc-modal-body">
            <div style={{ display:"flex", gap:6, marginBottom:12, justifyContent:"center" }}>
              <button
                className={"reg-filter" + (anamPrintMode === "completo" ? " active" : "")}
                onClick={() => setAnamPrintMode("completo")}
              >Documento completo</button>
              <button
                className={"reg-filter" + (anamPrintMode === "preenchido" ? " active" : "")}
                onClick={() => setAnamPrintMode("preenchido")}
              >Apenas preenchidos</button>
            </div>
            <div id="anam-print-area">
              <div className="inc-a4">
                <div className="inc-a4-head">
                  <div className="inc-a4-logo">A</div>
                  <div className="center">
                    <b>Documento de Anamnese Pedagógica</b>
                    <span>AgilizaProf · Educação Inclusiva<br />Conforme Lei 14.254/2021 · BNCC Inclusão</span>
                  </div>
                  <div className="stamp">PROTOCOLO<br />#ANAM-{(selected?.id || "").slice(-6).toUpperCase()}<br />{new Date().toLocaleDateString("pt-BR")}</div>
                </div>
                <h1>Anamnese Pedagógica</h1>
                <div className="ident">
                  <span><b>Educando:</b> {selected?.name || "—"}</span>
                  <span><b>Idade:</b> {selected?.age || "—"}</span>
                  <span><b>Ano escolar:</b> {selected?.anoEscolar || "—"}</span>
                  <span><b>Turma:</b> {selected?.turma || "—"}</span>
                  <span><b>Diagnóstico:</b> {selected?.diag || "—"}</span>
                  <span><b>{selected?.cid || "—"}</b></span>
                  <span style={{ gridColumn: "1 / -1" }}><b>AEE:</b> {selected?.aee || "—"}</span>
                </div>
                {anamData.map((e) => {
                  const itemsToShow = anamPrintMode === "completo"
                    ? e.items
                    : e.items.filter((i) => i.s !== "naoObservado");
                  const obsToShow = (e.obs || "").trim();
                  if (anamPrintMode === "preenchido" && itemsToShow.length === 0 && !obsToShow) return null;
                  return (
                    <div key={e.l}>
                      <h2>{e.l}</h2>
                      {itemsToShow.length > 0 ? (
                        <ul>
                          {itemsToShow.map((it, idx) => (
                            <li key={idx}><b>{ANAM_STATUS_LABEL[it.s]}:</b> {it.d}</li>
                          ))}
                        </ul>
                      ) : (
                        anamPrintMode === "completo" && <p style={{ fontStyle:"italic", color:"#555" }}>Nenhum descritor avaliado.</p>
                      )}
                      {obsToShow ? (
                        <p><b>Observações:</b> {obsToShow}</p>
                      ) : (
                        anamPrintMode === "completo" && <p style={{ fontStyle:"italic", color:"#555" }}><b>Observações:</b> ____________________________________________</p>
                      )}
                    </div>
                  );
                })}
                <div style={{ marginTop: 32, display:"grid", gridTemplateColumns:"1fr 1fr", gap: 40, fontFamily:"'Inter',sans-serif", fontSize:12 }}>
                  <div style={{ borderTop:"1px solid #000", paddingTop:6, textAlign:"center" }}>Professor(a) responsável</div>
                  <div style={{ borderTop:"1px solid #000", paddingTop:6, textAlign:"center" }}>Coordenação pedagógica</div>
                </div>
              </div>
            </div>
          </div>
          <div className="inc-modal-foot">
            <span className="legal">{anamPrintMode === "completo" ? "Mostrando todos os eixos (inclusive não preenchidos)." : "Mostrando apenas o que foi preenchido."}</span>
            <button className="inc-btn-ghost" onClick={() => setAnamPrintOpen(false)}>Fechar</button>
            <button
              className="btn btn-secondary"
              onClick={async () => {
                const data = buildAnamneseDocData(selected, anamData, anamPrintMode);
                await downloadAnamneseDocx(data);
              }}
            ><FileText size={14} /> Word (.docx)</button>
            <button
              className="btn btn-primary bg-orange-400 text-orange-400"
              onClick={() => {
                const data = buildAnamneseDocData(selected, anamData, anamPrintMode);
                printAnamneseDocument(data);
              }}
            ><Printer size={14} /> Imprimir / PDF</button>
          </div>
        </div>
      </div>

      {/* Cadastrar aluno */}
      <div className={"inc-modal-overlay" + (newStudentOpen ? " open" : "")} onClick={(e) => { if (e.target === e.currentTarget) fecharModalAluno(); }}>
        <div className="inc-modal" style={{ maxWidth: 560 }}>
          <div className="inc-modal-bar" />
          <div className="inc-modal-head">
            <h2>{editingStudentId ? "Editar dados do aluno" : "Cadastrar novo aluno"}</h2>
            <button className="inc-modal-close" onClick={fecharModalAluno} aria-label="Fechar"><X size={16} /></button>
          </div>
          <form className="inc-modal-body plain" onSubmit={handleSaveStudent} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Nome completo
              <input required value={nsName} onChange={(e) => setNsName(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Ano escolar
              <select
                value={nsAnoEscolar}
                onChange={(e) => setNsAnoEscolar(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, marginTop: 4, background: "#fff", fontFamily: "inherit", fontSize: 13 }}
              >
                <option value="">Não informado</option>
                <option value="Educação Infantil">Educação Infantil</option>
                <option value="1º Ano EF">1º Ano · Ensino Fundamental</option>
                <option value="2º Ano EF">2º Ano · Ensino Fundamental</option>
                <option value="3º Ano EF">3º Ano · Ensino Fundamental</option>
                <option value="4º Ano EF">4º Ano · Ensino Fundamental</option>
                <option value="5º Ano EF">5º Ano · Ensino Fundamental</option>
                <option value="6º Ano EF">6º Ano · Ensino Fundamental</option>
                <option value="7º Ano EF">7º Ano · Ensino Fundamental</option>
                <option value="8º Ano EF">8º Ano · Ensino Fundamental</option>
                <option value="9º Ano EF">9º Ano · Ensino Fundamental</option>
                <option value="1ª Série EM">1ª Série · Ensino Médio</option>
                <option value="2ª Série EM">2ª Série · Ensino Médio</option>
                <option value="3ª Série EM">3ª Série · Ensino Médio</option>
              </select>
            </label>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Turma
              <input
                value={nsTurma}
                onChange={(e) => setNsTurma(e.target.value)}
                list="inc-turmas-cadastradas"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, marginTop: 4 }}
                placeholder={turmasCadastradas.length > 0 ? "Selecione ou digite uma turma" : "Ex.: 2º Ano A"}
              />
              <datalist id="inc-turmas-cadastradas">
                {turmasCadastradas.map((t) => (
                  <option key={t.id} value={t.name}>
                    {[t.school, t.grade, t.shift].filter(Boolean).join(" · ")}
                  </option>
                ))}
              </datalist>
            </label>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Diagnóstico / CID <span style={{ fontWeight: 400, color: "var(--muted)" }}>(pode adicionar mais de um)</span>
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <select
                  value={nsCidPick}
                  onChange={(e) => setNsCidPick(e.target.value)}
                  style={{ flex: 1, minWidth: 0, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "#fff", fontFamily: "inherit", fontSize: 13 }}
                >
                  <option value="nao_informado">Selecione um CID…</option>
                  {CID_OPTIONS.filter((o) => o.value !== "nao_informado" && !nsCids.includes(o.value)).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.cid && o.cid !== "—" ? `${o.label} · CID ${o.cid}` : o.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (nsCidPick && nsCidPick !== "nao_informado" && !nsCids.includes(nsCidPick)) {
                      setNsCids((prev) => [...prev, nsCidPick]);
                      setNsCidPick("nao_informado");
                    }
                  }}
                  disabled={!nsCidPick || nsCidPick === "nao_informado"}
                  style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--cream, #fff5ec)", fontWeight: 700, fontSize: 12, cursor: nsCidPick && nsCidPick !== "nao_informado" ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}
                >
                  ＋ Adicionar
                </button>
              </div>
              {nsCids.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {nsCids.map((v) => {
                    const o = CID_OPTIONS.find((c) => c.value === v);
                    if (!o) return null;
                    const labelShort = o.label.split(" — ")[0];
                    const code = o.cid && o.cid !== "—" ? ` · ${o.cid}` : "";
                    return (
                      <span key={v} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px 4px 10px", background: "var(--cream, #fff5ec)", border: "1px solid var(--border)", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                        {labelShort}{code}
                        <button
                          type="button"
                          aria-label={`Remover ${labelShort}`}
                          onClick={() => setNsCids((prev) => prev.filter((x) => x !== v))}
                          style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--muted)", fontSize: 14, lineHeight: 1, padding: 0 }}
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <label style={{ fontSize: 12, fontWeight: 700 }}>AEE — frequência semanal <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opcional)</span>
              <select
                value={nsAeeDays}
                onChange={(e) => setNsAeeDays(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, marginTop: 4, background: "#fff", fontFamily: "inherit", fontSize: 13 }}
              >
                <option value="">Não informado</option>
                <option value="1">1 dia por semana</option>
                <option value="2">2 dias por semana</option>
                <option value="3">3 dias por semana</option>
                <option value="4">4 dias por semana</option>
                <option value="5">5 dias por semana</option>
              </select>
            </label>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Mediadora <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opcional)</span>
              <input
                value={nsMediadora}
                onChange={(e) => setNsMediadora(e.target.value)}
                placeholder="Nome da mediadora"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, marginTop: 4 }}
              />
            </label>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
              <button type="button" className="inc-btn-ghost" onClick={fecharModalAluno}>Cancelar</button>
              <button type="submit" className="btn btn-primary bg-orange-400 text-orange-400" disabled={savingStudent} aria-busy={savingStudent}>
                {savingStudent ? "Salvando…" : (editingStudentId ? "Salvar alterações" : "Salvar aluno")}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Novo registro */}
      <div className={"inc-modal-overlay" + (regModalOpen ? " open" : "")} onClick={(e) => { if (e.target === e.currentTarget) setRegModalOpen(false); }}>
        <div className="inc-modal" style={{ maxWidth: 600 }}>
          <div className="inc-modal-bar" />
          <div className="inc-modal-head">
            <h2>Novo registro {selected ? "· " + selected.name : ""}</h2>
            <button className="inc-modal-close" onClick={() => setRegModalOpen(false)} aria-label="Fechar"><X size={16} /></button>
          </div>
          <form className="inc-modal-body plain" onSubmit={handleSaveReg} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
              Marque opções e/ou escreva em quantas categorias quiser. Ao salvar, cada categoria preenchida vira um registro próprio.
            </p>
            {(["ped","com","sen","fam"] as RegCat[]).map((k) => {
              const body = nrBodies[k] || "";
              const norm = body.split(/\.\s+/).map((p) => p.replace(/\.$/, "").trim()).filter(Boolean);
              return (
                <div key={k} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12, background: "#fff", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <b style={{ fontSize: 13 }}>{REG_CAT_LABEL[k]}</b>
                    {body.trim() && <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>● selecionado</span>}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {REG_QUICK[k].map((s) => {
                      const sel = norm.includes(s.replace(/\.$/, "").trim());
                      return (
                        <button
                          type="button"
                          key={s}
                          onClick={() => toggleQuick(k, s)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: sel ? "1px solid var(--accent)" : "1px solid var(--border)",
                            background: sel ? "var(--accent)" : "#fff",
                            color: sel ? "#fff" : "var(--text)",
                            fontSize: 12,
                            cursor: "pointer",
                            textAlign: "left",
                            fontWeight: sel ? 600 : 400,
                          }}
                        >{sel ? "✓ " : "+ "}{s}</button>
                      );
                    })}
                  </div>
                  <textarea
                    value={body}
                    onChange={(e) => setNrBodies((prev) => ({ ...prev, [k]: e.target.value }))}
                    rows={2}
                    placeholder={`Descrição livre para ${REG_CAT_LABEL[k]} (opcional)…`}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: 12.5, resize: "vertical" }}
                  />
                </div>
              );
            })}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
              <button type="button" className="inc-btn-ghost" onClick={() => setRegModalOpen(false)}>Cancelar</button>
              <button
                type="submit"
                className="btn btn-primary bg-orange-400 text-orange-400"
                disabled={!(["ped","com","sen","fam"] as RegCat[]).some((c) => (nrBodies[c] || "").trim())}
              ><Plus size={14} /> Salvar registros</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function InclusaoSuggestions({
  entityId,
  onAction,
}: {
  entityId: string;
  onAction?: (s: import("@/components/sofia/SofiaSuggestionCard").SofiaSuggestion) => void;
}) {
  void entityId;
  void onAction;
  return null;
}

function FilterPopover({
  options,
  selected,
  onToggle,
  onClear,
  onClose,
  emptyLabel,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  onClear: () => void;
  onClose: () => void;
  emptyLabel: string;
}) {
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 40 }}
      />
      <div
        role="menu"
        style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          zIndex: 50,
          minWidth: 240,
          maxHeight: 320,
          overflowY: "auto",
          background: "#fff",
          border: "1px solid var(--border, #E5E7EB)",
          borderRadius: 10,
          boxShadow: "0 12px 30px rgba(15,23,42,.12)",
          padding: 8,
        }}
      >
        {options.length === 0 ? (
          <div style={{ padding: "10px 8px", fontSize: 12.5, color: "var(--muted, #64748B)" }}>{emptyLabel}</div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 6px 8px", borderBottom: "1px solid #F1F5F9", marginBottom: 4 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted, #64748B)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                {selected.length} selecionado{selected.length === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                onClick={onClear}
                style={{ fontSize: 11.5, color: "var(--orange, #F97316)", fontWeight: 600 }}
              >
                Limpar
              </button>
            </div>
            {options.map((opt) => {
              const checked = selected.includes(opt);
              return (
                <label
                  key={opt}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 8px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 13,
                    background: checked ? "#FFF7ED" : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(opt)}
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
