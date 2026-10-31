import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clearLocalAppData } from "@/lib/persist/clearLocalData";
import { useIsAdmin } from "@/lib/admin/useIsAdmin";
import { useSofiaContext } from "@/lib/sofia/sofiaContext";
import { initialsFromName } from "@/lib/mockData";
import logoImg from "@/assets/agilizaprof-logo.webp";

// Navegação no topo (substitui a barra lateral nas telas novas).
// No celular (≤820px) quem aparece é o MobileTopBar, renderizado no __root.

/** Paleta nova, compartilhada pelas telas que usam o TopNav. */
export const novoTokensCss = `
.nv{
  --nv-bg:#F5F4EF;--nv-surface:#FFFFFF;--nv-line:#E7E5E4;--nv-line-2:#D6D3D1;
  --nv-ink:#1C1917;--nv-ink-2:#44403C;--nv-muted:#78716C;
  --nv-primary:#0F766E;--nv-primary-dark:#115E59;--nv-primary-soft:#E6F2EF;
  --nv-sun:#F2B33D;--nv-sun-soft:#FDF3DC;--nv-coral:#E8735A;--nv-coral-soft:#FCEBE6;
  --nv-sky:#2B7FB8;--nv-sky-soft:#E4F0F8;--nv-plum:#8E5BA8;--nv-plum-soft:#F2EAF6;
  --nv-radius:14px;
  --nv-shadow:0 1px 2px rgba(28,25,23,.04),0 4px 14px rgba(28,25,23,.05);
  --nv-heading:'Plus Jakarta Sans','Inter',-apple-system,sans-serif;
  background:var(--nv-bg);color:var(--nv-ink);font-family:'Inter',-apple-system,sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh;
}
`;

export const topNavCss = `
.tn{position:sticky;top:0;z-index:60;background:rgba(255,255,255,.92);backdrop-filter:saturate(1.4) blur(10px);border-bottom:1px solid #E7E5E4;font-family:'Inter',-apple-system,sans-serif;}
.tn-in{max-width:1200px;margin:0 auto;height:64px;padding:0 24px;display:flex;align-items:center;gap:28px;}
.tn-logo{display:flex;align-items:center;gap:10px;text-decoration:none;color:#1C1917;flex-shrink:0;}
.tn-logo img{width:34px;height:34px;border-radius:9px;object-fit:cover;}
.tn-logo span{font-family:'Plus Jakarta Sans','Inter',sans-serif;font-weight:800;font-size:17px;letter-spacing:-.02em;}
.tn-nav{display:flex;align-items:center;gap:2px;flex:1;min-width:0;}
.tn-link{display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 13px;border-radius:10px;font-size:14px;font-weight:500;color:#57534E;text-decoration:none;white-space:nowrap;transition:background .15s,color .15s;}
.tn-link svg{width:16px;height:16px;opacity:.85;}
.tn-link:hover{background:#F5F4EF;color:#1C1917;}
.tn-link.active{background:#E6F2EF;color:#0F766E;font-weight:600;}
.tn-right{display:flex;align-items:center;gap:10px;flex-shrink:0;position:relative;}
.tn-user{display:flex;align-items:center;gap:9px;height:40px;padding:0 10px 0 4px;border-radius:100px;border:1px solid #E7E5E4;background:#fff;cursor:pointer;font:inherit;color:#1C1917;transition:border-color .15s;}
.tn-user:hover,.tn-user[aria-expanded="true"]{border-color:#0F766E;}
.tn-user>svg{width:15px;height:15px;color:#78716C;}
.tn-av{flex-shrink:0;width:32px;height:32px;border-radius:50%;background:#0F766E;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;}
.tn-nm{font-size:13px;font-weight:600;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.tn-menu{position:absolute;right:0;top:48px;width:220px;background:#fff;border:1px solid #E7E5E4;border-radius:12px;box-shadow:0 12px 32px rgba(28,25,23,.12);padding:6px;display:flex;flex-direction:column;animation:tn-pop .14s ease-out;}
@keyframes tn-pop{from{opacity:0;transform:translateY(-4px);}to{opacity:1;transform:none;}}
.tn-menu a,.tn-menu button{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;font:inherit;font-size:13.5px;color:#44403C;text-decoration:none;background:none;border:0;cursor:pointer;text-align:left;}
.tn-menu a:hover,.tn-menu button:hover{background:#F5F4EF;color:#1C1917;}
.tn-menu svg{width:16px;height:16px;color:#78716C;}
.tn-menu hr{border:0;border-top:1px solid #E7E5E4;margin:5px 2px;}
@media(max-width:1060px){.tn-in{gap:14px;}.tn-nm{display:none;}.tn-link{padding:0 10px;}}
@media(max-width:820px){.tn{display:none;}}
`;

const Svg = ({ children }: { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {children}
  </svg>
);

const NAV: Array<{ to: string; label: string; icon: ReactNode; exact?: boolean }> = [
  {
    to: "/",
    label: "Início",
    exact: true,
    icon: (
      <>
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    ),
  },
  {
    to: "/planejamento",
    label: "Planejamento",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ),
  },
  {
    to: "/relatorios",
    label: "Relatórios",
    icon: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </>
    ),
  },
  {
    to: "/inclusao",
    label: "Inclusão",
    icon: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
    ),
  },
  {
    to: "/agenda",
    label: "Agenda",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
  },
  {
    to: "/assistente",
    label: "Sofia",
    icon: (
      <>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M8 9h8M8 13h5" />
      </>
    ),
  },
];

export function TopNav() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const ctx = useSofiaContext();
  const nome = (ctx.user?.nome || "").trim();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (to: string, exact?: boolean) =>
    exact ? loc.pathname === to : loc.pathname.startsWith(to);

  const sair = async () => {
    clearLocalAppData();
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    navigate({ to: "/auth" });
  };

  return (
    <header className="tn">
      <style dangerouslySetInnerHTML={{ __html: topNavCss }} />
      <div className="tn-in">
        <Link to="/" className="tn-logo" aria-label="AgilizaProf, página inicial">
          <img src={logoImg} alt="" />
          <span>AgilizaProf</span>
        </Link>
        <nav className="tn-nav" aria-label="Navegação principal">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={"tn-link" + (isActive(n.to, n.exact) ? " active" : "")}
              aria-current={isActive(n.to, n.exact) ? "page" : undefined}
            >
              <Svg>{n.icon}</Svg>
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="tn-right" ref={ref}>
          <button
            type="button"
            className="tn-user"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="tn-av" suppressHydrationWarning>
              {nome ? initialsFromName(nome) : "·"}
            </span>
            <span className="tn-nm" suppressHydrationWarning>
              {ctx.user?.primeiro_nome || "Minha conta"}
            </span>
            <Svg>
              <polyline points="6 9 12 15 18 9" />
            </Svg>
          </button>
          {open && (
            <div className="tn-menu" role="menu">
              <Link to="/minha-sala" role="menuitem">
                <Svg>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </Svg>
                Minha sala
              </Link>
              <Link to="/configuracoes" role="menuitem">
                <Svg>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
                </Svg>
                Configurações
              </Link>
              <Link to="/indicacoes" role="menuitem">
                <Svg>
                  <polyline points="20 12 20 22 4 22 4 12" />
                  <rect x="2" y="7" width="20" height="5" />
                  <line x1="12" y1="22" x2="12" y2="7" />
                </Svg>
                Indique e ganhe
              </Link>
              {isAdmin && (
                <Link to="/admin" role="menuitem">
                  <Svg>
                    <path d="M12 2l2.9 6.9L22 10l-5.5 4.7L18.2 22 12 18.3 5.8 22l1.7-7.3L2 10l7.1-1.1z" />
                  </Svg>
                  Admin
                </Link>
              )}
              <hr />
              <button type="button" role="menuitem" onClick={sair}>
                <Svg>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </Svg>
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
