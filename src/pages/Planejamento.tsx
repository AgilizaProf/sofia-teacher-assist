import React, { useState, useMemo, useRef, useEffect } from "react";
import { useSearch, useNavigate } from "@tanstack/react-router";
import {
  Sparkles, Plus, ChevronLeft, ChevronRight, RefreshCw, Check,
  Lock, GripVertical, Lightbulb, X, Clock, Copy, Move,
  Link2, MessageSquare, Send, Layers, BookOpen, Smile, Frown, ArrowRight, ArrowDownUp,
} from "lucide-react";
import { AppSidebar, sidebarCss } from "@/components/AppSidebar";
import { EmptyState, emptyStateCss } from "@/components/EmptyState";
import { SofiaContextChip } from "@/components/sofia/SofiaContextChip";
import { Header as AppHeader } from "@/components/Header";
import { usePersistentState } from "@/lib/persist/usePersistentState";
import { supabase } from "@/integrations/supabase/client";

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

.pl-tabbar{margin:18px 24px 0;background:linear-gradient(180deg,var(--primary) 0%,var(--primary-dark) 100%);border:1px solid var(--navy-darker);border-radius:11px;padding:5px;display:flex;align-items:center;gap:2px;flex-wrap:wrap;}
.pl-tab{flex:1;min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 12px;border-radius:8px;color:#fff !important;font-size:12.5px;font-weight:600;white-space:nowrap;border:1px solid transparent;transition:.15s;}
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
.pl-novo{animation:pl-highlight 1.6s ease-out;border-radius:8px;padding:2px 6px;margin:-2px -6px;}
.pl-badge-novo{animation:pl-blink 1.2s ease-in-out 2;}

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

const INITIAL_WEEK: Week = { seg: [], ter: [], qua: [], qui: [], sex: [] };

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

const TURMAS: Array<{ id: string; name: string; sub: string; pcd?: string; gain?: string; warn?: string }> = [];

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
    return scaleToTarget(limpos, opts.minutosAlvo);
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
  return scaleToTarget(out, opts.minutosAlvo);
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
    plan[dayKeys[d]] = scaleToTarget(cardsDoDia, opts.minutosPorDia);
  }
  return plan;
}

export function Planejamento() {
  const search = useSearch({ from: "/planejamento" }) as { m?: MKey };
  const navigate = useNavigate({ from: "/planejamento" });
  const [m, setM] = useState<MKey>(search.m || "m5");
  const [week, setWeek] = usePersistentState<Week>("plan_week", INITIAL_WEEK);
  const [dropDay, setDropDay] = useState<DayKey | null>(null);
  const dragCard = useRef<{ from: DayKey; id: string } | null>(null);
  const [picks, setPicks] = useState<Record<string, boolean>>({});
  const [tipOpen, setTipOpen] = useState(true);
  const [toast, setToast] = useState<{ msg: string; key: number } | null>(null);
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
    { m1: {}, m2: {}, m3: {}, m4: {}, m5: {}, m6: {} },
  );
  const ctxAtual: TurmaCtx = ctxByTab[m] ?? {};
  const setCtxAtual = (next: TurmaCtx) =>
    setCtxByTab((p) => ({ ...p, [m]: next }));

  // Turmas cadastradas no perfil
  const [turmasPerfil, setTurmasPerfil] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      const { data } = await supabase
        .from("profiles")
        .select("turmas")
        .eq("user_id", user.id)
        .maybeSingle();
      if (active && data?.turmas) setTurmasPerfil(data.turmas as string[]);
    })();
    return () => { active = false; };
  }, []);

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
  const m1Week = useMemo(() => {
    const today = new Date();
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
  }, [weekOffset]);

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
  const [layers, setLayers] = useState<Record<string, boolean>>({
    aulas: true, aval: true, eventos: true, feriados: true, bncc: false, sofia: true,
  });
  const toggleLayer = (k: string) => setLayers((s) => ({ ...s, [k]: !s[k] }));
  const [diary, setDiary] = usePersistentState<Record<string, "ok" | "warn" | "next" | undefined>>("plan_diary", {});

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
  const imprimirSequencia = () => setM2PrintOpen(true);
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
    setWeek((w) => {
      const card = w[d.from].find((c) => c.id === d.id); if (!card || card.locked) return w;
      return { ...w, [d.from]: w[d.from].filter((c) => c.id !== d.id), [to]: [...w[to], card] };
    });
    dragCard.current = null;
    showToast(`Cartão movido para ${to.toUpperCase()}. Sofia confirmou ausência de conflito. ✓`);
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
    <div className="pl-root">
      <style>{sidebarCss}</style>
      <style>{css}</style>
      <style>{emptyStateCss}</style>
      <div className="pl-app">
        <AppSidebar active="planning" />
        <div className="pl-main">
          <AppHeader
            breadcrumb={[{ label: "Sua sala" }, { label: "Planejamento" }, { label: cfg.crumb }]}
          />

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
                  <div><h2>Semana atual <small>· selecione uma turma</small></h2></div>
                  <div className="right">
                    <button className="pl-btn ghost"><ChevronLeft size={14} /> Anterior</button>
                    <button className="pl-btn ghost">Próxima <ChevronRight size={14} /></button>
                     <button
                       className="pl-btn"
                       onClick={() => navigate({ to: "/planejamento/atividade", search: {} })}
                     ><Plus size={14} /> Adicionar atividade</button>
                    <button className="pl-btn primary" onClick={() => showToast("Sofia está montando sugestões... ✨")}><Sparkles size={14} /> Gerar com Sofia</button>
                  </div>
                </div>

                <div className="pl-layout">
                  <div>
                    {TURMAS.length === 0 ? (
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
                                onClick={() => navigate({ to: "/planejamento/atividade", search: { dia: d.k } })}
                              ><Plus size={14} /></button>
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
                      {TURMAS.length === 0 && (
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
                    <button className="pl-btn ghost" onClick={limparSemanaM1} disabled={m1Stats.atividades === 0}><X size={14} /> Limpar</button>
                    <button className="pl-btn ghost" onClick={gerarComSofia} disabled={m1Generating}><RefreshCw size={14} /> Regenerar</button>
                    <button
                      className="pl-btn primary"
                      onClick={gerarComSofia}
                      disabled={m1Generating}
                    ><Sparkles size={14} /> {m1Generating ? "Sofia montando…" : (m1Stats.atividades === 0 ? "Gerar com a Sofia" : "Aceitar semana toda")}</button>
                  </div>
                </div>

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
                        const todayIso = new Date().toISOString().slice(0, 10);
                        const isToday = day.iso === todayIso;
                        const cards = m1Plan[day.k] || [];
                        return (
                          <div
                            key={day.k}
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
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ cursor: "grab" }}
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
                  <div><h2>Semana 11–15 abr <small>· {Object.values(layers).filter(Boolean).length} camada(s) ativa(s)</small></h2></div>
                  <div className="right">
                    <button className="pl-btn ghost"><ChevronLeft size={14} /> Anterior</button>
                    <button className="pl-btn ghost">Próxima <ChevronRight size={14} /></button>
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
                <div className="pl-week">
                  {DAYS.map((d) => {
                    type Item = { id: string; cat: "aulas" | "aval" | "eventos" | "feriados" | "bncc" | "sofia"; v: Variant; tag: string; title: string; meta: string };
                    const items: Item[] = [];
                    (week[d.k] || []).forEach((c) => {
                      if (c.v === "aval") items.push({ id: c.id, cat: "aval", v: "aval", tag: "AVALIAÇÃO", title: c.title, meta: c.meta });
                      else if (c.v === "esc") items.push({ id: c.id, cat: "eventos", v: "esc", tag: "EVENTO ESCOLA", title: c.title, meta: c.meta });
                      else items.push({ id: c.id, cat: "aulas", v: c.v, tag: c.tag, title: c.title, meta: c.meta });
                    });
                    const extras: Item[] = {
                      seg: [], ter: [], qua: [], qui: [], sex: [],
                    }[d.k] as Item[];
                    const visible = [...items, ...extras].filter((it) => layers[it.cat]);
                    return (
                      <div key={d.k} className="pl-day">
                        <div className="pl-day-head">
                          <div><div className="dn">{d.n}</div><div className="dd">{d.d}</div></div>
                        </div>
                        {visible.map((it) => (
                          <div key={it.id} className={"pl-card " + it.v + (it.cat === "sofia" ? " suggest-card" : "")}>
                            <div className="top"><span className="tag">{it.tag}</span></div>
                            <div className="ttl">{it.title}</div>
                            <div className="meta"><span>{it.meta}</span></div>
                          </div>
                        ))}
                        {visible.length === 0 && (
                          <div className="pl-empty-slot" style={{ minHeight: 80 }}>
                            <div>Nenhuma camada<br />ativa neste dia</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
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

            {m === "m6" && (
              <>
                <div className="pl-tools">
                  <div><h2>Diário de bordo <small>· hoje</small></h2></div>
                  <div className="right">
                    <button className="pl-btn primary"><Sparkles size={14} /> Resumo da semana</button>
                  </div>
                </div>
                <div className="pl-diary">
                  <div className="pl-diary-card">
                    <h3 style={{ fontSize: 16, marginBottom: 10 }}>Aulas de hoje</h3>
                    {M6_AULAS.length === 0 ? (
                      <EmptyState
                        icon="📓"
                        title="Nenhuma aula registrada hoje."
                        description="Após cada aula, marque funcionou / travou / próximo passo. A Sofia aprende com cada registro."
                      />
                    ) : (
                      M6_AULAS.map((a) => (
                        <div key={a.id} className="pl-diary-row">
                          <div>
                            <div className="ttl">{a.t}</div>
                            <div className="sub">{a.s}</div>
                          </div>
                          <div className="pl-mood">
                            <button className={"ok" + (diary[a.id] === "ok" ? " on" : "")} onClick={() => setDiary((d) => ({ ...d, [a.id]: "ok" }))} aria-label="Funcionou"><Smile size={16} /></button>
                            <button className={"warn" + (diary[a.id] === "warn" ? " on" : "")} onClick={() => setDiary((d) => ({ ...d, [a.id]: "warn" }))} aria-label="Travou"><Frown size={16} /></button>
                            <button className={"next" + (diary[a.id] === "next" ? " on" : "")} onClick={() => setDiary((d) => ({ ...d, [a.id]: "next" }))} aria-label="Próximo passo"><ArrowRight size={16} /></button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <aside className="pl-side">
                    <div className="pl-panel">
                      <h3><Clock size={14} /> Esta semana</h3>
                      <EmptyState icon="📊" title="Sem dados ainda." description="O resumo da semana aparece após os primeiros registros." />
                    </div>
                    <div className="pl-panel accent">
                      <h3><Sparkles size={14} /> Sugestão da Sofia</h3>
                      <p className="lead">Conforme você registra o que funcionou ou travou, a Sofia sugere ajustes para a próxima semana.</p>
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
          <button onClick={() => setToast(null)}>Desfazer</button>
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
    </div>
  );
}
