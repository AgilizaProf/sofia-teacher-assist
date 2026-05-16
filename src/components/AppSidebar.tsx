import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type React from "react";
import { useSofiaContext } from "@/lib/sofia/sofiaContext";
import { supabase } from "@/integrations/supabase/client";
import { CommandPalette } from "@/components/CommandPalette";
import { useIsAdmin } from "@/lib/admin/useIsAdmin";
import logoImg from "@/assets/agilizaprof-logo.webp";

export const sidebarCss = `
.ap-sidebar{background:linear-gradient(180deg,#1B2A4E 0%,#0F1B36 100%);color:#fff;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow:hidden;width:240px;flex-shrink:0;align-self:flex-start;}
.ap-sidebar::before{content:"";position:absolute;top:-100px;right:-100px;width:300px;height:300px;background:radial-gradient(circle,rgba(255,122,69,.14) 0%,transparent 65%);border-radius:50%;pointer-events:none;}
.sb-head{padding:18px 18px 12px;display:flex;align-items:center;gap:10px;position:relative;z-index:1;}
.sb-logo-icon{width:34px;height:34px;border-radius:9px;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(255,122,69,.40);flex-shrink:0;background:#1B2A4E;}
.sb-logo-icon img{width:100%;height:100%;object-fit:cover;display:block;}
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
.sb-badge.exclusive{background:linear-gradient(135deg,#FF7A45,#FFB07A);box-shadow:0 2px 6px rgba(255,122,69,.45);}
.sb-shortcut{margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:9.5px;color:rgba(255,255,255,.40);font-weight:600;}
.sb-foot{padding:10px 12px 12px;position:relative;z-index:1;border-top:1px solid rgba(255,255,255,.06);margin-top:auto;}
.sb-plan{margin:0 10px 10px;background:linear-gradient(180deg,#FFEDD5 0%,#FFD7B5 100%);border:1px solid #F7C9A8;border-radius:10px;padding:9px 11px;color:#3a1f0b;position:relative;z-index:1;height:120px;width:calc(100% - 20px);box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;align-items:stretch;overflow:hidden;}
.sb-plan-top{display:flex;flex-direction:column;gap:2px;}
.sb-plan-bottom{display:flex;align-items:center;justify-content:space-between;gap:6px;}
.sb-plan.silver{background:linear-gradient(180deg,#F1F3F6 0%,#C9CED6 100%);border:1px solid #B8BFC9;color:#1f2937;}
.sb-plan-tag{font-size:8.5px;font-weight:800;color:#9A3412;letter-spacing:.08em;display:inline-flex;align-items:center;gap:4px;}
.sb-plan.silver .sb-plan-tag{color:#475569;}
.sb-plan h4{margin:3px 0 1px;font-family:'Fraunces',serif;font-weight:700;font-size:11px;color:#3a1f0b;line-height:1.2;}
.sb-plan.silver h4{color:#1f2937;}
.sb-plan p{margin:0;font-size:9.5px;color:#5a3a20;line-height:1.3;}
.sb-plan.silver p{color:#475569;}
.sb-plan-btn{margin-top:6px;display:inline-flex;align-items:center;gap:4px;background:#F97316;color:#fff;padding:4px 8px;border-radius:7px;font-size:10px;font-weight:700;border:none;cursor:pointer;box-shadow:0 4px 10px rgba(249,115,22,.35);}
.sb-plan-btn:hover{background:#EA580C;}
.sb-plan-row{display:flex;align-items:center;justify-content:space-between;gap:6px;}
.sb-plan-nav{display:inline-flex;align-items:center;justify-content:center;background:transparent;color:#9A3412;border:none;cursor:pointer;padding:0;opacity:.55;transition:opacity .15s;line-height:0;}
.sb-plan-nav:hover{opacity:1;}
.sb-plan.silver .sb-plan-nav{color:#334155;}
.sb-plan-dots{display:flex;gap:5px;justify-content:center;}
.sb-plan-dot{width:5px;height:5px;border-radius:50%;background:rgba(154,52,18,.30);border:none;padding:0;cursor:pointer;transition:.18s;}
.sb-plan-dot.active{background:#9A3412;width:14px;border-radius:3px;}
.sb-plan.silver .sb-plan-dot{background:rgba(51,65,85,.30);}
.sb-plan.silver .sb-plan-dot.active{background:#334155;}
.sb-version{font-size:10px;color:rgba(255,255,255,.30);text-align:center;font-family:'JetBrains Mono',monospace;font-weight:600;}
.sb-bruna{margin:0 10px 10px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.10);border-radius:10px;padding:9px 10px;display:flex;gap:10px;align-items:center;cursor:pointer;transition:.2s;color:#fff;text-align:left;width:calc(100% - 20px);}
.sb-bruna:hover{background:rgba(255,122,69,.10);border-color:rgba(255,122,69,.32);}
.sb-bruna .av{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#FF9466,#C2410C);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;flex-shrink:0;}
.sb-bruna .nm{font-size:11.5px;font-weight:700;line-height:1.2;}
.sb-bruna .sub{font-size:9.5px;color:rgba(255,255,255,.55);margin-top:1px;}
.sb-bruna .live{display:inline-flex;align-items:center;gap:4px;font-size:8.5px;font-weight:800;color:#fff;background:#FF7A45;padding:2px 5px;border-radius:4px;letter-spacing:.04em;margin-top:4px;}
.sb-bruna .live::before{content:"";width:5px;height:5px;border-radius:50%;background:#fff;animation:ap-pulse 2s infinite;}
.sb-bruna-locked{margin:0 10px 10px;background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.16);border-radius:10px;padding:9px 10px;font-size:10.5px;color:rgba(255,255,255,.55);line-height:1.35;}
.sb-bruna-locked b{color:rgba(255,255,255,.85);font-weight:700;display:block;font-size:11px;margin-bottom:2px;}
@media(max-width:1100px){.ap-sidebar{width:240px;}}
@media(max-width:820px){.ap-sidebar{display:none;}}
`;

const Svg = ({ c, ...rest }: { c: React.ReactNode } & React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...rest}>{c}</svg>
);

export type SidebarKey = "home" | "assistant" | "planning" | "documents" | "reports" | "inclusion" | "agenda" | "settings";

export function AppSidebar({ active, onCmdK }: { active: SidebarKey; onCmdK?: () => void }) {
  const cls = (k: SidebarKey) => "sb-item" + (active === k ? " active" : "");
  useSofiaContext();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const usingInternal = !onCmdK;
  const handleCmdK = onCmdK || (() => setPaletteOpen(true));
  const { isAdmin } = useIsAdmin();
  const sofiaCtx = useSofiaContext();
  const userPlan = sofiaCtx.user.plano; // "free" | "pro"
  const userCiclo = sofiaCtx.user.ciclo ?? null; // "mensal" | "anual" | null

  type PlanCard = {
    key: string;
    tag: string;
    title: string;
    desc: string;
    aria: string;
    href: string | undefined;
    cta: string;
    silver?: boolean;
  };
  const planAnual: PlanCard = {
    key: "anual",
    tag: "PLANO ANUAL",
    title: "Mais resultado. Menos tempo perdido.",
    desc: "Créditos ilimitados por R$ 247/ano\nEquivale a só R$ 0,67/dia.",
    aria: "Ver oferta do plano anual",
    href: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=7798ddd616d8438a92b0e2bceaa20bab",
    cta: "Ver oferta",
  };
  const planMensal: PlanCard = {
    key: "mensal",
    tag: "PLANO MENSAL",
    title: "O investimento diário que devolve horas da sua semana",
    desc: "Só R$ 1,16 por dia",
    aria: "Ver oferta do plano mensal",
    href: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=e2da862aba6042019234b1840f2593ef",
    cta: "Ver oferta",
    silver: true,
  };
  const planConvide: PlanCard = {
    key: "convide",
    tag: "GANHE DIAS GRÁTIS",
    title: "Convide outro(a) educador(a) e ganhe 1 mês grátis",
    desc: "Quem você indicar também ganha 30 dias.",
    aria: "Convidar educador(a)",
    href: "/configuracoes#convide",
    cta: "Convidar",
  };
  const plans: PlanCard[] =
    userPlan === "pro" && userCiclo === "anual"
      ? [planConvide]
      : userPlan === "pro" && userCiclo === "mensal"
        ? [planAnual]
        : [planAnual, planMensal];
  const [planIdx, setPlanIdx] = useState(0);
  useEffect(() => { setPlanIdx(0); }, [plans.length]);
  const safeIdx = Math.min(planIdx, plans.length - 1);
  const currentPlan = plans[safeIdx];
  const prevPlan = () => setPlanIdx((i) => (i - 1 + plans.length) % plans.length);
  const nextPlan = () => setPlanIdx((i) => (i + 1) % plans.length);

  useEffect(() => {
    if (!usingInternal) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [usingInternal]);

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    navigate({ to: "/auth" });
  };
  return (
    <>
    <aside className="ap-sidebar">
      <div className="sb-head">
        <div className="sb-logo-icon"><img src={logoImg} alt="AgilizaProf" /></div>
        <div className="sb-logo-text">Agiliza<span>Prof</span></div>
      </div>
      <button className="sb-cmdk" onClick={handleCmdK} aria-label="Buscar ou navegar">
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
        <Link to="/planejamento" className={cls("planning")} aria-label="Planejamento">
          <Svg className="sb-icon" c={<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></>} />
          <span>Planejamento</span><span className="sb-shortcut">P</span>
        </Link>
        <Link to="/documentos" className={cls("documents")} aria-label="Documentos">
          <Svg className="sb-icon" c={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></>} />
          <span>Documentos</span><span className="sb-shortcut">D</span>
        </Link>
        <Link to="/relatorios" className={cls("reports")} aria-label="Relatórios">
          <Svg className="sb-icon" c={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>} />
          <span>Relatórios</span><span className="sb-shortcut">R</span>
        </Link>
        <Link to="/inclusao" className={cls("inclusion")} aria-label="Inclusão">
          <Svg className="sb-icon" c={<><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></>} />
          <span>Inclusão</span><span className="sb-badge exclusive">EXCLUSIVO</span>
        </Link>
        <Link to="/agenda" className={cls("agenda")} aria-label="Agenda escolar">
          <Svg className="sb-icon" c={<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></>} />
          <span>Agenda escolar</span><span className="sb-shortcut">A</span>
        </Link>
        <div className="sb-section-label" style={{ marginTop: 12 }}>Conta</div>
        <Link to="/configuracoes" className={cls("settings")} aria-label="Configurações">
          <Svg className="sb-icon" c={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>} />
          <span>Configurações</span>
        </Link>
        <button className="sb-item" aria-label="Sair" onClick={handleLogout}>
          <Svg className="sb-icon" c={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>} />
          <span>Sair</span>
        </button>
        {isAdmin && (
          <Link to="/admin" className="sb-item" aria-label="Painel administrativo" style={{marginTop:8,background:"rgba(255,122,69,.10)",color:"#FF7A45",fontWeight:700}}>
            <Svg className="sb-icon" c={<><path d="M12 2l2.9 6.9L22 10l-5.5 4.7L18.2 22 12 18.3 5.8 22l1.7-7.3L2 10l7.1-1.1z"/></>} />
            <span>Admin</span>
          </Link>
        )}
      </nav>
      <div className="sb-foot">
        <div className={"sb-plan" + (currentPlan.silver ? " silver" : "")} role="complementary" aria-label={currentPlan.aria}>
          <div className="sb-plan-top">
            <span className="sb-plan-tag">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.9L22 10l-5.5 4.7L18.2 22 12 18.3 5.8 22l1.7-7.3L2 10l7.1-1.1z"/></svg>
              {currentPlan.tag}
            </span>
            <h4>{currentPlan.title}</h4>
            <p style={{whiteSpace:"pre-line"}}>{currentPlan.desc}</p>
          </div>
          <div className="sb-plan-bottom">
            {currentPlan.href ? (
              currentPlan.href.startsWith("/") ? (
                <Link
                  className="sb-plan-btn"
                  aria-label={currentPlan.aria}
                  to={currentPlan.href.split("#")[0]}
                  hash={currentPlan.href.includes("#") ? currentPlan.href.split("#")[1] : undefined}
                >
                  {currentPlan.cta}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </Link>
              ) : (
                <a
                  className="sb-plan-btn"
                  aria-label={currentPlan.aria}
                  href={currentPlan.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {currentPlan.cta}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </a>
              )
            ) : (
              <button className="sb-plan-btn" aria-label={currentPlan.aria}>
                {currentPlan.cta}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            )}
            {plans.length > 1 ? (
            <div className="sb-plan-dots" role="tablist" aria-label="Selecionar plano">
              <button type="button" className="sb-plan-nav" aria-label="Plano anterior" onClick={prevPlan}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              {plans.map((p, i) => (
                <button
                  key={p.key}
                  type="button"
                  role="tab"
                  aria-selected={i === safeIdx}
                  aria-label={p.tag}
                  className={"sb-plan-dot" + (i === safeIdx ? " active" : "")}
                  onClick={() => setPlanIdx(i)}
                />
              ))}
              <button type="button" className="sb-plan-nav" aria-label="Próximo plano" onClick={nextPlan}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
    {usingInternal && <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />}
    </>
  );
}