## Resumo

Substituo totalmente o controle por custo em R$ (ai_usage + useAiBudgetWarnings + aiBudget.server) por um sistema de créditos visível ao usuário. Aplicação on-demand no primeiro acesso do mês/ano. Sem tocar na landing page (você atualiza).

## Regras

- **Pro anual** (`plano='pro'`, `ciclo='anual'`): 18.000 base anuais + bônus de 500 em jan/jun/nov → 19.500/ano. Renova na data de `started_at`.
- **Pro mensal** (`plano='pro'`, `ciclo='mensal'`) e **trial**: 1.500/mês, sem acúmulo, reinicia todo mês.
- **Free** (`plano='free'`): 300/mês, sem acúmulo.

> Premissa do trial: durante os 14 dias o usuário fica em `pro/mensal`. Se houver outra marcação de trial em produção, me diga e eu ajusto a função `getCreditsPolicy`.

## Migração de banco

Nova tabela `creditos_usuario` (1 linha por user) com `creditos_totais`, `creditos_utilizados`, `ano_referencia`, `mes_referencia`, `data_renovacao`, `ultimo_bonus_mes`, `plano_snapshot`. `creditos_disponiveis` exposto como coluna gerada.

Nova tabela `creditos_historico` com `tipo` ('uso'|'bonus'|'renovacao'|'compra'|'reset_mensal'), `quantidade` (assinado), `descricao`, `saldo_apos`, `created_at`. Índice por `(user_id, created_at desc)`.

RLS: usuário lê o próprio; escrita só via service role (server fns).

Função SQL `consumir_creditos(_user_id, _quantidade, _descricao)` — atômica, retorna saldo novo, falha se insuficiente. Realtime habilitado em `creditos_usuario`.

Remover tabela `ai_usage` e função `ai_month_usage_brl`.

## Server functions (em `src/lib/creditos.functions.ts`)

- `garantirCreditos()` — chamada no boot: calcula política do plano, aplica renovação anual (se passou aniversário), reset mensal (free/mensal), bônus do mês (jan/jun/nov) se ainda não aplicado. Idempotente.
- `consumirCreditos({ tipo, descricao, quantidade })` — wrapper sobre a RPC, registra histórico.
- `listarHistorico({ limit })`.

Acumulador interno do chat Sofia: contador em `app_snapshots` (key `sofia_msg_counter`) ou simples — a cada 100 msgs chama `consumirCreditos(100, "Chat Sofia (100 mensagens)")`.

Pontos de cobrança APÓS sucesso:
- Parecer descritivo → 100
- Relatório de inclusão → 100
- PEI completo → 200
- Plano de aula → 100
- Adaptação PCD → 100
- Anamnese → 100
- Exportação PDF/Word → 0

## UI

Componente `<CreditosPainel />` no `Dashboard.tsx` (e mobile, mesmo componente responsivo):
- Saldo em destaque, barra de progresso (verde/amarelo/vermelho conforme %).
- Total anual/mensal, utilizados, próximo bônus (data + valor) — só para anual.
- Mensagem contextual conforme faixa (>50/20-50/<20/<5%).
- Bloco "Últimas movimentações" (5 itens) com link "Ver completo".
- Free: card de upgrade.

Banner global no topo do dashboard:
- ≤20%: amarelo "Você está com X% dos créditos restantes."
- ≤5%: vermelho "Créditos quase esgotados" com botão "Adicionar créditos" → modal "+500 por R$ 9,90" (placeholder, sem checkout).

Subscription realtime em `creditos_usuario` filtrada por `user_id` — atualiza tela em qualquer device. Toast quando `ultimo_bonus_mes` mudar: "🎁 Seus 500 créditos bônus de [mês] foram adicionados!".

## Remoções

- `src/hooks/useAiBudgetWarnings.ts`
- `src/lib/aiBudget.server.ts`
- `supabase/functions/_shared/ai-budget.ts` (e referências dentro das edge functions — substituir por chamada à RPC `consumir_creditos`)
- Tabela `ai_usage` e RPC `ai_month_usage_brl`.

## Fora de escopo (você confirmou)

- Landing page — você atualiza.
- Checkout do pacote extra de R$ 9,90 — fica como placeholder no modal.

## Diagrama de fluxo

```text
boot do app
  └─ garantirCreditos()
       ├─ aniversário do plano passou? → renova totais, zera utilizados, registra 'renovacao'
       ├─ mês mudou e plano não-anual? → reset, registra 'reset_mensal'
       └─ mês ∈ {1,6,11} e anual e ultimo_bonus_mes ≠ mês atual? → +500, toast, 'bonus'

consumo
  RPC consumir_creditos (atômica)
    └─ trigger insere em creditos_historico
         └─ realtime push → painel atualiza em todos os devices
```

Aprovo e parto para implementação?