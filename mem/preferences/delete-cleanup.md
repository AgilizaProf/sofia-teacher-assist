---
name: Limpar imports órfãos ao deletar
description: Antes de deletar qualquer arquivo/componente, varrer o projeto e remover imports/referências órfãs
type: preference
---
Sempre que deletar um componente ou arquivo, antes de finalizar a edição:
1. Rodar `rg -n "<nome-do-arquivo-ou-export>" src/` para encontrar imports e referências.
2. Remover/atualizar todas as referências órfãs no mesmo patch.
3. Só então confirmar a deleção.

**Por quê:** imports órfãos causam erros de cache stale do Vite que travam o hot-reload e podem derrubar páginas inteiras (loaders/rotas dependentes).
