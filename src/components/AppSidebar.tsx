import { Link } from "@tanstack/react-router";
import type React from "react";

export const sidebarCss = `
.ap-sidebar{background:linear-gradient(180deg,var(--primary,#1B2A4E) 0%,var(--primary-dark,#0F1B36) 100%);color:#fff;display:flex;flex-direction:column;position:relative;overflow:hidden;width:240px;flex-shrink:0;}
.ap-sidebar::before{content:"";position:absolute;top:-100px;right:-100px;width:300px;height:300px;background:radial-gradient(circle,rgba(255,122,69,.14) 0%,transparent 65%);border-radius:50%;pointer-events:none;}
.sb-head{padding:18px 18px 12px;display:flex;align-items:center;gap:10px;position:relative;z-index:1;}
.sb-logo-icon{width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,#FF7A45,#FF9466);display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-weight:900;font-size:17px;color:#fff;box-shadow:0 6px 18px rgba(255,122,69,.40);flex-shrink:0;}
.sb-logo-text{font-family:'Fraunces',serif;font-weight:900;font-size:16px;color:#fff;letter-spacing:-0.03em;line-height:1;}
.sb-logo-text span{color:#FF7A45;}
.sb-cmdk{margin:6px 14px 14px;padding:8px 11px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);border-radius:8px;display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,.55);cursor:pointer;transition:all .2s;position:relative;z-index:1;}
.sb-cmdk:hover{background:rgba(255,255,255,.10);border-color:rgba(255,255,255,.16);}
.sb-cmdk svg{width:13px;height:13px;flex-shrink:0;}
.sb-cmdk-shortcut{margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:10px;background:rgba(255,255,255,.10);padding:1px 6px;border-radius:4px;color:rgba(255,255,255,.70);font-weight:700;}
.sb-section-label{font-size:9.5px;font-weight:800;color:rgba(255,255,255,.36);text-transform:uppercase;letter-spacing:.14em;padding:8px 20px 6px;}
.sb-nav{padding:0 10px;flex:1;position:relative;z-index:1;display:flex;flex-direction:column;gap:1px;}
.sb-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:7px;color:rgba(255,255,255,.74);font-weight:500;font-size:13px;width:100%;text-align:left;transition:all .15s;position:relative;text-decoration:none;}
.sb-item:hover{background:rgba(255,255,255,.06);color:#fff;}
.sb-item.active{background:rgba(255,122,69,.13);color:#fff;font-weight:700;box-shadow:inset 0 0 0 1px rgba(255,122,69,.26);}
.sb-item.active::before{content:"";position:absolute;left:-10px;top:50%;transform:translateY(-50%);width:3px;height:18px;background:#FF7A45;border-radius:0 3px 3px 0;}
.sb-icon{width:15px;height:15px;flex-shrink:0;stroke-width:2;}
.sb-badge{margin-left:auto;background:#FF7A45;color:#fff;font-size:9px;font-weight:800;padding:1.5px 6px;border-radius:100px;line-height:1.4;}
.sb-shortcut{margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:9.5px;color:rgba(255,255,255,.40);font-weight:600;}
.sb-foot{padding:12px;position:relative;z-index:1;border-top:1px solid rgba(255,255,255,.06);margin-top:8px;}
.sb-bruna{display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);margin-bottom:10px;transition:background .2s;cursor:pointer;}
.sb-bruna:hover{background:rgba(255,255,255,.08);}
.sb-bruna-avatar{width:32px;height:32px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,#FF7A45,#FF9466);display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-weight:800;color:#fff;font-size:13px;border:2px solid rgba(255,255,255,.14);}
.sb-bruna-text{flex:1;min-width:0;}
.sb-bruna-name{font-size:11.5px;font-weight:700;color:#fff;line-height:1.2;}
.sb-bruna-role{font-size:10px;color:rgba(255,255,255,.55);margin-top:1px;}
.sb-bruna-badge{font-size:8.5px;font-weight:800;color:#FF7A45;background:rgba(255,122,69,.14);padding:2px 5px;border-radius:4px;text-transform:uppercase;letter-spacing:.06em;display:inline-block;margin-top:3px;}
.sb-version{font-size:10px;color:rgba(255,255,255,.30);text-align:center;font-family:'JetBrains Mono',monospace;font-weight:600;}
@media(max-width:1100px){.ap-sidebar{width:72px;}.sb-logo-text,.sb-cmdk,.sb-section-label,.sb-shortcut,.sb-badge,.sb-bruna-text,.sb-version,.sb-item span:not(.sb-shortcut):not(.sb-badge){display:none;}.sb-head{justify-content:center;padding:16px 8px;}.sb-item{justify-content:center;}.sb-bruna{justify-content:center;}}
@media(max-width:820px){.ap-sidebar{display:none;}}
`;

const Svg = ({ c, ...rest }: { c: React.ReactNode } & React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...rest}>{c}</svg>
);

export type SidebarKey = "home" | "assistant" | "planning" | "reports" | "inclusion" | "agenda";

export function AppSidebar({ active, onCmdK }: { active: SidebarKey; onCmdK?: () => void }) {
  const cls = (k: SidebarKey) => "sb-item" + (active === k ? " active" : "");
  return (
    <aside className="ap-sidebar">
      <div className="sb-head">
        <div className="sb-logo-icon">A</div>
        <div className="sb-logo-text">Agiliza<span>Prof</span></div>
      </div>
      <button className="sb-cmdk" onClick={onCmdK} aria-label="Buscar ou navegar">
        <Svg c={<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>} />
        <span>Buscar ou ir para...</span>
        <span className="sb-cmdk-shortcut">⌘K</span>
      </button>
      <div className="sb-section-label">Sua sala</div>
      <nav className="sb-nav">
        <Link to="/" className={cls("home")} aria-label="Página inicial">
          <Svg className="sb-icon" c={<><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>} />
          <span>Página inicial</span><span className="sb-shortcut">H</span>
        </Link>
        <Link to="/assistente" className={cls("assistant")} aria-label="Assistente IA">
          <Svg className="sb-icon" c={<><path d="M12 2v3"/><path d="M12 19v3"/><circle cx="12" cy="12" r="6"/><path d="M5 12H2"/><path d="M22 12h-3"/></>} />
          <span>Assistente IA</span><span className="sb-badge">NOVO</span>
        </Link>
        <button className={cls("planning")} aria-label="Planejamento">
          <Svg className="sb-icon" c={<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></>} />
          <span>Planejamento</span><span className="sb-shortcut">P</span>
        </button>
        <button className={cls("reports")} aria-label="Relatórios">
          <Svg className="sb-icon" c={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>} />
          <span>Relatórios</span><span className="sb-shortcut">R</span>
        </button>
        <button className={cls("inclusion")} aria-label="Inclusão">
          <Svg className="sb-icon" c={<><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></>} />
          <span>Inclusão</span><span className="sb-shortcut">I</span>
        </button>
        <button className={cls("agenda")} aria-label="Agenda escolar">
          <Svg className="sb-icon" c={<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></>} />
          <span>Agenda escolar</span>
        </button>
        <div className="sb-section-label" style={{ marginTop: 12 }}>Conta</div>
        <button className="sb-item" aria-label="Configurações">
          <Svg className="sb-icon" c={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>} />
          <span>Configurações</span>
        </button>
        <button className="sb-item" aria-label="Sair">
          <Svg className="sb-icon" c={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>} />
          <span>Sair</span>
        </button>
      </nav>
    </aside>
  );
}