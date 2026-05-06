import { useMemo, useState } from "react";
import { Link, useSearch, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Sparkles, BookOpen, Target, Layers, Clock, Users, ChevronDown } from "lucide-react";
import { AppSidebar, sidebarCss } from "@/components/AppSidebar";
import { Header as AppHeader } from "@/components/Header";
import { useSofia } from "@/components/sofia/SofiaProvider";
import { toast } from "sonner";

/**
 * Página de criação de atividade pedagógica alinhada à BNCC.
 *
 * Acessível pelos botões "+ Adicionar atividade" da tela de Planejamento.
 * Coleta o mínimo necessário (etapa, ano, componente, habilidade BNCC,
 * objetivo e duração) e dispara a Sofia para gerar a sequência didática
 * alinhada à BNCC, respeitando a Constituição (linguagem não-capacitista,
 * citações de habilidade pelo código, transparência).
 */

const css = `
.pa-root{font-family:'Inter',-apple-system,sans-serif;background:#F6F7FB;color:#0F172A;min-height:100vh;}
.pa-root *{box-sizing:border-box;}
.pa-app{display:grid;grid-template-columns:240px 1fr;min-height:100vh;}
.pa-main{display:flex;flex-direction:column;min-width:0;}
.pa-back{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:#64748B;font-weight:600;background:none;border:none;cursor:pointer;padding:6px 0;text-decoration:none;}
.pa-back:hover{color:#FF7A45;}
.pa-hero{margin:18px 24px 0;background:linear-gradient(135deg,#1B2A4E 0%,#243762 100%);border-radius:16px;padding:24px 28px;color:#fff;position:relative;overflow:hidden;box-shadow:0 6px 18px rgba(15,23,42,.08);}
.pa-hero::after{content:"";position:absolute;right:-80px;top:-80px;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,rgba(255,122,69,.18) 0%,rgba(255,122,69,0) 70%);pointer-events:none;}
.pa-hero .badge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,122,69,.15);border:1px solid rgba(255,122,69,.3);padding:5px 12px;border-radius:7px;font-size:11px;font-weight:700;color:#FF7A45;letter-spacing:.1em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;}
.pa-hero h1{font-family:'Fraunces',Georgia,serif;font-size:28px;font-weight:600;color:#fff;margin:14px 0 0;line-height:1.15;letter-spacing:-.02em;}
.pa-hero h1 em{color:#FF7A45;font-style:normal;display:block;}
.pa-hero p{margin-top:10px;color:#CBD5E1;font-size:13.5px;line-height:1.55;max-width:780px;}

.pa-grid{margin:18px 24px 80px;display:grid;grid-template-columns:1fr 360px;gap:18px;}
@media(max-width:1100px){.pa-grid{grid-template-columns:1fr;}}
.pa-card{background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:20px;box-shadow:0 1px 2px rgba(15,23,42,.06);}
.pa-card h2{font-family:'Fraunces',Georgia,serif;font-size:17px;font-weight:600;color:#0F172A;margin:0 0 4px;display:flex;align-items:center;gap:8px;}
.pa-card h2 svg{color:#FF7A45;}
.pa-card .sub{font-size:12.5px;color:#64748B;margin:0 0 16px;}

.pa-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;}
@media(max-width:680px){.pa-row{grid-template-columns:1fr;}}
.pa-field{display:flex;flex-direction:column;gap:5px;}
.pa-field label{font-size:10.5px;color:#64748B;font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;}
.pa-input,.pa-select,.pa-text{width:100%;padding:9px 12px;border:1px solid #E2E8F0;border-radius:9px;font-size:13px;background:#fff;color:#0F172A;font-family:inherit;}
.pa-input:focus,.pa-select:focus,.pa-text:focus{outline:none;border-color:#FF7A45;box-shadow:0 0 0 3px rgba(255,122,69,.12);}
.pa-text{min-height:84px;resize:vertical;line-height:1.45;}
.pa-help{font-size:11px;color:#94A3B8;margin-top:4px;}

.pa-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;}
.pa-pill{padding:6px 11px;border:1px solid #E2E8F0;background:#fff;border-radius:999px;font-size:11.5px;color:#334155;cursor:pointer;transition:.15s;}
.pa-pill:hover{border-color:#CBD5E1;}
.pa-pill.on{background:#1B2A4E;color:#fff;border-color:#1B2A4E;}

.pa-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px;flex-wrap:wrap;}
.pa-btn{display:inline-flex;align-items:center;gap:7px;padding:10px 16px;border-radius:10px;font-size:13px;font-weight:700;border:1px solid #E2E8F0;background:#fff;color:#0F172A;cursor:pointer;transition:.15s;}
.pa-btn:hover{border-color:#CBD5E1;background:#FBFBFD;}
.pa-btn.primary{background:linear-gradient(135deg,#FF6A2C,#EA580C);color:#fff;border-color:transparent;box-shadow:0 6px 16px rgba(255,106,44,.25);}
.pa-btn.primary:hover{transform:translateY(-1px);}

.pa-side h3{font-family:'Fraunces',Georgia,serif;font-size:14px;font-weight:600;color:#0F172A;margin:0 0 8px;display:flex;align-items:center;gap:7px;}
.pa-side h3 svg{color:#FF7A45;}
.pa-side ul{margin:0;padding-left:18px;color:#475569;font-size:12.5px;line-height:1.6;}
.pa-side ul li{margin-bottom:4px;}
.pa-side .tip{background:linear-gradient(135deg,#FFF4ED 0%,#FFFAF7 100%);border:1px solid #FED7C4;border-radius:12px;padding:14px;font-size:12.5px;color:#9A3412;line-height:1.5;}
`;

const ETAPAS = [
  { k: "infantil", label: "Educação Infantil" },
  { k: "fund1", label: "Anos Iniciais (1º–5º)" },
  { k: "fund2", label: "Anos Finais (6º–9º)" },
  { k: "medio", label: "Ensino Médio" },
  { k: "eja", label: "EJA" },
] as const;

const ANOS_BY_ETAPA: Record<string, string[]> = {
  infantil: ["Creche", "Pré I", "Pré II"],
  fund1: ["1º", "2º", "3º", "4º", "5º"],
  fund2: ["6º", "7º", "8º", "9º"],
  medio: ["1ª série", "2ª série", "3ª série"],
  eja: ["EJA I", "EJA II", "EJA III"],
};

const COMPONENTES = [
  "Língua Portuguesa", "Matemática", "Ciências", "História", "Geografia",
  "Arte", "Educação Física", "Ensino Religioso", "Inglês",
  "Campos de Experiência (EI)", "Projeto interdisciplinar",
];

const TIPOS = ["Aula expositiva", "Atividade prática", "Jogo / lúdica", "Avaliação", "Projeto", "Saída pedagógica"] as const;
const FOCO = ["Letramento", "Numeramento", "Socioemocional", "Pensamento científico", "Cultura e identidade"];

export function PlanejamentoAtividade() {
  const search = useSearch({ from: "/planejamento/atividade" });
  const navigate = useNavigate();
  const sofia = useSofia();

  const [etapa, setEtapa] = useState<string>("fund1");
  const [ano, setAno] = useState<string>("2º");
  const [componente, setComponente] = useState<string>("Língua Portuguesa");
  const [tipo, setTipo] = useState<string>("Aula expositiva");
  const [duracao, setDuracao] = useState<string>("50");
  const [tema, setTema] = useState<string>("");
  const [habilidade, setHabilidade] = useState<string>("");
  const [objetivo, setObjetivo] = useState<string>("");
  const [recursos, setRecursos] = useState<string>("");
  const [adapt, setAdapt] = useState<string>("");
  const [foco, setFoco] = useState<Record<string, boolean>>({ Letramento: true });
  const [turma] = useState<string>(search.turma || "");
  const [dia] = useState<string>(search.dia || "");

  const anos = useMemo(() => ANOS_BY_ETAPA[etapa] || [], [etapa]);

  const toggleFoco = (k: string) => setFoco((s) => ({ ...s, [k]: !s[k] }));

  const buildPrompt = () => {
    const focos = Object.entries(foco).filter(([, v]) => v).map(([k]) => k).join(", ") || "—";
    return [
      `Gere um PLANO DE ATIVIDADE PEDAGÓGICA ALINHADA À BNCC com a estrutura abaixo.`,
      `\n## Contexto`,
      `- Etapa: ${ETAPAS.find((e) => e.k === etapa)?.label}`,
      `- Ano/Série: ${ano}`,
      `- Componente curricular: ${componente}`,
      `- Tipo de atividade: ${tipo}`,
      `- Duração estimada: ${duracao} min`,
      turma ? `- Turma: ${turma}` : "",
      dia ? `- Dia da semana planejado: ${dia.toUpperCase()}` : "",
      `- Foco pedagógico: ${focos}`,
      tema ? `- Tema: ${tema}` : "",
      habilidade ? `- Habilidade BNCC sugerida pela professora: ${habilidade}` : "",
      objetivo ? `- Objetivo de aprendizagem: ${objetivo}` : "",
      recursos ? `- Recursos disponíveis: ${recursos}` : "",
      adapt ? `- Adaptações / observações de inclusão: ${adapt}` : "",
      `\n## Estrutura obrigatória da resposta`,
      `1. **Identificação** (componente, ano, tema, duração).`,
      `2. **Habilidade(s) BNCC** — cite o(s) código(s) (ex.: EF02LP01) e descreva a habilidade na linguagem da BNCC.${etapa === "infantil" ? " Use Campos de Experiência e Direitos de Aprendizagem." : ""}`,
      `3. **Objetivos de aprendizagem** (1 a 3, mensuráveis).`,
      `4. **Sequência didática** (introdução, desenvolvimento, fechamento) com tempos.`,
      `5. **Recursos e materiais.**`,
      `6. **Adaptações para inclusão / PCD** (TEA, TDAH, dislexia, deficiência intelectual etc., quando pertinente — sempre com linguagem não-capacitista).`,
      `7. **Avaliação formativa** (como observar evidências da aprendizagem).`,
      `8. **Bloco final de transparência:** Fontes do conteúdo, Habilidades BNCC, Apoio teórico (1–2 autores) e Base legal aplicável.`,
      `\nSe faltar informação essencial, pergunte antes de produzir o documento (Princípio 1).`,
    ].filter(Boolean).join("\n");
  };

  const onGerar = () => {
    if (!componente || !ano) {
      toast.error("Informe pelo menos o componente curricular e o ano.");
      return;
    }
    sofia.openSofia({ prompt: buildPrompt(), send: true });
    toast.success("Sofia está montando sua atividade alinhada à BNCC ✨");
  };

  return (
    <div className="pa-root">
      <style>{sidebarCss}</style>
      <style>{css}</style>
      <div className="pa-app">
        <AppSidebar active="planning" />
        <div className="pa-main">
          <AppHeader breadcrumb={[{ label: "Sua sala" }, { label: "Planejamento" }, { label: "Nova atividade" }]} />

          <div style={{ padding: "10px 24px 0" }}>
            <Link to="/planejamento" className="pa-back"><ArrowLeft size={14} /> Voltar ao planejamento</Link>
          </div>

          <div className="pa-hero">
            <span className="badge">★ Atividade · BNCC</span>
            <h1>Nova atividade pedagógica<em>Alinhada à BNCC, gerada com a Sofia.</em></h1>
            <p>Preencha o mínimo necessário e a Sofia gera a sequência didática, habilidades, objetivos, adaptações de inclusão e bloco de transparência — tudo conforme a Base e a Constituição da Sofia.</p>
          </div>

          <div className="pa-grid">
            <form className="pa-card" onSubmit={(e) => { e.preventDefault(); onGerar(); }}>
              <h2><BookOpen size={16} /> Etapa, ano e componente</h2>
              <p className="sub">Define o recorte curricular para a Sofia escolher a habilidade certa.</p>

              <div className="pa-row">
                <div className="pa-field">
                  <label>Etapa</label>
                  <select className="pa-select" value={etapa} onChange={(e) => { setEtapa(e.target.value); setAno(ANOS_BY_ETAPA[e.target.value]?.[0] || ""); }}>
                    {ETAPAS.map((e) => <option key={e.k} value={e.k}>{e.label}</option>)}
                  </select>
                </div>
                <div className="pa-field">
                  <label>Ano / Série</label>
                  <select className="pa-select" value={ano} onChange={(e) => setAno(e.target.value)}>
                    {anos.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <div className="pa-row">
                <div className="pa-field">
                  <label>Componente curricular</label>
                  <select className="pa-select" value={componente} onChange={(e) => setComponente(e.target.value)}>
                    {COMPONENTES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="pa-field">
                  <label>Tipo de atividade</label>
                  <select className="pa-select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                    {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="pa-row">
                <div className="pa-field">
                  <label>Duração (min)</label>
                  <input className="pa-input" type="number" min={5} max={240} value={duracao} onChange={(e) => setDuracao(e.target.value)} />
                </div>
                <div className="pa-field">
                  <label>Tema (opcional)</label>
                  <input className="pa-input" value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Ex.: Sistema solar, gêneros textuais…" />
                </div>
              </div>

              <div style={{ height: 6 }} />
              <h2><Target size={16} /> Habilidade e objetivo</h2>
              <p className="sub">Se você já sabe a habilidade, informe o código. Senão, deixe em branco — a Sofia escolhe.</p>

              <div className="pa-row">
                <div className="pa-field">
                  <label>Habilidade BNCC (código)</label>
                  <input className="pa-input" value={habilidade} onChange={(e) => setHabilidade(e.target.value)} placeholder="Ex.: EF02LP01" />
                  <span className="pa-help">Aceita um ou mais códigos separados por vírgula.</span>
                </div>
                <div className="pa-field">
                  <label>Objetivo de aprendizagem</label>
                  <input className="pa-input" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="O que o aluno deve conseguir ao final?" />
                </div>
              </div>

              <div className="pa-field" style={{ marginBottom: 12 }}>
                <label>Foco pedagógico</label>
                <div className="pa-pills">
                  {FOCO.map((f) => (
                    <button type="button" key={f} className={"pa-pill" + (foco[f] ? " on" : "")} onClick={() => toggleFoco(f)}>{f}</button>
                  ))}
                </div>
              </div>

              <div style={{ height: 6 }} />
              <h2><Layers size={16} /> Recursos e inclusão</h2>
              <p className="sub">Quanto mais contexto, mais aderente fica a atividade — sem inventar (Princípio 1).</p>

              <div className="pa-row">
                <div className="pa-field">
                  <label>Recursos disponíveis</label>
                  <textarea className="pa-text" value={recursos} onChange={(e) => setRecursos(e.target.value)} placeholder="Ex.: livro didático, datashow, cartolina, jogos, materiais concretos…" />
                </div>
                <div className="pa-field">
                  <label>Adaptações / Inclusão (PCD)</label>
                  <textarea className="pa-text" value={adapt} onChange={(e) => setAdapt(e.target.value)} placeholder="Ex.: aluno com TEA — antecipar rotina; aluna com dislexia — texto adaptado…" />
                </div>
              </div>

              <div className="pa-actions">
                <button type="button" className="pa-btn" onClick={() => navigate({ to: "/planejamento" })}>Cancelar</button>
                <button type="submit" className="pa-btn primary"><Sparkles size={14} /> Gerar atividade com a Sofia</button>
              </div>
            </form>

            <aside className="pa-side" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="pa-card">
                <h3><Clock size={14} /> Como funciona</h3>
                <ul>
                  <li>Você preenche o mínimo necessário.</li>
                  <li>A Sofia abre o chat lateral e gera a atividade completa.</li>
                  <li>Você revisa, ajusta com linguagem natural ("encurta", "adapta para TDAH").</li>
                  <li>Quando aprovar, adicione ao dia da semana no planejamento.</li>
                </ul>
              </div>

              <div className="pa-card">
                <h3><Users size={14} /> O que a Sofia entrega</h3>
                <ul>
                  <li>Habilidade(s) BNCC pelo código + descrição oficial.</li>
                  <li>Objetivos mensuráveis e sequência didática com tempos.</li>
                  <li>Adaptações para inclusão (linguagem não-capacitista).</li>
                  <li>Avaliação formativa e bloco de transparência (fontes, autores, base legal).</li>
                </ul>
              </div>

              <div className="tip">
                Dica: para Educação Infantil, a Sofia usa <strong>Campos de Experiência</strong> e <strong>Direitos de Aprendizagem</strong> automaticamente.
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
