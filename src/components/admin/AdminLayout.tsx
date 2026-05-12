import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import logoImg from "@/assets/agilizaprof-logo.jpg";

const navItems = [
  { to: "/admin", label: "Visão geral", icon: "M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 9h8V3h-8z" },
  { to: "/admin/usuarios", label: "Usuários", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" },
  { to: "/admin/pro", label: "Gestão Pro", icon: "M12 2l2.9 6.9L22 10l-5.5 4.7L18.2 22 12 18.3 5.8 22l1.7-7.3L2 10l7.1-1.1z" },
  { to: "/admin/atividades", label: "Atividades", icon: "M22 12h-4l-3 9L9 3l-3 9H2" },
  { to: "/admin/conversao", label: "Conversão", icon: "M22 12A10 10 0 1 1 12 2v10z" },
  { to: "/admin/manutencao", label: "Manutenção", icon: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" },
  { to: "/admin/erros", label: "Erros", icon: "M12 9v4 M12 17h.01 M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" },
  { to: "/admin/infra", label: "Infra", icon: "M2 12h6l3-9 4 18 3-9h4" },
];

export function AdminLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  const loc = useLocation();
  return (
    <div style={{ minHeight:"100vh", background:"#F4F6FB", display:"flex" }}>
      <style>{`
        .ad-sb{width:240px;background:linear-gradient(180deg,#1B2A4E 0%,#0F1B36 100%);color:#fff;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;flex-shrink:0;}
        .ad-sb-head{padding:18px;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(255,255,255,.06);}
        .ad-sb-logo{width:34px;height:34px;border-radius:9px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#1B2A4E;}
        .ad-sb-logo img{width:100%;height:100%;object-fit:cover;display:block;}
        .ad-sb-title{font-family:'Fraunces',serif;font-weight:800;font-size:14px;line-height:1.1}
        .ad-sb-tag{font-size:9px;font-weight:800;color:#FF7A45;letter-spacing:.12em;text-transform:uppercase;}
        .ad-nav{padding:14px 10px;display:flex;flex-direction:column;gap:2px;flex:1;}
        .ad-link{display:flex;align-items:center;gap:11px;padding:9px 12px;border-radius:8px;color:rgba(255,255,255,.74);font-family:'Inter',sans-serif;font-size:13px;font-weight:500;text-decoration:none;transition:.15s;}
        .ad-link:hover{background:rgba(255,255,255,.06);color:#fff;}
        .ad-link.active{background:rgba(255,122,69,.16);color:#fff;font-weight:700;box-shadow:inset 0 0 0 1px rgba(255,122,69,.3);}
        .ad-link svg{width:15px;height:15px;}
        .ad-foot{padding:14px 12px;border-top:1px solid rgba(255,255,255,.06);}
        .ad-back{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:8px;background:rgba(255,255,255,.06);color:#fff;font-size:12px;font-weight:600;text-decoration:none;}
        .ad-back:hover{background:rgba(255,122,69,.18);}
        .ad-main{flex:1;display:flex;flex-direction:column;min-width:0;}
        .ad-top{padding:24px 32px 18px;background:#fff;border-bottom:1px solid #E5E9F2;}
        .ad-h1{font-family:'Fraunces',serif;font-weight:800;font-size:26px;color:#0F1B36;margin:0;letter-spacing:-.02em;}
        .ad-sub{font-family:'Inter',sans-serif;color:#6B7280;font-size:13px;margin-top:4px;}
        .ad-body{padding:24px 32px;flex:1;overflow:auto;}
        .ad-card{background:#fff;border:1px solid #E5E9F2;border-radius:14px;padding:18px;}
        .ad-card h3{font-family:'Fraunces',serif;font-weight:700;font-size:15px;color:#0F1B36;margin:0 0 12px;}
        .ad-stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;}
        .ad-stat{background:#fff;border:1px solid #E5E9F2;border-radius:14px;padding:16px;}
        .ad-stat-label{font-family:'Inter',sans-serif;font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:.08em;}
        .ad-stat-val{font-family:'Fraunces',serif;font-weight:800;font-size:28px;color:#0F1B36;margin-top:6px;line-height:1.1;letter-spacing:-.02em;}
        .ad-stat-hint{font-family:'Inter',sans-serif;font-size:11px;color:#6B7280;margin-top:4px;}
        .ad-stat-accent{color:#FF7A45;}
        .ad-table{width:100%;border-collapse:collapse;font-family:'Inter',sans-serif;font-size:13px;}
        .ad-table th{text-align:left;padding:10px 12px;background:#F4F6FB;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #E5E9F2;}
        .ad-table td{padding:11px 12px;border-bottom:1px solid #F1F2F7;color:#1F2937;}
        .ad-table tr:hover td{background:#FAFBFE;}
        .ad-badge{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:100px;font-size:10.5px;font-weight:700;}
        .ad-badge.pro{background:linear-gradient(135deg,#FF7A45,#FFB07A);color:#fff;}
        .ad-badge.free{background:#E5E9F2;color:#475569;}
        .ad-badge.err{background:#FEE2E2;color:#991B1B;}
        .ad-badge.warn{background:#FEF3C7;color:#92400E;}
        .ad-badge.ok{background:#DCFCE7;color:#166534;}
        .ad-input,.ad-select{width:100%;padding:9px 11px;border:1px solid #D1D5DB;border-radius:8px;font-family:'Inter',sans-serif;font-size:13px;background:#fff;}
        .ad-input:focus,.ad-select:focus{outline:none;border-color:#FF7A45;box-shadow:0 0 0 3px rgba(255,122,69,.15);}
        .ad-btn{background:#FF7A45;color:#fff;border:none;padding:9px 16px;border-radius:8px;font-family:'Inter',sans-serif;font-weight:700;font-size:13px;cursor:pointer;transition:.15s;}
        .ad-btn:hover{background:#EA580C;}
        .ad-btn.ghost{background:transparent;color:#475569;border:1px solid #D1D5DB;}
        .ad-btn.ghost:hover{background:#F4F6FB;color:#0F1B36;}
        .ad-btn.danger{background:#DC2626;}
        .ad-btn.danger:hover{background:#B91C1C;}
        .ad-row{display:flex;gap:10px;align-items:end;flex-wrap:wrap;}
        .ad-field{display:flex;flex-direction:column;gap:5px;}
        .ad-field label{font-family:'Inter',sans-serif;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.06em;}
        .ad-bar{height:8px;border-radius:4px;background:#E5E9F2;overflow:hidden;}
        .ad-bar > div{height:100%;background:linear-gradient(90deg,#FF7A45,#FF9466);}
        @media(max-width:820px){.ad-sb{display:none}.ad-top,.ad-body{padding-left:16px;padding-right:16px}}
      `}</style>
      <aside className="ad-sb">
        <div className="ad-sb-head">
          <div className="ad-sb-logo"><img src={logoImg} alt="AgilizaProf" /></div>
          <div>
            <div className="ad-sb-title">AgilizaProf</div>
            <div className="ad-sb-tag">Admin</div>
          </div>
        </div>
        <nav className="ad-nav">
          {navItems.map(it => {
            const active = it.to === "/admin" ? loc.pathname === "/admin" : loc.pathname.startsWith(it.to);
            return (
              <Link key={it.to} to={it.to} className={"ad-link" + (active ? " active" : "")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={it.icon}/></svg>
                <span>{it.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="ad-foot">
          <Link to="/" className="ad-back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Voltar para o app
          </Link>
        </div>
      </aside>
      <main className="ad-main">
        <div className="ad-top">
          <h1 className="ad-h1">{title}</h1>
          {subtitle && <p className="ad-sub">{subtitle}</p>}
        </div>
        <div className="ad-body">{children}</div>
      </main>
    </div>
  );
}