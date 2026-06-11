
## Objetivo
Instalar o Meta Pixel (Facebook/Instagram) com ID `966501615841208` e disparar eventos de tracking nas principais ações do app. Google Analytics fica para depois (não será incluído agora).

## 1. Injeção do Pixel
O projeto é TanStack Start (SSR) — não há `index.html`. O HTML é montado em `src/routes/__root.tsx` (função `RootShell`). Vou adicionar dentro do `<head>` desse shell:

- `<script>` com o snippet oficial do Meta Pixel já com `fbq('init', '966501615841208')` e `fbq('track', 'PageView')`.
- `<noscript><img>` de fallback.

Assim o pixel carrega em todas as rotas (públicas e autenticadas), e o splash screen continua intacto.

## 2. Utilitário de tracking
Criar `src/lib/tracking.ts` com:
- `declare const fbq: Function;`
- Função `trackEvent(eventName, props?)` com o `metaEventMap` exatamente como pedido (login, cadastro, planos, engajamento, onboarding), porém **sem o bloco do `gtag`** (GA fica para depois).
- Mantém o `fbq('trackCustom', eventName, defaultProps)` genérico ao final, e o `console.log` em dev.
- Helper opcional `trackPageView()` que chama `fbq('track','PageView')` para reuso no route tracker.

## 3. Route tracker (SPA page views)
Adicionar um pequeno componente `RouteTracker` dentro de `RootComponent` (em `__root.tsx`), usando o `useLocation` do `@tanstack/react-router` que já está importado. A cada mudança de `pathname`:
- `trackEvent('page_view', { location: pathname, page_path: pathname, page_search: search })`
- `fbq('track','PageView')`

Isso roda em paralelo ao `trackPageVisit` já existente (telemetria interna) — sem conflito.

## 4. Eventos nas telas
Disparos pontuais a serem inseridos:

**Auth (`src/pages/Auth.tsx`)**
- Ao montar tela de login: `page_view_login` (location `login_page`).
- Ao montar tela de cadastro: `page_view_cadastro` (location `register_page`).
- Clique em "Entrar": `click_logar`.
- Login bem-sucedido: `login_concluido`.
- Clique em "Criar conta / Cadastrar grátis": `click_cadastrar_gratis`.
- Submissão do form de cadastro: `click_cadastrar_gratis` (location `register_page`).
- Cadastro concluído: `cadastro_concluido`.
- Erro de form: `form_error` com `error` descritivo.

**Dashboard (`src/pages/Dashboard.tsx`)**
- Ao montar: `page_view_dashboard`.
- Botões/ações: `clicou_gerar_relatorio`, `clicou_criar_plano`, `adaptacao_inclusiva`, `clicou_sofia_chat`.
- Sucesso de geração (onde houver callback de conclusão): `relatorio_gerado`, `plano_gerado`.
- `abriu_explicacao_creditos` quando o modal/tour de créditos abre.
- `creditos_baixos` (disparo único por sessão) quando o saldo cai abaixo de 20% do limite — integrado no `CreditosPainel`/`useCreditos`.

**Planos (`src/pages/Configuracoes.tsx` → `PlanoCard`)**
- Ao exibir cards de plano: `click_ver_planos`.
- Botão plano anual: `click_fazer_plano` com `{ plan: 'anual', value: 247 }`.
- Botão plano mensal: `click_fazer_plano` com `{ plan: 'mensal', value: 34.90 }`.
- Páginas `/pagamento-confirmado-anual` e `/pagamento-confirmado-mensal`: disparar `plano_contratado` com `plan` e `value` correspondentes ao montar.

**Onboarding (`src/routes/onboarding.tsx`)**
- Ao montar: `onboarding_iniciado`.
- Ao receber mensagem `agp_onboarding_done` do iframe: `onboarding_concluido`.
- (Etapas intermediárias não são acessíveis — o conteúdo vive em `public/onboarding.html` em iframe; etapas seriam tracking interno do iframe, fora do escopo desta plano.)

**Extras**
- `exportacao_documento` nos handlers de exportação PDF/Word em `RelatorioPedagogico`/`DocumentoPreview`/print utils.
- `upload_curriculo_rede` no `CurriculoMunicipalCard`.
- `editou_perfil` no `ProfileEditor` ao salvar.
- `user_idle_30s`: hook leve no `__root` que dispara uma vez por janela de inatividade (>30s sem mousemove/keydown/click) e reseta no próximo evento.

## 5. Considerações
- Como `fbq` é global injetado via script no head, o `typeof fbq !== 'undefined'` no util protege contra SSR/ambientes sem pixel. Nenhum import quebra build.
- Nenhuma alteração em backend, schema, ou rotas existentes.
- Eventos só ativam no client (após hydration); SSR ignora silenciosamente.

## Resumo dos arquivos
- **Novo:** `src/lib/tracking.ts`.
- **Editado:** `src/routes/__root.tsx` (pixel no head + RouteTracker + idle hook).
- **Editado:** `src/pages/Auth.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Configuracoes.tsx`, `src/components/settings/PlanoCard.tsx`, `src/components/settings/ProfileEditor.tsx`, `src/components/settings/CurriculoMunicipalCard.tsx`, `src/components/dashboard/CreditosPainel.tsx`, `src/routes/onboarding.tsx`, `src/routes/pagamento-confirmado-anual.tsx`, `src/routes/pagamento-confirmado-mensal.tsx`, e os componentes de exportação relevantes.

Posso seguir e implementar?
