import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clearLocalAppData } from "@/lib/persist/clearLocalData";
import { useIsAdmin } from "@/lib/admin/useIsAdmin";
import { useSofiaContext } from "@/lib/sofia/sofiaContext";
import { useSofiaOptional } from "@/components/sofia/SofiaProvider";
import { initialsFromName } from "@/lib/mockData";

// Visual "Painel": tokens, logo do lápis, menu do topo (computador) e
// barra de baixo (celular). Usado pelas páginas já redesenhadas.

export const painelTokensCss = `
.pn{--pn-bg:#EDF0F5;--pn-surface:#FFFFFF;--pn-ink:#14161F;--pn-muted:#596074;--pn-line:#D6DBE5;
  --pn-green:#0B7A55;--pn-green-soft:#CDEFE2;--pn-sun:#FFB224;--pn-coral:#F2604B;--pn-sky:#3D8BFD;
  --pn-lilac:#C9BDFF;--pn-pink:#FFD3CC;--pn-cream:#FFE2A8;--pn-blue-soft:#D7E6FF;
  --pn-display:'Sora','Segoe UI',system-ui,sans-serif;--pn-body:'DM Sans','Segoe UI',system-ui,sans-serif;
  background:var(--pn-bg);color:var(--pn-ink);font-family:var(--pn-body);-webkit-font-smoothing:antialiased;}
.pn *{box-sizing:border-box;}
.pn-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:44px;padding:0 16px;border-radius:12px;
  border:2px solid var(--pn-ink);box-shadow:3px 3px 0 var(--pn-ink);background:var(--pn-surface);color:var(--pn-ink);
  font-family:var(--pn-body);font-weight:700;font-size:15px;cursor:pointer;text-decoration:none;transition:transform .12s,box-shadow .12s;}
.pn-btn:hover{transform:translate(-1px,-1px);box-shadow:4px 4px 0 var(--pn-ink);}
.pn-btn:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--pn-ink);}
.pn-btn:disabled{opacity:.55;cursor:default;transform:none;box-shadow:3px 3px 0 var(--pn-ink);}
.pn-btn.primary{background:var(--pn-green);color:#fff;}
.pn-btn.ink{background:var(--pn-ink);color:#fff;box-shadow:3px 3px 0 var(--pn-sun);}
.pn-btn svg{width:18px;height:18px;flex-shrink:0;}
.pn :focus-visible{outline:3px solid var(--pn-sky);outline-offset:2px;}
@media (prefers-reduced-motion: reduce){.pn-btn{transition:none;}}
`;

const navCss = `
.pn-top{position:sticky;top:0;z-index:40;height:64px;background:var(--pn-surface);border-bottom:1.5px solid var(--pn-line);}
.pn-top-in{height:100%;max-width:1280px;margin:0 auto;display:flex;align-items:center;gap:28px;padding:0 24px;}
.pn-brand{display:inline-flex;align-items:center;gap:8px;text-decoration:none;color:var(--pn-ink);font-family:var(--pn-display);font-weight:800;font-size:20px;letter-spacing:-.04em;}
.pn-brand b{color:var(--pn-green);font-weight:800;}
.pn-links{display:flex;gap:22px;height:100%;}
.pn-links a{height:100%;display:flex;align-items:center;text-decoration:none;font-weight:500;font-size:15px;color:var(--pn-muted);border-bottom:3px solid transparent;}
.pn-links a:hover{color:var(--pn-ink);}
.pn-links a[aria-current="page"]{color:var(--pn-ink);font-weight:700;border-bottom-color:var(--pn-green);}
.pn-right{margin-left:auto;position:relative;display:flex;align-items:center;gap:10px;}
.pn-av{width:40px;height:40px;border-radius:10px;background:var(--pn-sun);border:2px solid var(--pn-ink);display:flex;align-items:center;justify-content:center;
  font-family:var(--pn-display);font-weight:800;font-size:14px;color:var(--pn-ink);cursor:pointer;}
.pn-menu{position:absolute;right:0;top:calc(100% + 8px);min-width:220px;background:var(--pn-surface);border:2px solid var(--pn-ink);border-radius:14px;
  box-shadow:4px 4px 0 var(--pn-ink);padding:6px;display:flex;flex-direction:column;}
.pn-menu a,.pn-menu button{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:9px;border:0;background:none;text-align:left;
  font-family:var(--pn-body);font-size:14.5px;font-weight:600;color:var(--pn-ink);text-decoration:none;cursor:pointer;}
.pn-menu a:hover,.pn-menu button:hover{background:var(--pn-bg);}
.pn-menu hr{border:0;border-top:1.5px solid var(--pn-line);margin:4px 0;}
.pn-bottom{display:none;}
/* Sofia flutuante no visual Painel (computador) */
body:has(.pn-bottom) .sofia-fab-pulse{display:none!important;}
body:has(.pn-bottom) .sofia-fab{background:#0B7A55!important;border:2px solid #14161F!important;box-shadow:3px 3px 0 #14161F!important;}
/* Com o PainelNav, o botão da Sofia fica na barra inferior no celular */
@media(max-width:860px){
  body:has(.pn-bottom) .sofia-fab{display:none!important;}
  body:has(.pn-bottom) .sofia-bubble{bottom:96px!important;}
  body:has(.pn-bottom) .sofia-notif-fab{bottom:calc(84px + env(safe-area-inset-bottom,0px))!important;}
  body:has(.pn-bottom) .sofia-overlay,body:has(.pn-bottom) .sofia-drawer{top:0!important;}
}
.pn-sheet-bg{position:fixed;inset:0;z-index:60;background:rgba(20,22,31,.45);display:flex;align-items:flex-end;}
.pn-sheet{width:100%;background:var(--pn-bg);border-top:2px solid var(--pn-ink);border-radius:20px 20px 0 0;
  padding:16px max(16px,env(safe-area-inset-right,0px)) calc(16px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));max-height:80vh;overflow:auto;}
.pn-sheet h2{margin:0 0 12px;font-family:var(--pn-display);font-size:20px;letter-spacing:-.03em;}
.pn-sheet-list{display:flex;flex-direction:column;gap:8px;}
.pn-sheet-list a,.pn-sheet-list button{display:flex;align-items:center;gap:12px;padding:12px;background:var(--pn-surface);border:1.5px solid var(--pn-line);border-radius:14px;
  text-decoration:none;color:var(--pn-ink);font-family:var(--pn-body);font-weight:700;font-size:15px;text-align:left;cursor:pointer;}
.pn-sheet-list svg{width:20px;height:20px;}
@media (max-width: 860px){
  .pn-top{height:58px;}
  .pn-top-in{padding:0 16px;}
  .pn-links,.pn-right .pn-hide-m{display:none;}
  .pn-bottom{display:flex;gap:4px;position:fixed;z-index:50;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));padding:6px;
    background:var(--pn-surface);border:2px solid var(--pn-ink);border-radius:18px;box-shadow:3px 3px 0 var(--pn-ink);}
  .pn-bottom a,.pn-bottom button{flex:1;height:54px;border-radius:12px;border:0;background:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
    text-decoration:none;font-family:var(--pn-body);font-size:11.5px;font-weight:700;color:var(--pn-muted);cursor:pointer;}
  .pn-bottom a[aria-current="page"]{background:var(--pn-ink);color:#fff;}
  .pn-bottom .pn-sofia{flex:0 0 54px;background:var(--pn-green);color:#fff;}
  .pn-bottom svg{width:20px;height:20px;}
}
`;

function Svg({ children, w = 2.2 }: { children: ReactNode; w?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function PencilLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <rect x="10" y="40" width="12" height="22" rx="5" fill="#F2604B" />
      <rect x="20" y="40" width="10" height="22" fill="#3D8BFD" />
      <rect x="30" y="40" width="40" height="22" fill="#0B7A55" />
      <polygon points="70,40 92,51 70,62" fill="#FFB224" />
      <polygon points="85,47.5 92,51 85,54.5" fill="#14161F" />
      <line
        x1="14"
        y1="28"
        x2="44"
        y2="28"
        stroke="#14161F"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <line x1="6" y1="74" x2="32" y2="74" stroke="#14161F" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export const ICONS = {
  home: <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  cal: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  pen: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  menu: (
    <>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </>
  ),
  spark: <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />,
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  gift: (
    <>
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
    </>
  ),
  game: (
    <>
      <rect x="2" y="7" width="20" height="12" rx="4" />
      <line x1="7" y1="11" x2="7" y2="15" />
      <line x1="5" y1="13" x2="9" y2="13" />
    </>
  ),
  check: (
    <>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </>
  ),
  star: <path d="M12 2l2.9 6.9L22 10l-5.5 4.7L18.2 22 12 18.3 5.8 22l1.7-7.3L2 10l7.1-1.1z" />,
  out: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </>
  ),
};

const LINKS: Array<{ to: string; label: string; exact?: boolean }> = [
  { to: "/", label: "Início", exact: true },
  { to: "/minha-sala", label: "Minha sala" },
  { to: "/planejamento", label: "Planejar" },
  { to: "/relatorios", label: "Pareceres" },
  { to: "/inclusao", label: "Inclusão" },
  { to: "/agenda", label: "Agenda" },
  { to: "/jogos", label: "Jogos" },
  { to: "/simulados", label: "Simulados" },
];

export function PainelNav() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const ctx = useSofiaContext();
  const sofia = useSofiaOptional();
  const nome = (ctx.user?.nome || "").trim();
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenu(false);
    setSheet(false);
  }, [loc.pathname]);
  useEffect(() => {
    if (!menu && !sheet) return;
    const onDoc = (e: MouseEvent) => {
      if (menu && ref.current && !ref.current.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        setSheet(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu, sheet]);

  const active = (to: string, exact?: boolean) =>
    exact ? loc.pathname === to : loc.pathname.startsWith(to);
  const cur = (to: string, exact?: boolean) => (active(to, exact) ? ("page" as const) : undefined);

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
    <>
      <style dangerouslySetInnerHTML={{ __html: navCss }} />
      <header className="pn-top">
        <div className="pn-top-in">
          <Link to="/" className="pn-brand" aria-label="AgilizaProf, página inicial">
            <PencilLogo />
            <span>
              Agiliza<b>Prof</b>
            </span>
          </Link>
          <nav className="pn-links" aria-label="Navegação principal">
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} aria-current={cur(l.to, l.exact)}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="pn-right" ref={ref}>
            {sofia && (
              <button
                type="button"
                className="pn-btn primary pn-hide-m"
                style={{ height: 40, fontSize: 14 }}
                onClick={() => sofia.openSofia()}
              >
                Sofia
                <Svg w={2}>{ICONS.spark}</Svg>
              </button>
            )}
            <button
              type="button"
              className="pn-av"
              aria-label="Minha conta"
              aria-haspopup="menu"
              aria-expanded={menu}
              onClick={() => setMenu((v) => !v)}
              suppressHydrationWarning
            >
              {nome ? initialsFromName(nome) : "·"}
            </button>
            {menu && (
              <div className="pn-menu" role="menu">
                <Link to="/configuracoes" role="menuitem">
                  <Svg>{ICONS.gear}</Svg>Configurações
                </Link>
                <Link to="/indicacoes" role="menuitem">
                  <Svg>{ICONS.gift}</Svg>Indique e ganhe
                </Link>
                {isAdmin && (
                  <Link to="/admin" role="menuitem">
                    <Svg>{ICONS.star}</Svg>Administração
                  </Link>
                )}
                <hr />
                <button type="button" role="menuitem" onClick={sair}>
                  <Svg>{ICONS.out}</Svg>Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="pn-bottom" aria-label="Navegação principal">
        <Link to="/" aria-current={cur("/", true)}>
          <Svg>{ICONS.home}</Svg>Início
        </Link>
        <Link to="/planejamento" aria-current={cur("/planejamento")}>
          <Svg>{ICONS.cal}</Svg>Planejar
        </Link>
        <Link to="/relatorios" aria-current={cur("/relatorios")}>
          <Svg>{ICONS.pen}</Svg>Pareceres
        </Link>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={sheet}
          onClick={() => setSheet(true)}
        >
          <Svg>{ICONS.menu}</Svg>Mais
        </button>
        {sofia && (
          <button
            type="button"
            className="pn-sofia"
            aria-label="Falar com a Sofia"
            onClick={() => sofia.openSofia()}
          >
            <Svg w={2}>{ICONS.spark}</Svg>
          </button>
        )}
      </nav>

      {sheet && (
        <div className="pn-sheet-bg" onClick={() => setSheet(false)}>
          <div
            className="pn-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Mais opções"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Tudo do AgilizaProf</h2>
            <div className="pn-sheet-list">
              <Link to="/minha-sala">
                <Svg>{ICONS.users}</Svg>Minha sala
              </Link>
              <Link to="/inclusao">
                <Svg>{ICONS.users}</Svg>Inclusão
              </Link>
              <Link to="/inclusao/pei">
                <Svg>{ICONS.pen}</Svg>PEI / PDI
              </Link>
              <Link to="/agenda">
                <Svg>{ICONS.cal}</Svg>Agenda
              </Link>
              <Link to="/jogos">
                <Svg>{ICONS.game}</Svg>Jogos 2D
              </Link>
              <Link to="/simulados">
                <Svg>{ICONS.check}</Svg>Simulados
              </Link>
              <Link to="/configuracoes">
                <Svg>{ICONS.gear}</Svg>Configurações
              </Link>
              <Link to="/indicacoes">
                <Svg>{ICONS.gift}</Svg>Indique e ganhe
              </Link>
              {isAdmin && (
                <Link to="/admin">
                  <Svg>{ICONS.star}</Svg>Administração
                </Link>
              )}
              <button type="button" onClick={sair}>
                <Svg>{ICONS.out}</Svg>Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
