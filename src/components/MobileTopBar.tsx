import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/admin/useIsAdmin";
import logoImg from "@/assets/agilizaprof-logo.webp";

/**
 * MobileTopBar — visible only on mobile (≤820px).
 * Fixed top bar with logo and hamburger that opens a full-height drawer
 * mirroring the desktop AppSidebar navigation. Mounted globally from
 * src/routes/__root.tsx so every authenticated page gets it without
 * touching individual page layouts.
 */

// CSS for MobileTopBar lives in src/styles.css (global) so it survives SSR
// and benefits from the same processing pipeline as the rest of the app.

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
    clearLocalAppData();
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    setOpen(false);
    navigate({ to: "/auth" });
  };
  return (
    <>
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
