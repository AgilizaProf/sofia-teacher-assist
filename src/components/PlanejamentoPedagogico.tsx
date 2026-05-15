import React, { useEffect, useMemo } from "react";
import { useUser } from "@/lib/mockData";
import { usePersistentState } from "@/lib/persist/usePersistentState";
import { useTurmas } from "@/hooks/useTurmas";
import { formatTurmaGrade } from "@/lib/turmaGrade";

const NAVY = "#1a2744";
const BORDER = "#d6d6d6";
const SOFT = "#f7f6f2";

const titleFont = "'Fraunces', Georgia, 'Times New Roman', serif";
const bodyFont = "'Inter', Arial, Helvetica, sans-serif";

type DashSchool = { name: string; network: string; stage: string; city: string; uf: string; classes: string };

type PlanejamentoDoc = {
  escola: string;
  professor: string;
  turma: string;
  data: string;
  componente: string;
  tema: string;
  periodo: string;
  cargaHoraria: string;
  objetivos: string;
  habilidades: string;
  conteudos: string;
  metodologia: string;
  recursos: string;
  avaliacao: string;
  adaptacoes: string;
  referencias: string;
};

const EMPTY: PlanejamentoDoc = {
  escola: "", professor: "", turma: "", data: "",
  componente: "", tema: "", periodo: "", cargaHoraria: "",
  objetivos: "", habilidades: "", conteudos: "", metodologia: "",
  recursos: "", avaliacao: "", adaptacoes: "", referencias: "",
};

function PageHeader({ pageNumber }: { pageNumber: number }) {
  return (
    <div className="no-print-shadow" style={{
      background: NAVY, color: "#fff", padding: "14px 24px",
      display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: titleFont, fontWeight: 700, fontSize: 14, letterSpacing: ".12em", textTransform: "uppercase" }}>
          AGILIZAPROF · PLANEJAMENTO PEDAGÓGICO
        </div>
        <div style={{ fontFamily: bodyFont, fontSize: 10, marginTop: 4, opacity: 0.92 }}>
          Documento gerado pela plataforma AgilizaProf
        </div>
        <div style={{ fontFamily: bodyFont, fontSize: 8.5, marginTop: 2, opacity: 0.78, lineHeight: 1.4 }}>
          Fundamentação legal: LDB – Lei nº 9.394/96 (Art. 13, II) | BNCC – Resolução CNE/CP nº 2/2017 | DCNs – Resolução CNE/CEB nº 4/2010
        </div>
      </div>
      <div style={{ fontFamily: bodyFont, fontSize: 10, whiteSpace: "nowrap", paddingTop: 2 }}>
        Página {pageNumber}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: bodyFont, fontSize: 9, fontWeight: 700, letterSpacing: ".1em",
      color: NAVY, textTransform: "uppercase", marginBottom: 4,
    }}>{children}</div>
  );
}

const inputBase: React.CSSProperties = {
  width: "100%",
  border: `1px solid ${BORDER}`,
  borderRadius: 2,
  background: "#fff",
  padding: "8px 10px",
  fontFamily: bodyFont,
  fontSize: 11,
  color: "#1a1a1a",
  outline: "none",
  boxSizing: "border-box",
  resize: "vertical",
};

function FieldInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputBase, height: 32 }}
      />
    </div>
  );
}

function FieldArea({ label, value, onChange, height = 130, description }: {
  label: string; value: string; onChange: (v: string) => void; height?: number; description?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {description && (
        <p style={{ fontFamily: bodyFont, fontSize: 10.5, color: "#4a4a4a", margin: "0 0 6px", lineHeight: 1.5 }}>
          {description}
        </p>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputBase, height, lineHeight: 1.5 }}
      />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: titleFont, fontSize: 16, fontWeight: 700, color: NAVY,
      margin: "24px 0 10px", paddingLeft: 10, borderLeft: `3px solid ${NAVY}`,
    }}>{children}</h2>
  );
}

function ContentSection({
  index, title, description, value, onChange, height = 130,
}: {
  index: number; title: string; description?: string;
  value: string; onChange: (v: string) => void; height?: number;
}) {
  return (
    <section style={{ marginTop: 18, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
      <h3 style={{ fontFamily: titleFont, fontSize: 13, fontWeight: 700, color: NAVY, margin: "0 0 6px" }}>
        {index}. {title}
      </h3>
      <FieldArea label="" value={value} onChange={onChange} height={height} description={description} />
    </section>
  );
}

function PageShell({ pageNumber, children }: { pageNumber: number; children: React.ReactNode }) {
  return (
    <div className="planejamento-page" style={{
      width: 794, minHeight: 1123, margin: "24px auto", background: "#fff",
      boxShadow: "0 4px 18px rgba(0,0,0,.08)", display: "flex", flexDirection: "column",
      pageBreakAfter: "always",
    }}>
      <PageHeader pageNumber={pageNumber} />
      <div style={{ padding: "28px 48px 48px", flex: 1, fontFamily: bodyFont, color: "#1a1a1a" }}>
        {children}
      </div>
    </div>
  );
}

export default function PlanejamentoPedagogico() {
  const user = useUser();
  const [schools] = usePersistentState<DashSchool[]>("dash_schools", []);
  const { turmas: classes } = useTurmas();
  const [doc, setDoc] = usePersistentState<PlanejamentoDoc>("planejamento_pedagogico_doc", EMPTY);

  const today = useMemo(() => new Date().toLocaleDateString("pt-BR"), []);
  const firstSchool = schools[0]?.name || "";
  const firstClass = classes[0];
  const turmaAuto = firstClass ? `${firstClass.name}${firstClass.grade ? ` · ${formatTurmaGrade(firstClass.grade)}` : ""}` : "";
  const escolaAuto = firstClass?.school || firstSchool;

  // Auto-preenchimento somente quando o campo está vazio (não sobrescreve edição do usuário).
  useEffect(() => {
    setDoc((prev) => {
      const next = { ...prev };
      if (!prev.professor && user.name) next.professor = user.name;
      if (!prev.escola && escolaAuto) next.escola = escolaAuto;
      if (!prev.turma && turmaAuto) next.turma = turmaAuto;
      if (!prev.data) next.data = today;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.name, escolaAuto, turmaAuto, today]);

  const update = <K extends keyof PlanejamentoDoc>(key: K) => (v: PlanejamentoDoc[K]) =>
    setDoc((prev) => ({ ...prev, [key]: v }));

  const fillFromContext = () => {
    setDoc((prev) => ({
      ...prev,
      professor: user.name || prev.professor,
      escola: escolaAuto || prev.escola,
      turma: turmaAuto || prev.turma,
      data: today,
    }));
  };
  const clearAll = () => {
    if (confirm("Limpar todos os campos do planejamento?")) setDoc(EMPTY);
  };

  return (
    <div style={{ background: "#eceae4", minHeight: "100vh", padding: "1px 0" }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: #fff !important; }
          .planejamento-toolbar { display: none !important; }
          .planejamento-page {
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
            min-height: 100vh !important;
          }
          textarea, input { border-color: #d6d6d6 !important; }
        }
        .planejamento-page input:focus,
        .planejamento-page textarea:focus {
          border-color: ${NAVY} !important;
          box-shadow: 0 0 0 2px rgba(26,39,68,.12);
        }
      `}</style>

      {/* Barra de ações (não imprime) */}
      <div className="planejamento-toolbar" style={{
        width: 794, margin: "16px auto 0", display: "flex", gap: 8, justifyContent: "flex-end",
      }}>
        <button
          onClick={fillFromContext}
          style={{
            background: NAVY, color: "#fff", border: "none", borderRadius: 4,
            padding: "8px 14px", fontFamily: bodyFont, fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          Preencher com meus dados
        </button>
        <button
          onClick={() => window.print()}
          style={{
            background: "#fff", color: NAVY, border: `1px solid ${NAVY}`, borderRadius: 4,
            padding: "8px 14px", fontFamily: bodyFont, fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          Imprimir / PDF
        </button>
        <button
          onClick={clearAll}
          style={{
            background: "#fff", color: "#7a2a2a", border: `1px solid #d6b0b0`, borderRadius: 4,
            padding: "8px 14px", fontFamily: bodyFont, fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          Limpar
        </button>
      </div>

      <PageShell pageNumber={1}>
        {/* Inner banner */}
        <div style={{
          background: SOFT, border: `1px solid ${BORDER}`, borderRadius: 4,
          padding: "22px 26px", textAlign: "center",
        }}>
          <div style={{ fontFamily: bodyFont, fontSize: 9, fontWeight: 700, letterSpacing: ".18em", color: NAVY }}>
            DOCUMENTO PEDAGÓGICO • AGILIZAPROF
          </div>
          <h1 style={{ fontFamily: titleFont, fontSize: 34, fontWeight: 700, color: "#111", margin: "8px 0 4px", letterSpacing: "-.01em" }}>
            Planejamento
          </h1>
          <div style={{ fontFamily: titleFont, fontStyle: "italic", fontSize: 12, color: "#5a5a5a", marginBottom: 12 }}>
            Plano de Trabalho Docente · Educação Infantil e Ensino Fundamental
          </div>
          <p style={{ fontFamily: bodyFont, fontSize: 11, color: "#3a3a3a", lineHeight: 1.6, margin: "0 auto", maxWidth: 600, textAlign: "justify" }}>
            Plano de trabalho docente elaborado em consonância com a Lei de Diretrizes e Bases da Educação Nacional (Lei nº 9.394/96, Art. 13, inciso II), a Base Nacional Comum Curricular (BNCC) e as Diretrizes Curriculares Nacionais da Educação Básica.
          </p>
        </div>

        {/* Identificação */}
        <SectionTitle>Identificação</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 12 }}>
          <FieldInput label="Escola" value={doc.escola} onChange={update("escola")} />
          <FieldInput label="Professor(a)" value={doc.professor} onChange={update("professor")} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <FieldInput label="Turma / Ano" value={doc.turma} onChange={update("turma")} />
          <FieldInput label="Data" value={doc.data} onChange={update("data")} />
        </div>

        {/* Dados do planejamento */}
        <SectionTitle>Dados do Planejamento</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <FieldInput label="Componente curricular / Campo de experiência" value={doc.componente} onChange={update("componente")} />
          <FieldInput label="Tema / Unidade temática" value={doc.tema} onChange={update("tema")} />
          <FieldInput label="Período do planejamento" value={doc.periodo} onChange={update("periodo")} />
          <FieldInput label="Carga horária prevista" value={doc.cargaHoraria} onChange={update("cargaHoraria")} />
        </div>

        <ContentSection
          index={1}
          title="Objetivos de Aprendizagem (BNCC)"
          description="Objetivos de aprendizagem e desenvolvimento, vinculados aos códigos da BNCC (ex.: EI03EF01, EF01LP05)."
          value={doc.objetivos} onChange={update("objetivos")}
        />
        <ContentSection index={2} title="Habilidades e Competências" value={doc.habilidades} onChange={update("habilidades")} />
        <ContentSection index={3} title="Conteúdos / Objetos de Conhecimento" value={doc.conteudos} onChange={update("conteudos")} />
      </PageShell>

      <PageShell pageNumber={2}>
        <ContentSection
          index={4}
          title="Metodologia e Estratégias Didáticas"
          description="Estratégias, dinâmicas, sequências didáticas e metodologias ativas que serão aplicadas."
          value={doc.metodologia} onChange={update("metodologia")}
        />
        <ContentSection index={5} title="Recursos Didáticos" value={doc.recursos} onChange={update("recursos")} />
        <ContentSection
          index={6}
          title="Avaliação"
          description="Instrumentos e critérios de avaliação contínua, cumulativa e qualitativa — Art. 24, V, 'a', da LDB."
          value={doc.avaliacao} onChange={update("avaliacao")}
        />
        <ContentSection
          index={7}
          title="Adaptações para Estudantes Público-Alvo da Educação Especial"
          description="Lei nº 13.146/2015 (LBI) e Decreto nº 7.611/2011 — adaptações curriculares e metodológicas."
          value={doc.adaptacoes} onChange={update("adaptacoes")}
        />
        <ContentSection index={8} title="Referências" value={doc.referencias} onChange={update("referencias")} height={110} />

        {/* Signatures */}
        <div style={{ marginTop: 56, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
          {["Professor(a)", "Coordenação Pedagógica"].map((role) => (
            <div key={role} style={{ textAlign: "center" }}>
              <div style={{ borderTop: `1px solid #555`, marginBottom: 6 }} />
              <div style={{ fontFamily: bodyFont, fontSize: 10.5, color: "#3a3a3a", letterSpacing: ".04em" }}>
                {role}
              </div>
            </div>
          ))}
        </div>
      </PageShell>
    </div>
  );
}
