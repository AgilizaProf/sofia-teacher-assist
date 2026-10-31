import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { AppSidebar, sidebarCss } from "@/components/AppSidebar";
import { Header as AppHeader, appHeaderCss } from "@/components/Header";
import { useSofiaContext } from "@/lib/sofia/sofiaContext";
import { useHydrated } from "@/hooks/useHydrated";
import { trackEvent } from "@/lib/tracking";

// Página inicial: saudação, três atalhos principais e todas as ferramentas
// agrupadas pelo que o(a) professor(a) quer fazer. O antigo painel
// (escolas, turmas, alunos) vive em /minha-sala.

type Tool = { to: string; title: string; desc: string; icon: ReactNode; keywords?: string };
type Group = { title: string; tint: string; tools: Tool[] };

const I = {
  sofia: (
    <>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 9h8M8 13h5" />
    </>
  ),
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
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.18V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-2.82-1.18l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.09 15H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
};

const QUICK: Array<{ to: string; title: string; desc: string; icon: ReactNode }> = [
  {
    to: "/planejamento/atividade",
    title: "Criar plano de aula",
    desc: "Alinhado à BNCC em poucos minutos",
    icon: I.pencil,
  },
  {
    to: "/relatorios",
    title: "Escrever parecer",
    desc: "Pareceres descritivos dos alunos",
    icon: I.doc,
  },
  {
    to: "/assistente",
    title: "Perguntar à Sofia",
    desc: "Sua assistente pedagógica com IA",
    icon: I.sofia,
  },
];

const GROUPS: Group[] = [
  {
    title: "Planejar aulas",
    tint: "#2563EB",
    tools: [
      {
        to: "/planejamento",
        title: "Planejamento semanal",
        desc: "Organize a semana e replique aulas entre turmas.",
        icon: I.calendar,
      },
      {
        to: "/planejamento/atividade",
        title: "Plano de aula",
        desc: "Crie uma atividade completa a partir do tema.",
        icon: I.pencil,
        keywords: "atividade bncc",
      },
      {
        to: "/planejamento/ei",
        title: "Educação Infantil",
        desc: "Roteiros de experiência pelos campos da BNCC.",
        icon: I.blocks,
        keywords: "ei creche pré",
      },
    ],
  },
  {
    title: "Acompanhar alunos",
    tint: "#0D9488",
    tools: [
      {
        to: "/relatorios",
        title: "Relatórios e pareceres",
        desc: "Pareceres descritivos prontos para revisar.",
        icon: I.doc,
        keywords: "parecer avaliação",
      },
      {
        to: "/inclusao",
        title: "Inclusão",
        desc: "Alunos com laudo e adaptações de atividades.",
        icon: I.heart,
        keywords: "pcd laudo aee",
      },
      {
        to: "/inclusao/pei",
        title: "PEI / PDI",
        desc: "Plano individualizado com metas e evidências.",
        icon: I.target,
        keywords: "pei pdi plano individual",
      },
    ],
  },
  {
    title: "Organizar",
    tint: "#D97706",
    tools: [
      {
        to: "/agenda",
        title: "Agenda escolar",
        desc: "Reuniões, avaliações e entregas num só lugar.",
        icon: I.clock,
        keywords: "calendário prova",
      },
      {
        to: "/minha-sala",
        title: "Minha sala",
        desc: "Escolas, turmas e alunos cadastrados.",
        icon: I.users,
        keywords: "turma aluno escola",
      },
      {
        to: "/assistente",
        title: "Sofia, assistente IA",
        desc: "Tire dúvidas e peça ideias a qualquer hora.",
        icon: I.sofia,
        keywords: "ia chat ajuda",
      },
    ],
  },
  {
    title: "Sua conta",
    tint: "#475569",
    tools: [
      {
        to: "/configuracoes",
        title: "Configurações",
        desc: "Perfil, plano, currículo municipal e acessibilidade.",
        icon: I.gear,
        keywords: "perfil plano conta",
      },
      {
        to: "/indicacoes",
        title: "Indique e ganhe",
        desc: "Convide colegas e ganhe meses grátis.",
        icon: I.gift,
        keywords: "indicação convite",
      },
    ],
  },
];

const css = `
.hp-root{min-height:100vh;background:#F8FAFC;color:#0F172A;font-family:'Inter',-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.hp-grid{display:grid;grid-template-columns:240px 1fr;min-height:100vh;}
.hp-main{min-width:0;width:100%;}
.hp-pad{padding:32px 40px 56px;max-width:1120px;}
.hp-fade{opacity:0;animation:hp-in .4s ease-out forwards;animation-delay:var(--d,0ms);}
@keyframes hp-in{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}

.hp-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:28px;}
.hp-date{font-size:13px;font-weight:500;color:#64748B;margin:0 0 6px;}
.hp-hello{margin:0;font-size:28px;font-weight:700;letter-spacing:-.02em;line-height:1.2;color:#0F172A;}
.hp-sub{margin:6px 0 0;font-size:15px;color:#475569;}
.hp-search{position:relative;width:300px;max-width:100%;}
.hp-search svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:#94A3B8;pointer-events:none;}
.hp-search input{width:100%;height:42px;border:1px solid #E2E8F0;border-radius:10px;background:#fff;padding:0 12px 0 36px;font:inherit;font-size:14px;color:#0F172A;transition:border-color .15s,box-shadow .15s;}
.hp-search input:focus{outline:none;border-color:#2563EB;box-shadow:0 0 0 3px rgba(37,99,235,.15);}

.hp-quick{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:36px;}
.hp-q{display:flex;align-items:center;gap:14px;padding:16px 18px;border-radius:12px;text-decoration:none;color:#0F172A;background:#fff;border:1px solid #E2E8F0;transition:border-color .15s,box-shadow .15s,transform .15s;}
.hp-q:hover,.hp-q:focus-visible{border-color:#93B4F5;box-shadow:0 6px 16px rgba(15,23,42,.06);transform:translateY(-1px);outline:none;}
.hp-q .qi{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:#EFF4FF;color:#2563EB;flex-shrink:0;}
.hp-q.primary{background:#2563EB;border-color:#2563EB;color:#fff;}
.hp-q.primary:hover,.hp-q.primary:focus-visible{background:#1D4ED8;border-color:#1D4ED8;box-shadow:0 8px 20px rgba(37,99,235,.25);}
.hp-q.primary .qi{background:rgba(255,255,255,.16);color:#fff;}
.hp-q .qi svg{width:20px;height:20px;}
.hp-q .qt{font-size:15px;font-weight:600;line-height:1.3;}
.hp-q .qd{font-size:12.5px;color:#64748B;margin-top:2px;}
.hp-q.primary .qd{color:rgba(255,255,255,.8);}

.hp-group{margin-bottom:28px;}
.hp-group h2{display:flex;align-items:center;gap:8px;margin:0 0 12px;font-size:13px;font-weight:600;color:#475569;}
.hp-group h2::before{content:"";width:8px;height:8px;border-radius:2px;background:var(--t);}
.hp-tools{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;}
.hp-t{display:flex;align-items:flex-start;gap:14px;padding:16px;border-radius:12px;text-decoration:none;color:inherit;background:#fff;border:1px solid #E2E8F0;transition:border-color .15s,box-shadow .15s;}
.hp-t:hover,.hp-t:focus-visible{border-color:color-mix(in srgb,var(--t) 45%,#fff);box-shadow:0 6px 16px rgba(15,23,42,.06);outline:none;}
.hp-t .ti{width:38px;height:38px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--t);background:color-mix(in srgb,var(--t) 10%,#fff);}
.hp-t .ti svg{width:19px;height:19px;}
.hp-t .tb{flex:1;min-width:0;}
.hp-t h3{margin:0;font-size:14.5px;font-weight:600;color:#0F172A;line-height:1.3;}
.hp-t p{margin:3px 0 0;font-size:13px;line-height:1.45;color:#64748B;}
.hp-t .chev{width:16px;height:16px;color:#CBD5E1;flex-shrink:0;align-self:center;transition:transform .15s,color .15s;}
.hp-t:hover .chev{color:var(--t);transform:translateX(2px);}
.hp-empty{padding:28px;text-align:center;color:#64748B;font-size:14px;background:#fff;border:1px dashed #E2E8F0;border-radius:12px;}

@media(max-width:1100px){.hp-tools{grid-template-columns:repeat(2,minmax(0,1fr));}}
@media(max-width:820px){
  .hp-grid{grid-template-columns:1fr;}
  .hp-pad{padding:20px 16px 40px;}
  .hp-head{margin-bottom:20px;}
  .hp-hello{font-size:24px;}
  .hp-search{width:100%;}
  .hp-quick{grid-template-columns:1fr;gap:10px;margin-bottom:28px;}
  .hp-tools{grid-template-columns:1fr;gap:10px;}
}
@media (prefers-reduced-motion: reduce){.hp-fade{animation:none;opacity:1;}}
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
  const txt = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function Home() {
  const hydrated = useHydrated();
  const sofiaCtx = useSofiaContext();
  const nome = (sofiaCtx.user?.primeiro_nome || "").trim();
  const [busca, setBusca] = useState("");

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

  const grupos = useMemo(() => {
    const q = norm(busca.trim());
    if (!q) return GROUPS;
    return GROUPS.map((g) => ({
      ...g,
      tools: g.tools.filter((t) => norm(`${t.title} ${t.desc} ${t.keywords ?? ""}`).includes(q)),
    })).filter((g) => g.tools.length > 0);
  }, [busca]);

  // SSR/primeiro paint usa "Olá" pra não dar mismatch de hidratação.
  const slot = hydrated ? saudacaoAgora() : "Olá";
  const temNome = nome && nome !== "Educador(a)";
  let delay = 0;
  const next = () => ({ ["--d" as string]: `${(delay += 30)}ms` }) as CSSProperties;

  return (
    <div className="hp-root">
      <style dangerouslySetInnerHTML={{ __html: css + sidebarCss + appHeaderCss }} />
      <div className="hp-grid">
        <AppSidebar active="home" />
        <main className="hp-main">
          <AppHeader breadcrumb={[{ label: "Página inicial" }]} />
          <div className="hp-pad">
            <header className="hp-head hp-fade">
              <div>
                <p className="hp-date" suppressHydrationWarning>
                  {hydrated ? dataHoje() : " "}
                </p>
                <h1 className="hp-hello" suppressHydrationWarning>
                  {slot}
                  {temNome ? `, ${nome}` : ""}
                </h1>
                <p className="hp-sub">Por onde você quer começar hoje?</p>
              </div>
              <label className="hp-search">
                <Svg>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </Svg>
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar ferramenta…"
                  aria-label="Buscar ferramenta"
                />
              </label>
            </header>

            {!busca && (
              <nav className="hp-quick" aria-label="Atalhos principais">
                {QUICK.map((q, i) => (
                  <Link
                    key={q.title}
                    to={q.to}
                    className={`hp-q hp-fade${i === 0 ? " primary" : ""}`}
                    style={next()}
                  >
                    <span className="qi">
                      <Svg>{q.icon}</Svg>
                    </span>
                    <span>
                      <div className="qt">{q.title}</div>
                      <div className="qd">{q.desc}</div>
                    </span>
                  </Link>
                ))}
              </nav>
            )}

            {grupos.length === 0 && (
              <div className="hp-empty">Nenhuma ferramenta encontrada para “{busca}”.</div>
            )}

            {grupos.map((g) => (
              <section
                key={g.title}
                className="hp-group"
                style={{ ["--t" as string]: g.tint } as CSSProperties}
              >
                <h2>{g.title}</h2>
                <div className="hp-tools">
                  {g.tools.map((t) => (
                    <Link key={g.title + t.to} to={t.to} className="hp-t hp-fade" style={next()}>
                      <span className="ti">
                        <Svg>{t.icon}</Svg>
                      </span>
                      <span className="tb">
                        <h3>{t.title}</h3>
                        <p>{t.desc}</p>
                      </span>
                      <Svg className="chev">
                        <polyline points="9 18 15 12 9 6" />
                      </Svg>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
