## Substituir o modelo de exportação em Relatórios e Relatório IA (Inclusão)

Adotar o mesmo padrão visual e fluxo do Planejamento (Fraunces no título, Arial 12 no corpo, margens 2 cm, borda 1 px) para todos os relatórios/pareceres gerados em:

- `src/pages/Relatorios.tsx` (parecer descritivo da turma — geral e Educação Infantil)
- `src/pages/Inclusao.tsx` → aba **Relatório IA** (inclusão / aluno PCD)

O modelo atual (`wrapEditorialPrintHtml`, exportação Word inline ~2000 linhas, etc.) deixa de aparecer nessas duas páginas.

---

### 1. Reaproveitar e estender a infra de documentos existente

Já existe (do Planejamento):
- `src/lib/documentos/types.ts` · `builders.ts` · `leis.ts` · `print.ts` · `docx.ts`
- `src/components/documentos/DocumentoDialog.tsx` + `DocumentoPreview.tsx`
- Tabela `documentos_planejamento` no Supabase
- Componente `GerarDocumentoButton`

Vou criar uma camada irmã `documentos/relatorio*` que reaproveita CSS/print/leis e adiciona o tipo "relatório".

**Novos arquivos**

- `src/lib/documentos/relatorioTypes.ts` — tipos `RelatorioTipo` (`geral` | `ei` | `pcd` | `semestral`), `RelatorioModo` (`completo` | `simplificado`), `RelatorioDocumento` (cabeçalho + dados do aluno + seções `desenvolvimentoGlobal`, `camposOuComponentes[]`, `bncc[]`, `observacoes`, `avancos`, `proximosPassos`, `adaptacoes?`, `evolucaoPei?`, `apoioTeorico?`).
- `src/lib/documentos/relatorioBuilder.ts` — `buildRelatorio({ aluno, turma, periodo, modo, dadosCarregados, conteudoSofia })` retornando `RelatorioDocumento`. Decide o título por contexto:
  - EI → "PARECER DESCRITIVO"
  - Fund./Médio → "RELATÓRIO DE DESEMPENHO"
  - PCD → "RELATÓRIO DE INCLUSÃO"
  - Trilha semestral → "RELATÓRIO SEMESTRAL"
- `src/lib/documentos/relatorioLeis.ts` — `escolherLeisRelatorio({ tipo, nivel, cidsAluno, frequentaAee })` cobrindo LDB, BNCC EI/EF/EM, LBI, TEA (F84), TDAH/Dislexia (F90/F81), AEE (Decreto 7.611/2011).
- `src/components/documentos/RelatorioPreview.tsx` — versão WYSIWYG (todos os campos `contentEditable`), com modo completo e simplificado e bloco de assinaturas + "Ciente do(a) Responsável" quando PCD. Usa o mesmo CSS de impressão existente (já tem `documento`, `documento-wrap`, hr, h1 Fraunces, doc-rodape).
- `src/components/documentos/RelatorioDialog.tsx` — diálogo com 3 abas (Dados / Pré-visualização / Histórico):
  - **Dados**: Escola, Aluno (dropdown), Turma (auto), Professor, Período (`1º–4º Bimestre`, `1º–3º Trimestre`, `1º–2º Semestre`, Anual) com datas auto-preenchidas porém editáveis, Modo (Completo/Simplificado), checkbox "Gerar para toda a turma".
  - **Pré-visualização**: edição inline; botões `Imprimir`, `Exportar PDF` (via print → salvar PDF), `Exportar Word`, e quando múltiplos alunos: `Exportar ZIP`.
  - **Histórico**: lista por aluno + período; ao gerar novo do mesmo período pergunta "substituir ou nova versão".
- `src/lib/db/relatoriosDoc.ts` — `saveRelatorio` / `listRelatorios` / `deleteRelatorio` usando nova tabela `relatorios_documento` (ver §3).
- `src/lib/documentos/relatorioDocx.ts` — `exportarRelatorioDocx(doc)` reaproveitando padrões do `docx.ts` (Fraunces no título, Arial 12 corpo, borda na página).
- `src/lib/documentos/relatorioZip.ts` — empacota múltiplos PDFs/DOCXs em `.zip` via `jszip`.

**Server function**: `src/lib/documentos/relatorioGerar.functions.ts`
- `gerarRelatorioComSofia` (`createServerFn` + `requireSupabaseAuth`):
  - Inputs: `alunoClientId`, `turmaId`, `periodo`, `dataInicio`, `dataFim`, `modo`, `tipo`.
  - Carrega do Supabase: avaliação BNCC do período, observações do professor, PEI mais recente (`pei_pdi`), CIDs (`alunos_inclusao`), ano de referência pedagógico, últimos 2 relatórios para Princípio 13 (Progressividade).
  - Chama Lovable AI Gateway (`google/gemini-2.5-flash`) com prompt específico ao tipo (EI/Fund/PCD), pedindo retorno JSON com os campos do `RelatorioDocumento`.
  - Retorna `{ documento, leisSugeridas, apoioTeorico }`.

**Dependências novas**: `jszip` (já temos `docx`, `file-saver`, `html2canvas` e `jspdf`).

---

### 2. Substituir o que aparece nas páginas

**`src/pages/Inclusao.tsx`** — aba "Relatório IA":
- Remover a UI atual de exportação (Editor Word inline / `exportarParecer`) **no que toca ao documento final**.
- O botão "Gerar relatório IA" passa a abrir o `RelatorioDialog` com `tipo="pcd"` e o aluno pré-selecionado.
- A lógica antiga `gerar-parecer-inclusao` é substituída pela `gerarRelatorioComSofia`.

**`src/pages/Relatorios.tsx`**:
- Substituir as ações de exportação (`exportPdf`, `exportWord`, modal de impressão em lote, `wrapStandardPrintHtml`) por chamadas ao `RelatorioDialog`:
  - Card de cada aluno: botão "Gerar com a Sofia" → `RelatorioDialog` (tipo `ei` se EI, `geral` caso contrário).
  - Botão da topo "Imprimir vários" → abre `RelatorioDialog` com `lote=true` (gera 1 documento por aluno marcado, exporta em PDF único ou ZIP).
- Listagem/cards (KPIs, status, navegação) permanecem como estão — só muda o motor de geração/exportação.
- O componente antigo `RelatorioPedagogico.tsx` e as funções `exportPdf`/`exportWord` internas saem desses fluxos (manter o arquivo enquanto outra rota usar, mas remover imports e uso aqui).

---

### 3. Banco (Supabase)

Nova migration (será proposta separadamente para aprovação):

```sql
create table public.relatorios_documento (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  aluno_client_id text not null,
  aluno_nome text not null,
  turma_id uuid,
  tipo text not null,          -- geral|ei|pcd|semestral
  modo text not null,          -- completo|simplificado
  periodo text not null,       -- ex: "2º Bimestre"
  data_inicio date not null,
  data_fim date not null,
  escola text,
  professor text,
  conteudo jsonb not null,     -- RelatorioDocumento
  leis text[] not null default '{}',
  versao int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.relatorios_documento enable row level security;
-- policies próprios para auth.uid() = user_id (select/insert/update/delete)
create index on public.relatorios_documento(user_id, aluno_client_id, periodo);
```

Detecção de "já existe" usa `(user_id, aluno_client_id, periodo)` → modal "Substituir / Nova versão" incrementa `versao`.

---

### Pontos a confirmar antes de implementar

1. **Geração via Sofia (IA) continua obrigatória** para os 2 fluxos, ou em alguns casos o usuário escreve manualmente? (Assumo: Sofia gera rascunho e o usuário edita no preview.)
2. **Exportação em lote**: prefere `PDF único com page-break` por padrão, com a opção `.zip` de arquivos individuais como secundária? (Assumo sim.)
3. **`src/components/RelatorioPedagogico.tsx`**: posso deixá-lo só onde a rota `/relatorio-pedagogico` o usa, removendo apenas dos fluxos de Relatórios e Inclusão? (Assumo sim — não é mencionado pelo usuário.)

Se confirmar (ou só responder "ok"), implemento em sequência: tipos/builder/leis → server fn Sofia → preview/dialog → docx/zip → integração nas duas páginas → migration.
