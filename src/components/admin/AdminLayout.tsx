import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PainelNav } from "@/components/painel/PainelNav";

const navItems = [
  {
    to: "/admin",
    label: "Visão geral",
    icon: "M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 9h8V3h-8z",
  },
  {
    to: "/admin/usuarios",
    label: "Usuários",
    icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  },
  {
    to: "/admin/pro",
    label: "Gestão Pro",
    icon: "M12 2l2.9 6.9L22 10l-5.5 4.7L18.2 22 12 18.3 5.8 22l1.7-7.3L2 10l7.1-1.1z",
  },
  { to: "/admin/atividades", label: "Atividades", icon: "M22 12h-4l-3 9L9 3l-3 9H2" },
  { to: "/admin/conversao", label: "Conversão", icon: "M22 12A10 10 0 1 1 12 2v10z" },
  {
    to: "/admin/cupons",
    label: "Cupons",
    icon: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z M7 7h.01",
  },
  {
    to: "/admin/manutencao",
    label: "Manutenção",
    icon: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  },
  {
    to: "/admin/erros",
    label: "Erros",
    icon: "M12 9v4 M12 17h.01 M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
  },
  { to: "/admin/infra", label: "Infra", icon: "M2 12h6l3-9 4 18 3-9h4" },
  {
    to: "/admin/ia",
    label: "Consumo IA",
    icon: "M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z M5 13v1a7 7 0 0 0 14 0v-1 M12 21v-3",
  },
  {
    to: "/admin/storage",
    label: "Storage",
    icon: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  },
  {
    to: "/admin/retencao",
    label: "Retenção",
    icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0",
  },
  { to: "/admin/funil", label: "Funil", icon: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z" },
];

export function AdminLayout({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  const loc = useLocation();
  return (
    <div className="pn" style={{ minHeight: "100vh", background: "#EDF0F5" }}>
      <style>{`
        .ad-main{max-width:1280px;margin:0 auto;min-width:0;}
        .ad-top{padding:22px 24px 0;}
        .ad-h1{font-family:'Sora',sans-serif;font-weight:800;font-size:32px;color:#14161F;margin:0;letter-spacing:-.045em;line-height:1.1;}
        .ad-sub{font-family:'DM Sans',sans-serif;color:#6B7280;font-size:13px;margin-top:4px;}
        .ad-body{padding:18px 24px 120px;}
        .ad-card{background:#fff;border:1.5px solid #D6DBE5;border-radius:16px;padding:18px;min-width:0;}
        .ad-card h3{font-family:'Sora',serif;font-weight:700;font-size:15px;color:#14161F;margin:0 0 12px;}
        .ad-stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;}
        .ad-stat{background:#fff;border:1.5px solid #D6DBE5;border-radius:16px;padding:16px;min-width:0;}
        .ad-stat-label{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:.08em;}
        .ad-stat-val{font-family:'Sora',serif;font-weight:800;font-size:28px;color:#14161F;margin-top:6px;line-height:1.1;letter-spacing:-.02em;}
        .ad-stat-hint{font-family:'DM Sans',sans-serif;font-size:11px;color:#6B7280;margin-top:4px;}
        .ad-stat-accent{color:#0B7A55;}
        .ad-table{width:100%;border-collapse:collapse;font-family:'DM Sans',sans-serif;font-size:13px;}
        .ad-table th{text-align:left;padding:10px 12px;background:#EDF0F5;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #E5E9F2;}
        .ad-table td{padding:11px 12px;border-bottom:1px solid #F1F2F7;color:#1F2937;}
        .ad-table tr:hover td{background:#FAFBFE;}
        .ad-table-wrap{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;}
        .ad-table-wrap .ad-table{min-width:680px;}
        .ad-badge{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:100px;font-size:10.5px;font-weight:700;}
        .ad-badge.pro{background:#0B7A55;color:#fff;}
        .ad-badge.free{background:#E5E9F2;color:#475569;}
        .ad-badge.err{background:#FEE2E2;color:#991B1B;}
        .ad-badge.warn{background:#FEF3C7;color:#92400E;}
        .ad-badge.ok{background:#DCFCE7;color:#166534;}
        .ad-input,.ad-select{width:100%;padding:9px 11px;border:1.5px solid #D6DBE5;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:13px;background:#fff;}
        .ad-input:focus,.ad-select:focus{outline:none;border-color:#0B7A55;box-shadow:0 0 0 3px rgba(11,122,85,.15);}
        .ad-btn{background:#0B7A55;color:#fff;border:2px solid #14161F;box-shadow:2px 2px 0 #14161F;padding:8px 14px;border-radius:10px;font-family:'DM Sans',sans-serif;font-weight:700;font-size:13px;cursor:pointer;transition:.15s;}
        .ad-btn:hover{background:#096746;}
        .ad-btn.ghost{background:#fff;color:#14161F;border:2px solid #14161F;}
        .ad-btn.ghost:hover{background:#EDF0F5;color:#14161F;}
        .ad-btn.danger{background:#DC2626;}
        .ad-btn.danger:hover{background:#B91C1C;}
        .ad-row{display:flex;gap:10px;align-items:end;flex-wrap:wrap;}
        .ad-field{display:flex;flex-direction:column;gap:5px;}
        .ad-field label{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.06em;}
        .ad-bar{height:8px;border-radius:4px;background:#E5E9F2;overflow:hidden;}
        .ad-bar > div{height:100%;background:linear-gradient(90deg,#0B7A55,#0B7A55);}

        .ad-tabs{display:flex;gap:8px;overflow-x:auto;padding:16px 24px 4px;scrollbar-width:none;-webkit-overflow-scrolling:touch;}
        .ad-tabs::-webkit-scrollbar{display:none;}
        .ad-tab{flex:none;display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 12px;border-radius:10px;background:#fff;border:1.5px solid #D6DBE5;
          color:#14161F;font-family:'DM Sans',sans-serif;font-size:13.5px;font-weight:700;text-decoration:none;white-space:nowrap;}
        .ad-tab:hover{border-color:#14161F;}
        .ad-tab.active{background:#14161F;border-color:#14161F;color:#fff;}
        .ad-tab svg{width:15px;height:15px;}
        .ad-eyebrow{display:inline-flex;align-items:center;height:26px;padding:0 10px;border-radius:8px;background:#FFB224;border:1.5px solid #14161F;font-family:'DM Sans',sans-serif;font-size:11.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;}
        .ad-stat-grid{grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));}
        @media(max-width:860px){
          .ad-top{padding:16px 16px 0;}
          .ad-h1{font-size:26px;}
          .ad-tabs{padding:12px 16px 4px;}
          .ad-body{padding:14px 16px 120px;}
          .ad-row > *{min-width:0;flex:1 1 140px;}
        }
      `}</style>
      <PainelNav />
      <main className="ad-main">
        <div className="ad-top">
          <span className="ad-eyebrow">Administração</span>
          <h1 className="ad-h1" style={{ marginTop: 10 }}>
            {title}
          </h1>
          {subtitle && <p className="ad-sub">{subtitle}</p>}
        </div>
        <nav className="ad-tabs" aria-label="Seções da administração">
          {navItems.map((it) => {
            const active =
              it.to === "/admin" ? loc.pathname === "/admin" : loc.pathname.startsWith(it.to);
            return (
              <Link key={it.to} to={it.to} className={"ad-tab" + (active ? " active" : "")}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={it.icon} />
                </svg>
                <span>{it.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="ad-body">{children}</div>
      </main>
    </div>
  );
}
