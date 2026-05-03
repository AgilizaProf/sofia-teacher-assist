import { useState } from "react";
import { useSearch, useNavigate } from "@tanstack/react-router";
import {
  Search, Bell, HelpCircle, FileText, Download, Printer, X, Sparkles,
  Plus, Upload, BookOpen, Users, Activity, Clock, ChevronRight, ChevronDown,
  CheckCircle2, AlertCircle, Calendar, Send, ArrowLeft,
} from "lucide-react";
import { AppSidebar, sidebarCss } from "@/components/AppSidebar";

const css = `
.inc-root{
  --primary:#1B2A4E;--primary-dark:#0F1B36;--accent:#FF7A45;--accent-warm:#FF9466;--accent-soft:#FFF1E8;
  --success:#10B981;--warn:#F59E0B;--danger:#EF4444;
  --bg:#F4F6FB;--card:#FFFFFF;--text:#1B2A4E;--muted:#6B7691;--border:#E4E8F0;
  font-family:'Inter',-apple-system,sans-serif;background:var(--bg);color:var(--text);
  -webkit-font-smoothing:antialiased;line-height:1.5;font-size:14px;min-height:100vh;
}
.inc-root *{box-sizing:border-box;}
.inc-root h1,.inc-root h2,.inc-root h3,.inc-root h4{margin:0;letter-spacing:-.02em;color:var(--text);}
.inc-root button{font-family:inherit;cursor:pointer;border:none;background:transparent;color:inherit;}
.inc-root p{margin:0;}
.inc-root input,.inc-root textarea,.inc-root select{font-family:inherit;font-size:13px;}

.inc-app{display:grid;grid-template-columns:240px 1fr;min-height:100vh;}
.inc-main{padding:18px 26px 48px;overflow-x:hidden;}

.inc-topbar{display:flex;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap;}
.inc-crumbs{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);font-weight:600;}
.inc-crumbs strong{color:var(--text);}
.inc-tag-orange{background:linear-gradient(135deg,var(--accent),var(--accent-warm));color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px;}
.inc-top-actions{margin-left:auto;display:flex;align-items:center;gap:8px;}
.inc-icon-btn{width:34px;height:34px;border-radius:9px;background:#fff;border:1px solid var(--border);display:grid;place-items:center;color:var(--muted);}
.inc-icon-btn:hover{border-color:var(--primary);color:var(--primary);}
.inc-user{display:flex;align-items:center;gap:9px;background:#fff;border:1px solid var(--border);border-radius:99px;padding:4px 13px 4px 4px;}
.inc-user-av{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#fff;display:grid;place-items:center;font-weight:700;font-size:10.5px;}
.inc-user-name{font-size:11.5px;font-weight:700;}
.inc-user-plan{font-size:9px;color:var(--accent);font-weight:800;text-transform:uppercase;letter-spacing:.06em;}

.inc-header{display:flex;align-items:flex-end;gap:18px;margin-bottom:18px;flex-wrap:wrap;}
.inc-header-l h1{font-family:'Fraunces',serif;font-weight:800;font-size:34px;line-height:1.05;}
.inc-header-l p{color:var(--muted);font-size:13.5px;margin-top:4px;}
.inc-header-r{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;}
.inc-btn{display:inline-flex;align-items:center;gap:7px;padding:10px 14px;border-radius:10px;font-size:13px;font-weight:700;border:1px solid var(--border);background:#fff;color:var(--text);transition:.15s;}
.inc-btn:hover{border-color:var(--primary);}
.inc-btn-primary{background:linear-gradient(135deg,var(--accent),var(--accent-warm));color:#fff;border:none;box-shadow:0 8px 18px rgba(255,122,69,.35);}
.inc-btn-primary:hover{filter:brightness(1.05);}

.inc-hero{display:grid;grid-template-columns:1.3fr 1fr;gap:16px;margin-bottom:18px;}
@media(max-width:1024px){.inc-hero{grid-template-columns:1fr;}}
.inc-hero-l{background:#fff;border:1px solid var(--border);border-radius:14px;padding:20px;}
.inc-hero-id{display:flex;align-items:center;gap:14px;margin-bottom:14px;}
.inc-avatar-lg{width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent-warm));color:#fff;display:grid;place-items:center;font-family:'Fraunces',serif;font-weight:800;font-size:24px;box-shadow:0 0 0 3px rgba(255,122,69,.2);}
.inc-hero-id h2{font-family:'Fraunces',serif;font-weight:800;font-size:22px;}
.inc-hero-id .sub{color:var(--muted);font-size:12.5px;margin-top:2px;}
.inc-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;}
.inc-chip-info{font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px;background:var(--accent-soft);color:#B8410E;}
.inc-chip-info.muted{background:var(--bg);color:var(--muted);}
.inc-mini-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
@media(max-width:720px){.inc-mini-kpis{grid-template-columns:repeat(2,1fr);}}
.inc-mini-kpi{padding:10px 12px;background:linear-gradient(180deg,#fff,#FAFBFE);border:1px solid var(--border);border-radius:10px;}
.inc-mini-kpi .lbl{font-size:10.5px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;}
.inc-mini-kpi .val{font-family:'Fraunces',serif;font-weight:800;font-size:20px;margin-top:3px;color:var(--text);}

.inc-action-card{background:linear-gradient(135deg,var(--primary),var(--primary-dark));border-radius:14px;padding:20px;color:#fff;position:relative;overflow:hidden;}
.inc-action-card::before{content:"";position:absolute;top:-50%;right:-30%;width:100%;height:160%;background:radial-gradient(circle,rgba(255,122,69,.28) 0%,transparent 60%);pointer-events:none;}
.inc-ac-tag{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:var(--accent-warm);text-transform:uppercase;letter-spacing:.06em;position:relative;z-index:2;}
.inc-ac-title{font-family:'Fraunces',serif;font-weight:700;font-size:19px;line-height:1.25;margin-top:8px;color:#fff;position:relative;z-index:2;}
.inc-ac-meta{font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(255,255,255,.7);margin-top:6px;position:relative;z-index:2;}
.inc-ac-body{font-size:13px;color:rgba(255,255,255,.85);line-height:1.55;margin:12px 0 14px;position:relative;z-index:2;}
.inc-ac-cta{position:relative;z-index:2;display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,var(--accent),var(--accent-warm));color:#fff;padding:11px 16px;border-radius:10px;font-weight:800;font-size:13px;box-shadow:0 8px 18px rgba(255,122,69,.45);}
.inc-ac-cta:hover{filter:brightness(1.05);}

.inc-adapt-list{background:#fff;border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:18px;}
.inc-adapt-head{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.inc-adapt-head h3{font-family:'Fraunces',serif;font-weight:700;font-size:17px;flex:1;}
.inc-adapt-head .legal{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--muted);background:var(--bg);padding:4px 8px;border-radius:6px;}
.inc-adapt-item{display:grid;grid-template-columns:32px 1fr auto;gap:14px;align-items:start;padding:14px;border:1px solid var(--border);border-radius:11px;margin-bottom:8px;}
.inc-adapt-num{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent-warm));color:#fff;display:grid;place-items:center;font-family:'Fraunces',serif;font-weight:800;font-size:14px;}
.inc-adapt-item h4{font-weight:700;font-size:14px;}
.inc-adapt-item p{font-size:12.5px;color:var(--muted);line-height:1.5;margin-top:3px;}
.inc-adapt-item .meta{margin-top:6px;font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--accent);font-weight:700;}
.inc-adapt-foot{margin-top:8px;padding:12px 14px;background:var(--accent-soft);border-radius:10px;font-size:12.5px;color:#7A2E0A;}
.inc-adapt-foot b{font-weight:700;}

.inc-tabs{display:flex;gap:4px;background:#fff;border:1px solid var(--border);border-radius:12px;padding:5px;margin-bottom:14px;position:sticky;top:8px;z-index:10;overflow-x:auto;}
.inc-tab{padding:9px 14px;border-radius:8px;font-size:13px;font-weight:600;color:var(--muted);white-space:nowrap;display:inline-flex;align-items:center;gap:6px;}
.inc-tab:hover{background:var(--bg);color:var(--text);}
.inc-tab.active{background:linear-gradient(135deg,var(--accent),var(--accent-warm));color:#fff;box-shadow:0 3px 8px rgba(255,122,69,.3);}
.inc-tab-count{background:rgba(255,255,255,.25);font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:700;padding:1.5px 6px;border-radius:5px;}
.inc-tab:not(.active) .inc-tab-count{background:var(--bg);color:var(--muted);}

.inc-panel{display:none;}
.inc-panel.active{display:block;}

.inc-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
@media(max-width:720px){.inc-grid-2{grid-template-columns:1fr;}}

.inc-eixo{background:#fff;border:1px solid var(--border);border-radius:11px;padding:14px 16px;}
.inc-eixo-head{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.inc-eixo-head h4{font-family:'Fraunces',serif;font-weight:700;font-size:14.5px;flex:1;}
.inc-status{font-size:10.5px;font-weight:800;padding:3px 8px;border-radius:5px;text-transform:uppercase;letter-spacing:.04em;}
.inc-status.warn{background:#FEF3C7;color:#78350F;}
.inc-status.ok{background:#DCFCE7;color:#14532D;}
.inc-status.info{background:#E0F2FE;color:#0C4A6E;}
.inc-status.accent{background:var(--accent-soft);color:#B8410E;}
.inc-eixo p{font-size:12.5px;color:var(--muted);line-height:1.45;}
.inc-suggest-btn{margin-top:8px;font-size:12px;color:var(--accent);font-weight:700;display:inline-flex;align-items:center;gap:4px;}

.inc-a4{background:#fff;width:100%;max-width:760px;margin:0 auto;padding:40px 50px;font-family:'Fraunces',serif;color:#000;border:1px solid var(--border);border-radius:6px;box-shadow:0 4px 18px rgba(0,0,0,.06);}
.inc-a4-head{display:grid;grid-template-columns:60px 1fr auto;gap:14px;align-items:center;border-bottom:3px double #000;padding-bottom:14px;margin-bottom:18px;}
.inc-a4-logo{width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#fff;display:grid;place-items:center;font-family:'Fraunces',serif;font-weight:900;font-size:22px;}
.inc-a4-head .center{text-align:center;font-family:'Inter',sans-serif;}
.inc-a4-head .center b{display:block;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;}
.inc-a4-head .center span{font-size:11px;color:#444;}
.inc-a4-head .stamp{font-family:'JetBrains Mono',monospace;font-size:10px;color:#666;text-align:right;line-height:1.5;}
.inc-a4 h1{font-family:'Fraunces',serif;font-weight:800;font-size:18px;text-align:center;margin-bottom:18px;text-transform:uppercase;letter-spacing:.05em;}
.inc-a4 .ident{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;font-size:12.5px;margin-bottom:18px;border:1px solid #000;padding:10px 14px;font-family:'Inter',sans-serif;}
.inc-a4 .ident b{font-weight:700;}
.inc-a4 h2{font-family:'Fraunces',serif;font-weight:700;font-size:13px;background:#000;color:#fff;padding:5px 12px;margin:14px 0 8px;text-transform:uppercase;letter-spacing:.06em;}
.inc-a4 p{font-size:13px;line-height:1.6;text-align:justify;margin-bottom:8px;}
.inc-a4 ul{font-size:12.5px;line-height:1.7;padding-left:22px;margin-bottom:8px;font-family:'Inter',sans-serif;}
.inc-a4 .signs{margin-top:30px;display:grid;grid-template-columns:1fr 1fr;gap:30px;font-size:12px;text-align:center;font-family:'Inter',sans-serif;}
.inc-a4 .sign-line{border-top:1px solid #000;padding-top:5px;}
.inc-a4 .sign-line b{display:block;font-weight:700;}
.inc-a4 .sign-line span{font-size:10.5px;color:#444;}
.inc-a4-page{font-family:'JetBrains Mono',monospace;font-size:10px;color:#666;text-align:center;margin-top:20px;padding-top:8px;border-top:1px solid #ccc;}
.inc-a4-actions{display:flex;justify-content:flex-end;gap:8px;max-width:760px;margin:0 auto 12px;}

.inc-report{background:#fff;border:1px solid var(--border);border-radius:14px;padding:24px 28px;}
.inc-report-head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid var(--border);padding-bottom:14px;margin-bottom:18px;}
.inc-report-head b{display:block;font-family:'Fraunces',serif;font-weight:700;font-size:14px;}
.inc-report-head span{font-size:11px;color:var(--muted);}
.inc-report h2{font-family:'Fraunces',serif;font-weight:800;font-size:24px;margin:6px 0;}
.inc-report .sub{font-size:12px;color:var(--muted);margin-bottom:18px;}
.inc-report h4{font-family:'Fraunces',serif;font-weight:700;font-size:15px;margin:14px 0 6px;color:var(--accent);}
.inc-report p{font-size:13.5px;line-height:1.65;color:var(--text);}
.inc-report p em{background:rgba(255,122,69,.12);padding:1px 4px;border-radius:3px;font-style:normal;}
.inc-report-foot{display:flex;align-items:center;gap:10px;margin-top:20px;padding-top:14px;border-top:1px solid var(--border);font-size:11.5px;color:var(--muted);flex-wrap:wrap;}
.inc-report-foot .actions{margin-left:auto;display:flex;gap:6px;}

.inc-modal-overlay{position:fixed;inset:0;background:rgba(15,27,54,.55);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;z-index:200;padding:24px;}
.inc-modal-overlay.open{display:flex;}
.inc-modal{background:#fff;border-radius:16px;width:100%;max-width:880px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 30px 80px rgba(15,27,54,.4);}
.inc-modal-bar{height:5px;background:linear-gradient(90deg,var(--accent),var(--accent-warm));}
.inc-modal-head{padding:18px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:14px;}
.inc-modal-head h2{font-family:'Fraunces',serif;font-weight:800;font-size:20px;flex:1;}
.inc-modal-head .meta{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--muted);text-align:right;line-height:1.5;}
.inc-modal-close{background:var(--bg);width:34px;height:34px;border-radius:9px;display:grid;place-items:center;color:var(--muted);}
.inc-modal-close:hover{background:var(--danger);color:#fff;}
.inc-modal-body{padding:22px 24px;overflow-y:auto;flex:1;background:#F0F2F7;}
.inc-modal-body.plain{background:#fff;}
.inc-modal-foot{padding:14px 24px;border-top:1px solid var(--border);background:var(--bg);display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.inc-modal-foot .legal{font-size:11.5px;color:var(--muted);flex:1;min-width:180px;}
.inc-modal-foot .actions{display:flex;gap:8px;}

.inc-tut-step{display:grid;grid-template-columns:36px 1fr;gap:14px;padding:14px;border:1px solid var(--border);border-radius:11px;background:linear-gradient(180deg,#fff,#FAFBFE);margin-bottom:8px;}
.inc-tut-num{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent-warm));color:#fff;display:grid;place-items:center;font-family:'Fraunces',serif;font-weight:800;font-size:15px;box-shadow:0 4px 10px rgba(255,122,69,.35);}
.inc-tut-step b{display:block;font-weight:700;font-size:14px;margin-bottom:2px;}
.inc-tut-step p{font-size:12.5px;color:var(--muted);line-height:1.5;}

@media(max-width:720px){.inc-app{grid-template-columns:1fr;}.inc-main{padding:14px;}}
`;

type TabKey = "anam" | "pei" | "plan" | "reg" | "rel" | "doc";

type Eixo = { label: string; status: string; tone: "ok" | "warn" | "info" | "accent"; desc: string };

const EIXOS: Eixo[] = [
  { label: "Leitura", status: "Em processo", tone: "warn", desc: "Lê palavras CV com mediação. Dificuldade em encontros consonantais (BR, TR)." },
  { label: "Escrita", status: "Em processo", tone: "warn", desc: "Escreve nome sem modelo. Hipótese silábica na escrita espontânea." },
  { label: "Matemática", status: "Avançado", tone: "ok", desc: "Conta até 100. Resolve adição/subtração até 20 com material dourado." },
  { label: "Socialização", status: "Com mediação", tone: "info", desc: "Trabalha bem em duplas estruturadas. Evita grandes grupos." },
  { label: "Mediador em sala", status: "Sim", tone: "ok", desc: "Mediação humana garantida em sala regular." },
  { label: "AEE (contraturno)", status: "2x/sem", tone: "info", desc: "Acompanhamento com Profa. Carla Mendonça às terças e quintas." },
  { label: "Atenção e concentração", status: "Com mediação", tone: "warn", desc: "Sustentada por até 15 min em atividades de interesse." },
  { label: "Coordenação motora", status: "Adequada", tone: "ok", desc: "Coordenação ampla preservada; fina em desenvolvimento." },
  { label: "Sensibilidades sensoriais", status: "Auditiva alta", tone: "warn", desc: "Fones abafadores em uso. Aversão a cola líquida." },
  { label: "Independência cotidiana", status: "Parcial", tone: "info", desc: "Higiene e alimentação independentes. Vestir-se exige apoio." },
  { label: "Autonomia / decisão", status: "Necessita apoio", tone: "warn", desc: "Tomada de decisão com apoio do mediador." },
  { label: "Regulação emocional", status: "Em processo", tone: "warn", desc: "Reconhece emoções básicas com apoio visual." },
  { label: "Memória", status: "Preservada", tone: "ok", desc: "Boa memória de longo prazo, principalmente para temas de interesse." },
  { label: "Contexto familiar", status: "Engajada", tone: "ok", desc: "Família participativa. Mãe relata avanços em rotinas matinais." },
];

const ADAPTACOES = [
  { n: 1, title: "Substituir abstração por material concreto", desc: "Trocar 'dividir entre amigos' por imagem da pizza dividida em fatias iguais.", meta: "PEI obj. #4 · BNCC EF02MA08" },
  { n: 2, title: "Dividir em micro-blocos com pausas sensoriais", desc: "Estruturar em 3 blocos de 5 min com pausas de 1 min para movimento.", meta: "PEI obj. #1 · Atenção sustentada" },
  { n: 3, title: "Mediação prévia com Profa. Carla (AEE)", desc: "Profa. Carla alinhada às 13h. Script com 5 perguntas-âncora.", meta: "AEE alinhada · Script #SF-2046" },
];

const TUTORIAL_STEPS = [
  { t: "Selecione o aluno", d: "Na lista, clique no card do aluno. Você verá KPIs do mês, eixos do PEI e linha do tempo pedagógica." },
  { t: "Preencha a Anamnese", d: "Use os 14 eixos guiados. Em cada campo há sugestões rápidas contextuais ao ano e diagnóstico." },
  { t: "Gere o Planejamento", d: "Configure o período, escolha as disciplinas e clique 'Gerar sugestões com IA'. As atividades já vêm com adaptação." },
  { t: "Faça Registros frequentes", d: "Cada registro alimenta o relatório anual. Use observações rápidas pra ganhar velocidade." },
  { t: "Gere o Relatório com a Sofia", d: "Selecione o período e a Sofia consolida registros + PEI + anamnese em um parecer pronto pra editar e exportar." },
  { t: "Exporte com validade institucional", d: "Word ou PDF. Documentos seguem a Lei 14.254/2021 e a BNCC Inclusão — aceitos pela secretaria." },
];

export function Inclusao() {
  const search = useSearch({ from: "/inclusao" }) as { tab?: TabKey };
  const navigate = useNavigate({ from: "/inclusao" });
  const [tab, setTab] = useState<TabKey>(search.tab || "anam");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [adaptOpen, setAdaptOpen] = useState(false);
  const [newStudentOpen, setNewStudentOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const setActiveTab = (t: TabKey) => {
    setTab(t);
    navigate({ search: { tab: t } as never, replace: true });
  };

  const exportPEI = (fmt: "docx" | "pdf") => {
    alert(`Exportando PEI em ${fmt.toUpperCase()}...`);
  };

  return (
    <div className="inc-root">
      <style dangerouslySetInnerHTML={{ __html: sidebarCss + css }} />
      <div className="inc-app">
        <AppSidebar active="inclusion" />

        <main className="inc-main">
          <div className="inc-topbar">
            <div className="inc-crumbs">
              <strong>Sua sala</strong>
              <ChevronRight size={11} />
              <span>Inclusão</span>
            </div>
            <span className="inc-tag-orange">Acompanhamento PCD &amp; PEI</span>
            <div className="inc-top-actions">
              <button className="inc-icon-btn" aria-label="Buscar"><Search size={14} /></button>
              <button className="inc-icon-btn" aria-label="Notificações"><Bell size={14} /></button>
              <button className="inc-icon-btn" aria-label="Ajuda"><HelpCircle size={14} /></button>
              <div className="inc-user">
                <div className="inc-user-av">CM</div>
                <div>
                  <div className="inc-user-name">Camila M.</div>
                  <div className="inc-user-plan">Plano Pro</div>
                </div>
              </div>
            </div>
          </div>

          <div className="inc-header">
            <div className="inc-header-l">
              <h1>Inclusão</h1>
              <p>PEI, anamnese, registros e pareceres descritivos com a Sofia</p>
            </div>
            <div className="inc-header-r">
              <button className="inc-btn" onClick={() => setNewStudentOpen(true)}><Plus size={14} /> Novo aluno</button>
              <button className="inc-btn" onClick={() => setImportOpen(true)}><Upload size={14} /> Importar laudo (PDF)</button>
              <button className="inc-btn" onClick={() => setTutorialOpen(true)}><BookOpen size={14} /> Tutorial · 3 min</button>
            </div>
          </div>

          <section className="inc-hero">
            <div className="inc-hero-l">
              <div className="inc-hero-id">
                <div className="inc-avatar-lg">PA</div>
                <div>
                  <h2>Pedrinho Almeida</h2>
                  <div className="sub">7 anos · 2º Ano A</div>
                </div>
              </div>
              <div className="inc-chips">
                <span className="inc-chip-info">TEA Nível 1</span>
                <span className="inc-chip-info muted">CID F84.0</span>
                <span className="inc-chip-info muted">Mediador em sala</span>
                <span className="inc-chip-info muted">AEE 2x/semana</span>
              </div>
              <div className="inc-mini-kpis">
                <div className="inc-mini-kpi"><div className="lbl">Objetivos PEI</div><div className="val">6/9</div></div>
                <div className="inc-mini-kpi"><div className="lbl">Registros do mês</div><div className="val">14</div></div>
                <div className="inc-mini-kpi"><div className="lbl">Próx. revisão PEI</div><div className="val">04/06</div></div>
                <div className="inc-mini-kpi"><div className="lbl">Tempo economizado</div><div className="val">4h12</div></div>
              </div>
            </div>
            <div className="inc-action-card">
              <div className="inc-ac-tag"><Sparkles size={12} /> ADAPTAR AULA DE HOJE</div>
              <h3 className="inc-ac-title">Frações e Partilha Justa</h3>
              <div className="inc-ac-meta">Matemática · 16h00 · BNCC EF02MA08</div>
              <p className="inc-ac-body">A aula original usa metáforas abstratas e leitura coletiva — duas áreas onde o Pedrinho tem dificuldade documentada no PEI. Preparei <b style={{ color: "var(--accent-warm)" }}>3 adaptações pontuais</b> que mantêm o objetivo BNCC.</p>
              <button className="inc-ac-cta" onClick={() => setAdaptOpen(true)}>Adaptar agora · ~5 min <ChevronRight size={14} /></button>
            </div>
          </section>

          <section className="inc-adapt-list">
            <div className="inc-adapt-head">
              <h3>Adaptações sugeridas pela Sofia</h3>
              <span className="legal">Lei 14.254/2021 · BNCC Inclusão</span>
            </div>
            {ADAPTACOES.map((a) => (
              <div className="inc-adapt-item" key={a.n}>
                <div className="inc-adapt-num">{a.n}</div>
                <div>
                  <h4>{a.title}</h4>
                  <p>{a.desc}</p>
                  <div className="meta">{a.meta}</div>
                </div>
                <CheckCircle2 size={20} color="var(--accent)" />
              </div>
            ))}
            <div className="inc-adapt-foot"><b>Tempo estimado economizado:</b> 45 min (manual ~50min · com Sofia ~5min)</div>
          </section>

          <div className="inc-tabs" role="tablist">
            {([
              { k: "anam", label: "Anamnese", count: "14/16" },
              { k: "pei", label: "PEI" },
              { k: "plan", label: "Planejamento" },
              { k: "reg", label: "Registros", count: "23" },
              { k: "rel", label: "Relatórios" },
              { k: "doc", label: "Documentos" },
            ] as Array<{ k: TabKey; label: string; count?: string }>).map((t) => (
              <button
                key={t.k}
                className={"inc-tab" + (tab === t.k ? " active" : "")}
                onClick={() => setActiveTab(t.k)}
                role="tab"
                aria-selected={tab === t.k}
              >
                {t.label}
                {t.count && <span className="inc-tab-count">{t.count}</span>}
              </button>
            ))}
          </div>

          <div className={"inc-panel" + (tab === "anam" ? " active" : "")}>
            <div className="inc-grid-2">
              {EIXOS.map((e) => (
                <div className="inc-eixo" key={e.label}>
                  <div className="inc-eixo-head">
                    <h4>{e.label}</h4>
                    <span className={"inc-status " + e.tone}>{e.status}</span>
                  </div>
                  <p>{e.desc}</p>
                  <button className="inc-suggest-btn"><Sparkles size={12} /> Sugestões rápidas</button>
                </div>
              ))}
            </div>
          </div>

          <div className={"inc-panel" + (tab === "pei" ? " active" : "")}>
            <div className="inc-a4-actions">
              <button className="inc-btn" onClick={() => exportPEI("docx")}><FileText size={14} /> Word</button>
              <button className="inc-btn" onClick={() => exportPEI("pdf")}><Printer size={14} /> Imprimir / PDF</button>
              <button className="inc-btn" onClick={() => setActiveTab("anam")}><X size={14} /> Fechar</button>
            </div>
            <div className="inc-a4">
              <div className="inc-a4-head">
                <div className="inc-a4-logo">M</div>
                <div className="center">
                  <b>Prefeitura Municipal de São Paulo</b>
                  <span>Secretaria Municipal da Educação · Diretoria Regional Sul<br />EMEF Profa. Maria Aparecida Silva</span>
                </div>
                <div className="stamp">PROTOCOLO<br />#PEI-2026-PA-v3.2<br />04/04/2026</div>
              </div>
              <h1>Plano Educacional Individualizado</h1>
              <div className="ident">
                <span><b>Educando:</b> Pedro Henrique Almeida</span>
                <span><b>Idade:</b> 7 anos</span>
                <span><b>Turma:</b> 2º Ano A · Manhã</span>
                <span><b>Ref. curricular:</b> 2º Ano EF</span>
                <span><b>CID:</b> F84.0 · TEA Nível 1</span>
                <span><b>Laudo:</b> Dr. Ricardo Mendes (CRM 145632) · 12/03/2025</span>
                <span><b>Mediador em sala:</b> Sim</span>
                <span><b>AEE:</b> 2x/semana · Profa. Carla Mendonça</span>
              </div>
              <h2>1. Caracterização e Anamnese</h2>
              <p>O educando apresenta diagnóstico de Transtorno do Espectro Autista (Nível 1), conforme laudo médico. Reconhece o alfabeto e lê palavras com sílabas simples (CV) com mediação. Em Matemática, demonstra fluência com material concreto e resolve operações até 20. Sensibilidade auditiva alta — fones abafadores em uso. Família participativa.</p>
              <h2>2. Cognição e Linguagem · Objetivos</h2>
              <ul>
                <li><b>Obj. 01.</b> Ler 20 palavras com encontros consonantais com mediação visual <i style={{ color: "#B8410E" }}>(em processo · 14/20)</i></li>
                <li><b>Obj. 02.</b> Compor narrativas curtas com 3 elementos (personagem-ação-lugar)</li>
                <li><b>Obj. 03.</b> Resolver operações de adição até 20 com material concreto <i style={{ color: "var(--success)" }}>· atingido em 12/04/2026</i></li>
                <li><b>Obj. 04.</b> Compreender o conceito de "metade" e "inteiro" com mediação visual</li>
              </ul>
              <h2>3. Interação Social · Objetivos</h2>
              <ul>
                <li><b>Obj. 05.</b> Cooperar com colega em atividade de 15 min sem mediação direta <i style={{ color: "#B8410E" }}>(em processo)</i></li>
                <li><b>Obj. 06.</b> Sustentar trabalho em dupla por 20 min <i style={{ color: "var(--success)" }}>· atingido em 29/04/2026</i></li>
              </ul>
              <h2>4. Psicomotor e Sensorial · Objetivos</h2>
              <ul>
                <li><b>Obj. 07.</b> Reconhecer sinais de sobrecarga sensorial e solicitar pausa <i style={{ color: "var(--success)" }}>· atingido em 18/04/2026</i></li>
              </ul>
              <h2>5. Comunicação e Autonomia · Objetivos</h2>
              <ul>
                <li><b>Obj. 08.</b> Compor narrativas orais com 3 elementos <i style={{ color: "#B8410E" }}>(em processo)</i></li>
                <li><b>Obj. 09.</b> Comunicar necessidades por meio de frases completas <i style={{ color: "var(--accent)" }}>(revisão sugerida)</i></li>
              </ul>
              <h2>6. Estratégias e Recursos</h2>
              <ul>
                <li>Material concreto em Matemática (material dourado, ábaco)</li>
                <li>Pictogramas e roteiro visual da rotina diária</li>
                <li>Fones abafadores em situações de alta carga auditiva</li>
                <li>Tempo extra de 30% em provas e atividades</li>
                <li>Mediação humana em sala</li>
                <li>AEE 2x/semana no contraturno</li>
              </ul>
              <h2>7. Co-construção e Validação</h2>
              <p>Este documento foi elaborado de forma colaborativa entre Profa. Camila Ribeiro (regente), Profa. Carla Mendonça (AEE), Sra. Júlia Almeida (responsável) e Coordenação Pedagógica em reunião realizada em 04/04/2026. Próxima revisão obrigatória: 04/06/2026.</p>
              <div className="signs">
                <div className="sign-line"><b>Profa. Camila Ribeiro</b><span>Regente · 2º Ano A</span></div>
                <div className="sign-line"><b>Profa. Carla Mendonça</b><span>AEE</span></div>
                <div className="sign-line" style={{ marginTop: 30 }}><b>Sra. Júlia Almeida</b><span>Responsável legal</span></div>
                <div className="sign-line" style={{ marginTop: 30 }}><b>Coordenação Pedagógica</b><span>EMEF M. A. Silva</span></div>
              </div>
              <div className="inc-a4-page">Documento gerado pelo AgilizaProf · Conforme Lei 14.254/2021 · BNCC Inclusão · Página 1 de 1</div>
            </div>
          </div>

          <div className={"inc-panel" + (tab === "plan" ? " active" : "")}>
            <div className="inc-eixo">
              <h4 style={{ fontFamily: "'Fraunces',serif", fontSize: 17, marginBottom: 6 }}>Planejamento adaptado</h4>
              <p>Configure período, disciplinas e clique em "Gerar sugestões com IA". As atividades virão com adaptação aplicada conforme o PEI vigente.</p>
              <div style={{ marginTop: 14 }}>
                <button className="inc-btn inc-btn-primary"><Sparkles size={14} /> Gerar sugestões com IA</button>
              </div>
            </div>
          </div>

          <div className={"inc-panel" + (tab === "reg" ? " active" : "")}>
            <div className="inc-eixo">
              <h4 style={{ fontFamily: "'Fraunces',serif", fontSize: 17, marginBottom: 6 }}>Registros pedagógicos</h4>
              <p>23 registros · todos os bimestres. Filtros: Pedagógico · Social · Comportamental · Psicomotor.</p>
              <div style={{ marginTop: 14 }}>
                <button className="inc-btn inc-btn-primary"><Plus size={14} /> Novo registro</button>
              </div>
            </div>
          </div>

          <div className={"inc-panel" + (tab === "rel" ? " active" : "")}>
            <div className="inc-report">
              <div className="inc-report-head">
                <div>
                  <b>EMEF Profa. Maria Aparecida Silva</b>
                  <span>Rede Municipal · Diretoria Regional Sul</span>
                </div>
                <div style={{ textAlign: "right", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--muted)" }}>
                  DOC #2026-PA-004<br />Versão 1 · Sofia AI
                </div>
              </div>
              <h2>Parecer Descritivo · 2º Bimestre 2026</h2>
              <div className="sub">Pedrinho Almeida · 2º Ano A · TEA Nível 1 (CID F84.0) · Profa. Camila Ribeiro</div>
              <h4>1. Aspectos Pedagógicos</h4>
              <p>Pedrinho demonstrou avanços significativos no domínio da <em>leitura silábica</em>, reconhecendo sílabas CV em 80% das palavras com mediação. Em Matemática, mostra-se à vontade com operações concretas até 10 (BNCC EF02MA08). A escrita do nome completo sem modelo, em 10/04, marca conquista de autonomia.</p>
              <h4>2. Interação Social</h4>
              <p>Atingiu o <em>objetivo PEI #6</em> em 29/04 ao sustentar atividade colaborativa em dupla por 20 min com o colega João. Demonstra preferência por duplas estruturadas e tem evoluído na cooperação espontânea.</p>
              <h4>3. Aspectos Sensoriais e Psicomotores</h4>
              <p>Sensibilidade auditiva permanece como ponto de atenção. Houve crise sensorial breve em Música (18/04), resolvida com fone abafador. Recomenda-se ajuste no PEI para incluir sinalização prévia.</p>
              <h4>4. Considerações Finais</h4>
              <p>Pedrinho apresenta <em>evolução consistente</em>. Dos 9 objetivos vigentes, 6 foram atingidos. A parceria família-escola-AEE tem se mostrado decisiva. Sugere-se avançar para <em>narrativas com 3 elementos</em> no próximo bimestre.</p>
              <div className="inc-report-foot">
                <span>Conforme Lei 14.254/2021 · BNCC Inclusão · Gerado em 02/05/2026 14:18</span>
                <div className="actions">
                  <button className="inc-btn">Editar</button>
                  <button className="inc-btn">Word</button>
                  <button className="inc-btn inc-btn-primary">PDF</button>
                </div>
              </div>
            </div>
            <button
              className="inc-btn inc-btn-primary"
              style={{ position: "fixed", bottom: 24, right: 24, padding: "14px 18px", borderRadius: 99, boxShadow: "0 14px 30px rgba(255,122,69,.5)" }}
              onClick={() => setDrawerOpen(true)}
            >
              <Sparkles size={16} /> Gerar com a Sofia
            </button>
          </div>

          <div className={"inc-panel" + (tab === "doc" ? " active" : "")}>
            <div className="inc-eixo">
              <h4 style={{ fontFamily: "'Fraunces',serif", fontSize: 17, marginBottom: 6 }}>Documentos do aluno</h4>
              <p>Laudos, atas, autorizações e relatórios anteriores ficam aqui. Importe novos PDFs para a Sofia ler o contexto.</p>
            </div>
          </div>
        </main>
      </div>

      {/* Tutorial modal */}
      <div className={"inc-modal-overlay" + (tutorialOpen ? " open" : "")} onClick={(e) => { if (e.target === e.currentTarget) setTutorialOpen(false); }}>
        <div className="inc-modal" style={{ maxWidth: 680 }}>
          <div className="inc-modal-bar" />
          <div className="inc-modal-head">
            <h2>Tutorial · Como usar a Inclusão</h2>
            <span className="meta">~3 min de leitura</span>
            <button className="inc-modal-close" onClick={() => setTutorialOpen(false)} aria-label="Fechar"><X size={16} /></button>
          </div>
          <div className="inc-modal-body plain">
            {TUTORIAL_STEPS.map((s, i) => (
              <div className="inc-tut-step" key={i}>
                <div className="inc-tut-num">{i + 1}</div>
                <div><b>{s.t}</b><p>{s.d}</p></div>
              </div>
            ))}
          </div>
          <div className="inc-modal-foot">
            <span className="legal">Pode chamar a Sofia a qualquer momento clicando em "Assistente IA"</span>
            <div className="actions">
              <button className="inc-btn inc-btn-primary" onClick={() => setTutorialOpen(false)}>Entendi, começar</button>
            </div>
          </div>
        </div>
      </div>

      {/* Adaptar aula */}
      <div className={"inc-modal-overlay" + (adaptOpen ? " open" : "")} onClick={(e) => { if (e.target === e.currentTarget) setAdaptOpen(false); }}>
        <div className="inc-modal" style={{ maxWidth: 760 }}>
          <div className="inc-modal-bar" />
          <div className="inc-modal-head">
            <h2>Adaptar aula · Frações e Partilha Justa</h2>
            <span className="meta">Matemática · 16h00<br />BNCC EF02MA08</span>
            <button className="inc-modal-close" onClick={() => setAdaptOpen(false)} aria-label="Fechar"><X size={16} /></button>
          </div>
          <div className="inc-modal-body plain">
            {ADAPTACOES.map((a) => (
              <div className="inc-adapt-item" key={a.n}>
                <div className="inc-adapt-num">{a.n}</div>
                <div>
                  <h4>{a.title}</h4>
                  <p>{a.desc}</p>
                  <div className="meta">{a.meta}</div>
                </div>
                <input type="checkbox" defaultChecked style={{ width: 18, height: 18, accentColor: "var(--accent)" }} />
              </div>
            ))}
            <div className="inc-adapt-foot" style={{ marginTop: 14 }}><b>Tempo estimado economizado:</b> 45 min (manual ~50min · com Sofia ~5min)</div>
          </div>
          <div className="inc-modal-foot">
            <span className="legal">As adaptações serão registradas no histórico do Pedrinho automaticamente</span>
            <div className="actions">
              <button className="inc-btn" onClick={() => setAdaptOpen(false)}>Cancelar</button>
              <button className="inc-btn inc-btn-primary" onClick={() => setAdaptOpen(false)}>Aplicar 3 adaptações</button>
            </div>
          </div>
        </div>
      </div>

      {/* Novo aluno */}
      <div className={"inc-modal-overlay" + (newStudentOpen ? " open" : "")} onClick={(e) => { if (e.target === e.currentTarget) setNewStudentOpen(false); }}>
        <div className="inc-modal" style={{ maxWidth: 560 }}>
          <div className="inc-modal-bar" />
          <div className="inc-modal-head">
            <h2>Cadastrar novo aluno</h2>
            <button className="inc-modal-close" onClick={() => setNewStudentOpen(false)} aria-label="Fechar"><X size={16} /></button>
          </div>
          <form className="inc-modal-body plain" onSubmit={(e) => { e.preventDefault(); setNewStudentOpen(false); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Nome completo
              <input required style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Turma
              <input style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, marginTop: 4 }} placeholder="Ex.: 2º Ano A" />
            </label>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Diagnóstico / CID
              <input style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, marginTop: 4 }} placeholder="Ex.: TEA Nível 1 · F84.0" />
            </label>
            <div className="inc-modal-foot" style={{ margin: "8px -24px -22px", borderRadius: 0 }}>
              <button type="button" className="inc-btn" onClick={() => setNewStudentOpen(false)} style={{ marginLeft: "auto" }}>Cancelar</button>
              <button type="submit" className="inc-btn inc-btn-primary">Salvar aluno</button>
            </div>
          </form>
        </div>
      </div>

      {/* Importar laudo */}
      <div className={"inc-modal-overlay" + (importOpen ? " open" : "")} onClick={(e) => { if (e.target === e.currentTarget) setImportOpen(false); }}>
        <div className="inc-modal" style={{ maxWidth: 520 }}>
          <div className="inc-modal-bar" />
          <div className="inc-modal-head">
            <h2>Importar laudo (PDF)</h2>
            <button className="inc-modal-close" onClick={() => setImportOpen(false)} aria-label="Fechar"><X size={16} /></button>
          </div>
          <div className="inc-modal-body plain" style={{ textAlign: "center", padding: 32 }}>
            <Upload size={36} color="var(--accent)" />
            <p style={{ marginTop: 12, color: "var(--muted)" }}>Arraste o PDF aqui ou clique para selecionar.</p>
            <button className="inc-btn inc-btn-primary" style={{ marginTop: 14 }}>Selecionar arquivo</button>
          </div>
        </div>
      </div>

      {/* Sofia drawer */}
      {drawerOpen && (
        <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 380, background: "#fff", borderLeft: "1px solid var(--border)", boxShadow: "-20px 0 60px rgba(15,27,54,.15)", zIndex: 150, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "18px 22px", background: "linear-gradient(135deg,var(--primary),var(--primary-dark))", color: "#fff", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,var(--accent),var(--accent-warm))", display: "grid", placeItems: "center", fontFamily: "'Fraunces',serif", fontWeight: 800 }}>S</div>
            <div style={{ flex: 1 }}>
              <b style={{ fontFamily: "'Fraunces',serif" }}>Sofia</b>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.65)" }}>IA pedagógica · sobre Pedrinho</div>
            </div>
            <button onClick={() => setDrawerOpen(false)} style={{ color: "#fff", background: "rgba(255,255,255,.1)", width: 30, height: 30, borderRadius: 8 }}><X size={14} /></button>
          </div>
          <div style={{ flex: 1, padding: 18, background: "var(--bg)", overflowY: "auto" }}>
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 12, fontSize: 13 }}>
              Olá, Camila! Posso te ajudar com 4 coisas — adaptar aula, gerar parecer, sugerir próximo objetivo PEI ou preparar reunião com a família.
            </div>
          </div>
          <div style={{ padding: 14, borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
            <input placeholder="Pergunte algo sobre o Pedrinho..." style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 9 }} />
            <button className="inc-btn inc-btn-primary" style={{ padding: "10px 12px" }}><Send size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
