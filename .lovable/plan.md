
# Gerador de Documentos de Planejamento

Adicionar gerador + preview + exportação (Imprimir/PDF e Word) **dentro das páginas existentes**, montando o conteúdo a partir do que já está cadastrado (sem chamar IA). Salvar histórico no Supabase.

## 1. Arquitetura compartilhada (núcleo reaproveitável)

```
src/lib/documentos/
  types.ts            # DocumentoPlanejamento, DiaPlanejamento, etc.
  builders.ts         # monta DocumentoPlanejamento a partir de dados do app
  leis.ts             # decide quais leis citar (LDB/LBI/TEA/TDAH/BNCC EI ou EF)
  docx.ts             # exportarDocx(doc)
  print.ts            # imprimirDocumento() = window.print() escopado
src/components/documentos/
  DocumentoDialog.tsx # Dialog com formulário (escola/turma/professor/datas/modo) + preview + botões de export
  DocumentoPreview.tsx# WYSIWYG (mesmo HTML usado no print)
  DocumentoHistorico.tsx # Sheet listando docs salvos por turma/período
src/styles/documento.css # @page 2cm, borda, fontes
```

`DocumentoDialog` é genérico: recebe `tipo: 'atividades'|'pcd'|'trilhas'|'sofia'` + dados de origem (atividades do período, alunos PCD, trilha, sugestões da Sofia) e devolve um documento pronto.

## 2. Onde aparece (reaproveitando páginas existentes)

Adicionar botão **"📄 Gerar Documento"** que abre o `DocumentoDialog`:

- **`src/pages/Planejamento.tsx`** (aba M6/Atividades): tipo `atividades` — usa atividades já planejadas no período escolhido.
- **`src/pages/PlanejamentoEi.tsx` / Inclusão (`src/pages/Inclusao.tsx` ou `PeiPdi.tsx`)**: tipo `pcd` — pega alunos da turma + CIDs/PEI cadastrados.
- **`src/components/trilhas/TrilhasPanel.tsx`**: tipo `trilhas` — usa a trilha semestral já carregada.
- **`src/pages/Assistente.tsx`**: tipo `sofia` — usa as últimas sugestões/foco do dia da Sofia.

Cada chamador passa apenas os dados; o Dialog cuida de tudo o resto.

## 3. Formulário no Dialog

Campos (todos obrigatórios para habilitar "Gerar preview"):
- Nome da Escola — `Input` (default: perfil do professor, se existir)
- Turma — `Select` via `useTurmas()` (já selecionada se chamada veio de uma turma)
- Nome do(a) Professor(a) — `Input` (default: `profiles.display_name`)
- Data início / Data fim — shadcn DatePicker
- Modo — `RadioGroup` Completo | Simplificado

## 4. Builders (sem IA)

`builders.ts` expõe `buildDocumento(tipo, ctx)`:
- **atividades**: itera dias úteis do período, para cada dia agrupa atividades da turma vindas de `agenda`/planejamento (`useAgenda`/dados M6), preenche `atividades`, `objetivos` (texto + código BNCC já cadastrado na atividade), `materiais`.
- **pcd**: para cada dia/aluno PCD, gera bloco a partir do PEI (objetivos do PEI viram `objetivos`, adaptações viram `atividades`/`materiais`).
- **trilhas**: usa semanas da trilha já gerada, cada semana = um bloco com `data` da semana.
- **sofia**: usa cards de sugestão/foco do dia armazenados (`useSofiaSuggestions`, `useFocoDoDia`) como "atividades sugeridas".

Quando faltar dado para um dia, renderiza placeholder `—` em vez de chamar IA.

## 5. Decisão de leis (`leis.ts`)

`escolherLeis({ tipo, nivel, cidsAlunos })` retorna lista de strings prontas:
- Sempre: `Lei 9.394/1996 (LDB)`
- PCD: `+ Lei 13.146/2015 (LBI)`; se algum CID começa com F84 → `+ Lei 12.764/2012 (TEA)`; se F90/F81 → `+ Lei 14.254/2021`
- BNCC: EI → `Resolução CNE/CP 2/2017`; EF/EM → `Resolução CNE/CP 4/2018` (nível vem da turma via `lib/sofia/nivelEnsino.ts`)

Renderizado no rodapé: `"Documento gerado com apoio do AgilizaProf em consonância com <lista unida por ' e '>."`

## 6. Preview WYSIWYG e CSS (`documento.css`)

```css
@page { size: A4; margin: 2cm; }
.documento {
  border: 1px solid #000;
  padding: 2cm; /* aplicado só na tela; no print, @page cuida das margens */
  font: 12px/1.4 Arial, sans-serif;
  text-align: justify;
  color: #000; background: #fff;
}
.documento h1 {
  font-family: 'Fraunces', serif;
  font-weight: 700;
  font-size: 28px;
  text-align: center;
  margin: 0 0 8px;
}
.documento .periodo { text-align: center; margin-bottom: 16px; }
.documento .meta { text-align: left; }
.documento .meta b { font-weight: 700; }
.documento .dia { border-top: 1px solid #000; padding-top: 12px; margin-top: 12px; }
.documento .dia h2 { font-size: 12px; font-weight: 700; margin: 0 0 6px; text-align: left; }
.documento .simplificado li {
  display: flex; justify-content: space-between; gap: 8px;
  list-style: none;
}
.documento .simplificado li .leader { flex: 1; border-bottom: 1px dotted #000; margin: 0 6px; height: .8em; }
.documento footer { margin-top: 24px; font-size: 10px; color: #555; text-align: center; }
.documento .assinaturas { margin-top: 24px; font-size: 12px; color: #000; text-align: left; }
@media print {
  body * { visibility: hidden; }
  .documento, .documento * { visibility: visible; }
  .documento { position: absolute; inset: 0; border: 1px solid #000; padding: 0; }
  .semana-break { page-break-before: always; }
}
```

Importar fonte no `index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@700&display=swap" rel="stylesheet">
```

`DocumentoPreview` aceita `editable?: boolean`. Quando true, cada texto usa `contentEditable` e dispara `onChange(patch)` com debounce para auto-save.

## 7. Exportação

- **Imprimir / Salvar como PDF**: `imprimirDocumento()` aplica classe `printing` no body e chama `window.print()`. CSS `@media print` já cuida do layout.
- **Exportar Word (.docx)**: `bun add docx`. `docx.ts` constrói `Document` com:
  - Section properties: margem 2cm (`margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }` em twips), `borders: { pageBorders: { ... }, pageBorderTop/Left/Right/Bottom: { style: SINGLE, size: 6, color: "000000", space: 24 } }`.
  - Título em Fraunces (com fallback "Times New Roman") 28pt, bold, centralizado.
  - Corpo em Arial 12pt, justificado.
  - Dias separados por parágrafo com `border: { top: { style: SINGLE, size: 6, color: "000000" } }`.
  - Rodapé com assinaturas e frase legal.
  - Quebra de página por semana (`pageBreakBefore`).
  - Download via `Packer.toBlob` + `URL.createObjectURL`.

(Não vamos gerar PDF "real" via lib — `window.print()` já cobre PDF; isso ficou definido na resposta.)

## 8. Persistência (Supabase)

Migration:
```sql
create table public.documentos_planejamento (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  turma_id uuid,
  tipo text not null check (tipo in ('atividades','pcd','trilhas','sofia')),
  escola text,
  professor text,
  data_inicio date not null,
  data_fim date not null,
  modo text not null check (modo in ('completo','simplificado')),
  conteudo jsonb not null,   -- DocumentoPlanejamento serializado
  leis text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.documentos_planejamento enable row level security;
create policy "owner select" on public.documentos_planejamento for select using (auth.uid() = user_id);
create policy "owner insert" on public.documentos_planejamento for insert with check (auth.uid() = user_id);
create policy "owner update" on public.documentos_planejamento for update using (auth.uid() = user_id);
create policy "owner delete" on public.documentos_planejamento for delete using (auth.uid() = user_id);
create trigger documentos_planejamento_updated_at
  before update on public.documentos_planejamento
  for each row execute function public.update_updated_at_column();
create index on public.documentos_planejamento (user_id, turma_id, data_inicio);
```

Acesso via `src/lib/db/documentos.ts` (cliente Supabase direto, padrão das outras tabelas do projeto): `listDocumentos({ turmaId? })`, `saveDocumento(doc)`, `updateDocumento(id, patch)`, `deleteDocumento(id)`.

`DocumentoDialog` salva ao gerar preview pela primeira vez e a cada edição (debounce 800 ms).

`DocumentoHistorico` (Sheet acionado no header do Dialog) lista por turma + período, permite reabrir um documento salvo.

## 9. Etapas de implementação

1. Migration `documentos_planejamento` + RLS + trigger.
2. `bun add docx`. Adicionar Fraunces no `index.html`. Criar `documento.css` e importar em `src/styles.css`.
3. `lib/documentos/{types,leis,builders,docx,print}.ts` + `lib/db/documentos.ts`.
4. `components/documentos/{DocumentoPreview,DocumentoDialog,DocumentoHistorico}.tsx`.
5. Plugar botão "📄 Gerar Documento" em: Planejamento (M6), Inclusão/PEI, TrilhasPanel, Assistente — passando o `tipo` e os dados de origem.
6. Verificar print (layout, borda, fonte) e export DOCX (abrir no Word/Google Docs).

