import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AppSidebar } from "@/components/AppSidebar";
import { EmptyState, emptyStateCss } from "@/components/EmptyState";
import { useUser, greeting } from "@/lib/mockData";

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
.sb-plan-btn{margin-top:6px;display:inline-flex;align-items:center;gap:4px;background:var(--accent);color:#fff;padding:4px 8px;border-radius:7px;font-size:10px;font-weight:700;border:none;cursor:pointer;}
.sb-plan-btn:hover{filter:brightness(1.05);}
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
.ap-root .hero-cta{display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,#FF7A45,#FF9466) !important;color:#fff !important;border:none;border-radius:11px;padding:13px 20px;font-size:14px;font-weight:800;box-shadow:0 12px 28px rgba(255,122,69,.35);transition:all .25s;}
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
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px;}
.stat{background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;transition:all .2s;cursor:pointer;}
.stat:hover{border-color:var(--primary-soft);box-shadow:var(--shadow-md);transform:translateY(-1px);}
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
.card-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:12px;flex-wrap:wrap;}
.card-title{font-family:'Fraunces',serif;font-weight:800;font-size:16px;color:var(--primary);display:flex;align-items:center;gap:9px;}
.card-title-count{background:var(--primary-soft);color:var(--primary);font-size:10px;font-weight:800;padding:2.5px 8px;border-radius:100px;font-family:'Inter',sans-serif;}
.card-link{font-size:11.5px;font-weight:700;color:var(--accent);display:inline-flex;align-items:center;gap:4px;transition:gap .2s;}
.card-link:hover{gap:7px;}
.card-link svg{width:11px;height:11px;}
.filter-pills{display:flex;gap:4px;background:var(--bg-soft);padding:3px;border-radius:8px;}
.filter-pill{padding:5px 11px;border-radius:6px;font-size:11px;font-weight:700;color:var(--text-soft);transition:all .15s;display:inline-flex;align-items:center;gap:5px;}
.filter-pill.active{background:#fff;color:var(--primary);box-shadow:var(--shadow-sm);}
.filter-pill .count{font-size:9.5px;background:var(--primary-soft);color:var(--primary);padding:1px 5px;border-radius:100px;font-weight:800;}
.filter-pill.active .count{background:var(--accent-soft);color:var(--accent);}
.class-group{margin-bottom:10px;}
.class-group:last-child{margin-bottom:0;}
.class-head{display:flex;align-items:center;gap:10px;padding:8px 11px;background:var(--bg-soft);border-radius:8px;cursor:pointer;transition:background .15s;}
.class-head:hover{background:var(--primary-soft);}
.class-toggle{width:16px;height:16px;display:flex;align-items:center;justify-content:center;color:var(--text-soft);transition:transform .2s;}
.class-toggle.collapsed{transform:rotate(-90deg);}
.class-info{flex:1;min-width:0;}
.class-name{font-size:12.5px;font-weight:800;color:var(--primary);line-height:1.2;}
.class-meta{font-size:10.5px;color:var(--text-soft);margin-top:2px;}
.class-count{font-size:10px;font-weight:700;color:var(--text-soft);background:#fff;border:1px solid var(--border);padding:2.5px 8px;border-radius:100px;}
.student{display:flex;align-items:center;gap:11px;padding:9px 11px;margin-top:4px;border-radius:8px;transition:background .15s;border:1px solid transparent;}
.student:hover{background:var(--bg-soft);border-color:var(--border-soft);}
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
.viral-strip{background:linear-gradient(135deg,#fff,var(--accent-soft));border:1px solid #FFD9BF;border-radius:14px;padding:14px 18px;display:flex;align-items:center;gap:14px;margin-bottom:18px;}
.viral-icon{width:42px;height:42px;border-radius:11px;flex-shrink:0;background:linear-gradient(135deg,var(--accent),var(--accent-warm));display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-accent);font-size:19px;}
.viral-content{flex:1;min-width:0;}
.viral-title{font-size:13px;font-weight:800;color:var(--text);line-height:1.3;}
.viral-title strong{color:var(--accent-deep);}
.viral-sub{font-size:11.5px;color:var(--text-soft);margin-top:2px;}
.viral-action{display:inline-flex;align-items:center;gap:6px;background:#fff;color:var(--accent-deep);border:1px solid #FFD9BF;padding:9px 14px;border-radius:9px;font-size:12px;font-weight:800;flex-shrink:0;transition:all .2s;}
.viral-action:hover{background:var(--accent);color:#fff;border-color:var(--accent);}
.viral-action svg{width:12px;height:12px;}
.authorize{background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:12px;}
.authorize-icon{width:34px;height:34px;border-radius:9px;background:var(--bg-soft);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;}
.authorize-content{flex:1;min-width:0;}
.authorize-title{font-size:12.5px;font-weight:700;color:var(--text);line-height:1.3;}
.authorize-sub{font-size:11px;color:var(--text-soft);margin-top:2px;}
.toggle-switch{position:relative;width:36px;height:20px;border-radius:100px;background:#CBD5E1;cursor:pointer;transition:background .25s;flex-shrink:0;}
.toggle-switch::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.20);transition:transform .25s;}
.toggle-switch.on{background:var(--accent);}
.toggle-switch.on::after{transform:translateX(16px);}
.cmdk-overlay{position:fixed;inset:0;background:rgba(15,27,54,.55);backdrop-filter:blur(6px);display:none;align-items:flex-start;justify-content:center;padding-top:120px;z-index:100;}
.cmdk-overlay.show{display:flex;}
.cmdk{width:100%;max-width:560px;background:#fff;border-radius:14px;box-shadow:0 25px 60px rgba(15,27,54,.40);overflow:hidden;border:1px solid var(--border);}
.cmdk-input{width:100%;padding:16px 18px;border:none;border-bottom:1px solid var(--border);font-size:15px;font-family:inherit;color:var(--text);outline:none;}
.cmdk-list{padding:8px;max-height:380px;overflow-y:auto;}
.cmdk-section{font-size:10px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:.10em;padding:8px 12px 4px;}
.cmdk-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;font-size:13px;color:var(--text);cursor:pointer;transition:background .12s;}
.cmdk-item:hover,.cmdk-item.active{background:var(--bg-soft);}
.cmdk-item svg{width:14px;height:14px;color:var(--text-soft);}
.cmdk-item-shortcut{margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted);font-weight:600;}
.school-modal{width:100%;max-width:480px;background:#fff;border-radius:16px;box-shadow:0 25px 60px rgba(15,27,54,.40);overflow:hidden;border:1px solid var(--border);}
.school-modal-head{padding:18px 20px 12px;border-bottom:1px solid var(--border-soft);display:flex;align-items:flex-start;gap:12px;}
.school-modal-icon{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--accent),var(--accent-warm));display:grid;place-items:center;color:#fff;flex-shrink:0;}
.school-modal-icon svg{width:18px;height:18px;}
.school-modal-title{font-family:'Fraunces',serif;font-weight:700;font-size:18px;color:var(--text);line-height:1.2;}
.school-modal-sub{font-size:12px;color:var(--text-soft);margin-top:3px;}
.school-modal-close{margin-left:auto;width:28px;height:28px;border-radius:8px;border:1px solid var(--border);background:#fff;display:grid;place-items:center;color:var(--text-soft);cursor:pointer;}
.school-modal-close:hover{border-color:var(--primary);color:var(--primary);}
.school-modal-body{padding:16px 20px;display:flex;flex-direction:column;gap:12px;}
.school-field{display:flex;flex-direction:column;gap:5px;}
.school-field label{font-size:11.5px;font-weight:700;color:var(--text);text-transform:uppercase;letter-spacing:.04em;}
.school-field input,.school-field select{padding:10px 12px;border:1px solid var(--border);border-radius:9px;font-size:13.5px;font-family:inherit;color:var(--text);background:#fff;outline:none;transition:border .15s;}
.school-field input:focus,.school-field select:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(255,122,69,.15);}
.school-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.school-modal-foot{padding:14px 20px;border-top:1px solid var(--border-soft);display:flex;align-items:center;gap:10px;background:var(--bg-soft);}
.school-cancel{margin-left:auto;padding:9px 14px;border-radius:9px;border:1px solid var(--border);background:#fff;font-size:13px;font-weight:700;color:var(--text-soft);cursor:pointer;}
.school-cancel:hover{border-color:var(--primary);color:var(--primary);}
.ap-root .school-save{padding:9px 16px;border-radius:9px;border:none !important;background:linear-gradient(135deg,#FF7A45,#FF9466) !important;color:#fff !important;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 8px 18px rgba(255,122,69,.45);display:inline-flex;align-items:center;gap:6px;}
.ap-root .school-save:hover{filter:brightness(1.05);}
.school-clickable{cursor:pointer;transition:transform .15s, box-shadow .15s;}
.school-clickable:hover{transform:translateY(-2px);box-shadow:var(--shadow-md);}
@media(max-width:1200px){.hero{grid-template-columns:1fr;gap:22px;padding:24px;}.stats{grid-template-columns:1fr 1fr;}.grid-2{grid-template-columns:1fr;}}
@media(max-width:900px){.ap-app{grid-template-columns:1fr;}.ap-sidebar{display:none;}.ap-main{padding:18px;}}
@media(max-width:560px){.hero{padding:20px 18px;}.hero-title{font-size:26px;}.hero-metric-value{font-size:42px;}.stats{grid-template-columns:1fr;}.today-focus{flex-direction:column;align-items:flex-start;}.today-focus-action{width:100%;justify-content:center;}}
`;

const Svg = ({ c, ...rest }: { c: React.ReactNode } & React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {c}
  </svg>
);

function useCountUp(target: number, duration = 1500) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const step = Math.max(10, Math.floor(duration / target));
    let cur = 0;
    const t = setInterval(() => {
      cur++;
      setV(cur);
      if (cur >= target) clearInterval(t);
    }, step);
    return () => clearInterval(t);
  }, [target, duration]);
  return v;
}

export function Dashboard() {
  const user = useUser();
  const heroGreeting = greeting(user.name);
  const [cmdk, setCmdk] = useState(false);
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [schools, setSchools] = useState<Array<{ name: string; network: string; stage: string; city: string; uf: string; classes: string }>>([]);
  const baseSchools = 0;
  const [classOpen, setClassOpen] = useState(false);
  const [classes, setClasses] = useState<Array<{ name: string; school: string; grade: string; shift: string; students: string }>>([]);
  const baseClasses = 0;
  const [studentOpen, setStudentOpen] = useState(false);
  const [students, setStudents] = useState<Array<{ name: string; classRef: string; birth: string; pcd: string; notes: string }>>([]);
  const baseStudents = 0;
  const [authorize, setAuthorize] = useState(false);
  const [filter, setFilter] = useState<"all" | "pcd" | "reg">("all");
  const totalSchools = baseSchools + schools.length;
  const totalClasses = baseClasses + classes.length;
  const totalStudents = baseStudents + students.length;
  const documentsGenerated = user.documentsGenerated;
  const h = user.hoursSavedWeek;
  const m = user.minutesSavedWeek;
  const onboardingDone = totalClasses > 0 && totalStudents > 0 && documentsGenerated > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdk(true); }
      if (e.key === "Escape") setCmdk(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="ap-root">
      <style dangerouslySetInnerHTML={{ __html: css + emptyStateCss }} />
      <div className="ap-app">
        <AppSidebar active="home" onCmdK={() => setCmdk(true)} />

        <main className="ap-main">
          <div className="topbar">
            <div style={{ display: "flex", alignItems: "center" }}>
              <div className="crumbs">
                <strong>Sua sala</strong>
                <Svg strokeWidth={2.5} c={<polyline points="9 18 15 12 9 6"/>} />
                <span>Página inicial</span>
              </div>
              <div className="streak-pill">🔥 <span className="num">12</span> dias seguidos</div>
            </div>
            <div className="topbar-actions">
              <button className="icon-action" aria-label="Buscar" onClick={() => setCmdk(true)}>
                <Svg c={<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>} />
              </button>
              <button className="icon-action" aria-label="Notificações">
                <Svg c={<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>} />
                <span className="notif-dot" />
              </button>
              <button className="icon-action" aria-label="Ajuda">
                <Svg c={<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>} />
              </button>
              <div className="user-pill">
                <div className="user-avatar">CM</div>
                <div>
                  <div className="user-name">Camila M.</div>
                  <div className="user-plan">Plano Pro</div>
                </div>
              </div>
            </div>
          </div>

          <section className="hero">
            <div className="hero-left">
              <div className="hero-greet"><span className="live-dot" />Quinta-feira · 1º de maio · 08:12</div>
              <h1 className="hero-title">Bom dia, Camila.<br />Hoje você gera <span className="accent">3 pareceres em 12 minutos.</span></h1>
              <p className="hero-sub">Você tem <strong style={{ color: "#fff" }}>6 alunos</strong> em <strong style={{ color: "#fff" }}>2 turmas</strong> aguardando o relatório descritivo do bimestre. Vamos juntas?</p>
              <div className="hero-cta-row">
                <button className="hero-cta">
                  Começar pelos pareceres
                  <Svg strokeWidth={2.5} c={<path d="M5 12h14M13 5l7 7-7 7"/>} />
                </button>
                <button className="hero-cta-ghost">
                  <Svg strokeWidth={2.5} c={<polygon points="5 3 19 12 5 21 5 3"/>} />
                  Tutorial · 90s
                </button>
              </div>
            </div>
            <div className="hero-metric">
              <div className="hero-metric-tag">
                <Svg strokeWidth={2.5} c={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} />
                Tempo devolvido a você
              </div>
              <div className="hero-metric-value">
                <span>{h}</span>h<span className="hero-metric-unit"><span>{m}</span>min</span>
              </div>
              <div className="hero-metric-label">economizados nos últimos 7 dias</div>
              <div className="hero-metric-bar"><div className="hero-metric-fill" /></div>
              <div className="hero-metric-foot"><span>Meta: 10h</span><span><strong>+38%</strong> vs. semana passada</span></div>
            </div>
          </section>

          {!onboardingDone && (
            <div className="today-focus">
              <div className="today-focus-icon">
                <div className="today-focus-icon-inner">
                  <Svg c={<><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></>} />
                </div>
              </div>
              <div className="today-focus-content">
                <span className="today-focus-tag">✨ Bem-vinda · primeiros passos</span>
                <div className="today-focus-title">
                  ✅ Conta criada &nbsp;·&nbsp;
                  {totalClasses > 0 ? "✅" : "⬜"} Cadastrar primeira turma &nbsp;·&nbsp;
                  {totalStudents > 0 ? "✅" : "⬜"} Adicionar alunos &nbsp;·&nbsp;
                  {documentsGenerated > 0 ? "✅" : "⬜"} Conversar com a Sofia
                </div>
                <div className="today-focus-meta">
                  <span>Conclua os passos pra liberar todo o potencial da Sofia.</span>
                </div>
              </div>
            </div>
          )}

          <div className="stats">
            <button
              className="stat school-clickable"
              type="button"
              onClick={() => setSchoolOpen(true)}
              aria-label="Adicionar escola"
              style={{ textAlign: "left" }}
            >
              <div className="stat-icon s1"><Svg c={<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-5h-2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>} /></div>
              <div className="stat-body"><div className="stat-value">{baseSchools + schools.length} {schools.length > 0 && <span className="stat-value-trend">+{schools.length}</span>}</div><div className="stat-label">Escolas</div></div>
            </button>
            <button className="stat school-clickable" type="button" onClick={() => setClassOpen(true)} aria-label="Adicionar turma" style={{ textAlign: "left" }}>
              <div className="stat-icon s2"><Svg c={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>} /></div>
              <div className="stat-body"><div className="stat-value">{baseClasses + classes.length} {classes.length > 0 && <span className="stat-value-trend">+{classes.length}</span>}</div><div className="stat-label">Turmas ativas</div></div>
            </button>
            <button className="stat school-clickable" type="button" onClick={() => setStudentOpen(true)} aria-label="Adicionar aluno" style={{ textAlign: "left" }}>
              <div className="stat-icon s3"><Svg c={<><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></>} /></div>
              <div className="stat-body"><div className="stat-value">{baseStudents + students.length} {students.length > 0 && <span className="stat-value-trend">+{students.length}</span>}</div><div className="stat-label">Alunos</div></div>
            </button>
            <div className="stat">
              <div className="stat-icon s4"><Svg c={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>} /></div>
              <div className="stat-body"><div className="stat-value">23</div><div className="stat-label">Documentos gerados</div></div>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-head">
                <h3 className="card-title">Seus alunos<span className="card-title-count">6</span></h3>
                <div className="filter-pills">
                  <button className={`filter-pill ${filter==="all"?"active":""}`} onClick={() => setFilter("all")}>Todos <span className="count">6</span></button>
                  <button className={`filter-pill ${filter==="pcd"?"active":""}`} onClick={() => setFilter("pcd")}>PCD <span className="count">1</span></button>
                  <button className={`filter-pill ${filter==="reg"?"active":""}`} onClick={() => setFilter("reg")}>Regular <span className="count">5</span></button>
                </div>
              </div>

              <EmptyState
                icon="👥"
                title="Você ainda não cadastrou alunos."
                description="Crie sua primeira turma e cadastre os alunos para começar a usar a Sofia."
                ctaLabel="Cadastrar primeiro aluno"
                onCta={() => setStudentOpen(true)}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div className="card">
                <div className="card-head">
                  <h3 className="card-title">📈 Esta semana</h3>
                  <a href="#" className="card-link">Ver tudo<Svg strokeWidth={2.5} c={<path d="M5 12h14M13 5l7 7-7 7"/>} /></a>
                </div>
                <EmptyState
                  icon="📈"
                  title="Suas atividades aparecerão aqui conforme você usar a Sofia."
                />
              </div>

              <div className="card">
                <div className="card-head">
                  <h3 className="card-title">🗓️ Agenda</h3>
                  <a href="#" className="card-link">Abrir<Svg strokeWidth={2.5} c={<path d="M5 12h14M13 5l7 7-7 7"/>} /></a>
                </div>
                <div className="agenda-empty">
                  <div className="agenda-empty-icon">📭</div>
                  <div className="agenda-empty-title">Sua semana está livre</div>
                  <p className="agenda-empty-sub">Adicione provas, entregas e reuniões pra não esquecer.</p>
                  <button className="btn-add">
                    <Svg strokeWidth={2.5} c={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>} />
                    Adicionar evento
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="viral-strip">
            <div className="viral-icon">🎁</div>
            <div className="viral-content">
              <div className="viral-title">Convide outra professora e <strong>ganhe 1 mês grátis</strong> · ela também ganha 30 dias</div>
              <div className="viral-sub">Compartilhe seu link único com colegas que também sofrem com pareceres no fim do bimestre.</div>
            </div>
            <button className="viral-action">
              Compartilhar link
              <Svg strokeWidth={2.5} c={<><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></>} />
            </button>
          </div>

          <div className="authorize">
            <div className="authorize-icon">📝</div>
            <div className="authorize-content">
              <div className="authorize-title">Autorizar nome nos documentos gerados</div>
              <div className="authorize-sub">Seu nome será incluído como autor(a) nos relatórios e planejamentos exportados.</div>
            </div>
            <button className={`toggle-switch ${authorize ? "on" : ""}`} aria-label="Autorizar" onClick={() => setAuthorize(v => !v)} />
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
              <input id="school-name" name="name" placeholder="Ex.: EMEF CAIC" required />
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
          <form className="school-modal-body" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const name = String(fd.get("name") || "").trim();
            if (!name) return;
            setClasses((arr) => [...arr, {
              name,
              school: String(fd.get("school") || ""),
              grade: String(fd.get("grade") || ""),
              shift: String(fd.get("shift") || ""),
              students: String(fd.get("students") || ""),
            }]);
            (e.currentTarget as HTMLFormElement).reset();
            setClassOpen(false);
          }}>
            <div className="school-field">
              <label htmlFor="class-name">Nome da turma</label>
              <input id="class-name" name="name" placeholder="Ex.: 2º ano A" required />
            </div>
            <div className="school-field">
              <label htmlFor="class-school">Escola</label>
              <input id="class-school" name="school" placeholder="Ex.: EMEF CAIC" />
            </div>
            <div className="school-row">
              <div className="school-field">
                <label htmlFor="class-grade">Série / Ano</label>
                <select id="class-grade" name="grade" defaultValue="2">
                  {["1","2","3","4","5","6","7","8","9"].map((g) => <option key={g} value={g}>{g}º ano</option>)}
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

      <div className={`cmdk-overlay ${studentOpen ? "show" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) setStudentOpen(false); }}>
        <div className="school-modal" role="dialog" aria-label="Cadastrar aluno">
          <div className="school-modal-head">
            <div className="school-modal-icon">
              <Svg c={<><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></>} />
            </div>
            <div>
              <div className="school-modal-title">Cadastrar novo aluno</div>
              <div className="school-modal-sub">Adicione informações pra a Sofia personalizar relatórios.</div>
            </div>
            <button className="school-modal-close" aria-label="Fechar" onClick={() => setStudentOpen(false)}>
              <Svg c={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />
            </button>
          </div>
          <form className="school-modal-body" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const name = String(fd.get("name") || "").trim();
            if (!name) return;
            setStudents((arr) => [...arr, {
              name,
              classRef: String(fd.get("classRef") || ""),
              birth: String(fd.get("birth") || ""),
              pcd: String(fd.get("pcd") || "nao"),
              notes: String(fd.get("notes") || ""),
            }]);
            (e.currentTarget as HTMLFormElement).reset();
            setStudentOpen(false);
          }}>
            <div className="school-field">
              <label htmlFor="student-name">Nome completo</label>
              <input id="student-name" name="name" placeholder="Ex.: Maria Ribeiro" required />
            </div>
            <div className="school-row">
              <div className="school-field">
                <label htmlFor="student-class">Turma</label>
                <input id="student-class" name="classRef" placeholder="Ex.: 2º ano A · CAIC" />
              </div>
              <div className="school-field">
                <label htmlFor="student-birth">Data de nascimento</label>
                <input id="student-birth" name="birth" type="date" />
              </div>
            </div>
            <div className="school-field">
              <label htmlFor="student-pcd">PCD / laudo</label>
              <select id="student-pcd" name="pcd" defaultValue="nao">
                <option value="nao">Não</option>
                <option value="tdah">TDAH</option>
                <option value="tea">TEA</option>
                <option value="dislexia">Dislexia</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="school-field">
              <label htmlFor="student-notes">Observações pedagógicas</label>
              <input id="student-notes" name="notes" placeholder="Pontos fortes, atenção, etc." />
            </div>
            <div className="school-modal-foot" style={{ margin: "4px -20px -16px", borderRadius: 0 }}>
              <button type="button" className="school-cancel" onClick={() => setStudentOpen(false)}>Cancelar</button>
              <button type="submit" className="school-save">
                Salvar aluno
                <Svg width={14} height={14} c={<><polyline points="20 6 9 17 4 12"/></>} />
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className={`cmdk-overlay ${cmdk ? "show" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) setCmdk(false); }}>
        <div className="cmdk">
          <input className="cmdk-input" placeholder="O que você quer fazer? (ex: gerar parecer, adicionar aluno...)" autoComplete="off" autoFocus={cmdk} />
          <div className="cmdk-list">
            <div className="cmdk-section">Sugestões da IA</div>
            <div className="cmdk-item active">
              <Svg c={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>} />
              Gerar parecer descritivo da Tereza<span className="cmdk-item-shortcut">↵</span>
            </div>
            <div className="cmdk-item">
              <Svg c={<path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3"/>} />
              Adaptar atividade para Caio (TDAH)
            </div>
            <div className="cmdk-section">Ir para</div>
            <div className="cmdk-item">
              <Svg c={<rect x="3" y="4" width="18" height="18" rx="2"/>} />
              Planejamento<span className="cmdk-item-shortcut">G P</span>
            </div>
            <div className="cmdk-item">
              <Svg c={<><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></>} />
              Inclusão<span className="cmdk-item-shortcut">G I</span>
            </div>
            <div className="cmdk-section">Ações rápidas</div>
            <div className="cmdk-item">
              <Svg c={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>} />
              Cadastrar novo aluno<span className="cmdk-item-shortcut">N A</span>
            </div>
            <div className="cmdk-item">
              <Svg c={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>} />
              Importar lista de alunos (CSV)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
