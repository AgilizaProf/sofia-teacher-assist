import type { ReactNode } from "react";

/**
 * PEI — Plano Educacional Individualizado
 * PDF-style A4 document. Renders one or more pages, each repeating the dark
 * navy header with an updated page number.
 *
 * Pure presentational component: pass children as additional pages, or
 * leave default content (a single page with the standard PEI structure).
 */
export type PEIPageData = {
  /** Page number shown in the top right (defaults to 1). */
  pageNumber?: number;
  /** Total page count, used to print "Page N of M". Optional. */
  totalPages?: number;
};

const LEGAL_REFS =
  "Fundamentação legal: Lei nº 13.146/2015 (LBI – Art. 28) | Resolução CNE/CEB nº 4/2009 | Decreto nº 7.611/2011 | Lei nº 12.764/2012 | PNEEPEI/2008";

const SERIF = '"Source Serif 4", "Georgia", "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

function PageHeader({ pageNumber = 1, totalPages }: PEIPageData) {
  return (
    <header
      className="w-full px-10 py-6 text-white flex items-start justify-between gap-6"
      style={{ backgroundColor: "#1a2744", fontFamily: SANS }}
    >
      <div className="flex-1 min-w-0">
        <h1
          className="text-[15px] font-bold uppercase tracking-[0.08em] leading-tight"
          style={{ fontFamily: SERIF }}
        >
          AgilizaProf Plano Educacional Individualizado
        </h1>
        <p className="text-[11px] mt-1 text-white/80">
          Documento gerado pela plataforma AgilizaProf
        </p>
        <p className="text-[9px] mt-2 text-white/60 leading-relaxed max-w-3xl">
          {LEGAL_REFS}
        </p>
      </div>
      <div className="text-[11px] text-white/80 whitespace-nowrap pt-1">
        Página {pageNumber}
        {totalPages ? ` de ${totalPages}` : ""}
      </div>
    </header>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2
      className="text-[13px] font-bold uppercase tracking-wide pl-3 mb-3 mt-6"
      style={{
        fontFamily: SERIF,
        color: "#1a2744",
        borderLeft: "4px solid #1a2744",
      }}
    >
      {children}
    </h2>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span
      className="block text-[9px] font-semibold uppercase tracking-[0.08em] text-neutral-600 mb-1"
      style={{ fontFamily: SANS }}
    >
      {children}
    </span>
  );
}

function FieldBox({
  label,
  minHeight = 32,
}: {
  label: ReactNode;
  minHeight?: number;
}) {
  return (
    <div className="w-full">
      <FieldLabel>{label}</FieldLabel>
      <div
        className="w-full border border-neutral-300 rounded-sm bg-white"
        style={{ minHeight }}
      />
    </div>
  );
}

function TextArea({
  label,
  description,
  minHeight = 110,
}: {
  label: ReactNode;
  description?: ReactNode;
  minHeight?: number;
}) {
  return (
    <div className="mt-1">
      <div
        className="pt-3"
        style={{ borderTop: "1px solid #e5e7eb" }}
      >
        <h3
          className="text-[12px] font-bold text-[#1a2744]"
          style={{ fontFamily: SERIF }}
        >
          {label}
        </h3>
        {description ? (
          <p
            className="text-[10px] text-neutral-600 mt-1 leading-snug"
            style={{ fontFamily: SANS }}
          >
            {description}
          </p>
        ) : null}
        <div
          className="w-full border border-neutral-300 rounded-sm bg-white mt-2"
          style={{ minHeight }}
        />
      </div>
    </div>
  );
}

function SubTextArea({
  label,
  description,
  minHeight = 80,
}: {
  label: ReactNode;
  description?: ReactNode;
  minHeight?: number;
}) {
  return (
    <div className="mt-3">
      <h4
        className="text-[11px] font-semibold text-[#1a2744]"
        style={{ fontFamily: SERIF }}
      >
        {label}
      </h4>
      {description ? (
        <p
          className="text-[10px] text-neutral-600 mt-0.5 leading-snug"
          style={{ fontFamily: SANS }}
        >
          {description}
        </p>
      ) : null}
      <div
        className="w-full border border-neutral-300 rounded-sm bg-white mt-1.5"
        style={{ minHeight }}
      />
    </div>
  );
}

function SignatureBlock({ role }: { role: string }) {
  return (
    <div className="flex flex-col items-center pt-8">
      <div className="w-full border-t border-neutral-500" />
      <span
        className="text-[10px] mt-2 text-neutral-700 text-center"
        style={{ fontFamily: SANS }}
      >
        {role}
      </span>
    </div>
  );
}

function PageShell({
  pageNumber,
  totalPages,
  children,
}: {
  pageNumber: number;
  totalPages?: number;
  children: ReactNode;
}) {
  return (
    <article
      className="bg-white shadow-md mx-auto mb-8 print:shadow-none print:mb-0 print:break-after-page"
      style={{ width: 794, minHeight: 1123, fontFamily: SANS, color: "#111827" }}
    >
      <PageHeader pageNumber={pageNumber} totalPages={totalPages} />
      <div className="px-10 py-6">{children}</div>
    </article>
  );
}

export function PlanoEducacionalIndividualizado() {
  return (
    <div
      className="w-full bg-neutral-200 py-8 print:bg-white print:py-0"
      style={{ fontFamily: SANS }}
    >
      <PageShell pageNumber={1} totalPages={1}>
        {/* Inner banner */}
        <section
          className="border border-neutral-300 rounded-sm px-6 py-5 mb-2"
          style={{ backgroundColor: "#f7f5f0" }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-600"
            style={{ fontFamily: SANS }}
          >
            Documento Pedagógico • AgilizaProf
          </p>
          <h2
            className="text-[44px] font-bold leading-none mt-2 text-[#1a2744]"
            style={{ fontFamily: SERIF }}
          >
            PEI
          </h2>
          <p
            className="text-[13px] font-semibold mt-1 text-[#1a2744]"
            style={{ fontFamily: SERIF }}
          >
            Plano Educacional Individualizado · Educação Inclusiva
          </p>
          <p className="text-[10.5px] text-neutral-700 mt-3 leading-relaxed max-w-3xl">
            Documento elaborado em atendimento à Lei Brasileira de Inclusão
            (Lei nº 13.146/2015, Art. 28), à Política Nacional de Educação
            Especial na Perspectiva da Educação Inclusiva (2008) e à Resolução
            CNE/CEB nº 4/2009, que institui as Diretrizes Operacionais para o
            Atendimento Educacional Especializado (AEE).
          </p>
        </section>

        {/* Identificação */}
        <SectionTitle>Identificação</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <FieldBox label="Escola" />
          <FieldBox label="Professor(a)" />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <FieldBox label="Turma / Ano" />
          <FieldBox label="Data" />
        </div>

        {/* Dados do estudante */}
        <SectionTitle>Dados do Estudante</SectionTitle>
        <div className="space-y-3">
          <FieldBox label="Nome completo" />
          <div className="grid grid-cols-2 gap-4">
            <FieldBox label="Data de nascimento" />
            <FieldBox label="Idade" />
          </div>
          <FieldBox label="Etapa / Ano escolar" />
          <FieldBox
            label="Diagnóstico / Hipótese diagnóstica (CID, se houver)"
            minHeight={48}
          />
          <FieldBox
            label="Profissionais que acompanham (terapeutas, médicos, etc.)"
            minHeight={48}
          />
          <FieldBox label="Ano letivo" />
        </div>

        {/* Content sections */}
        <SectionTitle>Conteúdo do PEI</SectionTitle>

        <TextArea label="1. Histórico Escolar e Familiar" />

        <TextArea
          label="2. Avaliação Pedagógica Inicial — Potencialidades"
          description="Habilidades, interesses, talentos e pontos fortes observados."
        />

        <TextArea
          label="3. Avaliação Pedagógica Inicial — Necessidades"
          description="Barreiras à aprendizagem e à participação — Art. 3º, IV, da LBI."
        />

        <div className="mt-1 pt-3" style={{ borderTop: "1px solid #e5e7eb" }}>
          <h3
            className="text-[12px] font-bold text-[#1a2744]"
            style={{ fontFamily: SERIF }}
          >
            4. Objetivos Educacionais Individualizados
          </h3>
          <SubTextArea label="a) Curto prazo" />
          <SubTextArea label="b) Médio prazo" />
          <SubTextArea label="c) Longo prazo" />
        </div>

        <div className="mt-4 pt-3" style={{ borderTop: "1px solid #e5e7eb" }}>
          <h3
            className="text-[12px] font-bold text-[#1a2744]"
            style={{ fontFamily: SERIF }}
          >
            5. Adaptações Curriculares
          </h3>
          <SubTextArea
            label="a) Adaptações de pequeno porte"
            description="Metodologia, recursos, tempo."
          />
          <SubTextArea
            label="b) Adaptações de grande porte"
            description="Objetivos, conteúdos, avaliação."
          />
        </div>

        <TextArea
          label="6. Estratégias Pedagógicas e Recursos de Acessibilidade"
          description="Tecnologia Assistiva, comunicação alternativa, materiais adaptados e demais apoios — Decreto nº 7.611/2011."
        />

        <div className="mt-4 pt-3" style={{ borderTop: "1px solid #e5e7eb" }}>
          <h3
            className="text-[12px] font-bold text-[#1a2744]"
            style={{ fontFamily: SERIF }}
          >
            7. Atendimento Educacional Especializado (AEE)
          </h3>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <FieldBox label="Frequência semanal no AEE" />
            <FieldBox label="Profissional responsável pelo AEE" />
          </div>
          <div className="mt-3">
            <FieldLabel>Ações desenvolvidas no AEE</FieldLabel>
            <div
              className="w-full border border-neutral-300 rounded-sm bg-white"
              style={{ minHeight: 110 }}
            />
          </div>
        </div>

        <TextArea
          label="8. Profissional de Apoio Escolar"
          description="Art. 28, XVII, da Lei nº 13.146/2015."
        />

        <TextArea
          label="9. Avaliação do(a) Estudante"
          description="Critérios e instrumentos avaliativos individualizados."
        />

        <TextArea label="10. Articulação com a Família" />

        <div className="mt-4 pt-3" style={{ borderTop: "1px solid #e5e7eb" }}>
          <h3
            className="text-[12px] font-bold text-[#1a2744]"
            style={{ fontFamily: SERIF }}
          >
            11. Revisão e Monitoramento
          </h3>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <FieldBox label="Periodicidade da revisão do PEI" />
            <FieldBox label="Data da próxima reavaliação" />
          </div>
        </div>

        {/* Signatures */}
        <SectionTitle>Assinaturas</SectionTitle>
        <div className="grid grid-cols-2 gap-x-10 gap-y-4 mt-2">
          <SignatureBlock role="Professor(a) Regente" />
          <SignatureBlock role="Professor(a) do AEE" />
          <SignatureBlock role="Coordenação Pedagógica" />
          <SignatureBlock role="Família / Responsável" />
          <SignatureBlock role="Equipe Multidisciplinar" />
          <SignatureBlock role="Direção Escolar" />
        </div>
      </PageShell>
    </div>
  );
}

export default PlanoEducacionalIndividualizado;