import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
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
    label: "Dar acesso Pro",
    icon: "M12 2l2.9 6.9L22 10l-5.5 4.7L18.2 22 12 18.3 5.8 22l1.7-7.3L2 10l7.1-1.1z",
  },
  { to: "/admin/atividades", label: "O que acontece agora", icon: "M22 12h-4l-3 9L9 3l-3 9H2" },
  { to: "/admin/conversao", label: "Quem virou cliente", icon: "M22 12A10 10 0 1 1 12 2v10z" },
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
  { to: "/admin/infra", label: "Saúde do sistema", icon: "M2 12h6l3-9 4 18 3-9h4" },
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
    label: "Quem volta",
    icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0",
  },
  { to: "/admin/funil", label: "Caminho do usuário", icon: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z" },
];

// As 13 telas ficam em 5 grupos. No topo aparecem só os grupos; dentro de
// cada grupo, as telas viram abas menores.
const GROUPS: { label: string; icon: string; items: string[] }[] = [
  { label: "Visão geral", icon: navItems[0].icon, items: ["/admin"] },
  { label: "Pessoas", icon: navItems[1].icon, items: ["/admin/usuarios", "/admin/pro"] },
  {
    label: "Vendas",
    icon: "M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
    items: ["/admin/conversao", "/admin/funil", "/admin/retencao", "/admin/cupons"],
  },
  {
    label: "Uso e IA",
    icon: "M22 12h-4l-3 9L9 3l-3 9H2",
    items: ["/admin/atividades", "/admin/ia"],
  },
  {
    label: "Sistema",
    icon: "M2 12h6l3-9 4 18 3-9h4",
    items: ["/admin/infra", "/admin/erros", "/admin/storage", "/admin/manutencao"],
  },
];

function isActive(to: string, path: string) {
  return to === "/admin" ? path === "/admin" || path === "/admin/" : path.startsWith(to);
}

// No celular cada linha de tabela vira um cartão. Para isso cada célula
// recebe o nome da sua coluna (data-label), lido do cabeçalho da tabela.
function useRotulosDeTabela(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const aplicar = () => {
      root.querySelectorAll("table").forEach((t) => {
        const heads = Array.from(t.querySelectorAll("thead th")).map((th) =>
          (th.textContent || "").replace(/[^\p{L}\p{N})]+$/u, "").trim(),
        );
        if (!heads.length) return;
        t.classList.add("ad-rt");
        t.querySelectorAll("tbody tr").forEach((tr) => {
          Array.from(tr.children).forEach((td, i) => {
            const el = td as HTMLElement;
            if ((el as HTMLTableCellElement).colSpan > 1) el.setAttribute("data-full", "1");
            else if (heads[i] && el.getAttribute("data-label") !== heads[i])
              el.setAttribute("data-label", heads[i]);
          });
        });
      });
    };
    aplicar();
    const mo = new MutationObserver(aplicar);
    mo.observe(root, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [ref]);
}

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
  const bodyRef = useRef<HTMLDivElement>(null);
  useRotulosDeTabela(bodyRef);
  const subRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = subRef.current?.querySelector(".ad-sub-tab.active") as HTMLElement | null;
    const nav = subRef.current;
    if (el && nav) nav.scrollLeft = el.offsetLeft - nav.clientWidth / 2 + el.clientWidth / 2;
  }, [loc.pathname]);
  const grupo = GROUPS.find((g) => g.items.some((to) => isActive(to, loc.pathname))) ?? GROUPS[0];
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
        .ad-sub-tabs{display:flex;gap:6px;overflow-x:auto;padding:10px 24px 0;scrollbar-width:none;}
        .ad-sub-tabs::-webkit-scrollbar{display:none;}
        .ad-sub-tab{flex:none;height:32px;display:inline-flex;align-items:center;padding:0 12px;border-radius:99px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;
          color:#596074;text-decoration:none;white-space:nowrap;border:1.5px solid transparent;}
        .ad-sub-tab:hover{color:#14161F;}
        .ad-sub-tab.active{background:#CDEFE2;border-color:#0B7A55;color:#064E36;}
        .ad-body .ad-card{overflow:hidden;}
        .ad-body .ad-card > table,.ad-body .ad-card > div > table{max-width:100%;}
        .ad-body input,.ad-body select,.ad-body textarea{max-width:100%;min-width:0;}
        @media(max-width:860px){
          .ad-top{padding:16px 16px 0;}
          .ad-h1{font-size:26px;}
          .ad-tabs{padding:12px 16px 4px;}
          .ad-body{padding:14px 16px 120px;}
          .ad-row > *{min-width:0 !important;flex:1 1 140px !important;}
          .ad-sub-tabs{padding:10px 16px 0;}
        }
        @media(max-width:640px){
          .ad-h1{font-size:24px;}
          .ad-card{padding:14px;}
          .ad-tabs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;overflow:visible;}
          .ad-tab{height:auto;min-height:54px;flex-direction:column;justify-content:center;gap:3px;padding:6px 2px;font-size:11px;text-align:center;white-space:normal;line-height:1.15;}
          .ad-tab svg{width:17px;height:17px;}
          .ad-body [style*="grid-template-columns"]{grid-template-columns:minmax(0,1fr) !important;}
          .ad-body .ad-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr)) !important;gap:10px;}
          .ad-stat{padding:12px;}
          .ad-stat-val{font-size:22px;}
          .ad-stat-label{font-size:10px;letter-spacing:.05em;}
          .ad-table-wrap{overflow:visible;}
          .ad-table-wrap .ad-table{min-width:0;}
          table.ad-rt,table.ad-rt tbody,table.ad-rt tr,table.ad-rt td{display:block;width:100% !important;}
          table.ad-rt thead{display:none;}
          table.ad-rt tr{border:1.5px solid #E5E9F2;border-radius:12px;padding:8px 10px;margin:0 0 10px;background:#fff;}
          table.ad-rt tr:hover td{background:none;}
          table.ad-rt td{border:0;padding:5px 0;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;text-align:right;overflow-wrap:anywhere;min-width:0;}
          table.ad-rt td::before{content:attr(data-label);flex:none;max-width:45%;text-align:left;font-size:10.5px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.05em;padding-top:2px;}
          table.ad-rt td[data-full]{display:block;text-align:center;}
          table.ad-rt td[data-full]::before{content:none;}
          table.ad-rt td > *{min-width:0;}
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
          {GROUPS.map((g) => (
            <Link
              key={g.label}
              to={g.items[0]}
              activeProps={{}}
              className={"ad-tab" + (g === grupo ? " active" : "")}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d={g.icon} />
              </svg>
              <span>{g.label}</span>
            </Link>
          ))}
        </nav>
        {grupo.items.length > 1 && (
          <nav ref={subRef} className="ad-sub-tabs" aria-label={`Telas de ${grupo.label}`}>
            {grupo.items.map((to) => {
              const it = navItems.find((n) => n.to === to);
              if (!it) return null;
              return (
                <Link
                  key={to}
                  to={to}
                  activeProps={{}}
                  className={"ad-sub-tab" + (isActive(to, loc.pathname) ? " active" : "")}
                >
                  {it.label}
                </Link>
              );
            })}
          </nav>
        )}
        <div className="ad-body" ref={bodyRef}>
          {children}
        </div>
      </main>
    </div>
  );
}
