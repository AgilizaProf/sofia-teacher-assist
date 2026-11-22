import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useSofiaContext } from "@/lib/sofia/sofiaContext";
import { useSofiaOptional } from "@/components/sofia/SofiaProvider";
import { useHydrated } from "@/hooks/useHydrated";
import { useTurmas } from "@/hooks/useTurmas";
import { useCurriculoMunicipal } from "@/hooks/useCurriculoMunicipal";
import { TempoChip } from "@/components/painel/TempoChip";
import { InstalarApp } from "@/components/painel/InstalarApp";
import { useInstalarApp } from "@/lib/pwa/useInstalarApp";
import { useCreditos } from "@/lib/creditos/useCreditos";
import { CurriculoMunicipalCard } from "@/components/settings/CurriculoMunicipalCard";
import { PainelNav, painelTokensCss, ICONS } from "@/components/painel/PainelNav";
import { trackEvent } from "@/lib/tracking";
import {
  WhatsappLogo,
  textoParaConfirmar,
  usePendentesWhatsapp,
} from "@/components/painel/whatsapp";
import { ExtratoCreditos } from "@/components/painel/ExtratoCreditos";
import { CUSTOS } from "@/lib/creditos/policy";
import { AvisosSofia } from "@/components/painel/AvisosSofia";

// Página inicial no visual "Painel": contador pequeno no topo, caixa para
// escrever para a Sofia, currículo da rede e os cards de todas as funções.

type Card = { to?: string; title: string; desc: string; bg: string; icon: ReactNode; tag?: string };

const CARDS: Card[] = [
  {
    to: "/planejamento",
    title: "Planejamento",
    desc: "A semana da turma, com a Sofia preenchendo",
    bg: "var(--pn-green-soft)",
    icon: ICONS.cal,
  },
  {
    to: "/planejamento/atividade",
    title: "Nova atividade",
    desc: "Atividade pronta e alinhada ao currículo",
    bg: "var(--pn-cream)",
    icon: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </>
    ),
  },
  {
    to: "/relatorios",
    title: "Pareceres",
    desc: "Pareceres descritivos de cada aluno",
    bg: "var(--pn-sun)",
    icon: ICONS.pen,
  },
  {
    to: "/alfabetizacao",
    title: "Criança alfabetizada",
    desc: "Leitura e escrita de cada aluno, com cartões e evolução",
    bg: "var(--pn-blue-soft)",
    tag: "Novo",
    icon: ICONS.abc,
  },
  {
    to: "/inclusao",
    title: "Inclusão e PEI",
    desc: "Adaptações, registros e plano individual",
    bg: "var(--pn-lilac)",
    icon: ICONS.users,
  },
  {
    to: "/agenda",
    title: "Agenda",
    desc: "Reuniões, provas e prazos da escola",
    bg: "var(--pn-green-soft)",
    icon: ICONS.clock,
  },
  {
    to: "/jogos",
    title: "Jogos e atividades interativas",
    desc: "Jogos para criar a partir da aula e jogar com a turma",
    bg: "var(--pn-cream)",
    icon: (
      <>
        <rect x="2" y="7" width="20" height="12" rx="4" />
        <line x1="7" y1="11" x2="7" y2="15" />
        <line x1="5" y1="13" x2="9" y2="13" />
      </>
    ),
  },
  {
    to: "/questoes",
    title: "Questões",
    desc: "Banco de questões, provas e correção pela foto",
    bg: "var(--pn-pink)",
    icon: (
      <>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </>
    ),
  },
];

const SUGESTOES = [
  "Planeje a semana da minha turma",
  "Adapte uma atividade para um aluno com TEA",
  "Me ajude a escrever os pareceres do bimestre",
  "Ideias para a feira de ciências",
];

const css = `
.hm{min-height:100dvh;padding-bottom:40px;}
.hm-wrap{max-width:1240px;margin:0 auto;padding:22px 24px 0;}
.hm-strip{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.hm-chip{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 12px 0 6px;border-radius:10px;text-decoration:none;color:var(--pn-ink);font-size:13.5px;font-weight:600;white-space:nowrap;}
.hm-time{background:var(--pn-green-soft);border:1.5px solid var(--pn-green);font-family:inherit;cursor:pointer;}
.hm-time:hover{background:#B9E6D3;}
.hm-time .ic{width:24px;height:24px;border-radius:7px;background:var(--pn-green);color:#fff;display:flex;align-items:center;justify-content:center;}
.hm-time .ic svg{width:14px;height:14px;}
.hm-time b{font-family:var(--pn-display);font-variant-numeric:tabular-nums;}
.hm-time .lvl{font-size:12px;font-weight:700;padding:2px 7px;border-radius:5px;background:#fff;}
.hm-cred{background:var(--pn-surface);border:1.5px solid var(--pn-line);padding-left:12px;font-family:inherit;cursor:pointer;}
.hm-cred:hover{border-color:var(--pn-ink);}
.hm-cred .bar{width:60px;height:8px;border-radius:3px;background:var(--pn-bg);overflow:hidden;}
.hm-cred .bar span{display:block;height:100%;background:var(--pn-green);}
.hm-cred b{font-variant-numeric:tabular-nums;}
.hm-cred-eq{font-weight:500;color:var(--pn-muted);}
.hm-date{margin-left:auto;font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--pn-muted);}
.hm-hello{margin:14px 0 14px;font-family:var(--pn-display);font-weight:800;font-size:34px;letter-spacing:-.045em;line-height:1.05;text-wrap:balance;}
.hm-skel{display:inline-block;width:5em;height:.8em;margin-left:.3em;border-radius:8px;background:linear-gradient(90deg,#E4E8F0,#F2F4F8,#E4E8F0);background-size:200% 100%;animation:hmSkel 1.2s ease-in-out infinite;vertical-align:baseline;}
@keyframes hmSkel{0%{background-position:100% 0}100%{background-position:-100% 0}}
@media (prefers-reduced-motion:reduce){.hm-skel{animation:none;}}

.hm-conta{min-width:30px;height:30px;padding:0 8px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-family:var(--pn-display);font-weight:800;font-size:15px;background:var(--pn-bg);color:var(--pn-muted);border:1.5px solid var(--pn-line);}
.hm-conta.on{background:#25D366;color:var(--pn-ink);border-color:var(--pn-ink);}
.hm-sofia{background:var(--pn-sun);border:2px solid var(--pn-ink);border-radius:20px;box-shadow:4px 4px 0 var(--pn-ink);padding:18px;}
.hm-sofia-h{display:flex;align-items:center;gap:8px;font-family:var(--pn-display);font-weight:700;font-size:16px;}
.hm-sofia-h .ic{width:28px;height:28px;border-radius:8px;background:var(--pn-ink);color:var(--pn-sun);display:flex;align-items:center;justify-content:center;}
.hm-sofia-h .ic svg{width:16px;height:16px;}
.hm-box{margin-top:10px;background:#fff;border:2px solid var(--pn-ink);border-radius:14px;padding:12px 12px 10px;}
.hm-box textarea{width:100%;min-height:64px;border:0;resize:vertical;font-family:inherit;font-size:16px;line-height:1.45;color:var(--pn-ink);background:transparent;outline:none;}
.hm-box-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.hm-pill{display:inline-flex;align-items:center;height:32px;padding:0 10px;border-radius:8px;background:var(--pn-bg);font-size:13px;font-weight:700;color:var(--pn-ink);border:0;font-family:inherit;}
.hm-pill.curr{background:var(--pn-blue-soft);text-decoration:none;}
select.hm-pill{cursor:pointer;padding-right:6px;}
.hm-icbtn{width:32px;height:32px;border-radius:8px;border:1.5px solid var(--pn-line);background:#fff;color:var(--pn-ink);display:flex;align-items:center;justify-content:center;cursor:pointer;}
.hm-icbtn svg{width:16px;height:16px;}
.hm-icbtn.on{background:var(--pn-coral);border-color:var(--pn-ink);color:#fff;}
.hm-send{margin-left:auto;height:40px;font-size:14px;}
.hm-sugs{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;}
.hm-sugs button{height:36px;padding:0 12px;border-radius:8px;border:1.5px solid var(--pn-line);background:#fff;font-family:inherit;font-size:14px;font-weight:600;color:var(--pn-ink);cursor:pointer;}
.hm-sugs button:hover{border-color:var(--pn-ink);}

.hm-app{margin-top:16px;display:inline-flex;align-items:center;gap:6px;padding:4px 2px;border:0;background:none;cursor:pointer;
  font-family:inherit;font-size:13.5px;font-weight:700;color:var(--pn-green);text-decoration:underline;text-underline-offset:3px;}
.hm-app svg{width:16px;height:16px;}
.hm-app + .hm-curr,.hm-app ~ .hm-curr{margin-top:14px;}
.hm-curr{margin-top:26px;display:flex;align-items:center;gap:14px;background:var(--pn-surface);border:1.5px solid var(--pn-line);border-radius:18px;padding:14px 16px;flex-wrap:wrap;}
.hm-badge{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--pn-ink);}
.hm-badge svg{width:22px;height:22px;}
.hm-curr-txt{flex:1;min-width:220px;}
.hm-curr-txt b{display:block;font-family:var(--pn-display);font-size:16px;}
.hm-curr-txt span{display:block;margin-top:2px;font-size:13.5px;color:var(--pn-muted);}
.hm-slot{display:inline-flex;align-items:center;gap:8px;height:38px;padding:0 12px;border-radius:10px;font-size:13.5px;font-weight:700;white-space:nowrap;
  background:var(--pn-green-soft);border:1.5px solid var(--pn-green);}
.hm-slot.proc{background:var(--pn-cream);border-color:#C98A00;}
.hm-slot.err{background:var(--pn-pink);border-color:var(--pn-coral);}
.hm-slot em{font-style:normal;padding:2px 6px;border-radius:5px;background:var(--pn-green);color:#fff;font-size:11px;}
.hm-add{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 12px;border-radius:10px;border:1.5px dashed var(--pn-muted);background:transparent;
  font-family:inherit;font-size:13.5px;font-weight:700;color:var(--pn-ink);cursor:pointer;white-space:nowrap;}
.hm-add:hover{border-color:var(--pn-ink);border-style:solid;}

.hm-sec{display:flex;justify-content:space-between;align-items:baseline;margin:24px 0 12px;}
.hm-sec h2{margin:0;font-family:var(--pn-display);font-weight:700;font-size:18px;}
.hm-sec span{font-size:13.5px;color:var(--pn-muted);}
.hm-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;}
.hm-card{display:flex;flex-direction:column;gap:10px;padding:16px;background:var(--pn-surface);border:1.5px solid var(--pn-line);border-radius:18px;text-decoration:none;color:var(--pn-ink);
  transition:border-color .15s,box-shadow .15s,transform .15s;min-width:0;}
a.hm-card:hover{border-color:var(--pn-ink);box-shadow:4px 4px 0 var(--pn-ink);transform:translate(-2px,-2px);}
.hm-card.soon{opacity:.75;}
.hm-card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;}
.hm-tag{padding:4px 8px;border-radius:6px;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;background:var(--pn-bg);color:var(--pn-ink);white-space:nowrap;}
.hm-card h3{margin:0;font-family:var(--pn-display);font-weight:700;font-size:17px;letter-spacing:-.01em;}
.hm-card p{margin:3px 0 0;font-size:13.5px;line-height:1.4;color:var(--pn-muted);}
.hm-go{display:flex;align-items:center;gap:6px;font-size:13.5px;font-weight:700;color:var(--pn-green);margin-top:auto;}
.hm-go svg{width:14px;height:14px;}

.hm-modal-bg{position:fixed;inset:0;z-index:70;background:rgba(20,22,31,.5);display:flex;align-items:center;justify-content:center;padding:16px;}
.hm-modal{width:100%;max-width:760px;max-height:90vh;overflow:auto;background:var(--pn-surface);border:2px solid var(--pn-ink);border-radius:20px;box-shadow:6px 6px 0 var(--pn-ink);padding:22px;}
.hm-modal-h{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;}
.hm-modal-h h2{margin:0;font-family:var(--pn-display);font-size:22px;letter-spacing:-.03em;}
.hm-modal-h p{margin:4px 0 0;font-size:14px;color:var(--pn-muted);line-height:1.45;}

@media (max-width: 860px){
  .hm{padding-bottom:110px;}
  .hm-wrap{padding:16px max(16px,env(safe-area-inset-right,0px)) 0 max(16px,env(safe-area-inset-left,0px));}
  .hm-date{display:none;}
  .hm-hello{font-size:28px;margin:14px 0 10px;}
  .hm-sofia{padding:14px;}
  .hm-time .lbl{display:none;}
  .hm-cred .bar{width:40px;}
  .hm-cred-eq{display:none;}
  .hm-sugs{display:none;}
  .hm-curr{padding:12px;gap:10px;}
  .hm-curr .hm-badge{width:36px;height:36px;}
  .hm-curr-txt{min-width:0;flex:1 1 200px;}
  .hm-slot,.hm-add{width:100%;justify-content:flex-start;}
  .hm-cards{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
  .hm-card{padding:12px;gap:8px;}
  .hm-card .hm-badge{width:36px;height:36px;}
  .hm-card .hm-badge svg{width:18px;height:18px;}
  .hm-card h3{font-size:14.5px;}
  .hm-card p{font-size:12px;}
  .hm-go{display:none;}
}
@media (prefers-reduced-motion: reduce){.hm-card{transition:none;}}
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

function saudacaoAgora(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function dataHoje(): string {
  return new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

// Ditado por voz quando o navegador oferece reconhecimento de fala.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getRecognition(): any {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  const R = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!R) return null;
  const r = new R();
  r.lang = "pt-BR";
  r.interimResults = false;
  r.continuous = false;
  return r;
}

export function Home() {
  const hydrated = useHydrated();
  const ctx = useSofiaContext();
  const sofia = useSofiaOptional();
  const navigate = useNavigate();
  const { turmas } = useTurmas();
  const { curriculos, load: reloadCurriculos } = useCurriculoMunicipal();
  const cred = useCreditos();
  const { pendentes } = usePendentesWhatsapp();
  const [extrato, setExtrato] = useState(false);

  const [baixar, setBaixar] = useState(false);
  const app = useInstalarApp();
  const [texto, setTexto] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [ouvindo, setOuvindo] = useState(false);
  const [podeOuvir, setPodeOuvir] = useState(false);
  const [modalCurr, setModalCurr] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setPodeOuvir(!!getRecognition()), []);
  useEffect(() => {
    if (!turmaId && turmas.length > 0) setTurmaId(turmas[0].id);
  }, [turmas, turmaId]);
  useEffect(() => {
    if (!modalCurr) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && fecharModal();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalCurr]);

  const primeiro = (ctx.user?.primeiro_nome || "").trim();
  const nome = primeiro && primeiro !== "Educador(a)" ? primeiro : "";
  const cardWa = (
    <Link
      to="/confirmar"
      className="hm-card hm-card-wa"
      aria-label={
        pendentes > 0
          ? `${textoParaConfirmar(pendentes)}: mensagens do WhatsApp`
          : "Para confirmar: nada esperando do WhatsApp"
      }
    >
      <span className="hm-card-top">
        <span className="hm-badge" style={{ background: "#D9FDD3", color: "#0B7A55" }}>
          <WhatsappLogo size={24} />
        </span>
        <span className={"hm-conta" + (pendentes > 0 ? " on" : "")} aria-hidden>
          {pendentes}
        </span>
      </span>
      <span>
        <h3>Para confirmar</h3>
        <p>
          {pendentes > 0
            ? "O que chegou pelo WhatsApp e espera seu sim"
            : "Nada esperando do WhatsApp"}
        </p>
      </span>
      <span className="hm-go">
        Abrir
        <Svg w={2.5}>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </Svg>
      </span>
    </Link>
  );
  const credPct = cred.totais > 0 ? Math.round((cred.disponiveis / cred.totais) * 100) : 0;
  const turma = turmas.find((t) => t.id === turmaId);
  const padrao = useMemo(
    () =>
      curriculos.find((c) => c.eh_padrao && c.status === "ativo") ??
      curriculos.find((c) => c.status === "ativo") ??
      null,
    [curriculos],
  );

  const enviar = () => {
    const prompt = texto.trim();
    if (!prompt || !sofia) return;
    const partes = [
      turma ? `Turma: ${turma.name}${turma.grade ? ` (${turma.grade})` : ""}` : "",
      padrao ? `Currículo da rede: ${padrao.municipio}` : "",
    ].filter(Boolean);
    const contexto = partes.join(" · ");
    const mensagem = contexto ? `${prompt}\n\n[Contexto: ${contexto}]` : prompt;
    // Abre a conversa já em tela cheia (página do Assistente), sem a janelinha.
    if (sofia.busy) sofia.setDraft(mensagem);
    else void sofia.send(mensagem);
    navigate({ to: "/assistente" });
    trackEvent("home_sofia_enviar", { location: "home", com_turma: !!turma });
    setTexto("");
  };

  const ditar = () => {
    if (ouvindo) {
      recRef.current?.stop?.();
      return;
    }
    const r = getRecognition();
    if (!r) return;
    recRef.current = r;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      const t = Array.from(e.results as ArrayLike<{ 0: { transcript: string } }>)
        .map((x) => x[0].transcript)
        .join(" ");
      setTexto((prev) => (prev ? `${prev} ${t}` : t));
    };
    r.onend = () => setOuvindo(false);
    r.onerror = () => setOuvindo(false);
    setOuvindo(true);
    r.start();
  };

  const fecharModal = () => {
    setModalCurr(false);
    void reloadCurriculos();
  };

  return (
    <div className="pn hm">
      <style dangerouslySetInnerHTML={{ __html: painelTokensCss + css }} />
      <PainelNav />
      <main className="hm-wrap">
        <div className="hm-strip">
          <TempoChip className="hm-chip hm-time" />
          {!cred.loading && cred.totais > 0 && (
            <button
              type="button"
              className="hm-chip hm-cred"
              title="Ver o extrato de créditos"
              aria-haspopup="dialog"
              onClick={() => setExtrato(true)}
            >
              Créditos
              <span className="bar" aria-hidden>
                <span style={{ width: `${credPct}%` }} />
              </span>
              <b>
                {cred.disponiveis.toLocaleString("pt-BR")}
              </b>
              <span className="hm-cred-eq">
                · dá para uns {Math.floor(cred.disponiveis / CUSTOS.plano_aula).toLocaleString("pt-BR")} planos de aula
              </span>
            </button>
          )}
          {hydrated && <span className="hm-date">{dataHoje()}</span>}
        </div>

        <h1 className="hm-hello" suppressHydrationWarning>
          {hydrated ? saudacaoAgora() : "Olá"}
          {nome ? `, ${nome}` : ""}
          {ctx.user?.carregado === false ? <span className="hm-skel" aria-hidden /> : "."}
        </h1>

        <section className="hm-sofia" aria-labelledby="hm-sofia-h">
          <div className="hm-sofia-h" id="hm-sofia-h">
            <span className="ic">
              <Svg w={2}>{ICONS.spark}</Svg>
            </span>
            Fale com a Sofia
          </div>
          <form
            className="hm-box"
            onSubmit={(e) => {
              e.preventDefault();
              enviar();
            }}
          >
            <label
              htmlFor="hm-sofia-txt"
              className="sr-only"
              style={{ position: "absolute", left: -9999 }}
            >
              Mensagem para a Sofia
            </label>
            <textarea
              id="hm-sofia-txt"
              ref={taRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviar();
                }
              }}
              placeholder="O que você precisa hoje? Ex.: aula de frações com adaptação para TEA."
            />
            <div className="hm-box-row">
              {turmas.length > 0 && (
                <select
                  className="hm-pill"
                  aria-label="Turma"
                  value={turmaId}
                  onChange={(e) => setTurmaId(e.target.value)}
                >
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>
                      Turma: {t.name}
                    </option>
                  ))}
                </select>
              )}
              {padrao && (
                <span
                  className="hm-pill curr"
                  title="A Sofia usa os códigos do currículo da sua rede"
                >
                  Currículo: {padrao.municipio}
                </span>
              )}
              {podeOuvir && (
                <button
                  type="button"
                  className={"hm-icbtn" + (ouvindo ? " on" : "")}
                  aria-label={ouvindo ? "Parar de ouvir" : "Falar em vez de digitar"}
                  aria-pressed={ouvindo}
                  onClick={ditar}
                >
                  <Svg>
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 10a7 7 0 0 0 14 0" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </Svg>
                </button>
              )}
              <button
                type="submit"
                className="pn-btn primary hm-send"
                disabled={!texto.trim() || !sofia}
              >
                Enviar
                <Svg w={2.5}>
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </Svg>
              </button>
            </div>
          </form>
          <div className="hm-sugs">
            {SUGESTOES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setTexto(s);
                  taRef.current?.focus();
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {hydrated && <AvisosSofia />}

        <div className="hm-sec">
          <h2>Suas ferramentas</h2>
          <span>{CARDS.length + (pendentes > 0 ? 1 : 0)} funções</span>
        </div>
        <nav className="hm-cards" aria-label="Funcionalidades">
          {pendentes > 0 && cardWa}
          {CARDS.map((c) => {
            const inner = (
              <>
                <span className="hm-card-top">
                  <span className="hm-badge" style={{ background: c.bg }}>
                    <Svg>{c.icon}</Svg>
                  </span>
                  {c.tag && <span className="hm-tag">{c.tag}</span>}
                </span>
                <span>
                  <h3>{c.title}</h3>
                  <p>{c.desc}</p>
                </span>
                {c.to && (
                  <span className="hm-go">
                    Abrir
                    <Svg w={2.5}>
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </Svg>
                  </span>
                )}
              </>
            );
            return c.to ? (
              <Link key={c.title} to={c.to} className="hm-card">
                {inner}
              </Link>
            ) : (
              <div key={c.title} className="hm-card soon" aria-disabled="true">
                {inner}
              </div>
            );
          })}
          {/* Sem mensagens esperando, o "Para confirmar" fica só no topo e no menu,
              e a grade fecha em linhas completas. "Indique e ganhe" também fica no topo. */}
        </nav>

        {!app.instalado && (
          <button
            type="button"
            className="hm-app"
            onClick={async () => {
              if (!(app.podeInstalarDireto && (await app.instalar()))) setBaixar(true);
            }}
          >
            <Svg>{ICONS.phone}</Svg>
            Baixar o app no celular
          </button>
        )}
        {baixar && <InstalarApp onClose={() => setBaixar(false)} />}
        {extrato && <ExtratoCreditos cred={cred} onClose={() => setExtrato(false)} />}

        <section className="hm-curr" aria-labelledby="hm-curr-h">
          <span className="hm-badge" style={{ background: "var(--pn-blue-soft)" }}>
            <Svg>
              <path d="M3 21h18" />
              <path d="M5 21V10l7-5 7 5v11" />
              <path d="M10 21v-5h4v5" />
            </Svg>
          </span>
          <div className="hm-curr-txt">
            <b id="hm-curr-h">Currículo da sua rede</b>
            <span>
              Com o currículo ativo, a Sofia troca os códigos da BNCC pelos do seu município nos
              planos, relatórios e pareceres.
            </span>
          </div>
          {curriculos.map((c) => (
            <span
              key={c.id}
              className={
                "hm-slot" +
                (c.status === "processando" ? " proc" : c.status === "erro" ? " err" : "")
              }
            >
              {c.municipio || c.arquivo_nome}
              {c.status === "processando" ? " · processando" : c.status === "erro" ? " · erro" : ""}
              {c.eh_padrao && c.status === "ativo" && <em>Padrão</em>}
            </span>
          ))}
          <button type="button" className="hm-add" onClick={() => setModalCurr(true)}>
            {curriculos.length === 0
              ? "+ Anexar currículo (PDF)"
              : curriculos.length < 2
                ? "+ Anexar outro currículo (PDF)"
                : "Gerenciar currículos"}
          </button>
        </section>
      </main>

      {modalCurr && (
        <div className="hm-modal-bg" onClick={fecharModal}>
          <div
            className="hm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hm-modal-h"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hm-modal-h">
              <div>
                <h2 id="hm-modal-h">Currículo da sua rede</h2>
                <p>
                  Envie o PDF do currículo do seu município. Você pode guardar até dois e escolher
                  qual é o padrão.
                </p>
              </div>
              <button type="button" className="pn-btn" style={{ height: 38 }} onClick={fecharModal}>
                Fechar
              </button>
            </div>
            <CurriculoMunicipalCard />
          </div>
        </div>
      )}
    </div>
  );
}
