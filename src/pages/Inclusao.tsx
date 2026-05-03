import { useState, useEffect, useMemo, type ReactNode } from "react";
import { useSearch, useNavigate } from "@tanstack/react-router";
import {
  HelpCircle, Download, X, Sparkles, BookOpen, FileText, Printer,
  ChevronRight, ArrowLeft, Plus, Search, Send, CheckCircle2, Lightbulb,
} from "lucide-react";
import { AppSidebar, sidebarCss } from "@/components/AppSidebar";
import { EmptyState, emptyStateCss } from "@/components/EmptyState";
import { CID_OPTIONS } from "@/lib/cidsBR";
import { toast } from "sonner";

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
.inc-root .btn-primary{background:#fff!important;color:var(--text)!important;border:1px solid var(--border);box-shadow:none;}
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
.kpi-accent{background:#fff;border:1px solid var(--border);color:var(--text);position:relative;overflow:hidden;}
.kpi-accent::before{display:none;}
.kpi-accent .kpi-label{color:var(--muted);}
.kpi-accent .kpi-value{color:var(--text);}
.kpi-accent .kpi-sub{color:var(--muted);}

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
.section-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;}
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
.inc-modal-close{background:var(--bg);width:34px;height:34px;border-radius:9px;display:grid;place-items:center;color:var(--muted);}
.inc-modal-close:hover{background:var(--danger);color:#fff;}
.inc-modal-body{padding:22px 24px;overflow-y:auto;flex:1;background:#F0F2F7;}
.inc-modal-body.plain{background:#fff;}
.inc-modal-foot{padding:14px 24px;border-top:1px solid var(--border);background:var(--bg);display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.inc-modal-foot .legal{font-size:11.5px;color:var(--muted);flex:1;min-width:180px;}

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

type TabKey = "hoje" | "anam" | "plan" | "reg" | "rel" | "doc";
type ViewKey = "list" | "detail";

type Student = {
  id: string; name: string; initials: string; age: string; turma: string;
  diag: string; cid: string; aee: string; anoEscolar?: string; featured?: boolean;
  anamnese: string; registros: string; trend: string; trendTone: "ok" | "warn" | "muted";
};

const INITIAL_STUDENTS: Student[] = [];

const PEI_EIXOS: Array<{ ic: string; cls: string; h: string; status: string; tone: "ok" | "warn"; meta: string; body: ReactNode }> = [];

const ADAPTACOES: Array<{ n: number; title: string; desc: string; meta: string }> = [];

const TUTORIAL_STEPS = [
  { t: "Selecione o aluno", d: "Na lista de Inclusão, clique no card do aluno para abrir KPIs, eixos do PEI e timeline pedagógica." },
  { t: "Confira a Visão de hoje", d: "A Sofia destaca a aula do dia que precisa de adaptação e propõe estratégias visual, pacing e mediação." },
  { t: "Preencha a Anamnese", d: "Use os 14 eixos guiados. Em cada campo há sugestões rápidas contextuais ao ano e ao diagnóstico." },
  { t: "Gere o Planejamento", d: "Configure período, escolha disciplinas e gere atividades já adaptadas conforme o PEI vigente." },
  { t: "Faça Registros frequentes", d: "Cada registro alimenta o relatório anual. Use observações rápidas para ganhar velocidade." },
  { t: "Gere o Relatório IA", d: "Selecione o período e a Sofia consolida registros + PEI + anamnese em um parecer pronto para exportar." },
];

const PLAN_WEEK: { when: string; date: string; disc: string; title: string; bncc: string; adapted: boolean }[] = [];

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
    { d: "Mãe acompanha tarefas em casa", s: "naoObservado" },
    { d: "Comunicação família-escola via agenda diária", s: "naoObservado" },
  ]},
  { l: "Observações", items: [
    { d: "Observações abertas da equipe pedagógica", s: "naoObservado" },
    { d: "Observações abertas da família", s: "naoObservado" },
  ]},
];

const ANAM_SUGESTOES: Record<string, string[]> = {
  "Ano de Referência": [
    "Está matriculado no ano correspondente à faixa etária.",
    "Reconhece a turma e a professora regente.",
    "Foi reclassificado em relação à idade/série.",
  ],
  "Desempenho Acadêmico": [
    "Lê palavras com sílabas simples (CV) com mediação.",
    "Realiza adições simples até 20 com material concreto.",
    "Escreve o próprio nome de forma legível.",
    "Apresenta dificuldades de leitura coletiva em voz alta.",
  ],
  "Aspectos Pedagógicos": [
    "Permanece na atividade por curtos períodos com mediação.",
    "Aceita apoio visual (pictogramas, fichas).",
    "Tolera mudanças avisadas previamente na rotina.",
  ],
  "Psicomotores": [
    "Coordenação motora ampla preservada.",
    "Coordenação motora fina em desenvolvimento (preensão do lápis, recorte).",
    "Lateralidade ainda não definida.",
  ],
  "Interações Sociais": [
    "Interage melhor em duplas do que em grupos grandes.",
    "Participa de brincadeiras coletivas com mediação.",
    "Respeita turnos em jogos com lembretes.",
  ],
  "Independência": [
    "Vai ao banheiro sem auxílio.",
    "Organiza o próprio material com lembretes.",
    "Lancha sozinho.",
  ],
  "Autonomia": [
    "Pede ajuda quando precisa.",
    "Toma decisões simples (escolher atividade).",
    "Identifica próprias dificuldades.",
  ],
  "Emoção": [
    "Reconhece emoções básicas em si.",
    "Solicita pausa ao perceber sobrecarga.",
    "Aceita estratégias de autorregulação (respiração, fone).",
  ],
  "Memória": [
    "Recupera informações com pistas visuais.",
    "Memoriza rotinas estruturadas.",
    "Lembra dos combinados da turma.",
  ],
  "Dificuldades & Potencialidades": [
    "Dificuldade em leitura coletiva em voz alta.",
    "Potencialidade em raciocínio lógico-matemático concreto.",
    "Boa memória visual.",
  ],
  "Estratégias": [
    "Uso de material concreto em Matemática.",
    "Apoio visual (pictogramas) em Português.",
    "Mediação de pares em atividades em dupla.",
  ],
  "Recursos": [
    "Fones abafadores disponíveis em sala.",
    "Canto da calma estruturado.",
    "Atendimento na sala de AEE 2x/semana.",
  ],
  "Contexto Familiar": [
    "Família participa de reuniões bimestrais.",
    "Responsável acompanha tarefas em casa.",
    "Comunicação família-escola via agenda diária.",
  ],
  "Observações": [
    "Aluno demonstra evolução constante na rotina escolar.",
    "Necessita de acompanhamento contínuo da equipe pedagógica.",
    "Família solicita reuniões periódicas para alinhamento.",
  ],
};

export function Inclusao() {
  const search = useSearch({ from: "/inclusao" }) as { tab?: TabKey; view?: ViewKey; aluno?: string };
  const navigate = useNavigate({ from: "/inclusao" });
  const [students, setStudents] = useState<Student[]>(() => {
    if (typeof window === "undefined") return INITIAL_STUDENTS;
    try {
      const raw = window.localStorage.getItem("inc_students");
      if (raw) return JSON.parse(raw) as Student[];
    } catch { /* ignore */ }
    return INITIAL_STUDENTS;
  });
  useEffect(() => {
    try { window.localStorage.setItem("inc_students", JSON.stringify(students)); } catch { /* ignore */ }
  }, [students]);
  const [view, setView] = useState<ViewKey>(students.length === 0 ? "list" : (search.view || "list"));
  const [selectedId, setSelectedId] = useState<string | null>(search.aluno || null);
  const [nsName, setNsName] = useState("");
  const [nsTurma, setNsTurma] = useState("");
  const [nsAnoEscolar, setNsAnoEscolar] = useState("");
  const [nsCid, setNsCid] = useState("nao_informado");
  const [nsAeeDays, setNsAeeDays] = useState<string>("");
  const [nsMediadora, setNsMediadora] = useState<string>("");
  const [tab, setTab] = useState<TabKey>(search.tab || "hoje");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [adaptOpen, setAdaptOpen] = useState(false);
  const [peiOpen, setPeiOpen] = useState(false);
  const [anamPrintOpen, setAnamPrintOpen] = useState(false);
  const [anamPrintMode, setAnamPrintMode] = useState<"completo" | "preenchido">("completo");
  const [sugOpenFor, setSugOpenFor] = useState<string | null>(null);
  const [newStudentOpen, setNewStudentOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [planYearFilter, setPlanYearFilter] = useState<string>("");
  type RegCat = "ped" | "com" | "sen" | "fam";
  type RegItem = { id: string; when: string; who: string; cat: RegCat; body: string };
  const [regByStudent, setRegByStudent] = useState<Record<string, RegItem[]>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem("inc_reg");
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return {};
  });
  useEffect(() => {
    try { window.localStorage.setItem("inc_reg", JSON.stringify(regByStudent)); } catch { /* ignore */ }
  }, [regByStudent]);
  const [regFilter, setRegFilter] = useState<"todos" | RegCat>("todos");
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [nrCat, setNrCat] = useState<RegCat>("ped");
  const [nrBody, setNrBody] = useState("");
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
  const handleSaveReg = (e: React.FormEvent) => {
    e.preventDefault();
    const body = nrBody.trim();
    if (!body || !studentKey || studentKey === "_none") return;
    const now = new Date();
    const when = now.toLocaleDateString("pt-BR") + " · " + now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const item: RegItem = { id: `r_${Date.now()}`, when, who: "Você", cat: nrCat, body };
    setRegByStudent((all) => ({ ...all, [studentKey]: [item, ...(all[studentKey] || [])] }));
    setNrBody(""); setNrCat("ped"); setRegModalOpen(false);
  };
  const [anamOpen, setAnamOpen] = useState<Record<string, boolean>>({});
  const studentKey = selectedId || "_none";
  const studentRegs = regByStudent[studentKey] || [];
  const buildBlankAnam = () => ANAMNESE_EIXOS.map((e) => ({ l: e.l, items: e.items.map((i) => ({ ...i })), obs: "" }));
  const [anamByStudent, setAnamByStudent] = useState<Record<string, ReturnType<typeof buildBlankAnam>>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem("inc_anam");
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return {};
  });
  useEffect(() => {
    try { window.localStorage.setItem("inc_anam", JSON.stringify(anamByStudent)); } catch { /* ignore */ }
  }, [anamByStudent]);
  const anamData = anamByStudent[studentKey] || buildBlankAnam();
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

  const goView = (v: ViewKey) => {
    const safe: ViewKey = v === "detail" && students.length === 0 ? "list" : v;
    setView(safe);
    navigate({ search: (prev) => ({ ...prev, view: v }) as never, replace: true });
  };
  const openStudent = (id: string) => {
    setSelectedId(id);
    setView("detail");
    navigate({ search: (prev) => ({ ...prev, view: "detail", aluno: id }) as never, replace: true });
  };
  const selected = students.find((s) => s.id === selectedId) || null;
  const setActiveTab = (t: TabKey) => {
    setTab(t);
    navigate({ search: (prev) => ({ ...prev, tab: t }) as never, replace: true });
  };

  const filtered = students.filter((s) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.turma.toLowerCase().includes(q) || s.diag.toLowerCase().includes(q);
  });

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const name = nsName.trim();
    if (!name) return;
    const initials = name.split(/\s+/).map((p) => p[0] || "").join("").slice(0, 2).toUpperCase();
    const cidOpt = CID_OPTIONS.find((o) => o.value === nsCid);
    const diagLabel = cidOpt && cidOpt.value !== "nao_informado" ? cidOpt.label.split(" — ")[0] : "Não informado";
    const cidCode = cidOpt && cidOpt.cid && cidOpt.cid !== "—" ? `CID ${cidOpt.cid}` : "CID não informado";
    const aeeLabel = nsAeeDays
      ? `AEE ${nsAeeDays}x/sem`
      : "AEE a definir";
    const mediadora = nsMediadora.trim();
    const newStudent: Student = {
      id: `s_${Date.now()}`,
      name,
      initials: initials || "AL",
      age: "—",
      turma: nsTurma.trim() || "Sem turma",
      anoEscolar: nsAnoEscolar.trim() || "",
      diag: diagLabel,
      cid: cidCode,
      aee: mediadora ? `${aeeLabel} · Mediadora: ${mediadora}` : aeeLabel,
      anamnese: "0/14",
      registros: "0",
      trend: "—",
      trendTone: "muted",
    };
    setStudents((prev) => [newStudent, ...prev]);
    setNsName(""); setNsTurma(""); setNsAnoEscolar(""); setNsCid("nao_informado");
    setNsAeeDays(""); setNsMediadora("");
    setNewStudentOpen(false);
  };

  const saveTab = (label: string) => {
    if (!selected) {
      toast.error("Selecione um aluno antes de salvar.");
      return;
    }
    // All state already auto-syncs to localStorage via useEffect; this
    // forces a write and confirms to the user.
    try {
      window.localStorage.setItem("inc_students", JSON.stringify(students));
      window.localStorage.setItem("inc_anam", JSON.stringify(anamByStudent));
      window.localStorage.setItem("inc_reg", JSON.stringify(regByStudent));
    } catch { /* ignore */ }
    toast.success(`${label} salvo`, { description: `Sincronizado para ${selected.name}.` });
  };

  return (
    <div className="inc-root">
      <style dangerouslySetInnerHTML={{ __html: sidebarCss + css + emptyStateCss + printCss }} />
      <div className="inc-app">
        <AppSidebar active="inclusion" />

        <main className="inc-main">
          <div className="inc-topbar">
            <div className="inc-crumbs">
              <b className="now">Sua sala</b>
              <span className="sep">›</span>
              {view === "list" ? (
                <span>Inclusão</span>
              ) : (
                <>
                  <a onClick={() => goView("list")}>Inclusão</a>
                  <span className="sep">›</span>
                  <a onClick={() => goView("list")}>{selected?.turma || "Aluno"}</a>
                  <span className="sep">›</span>
                  <span>{selected?.name || "—"}</span>
                </>
              )}
            </div>
            <div className="inc-spacer" />
            {view === "detail" && selected && (
              <div className="inc-status-pill"><span className="dot" /> PEI ainda não criado · comece pela Anamnese</div>
            )}
            <button className="inc-btn-ghost" onClick={() => setTutorialOpen(true)}><HelpCircle size={14} /> Tutorial Inclusão</button>
            {view === "detail" && (
              <button className="inc-btn-ghost" onClick={() => setPeiOpen(true)}><Download size={14} /> Exportar PEI</button>
            )}
          </div>

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
                  <button className="list-filter">Turma: Todas</button>
                  <button className="list-filter">Diagnóstico: Todos</button>
                  <div className="list-actions">
                    <button className="btn btn-primary btn-cadastrar" onClick={() => setNewStudentOpen(true)}><Plus size={14} /> Cadastrar aluno</button>
                  </div>
                </div>
                <div className="list-grid">
                  {filtered.length === 0 && (
                    <EmptyState
                      icon="🤝"
                      title="Cadastre o primeiro aluno com necessidade educacional específica."
                      description="A Sofia organiza PEI, anamnese, registros e relatórios para cada aluno PCD."
                      ctaLabel="Novo aluno"
                      onCta={() => setNewStudentOpen(true)}
                    />
                  )}
                  {filtered.map((s) => (
                    <button
                      key={s.id}
                      className="student-card"
                      onClick={() => openStudent(s.id)}
                    >
                      <div className="sc-head">
                        <div className={"sc-avatar" + (s.featured ? " featured" : "")}>{s.initials}</div>
                        <div className="sc-info"><b>{s.name}</b><span>{s.age} · {s.turma}</span></div>
                      </div>
                      <div className="sc-tags">
                        <span className="sc-tag">{s.diag}</span>
                        <span className="sc-tag muted">{s.cid}</span>
                        <span className="sc-tag muted">{s.aee}</span>
                      </div>
                      <div className="sc-stats">
                        <div><b>{s.anamnese}</b>Anamnese</div>
                        <div><b>{s.registros}</b>Registros</div>
                        <div style={{ color: s.trendTone === "ok" ? "var(--success)" : s.trendTone === "warn" ? "var(--warn)" : "var(--muted)" }}>
                          <b>{s.trend}</b>Objetivos
                        </div>
                      </div>
                    </button>
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
                      <span className="tag"><b>Turma:</b> {selected.turma}</span>
                      <span className="tag"><b>{selected.cid}</b></span>
                      <span className="tag"><b>{selected.aee}</b></span>
                    </div>
                  </div>
                  <div className="hero-r">
                    <button className="btn btn-secondary" onClick={() => setPeiOpen(true)}><FileText size={14} /> Ver PEI completo</button>
                    <button className="btn btn-primary" onClick={() => setAdaptOpen(true)}><Sparkles size={14} /> Adaptar aula de hoje</button>
                  </div>
                </div>

                <div className="kpis">
                  <div className="kpi kpi-accent">
                    <div className="kpi-label">Tempo economizado neste aluno</div>
                    <div className="kpi-value">0h</div>
                    <div className="kpi-sub">comece a usar a Sofia para acumular ganhos</div>
                  </div>
                  <div className="kpi">
                    <div className="kpi-label">Aulas adaptadas</div>
                    <div className="kpi-value">0<span className="small"> /0</span></div>
                    <div className="kpi-sub">nenhuma adaptação registrada</div>
                  </div>
                  <div className="kpi">
                    <div className="kpi-label">Objetivos PEI atingidos</div>
                    <div className="kpi-value">0<span className="small"> /0</span></div>
                    <div className="kpi-sub">defina objetivos no PEI</div>
                  </div>
                  <div className="kpi">
                    <div className="kpi-label">Evolução pedagógica</div>
                    <div className="kpi-value" style={{ color: "var(--muted)" }}>Sem dados</div>
                    <div className="kpi-sub">aguardando primeiros registros</div>
                  </div>
                </div>

                <div className="tabs" role="tablist">
                  {([
                    { k: "hoje", label: "Visão de hoje" },
                    { k: "anam", label: "Anamnese" },
                    { k: "plan", label: "Planejamento" },
                    { k: "reg", label: "Registros" },
                    { k: "rel", label: "Relatório IA" },
                    { k: "doc", label: "Documentos" },
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
                    <button className="btn btn-primary" onClick={() => saveTab("Visão de hoje")}><CheckCircle2 size={14} /> Salvar</button>
                  </div>
                  <div className="hoje-grid">
                    <div className="col-l">
                  <div className="action-card">
                    <div className="ac-head">
                      <div className="sofia">S</div>
                      <div className="ac-head-txt">
                        <b>Sofia ainda está conhecendo {selected.name.split(" ")[0]}</b>
                        <span>Preencha a Anamnese e o PEI para receber sugestões personalizadas</span>
                      </div>
                      <span className="ac-tag">Novo</span>
                    </div>
                    <h2 className="ac-title">Vamos começar pela <em>Anamnese</em> de {selected.name.split(" ")[0]}</h2>
                    <p className="ac-body">Sem registros ainda. Preencha os eixos da Anamnese e cadastre o PEI para que a Sofia possa sugerir adaptações de aula alinhadas ao perfil e à BNCC.</p>
                    <div className="ac-cta">
                      <button className="btn btn-primary" onClick={() => setActiveTab("anam")}>Preencher Anamnese <ChevronRight size={14} /></button>
                      <button className="btn-ghost-dark" onClick={() => setPeiOpen(true)}>Abrir PEI</button>
                    </div>
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
                      <button className="more" onClick={() => setActiveTab("reg")}>Todos os 0 registros →</button>
                    </div>
                    <div className="tl">
                      <p style={{ color: "var(--muted)", fontSize: 12.5 }}>Nenhum registro ainda. Os eventos pedagógicos de {selected.name.split(" ")[0]} aparecerão aqui.</p>
                    </div>
                  </div>
                    </div>

                    <aside className="col-r">
                      <div className="sofia-card">
                        <div className="sofia-head">
                          <div className="av">S</div>
                          <div>
                            <b>Sofia · IA pedagógica</b>
                            <span>especialista em PEI e BNCC inclusão</span>
                          </div>
                        </div>
                        <p className="sofia-q">"Posso te ajudar com {selected.name.split(" ")[0]} agora. O que faz mais sentido?"</p>
                        <div className="sofia-actions">
                          <button className="sofia-action" onClick={() => setAdaptOpen(true)}><Sparkles size={14} className="ico" /> Adaptar aula de hoje <span className="arrow">›</span></button>
                          <button className="sofia-action" onClick={() => setActiveTab("plan")}><FileText size={14} className="ico" /> Gerar plano de aula adaptado <span className="arrow">›</span></button>
                          <button className="sofia-action" onClick={() => setActiveTab("rel")}><BookOpen size={14} className="ico" /> Gerar parecer descritivo bimestral <span className="arrow">›</span></button>
                          <button className="sofia-action"><Send size={14} className="ico" /> Preparar reunião com família <span className="arrow">›</span></button>
                        </div>
                      </div>

                      <div className="context-card">
                        <h4>Contexto rápido</h4>
                        {([
                          { l: "Ano escolar", v: selected.anoEscolar || "Não informado", t: "" },
                          { l: "Turma", v: selected.turma, t: "" },
                          { l: "Diagnóstico", v: selected.diag, t: "" },
                          { l: "CID", v: selected.cid, t: "" },
                          { l: "AEE / Mediação", v: selected.aee, t: "" },
                          { l: "Leitura", v: "Sem dados", t: "" },
                          { l: "Escrita", v: "Sem dados", t: "" },
                          { l: "Matemática", v: "Sem dados", t: "" },
                        ] as Array<{ l: string; v: string; t: "" | "warn" | "ok" }>).map((r) => (
                          <div className="ctx-row" key={r.l}>
                            <span className="lbl">{r.l}</span>
                            <span className={"ctx-pill" + (r.t ? " " + r.t : "")}>{r.v}</span>
                          </div>
                        ))}
                      </div>

                      <div className="skills-card">
                        <h4>Habilidades · evolução</h4>
                        {([
                          { l: "Atenção sustentada", p: 0, c: "" },
                          { l: "Leitura silábica", p: 0, c: "" },
                          { l: "Cálculo concreto", p: 0, c: "" },
                          { l: "Interação em dupla", p: 0, c: "" },
                          { l: "Autorregulação", p: 0, c: "" },
                        ] as Array<{ l: string; p: number; c: "" | "warn" | "green" }>).map((s) => (
                          <div className="skill" key={s.l}>
                            <div className="skill-head"><b>{s.l}</b><span>{s.p}%</span></div>
                            <div className="skill-bar"><div className={"skill-fill" + (s.c ? " " + s.c : "")} style={{ width: s.p + "%" }} /></div>
                          </div>
                        ))}
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
                      <button className="btn btn-primary"><Sparkles size={14} /> Sugerir com a Sofia</button>
                    </div>
                    <p style={{ color: "var(--muted)", fontSize: 13 }}>Clique em cada eixo para abrir os descritores e marcar o status: <b>Não observado</b>, <b>Não alcançado</b>, <b>Em desenvolvimento</b> ou <b>Consolidado</b>. As barras se atualizam automaticamente.</p>
                    <div className="anam-list">
                      {anamData.map((e, ei) => {
                        const p = eixoPct(e.items);
                        const tone = eixoTone(p, e.items);
                        const open = !!anamOpen[e.l];
                        const sugs = ANAM_SUGESTOES[e.l] || [];
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
                  </div>
                </div>

                <div className={"panel" + (tab === "plan" ? " active" : "")}>
                  <div className="section">
                    <div className="section-head">
                      <h3>Planejamento adaptado · {selected?.name || ""}</h3>
                      <span className="legal">{selected?.anoEscolar || "Ano escolar não informado"} · {selected?.turma || ""}</span>
                      <button className="btn btn-primary" onClick={() => setAdaptOpen(true)}><Sparkles size={14} /> Gerar novo plano adaptado</button>
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
                        {PLAN_WEEK.length === 0 ? (
                          <div style={{ background: "#fff", border: "1px dashed var(--border)", borderRadius: 11, padding: 22, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                            Nenhum plano de aula registrado para <b>{selected?.name || "este aluno"}</b> ainda.<br />
                            Use <b>Gerar novo plano adaptado</b> para começar.
                          </div>
                        ) : PLAN_WEEK.map((p) => (
                          <div className="plan-item" key={p.title}>
                            <div className="when">{p.when}<b>{p.date}</b></div>
                            <div>
                              <h5>{p.title}</h5>
                              <div className="meta-row">
                                <span>{p.disc}</span>
                                <span className="bncc">{p.bncc}</span>
                                {p.adapted && <span className="adapted">Adaptado pela Sofia</span>}
                              </div>
                            </div>
                            <button className="inc-btn-ghost"><FileText size={12} /> Abrir</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className={"panel" + (tab === "reg" ? " active" : "")}>
                  <div className="section">
                    <div className="section-head">
                      <h3>Registros pedagógicos · {studentRegs.length}</h3>
                      <button className="btn btn-primary" onClick={() => setRegModalOpen(true)}><Plus size={14} /> Novo registro</button>
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
                    </div>
                    <div className="rel-feature">
                      <h4>Parecer descritivo bimestral · 1º bim 2026</h4>
                      <p>A Sofia consolida 23 registros + PEI v3.2 + anamnese em um parecer pronto para exportar (Word/PDF) e assinar.</p>
                      <button className="btn btn-primary"><Sparkles size={14} /> Gerar com a Sofia (~3 min)</button>
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

                <div className={"panel" + (tab === "doc" ? " active" : "")}>
                  <div className="section">
                    <div className="section-head">
                      <h3>Documentos · Pedrinho Almeida</h3>
                      <button className="btn btn-primary"><Plus size={14} /> Adicionar documento</button>
                    </div>
                    <div className="doc-grid">
                      {DOCS.map((d) => (
                        <div className="doc-card" key={d.t}>
                          <div className="doc-head">
                            <div className="doc-ic">{d.ic}</div>
                            <div>
                              <b>{d.t}</b>
                              <div className="doc-meta">{d.who}</div>
                            </div>
                          </div>
                          <div className="doc-meta">{d.date} · {d.size}</div>
                          <div className="doc-acts">
                            <button>Visualizar</button>
                            <button className="primary"><Download size={12} /> Baixar</button>
                          </div>
                        </div>
                      ))}
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
            <button className="btn btn-primary" onClick={() => setTutorialOpen(false)}>Entendi, começar</button>
          </div>
        </div>
      </div>

      {/* Adaptar aula */}
      <div className={"inc-modal-overlay" + (adaptOpen ? " open" : "")} onClick={(e) => { if (e.target === e.currentTarget) setAdaptOpen(false); }}>
        <div className="inc-modal" style={{ maxWidth: 760 }}>
          <div className="inc-modal-bar" />
          <div className="inc-modal-head">
            <h2>Adaptar aula · Frações e Partilha Justa</h2>
            <span className="meta">Matemática · 16h00<br />BNCC EF02MA08</span>
            <button className="inc-modal-close" onClick={() => setAdaptOpen(false)} aria-label="Fechar"><X size={16} /></button>
          </div>
          <div className="inc-modal-body plain">
            {ADAPTACOES.map((a) => (
              <div className="inc-adapt-item" key={a.n}>
                <div className="inc-adapt-num">{a.n}</div>
                <div>
                  <h4>{a.title}</h4>
                  <p>{a.desc}</p>
                  <div className="meta">{a.meta}</div>
                </div>
                <input type="checkbox" defaultChecked style={{ width: 18, height: 18, accentColor: "var(--accent)" }} />
              </div>
            ))}
          </div>
          <div className="inc-modal-foot">
            <span className="legal">As adaptações serão registradas no histórico do Pedrinho automaticamente.</span>
            <button className="inc-btn-ghost" onClick={() => setAdaptOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => setAdaptOpen(false)}><CheckCircle2 size={14} /> Aplicar 3 adaptações</button>
          </div>
        </div>
      </div>

      {/* PEI completo */}
      <div className={"inc-modal-overlay" + (peiOpen ? " open" : "")} onClick={(e) => { if (e.target === e.currentTarget) setPeiOpen(false); }}>
        <div className="inc-modal" style={{ maxWidth: 880 }}>
          <div className="inc-modal-bar" />
          <div className="inc-modal-head">
            <h2>Plano Educacional Individualizado · Pedrinho Almeida</h2>
            <span className="meta">PEI-2026-PA-v3.2<br />Lei 14.254/2021</span>
            <button className="inc-modal-close" onClick={() => setPeiOpen(false)} aria-label="Fechar"><X size={16} /></button>
          </div>
          <div className="inc-modal-body">
            <div className="inc-a4">
              <div className="inc-a4-head">
                <div className="inc-a4-logo">M</div>
                <div className="center">
                  <b>Prefeitura Municipal de São Paulo</b>
                  <span>Secretaria Municipal da Educação · Diretoria Regional Sul<br />EMEF Profa. Maria Aparecida Silva</span>
                </div>
                <div className="stamp">PROTOCOLO<br />#PEI-2026-PA-v3.2<br />04/04/2026</div>
              </div>
              <h1>Plano Educacional Individualizado</h1>
              <div className="ident">
                <span><b>Educando:</b> Pedro Henrique Almeida</span>
                <span><b>Idade:</b> 7 anos</span>
                <span><b>Turma:</b> 2º Ano A · Manhã</span>
                <span><b>Ref. curricular:</b> 2º Ano EF</span>
                <span><b>CID:</b> F84.0 · TEA Nível 1</span>
                <span><b>AEE:</b> 2x/semana · Profa. Carla Mendonça</span>
              </div>
              <h2>1. Caracterização e Anamnese</h2>
              <p>O educando apresenta diagnóstico de TEA (Nível 1). Reconhece o alfabeto e lê palavras CV com mediação. Em Matemática demonstra fluência com material concreto. Sensibilidade auditiva alta — fones abafadores em uso. Família participativa.</p>
              <h2>2. Objetivos vigentes</h2>
              <ul>
                <li><b>#1</b> Ler 20 palavras com encontros consonantais com mediação visual</li>
                <li><b>#3</b> Resolver operações de adição até 20 com material concreto · atingido</li>
                <li><b>#4</b> Compreender "metade" e "inteiro" com mediação visual</li>
                <li><b>#6</b> Sustentar trabalho em dupla por 20 min · atingido</li>
                <li><b>#7</b> Reconhecer sobrecarga sensorial e solicitar pausa · atingido</li>
              </ul>
            </div>
          </div>
          <div className="inc-modal-foot">
            <span className="legal">Conforme Lei 14.254/2021 · BNCC Inclusão</span>
            <button className="inc-btn-ghost"><FileText size={14} /> Word</button>
            <button className="btn btn-primary"><Printer size={14} /> Imprimir / PDF</button>
          </div>
        </div>
      </div>

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
            <button className="btn btn-primary" onClick={() => window.print()}><Printer size={14} /> Imprimir / PDF</button>
          </div>
        </div>
      </div>

      {/* Cadastrar aluno */}
      <div className={"inc-modal-overlay" + (newStudentOpen ? " open" : "")} onClick={(e) => { if (e.target === e.currentTarget) setNewStudentOpen(false); }}>
        <div className="inc-modal" style={{ maxWidth: 560 }}>
          <div className="inc-modal-bar" />
          <div className="inc-modal-head">
            <h2>Cadastrar novo aluno</h2>
            <button className="inc-modal-close" onClick={() => setNewStudentOpen(false)} aria-label="Fechar"><X size={16} /></button>
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
              <input value={nsTurma} onChange={(e) => setNsTurma(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, marginTop: 4 }} placeholder="Ex.: 2º Ano A" />
            </label>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Diagnóstico / CID
              <select
                value={nsCid}
                onChange={(e) => setNsCid(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, marginTop: 4, background: "#fff", fontFamily: "inherit", fontSize: 13 }}
              >
                <option value="nao_informado">Não informado</option>
                {CID_OPTIONS.filter((o) => o.value !== "nao_informado").map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.cid && o.cid !== "—" ? `${o.label} · CID ${o.cid}` : o.label}
                  </option>
                ))}
              </select>
            </label>
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
              <button type="button" className="inc-btn-ghost" onClick={() => setNewStudentOpen(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Salvar aluno</button>
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
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Tipo de registro</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(["ped","com","sen","fam"] as RegCat[]).map(k => (
                  <button type="button" key={k} onClick={() => setNrCat(k)} className={"reg-filter" + (nrCat === k ? " active" : "")}>{REG_CAT_LABEL[k]}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Opções rápidas</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {REG_QUICK[nrCat].map(s => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setNrBody(prev => prev.trim() ? prev.trim() + (prev.trim().endsWith(".") ? " " : ". ") + s : s)}
                    style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "#fff", fontSize: 12, cursor: "pointer", textAlign: "left" }}
                  >+ {s}</button>
                ))}
              </div>
            </div>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Descrição
              <textarea
                required
                value={nrBody}
                onChange={(e) => setNrBody(e.target.value)}
                rows={5}
                placeholder="Descreva o registro…"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, marginTop: 4, fontFamily: "inherit", fontSize: 13, resize: "vertical" }}
              />
            </label>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
              <button type="button" className="inc-btn-ghost" onClick={() => setRegModalOpen(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary"><Plus size={14} /> Salvar registro</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
