import { useCallback, type ReactNode } from "react";
import type {
  DiaPlanejamento, DocumentoPlanejamento, ObjetivoItem,
} from "@/lib/documentos/types";
import { formatarDataBR } from "@/lib/documentos/builders";
import { formatarFraseLegal } from "@/lib/documentos/leis";

type Props = {
  doc: DocumentoPlanejamento;
  editable?: boolean;
  onChange?: (next: DocumentoPlanejamento) => void;
};

function Editable({
  value, editable, onCommit, as: As = "span", className,
}: {
  value: string;
  editable: boolean;
  onCommit: (next: string) => void;
  as?: "span" | "p" | "div";
  className?: string;
}) {
  const handleBlur = useCallback((e: React.FocusEvent<HTMLElement>) => {
    const next = (e.currentTarget.innerText || "").trim();
    if (next !== value) onCommit(next);
  }, [onCommit, value]);
  if (!editable) return <As className={className}>{value || "—"}</As>;
  return (
    <As
      className={className}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
    >
      {value || "—"}
    </As>
  );
}

function ItensList({ itens }: { itens: ObjetivoItem[] }) {
  if (!itens.length) return <p style={{ margin: 0 }}>—</p>;
  return (
    <ul className="doc-bullets">
      {itens.map((it, i) => (
        <li key={i}>
          <span className="bullet">•</span>
          <span className="label">{it.texto}</span>
          {it.bncc ? (
            <>
              <span className="leader" aria-hidden="true" />
              <span className="codigo">{it.bncc}</span>
            </>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function Bullets({ items }: { items: string[] }) {
  if (!items.length) return <p style={{ margin: 0 }}>—</p>;
  return (
    <ul className="doc-bullets">
      {items.map((t, i) => (
        <li key={i}>
          <span className="bullet">•</span>
          <span className="label">{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function DocumentoPreview({ doc, editable = false, onChange }: Props): ReactNode {
  const updateDia = (idx: number, patch: Partial<DiaPlanejamento>) => {
    if (!onChange) return;
    const dias = doc.dias.map((d, i) => (i === idx ? { ...d, ...patch } : d));
    onChange({ ...doc, dias });
  };
  const updateMeta = (patch: Partial<DocumentoPlanejamento>) => {
    onChange?.({ ...doc, ...patch });
  };

  return (
    <div className="documento-wrap documento-print-root">
      <div className="documento">
        <h1>PLANEJAMENTO</h1>
        <div className="doc-periodo">
          {formatarDataBR(doc.dataInicio)} a {formatarDataBR(doc.dataFim)}
        </div>
        <hr />
        <div className="doc-meta">
          <div>
            <b>Nome da Escola: </b>
            <Editable value={doc.escola} editable={editable}
              onCommit={(v) => updateMeta({ escola: v })} />
          </div>
          <div>
            <b>Turma: </b>
            <Editable value={doc.turmaNome} editable={editable}
              onCommit={(v) => updateMeta({ turmaNome: v })} />
          </div>
          <div>
            <b>Nome do(a) Professor(a): </b>
            <Editable value={doc.professor} editable={editable}
              onCommit={(v) => updateMeta({ professor: v })} />
          </div>
        </div>

        {doc.dias.length === 0 ? (
          <p style={{ marginTop: 24 }}>
            Não há dias úteis no período selecionado.
          </p>
        ) : null}

        {doc.dias.map((d, idx) => (
          <section
            key={d.data}
            className={"doc-dia" + (d.novaSemana ? " semana-break" : "")}
          >
            <h2>{formatarDataBR(d.data)} — {d.diaSemana}</h2>

            {doc.modo === "completo" ? (
              <>
                <div className="doc-secao">
                  <b>Atividades:</b>
                  <Editable as="p" value={d.atividades} editable={editable}
                    onCommit={(v) => updateDia(idx, { atividades: v })} />
                </div>
                <div className="doc-secao">
                  <b>Objetivos:</b>
                  <ItensList itens={d.objetivos} />
                </div>
                <div className="doc-secao">
                  <b>Materiais e Recursos Utilizados:</b>
                  <Bullets items={d.materiais} />
                </div>
              </>
            ) : (
              <>
                <div className="doc-secao">
                  <b>Atividades:</b>
                  <ItensList itens={(d.atividadesItens && d.atividadesItens.length ? d.atividadesItens : d.objetivos)} />
                </div>
                {d.materiais.length > 0 ? (
                  <div className="doc-secao">
                    <b>Materiais e Recursos:</b>
                    <Bullets items={d.materiais} />
                  </div>
                ) : null}
              </>
            )}
          </section>
        ))}

        <div className="doc-assinaturas">
          <div><b>Assinatura do(a) Professor(a):</b></div>
          <div className="linha" />
          <div className="legenda">Nome completo / Data</div>

          <div style={{ marginTop: 24 }}><b>Assinatura da Coordenação Pedagógica:</b></div>
          <div className="linha" />
          <div className="legenda">Nome completo / Data</div>
        </div>

        <div className="doc-rodape">
          {formatarFraseLegal(doc.leis)}
        </div>
      </div>
    </div>
  );
}