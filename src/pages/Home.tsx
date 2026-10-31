import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { TopNav, novoTokensCss } from "@/components/layout/TopNav";
import { useSofiaContext } from "@/lib/sofia/sofiaContext";
import { useHydrated } from "@/hooks/useHydrated";
import { trackEvent } from "@/lib/tracking";

// Página inicial: saudação, três atalhos de tarefa e todas as ferramentas.
// Sem barra lateral: a navegação fica no TopNav (desktop) e no MobileTopBar
// (celular). O antigo painel (escolas, turmas, alunos) vive em /minha-sala.

type Tool = {
  to: string;
  title: string;
  desc: string;
  tone: string;
  soft: string;
  icon: ReactNode;
};

const I = {
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  pencil: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  blocks: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <circle cx="17.5" cy="17.5" r="3.5" />
    </>
  ),
  doc: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </>
  ),
  heart: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
  chat: (
    <>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 9h8M8 13h5" />
    </>
  ),
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </>
  ),
  arrow: <path d="M5 12h14M13 5l7 7-7 7" />,
};

const TEAL = ["var(--nv-primary)", "var(--nv-primary-soft)"];
const SUN = ["#B7791F", "var(--nv-sun-soft)"];
const CORAL = ["#C2553E", "var(--nv-coral-soft)"];
const SKY = ["var(--nv-sky)", "var(--nv-sky-soft)"];
const PLUM = ["var(--nv-plum)", "var(--nv-plum-soft)"];

const t = (
  to: string,
  title: string,
  desc: string,
  [tone, soft]: string[],
  icon: ReactNode,
): Tool => ({ to, title, desc, tone, soft, icon });

const TOOLS: Tool[] = [
  t(
    "/planejamento",
    "Planejamento semanal",
    "Monte a semana e replique aulas entre turmas.",
    TEAL,
    I.calendar,
  ),
  t(
    "/planejamento/atividade",
    "Plano de aula",
    "Atividade completa alinhada à BNCC.",
    TEAL,
    I.pencil,
  ),
  t(
    "/planejamento/ei",
    "Educação Infantil",
    "Roteiros pelos campos de experiência.",
    SUN,
    I.blocks,
  ),
  t(
    "/relatorios",
    "Relatórios e pareceres",
    "Pareceres descritivos prontos para revisar.",
    SKY,
    I.doc,
  ),
  t("/inclusao", "Inclusão", "Alunos com laudo e atividades adaptadas.", CORAL, I.heart),
  t("/inclusao/pei", "PEI / PDI", "Plano individualizado com metas.", CORAL, I.target),
  t("/agenda", "Agenda escolar", "Reuniões, provas e entregas.", SUN, I.clock),
  t("/assistente", "Sofia", "Tire dúvidas e peça ideias à IA.", PLUM, I.chat),
];

const css = `
.hn-wrap{max-width:1200px;margin:0 auto;padding:28px 24px 64px;}
.hn-in{opacity:0;animation:hn-up .45s cubic-bezier(.2,.8,.2,1) forwards;animation-delay:var(--d,0ms);}
@keyframes hn-up{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}

.hn-hero{position:relative;overflow:hidden;border-radius:22px;padding:32px 32px 28px;background:var(--nv-primary-soft);
  background-image:radial-gradient(rgba(15,118,110,.10) 1.2px,transparent 1.2px);background-size:18px 18px;margin-bottom:36px;}
.hn-hero::after{content:"";position:absolute;right:-60px;top:-60px;width:240px;height:240px;border-radius:50%;background:var(--nv-sun);opacity:.16;}
.hn-hero-top{position:relative;z-index:1;}
.hn-date{display:inline-block;font-size:12.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--nv-primary);margin-bottom:8px;}
.hn-hello{margin:0;font-family:var(--nv-heading);font-weight:800;font-size:36px;letter-spacing:-.025em;line-height:1.1;color:var(--nv-ink);}
.hn-sub{margin:8px 0 0;font-size:16px;color:var(--nv-ink-2);}
.hn-actions{position:relative;z-index:1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:24px;}
.hn-act{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:14px;background:#fff;border:1px solid rgba(15,118,110,.14);text-decoration:none;color:var(--nv-ink);
  transition:transform .15s,box-shadow .15s,border-color .15s;}
.hn-act:hover,.hn-act:focus-visible{transform:translateY(-2px);box-shadow:var(--nv-shadow);border-color:var(--nv-primary);outline:none;}
.hn-act .ai{width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:var(--nv-primary-soft);color:var(--nv-primary);flex-shrink:0;}
.hn-act .ai svg{width:20px;height:20px;}
.hn-act .at{font-weight:700;font-size:15px;line-height:1.25;}
.hn-act .ad{font-size:12.5px;color:var(--nv-muted);margin-top:2px;}
.hn-act .ar{margin-left:auto;width:18px;height:18px;color:var(--nv-line-2);transition:transform .15s,color .15s;flex-shrink:0;}
.hn-act:hover .ar{color:var(--nv-primary);transform:translateX(3px);}
.hn-act.main{background:var(--nv-primary);border-color:var(--nv-primary);color:#fff;}
.hn-act.main .ai{background:rgba(255,255,255,.16);color:#fff;}
.hn-act.main .ad{color:rgba(255,255,255,.78);}
.hn-act.main .ar{color:rgba(255,255,255,.7);}
.hn-act.main:hover{background:var(--nv-primary-dark);border-color:var(--nv-primary-dark);}
.hn-act.main:hover .ar{color:#fff;}

.hn-h2{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:0 0 14px;}
.hn-h2 h2{margin:0;font-family:var(--nv-heading);font-weight:700;font-size:19px;letter-spacing:-.01em;color:var(--nv-ink);}
.hn-h2 span{font-size:13px;color:var(--nv-muted);}
.hn-tools{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:36px;}
.hn-tool{display:flex;flex-direction:column;gap:12px;padding:20px 18px;border-radius:var(--nv-radius);background:var(--nv-surface);border:1px solid var(--nv-line);text-decoration:none;color:inherit;
  transition:transform .18s,box-shadow .18s,border-color .18s;}
.hn-tool:hover,.hn-tool:focus-visible{transform:translateY(-3px);box-shadow:var(--nv-shadow);border-color:var(--tone);outline:none;}
.hn-tool .ti{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--soft);color:var(--tone);transition:transform .2s;}
.hn-tool:hover .ti{transform:scale(1.06);}
.hn-tool .ti svg{width:21px;height:21px;}
.hn-tool h3{margin:0;font-size:15.5px;font-weight:700;color:var(--nv-ink);line-height:1.3;}
.hn-tool p{margin:0;font-size:13.5px;line-height:1.45;color:var(--nv-muted);}

.hn-more{display:flex;flex-wrap:wrap;gap:10px;}
.hn-chip{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 14px;border-radius:100px;background:#fff;border:1px solid var(--nv-line);font-size:14px;font-weight:500;color:var(--nv-ink-2);text-decoration:none;transition:border-color .15s,color .15s;}
.hn-chip svg{width:16px;height:16px;color:var(--nv-muted);}
.hn-chip:hover{border-color:var(--nv-primary);color:var(--nv-primary);}
.hn-chip:hover svg{color:var(--nv-primary);}

@media(max-width:1060px){.hn-tools{grid-template-columns:repeat(2,minmax(0,1fr));}}
@media(max-width:820px){
  .hn-wrap{padding:16px 16px 48px;}
  .hn-hero{padding:22px 18px 18px;border-radius:18px;margin-bottom:28px;}
  .hn-hero::after{display:none;}
  .hn-h2 span{display:none;}
  .hn-hello{font-size:27px;}
  .hn-sub{font-size:15px;}
  .hn-actions{grid-template-columns:1fr;gap:10px;margin-top:18px;}
  .hn-tools{gap:10px;}
  .hn-tool{padding:16px 14px;gap:10px;}
  .hn-tool p{font-size:12.5px;}
}
@media(max-width:400px){.hn-tool p{display:none;}}
@media (prefers-reduced-motion: reduce){.hn-in{animation:none;opacity:1;}}
`;

const Svg = ({ children, className }: { children: ReactNode; className?: string }) => (
  <svg
    className={className}
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

function saudacaoAgora(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function dataHoje(): string {
  return new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
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
  const temNome = nome && nome !== "Educador(a)";
  let delay = 0;
  const d = () => ({ ["--d" as string]: `${(delay += 35)}ms` }) as CSSProperties;

  return (
    <div className="nv">
      <style dangerouslySetInnerHTML={{ __html: novoTokensCss + css }} />
      <TopNav />
      <main className="hn-wrap">
        <section className="hn-hero hn-in" aria-labelledby="hn-hello">
          <div className="hn-hero-top">
            <span className="hn-date" suppressHydrationWarning>
              {hydrated ? dataHoje() : " "}
            </span>
            <h1 id="hn-hello" className="hn-hello" suppressHydrationWarning>
              {slot}
              {temNome ? `, ${nome}` : ""}!
            </h1>
            <p className="hn-sub">O que vamos preparar hoje?</p>
          </div>
          <nav className="hn-actions" aria-label="Comece por aqui">
            <Link to="/planejamento" className="hn-act main">
              <span className="ai">
                <Svg>{I.calendar}</Svg>
              </span>
              <span>
                <div className="at">Planejar minha semana</div>
                <div className="ad">Aulas organizadas por dia e turma</div>
              </span>
              <Svg className="ar">{I.arrow}</Svg>
            </Link>
            <Link to="/planejamento/atividade" className="hn-act">
              <span className="ai">
                <Svg>{I.pencil}</Svg>
              </span>
              <span>
                <div className="at">Criar plano de aula</div>
                <div className="ad">Pronto em poucos minutos</div>
              </span>
              <Svg className="ar">{I.arrow}</Svg>
            </Link>
            <Link to="/relatorios" className="hn-act">
              <span className="ai">
                <Svg>{I.doc}</Svg>
              </span>
              <span>
                <div className="at">Escrever pareceres</div>
                <div className="ad">Um por aluno, com a Sofia</div>
              </span>
              <Svg className="ar">{I.arrow}</Svg>
            </Link>
          </nav>
        </section>

        <div className="hn-h2 hn-in" style={d()}>
          <h2>Ferramentas</h2>
          <span>Tudo o que o AgilizaProf faz por você</span>
        </div>
        <nav className="hn-tools" aria-label="Ferramentas">
          {TOOLS.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              className="hn-tool hn-in"
              style={
                {
                  ...d(),
                  ["--tone" as string]: tool.tone,
                  ["--soft" as string]: tool.soft,
                } as CSSProperties
              }
            >
              <span className="ti">
                <Svg>{tool.icon}</Svg>
              </span>
              <h3>{tool.title}</h3>
              <p>{tool.desc}</p>
            </Link>
          ))}
        </nav>

        <div className="hn-h2 hn-in" style={d()}>
          <h2>Sua conta</h2>
        </div>
        <nav className="hn-more hn-in" style={d()} aria-label="Sua conta">
          <Link to="/minha-sala" className="hn-chip">
            <Svg>{I.users}</Svg>Minha sala: escolas, turmas e alunos
          </Link>
          <Link to="/configuracoes" className="hn-chip">
            <Svg>{I.gear}</Svg>Configurações
          </Link>
          <Link to="/indicacoes" className="hn-chip">
            <Svg>{I.gift}</Svg>Indique e ganhe
          </Link>
        </nav>
      </main>
    </div>
  );
}
