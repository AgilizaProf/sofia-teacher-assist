/**
 * Geração de relatório no MODELO EDITORIAL (o mesmo das atividades/parecer),
 * a partir de um RelatorioDocumento. Substitui, para PDF e Word, o layout
 * antigo (window.print do preview + lib `docx`), alinhando o relatório às
 * mesmas orientações visuais dos demais documentos do AgilizaProf.
 *
 * Mantemos o caminho antigo (relatorioPrint.ts / relatorioDocx.ts) intacto;
 * este módulo apenas oferece a versão editorial usada pelos botões.
 */
import {
  printEditorial,
  wrapEditorialPrintHtml,
  editorialCover,
  editorialSection,
  editorialField,
  editorialFieldsGrid,
  editorialLongField,
  editorialSignatures,
} from "@/lib/print/editorialPrint";
import {
  tituloRelatorio,
  nomeArquivo,
  type RelatorioDocumento,
} from "./relatorioTypes";

function fmtDataBR(iso?: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** Monta o corpo HTML editorial do relatório. */
function buildBody(doc: RelatorioDocumento): string {
  const labelCampos =
    doc.tipo === "ei" ? "Campos de Experiência" : "Componentes Curriculares";
  const periodoLinha = [
    doc.periodo,
    doc.dataInicio || doc.dataFim
      ? `${fmtDataBR(doc.dataInicio)} a ${fmtDataBR(doc.dataFim)}`
      : "",
  ]
    .filter(Boolean)
    .join(" — ");

  const parts: string[] = [];

  // Capa
  parts.push(
    editorialCover({
      title: tituloRelatorio(doc),
      subtitle: periodoLinha || undefined,
      overline: "RELATÓRIO PEDAGÓGICO • AGILIZAPROF",
    }),
  );

  // Identificação
  parts.push(editorialSection("Identificação"));
  parts.push(
    editorialFieldsGrid([
      { label: "Escola", value: doc.escola || "—" },
      { label: "Turma", value: doc.turmaNome || "—" },
    ]),
  );
  parts.push(
    editorialFieldsGrid([
      { label: "Professor(a)", value: doc.professor || "—" },
      { label: "Aluno(a)", value: doc.alunoNome || "—" },
    ]),
  );
  parts.push(
    editorialFieldsGrid([
      { label: "Data de nascimento", value: fmtDataBR(doc.dataNascimento) || "—" },
      { label: "Ano de referência", value: doc.anoReferencia || "—" },
    ]),
  );
  if (doc.tipo === "pcd") {
    parts.push(
      editorialFieldsGrid([
        {
          label: "Diagnóstico(s) / CID(s)",
          value: doc.diagnostico || (doc.cids ?? []).join(", ") || "—",
        },
        {
          label: "Ano de referência pedagógico",
          value: doc.anoReferenciaPedagogico || "—",
        },
      ]),
    );
  }

  if (doc.modo === "completo") {
    parts.push(editorialSection("Desenvolvimento global"));
    parts.push(editorialLongField(doc.desenvolvimentoGlobal || "—"));

    if (doc.campos?.length) {
      parts.push(editorialSection(labelCampos));
      parts.push(
        doc.campos
          .map((c) => editorialField(c.nome, c.descricao, { full: true }))
          .join(""),
      );
    }

    if (doc.bncc?.length) {
      parts.push(editorialSection("Habilidades BNCC trabalhadas"));
      parts.push(
        editorialLongField(
          doc.bncc
            .map((b) => `${b.codigo}${b.descricao ? ` — ${b.descricao}` : ""}`)
            .join("\n"),
        ),
      );
    }

    parts.push(editorialSection("Observações do(a) professor(a)"));
    parts.push(editorialLongField(doc.observacoes || "—"));
    parts.push(editorialSection("Avanços e conquistas"));
    parts.push(editorialLongField(doc.avancos || "—"));
    parts.push(editorialSection("Próximos passos"));
    parts.push(editorialLongField(doc.proximosPassos || "—"));

    if (doc.adaptacoes) {
      parts.push(editorialSection("Adaptações realizadas"));
      parts.push(editorialLongField(doc.adaptacoes));
    }
    if (doc.evolucaoPei) {
      parts.push(editorialSection("Evolução em relação ao PEI"));
      parts.push(editorialLongField(doc.evolucaoPei));
    }
    if (doc.apoioTeorico) {
      parts.push(editorialSection("Fundamentação teórica"));
      parts.push(editorialLongField(doc.apoioTeorico));
    }
  } else {
    // Modo simplificado
    if (doc.areas?.length) {
      parts.push(editorialSection("Áreas avaliadas"));
      parts.push(
        doc.areas.map((a) => editorialField(a.nome, a.status)).join(""),
      );
    }
    if (doc.observacoes) {
      parts.push(editorialSection("Observações"));
      parts.push(editorialLongField(doc.observacoes));
    }
  }

  // Base legal específica do relatório (quando houver leis selecionadas)
  if (doc.leis?.length) {
    parts.push(editorialSection("Fundamentação legal"));
    parts.push(editorialLongField(doc.leis.join("\n")));
  }

  // Assinaturas
  parts.push(
    editorialSignatures([
      doc.professor || "Professor(a)",
      "Coordenação / Responsável",
    ]),
  );

  return parts.join("\n");
}

/** Imprime o relatório no modelo editorial (abre janela e dispara impressão). */
export function imprimirRelatorioEditorial(doc: RelatorioDocumento): void {
  printEditorial(tituloRelatorio(doc), buildBody(doc), {
    docType: "relatorio",
    docLabel: tituloRelatorio(doc),
  });
}

/** Exporta o relatório como Word (.doc HTML) no mesmo layout editorial. */
export function exportarRelatorioEditorialWord(doc: RelatorioDocumento): void {
  const html = wrapEditorialPrintHtml(tituloRelatorio(doc), buildBody(doc), {
    docType: "relatorio",
    docLabel: tituloRelatorio(doc),
  });
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo(doc, "docx").replace(/\.docx$/i, ".doc");
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
