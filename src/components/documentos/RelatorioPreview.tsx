import { useCallback, type ReactNode } from "react";
import type { RelatorioDocumento, RelatorioCampo, RelatorioBnccItem, RelatorioAreaSimples } from "@/lib/documentos/relatorioTypes";
import { tituloRelatorio } from "@/lib/documentos/relatorioTypes";
import { formatarDataBR } from "@/lib/documentos/relatorioPeriodo";
import { formatarFraseLegalRelatorio } from "@/lib/documentos/relatorioLeis";

type Props = {
  doc: RelatorioDocumento;
  editable?: boolean;
  onChange?: (next: RelatorioDocumento) => void;
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

export function RelatorioPreview({ doc, editable = false, onChange }: Props): ReactNode {
  const update = (patch: Partial<RelatorioDocumento>) => onChange?.({ ...doc, ...patch });
  const updateCampo = (i: number, p: Partial<RelatorioCampo>) => {
    if (!onChange) return;
    const campos = doc.campos.map((c, idx) => (idx === i ? { ...c, ...p } : c));
    update({ campos });
  };

  const isPcd = doc.tipo === "pcd";
  const labelCampos = doc.tipo === "ei" ? "Campos de Experiência" : "Componentes Curriculares";

  return (
    <div className="documento-wrap documento-print-root">
      <div className="documento">
        <h1>{tituloRelatorio(doc)}</h1>
        <div className="doc-periodo">
          {doc.periodo} — {formatarDataBR(doc.dataInicio)} a {formatarDataBR(doc.dataFim)}
        </div>
        <hr />
        <div className="doc-meta">
          <div><b>Nome da Escola: </b>
            <Editable value={doc.escola} editable={editable} onCommit={(v) => update({ escola: v })} />
          </div>
          <div><b>Turma: </b>
            <Editable value={doc.turmaNome} editable={editable} onCommit={(v) => update({ turmaNome: v })} />
          </div>
          <div><b>Nome do(a) Professor(a): </b>
            <Editable value={doc.professor} editable={editable} onCommit={(v) => update({ professor: v })} />
          </div>
          <div><b>Nome do(a) Aluno(a): </b>
            <Editable value={doc.alunoNome} editable={editable} onCommit={(v) => update({ alunoNome: v })} />
          </div>
          {doc.dataNascimento ? (
            <div><b>Data de Nascimento: </b>
              <Editable value={doc.dataNascimento} editable={editable} onCommit={(v) => update({ dataNascimento: v })} />
            </div>
          ) : null}
          <div><b>Ano de Referência: </b>
            <Editable value={doc.anoReferencia || ""} editable={editable} onCommit={(v) => update({ anoReferencia: v })} />
          </div>
          {isPcd ? (
            <>
              <div><b>Diagnóstico(s) / CID(s): </b>
                <Editable
                  value={doc.diagnostico || (doc.cids || []).join(", ")}
                  editable={editable}
                  onCommit={(v) => update({ diagnostico: v })}
                />
              </div>
              <div><b>Ano de Referência Pedagógico: </b>
                <Editable
                  value={doc.anoReferenciaPedagogico || ""}
                  editable={editable}
                  onCommit={(v) => update({ anoReferenciaPedagogico: v })}
                />
              </div>
            </>
          ) : null}
        </div>

        {doc.modo === "completo" ? (
          <>
            <div className="doc-secao">
              <b>Desenvolvimento Global:</b>
              <Editable as="p" value={doc.desenvolvimentoGlobal} editable={editable}
                onCommit={(v) => update({ desenvolvimentoGlobal: v })} />
            </div>

            <div className="doc-secao">
              <b>{labelCampos}:</b>
              {doc.campos.map((c, i) => (
                <div key={i} style={{ marginTop: 6 }}>
                  <b style={{ display: "inline" }}>
                    <Editable value={c.nome} editable={editable}
                      onCommit={(v) => updateCampo(i, { nome: v })} />
                    :
                  </b>{" "}
                  <Editable as="span" value={c.descricao} editable={editable}
                    onCommit={(v) => updateCampo(i, { descricao: v })} />
                </div>
              ))}
            </div>

            <div className="doc-secao">
              <b>Habilidades BNCC Trabalhadas:</b>
              <BnccList itens={doc.bncc} />
            </div>

            <div className="doc-secao">
              <b>Observações do(a) Professor(a):</b>
              <Editable as="p" value={doc.observacoes} editable={editable}
                onCommit={(v) => update({ observacoes: v })} />
            </div>

            <div className="doc-secao">
              <b>Avanços e Conquistas:</b>
              <Editable as="p" value={doc.avancos} editable={editable}
                onCommit={(v) => update({ avancos: v })} />
            </div>

            <div className="doc-secao">
              <b>Próximos Passos:</b>
              <Editable as="p" value={doc.proximosPassos} editable={editable}
                onCommit={(v) => update({ proximosPassos: v })} />
            </div>

            {isPcd ? (
              <>
                <div className="doc-secao">
                  <b>Adaptações Realizadas:</b>
                  <Editable as="p" value={doc.adaptacoes || ""} editable={editable}
                    onCommit={(v) => update({ adaptacoes: v })} />
                </div>
                <div className="doc-secao">
                  <b>Evolução em Relação ao PEI:</b>
                  <Editable as="p" value={doc.evolucaoPei || ""} editable={editable}
                    onCommit={(v) => update({ evolucaoPei: v })} />
                </div>
              </>
            ) : null}

            {doc.apoioTeorico ? (
              <div className="doc-secao" style={{ marginTop: 16 }}>
                <b style={{ fontSize: 11 }}>Apoio Teórico:</b>
                <Editable as="p"
                  className="doc-apoio"
                  value={doc.apoioTeorico} editable={editable}
                  onCommit={(v) => update({ apoioTeorico: v })}
                />
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="doc-secao">
              <b>Avaliação por Área:</b>
              <AreasList itens={doc.areas ?? []} />
            </div>
            <div className="doc-secao">
              <b>Habilidades BNCC:</b>
              <BnccList itens={doc.bncc} simples />
            </div>
            <div className="doc-secao">
              <b>Observações:</b>
              <Editable as="p" value={doc.observacoes} editable={editable}
                onCommit={(v) => update({ observacoes: v })} />
            </div>
          </>
        )}

        <div className="doc-assinaturas">
          <div><b>Assinatura do(a) Professor(a):</b></div>
          <div className="linha" />
          <div className="legenda">Nome completo / Data</div>

          <div style={{ marginTop: 24 }}><b>Assinatura da Coordenação Pedagógica:</b></div>
          <div className="linha" />
          <div className="legenda">Nome completo / Data</div>

          {isPcd ? (
            <>
              <div style={{ marginTop: 24 }}><b>Ciente do(a) Responsável:</b></div>
              <div className="linha" />
              <div className="legenda">Nome completo / Data</div>
            </>
          ) : null}
        </div>

        <hr className="doc-rodape-sep" />
        <div className="doc-rodape">
          {formatarFraseLegalRelatorio(doc.leis)}
        </div>
      </div>
    </div>
  );
}

function BnccList({ itens, simples }: { itens: RelatorioBnccItem[]; simples?: boolean }) {
  if (!itens.length) return <p style={{ margin: 0 }}>—</p>;
  return (
    <ul className="doc-bullets">
      {itens.map((it, i) => (
        <li key={i}>
          <span className="bullet">•</span>
          <span className="label">
            <b>{it.codigo}</b>{!simples && it.descricao ? ` — ${it.descricao}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AreasList({ itens }: { itens: RelatorioAreaSimples[] }) {
  if (!itens.length) return <p style={{ margin: 0 }}>—</p>;
  return (
    <ul className="doc-bullets">
      {itens.map((a, i) => (
        <li key={i}>
          <span className="bullet">•</span>
          <span className="label">{a.nome}</span>
          <span className="leader" aria-hidden="true" />
          <span className="codigo">{a.status}</span>
        </li>
      ))}
    </ul>
  );
}