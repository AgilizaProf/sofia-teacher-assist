## Dashboard Administrativa — AgilizaProf

Painel de administração completo, protegido por role `admin`, mantendo a identidade visual do app (azul-noite #1B2A4E + laranja #FF7A45, fontes Fraunces/Inter).

### 1. Backend (migração única)

Novas tabelas + RLS:

- **`app_role` (enum)**: `admin`, `user`.
- **`user_roles`** (`user_id`, `role`) + função `has_role(uuid, app_role)` SECURITY DEFINER (padrão anti-recursão).
- **`subscriptions`** — `user_id`, `plano` (`free|pro`), `ciclo` (`mensal|anual|cortesia`), `status` (`active|canceled|expired`), `started_at`, `current_period_end`, `source` (`stripe|admin_grant|signup`), `granted_by`. Trigger preenche assinatura `free` ao criar profile.
- **`pro_grants`** — log de concessões manuais por admin (e-mail, plano, ciclo, expira_em, motivo).
- **`maintenance_windows`** — `starts_at`, `ends_at`, `title`, `message`, `block_access` (bool), `created_by`.
- **`platform_errors`** — `user_id?`, `route`, `message`, `stack`, `severity` (`info|warn|error|fatal`), `metadata jsonb`, `resolved_at`.
- **`activity_events`** — `user_id`, `event_type` (ex: `doc_generated`, `pei_created`, `parecer_gerado`, `login`, `page_view`), `route`, `metadata`.
- **`page_visits`** — `session_id`, `user_id?`, `route`, `referrer`, `device_type` (`mobile|tablet|desktop`), `os`, `browser`, `viewport_w`, `viewport_h`, `is_login_page` (bool), `created_at`. Inserções via cliente público (RLS permite INSERT anônimo, SELECT só admin).

Todas as tabelas: RLS habilitado. Usuário comum vê apenas o que é seu (quando aplicável); admin (`has_role(auth.uid(),'admin')`) vê e gerencia tudo.

Função RPC `admin_grant_pro(_email, _ciclo, _dias)` SECURITY DEFINER que: valida admin, encontra `user_id` por e-mail em `profiles`, cria/atualiza `subscriptions` e registra em `pro_grants`. Se o e-mail não existir, salva grant pendente que é aplicado no próximo signup (via trigger em `handle_new_user`).

### 2. Tracking client-side (leve)

- `src/lib/admin/track.ts`: `trackPageVisit()` (UA parser inline → device/os/browser), `trackEvent(type, meta)`, `reportError(err, ctx)`.
- Hook em `__root.tsx` registra `page_visit` em cada navegação e captura `window.onerror` / `unhandledrejection` → `platform_errors`.
- Pontos-chave já existentes (gerar parecer, gerar PEI, gerar atividade) recebem `trackEvent('doc_generated', {tipo})`.
- Banner de manutenção: hook lê `maintenance_windows` ativa; se `block_access=true`, mostra tela cheia bloqueando rotas (exceto `/admin` e `/auth`).

### 3. Rotas admin (`/_admin/*`, guarda role)

`src/routes/_admin.tsx` — `beforeLoad` valida sessão + `has_role admin`, senão redireciona `/`.

```text
/admin                 -> Visão geral
/admin/usuarios        -> Lista de usuários (busca, filtros)
/admin/usuarios/$id    -> Detalhe (atividade, plano, último acesso)
/admin/pro             -> Gestão Pro (conceder acesso por e-mail, histórico)
/admin/manutencao      -> Janelas de manutenção (CRUD + agendar)
/admin/atividades      -> Stream + médias
/admin/conversao       -> Funil login → cadastro, dispositivos, top routes
/admin/erros           -> Lista de erros, filtro severidade, marcar resolvido
/admin/infra           -> Monitor (latência média de queries, contagem por tabela, status Lovable Cloud)
```

### 4. Visão geral (cards + gráficos)

- Total usuários, ativos 7d/30d (distinct user em `activity_events`).
- Média de docs gerados por usuário (mês corrente).
- Assinantes Pro mensal vs anual vs free (donut).
- **Modalidade mais usada**: ranking de `event_type` no mês (barras horizontais).
- MRR estimado (mensal × 47 + anual × 247/12, valores configuráveis).
- Próxima manutenção agendada (se houver).

### 5. Tela Usuários

Tabela com: avatar, nome (`profiles.display_name`), e-mail, telefone, último acesso (max `activity_events.created_at`), plano (badge), eventos no mês.
Filtros: plano, ativo/inativo, busca por nome/email.
Linha → drawer com timeline de atividades, devices usados, créditos consumidos.

### 6. Gestão Pro

Form: e-mail + ciclo (mensal/anual/cortesia) + duração (dias). Botão "Conceder acesso" chama `admin_grant_pro`.
Lista histórico (`pro_grants`) com revogar.

### 7. Manutenção

Form: título, mensagem, início, fim, "bloquear acesso durante a janela" (toggle).
Lista das janelas (passadas/atuais/futuras). Atual exibe banner global no app inteiro para todos os usuários.

### 8. Atividades

Stream em tempo real (Supabase Realtime em `activity_events`). Agregados: docs/usuário/dia, top eventos, top usuários ativos.

### 9. Conversão

- Visitantes únicos em `/auth` (login page) por dia.
- Visitantes únicos no app.
- Cadastros (novos `profiles`).
- Taxa = cadastros ÷ visitantes /auth.
- Breakdown por device_type, OS, browser (donuts).

### 10. Erros / Infra

- Lista paginada de `platform_errors` por severidade.
- Botão "Resolvido" marca `resolved_at`.
- Infra: status do Lovable Cloud (`cloud_status` exibido), contagem de linhas por tabela, últimas migrações (server fn lê `pg_stat_user_tables`).

### Detalhes técnicos

- Tudo via `createServerFn` + `requireSupabaseAuth` para queries admin (checa role no handler).
- Charts com `recharts` (já presente via shadcn `chart.tsx`).
- Realtime ligado em `activity_events`, `platform_errors`, `subscriptions`.
- Estilo: cards `rounded-2xl border bg-card`, headers com Fraunces, dados Inter, accents laranja `#FF7A45`. Sidebar admin paralela à do app, com ícone "Voltar para o app".
- Navegação: novo item "Admin" só aparece na sidebar principal se `has_role admin`.

### O que NÃO entra agora (avisar ao usuário)

- Integração Stripe real (subscriptions são mantidas manualmente / via grants); plano automático por pagamento fica para depois.
- Geo/IP por país requer serviço externo — fica fora do MVP.
