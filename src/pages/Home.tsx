import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { AppSidebar, sidebarCss } from "@/components/AppSidebar";
import { Header as AppHeader, appHeaderCss } from "@/components/Header";
import { useSofiaContext } from "@/lib/sofia/sofiaContext";
import { useHydrated } from "@/hooks/useHydrated";
import { trackEvent } from "@/lib/tracking";

// Página inicial: saudação + atalhos para todas as funcionalidades.
// O antigo painel (escolas, turmas, alunos) vive em /minha-sala.

type Feature = {
  to: string;
  title: string;
  desc: string;
  color: string;
  icon: ReactNode;
  tag?: string;
};

const FEATURES: Feature[] = [
  {
    to: "/assistente",
    title: "Sofia, assistente IA",
    desc: "Converse e peça ajuda com qualquer tarefa pedagógica.",
    color: "#8B5CF6",
    tag: "Novo",
    icon: (
      <>
        <path d="M12 2v3" />
        <path d="M12 19v3" />
        <circle cx="12" cy="12" r="6" />
        <path d="M5 12H2" />
        <path d="M22 12h-3" />
      </>
    ),
  },
  {
    to: "/planejamento",
    title: "Planejamento",
    desc: "Monte a semana arrastando aulas e replicando para outras turmas.",
    color: "#0EA5E9",
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
    to: "/planejamento/atividade",
    title: "Plano de aula",
    desc: "Crie uma atividade alinhada à BNCC em poucos minutos.",
    color: "#22C55E",
    icon: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </>
    ),
  },
  {
    to: "/planejamento/ei",
    title: "Educação Infantil",
    desc: "Roteiros de experiência para os campos da BNCC.",
    color: "#D99A06",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </>
    ),
  },
  {
    to: "/relatorios",
    title: "Relatórios e pareceres",
    desc: "Pareceres descritivos de cada aluno, prontos para revisar.",
    color: "#F97316",
    icon: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </>
    ),
  },
  {
    to: "/inclusao",
    title: "Inclusão",
    desc: "Alunos com laudo, adaptações e acompanhamento.",
    color: "#EC4899",
    tag: "Exclusivo",
    icon: (
      <>
        <circle cx="12" cy="8" r="5" />
        <path d="M20 21a8 8 0 0 0-16 0" />
      </>
    ),
  },
  {
    to: "/inclusao/pei",
    title: "PEI / PDI",
    desc: "Plano educacional individualizado com metas e evidências.",
    color: "#14B8A6",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </>
    ),
  },
  {
    to: "/agenda",
    title: "Agenda escolar",
    desc: "Reuniões, avaliações e entregas num só lugar.",
    color: "#EF4444",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
  },
  {
    to: "/minha-sala",
    title: "Minha sala",
    desc: "Escolas, turmas e alunos cadastrados.",
    color: "#6366F1",
    icon: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
  {
    to: "/indicacoes",
    title: "Indique e ganhe",
    desc: "Convide colegas e ganhe meses grátis.",
    color: "#F43F5E",
    icon: (
      <>
        <polyline points="20 12 20 22 4 22 4 12" />
        <rect x="2" y="7" width="20" height="5" />
        <line x1="12" y1="22" x2="12" y2="7" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </>
    ),
  },
  {
    to: "/configuracoes",
    title: "Configurações",
    desc: "Seu perfil, plano, currículo municipal e acessibilidade.",
    color: "#64748B",
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.18V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-2.82-1.18l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.09 15H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </>
    ),
  },
];

const css = `
.hm-root{min-height:100vh;background:#FFFBF7;color:#1E293B;font-family:'Inter',-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.hm-grid{display:grid;grid-template-columns:240px 1fr;min-height:100vh;}
.hm-main{min-width:0;width:100%;}
.hm-pad{padding:28px 36px 48px;max-width:1240px;}

.hm-hero{position:relative;overflow:hidden;border-radius:28px;padding:34px 36px;margin-bottom:28px;
  background:linear-gradient(120deg,#FFE8D6 0%,#FFF3C4 35%,#DDF4FF 70%,#EDE4FF 100%);background-size:220% 220%;
  animation:hm-shift 16s ease-in-out infinite alternate;}
@keyframes hm-shift{from{background-position:0% 50%;}to{background-position:100% 50%;}}
.hm-hero .bubble{position:absolute;border-radius:50%;opacity:.55;pointer-events:none;animation:hm-float 9s ease-in-out infinite alternate;}
.hm-hero .bubble.b1{width:140px;height:140px;background:#FFB98A;right:6%;top:-40px;}
.hm-hero .bubble.b2{width:90px;height:90px;background:#9BD8FF;right:22%;bottom:-30px;animation-delay:-3s;}
.hm-hero .bubble.b3{width:56px;height:56px;background:#C9B6FF;right:3%;bottom:24px;animation-delay:-6s;}
@keyframes hm-float{from{transform:translateY(0) scale(1);}to{transform:translateY(14px) scale(1.06);}}
.hm-hero-in{position:relative;z-index:1;max-width:640px;}
.hm-date{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.75);border-radius:100px;padding:6px 12px;font-size:12.5px;font-weight:700;color:#475569;margin-bottom:14px;}
.hm-date .dot{width:7px;height:7px;border-radius:50%;background:#22C55E;box-shadow:0 0 0 0 rgba(34,197,94,.5);animation:hm-pulse 2s infinite;}
@keyframes hm-pulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,.5);}70%{box-shadow:0 0 0 8px rgba(34,197,94,0);}100%{box-shadow:0 0 0 0 rgba(34,197,94,0);}}
.hm-hello{margin:0;font-family:'Fraunces',Georgia,serif;font-weight:800;font-size:40px;line-height:1.08;letter-spacing:-.025em;color:#1E293B;}
.hm-hello .wave{display:inline-block;transform-origin:70% 70%;animation:hm-wave 2.4s ease-in-out 1;}
@keyframes hm-wave{0%,60%,100%{transform:rotate(0);}10%,30%{transform:rotate(14deg);}20%{transform:rotate(-8deg);}40%{transform:rotate(-4deg);}50%{transform:rotate(10deg);}}
.hm-hello .name{background:linear-gradient(90deg,#F97316,#EC4899,#8B5CF6);-webkit-background-clip:text;background-clip:text;color:transparent;}
.hm-sub{margin:12px 0 0;font-size:16px;line-height:1.5;color:#475569;}

.hm-section-title{margin:0 0 14px;font-size:13px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:.12em;}
.hm-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px;}
.hm-card{--c:#6366F1;position:relative;display:flex;flex-direction:column;gap:12px;padding:20px;border-radius:20px;text-decoration:none;color:inherit;
  background:#fff;border:1.5px solid color-mix(in srgb,var(--c) 14%,#fff);box-shadow:0 2px 6px rgba(30,41,59,.04);
  transition:transform .2s cubic-bezier(.2,.8,.2,1),box-shadow .2s,border-color .2s;
  opacity:0;animation:hm-in .5s cubic-bezier(.2,.8,.2,1) forwards;animation-delay:calc(var(--i) * 45ms);overflow:hidden;}
@keyframes hm-in{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:none;}}
.hm-card::after{content:"";position:absolute;right:-30px;top:-30px;width:110px;height:110px;border-radius:50%;background:color-mix(in srgb,var(--c) 10%,transparent);transition:transform .35s;}
.hm-card:hover,.hm-card:focus-visible{transform:translateY(-4px);border-color:color-mix(in srgb,var(--c) 45%,#fff);box-shadow:0 16px 32px color-mix(in srgb,var(--c) 20%,transparent);outline:none;}
.hm-card:hover::after{transform:scale(1.35);}
.hm-card .ic{position:relative;z-index:1;width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;color:#fff;
  background:linear-gradient(135deg,color-mix(in srgb,var(--c) 80%,#fff),var(--c));box-shadow:0 8px 18px color-mix(in srgb,var(--c) 35%,transparent);transition:transform .25s;}
.hm-card:hover .ic{transform:rotate(-6deg) scale(1.06);}
.hm-card .ic svg{width:22px;height:22px;}
.hm-card h3{position:relative;z-index:1;margin:0;font-size:16.5px;font-weight:800;letter-spacing:-.01em;color:#1E293B;}
.hm-card p{position:relative;z-index:1;margin:0;font-size:13.5px;line-height:1.45;color:#64748B;}
.hm-card .tag{align-self:flex-start;position:relative;z-index:1;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--c);background:color-mix(in srgb,var(--c) 12%,#fff);padding:3px 8px;border-radius:100px;margin-top:-4px;}
.hm-card .go{position:relative;z-index:1;margin-top:auto;display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:800;color:var(--c);}
.hm-card .go svg{width:14px;height:14px;transition:transform .2s;}
.hm-card:hover .go svg{transform:translateX(4px);}

@media(max-width:820px){
  .hm-grid{grid-template-columns:1fr;}
  .hm-pad{padding:18px 16px 40px;}
  .hm-hero{padding:24px 20px;border-radius:22px;margin-bottom:22px;}
  .hm-hello{font-size:30px;}
  .hm-sub{font-size:15px;}
  .hm-cards{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
  .hm-card{padding:16px;gap:10px;border-radius:18px;}
  .hm-card .ic{width:42px;height:42px;border-radius:12px;}
  .hm-card p{display:none;}
    .hm-card h3{font-size:15px;}
}
@media(max-width:360px){.hm-cards{grid-template-columns:1fr;}}
@media (prefers-reduced-motion: reduce){
  .hm-hero,.hm-hero .bubble,.hm-date .dot,.hm-hello .wave{animation:none;}
  .hm-card{animation:none;opacity:1;}
}
`;

function saudacaoAgora(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function dataHoje(): string {
  const txt = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

export function Home() {
  const hydrated = useHydrated();
  const sofiaCtx = useSofiaContext();
  const nome = (sofiaCtx.user?.primeiro_nome || "").trim();

  // Mantém a saudação certa se a página ficar aberta na virada do período.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!hydrated) return;
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, [hydrated]);

  useEffect(() => {
    trackEvent("page_view_dashboard", { location: "dashboard" });
  }, []);

  // SSR/primeiro paint usa "Olá" pra não dar mismatch de hidratação.
  const slot = hydrated ? saudacaoAgora() : "Olá";

  return (
    <div className="hm-root">
      <style dangerouslySetInnerHTML={{ __html: css + sidebarCss + appHeaderCss }} />
      <div className="hm-grid">
        <AppSidebar active="home" />
        <main className="hm-main">
          <AppHeader breadcrumb={[{ label: "Página inicial" }]} />
          <div className="hm-pad">
            <section className="hm-hero" aria-labelledby="hm-hello">
              <span className="bubble b1" aria-hidden />
              <span className="bubble b2" aria-hidden />
              <span className="bubble b3" aria-hidden />
              <div className="hm-hero-in">
                {hydrated && (
                  <div className="hm-date">
                    <span className="dot" aria-hidden />
                    {dataHoje()}
                  </div>
                )}
                <h1 id="hm-hello" className="hm-hello" suppressHydrationWarning>
                  {slot}
                  {nome && nome !== "Educador(a)" ? (
                    <>
                      , <span className="name">{nome}</span>
                    </>
                  ) : null}
                  !{" "}
                  <span className="wave" aria-hidden>
                    👋
                  </span>
                </h1>
                <p className="hm-sub">O que você quer fazer hoje?</p>
              </div>
            </section>

            <h2 className="hm-section-title">Tudo o que você pode fazer</h2>
            <nav className="hm-cards" aria-label="Funcionalidades">
              {FEATURES.map((f, i) => (
                <Link
                  key={f.to}
                  to={f.to}
                  className="hm-card"
                  style={{ ["--c" as string]: f.color, ["--i" as string]: i } as CSSProperties}
                >
                  <span className="ic" aria-hidden>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {f.icon}
                    </svg>
                  </span>
                  <h3>{f.title}</h3>
                  {f.tag && <span className="tag">{f.tag}</span>}
                  <p>{f.desc}</p>
                  <span className="go">
                    Abrir
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        </main>
      </div>
    </div>
  );
}
