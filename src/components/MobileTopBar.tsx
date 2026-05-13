import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/admin/useIsAdmin";
import logoImg from "@/assets/agilizaprof-logo.jpg";

/**
 * MobileTopBar — visible only on mobile (≤820px).
 * Fixed top bar with logo and hamburger that opens a full-height drawer
 * mirroring the desktop AppSidebar navigation. Mounted globally from
 * src/routes/__root.tsx so every authenticated page gets it without
 * touching individual page layouts.
 */

export const mobileTopBarCss = `
.mtb-spacer{display:none;}
@media(max-width:820px){
  .mtb-spacer{display:block;height:56px;}
  body{overflow-x:hidden;}
}
.mtb-bar{
  display:none;position:fixed;top:0;left:0;right:0;z-index:80;height:56px;
  background:linear-gradient(180deg,#1B2A4E 0%,#0F1B36 100%);color:#fff;
  padding:0 14px;align-items:center;gap:12px;
  box-shadow:0 2px 12px rgba(15,27,54,.18);
}
@media(max-width:820px){.mtb-bar{display:flex;}}
.mtb-logo{display:flex;align-items:center;gap:8px;color:#fff;text-decoration:none;flex:1;min-width:0;}
.mtb-logo img{width:32px;height:32px;border-radius:8px;object-fit:cover;flex-shrink:0;}
.mtb-logo-text{font-family:'Fraunces',serif;font-weight:900;font-size:15px;letter-spacing:-0.02em;}
.mtb-logo-text span{color:#FF7A45;}
.mtb-burger{
  width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;
  border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);
  color:#fff;cursor:pointer;transition:background .15s;flex-shrink:0;
}
.mtb-burger:hover{background:rgba(255,255,255,.12);}
.mtb-overlay{
  position:fixed;inset:0;background:rgba(15,27,54,.55);z-index:90;
  opacity:0;pointer-events:none;transition:opacity .2s;
}
.mtb-overlay.open{opacity:1;pointer-events:auto;}
.mtb-drawer{
  position:fixed;top:0;left:0;bottom:0;z-index:100;
  width:min(86vw,320px);background:linear-gradient(180deg,#1B2A4E 0%,#0F1B36 100%);
  color:#fff;transform:translateX(-100%);transition:transform .22s ease-out;
  display:flex;flex-direction:column;overflow:hidden;
}
.mtb-drawer.open{transform:translateX(0);}
.mtb-drawer-head{
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08);
}
.mtb-close{
  width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;
  border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);
  color:#fff;cursor:pointer;
}
.mtb-nav{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:2px;}
.mtb-nav-label{
  font-size:10px;font-weight:800;color:rgba(255,255,255,.40);
  text-transform:uppercase;letter-spacing:.14em;padding:14px 12px 6px;
}
.mtb-link{
  display:flex;align-items:center;gap:12px;padding:12px;border-radius:10px;
  color:rgba(255,255,255,.78);font-weight:500;font-size:15px;text-decoration:none;
  min-height:44px;transition:background .15s;
}
.mtb-link:active,.mtb-link:hover{background:rgba(255,255,255,.08);color:#fff;}
.mtb-link.active{background:rgba(255,122,69,.16);color:#fff;font-weight:700;
  box-shadow:inset 0 0 0 1px rgba(255,122,69,.30);}
.mtb-link svg{width:18px;height:18px;flex-shrink:0;}
.mtb-link .badge{
  margin-left:auto;background:#FF7A45;color:#fff;font-size:10px;font-weight:800;
  padding:2px 8px;border-radius:100px;
}
`;

type Item = { to: string; label: ReactNode; icon: ReactNode; badge?: string };

const MAIN_ITEMS: Item[] = [
  { to: "/", label: "Página inicial", icon: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></> },
  { to: "/assistente", label: "Assistente IA", icon: <><circle cx="12" cy="12" r="6"/><path d="M12 2v3M12 19v3M5 12H2M22 12h-3"/></>, badge: "NOVO" },
  { to: "/planejamento", label: "Planejamento", icon: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></> },
  { to: "/relatorios", label: "Relatórios", icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></> },
  { to: "/inclusao", label: "Inclusão", icon: <><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></>, badge: "EXCLUSIVO" },
  { to: "/agenda", label: "Agenda escolar", icon: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></> },
];

const ACCOUNT_ITEMS: Item[] = [
  { to: "/configuracoes", label: "Configurações", icon: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></> },
];

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export function MobileTopBar() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (to: string) =>
    to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(to);

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    setOpen(false);
    navigate({ to: "/auth" });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: mobileTopBarCss }} />
      <div className="mtb-bar" role="banner">
        <Link to="/" className="mtb-logo" aria-label="Página inicial AgilizaProf">
          <img src={logoImg} alt="" />
          <span className="mtb-logo-text">Agiliza<span>Prof</span></span>
        </Link>
        <button
          type="button"
          className="mtb-burger"
          aria-label="Abrir menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Icon><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></Icon>
        </button>
      </div>
      <div className="mtb-spacer" aria-hidden="true" />

      <div
        className={"mtb-overlay" + (open ? " open" : "")}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={"mtb-drawer" + (open ? " open" : "")}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
      >
        <div className="mtb-drawer-head">
          <div className="mtb-logo">
            <img src={logoImg} alt="" />
            <span className="mtb-logo-text">Agiliza<span>Prof</span></span>
          </div>
          <button
            type="button"
            className="mtb-close"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          >
            <Icon><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Icon>
          </button>
        </div>
        <nav className="mtb-nav" aria-label="Navegação principal">
          <span className="mtb-nav-label">Sua sala</span>
          {MAIN_ITEMS.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              className={"mtb-link" + (isActive(it.to) ? " active" : "")}
            >
              <Icon>{it.icon}</Icon>
              <span>{it.label}</span>
              {it.badge ? <span className="badge">{it.badge}</span> : null}
            </Link>
          ))}
          <span className="mtb-nav-label">Conta</span>
          {ACCOUNT_ITEMS.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              className={"mtb-link" + (isActive(it.to) ? " active" : "")}
            >
              <Icon>{it.icon}</Icon>
              <span>{it.label}</span>
            </Link>
          ))}
          <button type="button" className="mtb-link" onClick={handleLogout}>
            <Icon><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></Icon>
            <span>Sair</span>
          </button>
          {isAdmin && (
            <Link
              to="/admin"
              className={"mtb-link" + (isActive("/admin") ? " active" : "")}
              style={{ color: "#FF7A45", fontWeight: 700, marginTop: 8 }}
            >
              <Icon><path d="M12 2l2.9 6.9L22 10l-5.5 4.7L18.2 22 12 18.3 5.8 22l1.7-7.3L2 10l7.1-1.1z"/></Icon>
              <span>Admin</span>
            </Link>
          )}
        </nav>
      </aside>
    </>
  );
}

export default MobileTopBar;