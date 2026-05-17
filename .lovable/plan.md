## Objetivo
Substituir totalmente qualquer exportação atual nas abas **M1 (Atividades)**, **M2 (Atividades PCD)**, **M3 (Planos)** e **M7 (Trilhas Semestrais)** da página Planejamento por um fluxo único — formulário → preview WYSIWYG editável → PDF/Word/Imprimir — seguindo exatamente o modelo descrito.

## Arquitetura

1. **Componente único reutilizável**: `src/components/planejamento/ExportPlanejamentoFlow.tsx`
   - Recebe `tab: "m1" | "m2" | "m3" | "m7"` + um *content adapter* que extrai do estado da aba os dias/atividades/objetivos/materiais/leis citadas pela Sofia.
   - Cada aba ganha um botão “📄 Exportar planejamento” que abre esse fluxo.

2. **Etapas do fluxo (Dialog/Drawer shadcn):**
   - **Passo 1 — Formulário:** Nome da Escola, Turma (dropdown das turmas cadastradas), Nome do(a) Professor(a), Data início, Data fim (Calendar/Popover shadcn com `pointer-events-auto`), Modo (Completo/Simplificado). Validação Zod (`escola` 1–120, `professor` 1–120, datas válidas, `fim >= inicio`).
   - **Passo 2 — Geração via Sofia:** chama `createServerFn` `gerarPlanejamentoDoc` que recebe `{ tab, turma, nivel, dataIni, dataFim, modo, contexto }` e usa Lovable AI (`google/gemini-2.5-flash`) com o prompt específico de cada aba (conforme seção 7). Retorna JSON `{ dias: [{ data, diaSemana, atividades, objetivos, materiais, bnccItens }], leisCitadas: string[] }`.
   - **Passo 3 — Preview WYSIWYG editável:** renderiza o documento em HTML fiel ao modelo (Fraunces no título, Arial 12, margens 2cm, borda 1px sólida, justificado). Cada campo é `contentEditable` e salvo localmente (estado React).
   - **Passo 4 — Ações:** três botões — `📄 Exportar PDF`, `📝 Exportar Word (.docx)`, `🖨️ Imprimir`.

3. **Modelo do documento** (HTML/CSS comum para preview e impressão):
   - `@page { size: A4; margin: 2cm }`, borda externa 1px sólida, fonte base Arial 12, justificado.
   - Cabeçalho: título “PLANEJAMENTO” em Fraunces 28 negrito centralizado, período centralizado, divisor, e linhas Escola/Turma/Professor com label em negrito.
   - Corpo por dia: separadores horizontais; modo Completo (Atividades / Objetivos / Materiais com label em negrito), modo Simplificado (bullets com código BNCC alinhado à direita via `display:flex; justify-content: space-between`).
   - Rodapé fixo: assinaturas do professor e da coordenação + linha cinza “Documento gerado com apoio do AgilizaProf em consonância com [leis identificadas]”.

4. **Leis no rodapé:** função `montarLeis({ tab, nivel, cidsTurma, leisSofia })` combina (LDB 9.394/1996 sempre; LBI/TEA/TDAH conforme CIDs em M2; Resolução CNE/CP 2/2017 para Infantil, 4/2018 para Fundamental/Médio) + leis citadas pela Sofia no conteúdo.

5. **Exportação:**
   - **PDF:** `html2canvas` + `jspdf` (já existe `jspdf` no projeto) para PDF fiel ao preview, com quebra de página entre semanas (cada bloco-dia recebe `break-inside: avoid`).
   - **Word:** `docx` (biblioteca docx-js) — instalar `docx` e `file-saver`. Gerar `.docx` com a mesma estrutura (título Fraunces fallback Times, Arial 12 corpo, margens 2cm, borda na seção).
   - **Imprimir:** abrir nova janela com mesmo HTML + `@page` + `window.print()`.

6. **Fonte Fraunces:** importar no `index.html` (link Google Fonts) e aplicar via classe `.doc-title` no preview e na janela de impressão.

7. **Persistência no Supabase:**
   - Nova tabela `planejamento_documentos` (`user_id`, `tab`, `turma`, `escola`, `professor`, `data_ini`, `data_fim`, `modo`, `conteudo_json`, `leis`, criada/atualizada com RLS por `user_id`).
   - Server fn `salvarPlanejamentoDoc` e `listarPlanejamentoDocs` com `requireSupabaseAuth`.
   - Cada exportação salva o documento. Cada aba ganha um botão “🗂️ Histórico” que abre lista filtrada por turma/período e permite reabrir no preview.

## Arquivos novos
- `src/components/planejamento/ExportPlanejamentoFlow.tsx`
- `src/components/planejamento/DocumentoPreview.tsx`
- `src/components/planejamento/exporters/exportPdf.ts`
- `src/components/planejamento/exporters/exportDocx.ts`
- `src/components/planejamento/exporters/printDocument.ts`
- `src/components/planejamento/leis.ts`
- `src/lib/planejamento/planejamentoDoc.functions.ts` (server fns: gerar, salvar, listar)

## Arquivos alterados
- `src/pages/Planejamento.tsx` — adicionar botão “Exportar planejamento” nas toolbars M1, M2, M3, M7; remover/substituir qualquer export antigo nessas abas (M5 fica como está, pois não foi pedido).
- `index.html` — `<link>` Fraunces.
- Migration Supabase para `planejamento_documentos`.

## Dependências
- `bun add docx file-saver html2canvas` (`jspdf` já existe).

## Pontos a confirmar
1. **M5 (Semana M5/Layout semanal) fica fora**, certo? Você listou apenas M1, M2, M3, M7.
2. Em **modo Simplificado**, o ponto-ponto-ponto entre atividade e código BNCC deve ser renderizado mesmo se a atividade não tiver código? (proposto: omitir o código quando não houver).
3. Para o **histórico**, posso assumir que pode ser reaberto e re-exportado, mas não re-gerado pela Sofia (mantém o conteúdo salvo)?