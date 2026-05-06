# Project Memory

## Core
Ao deletar arquivos/componentes, sempre buscar e remover imports órfãos no mesmo patch antes de salvar (evita cache stale do Vite).
Qualquer UI que dependa do relógio/timezone do cliente (saudações, "agora", minutos_ate) deve ser guardada por `useHydrated()` em `@/hooks/useHydrated` — render isomórfico no primeiro paint, valor real só pós-mount.

## Memories
- [Limpar imports órfãos ao deletar](mem://preferences/delete-cleanup) — Workflow obrigatório antes de qualquer deleção
- [Hydration guard para horário local](mem://preferences/hydration-time-guard) — Como evitar mismatch SSR/cliente em saudações da Sofia
- [Telemetria de hidratação](mem://features/hydration-telemetry) — Listener global que grava eventos de mismatch em sessionStorage e dispara `sofia:hydration-error`
