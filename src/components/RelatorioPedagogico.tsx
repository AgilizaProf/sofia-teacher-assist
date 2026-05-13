import React from "react";

const NAVY = "#1a2744";
const BORDER = "#d4d4d4";
const LIGHT_BG = "#f7f5f0";
const MUTED = "#6b6b6b";

const serif = "'Fraunces', 'Playfair Display', Georgia, serif";
const sans = "'Inter', Arial, sans-serif";

type FieldProps = { label: string; minHeight?: number };
const Field: React.FC<FieldProps> = ({ label, minHeight = 32 }) => (
  <div style={{ display: "flex", flexDirection: "column" }}>
    <div
      style={{
        fontFamily: sans,
        fontSize: 9,
        letterSpacing: 1,
        fontWeight: 600,
        color: NAVY,
        textTransform: "uppercase",
        marginBottom: 4,
      }}
    >
      {label}
    </div>
    <div
      style={{
        border: `1px solid ${BORDER}`,
        borderRadius: 2,
        background: "#fff",
        minHeight,
      }}
    />
  </div>
);

type SectionProps = {
  title: string;
  description?: string;
  minHeight?: number;
  accent?: boolean;
};
const ContentSection: React.FC<SectionProps> = ({
  title,
  description,
  minHeight = 140,
  accent,
}) => (
  <section style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
    <h3
      style={{
        fontFamily: serif,
        fontSize: 16,
        color: NAVY,
        margin: 0,
        fontWeight: 700,
        ...(accent ? { borderLeft: `3px solid ${NAVY}`, paddingLeft: 10 } : {}),
      }}
    >
      {title}
    </h3>
    {description ? (
      <p
        style={{
          fontFamily: sans,
          fontStyle: "italic",
          fontSize: 11,
          color: MUTED,
          marginTop: 6,
          marginBottom: 10,
        }}
      >
        {description}
      </p>
    ) : (
      <div style={{ height: 10 }} />
    )}
    <div
      style={{
        border: `1px solid ${BORDER}`,
        borderRadius: 2,
        background: "#fff",
        minHeight,
      }}
    />
  </section>
);

const Signature: React.FC<{ role: string }> = ({ role }) => (
  <div style={{ textAlign: "center", paddingTop: 30 }}>
    <div style={{ borderTop: `1px solid ${NAVY}`, marginBottom: 8 }} />
    <div style={{ fontFamily: sans, fontSize: 11, color: NAVY, fontWeight: 600 }}>
      {role}
    </div>
  </div>
);

export const RelatorioPedagogico: React.FC = () => {
  return (
    <div style={{ background: "#e9e9ec", minHeight: "100vh", padding: "24px 0" }}>
      <div
        style={{
          width: 794,
          margin: "0 auto",
          background: "#fff",
          boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
          fontFamily: sans,
          color: "#111",
        }}
      >
        {/* HEADER */}
        <header
          style={{
            background: NAVY,
            color: "#fff",
            padding: "20px 40px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: serif,
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              AgilizaProf Relatório Pedagógico
            </div>
            <div style={{ fontSize: 10, marginTop: 4, opacity: 0.85 }}>
              Documento gerado pela plataforma AgilizaProf
            </div>
            <div style={{ fontSize: 8.5, marginTop: 3, opacity: 0.7, lineHeight: 1.4 }}>
              Fundamentação legal: LDB – Lei nº 9.394/96 (Art. 24, V) | BNCC – Resolução CNE/CP nº 2/2017 | Resolução CNE/CEB nº 7/2010
            </div>
          </div>
          <div style={{ fontSize: 10, whiteSpace: "nowrap", opacity: 0.85 }}>Página 1</div>
        </header>

        {/* BODY */}
        <div style={{ padding: "32px 56px 56px" }}>
          {/* INNER BANNER */}
          <div
            style={{
              background: LIGHT_BG,
              border: `1px solid ${BORDER}`,
              padding: "24px 28px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: MUTED,
                fontWeight: 600,
              }}
            >
              DOCUMENTO PEDAGÓGICO • AGILIZAPROF
            </div>
            <h1
              style={{
                fontFamily: serif,
                fontSize: 36,
                color: NAVY,
                margin: "10px 0 6px",
                fontWeight: 700,
              }}
            >
              Relatório
            </h1>
            <div
              style={{
                width: 60,
                height: 2,
                background: "#c9b98a",
                margin: "10px auto",
              }}
            />
            <div
              style={{
                fontFamily: serif,
                fontStyle: "italic",
                fontSize: 13,
                color: MUTED,
                marginBottom: 12,
              }}
            >
              Parecer Descritivo · Avaliação Qualitativa do Processo de Ensino-Aprendizagem
            </div>
            <p
              style={{
                fontSize: 11,
                lineHeight: 1.6,
                textAlign: "justify",
                color: "#333",
                margin: 0,
              }}
            >
              Este documento constitui registro pedagógico do processo de ensino-aprendizagem do(a)
              estudante, elaborado em conformidade com a Lei de Diretrizes e Bases da Educação
              Nacional (LDB nº 9.394/96), a Base Nacional Comum Curricular (BNCC) e as Diretrizes
              Curriculares Nacionais. Tem por finalidade descrever, de forma qualitativa, o
              desenvolvimento integral do(a) educando(a) no período avaliativo.
            </p>
          </div>

          {/* IDENTIFICAÇÃO */}
          <section style={{ marginTop: 32 }}>
            <h2
              style={{
                fontFamily: serif,
                fontSize: 18,
                color: NAVY,
                margin: "0 0 16px",
                borderLeft: `3px solid ${NAVY}`,
                paddingLeft: 10,
                fontWeight: 700,
              }}
            >
              Identificação
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
              <Field label="Escola" />
              <Field label="Professor(a)" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Turma / Ano" />
              <Field label="Data" />
            </div>
          </section>

          {/* DADOS DO ESTUDANTE */}
          <section style={{ marginTop: 28 }}>
            <h2
              style={{
                fontFamily: serif,
                fontSize: 18,
                color: NAVY,
                margin: "0 0 16px",
                borderLeft: `3px solid ${NAVY}`,
                paddingLeft: 10,
                fontWeight: 700,
              }}
            >
              Dados do Estudante
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Nome Completo" />
              <Field label="Data de Nascimento" />
              <Field label="Idade" />
              <Field label="Etapa de Ensino" />
              <Field label="Período Avaliativo" />
            </div>
          </section>

          {/* CONTENT SECTIONS */}
          <ContentSection
            title="1. Desenvolvimento Cognitivo e Aprendizagem"
            description="Descreva os avanços, estratégias de pensamento, atenção, memória e construção de conhecimento."
          />
          <ContentSection
            title="2. Desenvolvimento Socioemocional"
            description="Relate aspectos da convivência, autorregulação, empatia e participação nas interações."
          />
          <ContentSection
            title="3. Desenvolvimento Motor e Psicomotor"
            description="Observações sobre coordenação ampla, fina, lateralidade e expressão corporal."
          />
          <ContentSection
            title="4. Linguagem Oral e Escrita"
            description="Aquisição da linguagem, leitura, escrita, vocabulário e comunicação."
          />
          <ContentSection
            title="5. Raciocínio Lógico-Matemático"
            description="Construção do pensamento lógico, numérico, resolução de problemas e noções espaciais."
          />
          <ContentSection
            title="6. Considerações Finais e Encaminhamentos"
            description="Síntese do percurso e orientações para a continuidade do processo educativo."
          />

          {/* SIGNATURES */}
          <section style={{ marginTop: 48 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, rowGap: 24 }}>
              <Signature role="Professor(a) Responsável" />
              <Signature role="Coordenação Pedagógica" />
              <Signature role="Responsável pelo(a) Estudante" />
              <Signature role="Direção Escolar" />
            </div>
          </section>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: #fff !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
};

export default RelatorioPedagogico;