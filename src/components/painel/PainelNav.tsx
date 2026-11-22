import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clearLocalAppData } from "@/lib/persist/clearLocalData";
import { useIsAdmin } from "@/lib/admin/useIsAdmin";
import { useSofiaContext } from "@/lib/sofia/sofiaContext";
import { useSofiaOptional } from "@/components/sofia/SofiaProvider";
import { initialsFromName } from "@/lib/mockData";
import { InstalarApp } from "./InstalarApp";
import { useInstalarApp } from "@/lib/pwa/useInstalarApp";
import { WhatsappLogo, usePendentesWhatsapp } from "./whatsapp";

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
:root{--pn-bg:#EDF0F5;--pn-surface:#FFFFFF;--pn-ink:#14161F;--pn-muted:#596074;--pn-line:#D6DBE5;
  --pn-green:#0B7A55;--pn-green-soft:#CDEFE2;--pn-sun:#FFB224;--pn-coral:#F2604B;--pn-sky:#3D8BFD;
  --pn-lilac:#C9BDFF;--pn-pink:#FFD3CC;--pn-cream:#FFE2A8;--pn-blue-soft:#D7E6FF;
  --pn-display:'Sora','Segoe UI',system-ui,sans-serif;--pn-body:'DM Sans','Segoe UI',system-ui,sans-serif;}
.pn-top,.pn-bottom,.pn-sheet-bg{font-family:var(--pn-body);-webkit-font-smoothing:antialiased;}
.pn-top *,.pn-bottom *,.pn-sheet-bg *{box-sizing:border-box;}
.pn-indique{display:inline-flex;align-items:center;gap:7px;height:40px;padding:0 12px;border-radius:10px;background:var(--pn-sun);border:2px solid var(--pn-ink);
  box-shadow:2px 2px 0 var(--pn-ink);color:var(--pn-ink);text-decoration:none;font-family:var(--pn-body);font-weight:700;font-size:14px;white-space:nowrap;}
.pn-indique svg{width:17px;height:17px;}
.pn-indique:hover{transform:translate(-1px,-1px);box-shadow:3px 3px 0 var(--pn-ink);}
.pn-indique[aria-current="page"]{background:var(--pn-ink);color:#fff;}
.pn-wa{display:inline-flex;align-items:center;gap:7px;height:40px;padding:0 10px 0 12px;border-radius:10px;background:#D9FDD3;border:2px solid var(--pn-ink);
  box-shadow:2px 2px 0 var(--pn-ink);color:var(--pn-ink);text-decoration:none;font-family:var(--pn-body);font-weight:700;font-size:14px;white-space:nowrap;}
.pn-wa svg{color:#0B7A55;}
.pn-wa:hover{transform:translate(-1px,-1px);box-shadow:3px 3px 0 var(--pn-ink);}
.pn-wa[aria-current="page"]{background:var(--pn-green-soft);}
.pn-wa-n{min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:var(--pn-ink);color:#fff;font-size:12px;line-height:22px;text-align:center;font-variant-numeric:tabular-nums;}
.pn-wa-n.zero{background:#fff;color:var(--pn-muted);border:1.5px solid var(--pn-line);line-height:19px;}
.pn-sheet-list .pn-wa-n{margin-left:auto;}
@media (max-width: 1240px){.pn-wa .pn-wa-tx{display:none;}.pn-wa{padding:0 8px 0 10px;}}
/* Celular: só o logo com o número; em telas bem estreitas o atalho fica na folha "Mais" e no card do Início */
@media (max-width: 1080px){.pn-wa{position:relative;width:40px;padding:0;justify-content:center;}
  .pn-wa .pn-wa-n{position:absolute;top:-8px;right:-8px;min-width:20px;height:20px;line-height:20px;font-size:11px;padding:0 5px;}
  .pn-wa .pn-wa-n.zero{display:none;}}
@media (max-width: 420px){.pn-top .pn-wa{display:none;}}
.pn-top{position:sticky;top:0;z-index:40;height:64px;background:var(--pn-surface);border-bottom:1.5px solid var(--pn-line);}
.pn-top-in{height:100%;max-width:1280px;margin:0 auto;display:flex;align-items:center;gap:28px;padding:0 24px;}
.pn-brand{display:inline-flex;align-items:center;gap:8px;text-decoration:none;color:var(--pn-ink);font-family:var(--pn-display);font-weight:800;font-size:20px;letter-spacing:-.04em;}
.pn-brand b{color:var(--pn-green);font-weight:800;}
.pn-brand{white-space:nowrap;flex:none;}
.pn-indique svg{flex:none;}
.pn-links{display:flex;gap:22px;height:100%;}
.pn-links a{height:100%;display:flex;align-items:center;text-decoration:none;font-weight:500;font-size:15px;color:var(--pn-muted);border-bottom:3px solid transparent;}
.pn-links a:hover{color:var(--pn-ink);}
.pn-links a[aria-current="page"]{color:var(--pn-ink);font-weight:700;border-bottom-color:var(--pn-green);}
.pn-links a{white-space:nowrap;}
@media (max-width: 1360px){.pn-links{gap:16px;}.pn-links a{font-size:14px;}}
@media (max-width: 1240px){
  .pn-indique .pn-indique-tx{font-size:0;}
  .pn-indique .pn-indique-tx::after{content:"Indique";font-size:14px;}
}
@media (max-width: 1140px){.pn-links{gap:12px;}.pn-links a{font-size:13.5px;}}
.pn-right{margin-left:auto;position:relative;display:flex;align-items:center;gap:10px;}
/* Os botões da direita nunca encolhem nem se sobrepõem; se faltar espaço, quem cede são os links. */
.pn-right{flex:none;}
.pn-right > a,.pn-right > button{flex:none;white-space:nowrap;}
.pn-links{flex:0 1 auto;min-width:0;overflow:hidden;}
.pn-av{width:40px;height:40px;border-radius:10px;background:var(--pn-sun);border:2px solid var(--pn-ink);display:flex;align-items:center;justify-content:center;
  font-family:var(--pn-display);font-weight:800;font-size:14px;color:var(--pn-ink);cursor:pointer;}
.pn-menu{position:absolute;right:0;top:calc(100% + 8px);min-width:220px;background:var(--pn-surface);border:2px solid var(--pn-ink);border-radius:14px;
  box-shadow:4px 4px 0 var(--pn-ink);padding:6px;display:flex;flex-direction:column;}
.pn-menu a,.pn-menu button{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:9px;border:0;background:none;text-align:left;
  font-family:var(--pn-body);font-size:14.5px;font-weight:600;color:var(--pn-ink);text-decoration:none;cursor:pointer;}
.pn-menu a:hover,.pn-menu button:hover{background:var(--pn-bg);}
.pn-menu hr{border:0;border-top:1.5px solid var(--pn-line);margin:4px 0;}
.pn-menu svg{width:18px;height:18px;flex:none;}
.pn-menu a,.pn-menu button{white-space:nowrap;}
.pn-menu{width:max-content;max-width:calc(100vw - 24px);}
.pn-mais{flex:none;height:100%;display:flex;align-items:center;}
.pn-links a[hidden]{display:none;}
.pn-mais > button{height:100%;display:flex;align-items:center;gap:4px;border:0;background:none;padding:0;cursor:pointer;
  font-family:inherit;font-weight:500;font-size:15px;color:var(--pn-muted);border-bottom:3px solid transparent;white-space:nowrap;}
.pn-mais > button:hover,.pn-mais > button[aria-expanded="true"]{color:var(--pn-ink);}
.pn-mais > button.on{color:var(--pn-ink);font-weight:700;border-bottom-color:var(--pn-green);}
.pn-menu.pn-mais-menu{position:fixed;right:auto;z-index:60;}
@media (max-width: 1360px){.pn-mais > button{font-size:14px;}}
@media (max-width: 1140px){.pn-mais > button{font-size:13.5px;}}
.pn-bottom{display:none;}
/* Sofia flutuante no visual Painel (computador) */
body:has(.pn-bottom) .sofia-fab-pulse{display:none!important;}
body:has(.pn-bottom) .sofia-fab{background:#0B7A55!important;border:2px solid #14161F!important;box-shadow:3px 3px 0 #14161F!important;}
/* Com o PainelNav, o botão da Sofia fica na barra inferior no celular */
@media(max-width:1080px){
  body:has(.pn-bottom) .sofia-fab{display:none!important;}
  body:has(.pn-bottom) .sofia-bubble{bottom:96px!important;}
  body:has(.pn-bottom) .sofia-notif-fab{bottom:calc(84px + env(safe-area-inset-bottom,0px))!important;}
  body:has(.pn-bottom) .sofia-overlay,body:has(.pn-bottom) .sofia-drawer{top:0!important;}
}
.pn-sheet-bg{position:fixed;inset:0;z-index:60;background:rgba(20,22,31,.45);display:flex;align-items:flex-end;}
.pn-sheet{width:100%;background:var(--pn-bg);border-top:2px solid var(--pn-ink);border-radius:20px 20px 0 0;
  padding:16px max(16px,env(safe-area-inset-right,0px)) calc(16px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));max-height:80vh;overflow:auto;}
.pn-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px;}
.pn-sheet-x{width:44px;height:44px;flex:none;display:flex;align-items:center;justify-content:center;border-radius:12px;
  border:1.5px solid var(--pn-line);background:var(--pn-surface);color:var(--pn-ink);cursor:pointer;}
.pn-sheet-x svg{width:20px;height:20px;}
.pn-sheet-list .pn-sheet-sair{margin-top:12px;}
.pn-sheet h2{margin:0;font-family:var(--pn-display);font-size:20px;letter-spacing:-.03em;}
.pn-sheet-list{display:flex;flex-direction:column;gap:8px;}
.pn-sheet-list a,.pn-sheet-list button{display:flex;align-items:center;gap:12px;padding:12px;background:var(--pn-surface);border:1.5px solid var(--pn-line);border-radius:14px;
  text-decoration:none;color:var(--pn-ink);font-family:var(--pn-body);font-weight:700;font-size:15px;text-align:left;cursor:pointer;}
.pn-sheet-list svg{width:20px;height:20px;}
@media (max-width: 1080px){
  .pn-top{height:58px;}
  .pn-top-in{padding:0 16px;}
  .pn-links,.pn-mais,.pn-right .pn-hide-m{display:none;}
  .pn-indique{height:38px;padding:0 10px;font-size:13px;}
  .pn-wa{height:38px;}
  .pn-top-in{gap:12px;}
}
@media (max-width: 420px){
  .pn-indique .pn-indique-tx{font-size:0;}
  .pn-indique .pn-indique-tx::after{content:"Indique";font-size:13px;}
  .pn-brand{font-size:18px;}
  .pn-brand svg{width:30px;height:30px;}
}
@media (max-width: 1080px){
  .pn-bottom{display:flex;gap:4px;position:fixed;z-index:50;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));padding:6px;
    background:var(--pn-surface);border:2px solid var(--pn-ink);border-radius:18px;box-shadow:3px 3px 0 var(--pn-ink);}
  .pn-bottom a,.pn-bottom button{flex:1;height:54px;border-radius:12px;border:0;background:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
    text-decoration:none;font-family:var(--pn-body);font-size:12px;font-weight:700;color:var(--pn-muted);cursor:pointer;}
  .pn-bottom a[aria-current="page"]{background:var(--pn-ink);color:#fff;}
  .pn-bottom .pn-sofia{flex:0 0 54px;background:var(--pn-green);color:#fff;}
  .pn-bottom svg{width:20px;height:20px;}
}
@media (max-width: 350px){
  .pn-top-in{gap:8px;padding:0 12px;}
  .pn-brand{font-size:16px;gap:6px;}
  .pn-brand svg{width:26px;height:26px;}
  .pn-indique{padding:0 8px;gap:5px;}
  .pn-indique svg{width:15px;height:15px;}
  .pn-av{width:36px;height:36px;font-size:13px;}
  .pn-bottom{left:8px;right:8px;}
  .pn-bottom a,.pn-bottom button{font-size:10.5px;white-space:nowrap;}
  .pn-bottom .pn-sofia{flex:0 0 48px;}
}
@media (min-width: 821px) and (max-width: 1080px){body:has(.pn-bottom){padding-bottom:96px;}.pn-bottom{max-width:560px;margin:0 auto;}}
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
  phone: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <line x1="11" y1="18" x2="13" y2="18" />
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
  book: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </>
  ),
  shelf: (
    <>
      <rect x="3" y="3" width="4" height="18" rx="1" />
      <rect x="9" y="3" width="4" height="18" rx="1" />
      <path d="M15.5 4.5l3.9-1 2.6 16.4-3.9 1z" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  abc: (
    <>
      <path d="M3 17l3.5-9 3.5 9" />
      <line x1="4.3" y1="14" x2="8.7" y2="14" />
      <path d="M13 8v9h3.2a2.2 2.2 0 0 0 0-4.5H13" />
      <path d="M13 12.5h2.7a2.2 2.2 0 0 0 0-4.5H13" />
      <path d="M22 9.2A3.5 3.5 0 1 0 22 15.8" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </>
  ),
  layers: (
    <>
      <polygon points="12 3 22 8 12 13 2 8 12 3" />
      <polyline points="2 12.5 12 17.5 22 12.5" />
      <polyline points="2 17 12 22 22 17" />
    </>
  ),
  x: (
    <>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
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

const LINKS: Array<{ to: string; label: string; icon: keyof typeof ICONS; exact?: boolean }> = [
  { to: "/", label: "Início", icon: "home", exact: true },
  { to: "/planejamento", label: "Planejar", icon: "cal" },
  { to: "/relatorios", label: "Pareceres", icon: "pen" },
  { to: "/inclusao", label: "Inclusão", icon: "users" },
  { to: "/alfabetizacao", label: "Alfabetização", icon: "abc" },
  { to: "/agenda", label: "Agenda", icon: "clock" },
  { to: "/questoes", label: "Questões", icon: "check" },
];

// Funções que não cabem na barra de cima: ficam no botão "Mais" (computador).
const MAIS: Array<{ to: string; label: string; icon: keyof typeof ICONS }> = [
  { to: "/jogos", label: "Jogos", icon: "game" },
  { to: "/inclusao/pei", label: "PEI / PDI", icon: "target" },
  { to: "/biblioteca", label: "Minha Biblioteca", icon: "shelf" },
  { to: "/cadernos", label: "Cadernos prontos", icon: "layers" },
];

export function PainelNav() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const ctx = useSofiaContext();
  const sofia = useSofiaOptional();
  const nomeBruto = (ctx.user?.nome || "").trim();
  // "Educador(a)" é só o nome de reserva enquanto carrega: não vira avatar "E".
  const nome = nomeBruto === "Educador(a)" ? "" : nomeBruto;
  const [menu, setMenu] = useState(false);
  const [mais, setMais] = useState<{ left: number; top: number } | null>(null);
  const maisRef = useRef<HTMLDivElement>(null);
  // Quantos links do topo cabem inteiros; os que não cabem vão para o "Mais".
  const linksRef = useRef<HTMLElement>(null);
  const [cabem, setCabem] = useState(LINKS.length);
  const medirRef = useRef<() => void>(() => {});
  const [sheet, setSheet] = useState(false);
  const [baixar, setBaixar] = useState(false);
  const app = useInstalarApp();
  const { pendentes } = usePendentesWhatsapp();
  const waRotulo =
    pendentes > 0
      ? `Para confirmar: ${pendentes} ${pendentes === 1 ? "mensagem" : "mensagens"} do WhatsApp`
      : "Para confirmar: nada esperando";
  // Android/Chrome: um toque já abre a confirmação de instalação.
  const abrirBaixar = async () => {
    if (app.podeInstalarDireto && (await app.instalar())) return;
    setBaixar(true);
  };
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenu(false);
    setSheet(false);
    setMais(null);
  }, [loc.pathname]);
  useEffect(() => {
    const nav = linksRef.current;
    if (!nav || typeof ResizeObserver === "undefined") return;
    const medir = () => {
      const itens = Array.from(nav.children) as HTMLElement[];
      itens.forEach((i) => (i.hidden = false));
      if (getComputedStyle(nav).display === "none") return;
      const limite = nav.getBoundingClientRect().right + 0.5;
      let n = itens.length;
      for (let i = 0; i < itens.length; i++) {
        if (itens[i].getBoundingClientRect().right > limite) {
          n = i;
          break;
        }
      }
      itens.forEach((it, i) => (it.hidden = i >= n));
      setCabem(n);
    };
    medirRef.current = medir;
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(nav.parentElement ?? nav);
    void document.fonts?.ready.then(medir);
    return () => ro.disconnect();
  }, []);
  // O item ativo fica em negrito (mais largo): mede de novo ao trocar de página.
  useEffect(() => {
    medirRef.current();
  }, [loc.pathname]);
  const escondidos = LINKS.slice(cabem);

  useEffect(() => {
    if (!mais) return;
    const fechar = (e: MouseEvent) => {
      if (maisRef.current && !maisRef.current.contains(e.target as Node)) setMais(null);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setMais(null);
    const sumir = () => setMais(null);
    document.addEventListener("mousedown", fechar);
    window.addEventListener("keydown", tecla);
    window.addEventListener("resize", sumir);
    return () => {
      document.removeEventListener("mousedown", fechar);
      window.removeEventListener("keydown", tecla);
      window.removeEventListener("resize", sumir);
    };
  }, [mais]);
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
      <style dangerouslySetInnerHTML={{ __html: painelTokensCss + navCss }} />
      <header className="pn-top">
        <div className="pn-top-in">
          <Link to="/" className="pn-brand" aria-label="AgilizaProf, página inicial">
            <PencilLogo />
            <span>
              Agiliza<b>Prof</b>
            </span>
          </Link>
          <nav className="pn-links" aria-label="Navegação principal" ref={linksRef}>
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} aria-current={cur(l.to, l.exact)}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="pn-mais" ref={maisRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={!!mais}
              className={
                MAIS.some((x) => active(x.to)) || escondidos.some((x) => active(x.to, x.exact)) ? "on" : ""
              }
              onClick={(e) => {
                if (mais) return setMais(null);
                const r = e.currentTarget.getBoundingClientRect();
                setMais({ left: r.left, top: r.bottom + 8 });
              }}
            >
              Mais
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {mais && (
              <div className="pn-menu pn-mais-menu" role="menu" style={{ left: mais.left, top: mais.top }}>
                {escondidos.map((x) => (
                  <Link key={x.to} to={x.to} role="menuitem" aria-current={cur(x.to, x.exact)}>
                    <Svg>{ICONS[x.icon]}</Svg>
                    {x.label}
                  </Link>
                ))}
                {escondidos.length > 0 && <hr />}
                {MAIS.map((x) => (
                  <Link key={x.to} to={x.to} role="menuitem" aria-current={cur(x.to)}>
                    <Svg>{ICONS[x.icon]}</Svg>
                    {x.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="pn-right" ref={ref}>
            <Link to="/indicacoes" className="pn-indique" aria-current={cur("/indicacoes")}>
              <Svg>{ICONS.gift}</Svg>
              <span className="pn-indique-tx">Indique e ganhe</span>
            </Link>
            <Link
              to="/confirmar"
              className="pn-wa"
              aria-current={cur("/confirmar")}
              aria-label={waRotulo}
              title={waRotulo}
            >
              <WhatsappLogo size={18} />
              <span className="pn-wa-tx">Para confirmar</span>
              <span className={"pn-wa-n" + (pendentes ? "" : " zero")} aria-hidden>
                {pendentes}
              </span>
            </Link>
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
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenu(false);
                    void abrirBaixar();
                  }}
                >
                  <Svg>{ICONS.phone}</Svg>Baixar o app no celular
                </button>
                <Link to="/configuracoes" role="menuitem">
                  <Svg>{ICONS.gear}</Svg>Configurações
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
            <div className="pn-sheet-head">
              <h2>Tudo do AgilizaProf</h2>
              <button type="button" className="pn-sheet-x" aria-label="Fechar" onClick={() => setSheet(false)}>
                <Svg>{ICONS.x}</Svg>
              </button>
            </div>
            <div className="pn-sheet-list">
              <Link to="/indicacoes" style={{ background: "#FFB224", borderColor: "#14161F" }}>
                <Svg>{ICONS.gift}</Svg>Indique e ganhe
              </Link>
              <button
                type="button"
                style={{ background: "#CDEFE2", borderColor: "#0B7A55" }}
                onClick={() => {
                  setSheet(false);
                  void abrirBaixar();
                }}
              >
                <Svg>{ICONS.phone}</Svg>Baixar o app no celular
              </button>
              {pendentes > 0 && (
                <Link to="/confirmar" style={{ background: "#D9FDD3", borderColor: "#14161F" }}>
                  <span style={{ color: "#0B7A55", display: "flex" }}>
                    <WhatsappLogo size={20} />
                  </span>
                  Para confirmar
                  <span className={"pn-wa-n" + (pendentes ? "" : " zero")} aria-label={waRotulo}>
                    {pendentes}
                  </span>
                </Link>
              )}
              <Link to="/alfabetizacao">
                <Svg>{ICONS.abc}</Svg>Criança alfabetizada
              </Link>
              <Link to="/cadernos">
                <Svg>{ICONS.layers}</Svg>Cadernos prontos
              </Link>
              <Link to="/biblioteca">
                <Svg>{ICONS.shelf}</Svg>Minha Biblioteca
              </Link>
              <Link to="/inclusao">
                <Svg>{ICONS.users}</Svg>Inclusão
              </Link>
              <Link to="/inclusao/pei">
                <Svg>{ICONS.target}</Svg>PEI / PDI
              </Link>
              <Link to="/agenda">
                <Svg>{ICONS.clock}</Svg>Agenda
              </Link>
              <Link to="/jogos">
                <Svg>{ICONS.game}</Svg>Jogos e atividades interativas
              </Link>
              <Link to="/questoes">
                <Svg>{ICONS.check}</Svg>Questões
              </Link>
              {!pendentes && (
                <Link to="/confirmar" style={{ background: "#D9FDD3", borderColor: "#14161F" }}>
                  <span style={{ color: "#0B7A55", display: "flex" }}>
                    <WhatsappLogo size={20} />
                  </span>
                  Para confirmar
                  <span className={"pn-wa-n" + (pendentes ? "" : " zero")} aria-label={waRotulo}>
                    {pendentes}
                  </span>
                </Link>
              )}
              <Link to="/configuracoes">
                <Svg>{ICONS.gear}</Svg>Configurações
              </Link>
              {isAdmin && (
                <Link to="/admin">
                  <Svg>{ICONS.star}</Svg>Administração
                </Link>
              )}
              <button
                type="button"
                className="pn-sheet-sair"
                onClick={() => {
                  if (window.confirm("Quer mesmo sair da sua conta?")) void sair();
                }}
              >
                <Svg>{ICONS.out}</Svg>Sair
              </button>
            </div>
          </div>
        </div>
      )}
      {baixar && <InstalarApp onClose={() => setBaixar(false)} />}
    </>
  );
}
