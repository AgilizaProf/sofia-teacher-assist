import React, { useState, useMemo, useRef, useEffect } from "react";
import { useSearch, useNavigate } from "@tanstack/react-router";
import { mentionsName } from "@/lib/sofia/mentions";
import { sanitizeFilter, sanitizeM6Filters, type M6FilterState } from "@/lib/sofia/m6Filters";
import { useEiMode } from "@/lib/ei/useEiMode";
import {
  Sparkles, Plus, ChevronLeft, ChevronRight, RefreshCw, Check,
  Lock, GripVertical, Lightbulb, X, Clock, Copy, Move,
  Link2, MessageSquare, Send, Layers, BookOpen, Smile, Frown, ArrowRight, ArrowDownUp, Download, Printer, Pencil,
} from "lucide-react";
import { AppSidebar, sidebarCss } from "@/components/AppSidebar";
import { EmptyState, emptyStateCss } from "@/components/EmptyState";
import { imprimirPlanejamentoDireto } from "@/lib/print/planejamentoDireto";
import { PrintInfoModal, type PrintInfo } from "@/components/print/PrintInfoModal";
import { SofiaContextChip } from "@/components/sofia/SofiaContextChip";
import { Header as AppHeader } from "@/components/Header";
import { usePersistentState } from "@/lib/persist/usePersistentState";
import { supabase } from "@/integrations/supabase/client";
import { consumirCreditos } from "@/lib/creditos/consume";
import { CUSTOS } from "@/lib/creditos/policy";
import { useHydrated } from "@/hooks/useHydrated";
import { PlanoAtividadeEditor } from "@/components/atividade/PlanoAtividadeEditor";
import { TrilhasPanel } from "@/components/trilhas/TrilhasPanel";
import { useSofiaUserData } from "@/lib/sofia/SofiaUserContext";
import { useTurmas } from "@/hooks/useTurmas";
import { Skeleton } from "@/components/ui/skeleton";

const css = `
.pl-root{
  --primary:#1B2A4E;--primary-dark:#0F1B36;
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

.pl-hero{margin:18px 24px 0;background:linear-gradient(135deg,var(--primary) 0%,var(--primary-dark) 100%);border-radius:16px;padding:24px 28px;color:#fff;position:relative;overflow:hidden;box-shadow:var(--shadow-md);}
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

.pl-tabbar{margin:18px 24px 0;background:linear-gradient(180deg,var(--primary) 0%,var(--primary-dark) 100%);border:1px solid var(--navy-darker);border-radius:11px;padding:6px;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;align-items:stretch;}
@media(max-width:1100px){.pl-tabbar{grid-template-columns:repeat(4,minmax(0,1fr));}}
@media(max-width:720px){.pl-tabbar{grid-template-columns:repeat(2,minmax(0,1fr));}}
.pl-tab{min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:8px 10px;border-radius:8px;color:#fff !important;font-size:12px;font-weight:600;line-height:1.2;text-align:center;white-space:normal;overflow-wrap:break-word;word-break:break-word;border:1px solid transparent;transition:.15s;cursor:pointer;background:transparent;}
.pl-tab .num{flex:0 0 auto;}
.pl-tab .num{display:inline-grid;place-items:center;padding:2px 6px;border-radius:5px;background:var(--orange);color:#fff !important;font-size:10.5px;font-weight:700;font-family:'JetBrains Mono',monospace;}
.pl-tab:hover{background:rgba(255,255,255,.08);color:#fff;}
.pl-tab.active{background:linear-gradient(135deg,var(--orange),#FF9466);color:#fff;box-shadow:0 4px 10px rgba(255,122,69,.35);}
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
.pl-cal-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;table-layout:fixed;width:100%;}
@media(max-width:1100px){.pl-cal-grid{grid-template-columns:repeat(5,minmax(140px,1fr));overflow-x:auto;}}
.pl-cal-day{background:#FAFBFD;border:1px solid var(--line);border-radius:11px;padding:10px;min-height:240px;display:flex;flex-direction:column;gap:6px;transition:.15s;cursor:pointer;position:relative;min-width:0;overflow:hidden;}
.pl-cal-day:hover{border-color:var(--orange);box-shadow:0 4px 12px rgba(255,122,69,.08);}
.pl-cal-day.has-ai{background:#fff;border-color:#FED7C4;}
.pl-cal-day.has-ai::after{content:"✨";position:absolute;top:7px;right:7px;font-size:11px;opacity:.7;}
.pl-cal-day.selected{border-color:var(--orange);background:#fff;box-shadow:0 0 0 2px var(--orange-soft-2);}
.pl-cd-head{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:6px;}
.pl-cd-head .dn{font-size:10px;color:var(--muted);font-weight:700;letter-spacing:.14em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;}
.pl-cd-head .dd{font-family:'Fraunces',serif;font-size:16px;color:var(--ink);font-weight:600;}
.pl-cd-pill{font-size:9.5px;font-weight:600;padding:1px 6px;border-radius:5px;background:var(--orange-soft);color:var(--orange);letter-spacing:.04em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;}
.pl-ai{background:#fff;border:1px solid var(--line);border-radius:8px;padding:7px 8px 7px 11px;font-size:11px;position:relative;transition:.15s;cursor:pointer;min-width:0;overflow:hidden;}
.pl-ai:hover{border-color:#CBD5E1;background:#FBFBFD;}
.pl-ai::before{content:"";position:absolute;left:0;top:7px;bottom:7px;width:3px;border-radius:0 3px 3px 0;background:#3B82F6;}
.pl-ai.mat::before{background:#8B5CF6;}
.pl-ai.ci::before{background:#06B6D4;}
.pl-ai.aval::before{background:var(--amber);}
.pl-ai .sub{font-size:9px;color:#3B82F6;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:1px;font-family:'JetBrains Mono',monospace;}
.pl-ai.mat .sub{color:#8B5CF6;}
.pl-ai.ci .sub{color:#0891B2;}
.pl-ai.aval .sub{color:#B45309;}
.pl-ai .tt{color:var(--ink);font-weight:600;line-height:1.3;font-size:11.5px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;word-break:break-word;overflow-wrap:anywhere;}
.pl-ai .mn{color:var(--muted);font-size:10px;margin-top:2px;font-family:'JetBrains Mono',monospace;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word;overflow-wrap:anywhere;}
.pl-ai .sub{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}

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

/* M2 — sequência */
.pl-chain{display:grid;grid-template-columns:1fr 320px;gap:18px;}
@media(max-width:1200px){.pl-chain{grid-template-columns:1fr;}}
.pl-chain-card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px;box-shadow:var(--shadow-sm);}
.pl-chain-list{display:flex;flex-direction:column;gap:0;margin-top:10px;}
.pl-step{position:relative;display:grid;grid-template-columns:54px 1fr;gap:12px;padding:14px 0;border-left:2px dashed transparent;}
.pl-step .day{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;color:var(--muted);letter-spacing:.12em;padding-top:14px;text-align:right;padding-right:8px;}
.pl-step .body{position:relative;padding:14px 16px;background:#FAFBFD;border:1px solid var(--line);border-radius:11px;}
.pl-step .body::before{content:"";position:absolute;left:-22px;top:18px;width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid var(--orange);box-shadow:0 0 0 3px var(--orange-soft);}
.pl-step + .pl-step .body::after{content:"";position:absolute;left:-16px;top:-30px;height:30px;border-left:2px dashed #CBD5E1;}
.pl-step .tag{font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;color:var(--orange);}
.pl-step .ttl{font-size:14px;font-weight:600;color:var(--ink);margin:4px 0 4px;}
.pl-step .meta{color:var(--muted);font-size:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.pl-step .meta .pill{background:#fff;border:1px solid var(--line);padding:2px 7px;border-radius:5px;font-size:10.5px;color:var(--ink-2);font-family:'JetBrains Mono',monospace;}
.pl-step.suggest .body{background:#FFF8F2;border-color:#FED7C4;border-style:dashed;}
.pl-step.suggest .ttl{color:var(--orange-2);}
.pl-step.suggest .body::before{border-color:var(--orange);background:var(--orange);}
.pl-step{transition:transform .18s ease, opacity .18s ease, background .18s ease;}
.pl-step.dragging{opacity:.45;transform:scale(.98);}
.pl-step.drop-target > .body{box-shadow:0 0 0 2px var(--orange), 0 8px 22px rgba(255,122,69,.22);border-color:var(--orange);background:#FFF4EC;}
.pl-step.drop-target > .day{color:var(--orange);}
.pl-drop-ph{grid-column:1 / -1;height:0;margin:0;border-radius:8px;background:linear-gradient(90deg,var(--orange-soft),rgba(255,122,69,.35),var(--orange-soft));box-shadow:0 0 0 2px var(--orange-soft) inset;animation:plPhIn .18s ease forwards;}
@keyframes plPhIn{from{height:0;opacity:0;margin:0;}to{height:10px;opacity:1;margin:6px 0;}}

/* M3 — chat */
.pl-chat{display:grid;grid-template-columns:1fr 320px;gap:18px;}
@media(max-width:1200px){.pl-chat{grid-template-columns:1fr;}}
.pl-chat-card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:12px;box-shadow:var(--shadow-sm);}
.pl-act-card{border:1px solid var(--line);border-radius:12px;padding:14px;background:#FAFBFD;}
.pl-act-card h4{font-size:13px;font-family:'Fraunces',serif;color:var(--ink);margin-bottom:6px;}
.pl-act-card .meta{color:var(--muted);font-size:11.5px;display:flex;gap:8px;}
.pl-act-card .body{margin-top:10px;background:#fff;border:1px solid var(--line);border-radius:9px;padding:10px 12px;color:var(--ink-2);font-size:12.5px;line-height:1.55;}
.pl-msg{display:flex;gap:10px;align-items:flex-start;}
.pl-msg .av{width:28px;height:28px;border-radius:50%;background:var(--orange);color:#fff;display:grid;place-items:center;font-size:11px;font-weight:700;flex-shrink:0;}
.pl-msg.user .av{background:var(--navy);}
.pl-msg .bub{background:#FAFBFD;border:1px solid var(--line);border-radius:10px;padding:9px 12px;font-size:12.5px;color:var(--ink);max-width:85%;}
.pl-msg.user .bub{background:var(--orange-soft);border-color:#FED7C4;}
.pl-chat-input{display:flex;gap:8px;border:1px solid var(--line);border-radius:11px;padding:6px 6px 6px 12px;background:#fff;}
.pl-chat-input input{flex:1;border:none;outline:none;font-family:inherit;font-size:13px;color:var(--ink);background:transparent;}
.pl-chat-input button{background:var(--orange);color:#fff;border-radius:8px;padding:7px 12px;font-weight:600;font-size:12px;display:inline-flex;gap:5px;align-items:center;}
.pl-quickies{display:flex;flex-wrap:wrap;gap:6px;}
.pl-quickies button{background:#fff;border:1px solid var(--line);border-radius:999px;padding:5px 10px;font-size:11.5px;color:var(--ink-2);}
.pl-quickies button:hover{border-color:var(--orange);color:var(--orange);}

/* M4 — camadas */
.pl-layers-bar{display:flex;gap:6px;flex-wrap:wrap;background:#fff;border:1px solid var(--line);border-radius:11px;padding:5px;margin-bottom:14px;}
.pl-lay{padding:8px 12px;border-radius:8px;font-size:12px;font-weight:600;color:var(--muted);display:inline-flex;align-items:center;gap:6px;}
.pl-lay:hover{background:var(--bg);color:var(--ink);}
.pl-lay.on{background:var(--navy);color:#fff;}
.pl-legend{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;font-size:11.5px;color:var(--muted);}
.pl-legend .it{display:inline-flex;align-items:center;gap:5px;}
.pl-legend .sw{width:10px;height:10px;border-radius:3px;}

/* M6 — diário */
.pl-diary{display:grid;grid-template-columns:1fr 320px;gap:18px;}
@media(max-width:1200px){.pl-diary{grid-template-columns:1fr;}}
.pl-diary-card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;box-shadow:var(--shadow-sm);}
.pl-diary-row{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;padding:12px;border:1px solid var(--line);border-radius:11px;margin-bottom:10px;background:#FAFBFD;}
.pl-diary-row .ttl{font-size:13px;font-weight:600;color:var(--ink);}
.pl-diary-row .sub{color:var(--muted);font-size:11.5px;margin-top:2px;}
.pl-mood{display:flex;gap:6px;}
.pl-mood button{width:34px;height:34px;border-radius:9px;border:1px solid var(--line);background:#fff;display:grid;place-items:center;color:var(--muted);}
.pl-mood button:hover{border-color:#CBD5E1;}
.pl-mood button.ok.on{background:#DCFCE7;border-color:#86EFAC;color:#15803D;}
.pl-mood button.warn.on{background:#FEF3C7;border-color:#FCD34D;color:#92400E;}
.pl-mood button.next.on{background:var(--orange-soft);border-color:#FED7C4;color:var(--orange-2);}
.pl-learnt{padding:12px 14px;background:linear-gradient(135deg,#FFF4ED,#FFFAF7);border:1px solid #FED7C4;border-radius:12px;font-size:12.5px;color:#7A2E0A;line-height:1.5;display:flex;gap:10px;align-items:flex-start;}
.pl-d6{display:grid;grid-template-columns:1.4fr 1fr;gap:18px;}
@media(max-width:1100px){.pl-d6{grid-template-columns:1fr;}}
.pl-d6-card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px;box-shadow:var(--shadow-sm);}
.pl-d6-emojis{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 12px;}
.pl-d6-emojis button{width:48px;height:48px;border-radius:12px;border:1px solid var(--line);background:#fff;font-size:22px;cursor:pointer;transition:all .18s;}
.pl-d6-emojis button:hover{transform:translateY(-2px);}
.pl-d6-emojis button.on{background:var(--orange-soft);border-color:var(--orange);transform:scale(1.08);box-shadow:0 6px 18px rgba(249,115,22,.25);}
.pl-d6-tags{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0;}
.pl-d6-tags button{padding:6px 10px;border-radius:99px;border:1px solid var(--line);background:#fff;font-size:11.5px;cursor:pointer;color:var(--muted);font-weight:600;}
.pl-d6-tags button.on{background:var(--navy,#0F172A);color:#fff;border-color:var(--navy,#0F172A);}
.pl-d6-textarea{width:100%;min-height:80px;border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-size:13px;font-family:inherit;resize:vertical;}
.pl-d6-entry{padding:12px;border:1px solid var(--line);border-radius:11px;margin-bottom:10px;background:#FAFBFD;animation:fade-in .35s ease-out;}
.pl-d6-entry .head{display:flex;gap:10px;align-items:center;font-size:12px;color:var(--muted);margin-bottom:4px;}
.pl-d6-entry .ttl{font-size:13.5px;font-weight:700;color:var(--ink);display:flex;gap:8px;align-items:center;}
.pl-d6-entry .body{font-size:12.5px;color:var(--muted);margin-top:4px;line-height:1.5;}
.pl-d6-entry .chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;}
.pl-d6-entry .chips span{padding:3px 8px;border-radius:99px;background:rgba(15,23,42,.06);font-size:10.5px;color:var(--ink);font-weight:600;}
.pl-d6-progress{height:8px;background:#F1F5F9;border-radius:99px;overflow:hidden;margin-top:6px;}
.pl-d6-progress > div{height:100%;background:linear-gradient(90deg,var(--orange),#FB923C);transition:width .4s;}
.pl-d6-pattern{padding:14px;border-radius:12px;background:linear-gradient(135deg,#FFF4ED,#FFFAF7);border:1px dashed var(--orange);margin-bottom:12px;}
@keyframes fade-in{from{opacity:0;transform:translateY(-6px);}to{opacity:1;transform:translateY(0);}}
@media (prefers-reduced-motion: reduce){
  .pl-d6-entry{animation:none !important;}
  .pl-d6-emojis button{transition:none !important;}
  .pl-d6-emojis button:hover{transform:none !important;}
}

.pl-toast{position:fixed;bottom:24px;left:50%;transform:translate(-50%,80px);background:var(--navy);color:#fff;padding:11px 16px;border-radius:10px;box-shadow:var(--shadow-lg);font-size:12.5px;display:flex;align-items:center;gap:10px;z-index:60;opacity:0;transition:.25s;pointer-events:none;}
.pl-toast.show{opacity:1;transform:translate(-50%,0);pointer-events:auto;}
.pl-toast .ic{color:var(--orange);}
.pl-toast button{color:var(--orange);font-weight:600;font-size:12px;padding:4px 8px;border-radius:6px;cursor:pointer;background:none;border:none;}
.pl-toast button:hover{background:rgba(255,255,255,.08);}

@keyframes pl-blink{0%,80%,100%{opacity:.25;}40%{opacity:1;}}
@keyframes pl-highlight{
  0%{background:rgba(249,115,22,.28);box-shadow:0 0 0 3px rgba(249,115,22,.18);}
  60%{background:rgba(249,115,22,.12);box-shadow:0 0 0 2px rgba(249,115,22,.08);}
  100%{background:transparent;box-shadow:0 0 0 0 transparent;}
}
.pl-novo{animation:pl-highlight 1.6s ease-out, pl-blink 1s ease-in-out 2;border-radius:8px;padding:2px 6px;margin:-2px -6px;}
.pl-badge-novo{animation:pl-blink 1s ease-in-out 3;}

@media(max-width:880px){.pl-app{grid-template-columns:1fr;}}
@media(max-width:480px){
  .pl-tabbar{margin:14px 12px 0;grid-template-columns:repeat(2,minmax(0,1fr));}
  .pl-workspace{padding:14px 12px 80px;}
  .pl-hero{padding:16px;}
  .pl-hero h1{font-size:20px;}
}
`;

type MKey = "m1" | "m2" | "m3" | "m4" | "m5" | "m6" | "atv" | "pcd" | "trilhas";
type Variant = "port" | "mat" | "aval" | "esc" | "ci";
type Card = { id: string; v: Variant; tag: string; title: string; meta: string; locked?: boolean };
type DayKey = "seg" | "ter" | "qua" | "qui" | "sex";
type Week = Record<DayKey, Card[]>;

const DAYS: Array<{ k: DayKey; n: string; d: string }> = [
  { k: "seg", n: "SEG", d: "11" }, { k: "ter", n: "TER", d: "12" },
  { k: "qua", n: "QUA", d: "13" }, { k: "qui", n: "QUI", d: "14" },
  { k: "sex", n: "SEX", d: "15" },
];

const INITIAL_WEEK: Week = { seg: [], ter: [], qua: [], qui: [], sex: [] };

const M_CONFIG: Record<MKey, { badge: string; title: string; sub: string; lead: React.ReactNode; chips: Array<{ label: string; solid?: boolean }>; crumb: string }> = {
  atv: { badge: "★ ATIVIDADES · TODA A TURMA", title: "Planejamento de atividades.", sub: "Sofia gera o plano completo a partir do ano escolar.",
    lead: <>Defina turma, ano e tema. Sofia entrega <strong>título, objetivo, descrição em 3 blocos, habilidades BNCC, adaptações PCD, sugestões e materiais</strong> — tudo editável.</>,
    chips: [{ label: "✨ Gerar com Sofia", solid: true }, { label: "🎯 BNCC por ano" }, { label: "📋 Material" }], crumb: "Atividades" },
  pcd: { badge: "★ ATIVIDADES · ALUNOS PCD", title: "Planejamento para alunos com PCD.", sub: "Adaptações por necessidade, baseadas no cadastro.",
    lead: <>Sofia usa os <strong>laudos cadastrados</strong> da turma e gera adaptações por categoria (TEA, TDAH, DI, Deficiência física). Edite tudo inline.</>,
    chips: [{ label: "♿ Adaptar PCD", solid: true }, { label: "👥 Por aluno" }, { label: "🧩 Por necessidade" }], crumb: "Atividades PCD" },
  m1: { badge: "★ MUDANÇA #1 · IA QUE OBSERVA", title: "Sofia preenche a semana por você.", sub: "Você revisa em 6 minutos. Não em 60.",
    lead: <>A IA esboça <strong>5 dias com 11 atividades</strong> baseadas no tema do mês, na BNCC e no histórico da turma. Você ajusta o que quiser e aprova com 1 clique.</>,
    chips: [{ label: "✨ Aceitar tudo", solid: true }, { label: "🔄 Regenerar" }], crumb: "Sofia preenche a semana" },
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
  trilhas: { badge: "★ TRILHAS · SEMESTRE INTEIRO", title: "Trilhas semestrais com BNCC.", sub: "Sofia distribui ~20 semanas conectadas.",
    lead: <>Defina turma, ano e disciplina. Sofia entrega <strong>tema central, distribuição mensal e 20 semanas encadeadas</strong> com habilidades BNCC oficiais.</>,
    chips: [{ label: "✨ Sugerir trilha", solid: true }, { label: "📅 20 semanas" }, { label: "🎯 BNCC oficial" }], crumb: "Trilhas semestrais" },
};

const TABS: Array<{ k: MKey; num: string; label: string }> = [
  { k: "atv", num: "M1", label: "Atividades" },
  { k: "pcd", num: "M2", label: "Atividades PCD" },
  { k: "m1",  num: "M3", label: "Sofia preenche a semana" },
  { k: "m4", num: "M4", label: "Calendário com camadas" },
  { k: "m5", num: "M5", label: "Drag & drop · multi-turma" },
  { k: "m6", num: "M6", label: "Diário de bordo" },
  { k: "trilhas", num: "M7", label: "Trilhas semestrais" },
];

const M2_STEPS: Array<{ d: string; tag: string; t: string; p: string; suggest?: boolean }> = [];
const M6_AULAS: Array<{ id: string; t: string; s: string }> = [];

type M2Step = { id: string; d: string; tag: string; t: string; p: string; suggest?: boolean };
const M2_DAY_OPTS = ["SEG", "TER", "QUA", "QUI", "SEX"] as const;
const M2_TAG_OPTS = [
  "Introdução", "Desenvolvimento", "Aprofundamento",
  "Prática guiada", "Prática autônoma", "Avaliação", "Revisão", "Síntese",
] as const;
const M2_BNCC_OPTS = [
  "EF02MA05 — Adição/subtração",
  "EF02MA06 — Sistema decimal",
  "EF02LP01 — Leitura fluente",
  "EF02LP07 — Produção textual",
  "EF02CI04 — Seres vivos",
  "EF02HI03 — Comunidade e tempo",
] as const;

// === M1 — Geração da semana pela Sofia ===
type M1AuditToken = {
  token: string;
  origens: Array<{ code: string; disciplina: string; tag: string; desc: string }>;
};
type M1Card = {
  id: string;
  v: Variant;
  tag: string;
  title: string;
  bncc: string;
  minutos: number;
  foco: string;
  motivo?: string;
  auditoria?: M1AuditToken[];
  // Detalhes ricos da atividade (opcionais; preenchidos pela Sofia ao gerar
  // ou pelo professor ao editar). Permitem "abrir" a atividade e revisar
  // objetivo, materiais, passos, avaliação e diferenciações.
  objetivo?: string;
  materiais?: string[];
  passos?: string[];
  avaliacao?: string;
  diferenciacao?: string;
  // Detalhes adicionais para um plano de aula mais elaborado.
  perguntasChave?: string[];
  conceitos?: string[];
  extensoes?: string[];
  licaoCasa?: string;
};
type M1Plan = Record<DayKey, M1Card[]>;
const EMPTY_M1_PLAN: M1Plan = { seg: [], ter: [], qua: [], qui: [], sex: [] };

// === M1 — Modal "Preencher só este dia" — BNCC por etapa/ano ===
type Etapa = "EI" | "EF1" | "EF2" | "EM";
type CompetenciaBNCC = { code: string; desc: string; v: Variant; tag: string; minutos: number };
type DisciplinaBNCC = { nome: string; competencias: CompetenciaBNCC[] };
type AnoBNCC = { ano: string; disciplinas: DisciplinaBNCC[] };

const BNCC_BY_ETAPA: Record<Etapa, { label: string; anos: AnoBNCC[] }> = {
  EI: {
    label: "Educação Infantil (Campos de experiência)",
    anos: [
      { ano: "Bebês (0–1a6m)", disciplinas: [
        { nome: "O eu, o outro e o nós", competencias: [
          { code: "EI01EO01", desc: "Perceber que suas ações têm efeitos nas outras crianças e nos adultos.", v: "esc", tag: "Identidade", minutos: 30 },
          { code: "EI01EO03", desc: "Interagir com crianças da mesma faixa etária e adultos.", v: "esc", tag: "Convivência", minutos: 30 },
        ]},
        { nome: "Corpo, gestos e movimentos", competencias: [
          { code: "EI01CG01", desc: "Movimentar partes do corpo para exprimir corporalmente emoções.", v: "esc", tag: "Movimento", minutos: 25 },
        ]},
      ]},
      { ano: "Crianças bem pequenas (1a7m–3a11m)", disciplinas: [
        { nome: "Escuta, fala, pensamento e imaginação", competencias: [
          { code: "EI02EF01", desc: "Dialogar com crianças e adultos, expressando desejos e necessidades.", v: "port", tag: "Linguagem oral", minutos: 30 },
          { code: "EI02EF04", desc: "Formular e responder perguntas sobre fatos da história narrada.", v: "port", tag: "Narrativa", minutos: 30 },
        ]},
        { nome: "Espaços, tempos, quantidades, relações e transformações", competencias: [
          { code: "EI02ET06", desc: "Utilizar conceitos básicos de tempo (agora, antes, durante, depois).", v: "ci", tag: "Tempo", minutos: 30 },
        ]},
      ]},
      { ano: "Crianças pequenas (4a–5a11m)", disciplinas: [
        { nome: "Escuta, fala, pensamento e imaginação", competencias: [
          { code: "EI03EF01", desc: "Expressar ideias, desejos e sentimentos sobre vivências em diferentes contextos.", v: "port", tag: "Oralidade", minutos: 35 },
          { code: "EI03EF09", desc: "Levantar hipóteses sobre gêneros textuais veiculados em portadores conhecidos.", v: "port", tag: "Letramento", minutos: 35 },
        ]},
        { nome: "Traços, sons, cores e formas", competencias: [
          { code: "EI03TS02", desc: "Expressar-se livremente por meio de desenho, pintura, colagem, dobradura e escultura.", v: "esc", tag: "Arte", minutos: 40 },
        ]},
        { nome: "Espaços, tempos, quantidades, relações e transformações", competencias: [
          { code: "EI03ET01", desc: "Estabelecer relações de comparação entre objetos.", v: "mat", tag: "Comparação", minutos: 30 },
          { code: "EI03ET07", desc: "Relacionar números às suas respectivas quantidades.", v: "mat", tag: "Quantidade", minutos: 30 },
        ]},
      ]},
    ],
  },
  EF1: {
    label: "Ensino Fundamental — Anos Iniciais",
    anos: [
      { ano: "1º ano", disciplinas: [
        { nome: "Língua Portuguesa", competencias: [
          { code: "EF01LP01", desc: "Reconhecer que textos são lidos e escritos da esquerda para a direita.", v: "port", tag: "Leitura", minutos: 40 },
          { code: "EF01LP04", desc: "Distinguir letras do alfabeto de outros sinais gráficos.", v: "port", tag: "Alfabetização", minutos: 30 },
        ]},
        { nome: "Matemática", competencias: [
          { code: "EF01MA01", desc: "Utilizar números naturais como indicador de quantidade ou de ordem em diferentes contextos.", v: "mat", tag: "Números", minutos: 40 },
          { code: "EF01MA08", desc: "Resolver problemas de adição e subtração com números até 20.", v: "mat", tag: "Operações", minutos: 45 },
        ]},
        { nome: "Ciências", competencias: [
          { code: "EF01CI02", desc: "Identificar partes do corpo humano e suas funções.", v: "ci", tag: "Corpo humano", minutos: 35 },
        ]},
      ]},
      { ano: "2º ano", disciplinas: [
        { nome: "Língua Portuguesa", competencias: [
          { code: "EF02LP01", desc: "Ler e compreender textos curtos com autonomia.", v: "port", tag: "Leitura", minutos: 40 },
          { code: "EF02LP07", desc: "Escrever textos curtos sobre vivências e temas estudados.", v: "port", tag: "Produção textual", minutos: 45 },
        ]},
        { nome: "Matemática", competencias: [
          { code: "EF02MA05", desc: "Construir fatos básicos da adição e subtração.", v: "mat", tag: "Operações", minutos: 45 },
          { code: "EF02MA06", desc: "Compor e decompor números até 1000.", v: "mat", tag: "Sistema decimal", minutos: 40 },
        ]},
        { nome: "Ciências", competencias: [
          { code: "EF02CI04", desc: "Descrever características de plantas e animais do entorno.", v: "ci", tag: "Seres vivos", minutos: 40 },
        ]},
        { nome: "História", competencias: [
          { code: "EF02HI03", desc: "Selecionar situações cotidianas que remetam à percepção de mudança.", v: "esc", tag: "Tempo", minutos: 35 },
        ]},
      ]},
      { ano: "3º ano", disciplinas: [
        { nome: "Língua Portuguesa", competencias: [
          { code: "EF03LP02", desc: "Ler e compreender textos com fluência.", v: "port", tag: "Fluência", minutos: 40 },
        ]},
        { nome: "Matemática", competencias: [
          { code: "EF03MA03", desc: "Compor e decompor números naturais até a ordem das unidades de milhar.", v: "mat", tag: "Sistema decimal", minutos: 45 },
          { code: "EF03MA08", desc: "Resolver problemas de multiplicação por meio de adição de parcelas iguais.", v: "mat", tag: "Multiplicação", minutos: 45 },
        ]},
      ]},
      { ano: "4º ano", disciplinas: [
        { nome: "Língua Portuguesa", competencias: [
          { code: "EF04LP10", desc: "Ler e compreender textos informativos identificando ideias-chave.", v: "port", tag: "Compreensão", minutos: 45 },
        ]},
        { nome: "Matemática", competencias: [
          { code: "EF04MA02", desc: "Mostrar relações entre números naturais por meio de comparação.", v: "mat", tag: "Números", minutos: 40 },
          { code: "EF04MA10", desc: "Resolver problemas envolvendo divisão com números naturais.", v: "mat", tag: "Divisão", minutos: 50 },
        ]},
      ]},
      { ano: "5º ano", disciplinas: [
        { nome: "Língua Portuguesa", competencias: [
          { code: "EF05LP09", desc: "Ler e compreender textos argumentativos identificando posicionamentos.", v: "port", tag: "Argumentação", minutos: 50 },
        ]},
        { nome: "Matemática", competencias: [
          { code: "EF05MA01", desc: "Ler, escrever e ordenar números racionais na forma decimal.", v: "mat", tag: "Decimais", minutos: 50 },
        ]},
      ]},
    ],
  },
  EF2: {
    label: "Ensino Fundamental — Anos Finais",
    anos: [
      { ano: "6º ano", disciplinas: [
        { nome: "Língua Portuguesa", competencias: [
          { code: "EF06LP02", desc: "Estabelecer relação entre contexto de produção e gêneros textuais.", v: "port", tag: "Gêneros", minutos: 50 },
        ]},
        { nome: "Matemática", competencias: [
          { code: "EF06MA03", desc: "Resolver problemas que envolvem múltiplos e divisores.", v: "mat", tag: "Números", minutos: 50 },
        ]},
      ]},
      { ano: "7º ano", disciplinas: [
        { nome: "Matemática", competencias: [
          { code: "EF07MA04", desc: "Resolver problemas com números racionais positivos e negativos.", v: "mat", tag: "Inteiros", minutos: 50 },
        ]},
        { nome: "Ciências", competencias: [
          { code: "EF07CI01", desc: "Discutir aplicação de máquinas térmicas no cotidiano.", v: "ci", tag: "Energia", minutos: 50 },
        ]},
      ]},
      { ano: "8º ano", disciplinas: [
        { nome: "Língua Portuguesa", competencias: [
          { code: "EF08LP02", desc: "Justificar diferenças de uso da norma-padrão em contextos diversos.", v: "port", tag: "Variação", minutos: 50 },
        ]},
      ]},
      { ano: "9º ano", disciplinas: [
        { nome: "Matemática", competencias: [
          { code: "EF09MA09", desc: "Compreender os processos de fatoração de expressões algébricas.", v: "mat", tag: "Álgebra", minutos: 50 },
        ]},
      ]},
    ],
  },
  EM: {
    label: "Ensino Médio (Áreas)",
    anos: [
      { ano: "1º ano", disciplinas: [
        { nome: "Linguagens", competencias: [
          { code: "EM13LP01", desc: "Relacionar textos a contextos de produção, considerando autoria, época e valores.", v: "port", tag: "Leitura crítica", minutos: 50 },
        ]},
        { nome: "Matemática", competencias: [
          { code: "EM13MAT101", desc: "Interpretar criticamente situações com dados estatísticos.", v: "mat", tag: "Estatística", minutos: 50 },
        ]},
      ]},
      { ano: "2º ano", disciplinas: [
        { nome: "Ciências da Natureza", competencias: [
          { code: "EM13CNT201", desc: "Analisar processos naturais e tecnológicos relativos à matéria e energia.", v: "ci", tag: "Energia", minutos: 50 },
        ]},
      ]},
      { ano: "3º ano", disciplinas: [
        { nome: "Ciências Humanas", competencias: [
          { code: "EM13CHS301", desc: "Problematizar hábitos e práticas individuais e coletivas no tempo e no espaço.", v: "esc", tag: "Sociedade", minutos: 50 },
        ]},
      ]},
    ],
  },
};

// Enriquece um M1Card com objetivo, materiais, passos, avaliação e
// diferenciações pedagógicas — derivados do tema, foco, tag e variante.
// Usado pela Sofia ao gerar a semana e pelo "+ Atividade" para que toda
// atividade nasça já elaborada e revisável pelo professor.
function enrichM1Card(card: M1Card, tema: string): M1Card {
  if (
    card.objetivo && card.passos && card.materiais &&
    card.perguntasChave && card.conceitos && card.extensoes && card.licaoCasa
  ) return card;
  const t = (tema || "tema do dia").trim() || "tema do dia";
  const v = card.v;
  const tag = (card.tag || "").toLowerCase();
  const foco = (card.foco || "").toLowerCase();
  const total = Math.max(20, card.minutos);
  const tAcolhida = Math.max(5, Math.round(total * 0.1));
  const tMobiliz = Math.max(5, Math.round(total * 0.12));
  const tExplor = Math.max(10, Math.round(total * 0.32));
  const tSistem = Math.max(8, Math.round(total * 0.22));
  const tProd   = Math.max(8, Math.round(total * 0.18));
  const tFech   = Math.max(5, total - (tAcolhida + tMobiliz + tExplor + tSistem + tProd));
  // Banco de materiais por variante
  const matsBase: Record<Variant, string[]> = {
    port: [
      "Quadro branco / lousa e canetões coloridos",
      "Cadernos, lápis e borracha (1 por estudante)",
      `Texto impresso ou livro paradidático relacionado a "${t}" (1 cópia para cada dupla)`,
      `Tarjetas com palavras-chave sobre "${t}"`,
      "Cartolinas A3 e canetinhas para o registro coletivo",
      "Cronômetro ou relógio visível para a turma",
    ],
    mat: [
      "Material dourado, tampinhas ou contadores (10 por dupla)",
      "Folha quadriculada (2 por estudante)",
      "Régua, lápis preto e lápis de cor",
      `Cartões com 6 problemas contextualizados sobre "${t}" (níveis crescentes)`,
      "Quadro branco para registro coletivo das estratégias",
      "Calculadora (apenas para conferência ao final)",
    ],
    ci: [
      "Lupa, recipientes plásticos e objetos do cotidiano",
      "Caderno de campo / folha de observação impressa",
      `Imagens, infográfico ou vídeo curto (até 3 min) sobre "${t}"`,
      "Roteiro de investigação com 4 perguntas-guia",
      "Cartolinas para registro de hipóteses e descobertas",
      "Etiquetas adesivas para classificação",
    ],
    esc: [
      "Cadeiras dispostas em roda / espaço aberto",
      `Música, fotografias ou objetos disparadores sobre "${t}"`,
      "Cartolinas, canetinhas e revistas para colagem",
      "Tarjetas de sentimentos / valores",
      "Combinados visuais já fixados na sala",
      "Caixinha ou painel para registro coletivo",
    ],
    aval: [
      "Folha de avaliação impressa (1 por estudante)",
      "Lápis preto, borracha e caneta azul",
      "Cronômetro ou relógio visível",
      `Rubrica de critérios sobre "${t}" exposta no quadro`,
      "Folha de autoavaliação com 3 perguntas",
      "Envelopes para entrega individual",
    ],
  };
  const objetivos: Record<Variant, string> = {
    port: `Ampliar a leitura, a escrita e a oralidade dos estudantes a partir de "${t}", desenvolvendo ${tag || "linguagem"} com sentido. Espera-se que, ao final, cada estudante consiga (a) ler/interpretar um texto sobre o tema, (b) registrar uma produção escrita coerente e (c) socializar suas ideias com a turma.`,
    mat: `Desenvolver o raciocínio lógico-matemático aplicado a "${t}", consolidando ${tag || "operações e estratégias"} em situações reais. Espera-se que, ao final, cada estudante consiga (a) representar o problema com material concreto/desenho, (b) explicar pelo menos uma estratégia de resolução e (c) verificar se o resultado faz sentido.`,
    ci: `Estimular a investigação científica e o pensamento crítico sobre "${t}", articulando observação, hipótese, registro e comunicação. Espera-se que, ao final, cada estudante consiga (a) formular ao menos uma hipótese, (b) registrar dados de forma organizada e (c) discutir conclusões com base em evidências.`,
    esc: `Fortalecer competências socioemocionais e culturais a partir de "${t}", promovendo ${tag || "convivência, escuta e identidade"}. Espera-se que, ao final, cada estudante consiga (a) reconhecer o próprio sentir, (b) escutar o colega com empatia e (c) propor uma ação coletiva relacionada ao tema.`,
    aval: `Verificar, de forma processual e formativa, o que foi aprendido sobre "${t}", articulando autoavaliação, registro e devolutiva coerentes com ${card.bncc}. Espera-se que cada estudante consiga (a) demonstrar o aprendido, (b) identificar uma dificuldade e (c) propor um próximo passo.`,
  };
  // Passos detalhados (6 etapas) por variante.
  const passosByV: Record<Variant, string[]> = {
    port: [
      `1) Acolhida e aquecimento (${tAcolhida} min) — receba a turma com uma pergunta sobre "${t}". Registre 3 a 5 palavras que aparecerem na conversa em uma "nuvem de palavras" no quadro.`,
      `2) Mobilização (${tMobiliz} min) — apresente uma imagem, áudio ou trecho curto de texto sobre "${t}". Pergunte: "O que vocês perceberam? Que palavras chamam atenção?"`,
      `3) Leitura e exploração (${tExplor} min) — distribua o texto/livro sobre "${t}" para duplas. Peça que sublinhem palavras desconhecidas e marquem 1 trecho que mais gostaram. Circule, escutando.`,
      `4) Sistematização (${tSistem} min) — em roda, retome as palavras sublinhadas. Construa coletivamente um mapa de ideias no quadro conectando "${t}" às descobertas. Articule explicitamente com ${card.bncc}.`,
      `5) Produção (${tProd} min) — proponha que cada estudante (ou dupla) produza uma frase ou pequeno parágrafo sobre "${t}", reutilizando ao menos 2 palavras do mapa coletivo.`,
      `6) Fechamento e devolutiva (${tFech} min) — 3 a 4 estudantes leem suas produções. Reforce o que aprenderam e antecipe a próxima aula.`,
    ],
    mat: [
      `1) Acolhida (${tAcolhida} min) — apresente um problema-disparador real envolvendo "${t}" (ex.: situação da escola, do bairro). Pergunte: "O que esse problema está pedindo?"`,
      `2) Mobilização (${tMobiliz} min) — registre no quadro o que se sabe e o que falta descobrir. Estime uma resposta antes de calcular.`,
      `3) Exploração com material concreto (${tExplor} min) — em duplas, os estudantes resolvem com material dourado/tampinhas. Cada dupla representa o problema de duas formas diferentes.`,
      `4) Sistematização (${tSistem} min) — duas duplas socializam estratégias no quadro. Compare semelhanças e diferenças. Formalize o registro matemático coerente com ${card.bncc}.`,
      `5) Prática orientada (${tProd} min) — distribua 2 problemas similares em níveis diferentes. Quem terminar mais rápido apoia um colega.`,
      `6) Fechamento (${tFech} min) — autoavaliação rápida: "🟢 entendi / 🟡 tenho dúvida / 🔴 preciso revisar".`,
    ],
    ci: [
      `1) Acolhida (${tAcolhida} min) — exiba imagem/vídeo curto sobre "${t}". Pergunte: "O que vocês observam? O que isso te lembra?"`,
      `2) Levantamento de hipóteses (${tMobiliz} min) — registre no quadro 3 a 5 hipóteses da turma sobre "${t}". Numere cada uma para retomar depois.`,
      `3) Investigação prática (${tExplor} min) — em pequenos grupos, distribua o roteiro com 4 perguntas-guia e os materiais. Os estudantes observam, manipulam e registram no caderno de campo.`,
      `4) Socialização (${tSistem} min) — cada grupo apresenta 1 descoberta. Verifique quais hipóteses iniciais se confirmaram. Conecte com ${card.bncc}.`,
      `5) Síntese coletiva (${tProd} min) — construa coletivamente um esquema/cartaz com a explicação do fenômeno e o vocabulário científico aprendido.`,
      `6) Fechamento (${tFech} min) — peça que cada estudante escreva uma frase respondendo: "Hoje eu descobri que...".`,
    ],
    esc: [
      `1) Acolhida em roda (${tAcolhida} min) — saudação combinada e check-in com tarjetas de humor sobre o que sentem em relação a "${t}".`,
      `2) Mobilização (${tMobiliz} min) — disparador (música, foto, história curta) ligado a "${t}". Pergunte: "Onde isso aparece na sua vida?"`,
      `3) Vivência central (${tExplor} min) — proponha a dinâmica/jogo cooperativo descrito em "${card.title}". Combine regras de escuta e respeito antes de começar.`,
      `4) Roda de partilha (${tSistem} min) — cada estudante diz como se sentiu. Registre coletivamente padrões e aprendizados, articulando com ${card.bncc}.`,
      `5) Compromisso coletivo (${tProd} min) — turma constrói 1 combinado ou ação prática que leva o aprendizado para fora da sala.`,
      `6) Fechamento (${tFech} min) — gesto coletivo de encerramento (palmas, abraço de grupo, frase combinada).`,
    ],
    aval: [
      `1) Acolhida (${tAcolhida} min) — relembre os critérios de avaliação expostos no quadro. Esclareça dúvidas antes de iniciar.`,
      `2) Orientações (${tMobiliz} min) — leia coletivamente o enunciado da avaliação sobre "${t}" e responda perguntas iniciais.`,
      `3) Realização individual (${tExplor} min) — estudantes resolvem em silêncio. Circule observando estratégias.`,
      `4) Conferência guiada (${tSistem} min) — após o tempo, retome a primeira questão coletivamente para reduzir ansiedade.`,
      `5) Autoavaliação (${tProd} min) — cada estudante preenche a folha de autoavaliação (3 perguntas).`,
      `6) Devolutiva imediata (${tFech} min) — combine o retorno individual e antecipe o próximo passo da turma.`,
    ],
  };
  const perguntasByV: Record<Variant, string[]> = {
    port: [
      `O que "${t}" significa para você?`,
      `Que palavras novas aprendemos hoje sobre "${t}"?`,
      `Como você explicaria "${t}" para alguém de outra turma?`,
    ],
    mat: [
      `Que informações esse problema sobre "${t}" nos dá?`,
      `Como podemos representar isso com material concreto?`,
      `Existe outra forma de chegar ao mesmo resultado?`,
    ],
    ci: [
      `O que já sabemos sobre "${t}"?`,
      `Que hipóteses podemos testar?`,
      `O que as observações nos mostraram?`,
    ],
    esc: [
      `Como você se sente em relação a "${t}"?`,
      `O que mudaria na convivência da turma se aplicássemos isso?`,
      `Que ação concreta podemos combinar a partir disso?`,
    ],
    aval: [
      `O que ficou mais claro sobre "${t}"?`,
      `O que ainda preciso revisar?`,
      `Qual é meu próximo passo de estudo?`,
    ],
  };
  const conceitosByV: Record<Variant, string[]> = {
    port: [`Vocabulário de "${t}"`, "Leitura compartilhada", "Produção escrita autoral", "Argumentação oral"],
    mat: [`Modelagem de "${t}"`, "Estratégias múltiplas", "Estimativa", "Verificação do resultado"],
    ci: [`Observação científica de "${t}"`, "Hipótese e evidência", "Registro estruturado", "Argumentação com dados"],
    esc: [`Identidade ligada a "${t}"`, "Empatia ativa", "Escuta sensível", "Ação coletiva"],
    aval: [`Critérios sobre "${t}"`, "Autoavaliação", "Devolutiva formativa", "Plano de retomada"],
  };
  const extensoesByV: Record<Variant, string[]> = {
    port: [
      `Criar um pequeno livro coletivo da turma sobre "${t}".`,
      `Gravar áudio/vídeo de um aluno explicando "${t}" para a família.`,
      `Pesquisar uma notícia ou poema relacionado a "${t}".`,
    ],
    mat: [
      `Propor que cada estudante invente um problema sobre "${t}" para um colega resolver.`,
      `Levar a investigação para casa: medir/contar algo da rotina relacionado a "${t}".`,
      `Criar um cartaz com as estratégias usadas em sala.`,
    ],
    ci: [
      `Realizar uma segunda observação em outro contexto (casa, pátio).`,
      `Construir um pequeno experimento com material reciclado sobre "${t}".`,
      `Convidar alguém da comunidade para falar sobre "${t}".`,
    ],
    esc: [
      `Levar o combinado coletivo para a casa e contar para a família.`,
      `Criar um mural de fotos/desenhos sobre "${t}" durante a semana.`,
      `Reaplicar a dinâmica em outra turma (apadrinhamento).`,
    ],
    aval: [
      `Plano individual de estudos a partir das dificuldades identificadas.`,
      `Roda de devolutiva entre pares na próxima aula.`,
      `Reaplicação de 1 questão-chave após uma semana.`,
    ],
  };
  const licaoByV: Record<Variant, string> = {
    port: `Ler com a família um pequeno trecho sobre "${t}" e registrar no caderno 3 palavras novas com seus significados.`,
    mat: `Resolver 2 problemas de "${t}" no caderno, mostrando duas estratégias diferentes para um deles.`,
    ci: `Observar em casa ou no caminho da escola algo relacionado a "${t}" e registrar com desenho + frase.`,
    esc: `Conversar em casa sobre "${t}" e trazer 1 ideia/sentimento para compartilhar na próxima roda.`,
    aval: `Revisar no caderno os pontos marcados como "preciso revisar" e formular 1 dúvida para a próxima aula.`,
  };
  const avaliacao =
    `Avaliação processual e formativa, com 3 frentes:\n` +
    `• Observação durante a vivência: participação, escuta dos pares e uso do vocabulário ligado a "${t}".\n` +
    `• Produção registrada no caderno/quadro coletivo, articulada com ${card.bncc}.\n` +
    `• Autoavaliação rápida (🟢 entendi / 🟡 tenho dúvida / 🔴 preciso revisar) com devolutiva individual nos próximos dias.\n` +
    `Critérios sugeridos: clareza, coerência com o tema, escuta dos colegas e mobilização do conceito-chave.`;
  const diferenciacao =
    `↗ Para estudantes que avançam mais rápido: propor papel de "monitor" da dupla, criar uma nova versão da atividade sobre "${t}" ou aprofundar com uma fonte extra.\n` +
    `→ Para a maior parte da turma: manter o roteiro padrão com pares heterogêneos.\n` +
    `↘ Para estudantes que precisam de apoio: reduzir o número de etapas, oferecer modelo pronto, trabalhar em dupla com um colega-monitor e usar suporte visual.\n` +
    `♿ Para estudantes PCD: ampliar o tempo, garantir material concreto/visual, simplificar enunciados, oferecer roteiro passo a passo impresso e validar a compreensão a cada etapa.`;
  return {
    ...card,
    objetivo: card.objetivo ?? objetivos[v],
    materiais: card.materiais ?? matsBase[v],
    passos: card.passos ?? passosByV[v],
    avaliacao: card.avaliacao ?? avaliacao,
    diferenciacao: card.diferenciacao ?? diferenciacao,
    perguntasChave: card.perguntasChave ?? perguntasByV[v],
    conceitos: card.conceitos ?? conceitosByV[v],
    extensoes: card.extensoes ?? extensoesByV[v],
    licaoCasa: card.licaoCasa ?? licaoByV[v],
  };
}

function sofiaGenerateForDay(opts: {
  tema: string;
  competencias: Array<CompetenciaBNCC & { disciplina: string }>;
  intensidade: "Leve" | "Equilibrada" | "Densa";
  diaISO: string;
  interdisciplinar?: boolean;
  // Override: quando definido, ignora `intensidade` e usa exatamente este número de atividades.
  quantidade?: number;
  // Override: quando definido, calibra a quantidade e os minutos para caber no tempo total (em min).
  minutosAlvo?: number;
}): M1Card[] {
  const tema = (opts.tema || "tema do dia").trim() || "tema do dia";
  const baseDay = opts.intensidade === "Leve" ? 1 : opts.intensidade === "Densa" ? 3 : 2;
  let perDay = baseDay;
  if (typeof opts.quantidade === "number" && opts.quantidade > 0) {
    perDay = Math.max(1, Math.floor(opts.quantidade));
  } else if (typeof opts.minutosAlvo === "number" && opts.minutosAlvo > 0) {
    // Estima ~35 min por atividade como ponto de partida; ajusta minutos depois.
    perDay = Math.max(1, Math.round(opts.minutosAlvo / 35));
  }
  const out: M1Card[] = [];
  if (opts.competencias.length === 0) return out;

  if (opts.interdisciplinar) {
    // Agrupa por afinidade temática: tokeniza tag+desc, calcula similaridade
    // (Jaccard com stopwords PT-BR) e forma grupos maximizando coerência,
    // preferindo competências de disciplinas diferentes e sem repetição.
    const STOP = new Set([
      "a","o","e","de","da","do","das","dos","em","no","na","nos","nas","um","uma","uns","umas",
      "para","por","com","sem","que","se","ao","aos","à","às","como","ou","mais","menos","seu","sua",
      "seus","suas","entre","sobre","ser","sao","são","é","ter","há","pelo","pela","pelos","pelas",
      "este","esta","esse","essa","isto","isso","aquilo","já","também","muito","pouco","cada",
      "outros","outras","outro","outra","etc","quando","onde","porque","porquê","então",
    ]);
    const tokens = (c: CompetenciaBNCC): Set<string> => {
      const raw = `${c.tag} ${c.desc}`.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const words = raw.split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOP.has(w));
      return new Set(words);
    };
    const sim = (a: Set<string>, b: Set<string>) => {
      if (a.size === 0 || b.size === 0) return 0;
      let inter = 0;
      a.forEach((w) => { if (b.has(w)) inter++; });
      return inter / (a.size + b.size - inter);
    };
    type Item = CompetenciaBNCC & { disciplina: string; _tok: Set<string>; _used: boolean };
    const pool: Item[] = opts.competencias.map((c) => ({ ...c, _tok: tokens(c), _used: false }));
    const disciplinasOrdem = Array.from(new Set(pool.map((p) => p.disciplina)));
    const total = Math.max(1, perDay);
    const groupSize = Math.max(
      2,
      Math.min(disciplinasOrdem.length, Math.ceil(pool.length / total)),
    );

    const pickSeed = (): Item | null => {
      // Semente = competência ainda livre com maior afinidade média com as demais livres.
      const livres = pool.filter((p) => !p._used);
      if (livres.length === 0) return null;
      let best = livres[0]; let bestScore = -1;
      for (const cand of livres) {
        let s = 0; let n = 0;
        for (const o of livres) { if (o === cand) continue; s += sim(cand._tok, o._tok); n++; }
        const avg = n > 0 ? s / n : 0;
        if (avg > bestScore) { bestScore = avg; best = cand; }
      }
      return best;
    };

    for (let i = 0; i < total; i++) {
      const seed = pickSeed();
      if (!seed) break;
      seed._used = true;
      const grupo: Item[] = [seed];
      const disciplinasNoGrupo = new Set<string>([seed.disciplina]);
      while (grupo.length < groupSize) {
        const livres = pool.filter((p) => !p._used);
        if (livres.length === 0) break;
        // Pontua: similaridade média ao grupo + bônus por disciplina nova (coerência interdisciplinar).
        let best = livres[0]; let bestScore = -Infinity;
        for (const cand of livres) {
          const simAvg = grupo.reduce((s, g) => s + sim(cand._tok, g._tok), 0) / grupo.length;
          const bonusDisc = disciplinasNoGrupo.has(cand.disciplina) ? 0 : 0.35;
          const score = simAvg + bonusDisc;
          if (score > bestScore) { bestScore = score; best = cand; }
        }
        best._used = true;
        grupo.push(best);
        disciplinasNoGrupo.add(best.disciplina);
      }
      if (grupo.length === 0) break;
      const disciplinas = Array.from(new Set(grupo.map((c) => c.disciplina)));
      const tags = Array.from(new Set(grupo.map((c) => c.tag)));
      const minutos = Math.round(grupo.reduce((s, c) => s + c.minutos, 0) / grupo.length) + 5;
      // Justificativa: tokens compartilhados por ≥2 competências do grupo.
      // Validação: cada token só entra se aparecer no texto normalizado de
      // pelo menos 2 competências (interseção real, não ruído).
      const freq = new Map<string, number>();
      for (const g of grupo) g._tok.forEach((w) => freq.set(w, (freq.get(w) ?? 0) + 1));
      const textosNorm = grupo.map((g) =>
        `${g.tag} ${g.desc}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
      );
      // Para cada token compartilhado, lista as competências (com origem completa) que o contêm.
      const compartilhados: Array<{ token: string; codes: string[]; origens: M1AuditToken["origens"] }> =
        Array.from(freq.entries())
          .filter(([, n]) => n >= 2)
          .map(([w]) => {
            const re = new RegExp(`\\b${w}\\b`);
            const origens = grupo
              .filter((_, idx) => re.test(textosNorm[idx]))
              .map((g) => ({ code: g.code, disciplina: g.disciplina, tag: g.tag, desc: g.desc }));
            return { token: w, codes: origens.map((o) => o.code), origens };
          })
          .filter((x) => x.codes.length >= 2)
          .sort((a, b) => b.codes.length - a.codes.length)
          .slice(0, 6);
      const codes = grupo.map((g) => g.code).join(", ");
      const detalhes = compartilhados
        .slice(0, 4)
        .map((x) => `${x.token} (${x.codes.join(", ")})`)
        .join("; ");
      const motivo =
        disciplinas.length > 1
          ? `Conecta ${disciplinas.join(" + ")} (${codes})` +
            (detalhes ? ` em torno de: ${detalhes}.` : ".")
          : `Articula ${codes}` +
            (detalhes ? ` por: ${detalhes}.` : ".");
      const auditoria: M1AuditToken[] = compartilhados.map((x) => ({ token: x.token, origens: x.origens }));
      out.push({
        id: `m1di_${opts.diaISO}_${i}_${Math.random().toString(36).slice(2, 7)}`,
        v: grupo[0].v,
        tag: disciplinas.length > 1 ? "Interdisciplinar" : grupo[0].tag,
        title:
          disciplinas.length > 1
            ? `Projeto integrador (${disciplinas.join(" + ")}) · ${tags.slice(0, 2).join(" / ")}: ${tema}`
            : `${disciplinas[0]} · ${tags.slice(0, 2).join(" / ")}: ${tema}`,
        bncc: grupo.map((c) => c.code).join(" + "),
        minutos,
        foco: disciplinas.join(" + "),
        motivo,
        auditoria: auditoria.length > 0 ? auditoria : undefined,
      });
    }
    // Validação final: nenhuma competência (code) pode repetir entre atividades do dia.
    const vistos = new Set<string>();
    const limpos: M1Card[] = [];
    for (const card of out) {
      const codes = card.bncc.split(" + ").map((s) => s.trim()).filter(Boolean);
      if (codes.some((c) => vistos.has(c))) {
        if (typeof console !== "undefined") {
          console.warn("[sofiaGenerateForDay] competência repetida descartada:", card.bncc);
        }
        continue;
      }
      codes.forEach((c) => vistos.add(c));
      limpos.push(card);
    }
    return scaleToTarget(limpos, opts.minutosAlvo).map((c) => enrichM1Card(c, tema));
  } else {
    // Sem interdisciplinar: também evita repetir a mesma competência.
    const total = Math.min(perDay, opts.competencias.length);
    for (let i = 0; i < total; i++) {
      const c = opts.competencias[i];
      out.push({
        id: `m1d_${opts.diaISO}_${i}_${Math.random().toString(36).slice(2, 7)}`,
        v: c.v,
        tag: c.tag,
        title: `${c.disciplina} · ${c.tag}: ${tema}`,
        bncc: c.code,
        minutos: c.minutos,
        foco: c.disciplina,
      });
    }
  }
  return scaleToTarget(out, opts.minutosAlvo).map((c) => enrichM1Card(c, tema));
}

// Ajusta os minutos das atividades para somarem aproximadamente o tempo total desejado.
function scaleToTarget(cards: M1Card[], minutosAlvo?: number): M1Card[] {
  if (!minutosAlvo || cards.length === 0) return cards;
  const total = cards.reduce((s, c) => s + c.minutos, 0);
  if (total <= 0) return cards;
  const ratio = minutosAlvo / total;
  return cards.map((c) => ({ ...c, minutos: Math.max(10, Math.round((c.minutos * ratio) / 5) * 5) }));
}

const M1_TEMPLATES: Record<string, Array<Omit<M1Card, "id" | "minutos"> & { minutos: number }>> = {
  Letramento: [
    { v: "port", tag: "Leitura", title: "Roda de leitura: {tema}", bncc: "EF02LP01", minutos: 40, foco: "Letramento" },
    { v: "port", tag: "Escrita", title: "Caça-palavras de {tema}", bncc: "EF02LP04", minutos: 30, foco: "Letramento" },
    { v: "port", tag: "Oralidade", title: "Reconto coletivo sobre {tema}", bncc: "EF02LP02", minutos: 35, foco: "Letramento" },
  ],
  Numeramento: [
    { v: "mat", tag: "Cálculo", title: "Problemas de adição com {tema}", bncc: "EF02MA05", minutos: 45, foco: "Numeramento" },
    { v: "mat", tag: "Sistema decimal", title: "Agrupamentos de 10 em {tema}", bncc: "EF02MA06", minutos: 40, foco: "Numeramento" },
    { v: "mat", tag: "Geometria", title: "Formas em {tema}", bncc: "EF02MA13", minutos: 30, foco: "Numeramento" },
  ],
  Socioemocional: [
    { v: "esc", tag: "Roda", title: "Roda de conversa: como me sinto sobre {tema}", bncc: "EF02HI03", minutos: 30, foco: "Socioemocional" },
    { v: "esc", tag: "Cooperação", title: "Jogo cooperativo inspirado em {tema}", bncc: "EF02EF02", minutos: 40, foco: "Socioemocional" },
  ],
  "Pensamento científico": [
    { v: "ci", tag: "Investigação", title: "Investigando {tema} na natureza", bncc: "EF02CI04", minutos: 50, foco: "Pensamento científico" },
    { v: "ci", tag: "Experimento", title: "Mini-experimento ligado a {tema}", bncc: "EF02CI05", minutos: 45, foco: "Pensamento científico" },
  ],
  "Cultura e identidade": [
    { v: "esc", tag: "História", title: "Memórias da comunidade sobre {tema}", bncc: "EF02HI03", minutos: 40, foco: "Cultura e identidade" },
  ],
  "Leitura e produção textual": [
    { v: "port", tag: "Produção", title: "Pequeno texto sobre {tema}", bncc: "EF02LP07", minutos: 45, foco: "Leitura e produção textual" },
  ],
  "Resolução de problemas": [
    { v: "mat", tag: "Desafio", title: "Desafio matemático com {tema}", bncc: "EF02MA07", minutos: 40, foco: "Resolução de problemas" },
  ],
  "Educação ambiental": [
    { v: "ci", tag: "Meio ambiente", title: "Cuidando do entorno: {tema}", bncc: "EF02CI06", minutos: 40, foco: "Educação ambiental" },
  ],
  "Cidadania e ética": [
    { v: "esc", tag: "Convivência", title: "Combinados da turma sobre {tema}", bncc: "EF02HI04", minutos: 30, foco: "Cidadania e ética" },
  ],
  "Tecnologia e mídias": [
    { v: "ci", tag: "Mídia", title: "Vídeo curto sobre {tema} + discussão", bncc: "EF02LP19", minutos: 35, foco: "Tecnologia e mídias" },
  ],
  "Arte e expressão": [
    { v: "esc", tag: "Arte", title: "Releitura artística de {tema}", bncc: "EF02AR04", minutos: 45, foco: "Arte e expressão" },
  ],
  "Corpo e movimento": [
    { v: "esc", tag: "Movimento", title: "Circuito motor temático: {tema}", bncc: "EF02EF01", minutos: 40, foco: "Corpo e movimento" },
  ],
  "Inclusão e diversidade": [
    { v: "esc", tag: "Diversidade", title: "História inclusiva sobre {tema}", bncc: "EF02HI05", minutos: 35, foco: "Inclusão e diversidade" },
  ],
  "Projeto de vida": [
    { v: "esc", tag: "Projeto", title: "O que aprendi com {tema} pra minha vida", bncc: "EF02HI06", minutos: 30, foco: "Projeto de vida" },
  ],
};

function sofiaGenerateWeek(opts: {
  tema: string;
  focos: string[];
  intensidade: "Leve" | "Equilibrada" | "Densa";
  diasISO: string[];
  // Override: quantidade exata de atividades por dia.
  quantidadePorDia?: number;
  // Override: tempo total por dia (em min). Recalibra a duração de cada atividade.
  minutosPorDia?: number;
}): M1Plan {
  const tema = (opts.tema || "tema do mês").trim() || "tema do mês";
  const baseDay = opts.intensidade === "Leve" ? 1 : opts.intensidade === "Densa" ? 3 : 2;
  let perDay = baseDay;
  if (typeof opts.quantidadePorDia === "number" && opts.quantidadePorDia > 0) {
    perDay = Math.max(1, Math.floor(opts.quantidadePorDia));
  } else if (typeof opts.minutosPorDia === "number" && opts.minutosPorDia > 0) {
    perDay = Math.max(1, Math.round(opts.minutosPorDia / 35));
  }
  const focos = opts.focos.length > 0 ? opts.focos : ["Letramento", "Numeramento"];
  const pool: Array<Omit<M1Card, "id">> = [];
  focos.forEach((f) => {
    (M1_TEMPLATES[f] || []).forEach((t) => {
      pool.push({ ...t, title: t.title.replace("{tema}", tema) });
    });
  });
  if (pool.length === 0) return EMPTY_M1_PLAN;
  const dayKeys: DayKey[] = ["seg", "ter", "qua", "qui", "sex"];
  const plan: M1Plan = { seg: [], ter: [], qua: [], qui: [], sex: [] };
  let i = 0;
  for (let d = 0; d < 5; d++) {
    const cardsDoDia: M1Card[] = [];
    for (let k = 0; k < perDay; k++) {
      const t = pool[i % pool.length];
      i++;
      cardsDoDia.push({
        ...t,
        id: `m1_${opts.diasISO[d]}_${k}_${Math.random().toString(36).slice(2, 7)}`,
      });
    }
    plan[dayKeys[d]] = scaleToTarget(cardsDoDia, opts.minutosPorDia).map((c) => enrichM1Card(c, tema));
  }
  return plan;
}

export function Planejamento() {
  const search = useSearch({ from: "/planejamento" }) as {
    m?: MKey;
    tag?: string;
    turma?: string;
    aluno?: string;
  };
  const navigate = useNavigate({ from: "/planejamento" });
  const isEi = useEiMode();
  const [m, setM] = useState<MKey>(search.m || "atv");
  const [week, setWeek] = usePersistentState<Week>("plan_week", INITIAL_WEEK);
  const [dropDay, setDropDay] = useState<DayKey | null>(null);
  const dragCard = useRef<{ from: DayKey; id: string } | null>(null);
  const [picks, setPicks] = useState<Record<string, boolean>>({});
  const [tipOpen, setTipOpen] = useState(true);
  // ===== Turmas e alunos PCD vindos do cadastro da Página inicial =====
  // Lê das mesmas chaves persistentes (`dash_classes`/`dash_students`) via
  // SofiaUserContext, para que toda aba do Planejamento use as turmas reais.
  const sofiaUser = useSofiaUserData();
  // Flag de carregamento das turmas (Supabase) — usada para exibir skeletons
  // enquanto a lista chega, evitando o "salto" de empty-state → conteúdo.
  const { loading: turmasLoading } = useTurmas();
  const TURMAS = useMemo(() => {
    return sofiaUser.turmas.map((t) => {
      const pcdCount = sofiaUser.alunosPCDPorTurma[t.nome]?.length ?? 0;
      const turno = t.turno ? t.turno.toLowerCase() : "";
      const subParts: string[] = [];
      if (t.total_alunos > 0) subParts.push(`${t.total_alunos} alunos`);
      if (turno) subParts.push(turno);
      return {
        id: t.id || t.nome,
        name: t.nome,
        sub: subParts.join(" · "),
        pcd: pcdCount > 0 ? `${pcdCount} PCD` : undefined,
        gain: "~25 min",
        warn: undefined as string | undefined,
      };
    });
  }, [sofiaUser.turmas, sofiaUser.alunosPCDPorTurma]);
  const M5_TURMAS = useMemo(() => {
    const list = sofiaUser.turmas.map((t) =>
      t.turno ? `${t.nome} · ${t.turno.toLowerCase()}` : t.nome,
    );
    return list.length > 0 ? list : [""];
  }, [sofiaUser.turmas]);
  // ===== M5 — Kanban semanal =====
  const [m5Turma, setM5Turma] = usePersistentState<string>("plan_m5_turma", M5_TURMAS[0]);
  const [m5Selected, setM5Selected] = useState<Set<string>>(new Set());
  const [m5Generating, setM5Generating] = useState(false);
  const [m5ReplicaOpen, setM5ReplicaOpen] = useState(false);
  const [m5ReplicaPicks, setM5ReplicaPicks] = useState<Record<string, boolean>>({});
  const [m5HistoryOpen, setM5HistoryOpen] = useState(false);
  const [m5InlineDay, setM5InlineDay] = useState<DayKey | null>(null);
  const [m5InlineNome, setM5InlineNome] = useState("");
  const [m5InlineMin, setM5InlineMin] = useState("45");
  const m5AddInline = (day: DayKey) => {
    const nome = m5InlineNome.trim();
    if (!nome) { showToast("Dê um nome à atividade."); return; }
    const min = parseInt(m5InlineMin, 10) || 45;
    const card: Card = { id: `c_${Date.now()}`, v: "port", tag: "ATIV", title: nome, meta: `${min} min` };
    setWeek((w) => ({ ...w, [day]: [...w[day], card] }));
    m5LogHistory(`Adicionou "${nome}" em ${day.toUpperCase()}`, () => setWeek((w) => ({ ...w, [day]: w[day].filter((c) => c.id !== card.id) })));
    setM5InlineNome(""); setM5InlineMin("45"); setM5InlineDay(null);
  };
  type M5HistoryEntry = { id: string; ts: number; label: string; undo?: () => void };
  const [m5History, setM5History] = useState<M5HistoryEntry[]>([]);
  const [m5UndoMove, setM5UndoMove] = useState<null | { card: Card; from: DayKey; to: DayKey }>(null);
  const m5LogHistory = (label: string, undo?: () => void) => {
    setM5History((h) => [{ id: `h_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, ts: Date.now(), label, undo }, ...h].slice(0, 30));
  };
  const m5UndoLast = (entry: M5HistoryEntry) => {
    entry.undo?.();
    setM5History((h) => h.filter((x) => x.id !== entry.id));
    showToast("Ação desfeita.");
  };
  const m5ReplicaCount = Object.values(m5ReplicaPicks).filter(Boolean).length;
  const m5SugerirAula = (day: DayKey) => {
    const variants: Variant[] = ["port", "mat", "ci"];
    const tags = ["PORT", "MAT", "CIE"];
    const titles = ["Leitura compartilhada", "Resolução de problemas", "Observação científica"];
    const i = Math.floor(Math.random() * 3);
    const card: Card = { id: `c_${Date.now()}`, v: variants[i], tag: tags[i], title: titles[i], meta: "45 min · sugestão Sofia" };
    setWeek((w) => ({ ...w, [day]: [...w[day], card] }));
    m5LogHistory(`Sugeriu aula em ${day.toUpperCase()}`, () => setWeek((w) => ({ ...w, [day]: w[day].filter((c) => c.id !== card.id) })));
    showToast(`Sofia sugeriu uma aula para ${day.toUpperCase()}. ✨`);
  };
  const m5GerarComSofia = () => {
    setM5Generating(true);
    setTimeout(() => {
      const before = week;
      setWeek((w) => {
        const next = { ...w };
        const fillers: Record<DayKey, Card[]> = {
          seg: [{ id: `c_${Date.now()}_s1`, v: "port", tag: "PORT", title: "Leitura compartilhada", meta: "45 min · 3ºA" }],
          ter: [{ id: `c_${Date.now()}_t1`, v: "mat", tag: "MAT", title: "Adição com material concreto", meta: "50 min · 3ºA" }],
          qua: [{ id: `c_${Date.now()}_q1`, v: "ci", tag: "CIE", title: "Ciclo da água", meta: "45 min · 3ºA" }],
          qui: [{ id: `c_${Date.now()}_qi1`, v: "port", tag: "PORT", title: "Produção textual", meta: "50 min · 3ºA" }],
          sex: [{ id: `c_${Date.now()}_x1`, v: "mat", tag: "MAT", title: "Jogos matemáticos", meta: "40 min · 3ºA" }],
        };
        (Object.keys(fillers) as DayKey[]).forEach((d) => {
          if ((next[d] || []).length === 0) next[d] = fillers[d];
        });
        return next;
      });
      m5LogHistory("Gerou semana com Sofia", () => setWeek(before));
      setM5Generating(false);
      showToast("Sofia preencheu os dias vazios. ✨");
    }, 1500);
  };
  const m5TrocarTurma = (t: string) => {
    const before = week;
    setM5Turma(t);
    setWeek(INITIAL_WEEK);
    m5LogHistory(`Trocou para ${t}`, () => { setWeek(before); });
    showToast(`Carregada semana em branco de ${t}.`);
  };
  const m5ToggleSelect = (id: string, e: React.MouseEvent) => {
    if (!e.shiftKey && m5Selected.size === 0) return; // só ativa em shift+click
    setM5Selected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const m5ClearSelection = () => setM5Selected(new Set());
  const m5BulkMove = (to: DayKey) => {
    const ids = Array.from(m5Selected);
    if (ids.length === 0) return;
    const before = week;
    setWeek((w) => {
      const next: Week = { seg: [...w.seg], ter: [...w.ter], qua: [...w.qua], qui: [...w.qui], sex: [...w.sex] };
      const moving: Card[] = [];
      (Object.keys(next) as DayKey[]).forEach((d) => {
        next[d] = next[d].filter((c) => {
          if (ids.includes(c.id)) { moving.push(c); return false; }
          return true;
        });
      });
      next[to] = [...next[to], ...moving];
      return next;
    });
    m5LogHistory(`Moveu ${ids.length} cartões para ${to.toUpperCase()}`, () => setWeek(before));
    showToast(`↔ ${ids.length} cartões movidos para ${to.toUpperCase()}.`);
    m5ClearSelection();
  };
  const m5BulkDelete = () => {
    const ids = Array.from(m5Selected);
    if (ids.length === 0) return;
    setM5ConfirmDelete(true);
  };
  const m5ConfirmBulkDelete = () => {
    const ids = Array.from(m5Selected);
    if (ids.length === 0) { setM5ConfirmDelete(false); return; }
    const before = week;
    setWeek((w) => {
      const next: Week = { seg: [...w.seg], ter: [...w.ter], qua: [...w.qua], qui: [...w.qui], sex: [...w.sex] };
      (Object.keys(next) as DayKey[]).forEach((d) => { next[d] = next[d].filter((c) => !ids.includes(c.id)); });
      return next;
    });
    m5LogHistory(`Excluiu ${ids.length} cartões`, () => setWeek(before));
    showToast(`${ids.length} cartões excluídos.`);
    m5ClearSelection();
    setM5ConfirmDelete(false);
  };
  const m5OpenReplicar = () => { setM5ReplicaPicks({}); setM5ReplicaOpen(true); };
  const m5ExportPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    const contentW = pageW - margin * 2;
    const bottomLimit = pageH - margin - 24; // leave room for footer
    let y = margin;
    let pageNum = 1;

    const drawFooter = () => {
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(150);
      doc.text(`Página ${pageNum}`, pageW - margin, pageH - margin / 2, { align: "right" });
      doc.text(`Planejamento · ${m5Turma}`, margin, pageH - margin / 2);
    };
    const newPage = () => {
      drawFooter();
      doc.addPage();
      pageNum += 1;
      y = margin;
    };
    const ensureSpace = (h: number) => { if (y + h > bottomLimit) newPage(); };

    // Header
    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(15, 23, 42);
    doc.text("Planejamento da Semana", margin, y); y += 22;
    doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(90);
    doc.text(`Turma: ${m5Turma}`, margin, y); y += 14;
    doc.text(`Exportado em: ${new Date().toLocaleString("pt-BR")}`, margin, y); y += 18;
    doc.setDrawColor(220); doc.line(margin, y, pageW - margin, y); y += 16;

    // Pre-measure cards (with wrapped title + meta)
    const cardPadX = 10;
    const tagColW = 70;
    const titleW = contentW - cardPadX * 2 - tagColW;
    const metaW = contentW - cardPadX * 2;
    const measureCard = (c: Card) => {
      doc.setFontSize(11);
      const titleLines = doc.splitTextToSize(c.title || "", titleW) as string[];
      doc.setFontSize(9);
      const metaLines = doc.splitTextToSize(c.meta || "", metaW) as string[];
      const h = 10 /*top pad*/ + titleLines.length * 13 + 4 + metaLines.length * 11 + 10 /*bottom pad*/;
      return { titleLines, metaLines, h };
    };

    DAYS.forEach((day) => {
      const cards = week[day.k] || [];
      const measured = cards.map(measureCard);
      const headerH = 22;
      const emptyH = 22;
      const dayTotal = headerH + (cards.length === 0 ? emptyH : measured.reduce((s, m) => s + m.h + 6, 0)) + 10;

      // Keep day intact if it fits on a page; otherwise allow card-level split
      const fitsOnPage = dayTotal <= bottomLimit - margin;
      if (fitsOnPage) ensureSpace(dayTotal);
      else ensureSpace(headerH + (measured[0]?.h ?? emptyH) + 6);

      // Day header
      doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
      doc.text(`${day.n} · ${day.d}  (${cards.length} ${cards.length === 1 ? "atividade" : "atividades"})`, margin, y);
      y += 16;

      if (cards.length === 0) {
        doc.setFont("helvetica", "italic"); doc.setFontSize(10); doc.setTextColor(150);
        doc.text("Sem atividades.", margin + 12, y); y += 18;
      } else {
        cards.forEach((c, i) => {
          const m = measured[i];
          ensureSpace(m.h + 6);
          // Card box
          doc.setDrawColor(230); doc.setFillColor(248, 250, 252);
          doc.roundedRect(margin, y, contentW, m.h, 6, 6, "FD");
          // Tag
          doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(249, 115, 22);
          doc.text(c.tag || "", margin + cardPadX, y + 16);
          // Title (wrapped)
          doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(15, 23, 42);
          let ty = y + 16;
          m.titleLines.forEach((line) => { doc.text(line, margin + cardPadX + tagColW, ty); ty += 13; });
          // Meta (wrapped)
          doc.setFontSize(9); doc.setTextColor(110);
          let my = y + 16 + m.titleLines.length * 13 + 6;
          m.metaLines.forEach((line) => { doc.text(line, margin + cardPadX, my); my += 11; });
          y += m.h + 6;
        });
      }
      y += 6;
    });
    drawFooter();

    const safeTurma = m5Turma.replace(/[^\w-]+/g, "_");
    doc.save(`planejamento-semana-${safeTurma}.pdf`);
    showToast("📄 PDF exportado.");
  };
  const m5ConfirmarReplicar = () => {
    const sel = Object.entries(m5ReplicaPicks).filter(([, v]) => v).map(([k]) => k);
    if (sel.length === 0) { showToast("Selecione ao menos uma turma."); return; }
    m5LogHistory(`Replicou semana em ${sel.length} turma(s)`);
    showToast(`Semana replicada em ${sel.length} turma(s). ✓`);
    setM5ReplicaOpen(false);
  };

  const [toast, setToast] = useState<{ msg: string; key: number } | null>(null);
  const [m5ConfirmDelete, setM5ConfirmDelete] = useState(false);
  const [pillsFoco, setPillsFoco] = useState<Record<string, boolean>>({ Letramento: true, Numeramento: true, Socioemocional: false });
  const FOCO_OPTS = [
    "Letramento",
    "Numeramento",
    "Socioemocional",
    "Pensamento científico",
    "Cultura e identidade",
    "Leitura e produção textual",
    "Resolução de problemas",
    "Educação ambiental",
    "Cidadania e ética",
    "Tecnologia e mídias",
    "Arte e expressão",
    "Corpo e movimento",
    "Inclusão e diversidade",
    "Projeto de vida",
  ] as const;
  const [pillsInt, setPillsInt] = useState<"Leve" | "Equilibrada" | "Densa">("Equilibrada");
  const [calSel, setCalSel] = useState<DayKey>("seg");
  const [auditOpen, setAuditOpen] = useState<Record<string, boolean>>({});
  const [paramsModalOpen, setParamsModalOpen] = useState(false);
  // Padrão global do modo interdisciplinar (ligado por padrão).
  // Usado como default ao abrir novos modais de atividade.
  const [interdisciplinarPadrao, setInterdisciplinarPadrao] = usePersistentState<boolean>(
    "plan_interdisciplinar_padrao",
    true,
  );

  // ===== Contexto por aba: Turma cadastrada OU Ano escolar (sem turma) =====
  // Persistido por aba (m1..m6). Estrutura:
  //   { turma?: string; etapa?: Etapa; anoIdx?: number }
  // Se `turma` está preenchida, a Sofia usa a turma cadastrada (que carrega seu próprio ano).
  // Se não, exige `etapa + anoIdx` para gerar com base no ano de escolaridade.
  type TurmaCtx = { turma?: string; etapa?: Etapa; anoIdx?: number };
  const [ctxByTab, setCtxByTab] = usePersistentState<Record<MKey, TurmaCtx>>(
    "plan_ctx_by_tab",
    { m1: {}, m2: {}, m3: {}, m4: {}, m5: {}, m6: {}, atv: {}, pcd: {}, trilhas: {} },
  );
  const ctxAtual: TurmaCtx = ctxByTab[m] ?? {};
  const setCtxAtual = (next: TurmaCtx) =>
    setCtxByTab((p) => ({ ...p, [m]: next }));

  // Turmas cadastradas — fonte ao vivo (tabela `turmas` via React Query).
  // Assim, qualquer turma criada/editada em outra tela aparece aqui
  // imediatamente (invalidação do cache `["turmas"]`).
  const turmasPerfil = useMemo(
    () => sofiaUser.turmas.map((t) => t.nome).filter(Boolean),
    [sofiaUser.turmas],
  );

  // Resolve etapa/ano efetivos do contexto atual (usado pela Sofia ao gerar).
  const ctxResolvido = useMemo(() => {
    const etapa = ctxAtual.etapa ?? "EF1";
    const anos = BNCC_BY_ETAPA[etapa].anos;
    const anoIdx = Math.min(ctxAtual.anoIdx ?? 1, anos.length - 1);
    const ano = anos[anoIdx];
    return {
      pronto: !!(ctxAtual.turma || (ctxAtual.etapa && ctxAtual.anoIdx !== undefined)),
      turma: ctxAtual.turma ?? "",
      etapa,
      anoIdx,
      anoLabel: ano?.ano ?? "",
      etapaLabel: BNCC_BY_ETAPA[etapa].label,
    };
  }, [ctxAtual]);
  const [m1Tema, setM1Tema] = usePersistentState<string>("plan_m1_tema", "");
  const [m1Plan, setM1Plan] = usePersistentState<M1Plan>("plan_m1_plan", EMPTY_M1_PLAN);
  const [m1Generating, setM1Generating] = useState(false);
  // Limita quantos focos a Sofia usa numa geração (controla volume de sugestões).
  // "all" = usa todos os focos selecionados.
  const [m1MaxFocos, setM1MaxFocos] = usePersistentState<1 | 2 | 3 | "all">("plan_m1_max_focos", 2);
  // Modo de dimensionamento da SEMANA (M1): por intensidade, quantidade fixa por dia, ou tempo total por dia.
  const [m1Modo, setM1Modo] = usePersistentState<"intensidade" | "quantidade" | "tempo">("plan_m1_modo", "intensidade");
  const [m1Qtd, setM1Qtd] = usePersistentState<number>("plan_m1_qtd", 2);
  const [m1Min, setM1Min] = usePersistentState<number>("plan_m1_min", 60);
  // Modal "Preencher só este dia"
  const [m1DayModal, setM1DayModal] = useState<{ dia: DayKey; iso: string; n: string; d: number } | null>(null);
  const [mdEtapa, setMdEtapa] = useState<Etapa>("EF1");
  const [mdAnoIdx, setMdAnoIdx] = useState<number>(1); // 2º ano por padrão
  // Disciplinas/campos selecionados (multi). Chave = nome da disciplina.
  const [mdDiscOn, setMdDiscOn] = useState<Record<string, boolean>>({});
  const [mdSel, setMdSel] = useState<Record<string, boolean>>({});
  const [mdTema, setMdTema] = useState<string>("");
  const [mdInt, setMdInt] = useState<"Leve" | "Equilibrada" | "Densa">("Equilibrada");
  const [mdInter, setMdInter] = useState<boolean>(false);
  // Modo de dimensionamento do dia: por intensidade (padrão), por quantidade fixa, ou por tempo total.
  const [mdModo, setMdModo] = useState<"intensidade" | "quantidade" | "tempo">("intensidade");
  const [mdQtd, setMdQtd] = useState<number>(2);
  const [mdMin, setMdMin] = useState<number>(60);
  const mdAno = BNCC_BY_ETAPA[mdEtapa].anos[Math.min(mdAnoIdx, BNCC_BY_ETAPA[mdEtapa].anos.length - 1)];
  const mdDiscList = mdAno?.disciplinas.filter((d) => mdDiscOn[d.nome]) ?? [];
  const mdSelecionadas: Array<CompetenciaBNCC & { disciplina: string }> = mdDiscList.flatMap(
    (d) => d.competencias.filter((c) => mdSel[c.code]).map((c) => ({ ...c, disciplina: d.nome })),
  );
  const mdDisciplinasComSel = Array.from(new Set(mdSelecionadas.map((c) => c.disciplina)));
  const mdPodeInter = mdDisciplinasComSel.length >= 2;
  const openDayModal = (day: { k: DayKey; iso: string; n: string; d: number }) => {
    setM1DayModal({ dia: day.k, iso: day.iso, n: day.n, d: day.d });
    // Pré-seleciona etapa/ano a partir do contexto da aba quando disponível.
    const etapaInicial: Etapa = ctxResolvido.etapa;
    const anoIdxInicial = ctxResolvido.anoIdx;
    setMdEtapa(etapaInicial);
    setMdAnoIdx(anoIdxInicial);
    const ano = BNCC_BY_ETAPA[etapaInicial].anos[Math.min(anoIdxInicial, BNCC_BY_ETAPA[etapaInicial].anos.length - 1)];
    // Por padrão, ativa TODAS as disciplinas/campos do ano para habilitar interdisciplinar logo de cara.
    const todas: Record<string, boolean> = {};
    (ano?.disciplinas ?? []).forEach((d) => { todas[d.nome] = true; });
    setMdDiscOn(todas);
    setMdSel({});
    // Usa o padrão global (modal Ajustar parâmetros).
    setMdInter(interdisciplinarPadrao);
    setMdTema(m1Tema);
  };
  const fecharDayModal = () => setM1DayModal(null);
  const gerarDayModal = () => {
    if (!m1DayModal) return;
    if (mdSelecionadas.length === 0) { showToast("Selecione ao menos 1 competência."); return; }
    const novos = sofiaGenerateForDay({
      tema: mdTema,
      competencias: mdSelecionadas,
      intensidade: mdInt,
      diaISO: m1DayModal.iso,
      interdisciplinar: mdInter && mdPodeInter,
      quantidade: mdModo === "quantidade" ? mdQtd : undefined,
      minutosAlvo: mdModo === "tempo" ? mdMin : undefined,
    });
    setM1Plan((p) => ({ ...p, [m1DayModal.dia]: [...p[m1DayModal.dia], ...novos] }));
    showToast(`Sofia adicionou ${novos.length} atividade(s) em ${m1DayModal.n}. ✓`);
    setM1DayModal(null);
  };
  // Semana mostrada na M1 (offset em semanas a partir da semana atual).
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const MONTHS_PT = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  // SSR roda em UTC; o cliente roda no fuso local. Calcular `new Date()` em
  // ambos pode produzir HTML diferente (mês/dia trocado em torno da meia-noite
  // UTC) e quebrar a hydration. Só renderizamos a semana real após hidratar.
  const hydrated = useHydrated();
  const m1Week = useMemo(() => {
    const today = hydrated ? new Date() : new Date(Date.UTC(2026, 0, 5)); // segunda fixa pré-hidratação
    today.setHours(0, 0, 0, 0);
    const dow = today.getDay(); // 0=dom .. 6=sab
    const diffToMon = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMon + weekOffset * 7);
    const days: Array<{ k: DayKey; n: string; d: number; date: Date; iso: string }> = [];
    const labels: Array<{ k: DayKey; n: string }> = [
      { k: "seg", n: "SEG" }, { k: "ter", n: "TER" }, { k: "qua", n: "QUA" },
      { k: "qui", n: "QUI" }, { k: "sex", n: "SEX" },
    ];
    for (let i = 0; i < 5; i++) {
      const dt = new Date(monday);
      dt.setDate(monday.getDate() + i);
      days.push({ k: labels[i].k, n: labels[i].n, d: dt.getDate(), date: dt, iso: dt.toISOString().slice(0, 10) });
    }
    const first = days[0].date;
    const last = days[4].date;
    const sameMonth = first.getMonth() === last.getMonth();
    const range = sameMonth
      ? `${first.getDate()}–${last.getDate()} de ${MONTHS_PT[first.getMonth()]} de ${first.getFullYear()}`
      : `${first.getDate()} de ${MONTHS_PT[first.getMonth()]} – ${last.getDate()} de ${MONTHS_PT[last.getMonth()]} de ${last.getFullYear()}`;
    const label = weekOffset === 0 ? "Semana atual" : weekOffset === 1 ? "Próxima semana" : weekOffset === -1 ? "Semana anterior" : `${weekOffset > 0 ? "+" : ""}${weekOffset} semanas`;
    return { days, range, label };
  }, [weekOffset, hydrated]);

  const focosSelecionados = useMemo(
    () => Object.keys(pillsFoco).filter((k) => pillsFoco[k]),
    [pillsFoco],
  );
  const m1Stats = useMemo(() => {
    const all = (Object.values(m1Plan) as M1Card[][]).flat();
    const bnccs = new Set(all.map((c) => c.bncc));
    return { atividades: all.length, habilidades: bnccs.size };
  }, [m1Plan]);
  // Prévia da próxima geração: depende do nº de focos selecionados, do limite
  // atual de focos por geração e da intensidade.
  const m1Preview = useMemo(() => {
    const focosUsados = m1MaxFocos === "all"
      ? focosSelecionados
      : focosSelecionados.slice(0, m1MaxFocos);
    const perDay = pillsInt === "Leve" ? 1 : pillsInt === "Densa" ? 3 : 2;
    const tempos = focosUsados.flatMap((f) => (M1_TEMPLATES[f] ?? []).map((t) => t.minutos));
    const poolSize = tempos.length;
    const mediaMin = poolSize > 0 ? Math.round(tempos.reduce((a, b) => a + b, 0) / poolSize) : 0;
    const totalAtiv = focosUsados.length === 0 ? 0 : perDay * 5;
    const totalMin = mediaMin * totalAtiv;
    const minPorDia = mediaMin * perDay;
    return {
      focosUsados,
      focosCount: focosUsados.length,
      perDay,
      total: totalAtiv,
      poolSize,
      mediaMin,
      minPorDia,
      totalMin,
    };
  }, [focosSelecionados, m1MaxFocos, pillsInt]);
  const gerarComSofia = () => {
    if (!ctxResolvido.pronto) {
      showToast("Selecione uma turma cadastrada ou um ano de escolaridade no topo da aba.");
      return;
    }
    setM1Generating(true);
    setTimeout(() => {
      const focosLimitados = m1MaxFocos === "all"
        ? focosSelecionados
        : focosSelecionados.slice(0, m1MaxFocos);
      const plan = sofiaGenerateWeek({
        tema: m1Tema,
        focos: focosLimitados,
        intensidade: pillsInt,
        diasISO: m1Week.days.map((d) => d.iso),
        quantidadePorDia: m1Modo === "quantidade" ? m1Qtd : undefined,
        minutosPorDia: m1Modo === "tempo" ? m1Min : undefined,
      });
      setM1Plan(plan);
      setM1Generating(false);
      const total = (Object.values(plan) as M1Card[][]).flat().length;
      showToast(total > 0 ? `Sofia montou ${total} atividade(s) na semana. Revise e ajuste. ✨` : "Selecione ao menos um foco para a Sofia gerar.");
    }, 350);
  };
  const limparSemanaM1 = () => {
    setM1Plan(EMPTY_M1_PLAN);
    showToast("Semana limpa. Quando quiser, peça pra Sofia gerar de novo.");
  };
  const removerCardM1 = (dia: DayKey, id: string) => {
    setM1Plan((p) => ({ ...p, [dia]: p[dia].filter((c) => c.id !== id) }));
  };
  // Editor da atividade sugerida pela Sofia (M1) — abre ao clicar no card.
  const [m1EditCard, setM1EditCard] = useState<{ dia: DayKey; id: string } | null>(null);
  const m1UpdateCard = (dia: DayKey, id: string, patch: Partial<M1Card>) => {
    setM1Plan((p) => ({
      ...p,
      [dia]: p[dia].map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  };
  const m1OpenEdit = (dia: DayKey, id: string) => {
    // Garante que a atividade tenha campos ricos antes de abrir o editor.
    setM1Plan((p) => ({
      ...p,
      [dia]: p[dia].map((c) => (c.id === id ? enrichM1Card(c, m1Tema) : c)),
    }));
    setM1EditCard({ dia, id });
  };
  // M3 — Editor conversacional
  type M3Etapa = { id: string; titulo: string; min: number; novo?: boolean };
  type M3Adapt = { id: string; aluno: string; texto: string; novo?: boolean };
  type M3Plan = { titulo: string; bncc: string[]; duracaoMin: number; etapas: M3Etapa[]; adaptacoes: M3Adapt[] };
  const M3_INITIAL_PLAN: M3Plan = {
    titulo: "Adição com material concreto · 3º ano",
    bncc: ["EF03MA03", "EF03MA05"],
    duracaoMin: 50,
    etapas: [
      { id: "e1", titulo: "Acolhida e mobilização", min: 5 },
      { id: "e2", titulo: "Exploração com material dourado (duplas)", min: 20 },
      { id: "e3", titulo: "Sistematização no caderno", min: 15 },
      { id: "e4", titulo: "Verificação rápida", min: 10 },
    ],
    adaptacoes: [],
  };
  const M3_INITIAL_LOG: Array<{ from: "user" | "sofia"; t: string }> = [
    { from: "sofia", t: "Oi! Quer ajustar essa atividade? É só me dizer em linguagem natural — eu mantenho o objetivo e a BNCC." },
  ];
  const [chatLog, setChatLog] = useState<Array<{ from: "user" | "sofia"; t: string }>>(M3_INITIAL_LOG);
  const [m3Plan, setM3Plan] = useState<M3Plan>(M3_INITIAL_PLAN);
  const [m3Loading, setM3Loading] = useState(false);
  const [chatTxt, setChatTxt] = useState("");
  const [layers, setLayers] = usePersistentState<Record<string, boolean>>("plan_m4_layers", {
    aulas: true, aval: true, eventos: true, feriados: true, bncc: false, sofia: true,
  });
  const toggleLayer = (k: string) => setLayers((s) => ({ ...s, [k]: !s[k] }));
  // M4 — Calendário mensal por camadas
  type M4Cat = "aulas" | "aval" | "eventos" | "feriados" | "bncc" | "sofia";
  type M4Evt = { cat: M4Cat; title: string; meta?: string };
  // Calendário começa vazio — apenas eventos criados pela professora (via abas
  // Atividades / Atividades PCD) aparecem aqui.
  const M4_EVENTS_BY_DAY: Record<number, M4Evt[]> = {};
  const M4_CAT_META: Record<M4Cat, { color: string; label: string }> = {
    aulas: { color: "#3B82F6", label: "Aula" },
    aval: { color: "#F59E0B", label: "Avaliação" },
    eventos: { color: "#10B981", label: "Evento" },
    feriados: { color: "#EF4444", label: "Feriado" },
    bncc: { color: "#06B6D4", label: "BNCC" },
    sofia: { color: "#FF7A45", label: "Sofia" },
  };
  const [m4Month, setM4Month] = usePersistentState<{ y: number; m: number }>(
    "plan_m4_month",
    { y: new Date().getFullYear(), m: new Date().getMonth() },
  );
  // Garante que o calendário sempre abra no mês vigente, mesmo que o valor
  // persistido esteja desatualizado de sessões anteriores.
  useEffect(() => {
    const now = new Date();
    setM4Month((s) => (s.y === now.getFullYear() && s.m === now.getMonth() ? s : { y: now.getFullYear(), m: now.getMonth() }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [m4SelectedDay, setM4SelectedDay] = usePersistentState<number | null>("plan_m4_selected_day", null);
  const m4PrintRef = useRef<HTMLDivElement | null>(null);
  const m4Print = () => {
    const node = m4PrintRef.current;
    if (!node) { window.print(); return; }
    const w = window.open("", "_blank", "width=1024,height=768");
    if (!w) { window.print(); return; }
    const title = `Calendário — ${m4Label}`;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>
        *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;margin:24px;color:#111}
        h1{font-size:18px;margin:0 0 12px}
        button{display:none !important}
        .pl-layers-bar{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;font-size:11px;color:#555}
        .pl-lay{border:1px solid #ddd;border-radius:999px;padding:2px 8px}
        @page{size:A4 landscape;margin:12mm}
      </style></head><body>
      <h1>${title}</h1>${node.outerHTML}
      <script>window.onload=()=>{setTimeout(()=>{window.print();},200)}<\/script>
      </body></html>`);
    w.document.close();
  };

  // Eventos agendados pela professora a partir das abas Atividades / Atividades PCD.
  // Mesma chave gravada em src/components/atividade/PlanoAtividadeEditor.tsx.
  type M4UserEvt = {
    id: string;
    cat: M4Cat;
    title: string;
    meta?: string;
    source: "atv" | "pcd" | "m3";
    m3Dia?: DayKey;
    m3CardId?: string;
  };
  const [m4UserEvents, setM4UserEvents] = usePersistentState<Record<string, M4UserEvt[]>>(
    "plan_m4_user_events", {},
  );
  const m4UserByDay = useMemo(() => {
    const out: Record<number, Array<M4Evt & { id: string; iso: string; source: M4UserEvt["source"]; m3Dia?: DayKey; m3CardId?: string }>> = {};
    const mm = String(m4Month.m + 1).padStart(2, "0");
    const prefix = `${m4Month.y}-${mm}-`;
    Object.entries(m4UserEvents).forEach(([iso, list]) => {
      if (!iso.startsWith(prefix)) return;
      const day = parseInt(iso.slice(8, 10), 10);
      if (!day) return;
      (out[day] ??= []).push(
        ...list.map((e) => ({ cat: e.cat, title: e.title, meta: e.meta, id: e.id, iso, source: e.source, m3Dia: e.m3Dia, m3CardId: e.m3CardId })),
      );
    });
    return out;
  }, [m4UserEvents, m4Month]);
  const m4Label = useMemo(() => {
    const d = new Date(m4Month.y, m4Month.m, 1);
    const s = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, [m4Month]);
  const m4Grid = useMemo(() => {
    const first = new Date(m4Month.y, m4Month.m, 1).getDay(); // 0=Dom
    const days = new Date(m4Month.y, m4Month.m + 1, 0).getDate();
    const cells: Array<{ day: number | null }> = [];
    for (let i = 0; i < first; i++) cells.push({ day: null });
    for (let d = 1; d <= days; d++) cells.push({ day: d });
    while (cells.length % 7 !== 0) cells.push({ day: null });
    return cells;
  }, [m4Month]);
  const m4ChangeMonth = (delta: number) => {
    setM4Month((s) => {
      const nm = s.m + delta;
      if (nm < 0) return { y: s.y - 1, m: 11 };
      if (nm > 11) return { y: s.y + 1, m: 0 };
      return { y: s.y, m: nm };
    });
  };
  // ISO yyyy-mm-dd para um dia do mês corrente
  const m4IsoFor = (day: number) => {
    const mm = String(m4Month.m + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${m4Month.y}-${mm}-${dd}`;
  };
  // Move um evento de uma data ISO para outra
  const m4MoveEvent = (fromIso: string, id: string, toIso: string) => {
    if (fromIso === toIso) return;
    // Se for um evento espelhado do M3 (m1Plan), mover dentro do m1Plan
    // re-sincroniza pelo useEffect; bloqueia mover para fora da semana atual.
    const fromList = m4UserEvents[fromIso] ?? [];
    const evt = fromList.find((e) => e.id === id);
    if (evt?.source === "m3" && evt.m3Dia && evt.m3CardId) {
      const targetDay = m1Week.days.find((d) => d.iso === toIso);
      if (!targetDay) return; // só permite drop em dias da semana corrente
      if (targetDay.k === evt.m3Dia) return;
      setM1Plan((p) => {
        const card = p[evt.m3Dia!].find((c) => c.id === evt.m3CardId);
        if (!card) return p;
        return {
          ...p,
          [evt.m3Dia!]: p[evt.m3Dia!].filter((c) => c.id !== evt.m3CardId),
          [targetDay.k]: [...p[targetDay.k], card],
        };
      });
      return;
    }
    setM4UserEvents((s) => {
      const src = s[fromIso] ?? [];
      const item = src.find((e) => e.id === id);
      if (!item) return s;
      const next: Record<string, M4UserEvt[]> = { ...s };
      const remaining = src.filter((e) => e.id !== id);
      if (remaining.length) next[fromIso] = remaining; else delete next[fromIso];
      next[toIso] = [...(next[toIso] ?? []), item];
      return next;
    });
  };
  // Atualiza campos de um evento
  const m4UpdateEvent = (iso: string, id: string, patch: Partial<M4UserEvt>) => {
    // Para eventos M3, propagamos título/duração de volta ao m1Plan.
    const evt = (m4UserEvents[iso] ?? []).find((e) => e.id === id);
    if (evt?.source === "m3" && evt.m3Dia && evt.m3CardId) {
      if (patch.title !== undefined) {
        m1UpdateCard(evt.m3Dia, evt.m3CardId, { title: patch.title });
      }
      return;
    }
    setM4UserEvents((s) => {
      const list = s[iso] ?? [];
      const next = list.map((e) => (e.id === id ? { ...e, ...patch } : e));
      return { ...s, [iso]: next };
    });
  };
  // Remove um evento
  const m4DeleteEvent = (iso: string, id: string) => {
    const evt = (m4UserEvents[iso] ?? []).find((e) => e.id === id);
    if (evt?.source === "m3" && evt.m3Dia && evt.m3CardId) {
      removerCardM1(evt.m3Dia, evt.m3CardId);
      return;
    }
    setM4UserEvents((s) => {
      const list = (s[iso] ?? []).filter((e) => e.id !== id);
      const next = { ...s };
      if (list.length) next[iso] = list; else delete next[iso];
      return next;
    });
  };
  // Estado do editor inline (qual evento está sendo editado e drag origem)
  const [m4Editing, setM4Editing] = useState<{ iso: string; id: string } | null>(null);
  const [m4DragSrc, setM4DragSrc] = useState<{ iso: string; id: string } | null>(null);
  const [m4DragOver, setM4DragOver] = useState<number | null>(null);
  // Sincroniza atividades do M3 (m1Plan) → calendário M4. Cada card vira um
  // evento com source="m3" e id determinístico, para permitir abrir/editar
  // de volta no editor M3.
  useEffect(() => {
    if (!hydrated) return;
    const isoByDia: Partial<Record<DayKey, string>> = {};
    m1Week.days.forEach((d) => { isoByDia[d.k] = d.iso; });
    setM4UserEvents((prev) => {
      const next: Record<string, M4UserEvt[]> = {};
      // Mantém eventos de outras fontes; descarta m3 antigos da semana corrente.
      Object.entries(prev).forEach(([iso, list]) => {
        const isWeekIso = m1Week.days.some((d) => d.iso === iso);
        const filtered = list.filter((e) => !(e.source === "m3" && isWeekIso));
        if (filtered.length) next[iso] = filtered;
      });
      // Insere os m3 atuais.
      (Object.keys(m1Plan) as DayKey[]).forEach((dia) => {
        const iso = isoByDia[dia];
        if (!iso) return;
        m1Plan[dia].forEach((c) => {
          const evt: M4UserEvt = {
            id: `m3:${dia}:${c.id}`,
            cat: "aulas",
            title: c.title,
            meta: `${c.minutos} min · ${c.bncc || c.tag}`.trim(),
            source: "m3",
            m3Dia: dia,
            m3CardId: c.id,
          };
          (next[iso] ??= []).push(evt);
        });
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m1Plan, m1Week.days.map((d) => d.iso).join(","), hydrated]);
  const [diary, setDiary] = usePersistentState<Record<string, "ok" | "warn" | "next" | undefined>>("plan_diary", {});
  // M6 — diário de bordo
  type M6Entry = { id: string; emoji: string; title: string; text: string; tags: string[]; date: string; pinned?: boolean; turma?: string; atividadeId?: string; atividadeTitulo?: string };
  const M6_TAGS = ["+ funcionou", "- precisa reforço", "+ inclusão", "+ família"] as const;
  const M6_EMOJIS = ["😣", "😐", "🙂", "😄", "🌟"] as const;
  // Sugestões rápidas de observação por humor — clique adiciona ao textarea.
  const M6_QUICK_BY_EMOJI: Record<string, string[]> = {
    "😣": [
      "Turma muito agitada, difícil manter o foco.",
      "Vários alunos dispersos após o recreio.",
      "Conteúdo travou, preciso retomar com outra abordagem.",
      "Conflitos entre colegas atrapalharam a aula.",
    ],
    "😐": [
      "Aula cumpriu o objetivo, mas sem entusiasmo.",
      "Alguns alunos avançaram, outros precisam de reforço.",
      "Faltou tempo para o fechamento.",
      "Engajamento mediano, tentar abordagem mais lúdica.",
    ],
    "🙂": [
      "Turma engajada na maior parte da aula.",
      "Boa participação nas atividades em dupla.",
      "Conteúdo compreendido pela maioria.",
      "Pequenos ajustes deixariam ainda melhor.",
    ],
    "😄": [
      "Aula fluiu muito bem, alunos participativos.",
      "Estratégia funcionou — vale repetir.",
      "Momento de escuta foi rico.",
      "Avanços visíveis em vários alunos.",
    ],
    "🌟": [
      "Aula excepcional, replicar em outras turmas.",
      "Todos engajados do início ao fim.",
      "Resultados superaram a expectativa.",
      "Família elogiou o trabalho.",
    ],
  };
  const m6AddQuickText = (s: string) => {
    setM6Text((prev) => {
      const t = prev.trim();
      return t ? `${t} ${s}` : s;
    });
  };
  // Diário começa vazio — apenas o que a professora registrar aparece aqui.
  const M6_INITIAL: M6Entry[] = [];
  const [m6Entries, setM6Entries] = usePersistentState<M6Entry[]>("plan_m6_entries", M6_INITIAL);
  const [m6Emoji, setM6Emoji] = useState<string>("");
  const [m6Text, setM6Text] = useState<string>("");
  const [m6Tags, setM6Tags] = useState<string[]>([]);
  const [m6Reminder, setM6Reminder] = usePersistentState<boolean>("plan_m6_reminder", false);
  const [m6ReportOpen, setM6ReportOpen] = useState(false);
  const [m6PatternDismissedKey, setM6PatternDismissedKey] = usePersistentState<string>("plan_m6_pattern_dismissed_key", "");
  const [m6EditingId, setM6EditingId] = useState<string | null>(null);
  const [m6QuickOpen, setM6QuickOpen] = useState<boolean>(false);
  // Sugestão "Próxima aula" que a Sofia gera após salvar um diário novo.
  type M6NextSuggestion = {
    entryId: string;
    resumo: string;
    ajuste: string;
    abertura: string;
    sinais: string[];
  };
  const [m6JustSaved, setM6JustSaved] = useState<M6NextSuggestion | null>(null);
  // Relatório gerado pela Sofia (IA) a partir dos registros do diário.
  type M6AIRelatorio = {
    titulo?: string;
    resumo?: string;
    destaques?: string[];
    alertas?: string[];
    padroes?: string[];
    recomendacoes?: string[];
    comunicacao_familias?: string;
  };
  const [m6AIRel, setM6AIRel] = useState<M6AIRelatorio | null>(null);
  const [m6AILoading, setM6AILoading] = useState(false);
  const [m6AIErro, setM6AIErro] = useState<string | null>(null);
  // Período do relatório e turma selecionada para a leitura adaptativa.
  type M6Periodo = "bimestral" | "trimestral" | "semestral" | "anual";
  const M6_PERIODO_META: Record<M6Periodo, { label: string; meta: number; semanas: number }> = {
    bimestral: { label: "Bimestral", meta: 22, semanas: 8 },
    trimestral: { label: "Trimestral", meta: 33, semanas: 12 },
    semestral: { label: "Semestral", meta: 66, semanas: 24 },
    anual: { label: "Anual", meta: 132, semanas: 40 },
  };
  const [m6Periodo, setM6Periodo] = usePersistentState<M6Periodo>("plan_m6_periodo", "bimestral");
  const [m6RelTurma, setM6RelTurma] = usePersistentState<string>("plan_m6_rel_turma", "");
  const m6Total = M6_PERIODO_META[m6Periodo].meta;
  const m6FormRef = useRef<HTMLDivElement | null>(null);
  const m6Registradas = m6Entries.length;
  const m6Pct = Math.min(100, Math.round((m6Registradas / m6Total) * 100));
  // Relatório adaptado: filtra registros pela turma escolhida (se houver)
  // e gera uma leitura simples a partir das tags / humores observados.
  const m6RelEntries = useMemo(() => {
    if (!m6RelTurma) return m6Entries;
    return m6Entries.filter((e) => (e.turma || "").toLowerCase() === m6RelTurma.toLowerCase());
  }, [m6Entries, m6RelTurma]);
  const m6RelPct = Math.min(100, Math.round((m6RelEntries.length / m6Total) * 100));
  const m6RelLeitura = useMemo(() => {
    const total = m6RelEntries.length;
    if (total === 0) return null;
    const tagCount: Record<string, number> = {};
    const humorCount: Record<string, number> = {};
    m6RelEntries.forEach((e) => {
      e.tags.forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; });
      if (e.emoji) humorCount[e.emoji] = (humorCount[e.emoji] || 0) + 1;
    });
    const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const topHumor = Object.entries(humorCount).sort((a, b) => b[1] - a[1])[0];
    const positivos = m6RelEntries.filter((e) => e.tags.some((t) => t.startsWith("+"))).length;
    const reforco = m6RelEntries.filter((e) => e.tags.some((t) => t.includes("reforço"))).length;
    return { total, topTags, topHumor, positivos, reforco };
  }, [m6RelEntries]);
  // ── Filtros do diário (M6) vindos de search params ─────────────────────
  // Sofia (resumo semanal e ações de notificação) usa esses params para
  // abrir o M6 já filtrado por tag, turma ou aluno PCD citado.
  // Persistência: URL é a fonte de verdade durante a sessão; o último
  // estado é espelhado em localStorage para que, ao voltar ao M6 sem
  // params, os filtros sejam restaurados automaticamente.
  const [m6FilterSaved, setM6FilterSaved] = usePersistentState<M6FilterState>("plan_m6_filters", {});
  // Defense-in-depth: o validateSearch já sanitiza, mas reaplicamos aqui
  // para garantir que nenhum chamador interno injete valor inválido.
  const m6FilterTag = sanitizeFilter(search.tag) ?? "";
  const m6FilterTurma = sanitizeFilter(search.turma) ?? "";
  const m6FilterAluno = sanitizeFilter(search.aluno) ?? "";
  const m6HasFilter = !!(m6FilterTag || m6FilterTurma || m6FilterAluno);
  // Restaura filtros salvos quando o usuário volta ao M6 sem search params.
  // Só dispara se: aba atual = m6, URL sem filtros, e há algo salvo.
  const m6FilterRestored = useRef(false);
  useEffect(() => {
    if (m6FilterRestored.current) return;
    if (search.m !== "m6") return;
    if (m6HasFilter) { m6FilterRestored.current = true; return; }
    // localStorage também é entrada não-confiável (usuário pode editar) —
    // sanitiza antes de restaurar.
    const saved = sanitizeM6Filters(m6FilterSaved);
    if (!saved.tag && !saved.turma && !saved.aluno) {
      m6FilterRestored.current = true;
      return;
    }
    m6FilterRestored.current = true;
    navigate({
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        tag: saved.tag,
        turma: saved.turma,
        aluno: saved.aluno,
      }),
      replace: true,
    });
  }, [search.m, m6HasFilter, m6FilterSaved, navigate]);
  // Espelha filtros da URL em localStorage para futura restauração.
  useEffect(() => {
    if (search.m !== "m6") return;
    const next = {
      tag: m6FilterTag || undefined,
      turma: m6FilterTurma || undefined,
      aluno: m6FilterAluno || undefined,
    };
    setM6FilterSaved((prev) => {
      if (prev?.tag === next.tag && prev?.turma === next.turma && prev?.aluno === next.aluno) return prev;
      return next;
    });
  }, [search.m, m6FilterTag, m6FilterTurma, m6FilterAluno, setM6FilterSaved]);
  const m6FilteredEntries = useMemo(() => {
    if (!m6HasFilter) return m6Entries;
    return m6Entries.filter((e) => {
      if (m6FilterTag && !e.tags.some((t) => t.toLowerCase().includes(m6FilterTag.toLowerCase()))) return false;
      const corpo = `${e.title ?? ""} ${e.text ?? ""}`.trim();
      if (m6FilterTurma && !corpo.toLowerCase().includes(m6FilterTurma.toLowerCase())) return false;
      if (m6FilterAluno && !mentionsName(corpo, m6FilterAluno)) return false;
      return true;
    });
  }, [m6Entries, m6HasFilter, m6FilterTag, m6FilterTurma, m6FilterAluno]);
  // ---------------------------------------------------------------------------
  // Sofia: detecção de padrões + biblioteca de intervenções alternativas.
  // 1) Lê os últimos 5 registros do M6 e calcula um "score" por padrão
  //    (agitação, reforço, inclusão, engajamento, família, cansaço), com
  //    peso maior para registros mais recentes.
  // 2) Cruza os padrões detectados com a biblioteca M6_INTERVENCOES e escolhe
  //    automaticamente a intervenção mais aderente. As demais alternativas
  //    aparecem como opções secundárias para a professora trocar com 1 clique.
  // ---------------------------------------------------------------------------
  const m6SofiaPatternData = useMemo(() => {
    const ultimos = [...m6Entries]
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 5);
    if (ultimos.length < 2) return null;
    type PatKey = "agitacao" | "reforco" | "inclusao" | "funcionou" | "familia" | "cansaco";
    const patternMeta: Record<PatKey, { label: string; test: (t: string, e: string) => boolean }> = {
      agitacao:  { label: "agitação / dispersão",         test: (t) => /agita|recreio|disper|barulh|conflit|inquiet|tumult/.test(t) },
      reforco:   { label: "dúvidas no conceito-chave",    test: (t) => /trav|reforço|reforco|não entend|nao entend|dúvida|duvida|dificuldade|errou|erros/.test(t) },
      inclusao:  { label: "necessidades de inclusão",     test: (t) => /pcd|tea|tdah|inclus|adapta|sensori/.test(t) },
      funcionou: { label: "estratégias que engajaram",    test: (t, e) => /funcionou|engaj|gostaram|deu certo|adoraram/.test(t) || /🌟|😄/.test(e) },
      familia:   { label: "pontos para a família",        test: (t) => /famíl|famil|responsáv|responsav|casa|pais\b|mãe|mae\b|pai\b/.test(t) },
      cansaco:   { label: "turma cansada / desmotivada",  test: (t, e) => /cansad|desmotiv|sono|apát|apat|sem ânimo|sem animo/.test(t) || /😣|😐/.test(e) },
    };
    // Score com peso por recência: mais recente vale mais.
    const scores: Record<string, { n: number; score: number }> = {};
    (Object.keys(patternMeta) as PatKey[]).forEach((k) => { scores[k] = { n: 0, score: 0 }; });
    ultimos.forEach((e, idx) => {
      const peso = ultimos.length - idx; // 5,4,3,2,1
      const txt = `${e.title} ${e.text} ${e.tags.join(" ")}`.toLowerCase();
      (Object.keys(patternMeta) as PatKey[]).forEach((k) => {
        if (patternMeta[k].test(txt, e.emoji)) {
          scores[k].n += 1;
          scores[k].score += peso;
        }
      });
    });
    const detectados = (Object.keys(scores) as PatKey[])
      .filter((k) => scores[k].n >= 2)
      .sort((a, b) => scores[b].score - scores[a].score);
    if (detectados.length === 0) return null;
    const principal = detectados[0];
    return {
      total: ultimos.length,
      detectados,
      principal,
      label: patternMeta[principal].label,
      n: scores[principal].n,
      scores,
    };
  }, [m6Entries]);

  // Biblioteca de intervenções alternativas. Cada item declara que padrões
  // atende e seu peso para ranqueamento. A categoria identifica visualmente
  // o tipo (respiração, jogo calmante, reorganização de rotina, reforço…).
  type M6Intervencao = {
    id: string;
    categoria: "respiracao" | "jogo_calmante" | "rotina" | "reforco" | "inclusao" | "engajamento" | "familia";
    icone: string;
    titulo: string;
    descricao: string;
    porQue: string;
    toast: string;
    atende: { padrao: string; peso: number }[];
  };
  const M6_INTERVENCOES = useMemo<M6Intervencao[]>(() => [
    { id: "resp_478", categoria: "respiracao", icone: "🌬️", titulo: "Respiração 4-7-8 (3 min)",
      descricao: "Inspira em 4, segura em 7, expira em 8. Faça 3 ciclos guiados antes de apresentar o objetivo.",
      porQue: "Reduz batimento cardíaco e ajuda a turma a aterrissar depois do recreio.",
      toast: "✓ Respiração 4-7-8 adicionada à abertura do próximo plano.",
      atende: [{ padrao: "agitacao", peso: 3 }, { padrao: "cansaco", peso: 1 }] },
    { id: "resp_quadrada", categoria: "respiracao", icone: "🟦", titulo: "Respiração quadrada (2 min)",
      descricao: "Desenhe um quadrado no ar: 4s inspira, 4s segura, 4s expira, 4s pausa. 4 voltas.",
      porQue: "Bom quando há barulho/conflito mas a turma resiste a fechar os olhos.",
      toast: "✓ Respiração quadrada adicionada à abertura.",
      atende: [{ padrao: "agitacao", peso: 2 }] },
    { id: "jogo_silencio", categoria: "jogo_calmante", icone: "🤫", titulo: "Jogo do Silêncio dos 60 segundos",
      descricao: "Cronômetro projetado: turma fica em silêncio total por 60s ouvindo o ambiente. Conta o que escutou.",
      porQue: "Canaliza a agitação em foco sensorial sem confronto.",
      toast: "✓ Jogo do Silêncio adicionado à abertura.",
      atende: [{ padrao: "agitacao", peso: 2 }, { padrao: "inclusao", peso: 1 }] },
    { id: "jogo_estatua", categoria: "jogo_calmante", icone: "🗿", titulo: "Estátua musical lenta",
      descricao: "Música calma toca, turma anda devagar; ao parar, viram estátuas por 10s. 3 rodadas.",
      porQue: "Gasta energia residual em movimento controlado, baixa o nível geral.",
      toast: "✓ Estátua musical adicionada à abertura.",
      atende: [{ padrao: "agitacao", peso: 2 }, { padrao: "cansaco", peso: 2 }] },
    { id: "rotina_blocos", categoria: "rotina", icone: "🧱", titulo: "Reorganizar em 2 blocos curtos",
      descricao: "Quebre a explicação em 2 blocos de 15 min com checagem rápida (3 perguntas) entre eles.",
      porQue: "Atenção sustentada cai após 15 min — evita o pico de dispersão.",
      toast: "✓ Plano reorganizado em 2 blocos com checagem.",
      atende: [{ padrao: "agitacao", peso: 2 }, { padrao: "reforco", peso: 2 }, { padrao: "cansaco", peso: 2 }] },
    { id: "rotina_inverter", categoria: "rotina", icone: "🔄", titulo: "Inverter ordem da aula",
      descricao: "Comece pela atividade prática/jogo e use a explicação como fechamento sistematizador.",
      porQue: "Quando a turma chega cansada, partir do concreto resgata o engajamento.",
      toast: "✓ Ordem da aula invertida no próximo plano.",
      atende: [{ padrao: "cansaco", peso: 3 }, { padrao: "funcionou", peso: 1 }] },
    { id: "ref_concreto", categoria: "reforco", icone: "🧩", titulo: "Retomada com material concreto (10 min)",
      descricao: "Volta ao conceito-chave usando manipuláveis/visual antes de avançar para a nova etapa.",
      porQue: "Recorrência de dúvidas indica que o conceito não consolidou no abstrato.",
      toast: "✓ Bloco de retomada com material concreto adicionado.",
      atende: [{ padrao: "reforco", peso: 3 }, { padrao: "inclusao", peso: 1 }] },
    { id: "ref_pares", categoria: "reforco", icone: "👥", titulo: "Reforço entre pares (think-pair-share)",
      descricao: "1 min pensa sozinho · 2 min em dupla · 2 min compartilha. Foco no item que mais travou.",
      porQue: "Quem entendeu explica com vocabulário próximo de quem não entendeu.",
      toast: "✓ Think-pair-share adicionado ao próximo plano.",
      atende: [{ padrao: "reforco", peso: 2 }, { padrao: "funcionou", peso: 1 }] },
    { id: "ref_revisao_jogo", categoria: "reforco", icone: "🎯", titulo: "Revisão em formato de jogo",
      descricao: "Quiz rápido (Plickers/cartelas) com as 5 questões que mais travaram. Feedback imediato.",
      porQue: "Alia reforço pedagógico e engajamento — atende dois padrões ao mesmo tempo.",
      toast: "✓ Quiz de revisão adicionado ao próximo plano.",
      atende: [{ padrao: "reforco", peso: 2 }, { padrao: "funcionou", peso: 2 }] },
    { id: "incl_visual", categoria: "inclusao", icone: "🧷", titulo: "Adaptações visuais + tempo extra",
      descricao: "Roteiro pictórico, fonte ampliada, tempo extra e parceria de apoio para o aluno PCD.",
      porQue: "Recorrência do tema inclusão pede ajuste estrutural, não pontual.",
      toast: "✓ Adaptações PCD adicionadas ao próximo plano.",
      atende: [{ padrao: "inclusao", peso: 3 }] },
    { id: "eng_replicar", categoria: "engajamento", icone: "✨", titulo: "Replicar dinâmica que funcionou",
      descricao: "Mesmo formato que engajou, com novo conteúdo, ampliando para produção em duplas.",
      porQue: "Padrão positivo recente — vale escalar antes que se desgaste.",
      toast: "✓ Estratégia replicada no próximo plano.",
      atende: [{ padrao: "funcionou", peso: 3 }] },
    { id: "fam_bilhete", categoria: "familia", icone: "✉️", titulo: "Rascunhar bilhete para as famílias",
      descricao: "Comunicado curto (3 frases) com o ponto observado e o que pedir em casa.",
      porQue: "Padrão de menções à família indica que vale alinhar.",
      toast: "✓ Rascunho de bilhete salvo em Comunicação.",
      atende: [{ padrao: "familia", peso: 3 }] },
  ], []);

  const m6SofiaSugestoes = useMemo(() => {
    if (!m6SofiaPatternData) return [] as { i: M6Intervencao; score: number }[];
    const { scores } = m6SofiaPatternData;
    return M6_INTERVENCOES
      .map((i) => ({
        i,
        score: i.atende.reduce((acc, a) => acc + (scores[a.padrao]?.score ?? 0) * a.peso, 0),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [m6SofiaPatternData, M6_INTERVENCOES]);

  const M6_CAT_LABEL: Record<M6Intervencao["categoria"], string> = {
    respiracao: "Respiração",
    jogo_calmante: "Jogo calmante",
    rotina: "Reorganização de rotina",
    reforco: "Reforço pedagógico",
    inclusao: "Inclusão",
    engajamento: "Engajamento",
    familia: "Família",
  };
  const [m6SofiaPickedId, setM6SofiaPickedId] = useState<string | null>(null);
  const [m6SofiaShowAlt, setM6SofiaShowAlt] = useState(false);
  const m6SofiaPicked = useMemo(() => {
    if (m6SofiaSugestoes.length === 0) return null;
    if (m6SofiaPickedId) {
      const found = m6SofiaSugestoes.find((s) => s.i.id === m6SofiaPickedId);
      if (found) return found.i;
    }
    return m6SofiaSugestoes[0].i;
  }, [m6SofiaSugestoes, m6SofiaPickedId]);
  const m6SofiaPattern = m6SofiaPatternData && m6SofiaPicked
    ? { total: m6SofiaPatternData.total, n: m6SofiaPatternData.n, label: m6SofiaPatternData.label, key: `${m6SofiaPatternData.principal}:${m6SofiaPicked.id}` }
    : null;
  const m6ClearFilters = () => {
    // Limpa também o espelho em localStorage para que a próxima visita
    // venha realmente sem filtros.
    setM6FilterSaved({});
    m6FilterRestored.current = true;
    navigate({
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        tag: undefined,
        turma: undefined,
        aluno: undefined,
      }),
    });
  };
  const m6ToggleTag = (t: string) => setM6Tags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  // Atividade da Sofia que este registro avalia (opcional).
  const [m6AtividadeId, setM6AtividadeId] = useState<string>("");
  // Lê histórico de atividades geradas pela Sofia (regular + PCD) do
  // localStorage para a professora atrelar o diário a uma atividade
  // específica e medir desempenho por atividade.
  type SofiaAtividadeRef = { id: string; titulo: string; turma?: string; modo: "regular" | "pcd"; salvoEm?: string };
  const m6SofiaAtividades = useMemo<SofiaAtividadeRef[]>(() => {
    if (typeof window === "undefined") return [];
    const lerLista = (key: string, modo: "regular" | "pcd"): SofiaAtividadeRef[] => {
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return [];
        return arr.map((p: { id?: string; titulo?: string; turma?: string; salvoEm?: string; plano?: { titulo?: string } }) => ({
          id: String(p.id || ""),
          titulo: p.titulo || p.plano?.titulo || "Atividade sem título",
          turma: p.turma,
          modo,
          salvoEm: p.salvoEm,
        })).filter((x) => x.id);
      } catch { return []; }
    };
    return [
      ...lerLista("aprof:plan_atividade_regular_hist_v1", "regular"),
      ...lerLista("aprof:plan_atividade_pcd_hist_v1", "pcd"),
    ].sort((a, b) => (b.salvoEm || "").localeCompare(a.salvoEm || ""));
    // Recalcula quando entradas mudam (proxy: m6Entries).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m6Entries.length, m5Turma]);
  const m6AtividadesDaTurma = useMemo(() => {
    const t = (m5Turma || "").toLowerCase();
    if (!t) return m6SofiaAtividades;
    return m6SofiaAtividades.filter((a) => !a.turma || a.turma.toLowerCase() === t);
  }, [m6SofiaAtividades, m5Turma]);
  const m6ResetForm = () => { setM6Emoji(""); setM6Text(""); setM6Tags([]); setM6EditingId(null); setM6AtividadeId(""); };
  const m6StartEdit = (e: M6Entry) => {
    setM6EditingId(e.id);
    setM6Emoji(e.emoji);
    setM6Text(e.text);
    setM6Tags([...e.tags]);
    setM6AtividadeId(e.atividadeId || "");
    if (typeof window !== "undefined") {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      requestAnimationFrame(() => {
        m6FormRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      });
    }
  };
  const m6DeleteEntry = (id: string) => {
    setM6Entries((prev) => prev.filter((x) => x.id !== id));
    if (m6EditingId === id) m6ResetForm();
    showToast("Registro excluído.");
  };
  // Sofia "lê" o registro e devolve uma sugestão de ajuste para a próxima
  // aula (heurística local — palavras-chave, tags e humor).
  const gerarSugestaoSofia = (e: M6Entry): { resumo: string; ajuste: string; abertura: string; sinais: string[] } => {
    const txt = `${e.text} ${e.tags.join(" ")}`.toLowerCase();
    const sinais: string[] = [];
    let ajuste = "";
    let abertura = "Retomar combinados (2 min) e relembrar o objetivo da aula anterior.";
    let resumo = "";
    const inclusao = e.tags.some((t) => t.includes("inclusão")) || /pcd|tea|tdah|inclus/.test(txt);
    const reforco = e.tags.some((t) => t.includes("reforço")) || /trav|reforço|reforco|não entend|nao entend|dúvida|duvida/.test(txt);
    const agitacao = /agita|recreio|disper|barulh|conflit|inquiet/.test(txt);
    const funcionou = e.tags.some((t) => t.includes("funcionou")) || /funcionou|engaj|gostaram|deu certo|🌟|😄/.test(txt + e.emoji);
    const familia = e.tags.some((t) => t.includes("família"));
    if (agitacao) {
      sinais.push("Sinal de agitação");
      abertura = "Comece com 3 min de respiração guiada (4-7-8) antes de apresentar o objetivo.";
    }
    if (reforco) {
      sinais.push("Conceito-chave precisa de reforço");
      ajuste = "Reservar os 10 primeiros minutos para retomar o conceito com material concreto/visual antes de avançar.";
    }
    if (inclusao) {
      sinais.push("Inclusão em foco");
      ajuste = ajuste
        ? `${ajuste} Garantir adaptação visual, tempo extra e parceria de apoio para o aluno PCD.`
        : "Adicionar adaptação visual, tempo extra e parceria de apoio para o aluno PCD.";
    }
    if (funcionou && !ajuste) {
      sinais.push("Estratégia que funcionou");
      ajuste = "Replicar a dinâmica que engajou (mesmo formato, novo conteúdo) e ampliar para produção em duplas.";
    }
    if (familia) sinais.push("Comunicar família");
    if (!ajuste) ajuste = "Ajustar o ritmo: dividir a explicação em 2 blocos curtos com checagem rápida no meio.";
    if (e.emoji === "😣" || e.emoji === "😐") {
      resumo = "Aula puxada — Sofia sugere abrir mais leve e revisar o que travou.";
    } else if (e.emoji === "😄" || e.emoji === "🌟") {
      resumo = "Aula fluiu — Sofia sugere ampliar a estratégia que funcionou.";
    } else {
      resumo = "Sofia leu seu registro e preparou um ajuste para a próxima aula.";
    }
    return { resumo, ajuste, abertura, sinais };
  };
  // Encontra a próxima aula do M1 a partir de hoje (mesma turma, se houver).
  const acharProximaAulaM1 = (): { dia: DayKey; card: M1Card } | null => {
    const ordem: DayKey[] = ["seg", "ter", "qua", "qui", "sex"];
    const hojeIdx = (() => {
      const dow = new Date().getDay(); // 1..5
      if (dow >= 1 && dow <= 5) return dow - 1;
      return 0;
    })();
    for (let i = hojeIdx; i < ordem.length; i++) {
      const d = ordem[i];
      const cards = m1Plan[d] || [];
      if (cards.length > 0) return { dia: d, card: cards[0] };
    }
    for (let i = 0; i < hojeIdx; i++) {
      const d = ordem[i];
      const cards = m1Plan[d] || [];
      if (cards.length > 0) return { dia: d, card: cards[0] };
    }
    return null;
  };
  const m6IrParaProxima = () => {
    if (!m6JustSaved) return;
    const proxima = acharProximaAulaM1();
    if (!proxima) {
      showToast("Sem próxima aula no M1 — gere a semana primeiro.");
      setM("m1");
      return;
    }
    // Aplica o ajuste no campo "diferenciação" (ou "abertura") preservando o existente.
    const carta = proxima.card;
    const novaDif = [carta.diferenciacao, `Sofia (diário): ${m6JustSaved.ajuste}`]
      .filter(Boolean)
      .join(" • ");
    const novosPassos = [m6JustSaved.abertura, ...(carta.passos || [])];
    m1UpdateCard(proxima.dia, carta.id, { diferenciacao: novaDif, passos: novosPassos });
    setM("m1");
    requestAnimationFrame(() => m1OpenEdit(proxima.dia, carta.id));
    setM6JustSaved(null);
    showToast("✓ Sofia aplicou o ajuste na próxima aula.");
  };
  // Gera relatório com a Sofia (Lovable AI) a partir dos registros do diário.
  const m6GerarRelatorioSofia = async () => {
    setM6AILoading(true);
    setM6AIErro(null);
    try {
      const stats = m6RelLeitura
        ? {
            total: m6RelLeitura.total,
            humor_predominante: m6RelLeitura.topHumor?.[0] || null,
            top_tags: m6RelLeitura.topTags,
            positivos: m6RelLeitura.positivos,
            reforco: m6RelLeitura.reforco,
          }
        : { total: 0 };
      const payload = {
        periodo: M6_PERIODO_META[m6Periodo].label.toLowerCase(),
        turma: m6RelTurma || "",
        stats,
        entries: m6RelEntries.map((e) => ({
          emoji: e.emoji,
          title: e.title,
          text: e.text,
          tags: e.tags,
          date: e.date,
          turma: e.turma,
          atividadeTitulo: e.atividadeTitulo,
        })),
      };
      const { data, error } = await supabase.functions.invoke("gerar-relatorio", { body: payload });
      if (error) throw error;
      const rel = (data as { relatorio?: M6AIRelatorio })?.relatorio;
      if (!rel) throw new Error("Resposta vazia da Sofia.");
      setM6AIRel(rel);
      void consumirCreditos(CUSTOS.parecer_descritivo, "Relatório pedagógico (M6)");
    } catch (e) {
      setM6AIErro((e as Error)?.message || "Falha ao gerar relatório.");
    } finally {
      setM6AILoading(false);
    }
  };
  const m6Save = () => {
    if (!m6Emoji && !m6Text.trim() && m6Tags.length === 0) { showToast("Selecione um emoji ou escreva uma anotação."); return; }
    const trimmed = m6Text.trim();
    const words = trimmed.split(/\s+/).slice(0, 6).join(" ");
    const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const atividadeRef = m6AtividadeId
      ? m6SofiaAtividades.find((a) => a.id === m6AtividadeId)
      : undefined;
    if (m6EditingId) {
      setM6Entries((prev) => prev.map((x) => {
        if (x.id !== m6EditingId) return x;
        const newTitle = words || x.title || "Registro rápido";
        const dayLabel = (x.date.split(" · ")[0] || "Hoje").replace(/\s*\(editado\)\s*$/, "");
        return {
          ...x,
          emoji: m6Emoji || x.emoji,
          title: newTitle,
          text: trimmed,
          tags: [...m6Tags],
          date: `${dayLabel} · ${now} (editado)`,
          atividadeId: m6AtividadeId || undefined,
          atividadeTitulo: atividadeRef?.titulo,
        };
      }));
      m6ResetForm();
      showToast("✓ Registro atualizado.");
      return;
    }
    const turmaAtual = m5Turma || M5_TURMAS[0] || "";
    const entry: M6Entry = {
      id: `e-${Date.now()}`,
      emoji: m6Emoji || "🙂",
      title: words || atividadeRef?.titulo || "Registro rápido",
      text: trimmed,
      tags: [...m6Tags],
      date: `Hoje · ${now}`,
      turma: turmaAtual,
      atividadeId: m6AtividadeId || undefined,
      atividadeTitulo: atividadeRef?.titulo,
    };
    setM6Entries((prev) => [entry, ...prev]);
    m6ResetForm();
    // Sofia interpreta o registro e propõe um ajuste para a próxima aula.
    const sugestao = gerarSugestaoSofia(entry);
    setM6JustSaved({ entryId: entry.id, ...sugestao });
    showToast("✓ Diário salvo.");
  };

  // M2 — Sequência didática
  const [m2Steps, setM2Steps] = usePersistentState<M2Step[]>("plan_m2_steps", []);
  // Progresso da sequência: índice da etapa "em andamento". Etapas anteriores
  // são consideradas concluídas; posteriores, futuras.
  const [m2CurIdx, setM2CurIdx] = usePersistentState<number>("plan_m2_cur_idx", 0);
  const [m2PrintOpen, setM2PrintOpen] = useState(false);
  // Indicador "Salvo automaticamente": pisca brevemente sempre que m2Steps ou
  // m2CurIdx mudam (ou seja, são gravados no localStorage pelo usePersistentState).
  const [m2SavedAt, setM2SavedAt] = useState<number | null>(null);
  const [m2JustSaved, setM2JustSaved] = useState(false);
  const m2FirstRender = useRef(true);
  useEffect(() => {
    if (m2FirstRender.current) { m2FirstRender.current = false; return; }
    setM2SavedAt(Date.now());
    setM2JustSaved(true);
    const t = setTimeout(() => setM2JustSaved(false), 1800);
    return () => clearTimeout(t);
  }, [m2Steps, m2CurIdx]);
  const m2Total = m2Steps.length;
  const m2DoneCount = Math.min(m2CurIdx, m2Total);
  const m2Pct = m2Total === 0 ? 0 : Math.round((m2DoneCount / m2Total) * 100);
  const avancarEtapa = () => {
    if (m2Total === 0) { showToast("Adicione uma aula antes de avançar."); return; }
    if (m2CurIdx >= m2Total) { showToast("Sequência já concluída. 🎉"); return; }
    const next = m2CurIdx + 1;
    setM2CurIdx(next);
    if (next >= m2Total) showToast("Sequência concluída! 🎉");
    else showToast(`Etapa ${next} concluída. Avançando para ${next + 1} de ${m2Total}. ✓`);
  };
  const reiniciarProgresso = () => { setM2CurIdx(0); showToast("Progresso reiniciado."); };
  // Seleção por aula para impressão (M3). Vazio = todas selecionadas.
  const [m2SelIds, setM2SelIds] = useState<Set<string>>(new Set());
  const m2ToggleSel = (id: string) => setM2SelIds((prev) => {
    // Conjunto vazio = "todas selecionadas". Ao desmarcar a primeira,
    // materializamos o conjunto com todas menos a clicada.
    if (prev.size === 0) {
      const next = new Set(m2Steps.map((s) => s.id));
      next.delete(id);
      return next;
    }
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const [m2PrintModalOpen, setM2PrintModalOpen] = useState(false);
  const imprimirSequencia = () => {
    if (m2Steps.length === 0) { showToast("Adicione ao menos uma aula antes de imprimir."); return; }
    setM2PrintModalOpen(true);
  };
  const executarImpressaoM3 = (info: PrintInfo) => {
    const selecionadas = m2SelIds.size > 0
      ? m2Steps.filter((s) => m2SelIds.has(s.id))
      : m2Steps;
    if (selecionadas.length === 0) { showToast("Selecione ao menos uma aula."); return; }
    imprimirPlanejamentoDireto({
      titulo: "SEQUÊNCIA DIDÁTICA",
      escola: info.escola || undefined,
      turma: info.turma || undefined,
      professor: info.professor || undefined,
      dataInicio: info.dataInicio || undefined,
      dataFim: info.dataFim || undefined,
      secoes: selecionadas.map((s) => {
        const idx = m2Steps.findIndex((x) => x.id === s.id);
        const status = idx < m2CurIdx ? "Concluída" : idx === m2CurIdx ? "Em andamento" : "Futura";
        return {
          titulo: `Aula ${idx + 1} — ${s.d} · ${s.tag} · ${status}`,
          blocos: [
            { label: "Atividades:", body: s.t },
            { label: "Objetivos:", body: s.p },
          ],
        };
      }),
      rodapeLegal: "Documento gerado com apoio do AgilizaProf em consonância com a Lei 9.394/1996 (LDB).",
    });
  };
  const [m2Form, setM2Form] = useState<{ d: string; tag: string; t: string; p: string }>({
    d: "SEG", tag: M2_TAG_OPTS[0], t: "", p: M2_BNCC_OPTS[0],
  });
  const addM2Step = () => {
    const t = m2Form.t.trim();
    if (!t) { showToast("Dê um título à aula antes de adicionar."); return; }
    const novo: M2Step = { id: `s_${Date.now()}`, d: m2Form.d, tag: m2Form.tag, t, p: m2Form.p };
    setM2Steps((arr) => [...arr, novo]);
    setM2Form((f) => ({ ...f, t: "" }));
    showToast("Aula adicionada à cadeia. Sofia já conectou. ✓");
  };
  const sugerirProxima = () => {
    if (m2Steps.length === 0) { showToast("Adicione uma aula base primeiro."); return; }
    const last = m2Steps[m2Steps.length - 1];
    const idx = M2_DAY_OPTS.indexOf(last.d as typeof M2_DAY_OPTS[number]);
    const nextDay = M2_DAY_OPTS[Math.min(idx + 1, M2_DAY_OPTS.length - 1)];
    const usadas = new Set(m2Steps.map((s) => s.tag));
    // Primeira etapa da sequência que ainda não está na cadeia — garante que
    // nenhuma etapa anterior seja pulada antes de avançar.
    const proximaLivre = SEQ.find((t) => !usadas.has(t));
    if (!proximaLivre) {
      showToast("A sequência já cobre todas as etapas (Introdução → Síntese).");
      return;
    }
    const nextTag: string = proximaLivre;
    const titulosPorTag: Record<string, string> = {
      "Introdução": `Introdução: ${last.t}`,
      "Desenvolvimento": `Desenvolvimento: ${last.t}`,
      "Aprofundamento": `Aprofundamento: ${last.t}`,
      "Prática guiada": `Prática guiada: ${last.t}`,
      "Prática autônoma": `Prática autônoma: ${last.t}`,
      "Avaliação": `Avaliação: ${last.t}`,
      "Revisão": `Revisão: ${last.t}`,
      "Síntese": `Síntese: ${last.t}`,
    };
    const sugest: M2Step = {
      id: `s_${Date.now()}`,
      d: nextDay,
      tag: nextTag,
      t: titulosPorTag[nextTag] ?? `Continuação: ${last.t}`,
      p: last.p,
      suggest: true,
    };
    setM2Steps((arr) => [...arr, sugest]);
  };
  // Escada didática completa, usada tanto para sugerir a próxima aula quanto
  // para reordenar as etapas já criadas na ordem canônica.
  const SEQ = [
    "Introdução",
    "Desenvolvimento",
    "Aprofundamento",
    "Prática guiada",
    "Prática autônoma",
    "Avaliação",
    "Revisão",
    "Síntese",
  ] as const;
  // Reordena as etapas existentes seguindo SEQ, preservando todos os blocos.
  // Etapas com a mesma tag mantêm a ordem relativa atual; tags fora da SEQ
  // vão para o final, também na ordem original.
  const [m2ReorderBackup, setM2ReorderBackup] = useState<M2Step[] | null>(null);
  const reordenarSequencia = () => {
    if (m2Steps.length < 2) { showToast("Adicione ao menos duas aulas para reordenar."); return; }
    const snapshot = m2Steps;
    setM2Steps((arr) => {
      const rank = (tag: string) => {
        const i = (SEQ as readonly string[]).indexOf(tag);
        return i === -1 ? SEQ.length : i;
      };
      const indexed = arr.map((s, i) => ({ s, i }));
      indexed.sort((a, b) => {
        const ra = rank(a.s.tag), rb = rank(b.s.tag);
        if (ra !== rb) return ra - rb;
        return a.i - b.i;
      });
      const next = indexed.map((x) => x.s);
      const mudou = next.some((s, i) => s.id !== arr[i].id);
      if (!mudou) {
        showToast("A sequência já está na ordem completa. ✓");
        return arr;
      }
      return reassignDays(next);
    });
    setM2ReorderBackup(snapshot);
    showToast("Etapas reordenadas na ordem completa. Dias atualizados. ✓");
  };
  const desfazerReordenacao = () => {
    if (!m2ReorderBackup) return;
    setM2Steps(m2ReorderBackup);
    setM2ReorderBackup(null);
    showToast("Reordenação desfeita. Sequência anterior restaurada. ✓");
  };
  const aceitarSugestao = (id: string) => setM2Steps((arr) => arr.map((s) => s.id === id ? { ...s, suggest: false } : s));
  const removerStep = (id: string) => setM2Steps((arr) => arr.filter((s) => s.id !== id));
  const [m2EditId, setM2EditId] = useState<string | null>(null);
  const updateStep = (id: string, patch: Partial<M2Step>) =>
    setM2Steps((arr) => arr.map((s) => s.id === id ? { ...s, ...patch } : s));
  // Reordenação por drag & drop. Após reordenar, o dia de cada aula
  // passa a refletir a sua posição na sequência (1ª = SEG, 2ª = TER, …).
  const m2DragId = useRef<string | null>(null);
  const [m2DragOverId, setM2DragOverId] = useState<string | null>(null);
  const [m2DragPos, setM2DragPos] = useState<"before" | "after">("before");
  const [m2DraggingId, setM2DraggingId] = useState<string | null>(null);
  const reassignDays = (arr: M2Step[]): M2Step[] =>
    arr.map((s, i) => ({ ...s, d: M2_DAY_OPTS[Math.min(i, M2_DAY_OPTS.length - 1)] }));
  const onM2DragStart = (e: React.DragEvent, id: string) => {
    m2DragId.current = id;
    setM2DraggingId(id);
    try { e.dataTransfer.effectAllowed = "move"; } catch { /* noop */ }
  };
  const onM2DragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    try { e.dataTransfer.dropEffect = "move"; } catch { /* noop */ }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pos: "before" | "after" = (e.clientY - rect.top) < rect.height / 2 ? "before" : "after";
    if (m2DragOverId !== id) setM2DragOverId(id);
    if (m2DragPos !== pos) setM2DragPos(pos);
  };
  const onM2DragEnd = () => {
    m2DragId.current = null;
    setM2DragOverId(null);
    setM2DraggingId(null);
  };
  const onM2Drop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const fromId = m2DragId.current;
    const pos = m2DragPos;
    setM2DragOverId(null);
    setM2DraggingId(null);
    m2DragId.current = null;
    if (!fromId || fromId === targetId) return;
    setM2Steps((arr) => {
      const from = arr.findIndex((s) => s.id === fromId);
      let to = arr.findIndex((s) => s.id === targetId);
      if (from < 0 || to < 0) return arr;
      const next = arr.slice();
      const [moved] = next.splice(from, 1);
      // ajusta o índice de destino quando o item arrastado vinha antes do alvo
      if (from < to) to -= 1;
      const insertAt = pos === "after" ? to + 1 : to;
      next.splice(insertAt, 0, moved);
      return reassignDays(next);
    });
    showToast("Sequência reordenada. Dias atualizados. ✓");
  };

  const sendChat = (msg?: string) => {
    const t = (msg ?? chatTxt).trim(); if (!t) return;
    setChatLog((l) => [...l, { from: "user", t }]);
    setChatTxt("");
    setM3Loading(true);
    setTimeout(() => {
      const low = t.toLowerCase();
      const mudancas: string[] = [];
      let resposta = `Ajustei a atividade considerando "${t}". Mantive o objetivo e a habilidade BNCC.`;
      setM3Plan((p) => {
        // Snapshot do estado anterior, sem flags "novo", para detectar
        // qualquer mudança (criação OU atualização) ao final.
        const prevEtapas = new Map(p.etapas.map((e) => [e.id, { titulo: e.titulo, min: e.min }]));
        const prevAdapt = new Map(p.adaptacoes.map((a) => [a.id, { aluno: a.aluno, texto: a.texto }]));
        let next: M3Plan = { ...p, etapas: p.etapas.map((e) => ({ ...e, novo: false })), adaptacoes: p.adaptacoes.map((a) => ({ ...a, novo: false })) };
        // Roda de fechamento
        if (low.includes("roda")) {
          next = { ...next, etapas: [...next.etapas, { id: `e_${Date.now()}`, titulo: "Roda de fechamento", min: 10, novo: true }] };
          mudancas.push("adicionei uma roda de fechamento de 10 min");
        }
        // Adaptação para Júlia / TEA
        if (low.includes("júlia") || low.includes("julia") || low.includes("tea")) {
          const aluno = (low.includes("júlia") || low.includes("julia")) ? "Júlia" : "Aluno com TEA";
          next = {
            ...next,
            adaptacoes: [
              ...next.adaptacoes,
              { id: `a_${Date.now()}`, aluno, texto: "Antecipar pictogramas da rotina, oferecer fone abafador e dupla com colega-âncora.", novo: true },
            ],
          };
          mudancas.push(`incluí adaptação específica para ${aluno}`);
        }
        // Encurtar / 30 min
        const matchMin = low.match(/(\d{2,3})\s*min/);
        if (low.includes("encurt") || low.includes("mais curt") || matchMin) {
          const novaDur = matchMin ? Math.max(10, Math.min(180, parseInt(matchMin[1], 10))) : 30;
          const fator = novaDur / next.duracaoMin;
          const etapas = next.etapas.map((e) => ({ ...e, min: Math.max(5, Math.round(e.min * fator)) }));
          next = { ...next, duracaoMin: novaDur, etapas };
          mudancas.push(`reduzi a duração total para ${novaDur} min, redistribuindo as etapas proporcionalmente`);
        }
        // Trocar dupla por individual
        if (low.includes("individual") && (low.includes("dupla") || low.includes("trio") || low.includes("grupo"))) {
          const etapas = next.etapas.map((e) => ({ ...e, titulo: e.titulo.replace(/\(duplas?\)|\(em duplas?\)|em duplas?/gi, "(individual)") }));
          next = { ...next, etapas };
          mudancas.push("troquei a execução em dupla por individual");
        }
        // Marca como "novo" qualquer etapa/adaptação criada OU cujo conteúdo
        // mudou em relação ao snapshot anterior — assim o pl-blink dispara
        // também em atualizações, não só em adições.
        next = {
          ...next,
          etapas: next.etapas.map((e) => {
            const prev = prevEtapas.get(e.id);
            const mudou = !prev || prev.titulo !== e.titulo || prev.min !== e.min;
            return mudou ? { ...e, novo: true } : { ...e, novo: false };
          }),
          adaptacoes: next.adaptacoes.map((a) => {
            const prev = prevAdapt.get(a.id);
            const mudou = !prev || prev.aluno !== a.aluno || prev.texto !== a.texto;
            return mudou ? { ...a, novo: true } : { ...a, novo: false };
          }),
        };
        return next;
      });
      if (mudancas.length > 0) {
        resposta = `Pronto! Eu ${mudancas.join("; ")}. Mantive o objetivo e a BNCC intactos.`;
      }
      setChatLog((l) => [...l, { from: "sofia", t: resposta }]);
      setM3Loading(false);
    }, 1500);
  };
  const restaurarPlanoOriginal = () => {
    setM3Plan(M3_INITIAL_PLAN);
    setChatLog(M3_INITIAL_LOG);
    showToast("Plano restaurado ao original. ✓");
  };

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
    let movedCard: Card | null = null;
    const fromDay = d.from;
    setWeek((w) => {
      const card = w[d.from].find((c) => c.id === d.id); if (!card || card.locked) return w;
      movedCard = card;
      return { ...w, [d.from]: w[d.from].filter((c) => c.id !== d.id), [to]: [...w[to], card] };
    });
    dragCard.current = null;
    if (movedCard) {
      const card = movedCard as Card;
      setM5UndoMove({ card, from: fromDay, to });
      m5LogHistory(`Moveu "${card.title}" de ${fromDay.toUpperCase()} para ${to.toUpperCase()}`, () => {
        setWeek((w) => ({ ...w, [to]: w[to].filter((c) => c.id !== card.id), [fromDay]: [...w[fromDay], card] }));
      });
    }
    showToast(`↔ Cartão movido com sucesso.`);
  };

  // === M1 — Drag & drop entre dias do calendário ===
  const m1DragCard = useRef<{ from: DayKey; id: string } | null>(null);
  const [m1DropDay, setM1DropDay] = useState<DayKey | null>(null);
  const onM1DragStart = (from: DayKey, id: string) => { m1DragCard.current = { from, id }; };
  const onM1DragOver = (e: React.DragEvent, day: DayKey) => { e.preventDefault(); setM1DropDay(day); };
  const onM1DragLeave = () => setM1DropDay(null);
  const onM1Drop = (e: React.DragEvent, to: DayKey) => {
    e.preventDefault();
    setM1DropDay(null);
    const d = m1DragCard.current; if (!d) return;
    if (d.from === to) return;
    setM1Plan((p) => {
      const card = p[d.from].find((c) => c.id === d.id); if (!card) return p;
      return { ...p, [d.from]: p[d.from].filter((c) => c.id !== d.id), [to]: [...p[to], card] };
    });
    m1DragCard.current = null;
    const dayName = m1Week.days.find((x) => x.k === to)?.n ?? to.toUpperCase();
    showToast(`Atividade movida para ${dayName}. ✓`);
  };

  const cfg = M_CONFIG[m];
  const pickCount = useMemo(() => Object.values(picks).filter(Boolean).length, [picks]);

  return (
    !hydrated ? (
      <div
        className="pl-root"
        data-testid="planejamento-skeleton"
        role="status"
        aria-busy="true"
        aria-live="polite"
        aria-label="Carregando planejamento"
      >
        <style>{sidebarCss}</style>
        <style>{css}</style>
        <style>{emptyStateCss}</style>
        <style>{`
          @keyframes plSkPulse { 0%,100%{opacity:.55} 50%{opacity:1} }
          .pl-sk { background: linear-gradient(90deg, #eef1f5 0%, #f6f8fb 50%, #eef1f5 100%); border-radius: 10px; animation: plSkPulse 1.4s ease-in-out infinite; }
          .pl-sk-row { display:flex; gap:12px; flex-wrap:wrap; }
          .pl-sr-only { position:absolute !important; width:1px !important; height:1px !important; padding:0 !important; margin:-1px !important; overflow:hidden !important; clip:rect(0,0,0,0) !important; white-space:nowrap !important; border:0 !important; }
        `}</style>
        <p className="pl-sr-only" data-testid="planejamento-skeleton-sr">
          Carregando o planejamento, por favor aguarde. O conteúdo aparecerá automaticamente assim que estiver pronto.
        </p>
        <div className="pl-app" aria-hidden="true">
          <AppSidebar active="planning" />
          <div className="pl-main">
            <AppHeader breadcrumb={[{ label: "Sua sala" }, { label: "Planejamento" }]} />
            <div className="pl-hero">
              <div className="pl-sk" style={{ width: 110, height: 22, marginBottom: 14 }} />
              <div className="pl-sk" style={{ width: "70%", height: 36, marginBottom: 10 }} />
              <div className="pl-sk" style={{ width: "50%", height: 18, marginBottom: 18 }} />
              <div className="pl-sk-row">
                <div className="pl-sk" style={{ width: 140, height: 34 }} />
                <div className="pl-sk" style={{ width: 160, height: 34 }} />
                <div className="pl-sk" style={{ width: 120, height: 34 }} />
              </div>
            </div>
            <div className="pl-workspace" style={{ padding: 16 }}>
              <div className="pl-sk" style={{ width: "100%", height: 44, marginBottom: 16 }} />
              <div className="pl-sk-row" style={{ marginBottom: 14 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="pl-sk" style={{ flex: "1 1 160px", height: 180 }} />
                ))}
              </div>
              <div className="pl-sk" style={{ width: "100%", height: 220 }} />
            </div>
          </div>
        </div>
      </div>
    ) : (
    <div className="pl-root">
      <style>{sidebarCss}</style>
      <style>{css}</style>
      <style>{emptyStateCss}</style>
      <div className="pl-app">
        <AppSidebar active="planning" />
        <div className="pl-main">
          <AppHeader
            breadcrumb={[
              { label: "Sua sala" },
              { label: isEi ? "Roteiros de experiência" : "Planejamento" },
              { label: isEi && cfg.crumb === "Diário de bordo" ? "Diário de observação" : cfg.crumb },
            ]}
          />
          {isEi && (
            <div style={{ background: "#ECFDF5", borderBottom: "1px solid #A7F3D0", color: "#065F46", padding: "8px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              🌱 <strong>Modo Educação Infantil ativo.</strong> Para roteiros de experiência com Campos de Experiência, abra o
              <a href="/planejamento/ei" style={{ color: "#047857", fontWeight: 600, marginLeft: 4 }}>Roteiro EI →</a>
            </div>
          )}

          {/* HERO */}
          <div className="pl-hero">
            <span className="badge">{cfg.badge}</span>
            <h1>{cfg.title}<em>{cfg.sub}</em></h1>
            <p className="lead">{cfg.lead}</p>
            <div className="chips">
              {cfg.chips.map((c, i) => (
                <button
                  key={i}
                  className={"hbc " + (c.solid ? "solid" : "outline")}
                  onClick={() => {
                    const l = c.label.toLowerCase();
                    if (l.includes("ajustar parâmetros")) { setParamsModalOpen(true); return; }
                    const scrollToAnchor = (id: string) => {
                      const el = document.getElementById(id);
                      if (!el) return;
                      const topbar = document.querySelector(".pl-topbar") as HTMLElement | null;
                      const offset = (topbar?.offsetHeight ?? 48) + 16;
                      const y = el.getBoundingClientRect().top + window.scrollY - offset;
                      window.scrollTo({ top: y, behavior: "smooth" });
                    };
                    if (m === "m2") {
                      if (l.includes("ver cadeia")) { scrollToAnchor("m2-cadeia"); return; }
                      if (l.includes("habilidades")) { scrollToAnchor("m2-habilidades"); return; }
                      if (l.includes("reordenar")) { reordenarSequencia(); return; }
                    }
                  }}
                >{c.label}</button>
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
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <h2 style={{ margin: 0 }}>Semana atual</h2>
                    <select
                      value={m5Turma}
                      onChange={(e) => m5TrocarTurma(e.target.value)}
                      style={{ padding: "6px 10px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff", fontSize: 12.5, fontWeight: 600 }}
                      title="Trocar turma"
                    >
                      {M5_TURMAS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="right">
                    <button className="pl-btn ghost"><ChevronLeft size={14} /> Anterior</button>
                    <button className="pl-btn ghost">Próxima <ChevronRight size={14} /></button>
                    <button className="pl-btn" onClick={() => setM5HistoryOpen(true)}><Clock size={14} /> Histórico {m5History.length > 0 && `(${m5History.length})`}</button>
                    <button className="pl-btn" onClick={m5OpenReplicar}><Copy size={14} /> Replicar em turmas</button>
                    <button className="pl-btn" onClick={m5ExportPdf}><Download size={14} /> Exportar PDF</button>
                    <button className="pl-btn primary" onClick={m5GerarComSofia} disabled={m5Generating}>
                      <Sparkles size={14} /> {m5Generating ? "Sofia montando…" : "Gerar com Sofia"}
                    </button>
                  </div>
                </div>

                <div className="pl-layout">
                  <div>
                    {turmasLoading && TURMAS.length === 0 ? (
                      <div className="pl-week">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={`sk-day-${i}`} className="pl-day">
                            <div className="pl-day-head">
                              <Skeleton className="h-4 w-16" />
                            </div>
                            <Skeleton className="h-16 w-full mt-2" />
                            <Skeleton className="h-16 w-full mt-2" />
                          </div>
                        ))}
                      </div>
                    ) : TURMAS.length === 0 ? (
                      <EmptyState
                        icon="🗓️"
                        title="Cadastre uma turma para começar a planejar a semana."
                        description="Quando houver turmas e atividades, você poderá arrastar entre os dias e replicar para outras turmas."
                        ctaLabel="Nova turma"
                      />
                    ) : (
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
                              <button
                                className="add"
                                aria-label={`Adicionar atividade em ${d.n}`}
                                onClick={() => { setM5InlineDay(d.k); setM5InlineNome(""); }}
                              ><Plus size={14} /></button>
                            </div>
                            {m5InlineDay === d.k && (
                              <div style={{ display: "grid", gap: 6, padding: 8, border: "1px dashed var(--line)", borderRadius: 8, background: "#FAFBFD", marginBottom: 6 }}>
                                <input autoFocus value={m5InlineNome} onChange={(e) => setM5InlineNome(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") m5AddInline(d.k); if (e.key === "Escape") setM5InlineDay(null); }} placeholder="Nome da atividade" style={{ padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12 }} />
                                <div style={{ display: "flex", gap: 4 }}>
                                  <input value={m5InlineMin} onChange={(e) => setM5InlineMin(e.target.value)} placeholder="min" style={{ width: 60, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12 }} />
                                  <button className="pl-btn primary" onClick={() => m5AddInline(d.k)} style={{ padding: "5px 8px", fontSize: 11.5, flex: 1 }}>Adicionar</button>
                                  <button className="pl-btn ghost" onClick={() => setM5InlineDay(null)} style={{ padding: "5px 8px", fontSize: 11.5 }}>×</button>
                                </div>
                              </div>
                            )}
                            {cards.map((c) => (
                              <div
                                key={c.id}
                                className={"pl-card " + c.v + (c.locked ? " locked" : "")}
                                style={m5Selected.has(c.id) ? { outline: "2px solid var(--orange, #F97316)", outlineOffset: 2 } : undefined}
                                draggable={!c.locked}
                                onDragStart={() => onDragStart(d.k, c.id)}
                                onClick={(e) => {
                                  if (e.shiftKey) {
                                    e.preventDefault();
                                    setM5Selected((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; });
                                  } else if (m5Selected.size > 0) {
                                    m5ToggleSelect(c.id, e);
                                  }
                                }}
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
                            {empty && m5InlineDay !== d.k && (
                              <div className="pl-empty-slot">
                                <div className="ic"><Plus size={14} /></div>
                                <div>Solte um cartão aqui<br />ou peça pra Sofia</div>
                                <button className="sb" onClick={() => m5SugerirAula(d.k)}><Sparkles size={11} /> Sugerir aula</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    )}

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
                      {turmasLoading && TURMAS.length === 0 ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <div key={`sk-trow-${i}`} className="pl-trow" style={{ pointerEvents: "none" }}>
                            <Skeleton className="h-4 w-4 rounded" />
                            <span className="info" style={{ flex: 1 }}>
                              <Skeleton className="h-3 w-32 mb-2" />
                              <Skeleton className="h-3 w-20" />
                            </span>
                            <Skeleton className="h-4 w-12" />
                          </div>
                        ))
                      ) : TURMAS.length === 0 && (
                        <EmptyState icon="👩‍🏫" title="Sem turmas cadastradas." description="Cadastre turmas para replicar planos rapidamente." />
                      )}
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
                      <button
                        className="pl-btn primary pl-replica-cta"
                        disabled={pickCount === 0}
                        title={pickCount === 0 ? "Cadastre pelo menos 1 turma pra replicar" : undefined}
                        style={pickCount === 0 ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                        onClick={() => pickCount > 0 && showToast(`Semana replicada em ${pickCount} turma(s). Sofia adaptou 2 atividades para PCD. ✓`)}
                      >
                        <Check size={14} /> Replicar em {pickCount} turmas
                      </button>
                    </div>

                    <div className="pl-panel">
                      <h3><Clock size={14} /> Histórico</h3>
                      <EmptyState icon="🕘" title="Sem ações registradas ainda." description="Suas movimentações e replicações aparecerão aqui." />
                    </div>
                  </aside>
                </div>
              </>
            )}

            {m === "m1" && (
              <>
                <div className="pl-tools">
                  <div><h2>Sofia preenche a semana <small>· defina turma e tema</small></h2></div>
                  <div className="right">
                    <button className="pl-btn ghost" onClick={() => setParamsModalOpen(true)} title="Ajustar parâmetros"><Pencil size={14} /> Ajustar parâmetros</button>
                    <button className="pl-btn ghost" onClick={limparSemanaM1} disabled={m1Stats.atividades === 0}><X size={14} /> Limpar</button>
                    <button className="pl-btn ghost" onClick={gerarComSofia} disabled={m1Generating}><RefreshCw size={14} /> Regenerar</button>
                    <button
                      className="pl-btn primary"
                      onClick={gerarComSofia}
                      disabled={m1Generating}
                    ><Sparkles size={14} /> {m1Generating ? "Sofia montando…" : (m1Stats.atividades === 0 ? "Gerar com a Sofia" : "Aceitar semana toda")}</button>
                  </div>
                </div>

                {m1Stats.atividades > 0 && !m1Generating && (
                  <div
                    role="status"
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      margin: "8px 0 12px", padding: "10px 14px",
                      borderRadius: 10, border: "1px solid var(--line)",
                      background: "rgba(255,191,77,.10)", color: "var(--ink-1)",
                      fontSize: 13.5, fontWeight: 500,
                    }}
                  >
                    <Lightbulb size={16} style={{ color: "#B45309", flex: "0 0 auto" }} />
                    <span>
                      A Sofia gerou as atividades da semana. <b>Clique em cada atividade</b> para ver e ajustar os detalhes (etapas, materiais, BNCC e adaptações).
                    </span>
                  </div>
                )}
                <div className="pl-m1">
                  <div className="pl-cal-card">
                    <div className="pl-cal-head">
                      <div className="nav">
                        <button aria-label="Semana anterior" onClick={() => setWeekOffset((w) => w - 1)}><ChevronLeft size={14} /></button>
                        <div className="month" style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
                          <span>{m1Week.label}</span>
                          <small style={{ fontFamily: "'Inter',sans-serif", fontSize: 11.5, color: "var(--muted)", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>{m1Week.range}</small>
                        </div>
                        <button aria-label="Próxima semana" onClick={() => setWeekOffset((w) => w + 1)}><ChevronRight size={14} /></button>
                        {weekOffset !== 0 && (
                          <button
                            onClick={() => setWeekOffset(0)}
                            style={{ marginLeft: 6, padding: "4px 10px", borderRadius: 7, border: "1px solid var(--line)", background: "#fff", color: "var(--ink-2)", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}
                          >Hoje</button>
                        )}
                      </div>
                      <div className="stat">✨ <b>{m1Stats.atividades} sugestões</b></div>
                    </div>
                    <div className="pl-cal-grid">
                      {m1Week.days.map((day) => {
                        const todayIso = hydrated ? new Date().toISOString().slice(0, 10) : "";
                        const isToday = hydrated && day.iso === todayIso;
                        const cards = m1Plan[day.k] || [];
                        return (
                          <div
                            key={day.k}
                            data-testid="m1-day"
                            data-day-iso={day.iso}
                            data-is-today={isToday ? "true" : "false"}
                            className={"pl-cal-day" + (calSel === day.k ? " selected" : "") + (cards.length > 0 ? " has-ai" : "") + (m1DropDay === day.k ? " drop" : "")}
                            onClick={() => setCalSel(day.k)}
                            onDragOver={(e) => onM1DragOver(e, day.k)}
                            onDragLeave={onM1DragLeave}
                            onDrop={(e) => onM1Drop(e, day.k)}
                            style={isToday ? { borderColor: "var(--orange)", boxShadow: "0 0 0 2px var(--orange-soft-2)" } : undefined}
                          >
                            <div className="pl-cd-head">
                              <div>
                                <div className="dn">{day.n}</div>
                                <div className="dd">{day.d}</div>
                              </div>
                              {isToday && <span className="pl-cd-pill">hoje</span>}
                            </div>
                            {cards.length === 0 ? (
                              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 11, textAlign: "center", padding: "10px 6px" }}>
                                <span>Sem atividades.<br/>Clique em <b>Gerar com a Sofia</b>.</span>
                              </div>
                            ) : (
                              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                                {cards.map((c) => (
                                  <div
                                    key={c.id}
                                    className={"pl-ai " + c.v}
                                    draggable
                                    onDragStart={() => onM1DragStart(day.k, c.id)}
                                    onClick={(e) => { e.stopPropagation(); m1OpenEdit(day.k, c.id); }}
                                    title="Clique para abrir e editar a atividade"
                                    style={{ cursor: "pointer" }}
                                  >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                                      <div style={{ minWidth: 0 }}>
                                        <div className="sub">{c.tag}</div>
                                        <div className="tt">{c.title}</div>
                                        <div className="mn">{c.bncc} · {c.minutos}min</div>
                                        {c.motivo && (
                                          <div
                                            className="mn"
                                            style={{
                                              marginTop: 4,
                                              fontStyle: "italic",
                                              color: "var(--muted)",
                                              fontSize: 10.5,
                                              lineHeight: 1.35,
                                            }}
                                            title={c.motivo}
                                          >
                                            ✨ {c.motivo}
                                          </div>
                                        )}
                                        {c.auditoria && c.auditoria.length > 0 && (
                                          <>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setAuditOpen((s) => ({ ...s, [c.id]: !s[c.id] }));
                                              }}
                                              style={{
                                                marginTop: 4,
                                                background: "none",
                                                border: "none",
                                                padding: 0,
                                                color: "var(--orange)",
                                                fontSize: 10.5,
                                                fontWeight: 700,
                                                cursor: "pointer",
                                              }}
                                            >
                                              {auditOpen[c.id] ? "▾ Ocultar auditoria" : "▸ Auditar agrupamento"}
                                            </button>
                                            {auditOpen[c.id] && (
                                              <div
                                                style={{
                                                  marginTop: 6,
                                                  padding: "6px 8px",
                                                  background: "#FFF7ED",
                                                  border: "1px solid #FED7AA",
                                                  borderRadius: 6,
                                                  display: "flex",
                                                  flexDirection: "column",
                                                  gap: 6,
                                                  fontSize: 10.5,
                                                  lineHeight: 1.4,
                                                }}
                                              >
                                                {c.auditoria.map((a) => (
                                                  <div key={a.token}>
                                                    <div style={{ fontWeight: 700, color: "var(--ink)" }}>
                                                      {a.token}{" "}
                                                      <span style={{ color: "var(--muted)", fontWeight: 500 }}>
                                                        ({a.origens.length} competências)
                                                      </span>
                                                    </div>
                                                    <ul style={{ margin: "2px 0 0", paddingLeft: 14, color: "var(--ink-2)" }}>
                                                      {a.origens.map((o) => (
                                                        <li key={o.code}>
                                                          <b>{o.code}</b> · {o.disciplina} · {o.tag} — {o.desc}
                                                        </li>
                                                      ))}
                                                    </ul>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        aria-label="Remover"
                                        onClick={(e) => { e.stopPropagation(); removerCardM1(day.k, c.id); }}
                                        style={{ color: "var(--muted)", padding: 2, borderRadius: 4, background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
                                      ><X size={11} /></button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openDayModal(day); }}
                              style={{ marginTop: "auto", border: "1px dashed var(--line)", background: "#fff", color: "var(--orange)", fontWeight: 700, fontSize: 11.5, padding: "6px 8px", borderRadius: 8, cursor: "pointer" }}
                            >+ Atividade</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <aside className="pl-side">
                    <div className="pl-panel accent">
                      <h3>Parâmetros da geração</h3>
                      <p className="lead">Ajuste e regenere se quiser outra direção.</p>
                      <div className="pl-field">
                        <label>Tema do mês</label>
                        <input
                          className="pl-input"
                          placeholder="Ex.: Listas e contagem"
                          value={m1Tema}
                          onChange={(e) => setM1Tema(e.target.value)}
                        />
                      </div>
                      <div className="pl-field">
                        <label>Foco da semana</label>
                        <div className="pl-pills">
                          {FOCO_OPTS.map((p) => (
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
                      <div className="pl-field">
                        <label>Focos por geração</label>
                        <div className="pl-pills">
                          {([1, 2, 3, "all"] as const).map((p) => (
                            <button
                              key={String(p)}
                              className={"pl-pill" + (m1MaxFocos === p ? " on" : "")}
                              onClick={() => setM1MaxFocos(p)}
                              title={p === "all" ? "Usa todos os focos selecionados" : `Sofia usa só ${p} foco(s) por geração`}
                            >{p === "all" ? "Todos" : `${p} foco${p === 1 ? "" : "s"}`}</button>
                          ))}
                        </div>
                        <p className="lead" style={{ margin: "6px 0 0" }}>
                          {m1MaxFocos === "all"
                            ? `Sofia vai usar os ${focosSelecionados.length} foco(s) marcados.`
                            : `Sofia vai pegar os primeiros ${Math.min(m1MaxFocos, focosSelecionados.length || m1MaxFocos)} foco(s) marcados — menos sugestões por dia, mais profundidade.`}
                        </p>
                      </div>
                      <div
                        style={{
                          marginTop: 12,
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid #FED7C4",
                          background: "#fff",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                        aria-live="polite"
                      >
                        <Sparkles size={16} color="var(--orange)" />
                        <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.4 }}>
                          {m1Preview.focosCount === 0 ? (
                            <>Selecione ao menos <b>1 foco</b> para a Sofia gerar.</>
                          ) : (
                            <>
                              Prévia: <b>{m1Preview.perDay}</b>{" "}
                              {m1Preview.perDay === 1 ? "atividade" : "atividades"} por dia ·{" "}
                              <b>{m1Preview.total}</b> na semana
                              <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 2 }}>
                                {m1Preview.focosCount} foco{m1Preview.focosCount === 1 ? "" : "s"} ativo{m1Preview.focosCount === 1 ? "" : "s"} · intensidade {pillsInt.toLowerCase()}
                              </div>
                              <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 2 }}>
                                ~<b style={{ color: "var(--ink-2)" }}>{m1Preview.mediaMin} min</b> por atividade ·{" "}
                                ~<b style={{ color: "var(--ink-2)" }}>{m1Preview.minPorDia} min/dia</b> ·{" "}
                                ~<b style={{ color: "var(--ink-2)" }}>
                                  {Math.floor(m1Preview.totalMin / 60)}h{(m1Preview.totalMin % 60).toString().padStart(2, "0")}
                                </b> na semana
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        className="pl-btn primary pl-replica-cta"
                        onClick={gerarComSofia}
                        disabled={m1Generating}
                      ><Sparkles size={14} /> {m1Generating ? "Sofia montando…" : "Gerar com esses parâmetros"}</button>
                    </div>

                    <div className="pl-panel">
                      <h3>O que Sofia considerou</h3>
                      <div className="pl-stats">
                        <div className="pl-stat-box"><div className="v">{m1Stats.atividades}</div><div className="l">Atividades</div></div>
                        <div className="pl-stat-box"><div className="v">{m1Stats.habilidades}</div><div className="l">Habilidades BNCC</div></div>
                        <div className="pl-stat-box"><div className="v">{focosSelecionados.length}</div><div className="l">Focos ativos</div></div>
                        <div className="pl-stat-box"><div className="v">{pillsInt[0]}</div><div className="l">Intensidade</div></div>
                      </div>
                      {m1Stats.atividades === 0 && (
                        <p className="lead" style={{ marginTop: 10 }}>Defina <b>tema</b> e <b>focos</b> ao lado e clique em <b>Gerar com a Sofia</b>.</p>
                      )}
                    </div>
                  </aside>
                </div>
              </>
            )}

            {m === "m2" && (
              <>
                <div className="pl-tools">
                  <div><h2>Cadeia da semana <small>· selecione disciplina e turma</small></h2></div>
                  <div className="right">
                    <button className="pl-btn"><BookOpen size={14} /> Habilidades</button>
                    <button className="pl-btn" onClick={reordenarSequencia} title="Reorganiza as etapas existentes na ordem Introdução → Síntese, preservando todos os blocos."><ArrowDownUp size={14} /> Reordenar na ordem completa</button>
                    {m2ReorderBackup && (
                      <button className="pl-btn" onClick={desfazerReordenacao} title="Restaura a sequência anterior à última reordenação."><RefreshCw size={14} /> Desfazer reordenação</button>
                    )}
                    <button className="pl-btn primary" onClick={sugerirProxima}><Link2 size={14} /> Conectar próxima aula</button>
                  </div>
                </div>
                {m2Total > 0 && (
                  <div style={{ marginTop: 12, padding: 14, border: "1px solid var(--line)", borderRadius: 12, background: "#fff", display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <strong style={{ fontSize: 13.5 }}>
                          Etapa {Math.min(m2CurIdx + 1, m2Total)} de {m2Total}
                          {m2CurIdx >= m2Total && " · concluída 🎉"}
                        </strong>
                        <span style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          {m2DoneCount} {m2DoneCount === 1 ? "etapa concluída" : "etapas concluídas"} · {m2Pct}%
                          {m2SavedAt && (
                            <span
                              aria-live="polite"
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                padding: "2px 8px", borderRadius: 99,
                                background: m2JustSaved ? "rgba(22,163,74,.12)" : "rgba(148,163,184,.14)",
                                color: m2JustSaved ? "#16a34a" : "var(--muted)",
                                fontSize: 11, fontWeight: 600,
                                transition: "background .25s, color .25s",
                              }}
                              title={`Última gravação: ${new Date(m2SavedAt).toLocaleTimeString()}`}
                            >
                              <Check size={11} /> {m2JustSaved ? "Salvo automaticamente" : "Salvo"}
                            </span>
                          )}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button className="pl-btn" onClick={reiniciarProgresso} title="Reinicia o progresso para a etapa 1."><RefreshCw size={14} /> Reiniciar</button>
                        <button className="pl-btn" onClick={imprimirSequencia}><BookOpen size={14} /> Imprimir sequência</button>
                        <button className="pl-btn primary" onClick={avancarEtapa} disabled={m2CurIdx >= m2Total}><ArrowRight size={14} /> Próxima etapa</button>
                      </div>
                    </div>
                    <div style={{ height: 8, background: "#EEF1F6", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ width: `${m2Pct}%`, height: "100%", background: "linear-gradient(90deg, var(--primary, #F97316), #FB923C)", transition: "width .35s ease" }} />
                    </div>
                  </div>
                )}
                <div className="pl-chain" id="m2-cadeia" style={{ scrollMarginTop: 96 }}>
                  <div className="pl-chain-card">
                    <h3 style={{ fontSize: 16 }}>Sequência didática</h3>
                    {/* Formulário de adição */}
                    <div style={{ marginTop: 12, padding: 12, border: "1px solid var(--line)", borderRadius: 11, background: "#FAFBFD", display: "grid", gridTemplateColumns: "90px 150px 1fr", gap: 8, alignItems: "center" }}>
                      <select
                        value={m2Form.d}
                        onChange={(e) => setM2Form((f) => ({ ...f, d: e.target.value }))}
                        style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff", fontSize: 12.5, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}
                      >
                        {M2_DAY_OPTS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select
                        value={m2Form.tag}
                        onChange={(e) => setM2Form((f) => ({ ...f, tag: e.target.value }))}
                        style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff", fontSize: 12.5 }}
                      >
                        {M2_TAG_OPTS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input
                        value={m2Form.t}
                        onChange={(e) => setM2Form((f) => ({ ...f, t: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addM2Step(); } }}
                        placeholder="Título da aula (ex: Introdução à adição com material concreto)"
                        style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12.5, fontFamily: "inherit" }}
                      />
                      <select
                        value={m2Form.p}
                        onChange={(e) => setM2Form((f) => ({ ...f, p: e.target.value }))}
                        style={{ gridColumn: "1 / span 2", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff", fontSize: 12 }}
                      >
                        {M2_BNCC_OPTS.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                      <button className="pl-btn primary" onClick={addM2Step} style={{ justifySelf: "stretch" }}>
                        <Plus size={14} /> Adicionar à cadeia
                      </button>
                    </div>

                    {m2Steps.length === 0 ? (
                      <div style={{ marginTop: 12 }}>
                        <EmptyState
                          icon="🔗"
                          title="Sem sequência montada ainda."
                          description="Adicione a primeira aula acima — a Sofia conecta as próximas em cadeia, preservando objetivo e BNCC."
                        />
                      </div>
                    ) : (
                      <div className="pl-chain-list" style={{ marginTop: 12 }}>
                        {m2Steps.map((s, idx) => {
                          const editing = m2EditId === s.id;
                          const isOver = m2DragOverId === s.id && m2DraggingId !== s.id;
                          const showPhBefore = isOver && m2DragPos === "before";
                          const showPhAfter = isOver && m2DragPos === "after";
                          const status: "done" | "current" | "future" =
                            idx < m2CurIdx ? "done" : idx === m2CurIdx ? "current" : "future";
                          return (
                          <React.Fragment key={s.id}>
                            {showPhBefore && <div className="pl-drop-ph" aria-hidden="true" />}
                            <div
                              className={
                                "pl-step"
                                + (s.suggest ? " suggest" : "")
                                + (m2DraggingId === s.id ? " dragging" : "")
                                + (isOver ? " drop-target" : "")
                              }
                              onDragOver={(e) => onM2DragOver(e, s.id)}
                              onDrop={(e) => onM2Drop(e, s.id)}
                              style={
                                status === "done"
                                  ? { opacity: 0.55 }
                                  : status === "current"
                                  ? { borderColor: "var(--primary, #F97316)", borderWidth: 2, boxShadow: "0 0 0 3px rgba(249,115,22,.12)" }
                                  : undefined
                              }
                            >
                              <div
                                className="day"
                                draggable={!editing}
                                onDragStart={(e) => onM2DragStart(e, s.id)}
                                onDragEnd={onM2DragEnd}
                                title="Arraste para reordenar"
                                style={{ cursor: editing ? "default" : "grab", userSelect: "none", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}
                              >
                                <input
                                  type="checkbox"
                                  checked={m2SelIds.size === 0 ? true : m2SelIds.has(s.id)}
                                  onChange={() => m2ToggleSel(s.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  title="Incluir na impressão"
                                  style={{ width: 12, height: 12, accentColor: "var(--primary, #F97316)", cursor: "pointer" }}
                                />
                                {!editing && <GripVertical size={11} style={{ opacity: .55 }} />}
                                {s.d}
                              </div>
                              <div className="body">
                                {editing ? (
                                  <div style={{ display: "grid", gap: 8 }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 8 }}>
                                      <select
                                        value={s.d}
                                        onChange={(e) => updateStep(s.id, { d: e.target.value })}
                                        style={{ padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff", fontSize: 12, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}
                                      >
                                        {M2_DAY_OPTS.map((d) => <option key={d} value={d}>{d}</option>)}
                                      </select>
                                      <select
                                        value={s.tag}
                                        onChange={(e) => updateStep(s.id, { tag: e.target.value })}
                                        style={{ padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff", fontSize: 12 }}
                                      >
                                        {M2_TAG_OPTS.map((t) => <option key={t} value={t}>{t}</option>)}
                                      </select>
                                    </div>
                                    <input
                                      value={s.t}
                                      onChange={(e) => updateStep(s.id, { t: e.target.value })}
                                      placeholder="Título da aula"
                                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }}
                                    />
                                    <select
                                      value={s.p}
                                      onChange={(e) => updateStep(s.id, { p: e.target.value })}
                                      style={{ padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff", fontSize: 12 }}
                                    >
                                      {M2_BNCC_OPTS.map((b) => <option key={b} value={b}>{b}</option>)}
                                      {!M2_BNCC_OPTS.includes(s.p as typeof M2_BNCC_OPTS[number]) && (
                                        <option value={s.p}>{s.p}</option>
                                      )}
                                    </select>
                                    <div style={{ display: "flex", gap: 6 }}>
                                      <button className="pl-btn primary" onClick={() => { setM2EditId(null); showToast("Aula atualizada. ✓"); }} style={{ padding: "5px 10px", fontSize: 11.5 }}>
                                        <Check size={12} /> Concluir
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="tag" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      {status === "done" && <Check size={12} style={{ color: "#16a34a" }} />}
                                      {status === "current" && <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: "var(--primary, #F97316)" }} />}
                                      <span>{s.tag}{s.suggest ? " · sugestão Sofia" : ""}</span>
                                      {status === "current" && <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--primary, #F97316)", letterSpacing: .3 }}>· EM ANDAMENTO</span>}
                                      {status === "done" && <span style={{ fontSize: 10.5, fontWeight: 700, color: "#16a34a", letterSpacing: .3 }}>· CONCLUÍDA</span>}
                                    </div>
                                    <div className="ttl" style={status === "done" ? { textDecoration: "line-through" } : undefined}>{s.t}</div>
                                    <div className="meta">
                                      <span className="pill">{s.p}</span>
                                      {s.suggest && (
                                        <button className="pl-btn primary" onClick={() => aceitarSugestao(s.id)} style={{ padding: "5px 10px", fontSize: 11.5 }}>
                                          <Check size={12} /> Aceitar
                                        </button>
                                      )}
                                      <button className="pl-btn" onClick={() => setM2EditId(s.id)} style={{ padding: "5px 10px", fontSize: 11.5 }}>
                                        ✏️ Editar
                                      </button>
                                      <button className="pl-btn ghost" onClick={() => removerStep(s.id)} style={{ padding: "5px 10px", fontSize: 11.5 }}>
                                        <X size={12} /> Remover
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                            {showPhAfter && <div className="pl-drop-ph" aria-hidden="true" />}
                          </React.Fragment>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <aside className="pl-side">
                    <div className="pl-panel">
                      <h3><Link2 size={14} /> Por que essa sequência?</h3>
                      {m2Steps.length === 0 ? (
                        <p className="lead">Quando você cadastrar aulas, a Sofia explica aqui por que conecta cada atividade na ordem proposta.</p>
                      ) : (
                        <p className="lead">
                          Sofia organiza <strong>{m2Steps.length}</strong> {m2Steps.length === 1 ? "aula" : "aulas"} respeitando uma escada de complexidade: <em>introdução → desenvolvimento → aprofundamento → avaliação</em>. As sugestões em laranja são propostas automáticas — aceite, edite ou remova.
                        </p>
                      )}
                    </div>
                    <div className="pl-panel" id="m2-habilidades" style={{ marginTop: 12, scrollMarginTop: 96 }}>
                      <h3><BookOpen size={14} /> Habilidades cobertas</h3>
                      {m2Steps.length === 0 ? (
                        <p className="lead">Nenhuma habilidade BNCC mapeada ainda.</p>
                      ) : (
                        <div className="pl-bncc">
                          {Array.from(new Set(m2Steps.map((s) => s.p))).map((b) => (
                            <div key={b} className="pl-bncc-item">
                              <span className="code">{b.split(" — ")[0]}</span>
                              <span className="desc">{b.split(" — ")[1] ?? b}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </aside>
                </div>
              </>
            )}

            {m === "m3" && (
              <>
                <div className="pl-tools">
                  <div><h2>Editar com Sofia <small>· {m3Plan.titulo}</small></h2></div>
                  <div className="right">
                    <button className="pl-btn" onClick={restaurarPlanoOriginal}><RefreshCw size={14} /> Restaurar original</button>
                    <button className="pl-btn primary" onClick={() => showToast("Alterações salvas. ✓")}><Check size={14} /> Salvar alterações</button>
                  </div>
                </div>
                <div className="pl-chat">
                  <div className="pl-chat-card">
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 360, minHeight: 240, overflowY: "auto", padding: 4 }}>
                      {chatLog.map((m, i) => (
                        <div key={i} className={"pl-msg " + m.from}>
                          <div className="av">{m.from === "user" ? "P" : "S"}</div>
                          <div className="bub">{m.t}</div>
                        </div>
                      ))}
                      {m3Loading && (
                        <div className="pl-msg sofia" aria-live="polite">
                          <div className="av">S</div>
                          <div className="bub" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontStyle: "italic", color: "var(--muted)" }}>
                            <span className="pl-typing" style={{ display: "inline-flex", gap: 3 }}>
                              <span style={{ width: 6, height: 6, borderRadius: 99, background: "currentColor", opacity: .4, animation: "pl-blink 1s infinite" }} />
                              <span style={{ width: 6, height: 6, borderRadius: 99, background: "currentColor", opacity: .4, animation: "pl-blink 1s infinite .15s" }} />
                              <span style={{ width: 6, height: 6, borderRadius: 99, background: "currentColor", opacity: .4, animation: "pl-blink 1s infinite .3s" }} />
                            </span>
                            Sofia está editando…
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pl-quickies">
                      {["Encurtar pra 30 min", "Adicionar roda de fechamento", "Adaptar pra Júlia (TEA)", "Trocar dupla por individual", "Mais lúdica"].map((q) => (
                        <button key={q} onClick={() => setChatTxt(q)} disabled={m3Loading}>{q}</button>
                      ))}
                    </div>

                    <form className="pl-chat-input" onSubmit={(e) => { e.preventDefault(); sendChat(); }}>
                      <input value={chatTxt} onChange={(e) => setChatTxt(e.target.value)} placeholder="Diga o que mudar... (ex: 'encurta pra 30 min')" disabled={m3Loading} />
                      <button type="submit" disabled={m3Loading || !chatTxt.trim()}><Send size={12} /> {m3Loading ? "Editando…" : "Enviar"}</button>
                    </form>
                  </div>

                  <aside className="pl-side">
                    <div className="pl-panel accent">
                      <h3><MessageSquare size={14} /> Plano atual</h3>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{m3Plan.titulo}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, color: "var(--muted)", fontSize: 12 }}>
                        <Clock size={12} /> Duração total: <strong style={{ color: "var(--ink, #0F172A)" }}>{m3Plan.duracaoMin} min</strong>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        {m3Plan.bncc.map((b) => (
                          <span key={b} style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: "rgba(59,130,246,.12)", color: "#1d4ed8", fontFamily: "'JetBrains Mono',monospace" }}>{b}</span>
                        ))}
                      </div>
                    </div>
                    <div className="pl-panel" style={{ marginTop: 12 }}>
                      <h3><Layers size={14} /> Etapas ({m3Plan.etapas.length})</h3>
                      <ol style={{ paddingLeft: 18, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                        {m3Plan.etapas.map((e) => (
                          <li key={e.id} className={e.novo ? "pl-novo" : undefined} style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span>{e.titulo}</span>
                            <span style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>· {e.min} min</span>
                            {e.novo && <span className="pl-badge-novo" style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 99, background: "rgba(249,115,22,.15)", color: "#c2410c", letterSpacing: .3 }}>NOVO</span>}
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div className="pl-panel" style={{ marginTop: 12 }}>
                      <h3>♿ Adaptações ({m3Plan.adaptacoes.length})</h3>
                      {m3Plan.adaptacoes.length === 0 ? (
                        <p className="lead" style={{ fontSize: 12 }}>Nenhuma adaptação registrada. Peça à Sofia, ex: "adapta pra Júlia (TEA)".</p>
                      ) : (
                        <ul style={{ paddingLeft: 0, listStyle: "none", margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                          {m3Plan.adaptacoes.map((a) => (
                            <li key={a.id} className={a.novo ? "pl-novo" : undefined} style={{ fontSize: 12.5, padding: 8, border: "1px solid var(--line)", borderRadius: 8, background: "#FAFBFD" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                <strong>{a.aluno}</strong>
                                {a.novo && <span className="pl-badge-novo" style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 99, background: "rgba(249,115,22,.15)", color: "#c2410c", letterSpacing: .3 }}>NOVO</span>}
                              </div>
                              <div style={{ color: "var(--muted)" }}>{a.texto}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </aside>
                </div>
              </>
            )}

            {m === "m4" && (
              <>
                <div className="pl-tools">
                  <div><h2>{m4Label} <small>· {Object.values(layers).filter(Boolean).length} camada(s) ativa(s)</small></h2></div>
                  <div className="right">
                    <button className="pl-btn ghost" onClick={() => m4ChangeMonth(-1)}><ChevronLeft size={14} /> Anterior</button>
                    <button className="pl-btn ghost" onClick={() => { const n = new Date(); setM4Month({ y: n.getFullYear(), m: n.getMonth() }); setM4SelectedDay(n.getDate()); }}>Hoje</button>
                    <button className="pl-btn ghost" onClick={() => m4ChangeMonth(1)}>Próximo <ChevronRight size={14} /></button>
                    <button className="pl-btn" onClick={m4Print} title="Imprimir calendário"><Printer size={14} /> Imprimir</button>
                  </div>
                </div>
                <div className="pl-layers-bar">
                  {([
                    { k: "aulas", l: "📚 Aulas" },
                    { k: "aval", l: "📝 Avaliações" },
                    { k: "eventos", l: "🏫 Eventos da escola" },
                    { k: "feriados", l: "🎉 Feriados" },
                    { k: "bncc", l: "🎯 Habilidades BNCC" },
                    { k: "sofia", l: "✨ Sugestões Sofia" },
                  ] as const).map((x) => (
                    <button key={x.k} className={"pl-lay" + (layers[x.k] ? " on" : "")} onClick={() => toggleLayer(x.k)} aria-pressed={layers[x.k]}>
                      {layers[x.k] ? <Check size={12} /> : <Layers size={12} />} {x.l}
                    </button>
                  ))}
                </div>
                <div ref={m4PrintRef} style={{ marginTop: 12, padding: 12, background: "#fff", border: "1px solid var(--line)", borderRadius: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                      <div key={d} style={{ fontSize: 11, fontWeight: 700, letterSpacing: .4, textTransform: "uppercase", color: "var(--muted)", textAlign: "center", padding: "6px 0" }}>{d}</div>
                    ))}
                    {m4Grid.map((cell, i) => {
                      const userEvts = cell.day ? (m4UserByDay[cell.day] ?? []).filter((e) => layers[e.cat]) : [];
                      const baseEvts = cell.day ? (M4_EVENTS_BY_DAY[cell.day] ?? []).filter((e) => layers[e.cat]) : [];
                      const evts = [...baseEvts, ...userEvts];
                      const isSel = cell.day != null && cell.day === m4SelectedDay;
                      const isEmpty = cell.day == null;
                      const isDropTarget = !isEmpty && m4DragOver === cell.day;
                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={isEmpty}
                          onClick={() => cell.day && evts.length > 0 && setM4SelectedDay(m4SelectedDay === cell.day ? null : cell.day)}
                          onDragOver={(e) => { if (!isEmpty && m4DragSrc) { e.preventDefault(); if (m4DragOver !== cell.day) setM4DragOver(cell.day!); } }}
                          onDragLeave={() => { if (m4DragOver === cell.day) setM4DragOver(null); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setM4DragOver(null);
                            if (!cell.day || !m4DragSrc) return;
                            m4MoveEvent(m4DragSrc.iso, m4DragSrc.id, m4IsoFor(cell.day));
                            setM4DragSrc(null);
                          }}
                          style={{
                            position: "relative",
                            minHeight: 78,
                            padding: 6,
                            border: isDropTarget ? "2px dashed #F97316" : isSel ? "2px solid var(--orange, #F97316)" : "1px solid var(--line)",
                            borderRadius: 8,
                            background: isEmpty ? "#FAFBFD" : isDropTarget ? "#FFF7ED" : "#fff",
                            textAlign: "left",
                            cursor: !isEmpty && evts.length > 0 ? "pointer" : "default",
                            opacity: isEmpty ? .4 : 1,
                            display: "flex", flexDirection: "column", gap: 4,
                          }}
                        >
                          {cell.day && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>{cell.day}</span>
                          )}
                          <div style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
                            {userEvts.slice(0, 3).map((e) => (
                              <span
                                key={e.id}
                                draggable
                                onDragStart={(ev) => { ev.stopPropagation(); setM4DragSrc({ iso: e.iso, id: e.id }); }}
                                onDragEnd={() => { setM4DragSrc(null); setM4DragOver(null); }}
                                onClick={(ev) => { ev.stopPropagation(); setM4SelectedDay(cell.day!); setM4Editing({ iso: e.iso, id: e.id }); }}
                                title={`${M4_CAT_META[e.cat].label}: ${e.title} — arraste para mover`}
                                style={{
                                  display: "flex", alignItems: "center", gap: 4,
                                  padding: "2px 4px", borderRadius: 4,
                                  background: M4_CAT_META[e.cat].color + "22",
                                  borderLeft: `3px solid ${M4_CAT_META[e.cat].color}`,
                                  fontSize: 10, color: "#1f2937", lineHeight: 1.2,
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                  cursor: "grab",
                                }}
                              >
                                {e.title}
                              </span>
                            ))}
                            {(userEvts.length > 3 || baseEvts.length > 0) && (
                              <span style={{ fontSize: 9, color: "var(--muted)" }}>
                                {userEvts.length > 3 ? `+${userEvts.length - 3}` : ""}{baseEvts.length > 0 ? ` ${baseEvts.length} sistema` : ""}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {m4SelectedDay && (() => {
                    const baseEvts = (M4_EVENTS_BY_DAY[m4SelectedDay] ?? []).filter((e) => layers[e.cat]);
                    const userEvts = (m4UserByDay[m4SelectedDay] ?? []).filter((e) => layers[e.cat]);
                    const total = baseEvts.length + userEvts.length;
                    return (
                      <div style={{ marginTop: 12, padding: 12, border: "1px solid var(--line)", borderRadius: 10, background: "#FAFBFD" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <strong style={{ fontSize: 13 }}>📍 Dia {m4SelectedDay} de {m4Label} · {total} {total === 1 ? "evento" : "eventos"}</strong>
                          <button onClick={() => { setM4SelectedDay(null); setM4Editing(null); }} aria-label="Fechar" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}><X size={14} /></button>
                        </div>
                        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                          {baseEvts.map((e, j) => (
                            <li key={`b${j}`} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                              <span style={{ width: 10, height: 10, borderRadius: 99, background: M4_CAT_META[e.cat].color, flexShrink: 0 }} />
                              <strong>{e.title}</strong>
                              {e.meta && <span style={{ color: "var(--muted)" }}>· {e.meta}</span>}
                            </li>
                          ))}
                          {userEvts.map((e) => {
                            const editing = m4Editing?.id === e.id && m4Editing?.iso === e.iso;
                            return (
                              <li key={e.id} style={{ display: "flex", flexDirection: "column", gap: 6, padding: 8, background: "#fff", border: "1px solid var(--line)", borderRadius: 8 }}>
                                {editing ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                      <select value={e.cat} onChange={(ev) => m4UpdateEvent(e.iso, e.id, { cat: ev.target.value as M4Cat })} style={{ fontSize: 12, padding: "4px 6px", border: "1px solid var(--line)", borderRadius: 6 }}>
                                        {(Object.keys(M4_CAT_META) as M4Cat[]).map((c) => (
                                          <option key={c} value={c}>{M4_CAT_META[c].label}</option>
                                        ))}
                                      </select>
                                      <input type="date" value={e.iso} onChange={(ev) => { if (ev.target.value && ev.target.value !== e.iso) m4MoveEvent(e.iso, e.id, ev.target.value); }} style={{ fontSize: 12, padding: "4px 6px", border: "1px solid var(--line)", borderRadius: 6 }} />
                                    </div>
                                    <input value={e.title} onChange={(ev) => m4UpdateEvent(e.iso, e.id, { title: ev.target.value })} placeholder="Título" style={{ fontSize: 12.5, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 6, fontWeight: 600 }} />
                                    <input value={e.meta ?? ""} onChange={(ev) => m4UpdateEvent(e.iso, e.id, { meta: ev.target.value })} placeholder="Detalhes (turma, horário…)" style={{ fontSize: 12, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 6 }} />
                                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                      <button onClick={() => { if (confirm("Excluir este evento?")) { m4DeleteEvent(e.iso, e.id); setM4Editing(null); } }} style={{ fontSize: 11, padding: "4px 8px", border: "1px solid #FCA5A5", color: "#B91C1C", background: "#fff", borderRadius: 6, cursor: "pointer" }}>Excluir</button>
                                      <button onClick={() => setM4Editing(null)} style={{ fontSize: 11, padding: "4px 8px", border: "1px solid var(--line)", background: "#fff", borderRadius: 6, cursor: "pointer" }}>Concluir</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                                    <span style={{ width: 10, height: 10, borderRadius: 99, background: M4_CAT_META[e.cat].color, flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <strong>{e.title}</strong>
                                      {e.meta && <span style={{ color: "var(--muted)" }}> · {e.meta}</span>}
                                      <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>
                                        {M4_CAT_META[e.cat].label}
                                        {e.source === "m3" && <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 99, background: "rgba(255,122,69,.15)", color: "#9A3412", fontWeight: 700, letterSpacing: ".04em" }}>M3 · Sofia</span>}
                                        {e.source === "atv" && <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 99, background: "rgba(59,130,246,.15)", color: "#1d4ed8", fontWeight: 700, letterSpacing: ".04em" }}>M1 · Atividade</span>}
                                        {e.source === "pcd" && <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 99, background: "rgba(16,185,129,.15)", color: "#047857", fontWeight: 700, letterSpacing: ".04em" }}>M2 · PCD</span>}
                                      </div>
                                    </div>
                                    {e.source === "m3" && e.m3Dia && e.m3CardId ? (
                                      <button
                                        onClick={() => { setM("m1"); m1OpenEdit(e.m3Dia!, e.m3CardId!); }}
                                        style={{ fontSize: 11, padding: "4px 8px", border: "1px solid var(--orange, #F97316)", background: "var(--orange, #F97316)", color: "#fff", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
                                      >
                                        Abrir no M3
                                      </button>
                                    ) : (
                                      <button onClick={() => setM4Editing({ iso: e.iso, id: e.id })} style={{ fontSize: 11, padding: "4px 8px", border: "1px solid var(--line)", background: "#fff", borderRadius: 6, cursor: "pointer" }}>Editar</button>
                                    )}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                          {total === 0 && (
                            <li style={{ fontSize: 12, color: "var(--muted)" }}>Nenhum evento neste dia.</li>
                          )}
                        </ul>
                        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>💡 Arraste qualquer evento entre os dias para reagendá-lo.</p>
                      </div>
                    );
                  })()}
                </div>
                <div className="pl-legend">
                  <span className="it"><span className="sw" style={{ background: "#3B82F6" }} /> Aulas</span>
                  <span className="it"><span className="sw" style={{ background: "#F59E0B" }} /> Avaliações</span>
                  <span className="it"><span className="sw" style={{ background: "#10B981" }} /> Eventos da escola</span>
                  <span className="it"><span className="sw" style={{ background: "#EF4444" }} /> Feriados</span>
                  <span className="it"><span className="sw" style={{ background: "#06B6D4" }} /> BNCC</span>
                  <span className="it"><span className="sw" style={{ background: "#FF7A45" }} /> Sugestões Sofia</span>
                </div>
              </>
            )}

            {m === "atv" && (
              <PlanoAtividadeEditor modo="regular" />
            )}

            {m === "pcd" && (
              <PlanoAtividadeEditor modo="pcd" />
            )}

            {m === "trilhas" && (
              <TrilhasPanel />
            )}

            {m === "m6" && (
              <>
                <div className="pl-tools">
                  <div>
                    <h2>{isEi ? "Diário de observação" : "Diário de bordo"} <small>· registro de 30 segundos</small></h2>
                  </div>
                  <div className="right">
                    <button className="pl-btn" onClick={() => { setM6Reminder(true); showToast("✓ Você será lembrada todo dia às 18h."); }}>
                      <Clock size={14} /> {m6Reminder ? "Lembrete ativo" : "Ativar lembrete"}
                    </button>
                    <button className="pl-btn primary" onClick={() => setM6ReportOpen(true)}>
                      <Sparkles size={14} /> Ver relatório {M6_PERIODO_META[m6Periodo].label.toLowerCase()}
                    </button>
                  </div>
                </div>
                <div className="pl-d6">
                  <div className="pl-d6-card" ref={m6FormRef}>
                    <h3 style={{ fontSize: 15, marginBottom: 4 }}>{m6EditingId ? "Editando registro" : "Como foi a aula?"}</h3>
                    <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                      {m6EditingId ? "Ajuste os campos e salve as alterações." : "Selecione um humor, anote algo e marque tags."}
                    </p>
                    <div className="pl-d6-emojis">
                      {M6_EMOJIS.map((e) => (
                        <button key={e} className={m6Emoji === e ? "on" : ""} onClick={() => setM6Emoji(e)} aria-label={`Humor ${e}`}>{e}</button>
                      ))}
                    </div>
                    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11.5, color: "var(--muted)", fontWeight: 600, marginBottom: 8 }}>
                      <span><Sparkles size={12} style={{ verticalAlign: "-2px", color: "var(--orange)" }} /> Sobre qual atividade da Sofia? <span style={{ fontWeight: 400 }}>(opcional)</span></span>
                      <select
                        value={m6AtividadeId}
                        onChange={(e) => setM6AtividadeId(e.target.value)}
                        style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "#fff", fontSize: 13, color: "var(--ink)" }}
                      >
                        <option value="">— Registro geral da aula —</option>
                        {m6AtividadesDaTurma.length === 0 ? (
                          <option disabled>Nenhuma atividade gerada ainda{m5Turma ? ` para ${m5Turma}` : ""}</option>
                        ) : (
                          m6AtividadesDaTurma.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.modo === "pcd" ? "PCD · " : ""}{a.titulo}{a.turma ? ` · ${a.turma}` : ""}
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                    <textarea
                      className="pl-d6-textarea"
                      placeholder="O que funcionou? O que travou? Algo a destacar…"
                      value={m6Text}
                      onChange={(e) => setM6Text(e.target.value)}
                    />
                    {m6Emoji && M6_QUICK_BY_EMOJI[m6Emoji] && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => setM6QuickOpen((v) => !v)}
                          aria-expanded={m6QuickOpen}
                          style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer", fontSize: 11.5, color: "var(--muted)", fontWeight: 600, marginRight: 4 }}
                        >
                          <Sparkles size={12} style={{ verticalAlign: "-2px" }} /> Sugestões rápidas {m6QuickOpen ? "▾" : "▸"}
                        </button>
                        {m6QuickOpen && M6_QUICK_BY_EMOJI[m6Emoji].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => m6AddQuickText(s)}
                            style={{ background: "#FFF7ED", border: "1px solid #FED7AA", color: "#7C2D12", borderRadius: 99, padding: "4px 10px", fontSize: 11.5, cursor: "pointer", fontWeight: 500 }}
                          >
                            + {s}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="pl-d6-tags">
                      {M6_TAGS.map((t) => (
                        <button key={t} className={m6Tags.includes(t) ? "on" : ""} onClick={() => m6ToggleTag(t)}>{t}</button>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                      {m6EditingId && (
                        <button className="pl-btn ghost" onClick={m6ResetForm}>Cancelar</button>
                      )}
                      <button className="pl-btn primary" onClick={m6Save}>
                        <Check size={14} /> {m6EditingId ? "Salvar alterações" : "Salvar diário"}
                      </button>
                    </div>

                    {m6JustSaved && (
                      <div
                        role="status"
                        aria-live="polite"
                        style={{
                          marginTop: 12,
                          padding: 14,
                          borderRadius: 12,
                          background: "linear-gradient(180deg, #FFF7ED 0%, #FFFBF5 100%)",
                          border: "1px solid #FED7AA",
                          display: "grid",
                          gap: 10,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, color: "var(--orange-2)", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace" }}>
                            <Sparkles size={12} style={{ verticalAlign: "-2px" }} /> Sofia entendeu
                          </span>
                          {m6JustSaved.sinais.map((s) => (
                            <span key={s} style={{ background: "#fff", border: "1px solid #FDBA74", color: "#9A3412", borderRadius: 99, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                              {s}
                            </span>
                          ))}
                        </div>
                        <p style={{ fontSize: 13, color: "#7A2E0A", margin: 0, lineHeight: 1.5 }}>
                          {m6JustSaved.resumo}
                        </p>
                        <div style={{ display: "grid", gap: 6, padding: 10, background: "#fff", borderRadius: 8, border: "1px solid #FED7AA" }}>
                          <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>Ajuste sugerido para a próxima aula</div>
                          <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{m6JustSaved.ajuste}</div>
                          <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600, marginTop: 4 }}>Abertura</div>
                          <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{m6JustSaved.abertura}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                          <button className="pl-btn ghost" onClick={() => setM6JustSaved(null)}>Agora não</button>
                          <button className="pl-btn primary" onClick={m6IrParaProxima}>
                            <ArrowRight size={14} /> Aplicar na próxima aula
                          </button>
                        </div>
                      </div>
                    )}

                    <h3 style={{ fontSize: 15, margin: "20px 0 10px" }}>Histórico de registros</h3>
                    {m6HasFilter && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: 6,
                          padding: "8px 10px",
                          marginBottom: 10,
                          borderRadius: 10,
                          background: "#FFF7ED",
                          border: "1px solid #FED7AA",
                          fontSize: 12,
                          color: "#9A3412",
                        }}
                      >
                         <strong style={{ marginRight: 4 }}>Filtrando por:</strong>
                         {m6FilterTag && (
                           <span data-testid="m6-filter-tag" style={{ background: "#fff", border: "1px solid #FDBA74", borderRadius: 99, padding: "2px 8px" }}>
                            tag · {m6FilterTag}
                          </span>
                        )}
                        {m6FilterTurma && (
                          <span data-testid="m6-filter-turma" style={{ background: "#fff", border: "1px solid #FDBA74", borderRadius: 99, padding: "2px 8px" }}>
                            turma · {m6FilterTurma}
                          </span>
                        )}
                        {m6FilterAluno && (
                          <span data-testid="m6-filter-aluno" style={{ background: "#fff", border: "1px solid #FDBA74", borderRadius: 99, padding: "2px 8px" }}>
                            aluno · {m6FilterAluno}
                          </span>
                        )}
                        <span data-testid="m6-filter-count" style={{ marginLeft: "auto", color: "#7C2D12" }}>
                          {m6FilteredEntries.length} de {m6Entries.length}
                        </span>
                        <button
                          onClick={m6ClearFilters}
                          style={{ background: "transparent", border: "1px solid #FDBA74", borderRadius: 6, padding: "2px 8px", cursor: "pointer", color: "#9A3412", fontWeight: 600 }}
                        >
                          Limpar
                        </button>
                      </div>
                    )}
                    {m6SofiaPattern && m6SofiaPicked && m6PatternDismissedKey !== m6SofiaPattern.key && (
                      <div className="pl-d6-pattern">
                        <div style={{ fontSize: 11, color: "var(--orange-2)", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace", marginBottom: 6 }}>✨ Sofia detectou um padrão</div>
                        <p style={{ fontSize: 13, color: "#7A2E0A", lineHeight: 1.5, margin: 0 }}>
                          {m6SofiaPattern.n} dos últimos {m6SofiaPattern.total} registros indicam <strong>{m6SofiaPattern.label}</strong>. Selecionei automaticamente a melhor intervenção da biblioteca:
                        </p>
                        <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "#fff", border: "1px solid #FED7AA" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 18 }}>{m6SofiaPicked.icone}</span>
                            <strong style={{ fontSize: 13, color: "#7A2E0A" }}>{m6SofiaPicked.titulo}</strong>
                            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--orange-2)", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 99, padding: "2px 8px" }}>
                              {M6_CAT_LABEL[m6SofiaPicked.categoria]}
                            </span>
                          </div>
                          <p style={{ fontSize: 12, color: "#7A2E0A", lineHeight: 1.45, margin: "4px 0" }}>{m6SofiaPicked.descricao}</p>
                          <p style={{ fontSize: 11, color: "#9A3412", lineHeight: 1.4, margin: "4px 0 0", fontStyle: "italic" }}>
                            <strong>Por que esta?</strong> {m6SofiaPicked.porQue}
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                          <button className="pl-btn primary" onClick={() => { showToast(m6SofiaPicked.toast); setM6PatternDismissedKey(m6SofiaPattern.key); }}>Aplicar esta intervenção</button>
                          {m6SofiaSugestoes.length > 1 && (
                            <button className="pl-btn ghost" onClick={() => setM6SofiaShowAlt((v) => !v)}>
                              {m6SofiaShowAlt ? "Ocultar alternativas" : `Ver ${m6SofiaSugestoes.length - 1} alternativa${m6SofiaSugestoes.length - 1 > 1 ? "s" : ""}`}
                            </button>
                          )}
                          <button className="pl-btn ghost" onClick={() => setM6PatternDismissedKey(m6SofiaPattern.key)}>Agora não</button>
                        </div>
                        {m6SofiaShowAlt && m6SofiaSugestoes.length > 1 && (
                          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                            {m6SofiaSugestoes.filter((s) => s.i.id !== m6SofiaPicked.id).map((s) => (
                              <button
                                key={s.i.id}
                                onClick={() => { setM6SofiaPickedId(s.i.id); setM6SofiaShowAlt(false); }}
                                style={{ textAlign: "left", padding: "8px 10px", borderRadius: 8, background: "#fff", border: "1px solid var(--line)", cursor: "pointer", display: "flex", gap: 8, alignItems: "flex-start" }}
                                title="Trocar para esta intervenção"
                              >
                                <span style={{ fontSize: 16 }}>{s.i.icone}</span>
                                <span style={{ flex: 1, minWidth: 0 }}>
                                  <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                    <strong style={{ fontSize: 12, color: "var(--ink)" }}>{s.i.titulo}</strong>
                                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-2)", background: "var(--soft)", borderRadius: 99, padding: "1px 6px" }}>
                                      {M6_CAT_LABEL[s.i.categoria]}
                                    </span>
                                  </span>
                                  <span style={{ display: "block", fontSize: 11, color: "var(--ink-2)", lineHeight: 1.4, marginTop: 2 }}>{s.i.descricao}</span>
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {m6FilteredEntries.length === 0 ? (
                      <EmptyState icon="📓" title="Nenhum registro ainda." description="Salve seu primeiro diário acima." />
                    ) : (
                      m6FilteredEntries.map((e) => (
                        <div
                          key={e.id}
                          data-testid="m6-entry"
                          className="pl-d6-entry"
                          role="button"
                          tabIndex={0}
                          onClick={() => m6StartEdit(e)}
                          onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); m6StartEdit(e); } }}
                          title="Clique para editar"
                          style={{ cursor: "pointer", ...(m6EditingId === e.id ? { borderColor: "var(--orange)", background: "var(--orange-soft)" } : null) }}
                        >
                          <div className="head" style={{ justifyContent: "space-between" }}>
                            <span>{e.date}</span>
                            <span style={{ display: "flex", gap: 6 }} onClick={(ev) => ev.stopPropagation()}>
                              <button onClick={() => m6StartEdit(e)} title="Editar" style={{ background: "transparent", border: "1px solid var(--line)", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600, color: "var(--ink)", cursor: "pointer" }}>Editar</button>
                              <button onClick={() => m6DeleteEntry(e.id)} title="Excluir" aria-label="Excluir" style={{ background: "transparent", border: "1px solid var(--line)", borderRadius: 6, padding: "3px 6px", color: "#b91c1c", cursor: "pointer", display: "inline-flex", alignItems: "center" }}><X size={12} /></button>
                            </span>
                          </div>
                          <div className="ttl"><span style={{ fontSize: 18 }}>{e.emoji}</span> {e.title}</div>
                          {e.atividadeTitulo && (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--orange)", fontWeight: 600, background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 99, padding: "2px 8px", marginTop: 4 }}>
                              <Sparkles size={10} /> Atividade: {e.atividadeTitulo}
                            </div>
                          )}
                          {e.text && <div className="body">{e.text}</div>}
                          {e.tags.length > 0 && (
                            <div className="chips">{e.tags.map((t) => <span key={t}>{t}</span>)}</div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <aside className="pl-side">
                    <div className="pl-panel">
                      <h3><BookOpen size={14} /> Aulas registradas</h3>
                      <p className="lead" style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", margin: "4px 0" }}>{m6Registradas}/{m6Total}</p>
                      <div className="pl-d6-progress"><div style={{ width: `${m6Pct}%` }} /></div>
                      <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>{m6Pct}% concluído ({M6_PERIODO_META[m6Periodo].label.toLowerCase()})</p>
                    </div>
                    <div className="pl-panel">
                      <h3><Sparkles size={14} /> Relatório {M6_PERIODO_META[m6Periodo].label.toLowerCase()}</h3>
                      <p className="lead" style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", margin: "4px 0" }}>{m6RelPct}% pronto</p>
                      <div className="pl-d6-progress"><div style={{ width: `${m6RelPct}%` }} /></div>
                      <button className="pl-btn" style={{ marginTop: 10, width: "100%" }} onClick={() => setM6ReportOpen(true)}>Ver relatório</button>
                    </div>
                    <div className="pl-panel accent">
                      <h3><Sparkles size={14} /> Sofia aprende</h3>
                      <p className="lead">Cada registro ajuda a Sofia a sugerir ajustes mais precisos para a próxima semana.</p>
                    </div>
                  </aside>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div key={toast.key} className="pl-toast show">
          <Move size={14} className="ic" />
          <span>{toast.msg}</span>
          <button onClick={() => {
            if (m5UndoMove) {
              const { card, from, to } = m5UndoMove;
              setWeek((w) => ({ ...w, [to]: w[to].filter((c) => c.id !== card.id), [from]: [...w[from], card] }));
              setM5UndoMove(null);
            }
            setToast(null);
          }}>Desfazer</button>
        </div>
      )}

      {m5Selected.size >= 2 && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "var(--navy, #0F172A)", color: "#fff", padding: "10px 14px", borderRadius: 12, boxShadow: "0 16px 40px rgba(15,23,42,.35)", zIndex: 70, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <strong style={{ fontSize: 13 }}>{m5Selected.size} selecionados</strong>
          <select onChange={(e) => { if (e.target.value) { m5BulkMove(e.target.value as DayKey); e.target.value = ""; } }} defaultValue="" style={{ padding: "6px 8px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600 }}>
            <option value="" disabled>Mover para…</option>
            {DAYS.map((d) => <option key={d.k} value={d.k}>{d.n}</option>)}
          </select>
          <button onClick={m5BulkDelete} style={{ background: "rgba(239,68,68,.85)", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}><X size={12} /> Excluir selecionados</button>
          <button onClick={m5ClearSelection} style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,.3)", padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Cancelar</button>
        </div>
      )}

      {m5ConfirmDelete && (
        <div role="dialog" aria-modal="true" onClick={() => setM5ConfirmDelete(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 90, display: "grid", placeItems: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "min(420px,100%)", boxShadow: "0 24px 60px rgba(15,23,42,.35)", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontSize: 11, color: "#b91c1c", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace" }}>⚠ Confirmar exclusão</div>
              <h3 style={{ fontFamily: "'Fraunces',serif", fontSize: 18, marginTop: 4 }}>Excluir {m5Selected.size} cartões?</h3>
            </div>
            <div style={{ padding: 20, fontSize: 13.5, color: "var(--muted)" }}>
              Esta ação removerá os cartões selecionados da semana. Você poderá desfazer pelo histórico.
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setM5ConfirmDelete(false)} style={{ background: "#fff", color: "var(--ink, #0F172A)", border: "1px solid var(--line)", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancelar</button>
              <button onClick={m5ConfirmBulkDelete} style={{ background: "#dc2626", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {m5ReplicaOpen && (
        <div role="dialog" aria-modal="true" onClick={() => setM5ReplicaOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 80, display: "grid", placeItems: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "min(560px,100%)", maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 60px rgba(15,23,42,.35)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--orange)", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace" }}>📋 Replicar semana</div>
                <h3 style={{ fontFamily: "'Fraunces',serif", fontSize: 18, marginTop: 4 }}>Escolha as turmas</h3>
              </div>
              <button onClick={() => setM5ReplicaOpen(false)} aria-label="Fechar" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 6 }}><X size={18} /></button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {TURMAS.map((t) => {
                const on = !!m5ReplicaPicks[t.id];
                return (
                  <button key={t.id} onClick={() => setM5ReplicaPicks((p) => ({ ...p, [t.id]: !p[t.id] }))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: on ? "2px solid var(--orange, #F97316)" : "1px solid var(--line)", borderRadius: 10, background: on ? "rgba(249,115,22,.06)" : "#fff", cursor: "pointer", textAlign: "left" }}>
                    <span style={{ width: 18, height: 18, borderRadius: 4, border: "1px solid var(--line)", background: on ? "var(--orange, #F97316)" : "#fff", display: "grid", placeItems: "center", color: "#fff" }}>{on && <Check size={12} />}</span>
                    <span style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}
                        {t.warn && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 99, background: "rgba(239,68,68,.12)", color: "#b91c1c" }}>{t.warn}</span>}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{t.sub}{t.pcd && ` · ${t.pcd}`}</div>
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
                <strong style={{ color: "var(--ink, #0F172A)" }}>{m5ReplicaCount}</strong> turma(s) selecionada(s) · Economia: <strong style={{ color: "#16a34a" }}>~{m5ReplicaCount * 25} min</strong> (25 min/turma)
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="pl-btn" onClick={() => setM5ReplicaOpen(false)}>Cancelar</button>
                <button className="pl-btn primary" onClick={m5ConfirmarReplicar} disabled={m5ReplicaCount === 0}><Check size={14} /> Replicar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {m5HistoryOpen && (
        <div role="dialog" aria-modal="true" onClick={() => setM5HistoryOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 80 }}>
          <aside onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "min(420px,100%)", background: "#fff", boxShadow: "-12px 0 40px rgba(15,23,42,.25)", display: "flex", flexDirection: "column", animation: "fade-in .25s ease-out" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontFamily: "'Fraunces',serif", fontSize: 18, margin: 0 }}>🕘 Histórico</h3>
              <button onClick={() => setM5HistoryOpen(false)} aria-label="Fechar" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 6 }}><X size={18} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {m5History.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 13 }}>Nenhuma ação registrada ainda.</p>
              ) : m5History.map((h) => (
                <div key={h.id} style={{ padding: 10, border: "1px solid var(--line)", borderRadius: 10, background: "#FAFBFD", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{h.label}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{new Date(h.ts).toLocaleTimeString()}</div>
                  </div>
                  {h.undo && <button className="pl-btn ghost" onClick={() => m5UndoLast(h)} style={{ padding: "4px 8px", fontSize: 11.5 }}>Desfazer</button>}
                </div>
              ))}
            </div>
            {m5History.length > 0 && (
              <div style={{ padding: 12, borderTop: "1px solid var(--line)" }}>
                <button className="pl-btn" onClick={() => { setM5History([]); showToast("Histórico limpo."); }} style={{ width: "100%" }}>Limpar histórico</button>
              </div>
            )}
          </aside>
        </div>
      )}

      {m2PrintOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Imprimir sequência didática"
          onClick={() => setM2PrintOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 80, display: "grid", placeItems: "center", padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 14, width: "min(760px, 100%)", maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 60px rgba(15,23,42,.35)" }}
          >
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--orange)", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace" }}>
                  🖨 Versão para impressão
                </div>
                <h3 style={{ fontFamily: "'Fraunces',serif", fontSize: 18, marginTop: 4 }}>Sequência didática · {m2Total} {m2Total === 1 ? "etapa" : "etapas"}</h3>
              </div>
              <button onClick={() => setM2PrintOpen(false)} aria-label="Fechar" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 6, borderRadius: 6 }}><X size={18} /></button>
            </div>
            <div id="m2-print-area" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
                Progresso: <strong>{m2DoneCount}/{m2Total}</strong> ({m2Pct}%)
              </p>
              <ol style={{ paddingLeft: 20, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {m2Steps.map((s, idx) => {
                  const status = idx < m2CurIdx ? "Concluída" : idx === m2CurIdx ? "Em andamento" : "Futura";
                  return (
                    <li key={s.id} style={{ borderLeft: "3px solid " + (idx < m2CurIdx ? "#16a34a" : idx === m2CurIdx ? "#F97316" : "#cbd5e1"), paddingLeft: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: .3, textTransform: "uppercase", color: "var(--muted)" }}>{s.d} · {s.tag} · {status}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{s.t}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{s.p}</div>
                    </li>
                  );
                })}
              </ol>
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="pl-btn" onClick={() => setM2PrintOpen(false)}>Fechar</button>
              <button className="pl-btn primary" onClick={() => window.print()}>Imprimir agora</button>
            </div>
          </div>
        </div>
      )}

      {m6ReportOpen && (
        <div role="dialog" aria-modal="true" onClick={() => setM6ReportOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 90, display: "grid", placeItems: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "min(620px,100%)", maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 60px rgba(15,23,42,.35)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--orange)", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace" }}>📊 Relatório {M6_PERIODO_META[m6Periodo].label.toLowerCase()}</div>
                <h3 style={{ fontFamily: "'Fraunces',serif", fontSize: 18, marginTop: 4 }}>{M6_PERIODO_META[m6Periodo].label} · {m6RelTurma || "Todas as turmas"}</h3>
              </div>
              <button onClick={() => setM6ReportOpen(false)} aria-label="Fechar" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 6 }}><X size={18} /></button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, fontSize: 13.5, lineHeight: 1.55, color: "var(--ink)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>
                  Período
                  <select value={m6Periodo} onChange={(e) => setM6Periodo(e.target.value as M6Periodo)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "#fff", fontSize: 13 }}>
                    {(Object.keys(M6_PERIODO_META) as M6Periodo[]).map((p) => (
                      <option key={p} value={p}>{M6_PERIODO_META[p].label}</option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>
                  Turma
                  <select value={m6RelTurma} onChange={(e) => setM6RelTurma(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "#fff", fontSize: 13 }}>
                    <option value="">Todas as turmas</option>
                    {M5_TURMAS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
                  <span>Progresso ({M6_PERIODO_META[m6Periodo].label.toLowerCase()})</span>
                  <strong style={{ color: "var(--ink)" }}>{m6RelEntries.length}/{m6Total} · {m6RelPct}%</strong>
                </div>
                <div className="pl-d6-progress"><div style={{ width: `${m6RelPct}%` }} /></div>
              </div>
              {m6RelLeitura ? (
                <>
                  <p style={{ margin: 0 }}>
                    <strong>Leitura da turma:</strong> {m6RelLeitura.total} {m6RelLeitura.total === 1 ? "registro" : "registros"} no período
                    {m6RelTurma ? <> em <strong>{m6RelTurma}</strong></> : null}.
                    {m6RelLeitura.topHumor && <> Humor predominante: <strong>{m6RelLeitura.topHumor[0]}</strong>.</>}
                  </p>
                  {m6RelLeitura.topTags.length > 0 && (
                    <p style={{ margin: 0 }}>
                      <strong>Padrões observados:</strong>{" "}
                      {m6RelLeitura.topTags.map(([t, n], i) => (
                        <span key={t}>{i > 0 ? " · " : ""}{t} ({n})</span>
                      ))}
                    </p>
                  )}
                  <p style={{ margin: 0 }}>
                    <strong>Balanço:</strong> {m6RelLeitura.positivos} momentos positivos · {m6RelLeitura.reforco} pontos de reforço.
                  </p>
                  <div style={{ marginTop: 4, padding: 12, background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, fontSize: 12.5, color: "#7C2D12" }}>
                    <strong>Sofia sugere:</strong> revisar os tópicos com reforço pendente e replicar as estratégias marcadas como “funcionou” na próxima quinzena.
                  </div>
                </>
              ) : (
                <p style={{ margin: 0, color: "var(--muted)" }}>
                  Ainda não há registros{m6RelTurma ? <> para <strong>{m6RelTurma}</strong></> : null} neste período. A barra acima crescerá conforme você salvar diários no M6.
                </p>
              )}
              {m6AIErro && (
                <div style={{ padding: 10, borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", fontSize: 12.5 }}>
                  ⚠ {m6AIErro}
                </div>
              )}
              {m6AIRel && (
                <div style={{ marginTop: 8, padding: 14, borderRadius: 12, background: "linear-gradient(180deg,#FFF7ED 0%,#FFFBF5 100%)", border: "1px solid #FED7AA", display: "grid", gap: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--orange-2)", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace" }}>
                    <Sparkles size={12} style={{ verticalAlign: "-2px" }} /> Relatório gerado pela Sofia
                  </div>
                  {m6AIRel.titulo && <h4 style={{ fontFamily: "'Fraunces',serif", fontSize: 16, margin: 0, color: "var(--ink)" }}>{m6AIRel.titulo}</h4>}
                  {m6AIRel.resumo && <p style={{ margin: 0, fontSize: 13, color: "var(--ink)", lineHeight: 1.55 }}>{m6AIRel.resumo}</p>}
                  {Array.isArray(m6AIRel.destaques) && m6AIRel.destaques.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>Destaques</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>
                        {m6AIRel.destaques.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(m6AIRel.alertas) && m6AIRel.alertas.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>Pontos de atenção</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>
                        {m6AIRel.alertas.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(m6AIRel.padroes) && m6AIRel.padroes.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>Padrões</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>
                        {m6AIRel.padroes.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(m6AIRel.recomendacoes) && m6AIRel.recomendacoes.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>Recomendações da Sofia</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>
                        {m6AIRel.recomendacoes.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                  )}
                  {m6AIRel.comunicacao_familias && (
                    <div style={{ padding: 10, background: "#fff", borderRadius: 8, border: "1px solid #FED7AA" }}>
                      <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>Comunicação para as famílias</div>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--ink)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{m6AIRel.comunicacao_familias}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="pl-btn" onClick={() => { setM6ReportOpen(false); setM6AIRel(null); setM6AIErro(null); }}>Fechar</button>
              <button
                className="pl-btn primary"
                onClick={m6GerarRelatorioSofia}
                disabled={m6AILoading || m6RelEntries.length === 0}
                title={m6RelEntries.length === 0 ? "Salve pelo menos 1 registro para gerar." : "Sofia escreve um relatório completo"}
              >
                <Sparkles size={14} /> {m6AILoading ? "Sofia escrevendo…" : (m6AIRel ? "Gerar novamente" : "Gerar com a Sofia")}
              </button>
            </div>
          </div>
        </div>
      )}

      {m1EditCard && (() => {
        const card = (m1Plan[m1EditCard.dia] || []).find((c) => c.id === m1EditCard.id);
        if (!card) return null;
        const dia = m1EditCard.dia;
        const id = m1EditCard.id;
        const close = () => setM1EditCard(null);
        const upd = (patch: Partial<M1Card>) => m1UpdateCard(dia, id, patch);
        const linesToArr = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
        const diaInfo = DAYS.find((d) => d.k === dia);
        const diaLabel = diaInfo ? `${diaInfo.n} ${diaInfo.d}` : dia.toUpperCase();
        return <M1EditCardModal
          card={card}
          dia={dia}
          diaLabel={diaLabel}
          tema={m1Tema}
          onClose={close}
          onUpdate={upd}
          onRegen={() => upd(enrichM1Card({ ...card, objetivo: undefined, materiais: undefined, passos: undefined, avaliacao: undefined, diferenciacao: undefined, perguntasChave: undefined, conceitos: undefined, extensoes: undefined, licaoCasa: undefined }, m1Tema))}
          onDelete={() => { if (confirm("Excluir esta atividade?")) { removerCardM1(dia, id); close(); } }}
          linesToArr={linesToArr}
        />;
      })()}

      {m1DayModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Preencher ${m1DayModal.n}`}
          onClick={fecharDayModal}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 80, display: "grid", placeItems: "center", padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 14, width: "min(720px, 100%)", maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 60px rgba(15,23,42,.35)" }}
          >
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--orange)", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace" }}>
                  ✨ Preencher só {m1DayModal.n} · dia {m1DayModal.d}
                </div>
                <h3 style={{ fontFamily: "'Fraunces',serif", fontSize: 18, marginTop: 4 }}>A Sofia gera com base nas competências da BNCC</h3>
              </div>
              <button onClick={fecharDayModal} aria-label="Fechar" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 6, borderRadius: 6 }}><X size={18} /></button>
            </div>

            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              {(() => {
                const herdaTurma = !!ctxAtual.turma;
                const herdaAno = !herdaTurma && ctxAtual.etapa !== undefined && ctxAtual.anoIdx !== undefined;
                const herdadoIgual = mdEtapa === ctxResolvido.etapa && mdAnoIdx === ctxResolvido.anoIdx;
                if (!herdaTurma && !herdaAno) return null;
                const label = herdaTurma
                  ? `herdado da turma ${ctxAtual.turma}`
                  : `herdado do ano ${ctxResolvido.anoLabel}`;
                return (
                  <div
                    style={{
                      display: "inline-flex",
                      alignSelf: "flex-start",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: herdadoIgual ? "#F0FDF4" : "#FFFBEB",
                      border: `1px solid ${herdadoIgual ? "#BBF7D0" : "#FDE68A"}`,
                      color: herdadoIgual ? "#047857" : "#B45309",
                      fontSize: 11.5,
                      fontWeight: 600,
                    }}
                    title={herdadoIgual
                      ? "Etapa e ano vieram do contexto da aba."
                      : "Você alterou em relação ao contexto da aba."}
                  >
                    📌 {label}{herdadoIgual ? "" : " · alterado"}
                  </div>
                );
              })()}
              <div className="pl-field" style={{ marginTop: 0 }}>
                <label>Etapa</label>
                <div className="pl-pills">
                  {(Object.keys(BNCC_BY_ETAPA) as Etapa[]).map((e) => (
                    <button
                      key={e}
                      className={"pl-pill" + (mdEtapa === e ? " on" : "")}
                      onClick={() => {
                        setMdEtapa(e);
                        setMdAnoIdx(0);
                        const first = BNCC_BY_ETAPA[e].anos[0]?.disciplinas[0]?.nome;
                        setMdDiscOn(first ? { [first]: true } : {});
                        setMdSel({});
                      }}
                    >{BNCC_BY_ETAPA[e].label}</button>
                  ))}
                </div>
              </div>

              <div className="pl-field" style={{ marginTop: 0 }}>
                <label>{mdEtapa === "EI" ? "Faixa etária" : "Ano"}</label>
                <select
                  className="pl-input"
                  value={mdAnoIdx}
                  onChange={(e) => {
                    const i = Number(e.target.value);
                    setMdAnoIdx(i);
                    const first = BNCC_BY_ETAPA[mdEtapa].anos[i]?.disciplinas[0]?.nome;
                    setMdDiscOn(first ? { [first]: true } : {});
                    setMdSel({});
                  }}
                >
                  {BNCC_BY_ETAPA[mdEtapa].anos.map((a, i) => <option key={a.ano} value={i}>{a.ano}</option>)}
                </select>
              </div>

              <div className="pl-field" style={{ marginTop: 0 }}>
                <label>{mdEtapa === "EI" ? "Campos de experiência" : "Disciplinas"} (selecione um ou mais)</label>
                <div className="pl-pills">
                  {mdAno?.disciplinas.map((d) => {
                    const on = !!mdDiscOn[d.nome];
                    return (
                      <button
                        key={d.nome}
                        className={"pl-pill" + (on ? " on" : "")}
                        onClick={() => setMdDiscOn((s) => ({ ...s, [d.nome]: !s[d.nome] }))}
                      >{d.nome}</button>
                    );
                  })}
                </div>
              </div>

              <div className="pl-field" style={{ marginTop: 0 }}>
                <label>Tema do dia (opcional)</label>
                <input
                  className="pl-input"
                  placeholder="Ex.: Animais do quintal"
                  value={mdTema}
                  maxLength={120}
                  onChange={(e) => setMdTema(e.target.value)}
                />
              </div>

              <div className="pl-field" style={{ marginTop: 0 }}>
                <label>Competências ({mdSelecionadas.length} selecionada{mdSelecionadas.length === 1 ? "" : "s"})</label>
                {mdDiscList.length === 0 ? (
                  <p className="lead" style={{ margin: 0 }}>Selecione ao menos uma {mdEtapa === "EI" ? "área" : "disciplina"} acima.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {mdDiscList.map((d) => (
                      <div key={d.nome}>
                        <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace", marginBottom: 6 }}>{d.nome}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {d.competencias.map((c) => {
                            const on = !!mdSel[c.code];
                            return (
                              <button
                                key={c.code}
                                type="button"
                                onClick={() => setMdSel((s) => ({ ...s, [c.code]: !s[c.code] }))}
                                className={"pl-trow" + (on ? " on" : "")}
                                style={{ marginBottom: 0 }}
                              >
                                <span className="chk">{on && <Check size={11} />}</span>
                                <span className="info">
                                  <span className="name" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5 }}>{c.code} · {c.tag}</span>
                                  <span className="sub" style={{ display: "block" }}>{c.desc}</span>
                                </span>
                                <span className="gain">{c.minutos} min</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pl-field" style={{ marginTop: 0 }}>
                <label>Atividades interdisciplinares</label>
                <button
                  type="button"
                  onClick={() => mdPodeInter && setMdInter((v) => !v)}
                  disabled={!mdPodeInter}
                  className={"pl-pill" + (mdInter && mdPodeInter ? " on" : "")}
                  style={{ alignSelf: "flex-start", opacity: mdPodeInter ? 1 : 0.5, cursor: mdPodeInter ? "pointer" : "not-allowed" }}
                  title={mdPodeInter ? "Sofia junta competências de disciplinas diferentes em uma mesma atividade" : "Selecione competências de pelo menos 2 disciplinas/campos"}
                >
                  <Link2 size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
                  {mdInter && mdPodeInter ? "Interdisciplinar ativado" : "Ativar interdisciplinar"}
                </button>
                <p className="lead" style={{ margin: "6px 0 0" }}>
                  {mdPodeInter
                    ? "Sofia vai combinar competências de diferentes disciplinas/campos em cada atividade."
                    : "Selecione competências de pelo menos 2 disciplinas para habilitar."}
                </p>
              </div>

              <div className="pl-field" style={{ marginTop: 0 }}>
                <label>Como dimensionar o dia?</label>
                <div className="pl-pills">
                  <button className={"pl-pill" + (mdModo === "intensidade" ? " on" : "")} onClick={() => setMdModo("intensidade")}>Por intensidade</button>
                  <button className={"pl-pill" + (mdModo === "quantidade" ? " on" : "")} onClick={() => setMdModo("quantidade")}>Nº de atividades</button>
                  <button className={"pl-pill" + (mdModo === "tempo" ? " on" : "")} onClick={() => setMdModo("tempo")}>Tempo disponível</button>
                </div>

                {mdModo === "intensidade" && (
                  <>
                    <div className="pl-pills" style={{ marginTop: 8 }}>
                      {(["Leve", "Equilibrada", "Densa"] as const).map((p) => (
                        <button key={p} className={"pl-pill" + (mdInt === p ? " on" : "")} onClick={() => setMdInt(p)}>{p}</button>
                      ))}
                    </div>
                    <p className="lead" style={{ margin: "6px 0 0" }}>
                      Sofia vai gerar <b>{Math.min(mdInt === "Leve" ? 1 : mdInt === "Densa" ? 3 : 2, mdSelecionadas.length || 1)}</b> atividade(s) para {m1DayModal.n}.
                    </p>
                  </>
                )}

                {mdModo === "quantidade" && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                      type="number"
                      className="pl-input"
                      style={{ width: 100 }}
                      min={1}
                      max={8}
                      value={mdQtd}
                      onChange={(e) => setMdQtd(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
                    />
                    <span className="lead" style={{ margin: 0 }}>atividade(s) sugerida(s) para {m1DayModal.n}.</span>
                  </div>
                )}

                {mdModo === "tempo" && (
                  <>
                    <div className="pl-pills" style={{ marginTop: 8 }}>
                      {[30, 60, 90, 120, 180, 240].map((t) => (
                        <button key={t} className={"pl-pill" + (mdMin === t ? " on" : "")} onClick={() => setMdMin(t)}>
                          {t >= 60 ? `${Math.floor(t / 60)}h${t % 60 ? ` ${t % 60}min` : ""}` : `${t} min`}
                        </button>
                      ))}
                    </div>
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
                      <input
                        type="number"
                        className="pl-input"
                        style={{ width: 110 }}
                        min={15}
                        max={480}
                        step={5}
                        value={mdMin}
                        onChange={(e) => setMdMin(Math.max(15, Math.min(480, Number(e.target.value) || 60)))}
                      />
                      <span className="lead" style={{ margin: 0 }}>minutos totais — Sofia ajusta a duração de cada atividade.</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="pl-btn ghost" onClick={fecharDayModal}>Cancelar</button>
              <button className="pl-btn primary" onClick={gerarDayModal} disabled={mdSelecionadas.length === 0}>
                <Sparkles size={14} /> Gerar com a Sofia
              </button>
            </div>
          </div>
        </div>
      )}

      {paramsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ajustar parâmetros"
          data-paramsmodal
          onClick={() => setParamsModalOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 1000 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 14, width: "min(560px, 100%)", maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 60px rgba(15,23,42,.35)" }}
          >
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--orange)", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace" }}>
                  ✏️ Ajustar parâmetros
                </div>
                <h3 style={{ fontFamily: "'Fraunces',serif", fontSize: 18, marginTop: 4 }}>Contexto desta aba</h3>
              </div>
              <button onClick={() => setParamsModalOpen(false)} aria-label="Fechar" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 6, borderRadius: 6 }}><X size={18} /></button>
            </div>

            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <p className="lead" style={{ margin: 0, color: "var(--ink-2)", fontSize: 12.5 }}>
                Escolha uma <b>turma cadastrada</b> ou — se ainda não cadastrou — selecione manualmente a <b>etapa e o ano de escolaridade</b> para a Sofia gerar.
              </p>

              <div className="pl-field">
                <label>Turma cadastrada</label>
                <select
                  value={ctxAtual.turma ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCtxAtual({ ...ctxAtual, turma: v || undefined });
                  }}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "#fff" }}
                >
                  <option value="">— Sem turma cadastrada —</option>
                  {turmasPerfil.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {turmasPerfil.length === 0 && (
                  <p className="lead" style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 11.5 }}>
                    Você ainda não cadastrou turmas no perfil. Selecione abaixo a etapa/ano.
                  </p>
                )}
              </div>

              {!ctxAtual.turma && (
                <>
                  <div className="pl-field">
                    <label>Etapa de ensino</label>
                    <div className="pl-pills">
                      {(Object.keys(BNCC_BY_ETAPA) as Etapa[]).map((e) => (
                        <button
                          key={e}
                          type="button"
                          className={"pl-pill" + (ctxAtual.etapa === e ? " on" : "")}
                          onClick={() => setCtxAtual({ ...ctxAtual, etapa: e, anoIdx: 0 })}
                        >{BNCC_BY_ETAPA[e].label}</button>
                      ))}
                    </div>
                  </div>
                  {ctxAtual.etapa && (
                    <div className="pl-field">
                      <label>Ano de escolaridade</label>
                      <div className="pl-pills">
                        {BNCC_BY_ETAPA[ctxAtual.etapa].anos.map((a, i) => (
                          <button
                            key={a.ano}
                            type="button"
                            className={"pl-pill" + ((ctxAtual.anoIdx ?? 0) === i ? " on" : "")}
                            onClick={() => setCtxAtual({ ...ctxAtual, anoIdx: i })}
                          >{a.ano}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: ctxResolvido.pronto ? "#F0FDF4" : "#FFFBEB",
                  border: `1px solid ${ctxResolvido.pronto ? "#BBF7D0" : "#FDE68A"}`,
                  color: ctxResolvido.pronto ? "#047857" : "#B45309",
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                {ctxResolvido.pronto
                  ? (ctxAtual.turma
                      ? `✓ Sofia vai gerar para a turma ${ctxAtual.turma}.`
                      : `✓ Sofia vai gerar para ${ctxResolvido.anoLabel} (${ctxResolvido.etapaLabel}).`)
                  : "Selecione uma turma OU um ano de escolaridade."}
              </div>

              <div className="pl-field" style={{ marginTop: 0 }}>
                <label>Modo Interdisciplinar</label>
                <button
                  type="button"
                  className={"pl-pill" + (interdisciplinarPadrao ? " on" : "")}
                  onClick={() => setInterdisciplinarPadrao((v) => !v)}
                  style={{ alignSelf: "flex-start" }}
                  title="Define o padrão usado em todos os modais de atividade"
                >
                  <Link2 size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
                  {interdisciplinarPadrao ? "Ativado (padrão)" : "Desativado"}
                </button>
                <p className="lead" style={{ margin: "6px 0 0" }}>
                  Quando ativado, novos modais de atividade já vêm com o modo interdisciplinar ligado — você ainda pode desligar caso a caso.
                </p>
              </div>

              <div className="pl-field" style={{ marginTop: 0 }}>
                <label>Como dimensionar cada dia da semana?</label>
                <div className="pl-pills">
                  <button type="button" className={"pl-pill" + (m1Modo === "intensidade" ? " on" : "")} onClick={() => setM1Modo("intensidade")}>Por intensidade</button>
                  <button type="button" className={"pl-pill" + (m1Modo === "quantidade" ? " on" : "")} onClick={() => setM1Modo("quantidade")}>Nº de atividades</button>
                  <button type="button" className={"pl-pill" + (m1Modo === "tempo" ? " on" : "")} onClick={() => setM1Modo("tempo")}>Tempo disponível</button>
                </div>

                {m1Modo === "intensidade" && (
                  <p className="lead" style={{ margin: "6px 0 0" }}>
                    Sofia usa a intensidade selecionada acima ({pillsInt.toLowerCase()}) para decidir quantas atividades sugerir por dia.
                  </p>
                )}

                {m1Modo === "quantidade" && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                      type="number"
                      className="pl-input"
                      style={{ width: 100 }}
                      min={1}
                      max={8}
                      value={m1Qtd}
                      onChange={(e) => setM1Qtd(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
                    />
                    <span className="lead" style={{ margin: 0 }}>atividade(s) por dia (×5 dias).</span>
                  </div>
                )}

                {m1Modo === "tempo" && (
                  <>
                    <div className="pl-pills" style={{ marginTop: 8 }}>
                      {[60, 90, 120, 180, 240, 300].map((t) => (
                        <button key={t} type="button" className={"pl-pill" + (m1Min === t ? " on" : "")} onClick={() => setM1Min(t)}>
                          {t >= 60 ? `${Math.floor(t / 60)}h${t % 60 ? ` ${t % 60}min` : ""}` : `${t} min`}
                        </button>
                      ))}
                    </div>
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
                      <input
                        type="number"
                        className="pl-input"
                        style={{ width: 110 }}
                        min={30}
                        max={480}
                        step={5}
                        value={m1Min}
                        onChange={(e) => setM1Min(Math.max(30, Math.min(480, Number(e.target.value) || 60)))}
                      />
                      <span className="lead" style={{ margin: 0 }}>minutos por dia — Sofia recalibra a duração de cada atividade.</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="pl-btn ghost" onClick={() => setParamsModalOpen(false)}>Cancelar</button>
              <button
                className="pl-btn primary"
                onClick={() => setParamsModalOpen(false)}
                disabled={!ctxResolvido.pronto}
              ><Check size={14} /> Salvar parâmetros</button>
            </div>
          </div>
        </div>
      )}
      <PrintInfoModal
        open={m2PrintModalOpen}
        onOpenChange={setM2PrintModalOpen}
        onConfirm={executarImpressaoM3}
        title="Imprimir sequência didática"
      />
    </div>
  ));
}

/* ──────────────────────────────────────────────────────────────
 * Modal: Editar atividade gerada pela Sofia (M3 → "Sofia preenche a semana")
 * Reformulado: cabeçalho com chips informativos, layout em duas colunas,
 * abas (Visão geral · Plano · Inclusão · Recursos), rodapé sticky.
 * ────────────────────────────────────────────────────────────── */
function M1EditCardModal(props: {
  card: M1Card;
  dia: DayKey;
  diaLabel: string;
  tema: string;
  onClose: () => void;
  onUpdate: (patch: Partial<M1Card>) => void;
  onRegen: () => void;
  onDelete: () => void;
  linesToArr: (s: string) => string[];
}) {
  const { card, diaLabel, onClose, onUpdate: upd, onRegen, onDelete, linesToArr } = props;
  const [tab, setTab] = useState<"visao" | "plano" | "inclusao" | "recursos">("visao");
  const [edit, setEdit] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const completion = (() => {
    const fields: Array<unknown> = [
      card.objetivo, card.materiais?.length, card.passos?.length,
      card.avaliacao, card.diferenciacao, card.perguntasChave?.length,
      card.conceitos?.length, card.extensoes?.length, card.licaoCasa,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  })();

  const Field = ({ label, value, onChange, rows = 3, mono = false }: {
    label: string; value: string; onChange: (v: string) => void; rows?: number; mono?: boolean;
  }) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 700, letterSpacing: ".02em" }}>{label}</span>
      {edit ? (
        rows > 1 ? (
          <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13, lineHeight: 1.55, resize: "vertical", fontFamily: mono ? "'JetBrains Mono',monospace" : "inherit", background: "#fff" }} />
        ) : (
          <input value={value} onChange={(e) => onChange(e.target.value)}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13, fontFamily: mono ? "'JetBrains Mono',monospace" : "inherit", background: "#fff" }} />
        )
      ) : (
        <div style={{ padding: "10px 12px", borderRadius: 10, background: "#F8FAFC", border: "1px solid var(--line)", fontSize: 13, lineHeight: 1.55, color: value ? "var(--ink, #0F172A)" : "var(--muted)", whiteSpace: "pre-wrap", minHeight: rows > 1 ? 60 : "auto" }}>
          {value || <em>Sem conteúdo. Clique em Editar para preencher.</em>}
        </div>
      )}
    </label>
  );

  const ListField = ({ label, items, onChange, icon }: {
    label: string; items: string[]; onChange: (v: string[]) => void; icon: string;
  }) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 700, letterSpacing: ".02em" }}>
        {icon} {label}
      </span>
      {edit ? (
        <textarea value={items.join("\n")} onChange={(e) => onChange(linesToArr(e.target.value))} rows={Math.max(3, items.length + 1)}
          placeholder="Um item por linha"
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13, lineHeight: 1.55, resize: "vertical", background: "#fff" }} />
      ) : items.length === 0 ? (
        <div style={{ padding: "10px 12px", borderRadius: 10, background: "#F8FAFC", border: "1px solid var(--line)", fontSize: 13, color: "var(--muted)" }}>
          <em>Nada listado.</em>
        </div>
      ) : (
        <ol style={{ margin: 0, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 6, fontSize: 13, lineHeight: 1.55 }}>
          {items.map((it, i) => <li key={i}>{it}</li>)}
        </ol>
      )}
    </label>
  );

  const Tab = ({ k, label, count }: { k: typeof tab; label: string; count?: number }) => (
    <button
      type="button"
      onClick={() => setTab(k)}
      style={{
        padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer",
        background: tab === k ? "var(--orange, #F97316)" : "transparent",
        color: tab === k ? "#fff" : "var(--ink, #0F172A)",
        fontWeight: tab === k ? 700 : 500, fontSize: 12.5,
        display: "inline-flex", alignItems: "center", gap: 6,
      }}
    >
      {label}
      {typeof count === "number" && (
        <span style={{ fontSize: 10.5, padding: "1px 6px", borderRadius: 99, background: tab === k ? "rgba(255,255,255,.25)" : "#E2E8F0", color: tab === k ? "#fff" : "var(--muted)", fontWeight: 700 }}>{count}</span>
      )}
    </button>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label="Editar atividade da Sofia"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.6)", zIndex: 90, display: "grid", placeItems: "center", padding: 16, backdropFilter: "blur(2px)" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 16, width: "min(880px, 100%)", maxHeight: "94vh", display: "flex", flexDirection: "column", boxShadow: "0 30px 80px rgba(15,23,42,.45)", overflow: "hidden" }}>

        {/* HEADER */}
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--line)", background: "linear-gradient(180deg, #FFF7ED 0%, #fff 100%)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 10.5, color: "#9A3412", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace", marginBottom: 6 }}>
                <Sparkles size={12} /> Atividade da Sofia · {diaLabel}
              </div>
              {edit ? (
                <input value={card.title} onChange={(e) => upd({ title: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 18, fontWeight: 700, fontFamily: "'Fraunces',serif", background: "#fff" }} />
              ) : (
                <h3 style={{ fontFamily: "'Fraunces',serif", fontSize: 22, lineHeight: 1.2, margin: 0 }}>{card.title}</h3>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "rgba(59,130,246,.12)", color: "#1d4ed8", fontFamily: "'JetBrains Mono',monospace" }}>
                  <BookOpen size={11} /> {card.bncc || "BNCC ?"}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "rgba(16,185,129,.12)", color: "#047857" }}>
                  <Clock size={11} /> {card.minutos} min
                </span>
                {card.tag && (
                  <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "#F1F5F9", color: "var(--ink, #0F172A)" }}>
                    {card.tag}
                  </span>
                )}
                {card.foco && (
                  <span style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: "rgba(249,115,22,.12)", color: "#9A3412" }}>
                    🎯 {card.foco}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} aria-label="Fechar"
              style={{ background: "rgba(15,23,42,.06)", border: "none", color: "var(--ink, #0F172A)", cursor: "pointer", padding: 8, borderRadius: 8, flexShrink: 0 }}>
              <X size={18} />
            </button>
          </div>

          {/* completion + tabs row */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>
              <div style={{ width: 90, height: 6, borderRadius: 99, background: "#E2E8F0", overflow: "hidden" }}>
                <div style={{ width: `${completion}%`, height: "100%", background: completion < 50 ? "#F59E0B" : "#10B981", transition: "width .3s" }} />
              </div>
              {completion}% detalhada
            </div>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={() => setEdit((v) => !v)}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--line)", background: edit ? "var(--ink, #0F172A)" : "#fff", color: edit ? "#fff" : "var(--ink, #0F172A)", cursor: "pointer", fontWeight: 600, fontSize: 12.5 }}>
              {edit ? "✓ Concluir edição" : "✎ Editar"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 4, marginTop: 12, padding: 4, background: "#F1F5F9", borderRadius: 10 }}>
            <Tab k="visao" label="Visão geral" />
            <Tab k="plano" label="Plano de aula" count={(card.passos ?? []).length || undefined} />
            <Tab k="inclusao" label="Inclusão" />
            <Tab k="recursos" label="Recursos" count={(card.materiais ?? []).length || undefined} />
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: 22, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16, fontSize: 13 }}>
          {tab === "visao" && (
            <>
              <Field label="🎯 Objetivo de aprendizagem" value={card.objetivo ?? ""} onChange={(v) => upd({ objetivo: v })} rows={3} />
              <ListField label="Conceitos-chave" icon="💡" items={card.conceitos ?? []} onChange={(v) => upd({ conceitos: v })} />
              <ListField label="Perguntas para a turma" icon="❓" items={card.perguntasChave ?? []} onChange={(v) => upd({ perguntasChave: v })} />
              {edit && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 160px", gap: 10, marginTop: 4 }}>
                  <Field label="Tag" value={card.tag} onChange={(v) => upd({ tag: v })} rows={1} />
                  <Field label="Minutos" value={String(card.minutos)} onChange={(v) => upd({ minutos: Math.max(5, parseInt(v || "0", 10) || 0) })} rows={1} />
                  <Field label="Código BNCC" value={card.bncc} onChange={(v) => upd({ bncc: v })} rows={1} mono />
                </div>
              )}
            </>
          )}

          {tab === "plano" && (
            <>
              <ListField label="Passo a passo da aula" icon="📋" items={card.passos ?? []} onChange={(v) => upd({ passos: v })} />
              <Field label="✅ Avaliação / evidências de aprendizagem" value={card.avaliacao ?? ""} onChange={(v) => upd({ avaliacao: v })} rows={3} />
              <Field label="🏠 Lição de casa" value={card.licaoCasa ?? ""} onChange={(v) => upd({ licaoCasa: v })} rows={2} />
            </>
          )}

          {tab === "inclusao" && (
            <>
              <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.25)", fontSize: 12.5, color: "#3730A3", lineHeight: 1.5 }}>
                ♿ <strong>Sofia adapta para todos:</strong> descreva ajustes para alunos PCD, com TDAH/TEA, ou que precisem de apoio adicional. Pense em DUA — múltiplas formas de representação, expressão e engajamento.
              </div>
              <Field label="♿ Diferenciação / Inclusão" value={card.diferenciacao ?? ""} onChange={(v) => upd({ diferenciacao: v })} rows={5} />
              <ListField label="Extensões / desdobramentos" icon="🚀" items={card.extensoes ?? []} onChange={(v) => upd({ extensoes: v })} />
            </>
          )}

          {tab === "recursos" && (
            <ListField label="Materiais necessários" icon="🧰" items={card.materiais ?? []} onChange={(v) => upd({ materiais: v })} />
          )}
        </div>

        {/* FOOTER (sticky) */}
        <div style={{ padding: "12px 22px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", gap: 8, background: "#fff" }}>
          <button onClick={onDelete}
            style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #FCA5A5", color: "#B91C1C", background: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 12.5 }}>
            <X size={13} style={{ verticalAlign: -2, marginRight: 4 }} /> Excluir
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onRegen}
              style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid var(--line)", background: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <RefreshCw size={13} /> Regenerar com Sofia
            </button>
            <button onClick={onClose}
              style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "var(--orange, #F97316)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Check size={13} /> Concluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
