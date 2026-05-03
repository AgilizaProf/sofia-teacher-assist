import { useState, useMemo, useRef } from "react";
import { useSearch, useNavigate } from "@tanstack/react-router";
import {
  Sparkles, Plus, ChevronLeft, ChevronRight, RefreshCw, Check,
  Lock, GripVertical, Lightbulb, X, Clock, Copy, Move,
} from "lucide-react";
import { AppSidebar, sidebarCss } from "@/components/AppSidebar";

const css = `
.pl-root{
  --navy:#1B2A4E;--navy-2:#243762;--navy-deep:#0F1A36;--navy-darker:#0A1228;
  --orange:#FF7A45;--orange-2:#F26B36;--orange-soft:rgba(255,122,69,.12);--orange-soft-2:rgba(255,122,69,.20);
  --ink:#0F172A;--ink-2:#334155;--muted:#64748B;--line:#E2E8F0;--bg:#F6F7FB;
  --green:#10B981;--amber:#F59E0B;--red:#EF4444;
  --shadow-sm:0 1px 2px rgba(15,23,42,.06);--shadow-md:0 6px 18px rgba(15,23,42,.08);--shadow-lg:0 18px 40px rgba(15,23,42,.18);
  font-family:'Inter',-apple-system,sans-serif;background:var(--bg);color:var(--ink);font-size:14px;line-height:1.5;min-height:100vh;
}
.pl-root *{box-sizing:border-box;}
.pl-root h1,.pl-root h2,.pl-root h3,.pl-root h4{font-family:'Fraunces',Georgia,serif;font-weight:600;letter-spacing:-.01em;margin:0;color:var(--ink);}
.pl-root button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit;}
.pl-root p{margin:0;}

.pl-app{display:grid;grid-template-columns:240px 1fr;min-height:100vh;}
.pl-main{display:flex;flex-direction:column;min-width:0;}

.pl-topbar{height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:40;}
.pl-crumbs{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13px;}
.pl-crumbs strong{color:var(--ink);font-weight:600;}
.pl-crumbs .sep{opacity:.4;}
.pl-top-meta{display:flex;align-items:center;gap:18px;color:var(--muted);font-size:12.5px;}
.pl-top-meta .sdot{width:7px;height:7px;border-radius:50%;background:var(--green);display:inline-block;margin-right:6px;box-shadow:0 0 0 3px rgba(16,185,129,.18);}
.pl-top-meta .av{width:28px;height:28px;border-radius:50%;background:var(--orange);color:#fff;display:grid;place-items:center;font-weight:600;font-size:11px;}

.pl-hero{margin:18px 24px 0;background:linear-gradient(135deg,var(--navy) 0%,#243762 100%);border-radius:16px;padding:24px 28px;color:#fff;position:relative;overflow:hidden;box-shadow:var(--shadow-md);}
.pl-hero::after{content:"";position:absolute;right:-80px;top:-80px;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,rgba(255,122,69,.18) 0%,rgba(255,122,69,0) 70%);pointer-events:none;}
.pl-hero .badge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,122,69,.15);border:1px solid rgba(255,122,69,.3);padding:5px 12px;border-radius:7px;font-size:11px;font-weight:700;color:var(--orange);letter-spacing:.1em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;}
.pl-hero h1{font-size:30px;font-weight:600;color:#fff;margin-top:14px;line-height:1.15;letter-spacing:-.02em;}
.pl-hero h1 em{color:var(--orange);font-style:normal;display:block;}
.pl-hero .lead{margin-top:10px;color:#CBD5E1;font-size:14px;line-height:1.55;max-width:780px;}
.pl-hero .lead strong{color:#fff;font-weight:600;}
.pl-hero .chips{margin-top:16px;display:flex;gap:9px;flex-wrap:wrap;position:relative;z-index:1;}
.pl-hero .hbc{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;font-size:12.5px;font-weight:600;border:1px solid transparent;cursor:pointer;transition:.15s;}
.pl-hero .hbc.solid{background:var(--orange);color:#fff;}
.pl-hero .hbc.solid:hover{background:var(--orange-2);}
.pl-hero .hbc.outline{background:rgba(255,255,255,.06);color:#E2E8F0;border-color:rgba(255,255,255,.12);}
.pl-hero .hbc.outline:hover{background:rgba(255,255,255,.12);color:#fff;}
@media(max-width:880px){.pl-hero h1{font-size:22px;}}

.pl-tabbar{margin:18px 24px 0;background:#fff;border:1px solid var(--line);border-radius:11px;padding:5px;display:flex;align-items:center;gap:2px;flex-wrap:wrap;}
.pl-tab{flex:1;min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 12px;border-radius:8px;color:var(--muted);font-size:12.5px;font-weight:600;white-space:nowrap;border:1px solid transparent;transition:.15s;}
.pl-tab .num{display:inline-grid;place-items:center;padding:2px 6px;border-radius:5px;background:var(--orange);color:#fff;font-size:10.5px;font-weight:700;font-family:'JetBrains Mono',monospace;}
.pl-tab:hover{color:var(--ink);background:var(--bg);}
.pl-tab.active{background:linear-gradient(135deg,var(--orange),#FF9466);color:#fff;box-shadow:0 4px 10px rgba(255,122,69,.3);}
.pl-tab.active .num{background:rgba(255,255,255,.22);color:#fff;}

.pl-workspace{padding:18px 24px 100px;display:grid;grid-template-columns:1fr;gap:18px;}
.pl-tools{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;}
.pl-tools h2{font-size:18px;color:var(--ink);font-weight:600;}
.pl-tools h2 small{color:var(--muted);font-weight:400;font-family:'Inter';font-size:12.5px;margin-left:6px;}
.pl-tools .right{display:flex;gap:8px;flex-wrap:wrap;}
.pl-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 14px;border-radius:9px;font-size:12.5px;font-weight:600;border:1px solid var(--line);background:#fff;color:var(--ink);transition:.15s;box-shadow:var(--shadow-sm);cursor:pointer;}
.pl-btn:hover{border-color:#CBD5E1;background:#FBFBFD;transform:translateY(-1px);}
.pl-btn.primary{background:var(--orange);color:#fff;border-color:transparent;}
.pl-btn.primary:hover{background:var(--orange-2);}
.pl-btn.dark{background:var(--navy);color:#fff;border-color:transparent;}
.pl-btn.dark:hover{background:var(--navy-2);}
.pl-btn.ghost{background:transparent;border-color:transparent;box-shadow:none;color:var(--muted);}
.pl-btn.ghost:hover{color:var(--ink);background:#fff;}

.pl-layout{display:grid;grid-template-columns:1fr 320px;gap:18px;}
@media(max-width:1200px){.pl-layout{grid-template-columns:1fr;}}

.pl-week{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px;box-shadow:var(--shadow-sm);}
@media(max-width:1100px){.pl-week{grid-template-columns:repeat(5,minmax(140px,1fr));overflow-x:auto;}}
.pl-day{background:#FAFBFD;border:1px dashed transparent;border-radius:11px;padding:10px;min-height:340px;display:flex;flex-direction:column;gap:8px;transition:.15s;}
.pl-day.empty{border-color:#E2E8F0;background:repeating-linear-gradient(135deg,#fff,#fff 8px,#F8FAFC 8px,#F8FAFC 16px);}
.pl-day.drop{border-color:var(--orange);background:var(--orange-soft);border-style:solid;box-shadow:inset 0 0 0 2px var(--orange-soft-2);}
.pl-day-head{display:flex;align-items:center;justify-content:space-between;padding:2px 4px 8px;border-bottom:1px solid var(--line);}
.pl-day-head .dn{font-size:10.5px;color:var(--muted);font-weight:700;letter-spacing:.14em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;}
.pl-day-head .dd{font-family:'Fraunces',serif;font-size:18px;color:var(--ink);font-weight:600;}
.pl-day-head .add{width:22px;height:22px;border-radius:6px;color:var(--muted);display:grid;place-items:center;cursor:pointer;}
.pl-day-head .add:hover{background:#fff;color:var(--orange);box-shadow:var(--shadow-sm);}

.pl-card{position:relative;background:#fff;border:1px solid var(--line);border-radius:10px;padding:9px 10px 9px 14px;cursor:grab;box-shadow:var(--shadow-sm);transition:.15s;}
.pl-card:hover{border-color:#CBD5E1;box-shadow:var(--shadow-md);transform:translateY(-1px);}
.pl-card:active{cursor:grabbing;}
.pl-card::before{content:"";position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;background:var(--orange);}
.pl-card.port::before{background:#3B82F6;}
.pl-card.mat::before{background:#8B5CF6;}
.pl-card.aval::before{background:var(--amber);}
.pl-card.esc::before{background:var(--green);}
.pl-card.ci::before{background:#06B6D4;}
.pl-card .top{display:flex;align-items:center;justify-content:space-between;gap:6px;}
.pl-card .tag{font-size:9.5px;font-weight:700;letter-spacing:.1em;color:#3B82F6;padding:2px 6px;border-radius:4px;background:rgba(59,130,246,.1);text-transform:uppercase;font-family:'JetBrains Mono',monospace;}
.pl-card.mat .tag{color:#8B5CF6;background:rgba(139,92,246,.1);}
.pl-card.aval .tag{color:#B45309;background:rgba(245,158,11,.14);}
.pl-card.esc .tag{color:#047857;background:rgba(16,185,129,.12);}
.pl-card.ci .tag{color:#0891B2;background:rgba(6,182,212,.12);}
.pl-card .ttl{font-size:12.5px;font-weight:600;color:var(--ink);margin:5px 0 3px;line-height:1.35;}
.pl-card .meta{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:11px;}
.pl-card .meta .mdot{width:3px;height:3px;border-radius:50%;background:#CBD5E1;}
.pl-card.locked{background:#FFFBEB;border-color:#FDE68A;cursor:not-allowed;}
.pl-card.locked .lock{position:absolute;top:8px;right:8px;color:#B45309;}
.pl-card .handle{color:#CBD5E1;cursor:grab;}
.pl-card .handle:hover{color:var(--orange);}

.pl-empty-slot{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--muted);font-size:11.5px;gap:6px;text-align:center;padding:14px 8px;border-radius:10px;border:1px dashed #CBD5E1;background:#fff;}
.pl-empty-slot .ic{width:30px;height:30px;border-radius:50%;background:var(--orange-soft);color:var(--orange);display:grid;place-items:center;}
.pl-empty-slot .sb{font-size:11.5px;font-weight:600;color:var(--orange);padding:5px 9px;border-radius:6px;background:var(--orange-soft);cursor:pointer;border:none;display:inline-flex;align-items:center;gap:5px;}
.pl-empty-slot .sb:hover{background:var(--orange-soft-2);}

.pl-side{display:flex;flex-direction:column;gap:14px;}
.pl-panel{background:#fff;border:1px solid var(--line);border-radius:13px;padding:14px;box-shadow:var(--shadow-sm);}
.pl-panel.accent{background:linear-gradient(135deg,#FFF4ED 0%,#FFFAF7 100%);border-color:#FED7C4;}
.pl-panel h3{font-size:14px;font-family:'Fraunces',serif;color:var(--ink);font-weight:600;display:flex;align-items:center;gap:7px;}
.pl-panel .lead{color:var(--muted);font-size:12px;margin:4px 0 12px;line-height:1.45;}
.pl-panel .lead b{color:var(--ink);font-weight:600;}

.pl-trow{display:flex;align-items:flex-start;gap:10px;padding:10px;border:1px solid var(--line);border-radius:10px;background:#fff;cursor:pointer;transition:.15s;margin-bottom:8px;text-align:left;width:100%;}
.pl-trow:hover{border-color:#CBD5E1;background:#FBFBFD;}
.pl-trow.on{border-color:var(--orange);background:var(--orange-soft);box-shadow:0 0 0 1px var(--orange-soft-2);}
.pl-trow .chk{width:16px;height:16px;border-radius:5px;border:1.6px solid #CBD5E1;flex-shrink:0;margin-top:2px;display:grid;place-items:center;color:#fff;background:#fff;}
.pl-trow.on .chk{background:var(--orange);border-color:var(--orange);}
.pl-trow .info{flex:1;min-width:0;}
.pl-trow .name{font-weight:600;color:var(--ink);font-size:13px;}
.pl-trow .sub{color:var(--muted);font-size:11.5px;margin-top:2px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.pl-trow .pcd{font-size:10px;font-weight:600;background:rgba(139,92,246,.12);color:#7C3AED;padding:1px 6px;border-radius:4px;letter-spacing:.04em;font-family:'JetBrains Mono',monospace;}
.pl-trow .gain{font-size:11px;color:var(--green);font-weight:600;white-space:nowrap;}
.pl-trow .warn{font-size:10px;color:#B45309;background:#FEF3C7;padding:1px 6px;border-radius:4px;font-weight:600;}
.pl-replica-cta{width:100%;justify-content:center;padding:11px;margin-top:6px;}
.pl-replica-eco{font-size:11px;color:var(--muted);text-align:center;margin-top:7px;}
.pl-replica-eco b{color:var(--green);font-weight:600;}

.pl-hist{display:flex;gap:9px;padding:8px 0;border-bottom:1px solid var(--line);align-items:flex-start;font-size:12px;}
.pl-hist:last-of-type{border-bottom:none;}
.pl-hist .icn{width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:6px;}
.pl-hist .icn.b{background:#3B82F6;}
.pl-hist .icn.o{background:var(--orange);}
.pl-hist .icn.g{background:var(--green);}
.pl-hist .body{flex:1;color:var(--ink-2);}
.pl-hist .body b{color:var(--ink);font-weight:600;}
.pl-hist .body .me{color:var(--muted);font-size:10.5px;margin-top:1px;}
.pl-hist-link{display:block;text-align:center;padding:9px 0 3px;font-size:11.5px;color:var(--orange);font-weight:600;cursor:pointer;background:none;border:none;width:100%;}
.pl-hist-link:hover{text-decoration:underline;}

.pl-tip{display:flex;align-items:center;gap:10px;padding:9px 14px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;font-size:12px;color:#92400E;margin-top:14px;}
.pl-tip .x{margin-left:auto;color:#B45309;cursor:pointer;padding:2px 6px;border-radius:5px;background:none;border:none;}
.pl-tip .x:hover{background:#FEF3C7;}

/* M1 calendar */
.pl-m1{display:grid;grid-template-columns:1fr 320px;gap:18px;}
@media(max-width:1200px){.pl-m1{grid-template-columns:1fr;}}
.pl-cal-card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;box-shadow:var(--shadow-sm);}
.pl-cal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:10px;}
.pl-cal-head .nav{display:flex;align-items:center;gap:8px;}
.pl-cal-head .month{font-family:'Fraunces',serif;font-size:17px;color:var(--ink);font-weight:600;}
.pl-cal-head .nav button{width:28px;height:28px;border-radius:7px;color:var(--ink-2);background:var(--bg);cursor:pointer;display:grid;place-items:center;border:none;}
.pl-cal-head .nav button:hover{background:#E2E8F0;}
.pl-cal-head .stat{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:6px;}
.pl-cal-head .stat b{color:var(--green);font-weight:600;}
.pl-cal-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:9px;}
@media(max-width:1100px){.pl-cal-grid{grid-template-columns:repeat(5,minmax(140px,1fr));overflow-x:auto;}}
.pl-cal-day{background:#FAFBFD;border:1px solid var(--line);border-radius:11px;padding:10px;min-height:240px;display:flex;flex-direction:column;gap:6px;transition:.15s;cursor:pointer;position:relative;}
.pl-cal-day:hover{border-color:var(--orange);box-shadow:0 4px 12px rgba(255,122,69,.08);}
.pl-cal-day.has-ai{background:#fff;border-color:#FED7C4;}
.pl-cal-day.has-ai::after{content:"✨";position:absolute;top:7px;right:7px;font-size:11px;opacity:.7;}
.pl-cal-day.selected{border-color:var(--orange);background:#fff;box-shadow:0 0 0 2px var(--orange-soft-2);}
.pl-cd-head{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:6px;}
.pl-cd-head .dn{font-size:10px;color:var(--muted);font-weight:700;letter-spacing:.14em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;}
.pl-cd-head .dd{font-family:'Fraunces',serif;font-size:16px;color:var(--ink);font-weight:600;}
.pl-cd-pill{font-size:9.5px;font-weight:600;padding:1px 6px;border-radius:5px;background:var(--orange-soft);color:var(--orange);letter-spacing:.04em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;}
.pl-ai{background:#fff;border:1px solid var(--line);border-radius:8px;padding:7px 8px 7px 11px;font-size:11px;position:relative;transition:.15s;cursor:pointer;}
.pl-ai:hover{border-color:#CBD5E1;background:#FBFBFD;}
.pl-ai::before{content:"";position:absolute;left:0;top:7px;bottom:7px;width:3px;border-radius:0 3px 3px 0;background:#3B82F6;}
.pl-ai.mat::before{background:#8B5CF6;}
.pl-ai.ci::before{background:#06B6D4;}
.pl-ai.aval::before{background:var(--amber);}
.pl-ai .sub{font-size:9px;color:#3B82F6;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:1px;font-family:'JetBrains Mono',monospace;}
.pl-ai.mat .sub{color:#8B5CF6;}
.pl-ai.ci .sub{color:#0891B2;}
.pl-ai.aval .sub{color:#B45309;}
.pl-ai .tt{color:var(--ink);font-weight:600;line-height:1.3;font-size:11.5px;}
.pl-ai .mn{color:var(--muted);font-size:10px;margin-top:2px;font-family:'JetBrains Mono',monospace;}

.pl-field{display:flex;flex-direction:column;gap:5px;margin-top:11px;}
.pl-field label{font-size:10.5px;color:var(--muted);font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;}
.pl-input{width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font-size:12.5px;background:#fff;color:var(--ink);font-family:inherit;}
.pl-input:focus{outline:none;border-color:var(--orange);box-shadow:0 0 0 3px var(--orange-soft);}
.pl-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px;}
.pl-pill{padding:5px 10px;border:1px solid var(--line);background:#fff;border-radius:999px;font-size:11.5px;color:var(--ink-2);cursor:pointer;transition:.15s;}
.pl-pill:hover{border-color:#CBD5E1;}
.pl-pill.on{background:var(--navy);color:#fff;border-color:var(--navy);}
.pl-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;}
.pl-stat-box{background:#FAFBFD;border:1px solid var(--line);border-radius:8px;padding:9px;}
.pl-stat-box .v{font-family:'Fraunces',serif;font-size:18px;font-weight:600;color:var(--ink);}
.pl-stat-box .v.green{color:var(--green);}
.pl-stat-box .v.orange{color:var(--orange);}
.pl-stat-box .l{font-size:10.5px;color:var(--muted);margin-top:1px;}
.pl-bncc{display:flex;flex-direction:column;gap:6px;margin-top:8px;}
.pl-bncc-item{display:flex;gap:8px;align-items:flex-start;padding:7px 9px;background:#FAFBFD;border:1px solid var(--line);border-radius:8px;font-size:11.5px;cursor:pointer;}
.pl-bncc-item:hover{border-color:#CBD5E1;}
.pl-bncc-item .code{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;background:#fff;border:1px solid #CBD5E1;color:var(--ink);padding:1px 5px;border-radius:4px;flex-shrink:0;}
.pl-bncc-item .desc{color:var(--ink-2);line-height:1.35;}

.pl-generic{background:#fff;border:1px dashed #CBD5E1;border-radius:14px;padding:48px 24px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px;}
.pl-generic .badge-big{background:var(--navy);color:#fff;padding:5px 11px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:.1em;font-family:'JetBrains Mono',monospace;}
.pl-generic h3{font-size:24px;color:var(--ink);}
.pl-generic p{color:var(--muted);max-width:520px;margin:0;font-size:14px;line-height:1.55;}
.pl-generic .actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:6px;}

.pl-toast{position:fixed;bottom:24px;left:50%;transform:translate(-50%,80px);background:var(--navy);color:#fff;padding:11px 16px;border-radius:10px;box-shadow:var(--shadow-lg);font-size:12.5px;display:flex;align-items:center;gap:10px;z-index:60;opacity:0;transition:.25s;pointer-events:none;}
.pl-toast.show{opacity:1;transform:translate(-50%,0);pointer-events:auto;}
.pl-toast .ic{color:var(--orange);}
.pl-toast button{color:var(--orange);font-weight:600;font-size:12px;padding:4px 8px;border-radius:6px;cursor:pointer;background:none;border:none;}
.pl-toast button:hover{background:rgba(255,255,255,.08);}

@media(max-width:880px){.pl-app{grid-template-columns:1fr;}}
`;

type MKey = "m1" | "m2" | "m3" | "m4" | "m5" | "m6";
type Variant = "port" | "mat" | "aval" | "esc" | "ci";
type Card = { id: string; v: Variant; tag: string; title: string; meta: string; locked?: boolean };
type DayKey = "seg" | "ter" | "qua" | "qui" | "sex";
type Week = Record<DayKey, Card[]>;

const DAYS: Array<{ k: DayKey; n: string; d: string }> = [
  { k: "seg", n: "SEG", d: "11" }, { k: "ter", n: "TER", d: "12" },
  { k: "qua", n: "QUA", d: "13" }, { k: "qui", n: "QUI", d: "14" },
  { k: "sex", n: "SEX", d: "15" },
];

const INITIAL_WEEK: Week = {
  seg: [
    { id: "c1", v: "port", tag: "PORT", title: "Atividade temática · Dia das Mães", meta: "50min" },
    { id: "c2", v: "mat", tag: "MAT", title: "Adição com material dourado", meta: "50min · duplas" },
  ],
  ter: [
    { id: "c3", v: "mat", tag: "MAT", title: "Adição com material dourado", meta: "50min · duplas" },
    { id: "c4", v: "aval", tag: "AVAL", title: "Diagnóstico de leitura", meta: "50min", locked: true },
  ],
  qua: [
    { id: "c5", v: "port", tag: "PORT", title: "Caça aos substantivos", meta: "30min" },
  ],
  qui: [
    { id: "c6", v: "port", tag: "PORT", title: "Roda de leitura", meta: "30min" },
    { id: "c7", v: "esc", tag: "ESCOLA", title: "Conselho de classe", meta: "14h–17h", locked: true },
  ],
  sex: [],
};

const M_CONFIG: Record<MKey, { badge: string; title: string; sub: string; lead: React.ReactNode; chips: Array<{ label: string; solid?: boolean }>; crumb: string }> = {
  m1: { badge: "★ MUDANÇA #1 · IA QUE OBSERVA", title: "Sofia preenche a semana por você.", sub: "Você revisa em 6 minutos. Não em 60.",
    lead: <>A IA esboça <strong>5 dias com 11 atividades</strong> baseadas no tema do mês, na BNCC e no histórico da turma. Você ajusta o que quiser e aprova com 1 clique.</>,
    chips: [{ label: "✨ Aceitar tudo", solid: true }, { label: "🔄 Regenerar" }, { label: "✏️ Ajustar parâmetros" }], crumb: "Sofia preenche a semana" },
  m2: { badge: "★ MUDANÇA #2 · CONTINUIDADE PEDAGÓGICA", title: "Sequência didática inteligente.", sub: "Cada aula puxa a próxima.",
    lead: <>Sofia <strong>conecta atividades em cadeia</strong>: quando você adiciona "introdução à adição", ela sugere "adição com dezenas" pro próximo dia. Continuidade vira automática.</>,
    chips: [{ label: "🔗 Ver cadeia", solid: true }, { label: "📚 Habilidades" }, { label: "📐 Reordenar" }], crumb: "Sequência didática" },
  m3: { badge: "★ MUDANÇA #3 · CONVERSAR EM VEZ DE PREENCHER", title: "Editor conversacional.", sub: "Você fala. Sofia ajusta.",
    lead: <>Esquece formulário. Diz <strong>"torna mais fácil"</strong>, <strong>"encurta pra 30min"</strong> ou <strong>"adapta pra TDAH"</strong> e a atividade muda na hora — preservando objetivo e BNCC.</>,
    chips: [{ label: "💬 Conversar", solid: true }, { label: "🎯 Adaptar PCD" }, { label: "⏱ Encurtar" }], crumb: "Editor conversacional" },
  m4: { badge: "★ MUDANÇA #4 · UM CALENDÁRIO, MUITAS LENTES", title: "Calendário com camadas.", sub: "Veja a semana por disciplina, BNCC ou tipo.",
    lead: <>A mesma semana, <strong>4 perspectivas diferentes</strong>: por disciplina, por habilidade BNCC, por tipo de aula (expositiva/prática/avaliativa) ou por intensidade cognitiva.</>,
    chips: [{ label: "📚 Por disciplina", solid: true }, { label: "🎯 Por BNCC" }, { label: "🌈 Por tipo" }], crumb: "Calendário com camadas" },
  m5: { badge: "★ MUDANÇA #5 · REORGANIZAÇÃO SEM DOR", title: "Drag & drop entre dias + replicar em turmas.", sub: "Choveu? Arrasta. Deu certo? Replica.",
    lead: <>Plano não é estático. <strong>Choveu e a aula externa não rolou?</strong> Arrasta pra próxima quarta. <strong>A semana foi um sucesso?</strong> Replica em outras turmas com 1 clique. Trabalho de 30min vira 30 segundos.</>,
    chips: [{ label: "↕ Arrastar entre dias", solid: true }, { label: "⎘ Replicar em N turmas" }, { label: "⊞ Duplicar semana inteira" }], crumb: "Drag & drop · multi-turma" },
  m6: { badge: "★ MUDANÇA #6 · APRENDIZADO CONTÍNUO", title: "Diário de bordo em 3 cliques.", sub: "O que rolou hoje? Sofia aprende.",
    lead: <>Após cada aula, 3 toques: <strong>funcionou / travou / próximo passo</strong>. Esse registro alimenta a Sofia pra ela preencher melhor as semanas seguintes — adaptado ao que <strong>essa</strong> turma responde.</>,
    chips: [{ label: "😊 Funcionou", solid: true }, { label: "😕 Travou" }, { label: "➡ Próximo passo" }], crumb: "Diário de bordo" },
};

const TABS: Array<{ k: MKey; num: string; label: string }> = [
  { k: "m1", num: "M1", label: "Sofia preenche a semana" },
  { k: "m2", num: "M2", label: "Sequência didática" },
  { k: "m3", num: "M3", label: "Editor conversacional" },
  { k: "m4", num: "M4", label: "Calendário com camadas" },
  { k: "m5", num: "M5", label: "Drag & drop · multi-turma" },
  { k: "m6", num: "M6", label: "Diário de bordo" },
];

const TURMAS = [
  { id: "2b", name: "2º Ano B", sub: "22 alunos", pcd: "1 PCD · TDAH", gain: "+5 aulas" },
  { id: "2c", name: "2º Ano C", sub: "26 alunos · sem PCD", gain: "+5 aulas" },
  { id: "3a", name: "3º Ano A", sub: "23 alunos · ano diferente", warn: "⚠ adapt." },
];

export function Planejamento() {
  const search = useSearch({ from: "/planejamento" }) as { m?: MKey };
  const navigate = useNavigate({ from: "/planejamento" });
  const [m, setM] = useState<MKey>(search.m || "m5");
  const [week, setWeek] = useState<Week>(INITIAL_WEEK);
  const [dropDay, setDropDay] = useState<DayKey | null>(null);
  const dragCard = useRef<{ from: DayKey; id: string } | null>(null);
  const [picks, setPicks] = useState<Record<string, boolean>>({ "2b": true, "2c": true });
  const [tipOpen, setTipOpen] = useState(true);
  const [toast, setToast] = useState<{ msg: string; key: number } | null>(null);
  const [pillsFoco, setPillsFoco] = useState<Record<string, boolean>>({ Letramento: true, Numeramento: true, Socioemocional: false });
  const [pillsInt, setPillsInt] = useState<"Leve" | "Equilibrada" | "Densa">("Equilibrada");
  const [calSel, setCalSel] = useState<DayKey>("seg");

  const setMudanca = (k: MKey) => {
    setM(k);
    navigate({ search: { m: k }, replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showToast = (msg: string) => setToast({ msg, key: Date.now() });

  const onDragStart = (from: DayKey, id: string) => { dragCard.current = { from, id }; };
  const onDragOver = (e: React.DragEvent, day: DayKey) => { e.preventDefault(); setDropDay(day); };
  const onDragLeave = () => setDropDay(null);
  const onDrop = (e: React.DragEvent, to: DayKey) => {
    e.preventDefault();
    setDropDay(null);
    const d = dragCard.current; if (!d) return;
    if (d.from === to) return;
    setWeek((w) => {
      const card = w[d.from].find((c) => c.id === d.id); if (!card || card.locked) return w;
      return { ...w, [d.from]: w[d.from].filter((c) => c.id !== d.id), [to]: [...w[to], card] };
    });
    dragCard.current = null;
    showToast(`Cartão movido para ${to.toUpperCase()}. Sofia confirmou ausência de conflito. ✓`);
  };

  const cfg = M_CONFIG[m];
  const pickCount = useMemo(() => Object.values(picks).filter(Boolean).length, [picks]);

  return (
    <div className="pl-root">
      <style>{sidebarCss}</style>
      <style>{css}</style>
      <div className="pl-app">
        <AppSidebar active="planning" />
        <div className="pl-main">
          <div className="pl-topbar">
            <div className="pl-crumbs">
              <span>AgilizaProf</span><span className="sep">/</span>
              <span>Planejamento</span><span className="sep">/</span>
              <strong>{cfg.crumb}</strong>
            </div>
            <div className="pl-top-meta">
              <span><span className="sdot" />Sofia online</span>
              <span>qua · 29 abr · 18:31</span>
              <div className="av" title="Profª Carla R.">CR</div>
            </div>
          </div>

          {/* HERO */}
          <div className="pl-hero">
            <span className="badge">{cfg.badge}</span>
            <h1>{cfg.title}<em>{cfg.sub}</em></h1>
            <p className="lead">{cfg.lead}</p>
            <div className="chips">
              {cfg.chips.map((c, i) => (
                <button key={i} className={"hbc " + (c.solid ? "solid" : "outline")}>{c.label}</button>
              ))}
            </div>
          </div>

          {/* TABS */}
          <div className="pl-tabbar" role="tablist">
            {TABS.map((t) => (
              <button key={t.k} className={"pl-tab" + (m === t.k ? " active" : "")} onClick={() => setMudanca(t.k)} role="tab" aria-selected={m === t.k}>
                <span className="num">{t.num}</span> {t.label}
              </button>
            ))}
          </div>

          <div className="pl-workspace">
            {m === "m5" && (
              <>
                <div className="pl-tools">
                  <div><h2>Semana 11–15 abr <small>· 2º Ano A · 22 alunos</small></h2></div>
                  <div className="right">
                    <button className="pl-btn ghost"><ChevronLeft size={14} /> Anterior</button>
                    <button className="pl-btn ghost">Próxima <ChevronRight size={14} /></button>
                    <button className="pl-btn"><Plus size={14} /> Adicionar atividade</button>
                    <button className="pl-btn primary" onClick={() => showToast("Sofia está montando sugestões... ✨")}><Sparkles size={14} /> Gerar com Sofia</button>
                  </div>
                </div>

                <div className="pl-layout">
                  <div>
                    <div className="pl-week">
                      {DAYS.map((d) => {
                        const cards = week[d.k];
                        const empty = cards.length === 0;
                        return (
                          <div
                            key={d.k}
                            className={"pl-day" + (empty ? " empty" : "") + (dropDay === d.k ? " drop" : "")}
                            onDragOver={(e) => onDragOver(e, d.k)}
                            onDragLeave={onDragLeave}
                            onDrop={(e) => onDrop(e, d.k)}
                          >
                            <div className="pl-day-head">
                              <div><div className="dn">{d.n}</div><div className="dd">{d.d}</div></div>
                              <button className="add" aria-label={`Adicionar atividade em ${d.n}`}><Plus size={14} /></button>
                            </div>
                            {cards.map((c) => (
                              <div
                                key={c.id}
                                className={"pl-card " + c.v + (c.locked ? " locked" : "")}
                                draggable={!c.locked}
                                onDragStart={() => onDragStart(d.k, c.id)}
                              >
                                {c.locked && <span className="lock"><Lock size={11} /></span>}
                                <div className="top">
                                  <span className="tag">{c.tag}</span>
                                  {!c.locked && <span className="handle"><GripVertical size={12} /></span>}
                                </div>
                                <div className="ttl">{c.title}</div>
                                <div className="meta">{c.meta.split(" · ").map((p, i) => (
                                  <span key={i}>{i > 0 && <span className="mdot" style={{ marginRight: 6 }} />}{p}</span>
                                ))}</div>
                              </div>
                            ))}
                            {empty && (
                              <div className="pl-empty-slot">
                                <div className="ic"><Plus size={14} /></div>
                                <div>Solte um cartão aqui<br />ou peça pra Sofia</div>
                                <button className="sb" onClick={() => showToast("Sofia está sugerindo uma aula... ✨")}><Sparkles size={11} /> Sugerir aula</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {tipOpen && (
                      <div className="pl-tip">
                        <Lightbulb size={14} color="#B45309" />
                        <span><strong>Dica:</strong> arraste qualquer cartão pra outro dia. Os cartões avaliação e escola ficam fixos por padrão (Sofia avisa se mover puder dar conflito).</span>
                        <button className="x" onClick={() => setTipOpen(false)} aria-label="Fechar dica"><X size={14} /></button>
                      </div>
                    )}
                  </div>

                  <aside className="pl-side">
                    <div className="pl-panel">
                      <h3><Copy size={14} /> Replicar em turmas</h3>
                      <p className="lead">A semana ficou boa? Aplique em <b>1 clique</b> nas outras turmas. Sofia adapta automaticamente datas e PCDs.</p>
                      {TURMAS.map((t) => {
                        const on = !!picks[t.id];
                        return (
                          <button key={t.id} className={"pl-trow" + (on ? " on" : "")} onClick={() => setPicks((p) => ({ ...p, [t.id]: !p[t.id] }))}>
                            <span className="chk">{on && <Check size={11} />}</span>
                            <span className="info">
                              <span className="name">{t.name}</span>
                              <span className="sub">
                                {t.sub}{t.pcd && <> · <span className="pcd">{t.pcd}</span></>}{t.warn && <span className="warn">{t.warn}</span>}
                              </span>
                            </span>
                            {t.gain && <span className="gain">{t.gain}</span>}
                          </button>
                        );
                      })}
                      <button className="pl-btn primary pl-replica-cta" onClick={() => showToast(`Semana replicada em ${pickCount} turma(s). Sofia adaptou 2 atividades para PCD. ✓`)}>
                        <Check size={14} /> Replicar em {pickCount} turmas
                      </button>
                      <div className="pl-replica-eco">Economia: <b>~25min por turma</b></div>
                    </div>

                    <div className="pl-panel">
                      <h3><Clock size={14} /> Histórico</h3>
                      <div className="pl-hist"><span className="icn b" /><div className="body"><b>Mover</b> · 13 abr (chuva)<div className="me">há 12 min · Sofia ok</div></div></div>
                      <div className="pl-hist"><span className="icn o" /><div className="body"><b>Replicar</b> · 5ºA → 5ºB<div className="me">há 2h · 5 atividades</div></div></div>
                      <div className="pl-hist"><span className="icn g" /><div className="body"><b>Duplicar semana</b> · 28 mar<div className="me">7 atividades</div></div></div>
                      <button className="pl-hist-link">Ver histórico completo →</button>
                    </div>
                  </aside>
                </div>
              </>
            )}

            {m === "m1" && (
              <>
                <div className="pl-tools">
                  <div><h2>Sofia preenche a semana <small>· 2º Ano A · tema: Listas e contagem</small></h2></div>
                  <div className="right">
                    <button className="pl-btn ghost"><RefreshCw size={14} /> Regenerar</button>
                    <button className="pl-btn primary"><Check size={14} /> Aceitar semana toda</button>
                  </div>
                </div>

                <div className="pl-m1">
                  <div className="pl-cal-card">
                    <div className="pl-cal-head">
                      <div className="nav">
                        <button aria-label="Anterior"><ChevronLeft size={14} /></button>
                        <div className="month">Semana 11–15 abr · Abril 2026</div>
                        <button aria-label="Próxima"><ChevronRight size={14} /></button>
                      </div>
                      <div className="stat">✨ <b>11 sugestões</b> · alinhadas à BNCC</div>
                    </div>
                    <div className="pl-cal-grid">
                      {[
                        { k: "seg" as DayKey, n: "SEG", d: "11", count: "3 aulas", items: [
                          { v: "", sub: "Língua Port.", tt: "Mercadinho · escrita de listas", mn: "50min · EF02LP07" },
                          { v: "mat", sub: "Matemática", tt: "Soma de valores em reais", mn: "50min · EF02MA05" },
                          { v: "ci", sub: "Ciências", tt: "O que cabe na lista?", mn: "30min · roda" },
                        ]},
                        { k: "ter" as DayKey, n: "TER", d: "12", count: "2 aulas", items: [
                          { v: "mat", sub: "Matemática", tt: "Inventário de brinquedos", mn: "45min · EF02MA03" },
                          { v: "aval", sub: "Avaliação", tt: "Diagnóstico de leitura", mn: "50min · 🔒 fixo" },
                        ]},
                        { k: "qua" as DayKey, n: "QUA", d: "13", count: "2 aulas", items: [
                          { v: "", sub: "Língua Port.", tt: "Receita maluca · listas", mn: "40min · EF02LP07" },
                          { v: "ci", sub: "Ciências", tt: "Plantio de feijão · dia 1", mn: "40min · roda" },
                        ]},
                        { k: "qui" as DayKey, n: "QUI", d: "14", count: "2 aulas", items: [
                          { v: "", sub: "Língua Port.", tt: "Corrida das palavras e nº", mn: "50min · EF02LP04" },
                          { v: "aval", sub: "Escola", tt: "Conselho de classe", mn: "14h-17h · 🔒 fixo" },
                        ]},
                        { k: "sex" as DayKey, n: "SEX", d: "15", count: "2 aulas", items: [
                          { v: "mat", sub: "Matemática", tt: "Mercadinho · prática", mn: "50min · EF02MA05" },
                          { v: "", sub: "Síntese", tt: "Roda final · o que aprendemos?", mn: "30min" },
                        ]},
                      ].map((day) => (
                        <button key={day.k} className={"pl-cal-day has-ai" + (calSel === day.k ? " selected" : "")} onClick={() => setCalSel(day.k)}>
                          <div className="pl-cd-head">
                            <div><div className="dn">{day.n}</div><div className="dd">{day.d}</div></div>
                            <span className="pl-cd-pill">{day.count}</span>
                          </div>
                          {day.items.map((it, i) => (
                            <div key={i} className={"pl-ai " + it.v}>
                              <div className="sub">{it.sub}</div>
                              <div className="tt">{it.tt}</div>
                              <div className="mn">{it.mn}</div>
                            </div>
                          ))}
                        </button>
                      ))}
                    </div>
                  </div>

                  <aside className="pl-side">
                    <div className="pl-panel accent">
                      <h3>Parâmetros da geração</h3>
                      <p className="lead">Ajuste e regenere se quiser outra direção.</p>
                      <div className="pl-field">
                        <label>Tema do mês</label>
                        <input className="pl-input" defaultValue="Listas e contagem" />
                      </div>
                      <div className="pl-field">
                        <label>Foco da semana</label>
                        <div className="pl-pills">
                          {(["Letramento", "Numeramento", "Socioemocional"] as const).map((p) => (
                            <button key={p} className={"pl-pill" + (pillsFoco[p] ? " on" : "")} onClick={() => setPillsFoco((s) => ({ ...s, [p]: !s[p] }))}>{p}</button>
                          ))}
                        </div>
                      </div>
                      <div className="pl-field">
                        <label>Intensidade</label>
                        <div className="pl-pills">
                          {(["Leve", "Equilibrada", "Densa"] as const).map((p) => (
                            <button key={p} className={"pl-pill" + (pillsInt === p ? " on" : "")} onClick={() => setPillsInt(p)}>{p}</button>
                          ))}
                        </div>
                      </div>
                      <button className="pl-btn primary pl-replica-cta"><RefreshCw size={14} /> Regenerar com esses parâmetros</button>
                    </div>

                    <div className="pl-panel">
                      <h3>O que Sofia considerou</h3>
                      <div className="pl-stats">
                        <div className="pl-stat-box"><div className="v">11</div><div className="l">Atividades</div></div>
                        <div className="pl-stat-box"><div className="v green">4</div><div className="l">Habilidades BNCC</div></div>
                        <div className="pl-stat-box"><div className="v orange">2</div><div className="l">Adapt. PCD</div></div>
                        <div className="pl-stat-box"><div className="v">~6min</div><div className="l">Pra revisar</div></div>
                      </div>
                      <div className="pl-bncc">
                        <div className="pl-bncc-item"><span className="code">EF02LP07</span><span className="desc">Escrever listas tematicamente organizadas</span></div>
                        <div className="pl-bncc-item"><span className="code">EF02LP04</span><span className="desc">Ler palavras com fluência</span></div>
                        <div className="pl-bncc-item"><span className="code">EF02MA03</span><span className="desc">Comparar quantidades</span></div>
                        <div className="pl-bncc-item"><span className="code">EF02MA05</span><span className="desc">Resolver problemas de adição até 1.000</span></div>
                      </div>
                    </div>
                  </aside>
                </div>
              </>
            )}

            {m !== "m5" && m !== "m1" && (
              <div className="pl-generic">
                <span className="badge-big">{m.toUpperCase()}</span>
                <h3>{cfg.title.replace(".", "")}</h3>
                <p>{m === "m2" && "Sofia conecta atividades em sequência mantendo continuidade pedagógica entre os dias. Quando você adiciona uma aula, ela sugere a próxima do mesmo eixo."}
                  {m === "m3" && "Edite atividades conversando com Sofia em linguagem natural — \"torna mais fácil\", \"adapta pra TDAH\", \"encurta pra 30 min\". Zero formulário."}
                  {m === "m4" && "Visão por disciplina, por habilidade BNCC, por tipo de aula — alterne camadas com 1 clique e veja a semana sob cada perspectiva."}
                  {m === "m6" && "Após cada aula, registre 3 cliques: o que funcionou, o que travou, próximo passo. Sofia usa isso pra preencher melhor as próximas semanas."}
                </p>
                <div className="actions">
                  <button className="pl-btn primary">Ver demo desta mudança</button>
                  <button className="pl-btn">Ler proposta completa</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div key={toast.key} className="pl-toast show">
          <Move size={14} className="ic" />
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)}>Desfazer</button>
        </div>
      )}
    </div>
  );
}
