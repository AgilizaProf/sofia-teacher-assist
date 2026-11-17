# Sair do Lovable: o que este código já suporta

Tudo aqui é **desligado por padrão**. Enquanto nada for configurado, o app
continua exatamente como hoje no Lovable.

## Como cada parte é ligada

| Parte | Como liga | Onde |
|---|---|---|
| Build para a Vercel | Automático quando o build roda na Vercel (`VERCEL=1`) ou com `DEPLOY_TARGET=vercel` | `vite.config.ts`, `vercel.json` |
| IA direto no Google (sem o gateway do Lovable) | `AI_PROVIDER=google` + `GOOGLE_API_KEY` | Vercel (chat da Sofia) e segredos das funções no Supabase |
| Login Google/Apple direto pelo Supabase | `VITE_OAUTH_DIRECT=true` no build + provedores ligados no painel do Supabase | Vercel |

## Variáveis na Vercel

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `AI_PROVIDER=google`, `GOOGLE_API_KEY`
- `VITE_OAUTH_DIRECT=true`
- `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`
- `AI_MONTHLY_LIMIT_BRL`, `CREDITS_PER_BRL`, `USD_BRL_RATE` (mesmos valores de hoje)
- Opcionais: `SOFIA_CHAT_MODEL`, `SOFIA_CHAT_MODEL_DOCS` (sem o prefixo `google/` não é preciso; o código remove)

## Segredos das funções no Supabase novo

`AI_PROVIDER=google`, `GOOGLE_API_KEY`, `AI_MONTHLY_LIMIT_BRL`, `CREDITS_PER_BRL`, `USD_BRL_RATE`.
`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` o Supabase já fornece.

## Login social no Supabase novo

- Authentication → URL Configuration: Site URL `https://agilizaprof.app.br`, e
  `https://agilizaprof.app.br/auth/callback` (mais o endereço de teste da Vercel) em Redirect URLs.
- Authentication → Providers → Google: Client ID e Secret criados no Google Cloud,
  com o callback `https://<projeto>.supabase.co/auth/v1/callback`.
- Apple: só se for mantido o login com Apple (exige conta Apple Developer).
