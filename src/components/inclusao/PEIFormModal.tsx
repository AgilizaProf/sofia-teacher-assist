import { useEffect, useMemo, useRef, useState } from "react";
import { X, Save, Printer, Plus, Trash2, Sparkles, Wand2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { usePersistentState } from "@/lib/persist/usePersistentState";
import { wrapEditorialPrintHtml as wrapStandardPrintHtml } from "@/lib/print/editorialPrint";
import { useUser } from "@/lib/mockData";
import { useKeyboardAwareModal } from "@/hooks/useKeyboardAwareModal";

type Aluno = {
  id: string;
  name: string;
  diag?: string;
  cid?: string;
  anoEscolar?: string;
  turma?: string;
  idade?: number | string;
  aee?: string;
};

export type Objetivo = {
  id: string;
  texto: string;
  prazo: "curto" | "medio" | "longo";
  status: "nao_iniciado" | "em_andamento" | "atingido" | "revisar";
  criterios: string;
};

export type MetaCurta = {
  id: string;
  meta: string;
  indicador: string;
  area: string; // cognitiva | social | motora | comunicacao | autonomia
};

export type AreaAvaliacao =
  | "leitura_escrita" | "raciocinio_logico" | "motor_fino" | "motor_grosso"
  | "linguagem_oral" | "atencao" | "memoria" | "socializacao";

export const AREAS_AVALIACAO: { key: AreaAvaliacao; label: string }[] = [
  { key: "leitura_escrita", label: "Leitura e escrita" },
  { key: "raciocinio_logico", label: "Raciocínio lógico-matemático" },
  { key: "motor_fino", label: "Desenvolvimento motor fino" },
  { key: "motor_grosso", label: "Desenvolvimento motor grosso" },
  { key: "linguagem_oral", label: "Linguagem oral e comunicação" },
  { key: "atencao", label: "Atenção e concentração" },
  { key: "memoria", label: "Memória" },
  { key: "socializacao", label: "Socialização" },
];

export const NIVEIS_AVALIACAO = [
  "Não iniciado", "Em introdução", "Em desenvolvimento", "Consolidando", "Consolidado",
] as const;

export type PEIData = {
  // 1. Identificação e contexto
  protocolo: string;
  vigencia: { inicio: string; fim: string };
  escola: string;
  serie: string;
  dataNascimento: string;
  diagnostico: string;
  cid: string;
  laudoData: string;
  laudoProf: string;
  responsavelNome: string;
  responsavelContato: string;
  dataInicioPEI: string;
  profissionaisEnvolvidos: string[];
  // 2. Perfil
  potencialidades: string;
  interessesMotivacoes: string;
  estiloAprendizagem: string[];
  formaComunicacao: string[];
  nivelAutonomia: string;
  nivelInteracaoSocial: string;
  comportamentosRelevantes: string;
  comoLidarCrises: string;
  // 3. Histórico
  percursoEscolar: string;
  atendimentosExternos: string;
  resultadosIntervencoes: string;
  // 4. Avaliação pedagógica
  avaliacaoPedagogica: Partial<Record<AreaAvaliacao, { nivel: string; obs: string }>>;
  // 5. Objetivos e metas
  objetivosLongoPrazo: string;
  metasCurtoPrazo: MetaCurta[];
  objetivos: Objetivo[]; // legado
  // 6. Adaptações
  adaptacoesConteudo: string;
  adaptacoesMetodologicas: string;
  adaptacoesAvaliacao: string;
  adaptacoesTempo: string;
  adaptacoesEspaco: string;
  // 7. Estratégias
  estrategiasArea: string;
  recursosPedagogicos: string[];
  recursosPedagogicosOutro: string;
  estrategiasInclusaoColetiva: string;
  // 8. Tecnologia assistiva
  recursosCAA: string[];
  softwaresAplicativos: string;
  adaptacoesFisicasMateriais: string;
  // 9. Apoios e serviços
  frequenciaAEE: string;
  objetivosAEE: string;
  temProfissionalApoio: string;
  funcaoProfissionalApoio: string;
  // 10. Família
  comoFamiliaApoia: string;
  combinadosFamilia: string;
  frequenciaReunioes: string;
  // 11. Revisão
  dataRevisao: string;
  responsavelRevisao: string;
  criteriosAtualizacao: string;
  // Legado mantido para back-compat
  caracterizacao: string;
  habilidadesDesenvolvidas: string;
  pontosForca: string;
  necessidadesApoio: string;
  adaptacoesCurriculares: string;
  adaptacoesAvaliativas: string;
  metodologias: string;
  recursosApoio: string;
  formasAvaliacao: string;
  periodicidadeRevisao: string;
  familiaParticipacao: string;
  acordosFamilia: string;
  equipe: { nome: string; funcao: string }[];
  assinaturas: { professorRegente: string; coordenacao: string; aee: string; familia: string };
  atualizadoEm: string;
};

function blankPEI(): PEIData {
  return {
    protocolo: `PEI-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    vigencia: { inicio: "", fim: "" },
    escola: "",
    serie: "",
    dataNascimento: "",
    diagnostico: "",
    cid: "",
    laudoData: "",
    laudoProf: "",
    responsavelNome: "",
    responsavelContato: "",
    dataInicioPEI: "",
    profissionaisEnvolvidos: [],
    potencialidades: "",
    interessesMotivacoes: "",
    estiloAprendizagem: [],
    formaComunicacao: [],
    nivelAutonomia: "",
    nivelInteracaoSocial: "",
    comportamentosRelevantes: "",
    comoLidarCrises: "",
    percursoEscolar: "",
    atendimentosExternos: "",
    resultadosIntervencoes: "",
    avaliacaoPedagogica: {},
    objetivosLongoPrazo: "",
    metasCurtoPrazo: [],
    objetivos: [],
    adaptacoesConteudo: "",
    adaptacoesMetodologicas: "",
    adaptacoesAvaliacao: "",
    adaptacoesTempo: "",
    adaptacoesEspaco: "",
    estrategiasArea: "",
    recursosPedagogicos: [],
    recursosPedagogicosOutro: "",
    estrategiasInclusaoColetiva: "",
    recursosCAA: [],
    softwaresAplicativos: "",
    adaptacoesFisicasMateriais: "",
    frequenciaAEE: "",
    objetivosAEE: "",
    temProfissionalApoio: "",
    funcaoProfissionalApoio: "",
    comoFamiliaApoia: "",
    combinadosFamilia: "",
    frequenciaReunioes: "",
    dataRevisao: "",
    responsavelRevisao: "",
    criteriosAtualizacao: "",
    caracterizacao: "",
    habilidadesDesenvolvidas: "",
    pontosForca: "",
    necessidadesApoio: "",
    adaptacoesCurriculares: "",
    adaptacoesAvaliativas: "",
    metodologias: "",
    recursosApoio: "",
    formasAvaliacao: "",
    periodicidadeRevisao: "Bimestral",
    familiaParticipacao: "",
    acordosFamilia: "",
    equipe: [],
    assinaturas: { professorRegente: "", coordenacao: "", aee: "", familia: "" },
    atualizadoEm: "",
  };
}

// ============== Builder de contexto p/ Sofia — só campos preenchidos ==============
export function buildPEIContext(pei: Partial<PEIData> | null | undefined): string {
  if (!pei) return "";
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()) : []);
  const sections: string[] = [];

  // 1. Identificação
  const ident: string[] = [];
  if (s(pei.diagnostico) || s(pei.cid)) ident.push(`Diagnóstico: ${s(pei.diagnostico) || "—"}${s(pei.cid) ? ` (CID ${s(pei.cid)})` : ""}`);
  if (s(pei.laudoData)) ident.push(`Data do laudo: ${s(pei.laudoData)}`);
  if (s(pei.laudoProf)) ident.push(`Profissional do laudo: ${s(pei.laudoProf)}`);
  if (s(pei.responsavelNome)) ident.push(`Responsável legal: ${s(pei.responsavelNome)}`);
  if (s(pei.responsavelContato)) ident.push(`Contato da família: ${s(pei.responsavelContato)}`);
  if (s(pei.escola)) ident.push(`Escola: ${s(pei.escola)}`);
  if (s(pei.serie)) ident.push(`Turma: ${s(pei.serie)}`);
  if (s(pei.dataInicioPEI)) ident.push(`Início do PEI: ${s(pei.dataInicioPEI)}`);
  if (s(pei.vigencia?.fim)) ident.push(`Vigência até: ${s(pei.vigencia?.fim)}`);
  if (arr(pei.profissionaisEnvolvidos).length) ident.push(`Profissionais envolvidos: ${arr(pei.profissionaisEnvolvidos).join(", ")}`);
  if (ident.length) sections.push("IDENTIFICAÇÃO:\n" + ident.join("\n"));

  // 2. Perfil
  const perfil: string[] = [];
  if (s(pei.potencialidades)) perfil.push(`Potencialidades e pontos fortes: ${s(pei.potencialidades)}`);
  if (s(pei.interessesMotivacoes)) perfil.push(`Interesses e motivações: ${s(pei.interessesMotivacoes)}`);
  if (arr(pei.estiloAprendizagem).length) perfil.push(`Estilo de aprendizagem: ${arr(pei.estiloAprendizagem).join(", ")}`);
  if (arr(pei.formaComunicacao).length) perfil.push(`Forma de comunicação: ${arr(pei.formaComunicacao).join(", ")}`);
  if (s(pei.nivelAutonomia)) perfil.push(`Nível de autonomia: ${s(pei.nivelAutonomia)}`);
  if (s(pei.nivelInteracaoSocial)) perfil.push(`Nível de interação social: ${s(pei.nivelInteracaoSocial)}`);
  if (s(pei.comportamentosRelevantes)) perfil.push(`Comportamentos relevantes em sala: ${s(pei.comportamentosRelevantes)}`);
  if (s(pei.comoLidarCrises)) perfil.push(`Como lidar com crises/desregulação: ${s(pei.comoLidarCrises)}`);
  // legado
  if (s(pei.caracterizacao)) perfil.push(`Caracterização: ${s(pei.caracterizacao)}`);
  if (s(pei.habilidadesDesenvolvidas)) perfil.push(`Habilidades já desenvolvidas: ${s(pei.habilidadesDesenvolvidas)}`);
  if (s(pei.pontosForca)) perfil.push(`Pontos de força: ${s(pei.pontosForca)}`);
  if (s(pei.necessidadesApoio)) perfil.push(`Necessidades de apoio: ${s(pei.necessidadesApoio)}`);
  if (perfil.length) sections.push("PERFIL DO ALUNO:\n" + perfil.join("\n"));

  // 3. Histórico
  const hist: string[] = [];
  if (s(pei.percursoEscolar)) hist.push(`Percurso escolar: ${s(pei.percursoEscolar)}`);
  if (s(pei.atendimentosExternos)) hist.push(`Atendimentos externos: ${s(pei.atendimentosExternos)}`);
  if (s(pei.resultadosIntervencoes)) hist.push(`Resultados de intervenções anteriores: ${s(pei.resultadosIntervencoes)}`);
  if (hist.length) sections.push("HISTÓRICO ESCOLAR:\n" + hist.join("\n"));

  // 4. Avaliação pedagógica
  const avalLinhas: string[] = [];
  const av = pei.avaliacaoPedagogica || {};
  for (const a of AREAS_AVALIACAO) {
    const entry = av[a.key];
    if (entry && (s(entry.nivel) || s(entry.obs))) {
      avalLinhas.push(`- ${a.label}: ${s(entry.nivel) || "—"}${s(entry.obs) ? ` (${s(entry.obs)})` : ""}`);
    }
  }
  if (avalLinhas.length) sections.push("AVALIAÇÃO PEDAGÓGICA INICIAL:\n" + avalLinhas.join("\n"));

  // 5. Objetivos e metas
  const objSec: string[] = [];
  if (s(pei.objetivosLongoPrazo)) objSec.push(`Objetivos de longo prazo: ${s(pei.objetivosLongoPrazo)}`);
  const metas = Array.isArray(pei.metasCurtoPrazo) ? pei.metasCurtoPrazo.filter((m) => s(m?.meta)) : [];
  if (metas.length) {
    objSec.push("Metas de curto prazo:\n" + metas.map((m, i) => `  ${i + 1}. [${s(m.area) || "Geral"}] ${s(m.meta)}${s(m.indicador) ? ` · Indicador: ${s(m.indicador)}` : ""}`).join("\n"));
  }
  const objsLeg = Array.isArray(pei.objetivos) ? pei.objetivos.filter((o) => s(o?.texto)) : [];
  if (objsLeg.length) {
    const PRAZO: Record<string, string> = { curto: "curto", medio: "médio", longo: "longo" };
    const STATUS: Record<string, string> = { nao_iniciado: "não iniciado", em_andamento: "em andamento", atingido: "atingido", revisar: "revisar" };
    objSec.push("Objetivos pedagógicos:\n" + objsLeg.map((o, i) => `  ${i + 1}. ${s(o.texto)} — status: ${STATUS[o.status || ""] || "—"}${o.prazo ? ` (${PRAZO[o.prazo] || o.prazo} prazo)` : ""}${s(o.criterios) ? ` · critérios: ${s(o.criterios)}` : ""}`).join("\n"));
  }
  if (objSec.length) sections.push("OBJETIVOS E METAS:\n" + objSec.join("\n"));

  // 6. Adaptações
  const adapt: string[] = [];
  if (s(pei.adaptacoesConteudo)) adapt.push(`Adaptações de conteúdo: ${s(pei.adaptacoesConteudo)}`);
  if (s(pei.adaptacoesMetodologicas)) adapt.push(`Adaptações metodológicas: ${s(pei.adaptacoesMetodologicas)}`);
  if (s(pei.adaptacoesAvaliacao)) adapt.push(`Adaptações de avaliação: ${s(pei.adaptacoesAvaliacao)}`);
  if (s(pei.adaptacoesTempo)) adapt.push(`Adaptações de tempo: ${s(pei.adaptacoesTempo)}`);
  if (s(pei.adaptacoesEspaco)) adapt.push(`Adaptações de espaço: ${s(pei.adaptacoesEspaco)}`);
  if (s(pei.adaptacoesCurriculares)) adapt.push(`Adaptações curriculares (geral): ${s(pei.adaptacoesCurriculares)}`);
  if (s(pei.adaptacoesAvaliativas)) adapt.push(`Adaptações avaliativas (geral): ${s(pei.adaptacoesAvaliativas)}`);
  if (adapt.length) sections.push("ADAPTAÇÕES CURRICULARES:\n" + adapt.join("\n"));

  // 7. Estratégias
  const estr: string[] = [];
  if (s(pei.estrategiasArea)) estr.push(`Estratégias por área: ${s(pei.estrategiasArea)}`);
  const recs = arr(pei.recursosPedagogicos);
  if (recs.length) estr.push(`Recursos pedagógicos: ${recs.join(", ")}${s(pei.recursosPedagogicosOutro) ? `, ${s(pei.recursosPedagogicosOutro)}` : ""}`);
  if (s(pei.estrategiasInclusaoColetiva)) estr.push(`Estratégias para inclusão coletiva: ${s(pei.estrategiasInclusaoColetiva)}`);
  if (s(pei.metodologias)) estr.push(`Metodologias: ${s(pei.metodologias)}`);
  if (s(pei.recursosApoio)) estr.push(`Recursos de apoio: ${s(pei.recursosApoio)}`);
  if (estr.length) sections.push("ESTRATÉGIAS PEDAGÓGICAS:\n" + estr.join("\n"));

  // 8. Tecnologia assistiva
  const ta: string[] = [];
  if (arr(pei.recursosCAA).length) ta.push(`Recursos de CAA em uso: ${arr(pei.recursosCAA).join(", ")}`);
  if (s(pei.softwaresAplicativos)) ta.push(`Softwares e aplicativos de apoio: ${s(pei.softwaresAplicativos)}`);
  if (s(pei.adaptacoesFisicasMateriais)) ta.push(`Adaptações físicas de materiais: ${s(pei.adaptacoesFisicasMateriais)}`);
  if (ta.length) sections.push("TECNOLOGIA ASSISTIVA:\n" + ta.join("\n"));

  // 9. Apoios
  const ap: string[] = [];
  if (s(pei.frequenciaAEE)) ap.push(`Frequência no AEE: ${s(pei.frequenciaAEE)}`);
  if (s(pei.objetivosAEE)) ap.push(`Objetivos do AEE: ${s(pei.objetivosAEE)}`);
  if (s(pei.temProfissionalApoio)) ap.push(`Profissional de apoio em sala: ${s(pei.temProfissionalApoio)}`);
  if (s(pei.temProfissionalApoio).toLowerCase() === "sim" && s(pei.funcaoProfissionalApoio))
    ap.push(`Função do profissional de apoio: ${s(pei.funcaoProfissionalApoio)}`);
  if (ap.length) sections.push("APOIOS E SERVIÇOS:\n" + ap.join("\n"));

  // 10. Família
  const fam: string[] = [];
  if (s(pei.comoFamiliaApoia)) fam.push(`Como a família apoia em casa: ${s(pei.comoFamiliaApoia)}`);
  if (s(pei.combinadosFamilia)) fam.push(`Combinados escola-família: ${s(pei.combinadosFamilia)}`);
  if (s(pei.frequenciaReunioes)) fam.push(`Frequência de reuniões: ${s(pei.frequenciaReunioes)}`);
  if (s(pei.familiaParticipacao)) fam.push(`Participação da família (geral): ${s(pei.familiaParticipacao)}`);
  if (s(pei.acordosFamilia)) fam.push(`Acordos com a família: ${s(pei.acordosFamilia)}`);
  if (fam.length) sections.push("PARTICIPAÇÃO DA FAMÍLIA:\n" + fam.join("\n"));

  // 11. Revisão
  const rev: string[] = [];
  if (s(pei.dataRevisao)) rev.push(`Data prevista para revisão: ${s(pei.dataRevisao)}`);
  if (s(pei.responsavelRevisao)) rev.push(`Responsável pela revisão: ${s(pei.responsavelRevisao)}`);
  if (s(pei.criteriosAtualizacao)) rev.push(`Critérios para atualização: ${s(pei.criteriosAtualizacao)}`);
  if (s(pei.periodicidadeRevisao)) rev.push(`Periodicidade: ${s(pei.periodicidadeRevisao)}`);
  if (rev.length) sections.push("REVISÃO DO PEI:\n" + rev.join("\n"));

  if (sections.length === 0) return "";
  return "PEI DO ALUNO:\n" + sections.join("\n\n");
}

// ============== CSS helpers ==============
const inputCss: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 8,
  border: "1px solid var(--border)", fontSize: 13, fontFamily: "inherit",
  background: "#fff", color: "var(--text)",
};
const labelCss: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "var(--muted)",
  textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4, display: "block",
};
const sectionCss: React.CSSProperties = {
  background: "#fff", border: "1px solid var(--border)", borderRadius: 12,
  padding: 16, marginBottom: 14,
};
const sectionTitleCss: React.CSSProperties = {
  fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 10,
  display: "flex", alignItems: "center", gap: 8,
};
const sectionBadge: React.CSSProperties = {
  fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 999,
  background: "var(--accent-soft)", color: "#B8410E",
};

function CheckGroup({
  options, value, onChange, multi = true,
}: { options: string[]; value: string[] | string; onChange: (v: string[] | string) => void; multi?: boolean }) {
  const selected = multi ? (Array.isArray(value) ? value : []) : [];
  const single = !multi && typeof value === "string" ? value : "";
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((opt) => {
        const isOn = multi ? selected.includes(opt) : single === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => {
              if (multi) {
                const arr = selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt];
                onChange(arr);
              } else {
                onChange(single === opt ? "" : opt);
              }
            }}
            style={{
              fontSize: 12, padding: "5px 10px", borderRadius: 999,
              border: `1px solid ${isOn ? "var(--accent)" : "var(--border)"}`,
              background: isOn ? "var(--accent-soft)" : "#fff",
              color: isOn ? "#B8410E" : "var(--text)",
              fontWeight: 600, cursor: "pointer",
            }}
          >
            {isOn ? "✓ " : ""}{opt}
          </button>
        );
      })}
    </div>
  );
}

// ============== Tabs ==============
type TabKey = "ident" | "perfil" | "aval" | "objetivos" | "adapt" | "ta" | "familia" | "revisao";
const TABS: { key: TabKey; label: string }[] = [
  { key: "ident", label: "📋 Identificação" },
  { key: "perfil", label: "👤 Perfil" },
  { key: "aval", label: "📚 Avaliação" },
  { key: "objetivos", label: "🎯 Objetivos" },
  { key: "adapt", label: "🔧 Adaptações" },
  { key: "ta", label: "📱 Tec. Assistiva" },
  { key: "familia", label: "🤝 Apoios e Família" },
  { key: "revisao", label: "📅 Revisão" },
];

// preenchimento por aba (para indicador 6/8 etc.)
function tabPreenchida(t: TabKey, d: PEIData): boolean {
  const has = (v?: string) => Boolean(v && v.trim().length > 1);
  const ar = (v?: string[]) => Array.isArray(v) && v.length > 0;
  switch (t) {
    case "ident": return has(d.escola) || has(d.diagnostico) || has(d.cid) || has(d.responsavelNome) || ar(d.profissionaisEnvolvidos) || has(d.dataInicioPEI);
    case "perfil": return has(d.potencialidades) || has(d.interessesMotivacoes) || ar(d.estiloAprendizagem) || ar(d.formaComunicacao) || has(d.nivelAutonomia) || has(d.nivelInteracaoSocial) || has(d.comportamentosRelevantes) || has(d.comoLidarCrises) || has(d.percursoEscolar) || has(d.atendimentosExternos) || has(d.resultadosIntervencoes);
    case "aval": return Object.values(d.avaliacaoPedagogica || {}).some((v) => v && (has(v.nivel) || has(v.obs)));
    case "objetivos": return has(d.objetivosLongoPrazo) || (d.metasCurtoPrazo || []).some((m) => has(m.meta)) || (d.objetivos || []).some((o) => has(o.texto));
    case "adapt": return has(d.adaptacoesConteudo) || has(d.adaptacoesMetodologicas) || has(d.adaptacoesAvaliacao) || has(d.adaptacoesTempo) || has(d.adaptacoesEspaco) || has(d.estrategiasArea) || ar(d.recursosPedagogicos) || has(d.estrategiasInclusaoColetiva);
    case "ta": return ar(d.recursosCAA) || has(d.softwaresAplicativos) || has(d.adaptacoesFisicasMateriais);
    case "familia": return has(d.frequenciaAEE) || has(d.objetivosAEE) || has(d.temProfissionalApoio) || has(d.comoFamiliaApoia) || has(d.combinadosFamilia) || has(d.frequenciaReunioes);
    case "revisao": return has(d.dataRevisao) || has(d.responsavelRevisao) || has(d.criteriosAtualizacao);
  }
}

type Props = {
  open: boolean;
  onClose: () => void;
  aluno: Aluno | null;
};

export function PEIFormModal({ open, onClose, aluno }: Props) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  useKeyboardAwareModal(modalRef, open);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const user = useUser();
  const [peiByStudent, setPeiByStudent] = usePersistentState<Record<string, PEIData>>("inc_pei", {});
  const [draft, setDraft] = useState<PEIData>(blankPEI());
  const [tab, setTab] = useState<TabKey>("ident");
  const [savedAt, setSavedAt] = useState<string>("");
  const autosaveTimer = useRef<number | null>(null);

  // hidratação ao abrir
  useEffect(() => {
    if (open && aluno) {
      const existing = peiByStudent[aluno.id];
      if (existing) {
        setDraft({ ...blankPEI(), ...existing });
        setSavedAt(existing.atualizadoEm || "");
      } else {
        const seed = blankPEI();
        seed.diagnostico = aluno.diag || "";
        seed.cid = aluno.cid || "";
        seed.serie = aluno.anoEscolar || "";
        setDraft(seed);
        setSavedAt("");
      }
      setTab("ident");
    }
     
  }, [open, aluno?.id]);

  // autosave (debounced)
  useEffect(() => {
    if (!open || !aluno) return;
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      const upd = { ...draft, atualizadoEm: new Date().toISOString() };
      setPeiByStudent((prev) => ({ ...prev, [aluno.id]: upd }));
      setSavedAt(upd.atualizadoEm);
    }, 800);
    return () => { if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current); };
     
  }, [draft, open, aluno?.id]);

  const set = <K extends keyof PEIData>(k: K, v: PEIData[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
  };

  const updMeta = (id: string, patch: Partial<MetaCurta>) => {
    setDraft((d) => ({ ...d, metasCurtoPrazo: d.metasCurtoPrazo.map((m) => m.id === id ? { ...m, ...patch } : m) }));
  };
  const addMeta = () => setDraft((d) => ({
    ...d,
    metasCurtoPrazo: [...d.metasCurtoPrazo, { id: Math.random().toString(36).slice(2, 8), meta: "", indicador: "", area: "Cognitiva/Pedagógica" }],
  }));
  const delMeta = (id: string) => setDraft((d) => ({ ...d, metasCurtoPrazo: d.metasCurtoPrazo.filter((m) => m.id !== id) }));

  const setAval = (area: AreaAvaliacao, patch: { nivel?: string; obs?: string }) => {
    setDraft((d) => {
      const cur = d.avaliacaoPedagogica[area] || { nivel: "", obs: "" };
      return { ...d, avaliacaoPedagogica: { ...d.avaliacaoPedagogica, [area]: { ...cur, ...patch } } };
    });
  };

  const salvar = () => {
    if (!aluno) return;
    const upd = { ...draft, atualizadoEm: new Date().toISOString() };
    setPeiByStudent((prev) => ({ ...prev, [aluno.id]: upd }));
    setSavedAt(upd.atualizadoEm);
    toast.success("PEI salvo · Lei 14.254/2021");
  };

  const totalPreenchidas = useMemo(() => TABS.filter((t) => tabPreenchida(t.key, draft)).length, [draft]);

  const imprimir = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const esc = (s: string) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
    const ctx = buildPEIContext(draft).replace(/\n/g, "<br/>");
    const extraCss = `
      h1{font-size:16pt;margin:0 0 6pt;border-bottom:2px solid #FF7A45;padding-bottom:4pt;}
      .meta{font-size:11pt;color:#6B7691;margin-bottom:10pt;}
      .legal{margin-top:16pt;font-size:10pt;color:#6B7691;border-top:1px dashed #ccc;padding-top:6pt;}
    `;
    const inner = `
      <div><button onclick="window.print()">Imprimir</button></div>
      <h1>Plano Educacional Individualizado (PEI)</h1>
      <div class="meta">Protocolo ${esc(draft.protocolo)} · Aluno: ${esc(aluno?.name || "—")}</div>
      <div style="font-size:12pt;line-height:1.55;">${ctx || "<p>—</p>"}</div>
      <div class="legal">Documento conforme <b>Lei 14.254/2021</b>, <b>Lei 13.146/2015</b>, <b>Lei 12.764/2012</b> e BNCC.</div>
    `;
    w.document.write(wrapStandardPrintHtml(`PEI · ${esc(aluno?.name || "")}`, inner, {
      extraCss, professorNome: user.name, docType: "pei",
    }));
    w.document.close();
    setTimeout(() => w.focus(), 200);
  };

  if (!open) return null;

  return (
    <div className="inc-modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="inc-modal" ref={modalRef} style={{ maxWidth: 980 }}>
        <div className="inc-modal-bar" />
        <div className="inc-modal-head">
          <div>
            <h2>Plano Educacional Individualizado{aluno ? ` · ${aluno.name}` : ""}</h2>
            <span className="meta" style={{ display: "block", marginTop: 4 }}>
              Protocolo {draft.protocolo} · Lei 14.254/2021 · <b>{totalPreenchidas} de {TABS.length} seções preenchidas</b>
              {savedAt && <span style={{ color: "var(--success)", marginLeft: 8 }}> · <CheckCircle2 size={11} style={{ verticalAlign: -1 }} /> salvo automaticamente</span>}
            </span>
          </div>
          <button className="inc-modal-close" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "8px 14px", borderBottom: "1px solid var(--border)", background: "#fff" }}>
          {TABS.map((t) => {
            const filled = tabPreenchida(t.key, draft);
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  fontSize: 12, padding: "6px 11px", borderRadius: 8,
                  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  background: active ? "var(--accent-soft)" : (filled ? "#F0FDF4" : "#fff"),
                  color: active ? "#B8410E" : "var(--text)",
                  fontWeight: 700, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 5,
                }}
              >
                {t.label}{filled && <CheckCircle2 size={11} color={active ? "#B8410E" : "#16A34A"} />}
              </button>
            );
          })}
        </div>

        <div className="inc-modal-body" style={{ background: "var(--bg)" }}>
          {/* TAB IDENT */}
          {tab === "ident" && (
            <div style={sectionCss}>
              <div style={sectionTitleCss}><span style={sectionBadge}>1</span>Identificação e contexto</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelCss}>Nome completo</label>
                  <input style={inputCss} value={aluno?.name || ""} disabled />
                </div>
                <div>
                  <label style={labelCss}>Data de nascimento</label>
                  <input type="date" style={inputCss} value={draft.dataNascimento} onChange={(e) => set("dataNascimento", e.target.value)} />
                </div>
                <div>
                  <label style={labelCss}>Diagnóstico</label>
                  <input style={inputCss} value={draft.diagnostico} onChange={(e) => set("diagnostico", e.target.value)} placeholder="Ex.: TEA Nível 1" />
                </div>
                <div>
                  <label style={labelCss}>CID</label>
                  <input style={inputCss} value={draft.cid} onChange={(e) => set("cid", e.target.value)} placeholder="Ex.: F84.0" />
                </div>
                <div>
                  <label style={labelCss}>Data do laudo médico</label>
                  <input type="date" style={inputCss} value={draft.laudoData} onChange={(e) => set("laudoData", e.target.value)} />
                </div>
                <div>
                  <label style={labelCss}>Profissional responsável pelo laudo</label>
                  <input style={inputCss} value={draft.laudoProf} onChange={(e) => set("laudoProf", e.target.value)} placeholder="Ex.: Dra. Ana — CRM 12345" />
                </div>
                <div>
                  <label style={labelCss}>Responsável legal</label>
                  <input style={inputCss} value={draft.responsavelNome} onChange={(e) => set("responsavelNome", e.target.value)} placeholder="Nome do responsável" />
                </div>
                <div>
                  <label style={labelCss}>Contato da família</label>
                  <input style={inputCss} value={draft.responsavelContato} onChange={(e) => set("responsavelContato", e.target.value)} placeholder="Telefone / email" />
                </div>
                <div>
                  <label style={labelCss}>Escola</label>
                  <input style={inputCss} value={draft.escola} onChange={(e) => set("escola", e.target.value)} placeholder="Nome da escola" />
                </div>
                <div>
                  <label style={labelCss}>Turma · ano de referência pedagógico</label>
                  <input style={inputCss} value={draft.serie} onChange={(e) => set("serie", e.target.value)} placeholder="Ex.: 2º Ano A" />
                </div>
                <div>
                  <label style={labelCss}>Data de início do PEI</label>
                  <input type="date" style={inputCss} value={draft.dataInicioPEI} onChange={(e) => set("dataInicioPEI", e.target.value)} />
                </div>
                <div>
                  <label style={labelCss}>Vigência do PEI (até)</label>
                  <input type="date" style={inputCss} value={draft.vigencia.fim} onChange={(e) => set("vigencia", { ...draft.vigencia, fim: e.target.value })} />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={labelCss}>Profissionais envolvidos no PEI</label>
                <CheckGroup
                  multi
                  options={["Professor(a) regente", "AEE", "Psicólogo(a)", "Fonoaudiólogo(a)", "Terapeuta ocupacional", "Mediador(a)", "Coordenação pedagógica", "Outros"]}
                  value={draft.profissionaisEnvolvidos}
                  onChange={(v) => set("profissionaisEnvolvidos", v as string[])}
                />
              </div>
            </div>
          )}

          {/* TAB PERFIL */}
          {tab === "perfil" && (
            <>
              <div style={sectionCss}>
                <div style={sectionTitleCss}><span style={sectionBadge}>2</span>Perfil do aluno</div>
                <label style={labelCss}>Potencialidades e pontos fortes</label>
                <textarea style={{ ...inputCss, minHeight: 60 }} value={draft.potencialidades} onChange={(e) => set("potencialidades", e.target.value)}
                  placeholder="O que o aluno já faz bem, seus talentos e habilidades desenvolvidas..." />
                <label style={{ ...labelCss, marginTop: 10 }}>Interesses e motivações</label>
                <textarea style={{ ...inputCss, minHeight: 60 }} value={draft.interessesMotivacoes} onChange={(e) => set("interessesMotivacoes", e.target.value)}
                  placeholder="O que engaja e motiva o aluno, temas favoritos, atividades preferidas..." />

                <div style={{ marginTop: 12 }}>
                  <label style={labelCss}>Estilo de aprendizagem (múltipla escolha)</label>
                  <CheckGroup multi options={["Visual", "Auditivo", "Cinestésico", "Leitura/Escrita", "Misto"]}
                    value={draft.estiloAprendizagem} onChange={(v) => set("estiloAprendizagem", v as string[])} />
                </div>

                <div style={{ marginTop: 12 }}>
                  <label style={labelCss}>Forma de comunicação predominante (múltipla escolha)</label>
                  <CheckGroup multi options={["Verbal oral", "CAA", "Gestos e sinais", "LIBRAS", "Escrita", "Pictogramas"]}
                    value={draft.formaComunicacao} onChange={(v) => set("formaComunicacao", v as string[])} />
                </div>

                <div style={{ marginTop: 12 }}>
                  <label style={labelCss}>Nível de autonomia nas atividades</label>
                  <CheckGroup multi={false} options={["Totalmente dependente", "Dependente com apoio parcial", "Semi-independente", "Independente com supervisão", "Totalmente independente"]}
                    value={draft.nivelAutonomia} onChange={(v) => set("nivelAutonomia", v as string)} />
                </div>

                <div style={{ marginTop: 12 }}>
                  <label style={labelCss}>Nível de interação social</label>
                  <CheckGroup multi={false} options={["Não interage com colegas", "Interage com apoio do adulto", "Interage com 1 ou 2 colegas", "Interage em pequenos grupos", "Interage com toda a turma"]}
                    value={draft.nivelInteracaoSocial} onChange={(v) => set("nivelInteracaoSocial", v as string)} />
                </div>

                <label style={{ ...labelCss, marginTop: 12 }}>Comportamentos relevantes em sala</label>
                <textarea style={{ ...inputCss, minHeight: 70 }} value={draft.comportamentosRelevantes} onChange={(e) => set("comportamentosRelevantes", e.target.value)}
                  placeholder="Desregulações, gatilhos, estratégias que funcionam, rotinas necessárias..." />

                <label style={{ ...labelCss, marginTop: 10 }}>Como lidar com crises ou desregulação</label>
                <textarea style={{ ...inputCss, minHeight: 70 }} value={draft.comoLidarCrises} onChange={(e) => set("comoLidarCrises", e.target.value)}
                  placeholder="O que fazer: estratégias que funcionam, o que evitar, quem acionar..." />
              </div>

              <div style={sectionCss}>
                <div style={sectionTitleCss}><span style={sectionBadge}>3</span>Histórico escolar</div>
                <label style={labelCss}>Percurso escolar anterior</label>
                <textarea style={{ ...inputCss, minHeight: 60 }} value={draft.percursoEscolar} onChange={(e) => set("percursoEscolar", e.target.value)}
                  placeholder="Escolas anteriores, experiências relevantes, anos repetidos, atendimentos já realizados..." />
                <label style={{ ...labelCss, marginTop: 10 }}>Atendimentos externos em andamento</label>
                <textarea style={{ ...inputCss, minHeight: 60 }} value={draft.atendimentosExternos} onChange={(e) => set("atendimentosExternos", e.target.value)}
                  placeholder="Terapias, clínicas, especialistas que acompanham o aluno atualmente..." />
                <label style={{ ...labelCss, marginTop: 10 }}>Resultados de intervenções anteriores</label>
                <textarea style={{ ...inputCss, minHeight: 60 }} value={draft.resultadosIntervencoes} onChange={(e) => set("resultadosIntervencoes", e.target.value)}
                  placeholder="O que já foi tentado e os resultados observados..." />
              </div>
            </>
          )}

          {/* TAB AVAL */}
          {tab === "aval" && (
            <div style={sectionCss}>
              <div style={sectionTitleCss}><span style={sectionBadge}>4</span>Avaliação pedagógica inicial</div>
              {AREAS_AVALIACAO.map((a) => {
                const v = draft.avaliacaoPedagogica[a.key] || { nivel: "", obs: "" };
                return (
                  <div key={a.key} style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: 10, marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{a.label}</div>
                    <CheckGroup multi={false} options={[...NIVEIS_AVALIACAO]} value={v.nivel} onChange={(x) => setAval(a.key, { nivel: x as string })} />
                    <textarea style={{ ...inputCss, minHeight: 48, marginTop: 8 }} value={v.obs}
                      onChange={(e) => setAval(a.key, { obs: e.target.value })}
                      placeholder="Observações sobre esta área (opcional)" />
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB OBJETIVOS */}
          {tab === "objetivos" && (
            <div style={sectionCss}>
              <div style={sectionTitleCss}><span style={sectionBadge}>5</span>Objetivos e metas</div>
              <label style={labelCss}>Objetivos de longo prazo (ano letivo)</label>
              <textarea style={{ ...inputCss, minHeight: 80 }} value={draft.objetivosLongoPrazo} onChange={(e) => set("objetivosLongoPrazo", e.target.value)}
                placeholder="O que se espera que o aluno desenvolva até o final do ano letivo..." />

              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Metas de curto prazo com indicadores</div>
                <button onClick={addMeta} className="inc-btn-ghost" style={{ marginLeft: "auto" }}>
                  <Plus size={12} /> Adicionar meta
                </button>
              </div>
              {draft.metasCurtoPrazo.length === 0 && (
                <p style={{ fontSize: 12, color: "var(--muted)", margin: "6px 0 0" }}>Nenhuma meta cadastrada.</p>
              )}
              {draft.metasCurtoPrazo.map((m, i) => (
                <div key={m.id} style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: 10, marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <span style={{ ...sectionBadge, background: "#E9F0FF", color: "#1F4FB8" }}>#{i + 1}</span>
                    <select value={m.area} onChange={(e) => updMeta(m.id, { area: e.target.value })} style={{ ...inputCss, width: "auto" }}>
                      <option>Cognitiva/Pedagógica</option>
                      <option>Social e emocional</option>
                      <option>Motora</option>
                      <option>Comunicação e linguagem</option>
                      <option>Autonomia e independência</option>
                    </select>
                    <button onClick={() => delMeta(m.id)} style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#C62B2B", cursor: "pointer" }}><Trash2 size={14} /></button>
                  </div>
                  <label style={labelCss}>Meta</label>
                  <textarea style={{ ...inputCss, minHeight: 50, marginBottom: 6 }} value={m.meta} onChange={(e) => updMeta(m.id, { meta: e.target.value })}
                    placeholder="O que se quer alcançar..." />
                  <label style={labelCss}>Como saber que foi atingida (indicador)</label>
                  <input style={inputCss} value={m.indicador} onChange={(e) => updMeta(m.id, { indicador: e.target.value })}
                    placeholder="Critério observável para considerar a meta atingida" />
                </div>
              ))}
            </div>
          )}

          {/* TAB ADAPT */}
          {tab === "adapt" && (
            <>
              <div style={sectionCss}>
                <div style={sectionTitleCss}><span style={sectionBadge}>6</span>Adaptações curriculares</div>
                {[
                  { k: "adaptacoesConteudo" as const, l: "Adaptações de conteúdo", ph: "O que será ensinado de forma diferente ou simplificada..." },
                  { k: "adaptacoesMetodologicas" as const, l: "Adaptações metodológicas", ph: "Como o conteúdo será ensinado: material concreto, visual, sequências menores..." },
                  { k: "adaptacoesAvaliacao" as const, l: "Adaptações de avaliação", ph: "Prova oral, portfólio, observação, prazo estendido..." },
                  { k: "adaptacoesTempo" as const, l: "Adaptações de tempo", ph: "Tempo extra necessário para atividades, provas e tarefas..." },
                  { k: "adaptacoesEspaco" as const, l: "Adaptações de espaço", ph: "Posicionamento na sala, ambiente adaptado, iluminação, nível de ruído..." },
                ].map((c) => (
                  <div key={c.k} style={{ marginBottom: 10 }}>
                    <label style={labelCss}>{c.l}</label>
                    <textarea style={{ ...inputCss, minHeight: 60 }} value={draft[c.k] as string} onChange={(e) => set(c.k, e.target.value)} placeholder={c.ph} />
                  </div>
                ))}
              </div>
              <div style={sectionCss}>
                <div style={sectionTitleCss}><span style={sectionBadge}>7</span>Estratégias pedagógicas</div>
                <label style={labelCss}>Estratégias específicas por área</label>
                <textarea style={{ ...inputCss, minHeight: 70 }} value={draft.estrategiasArea} onChange={(e) => set("estrategiasArea", e.target.value)}
                  placeholder="Estratégias que funcionam para cada componente curricular ou campo de experiência..." />
                <div style={{ marginTop: 12 }}>
                  <label style={labelCss}>Recursos pedagógicos necessários (múltipla escolha)</label>
                  <CheckGroup multi
                    options={["Material concreto e manipulável", "Recursos visuais e pictogramas", "Tecnologia assistiva", "Jogos pedagógicos", "Música e movimento", "Rotina visual estruturada", "Temporizador visual", "Espaço de autorregulação"]}
                    value={draft.recursosPedagogicos} onChange={(v) => set("recursosPedagogicos", v as string[])} />
                  <input style={{ ...inputCss, marginTop: 8 }} value={draft.recursosPedagogicosOutro} onChange={(e) => set("recursosPedagogicosOutro", e.target.value)} placeholder="Outro recurso (opcional)" />
                </div>
                <label style={{ ...labelCss, marginTop: 12 }}>Estratégias para inclusão coletiva</label>
                <textarea style={{ ...inputCss, minHeight: 70 }} value={draft.estrategiasInclusaoColetiva} onChange={(e) => set("estrategiasInclusaoColetiva", e.target.value)}
                  placeholder="Como incluir o aluno nas atividades da turma toda..." />
              </div>
            </>
          )}

          {/* TAB TA */}
          {tab === "ta" && (
            <div style={sectionCss}>
              <div style={sectionTitleCss}><span style={sectionBadge}>8</span>Tecnologia assistiva</div>
              <label style={labelCss}>Recursos de CAA em uso (múltipla escolha)</label>
              <CheckGroup multi
                options={["Pranchas de comunicação", "Aplicativo de CAA (Livox, LetMeTalk)", "PECS", "Símbolos gráficos (PCS, Arasaac)", "Não utiliza CAA"]}
                value={draft.recursosCAA} onChange={(v) => set("recursosCAA", v as string[])} />
              <label style={{ ...labelCss, marginTop: 12 }}>Softwares e aplicativos de apoio</label>
              <textarea style={{ ...inputCss, minHeight: 60 }} value={draft.softwaresAplicativos} onChange={(e) => set("softwaresAplicativos", e.target.value)}
                placeholder="Apps e ferramentas digitais que auxiliam o aprendizado..." />
              <label style={{ ...labelCss, marginTop: 10 }}>Adaptações físicas de materiais</label>
              <textarea style={{ ...inputCss, minHeight: 60 }} value={draft.adaptacoesFisicasMateriais} onChange={(e) => set("adaptacoesFisicasMateriais", e.target.value)}
                placeholder="Lápis adaptado, tesoura adaptada, engrossador, etc..." />
            </div>
          )}

          {/* TAB FAMILIA */}
          {tab === "familia" && (
            <>
              <div style={sectionCss}>
                <div style={sectionTitleCss}><span style={sectionBadge}>9</span>Apoios e serviços</div>
                <label style={labelCss}>Frequência no AEE</label>
                <CheckGroup multi={false} options={["Não frequenta AEE", "1x por semana", "2x por semana", "Diariamente", "Outro"]}
                  value={draft.frequenciaAEE} onChange={(v) => set("frequenciaAEE", v as string)} />
                <label style={{ ...labelCss, marginTop: 10 }}>Objetivos do AEE</label>
                <textarea style={{ ...inputCss, minHeight: 60 }} value={draft.objetivosAEE} onChange={(e) => set("objetivosAEE", e.target.value)}
                  placeholder="O que é trabalhado no Atendimento Educacional Especializado..." />
                <div style={{ marginTop: 12 }}>
                  <label style={labelCss}>Possui profissional de apoio em sala?</label>
                  <CheckGroup multi={false} options={["Sim", "Não"]} value={draft.temProfissionalApoio} onChange={(v) => set("temProfissionalApoio", v as string)} />
                </div>
                {draft.temProfissionalApoio === "Sim" && (
                  <>
                    <label style={{ ...labelCss, marginTop: 10 }}>Função do profissional de apoio</label>
                    <textarea style={{ ...inputCss, minHeight: 50 }} value={draft.funcaoProfissionalApoio} onChange={(e) => set("funcaoProfissionalApoio", e.target.value)}
                      placeholder="O que o profissional de apoio realiza em sala..." />
                  </>
                )}
              </div>
              <div style={sectionCss}>
                <div style={sectionTitleCss}><span style={sectionBadge}>10</span>Participação da família</div>
                <label style={labelCss}>Como a família pode apoiar em casa</label>
                <textarea style={{ ...inputCss, minHeight: 60 }} value={draft.comoFamiliaApoia} onChange={(e) => set("comoFamiliaApoia", e.target.value)}
                  placeholder="Orientações para a família continuar o trabalho em casa..." />
                <label style={{ ...labelCss, marginTop: 10 }}>Combinados entre escola e família</label>
                <textarea style={{ ...inputCss, minHeight: 60 }} value={draft.combinadosFamilia} onChange={(e) => set("combinadosFamilia", e.target.value)}
                  placeholder="Acordos estabelecidos para garantir consistência..." />
                <div style={{ marginTop: 12 }}>
                  <label style={labelCss}>Frequência de reuniões de acompanhamento</label>
                  <CheckGroup multi={false} options={["Mensal", "Bimestral", "Trimestral", "Semestral", "Sob demanda"]}
                    value={draft.frequenciaReunioes} onChange={(v) => set("frequenciaReunioes", v as string)} />
                </div>
              </div>
            </>
          )}

          {/* TAB REVISÃO */}
          {tab === "revisao" && (
            <div style={sectionCss}>
              <div style={sectionTitleCss}><span style={sectionBadge}>11</span>Avaliação e revisão do PEI</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelCss}>Data prevista para revisão</label>
                  <input type="date" style={inputCss} value={draft.dataRevisao} onChange={(e) => set("dataRevisao", e.target.value)} />
                </div>
                <div>
                  <label style={labelCss}>Responsável pela revisão</label>
                  <input style={inputCss} value={draft.responsavelRevisao} onChange={(e) => set("responsavelRevisao", e.target.value)} placeholder="Nome do responsável" />
                </div>
              </div>
              <label style={{ ...labelCss, marginTop: 12 }}>Critérios para atualização do plano</label>
              <textarea style={{ ...inputCss, minHeight: 80 }} value={draft.criteriosAtualizacao} onChange={(e) => set("criteriosAtualizacao", e.target.value)}
                placeholder="O que deve acontecer para o PEI ser revisado antes da data prevista..." />
            </div>
          )}

          <p style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", margin: "10px 0 0" }}>
            <Sparkles size={11} style={{ verticalAlign: -1 }} /> Apenas seções preenchidas serão enviadas no prompt da Sofia. ·{" "}
            <Wand2 size={11} style={{ verticalAlign: -1 }} /> Salvamento automático ativo.
          </p>
        </div>

        <div className="inc-modal-foot">
          <span className="legal">{savedAt ? `Salvo em ${new Date(savedAt).toLocaleString("pt-BR")}` : "Não salvo ainda"}</span>
          <button className="inc-btn-ghost" onClick={imprimir}><Printer size={14} /> Imprimir / PDF</button>
          <button className="btn btn-primary" onClick={salvar}>
            <Save size={14} /> Salvar PEI
          </button>
        </div>
      </div>
    </div>
  );
}
