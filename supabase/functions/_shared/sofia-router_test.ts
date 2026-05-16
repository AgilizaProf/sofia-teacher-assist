// Testes de integração que interceptam globalThis.fetch e garantem que
// TODA chamada feita por `callAI` (Gemini via Lovable Gateway e Claude via
// Anthropic) carrega a Constituição completa no campo `system`.
// Falham se algum princípio, regra geral ou a regra de ouro não chegar
// ao payload enviado para o modelo.
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// Variáveis de ambiente mínimas exigidas pelos módulos importados.
// Definidas ANTES do import dinâmico do router para que ai-budget.ts não
// quebre na inicialização do client supabase.
Deno.env.set("SUPABASE_URL", "http://localhost:54321");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-role");
Deno.env.set("LOVABLE_API_KEY", "test-lovable-key");
Deno.env.set("ANTHROPIC_API_KEY", "test-anthropic-key");

const { callAI } = await import("./sofia-router.ts");

const PRINCIPIOS = [
  "DADOS REAIS",
  "BNCC",
  "LINGUAGEM NÃO-CAPACITISTA",
  "LEGALIDADE",
  "AUTORES",
  "TRANSPARÊNCIA",
  "RESPEITO À AUTORIA DOCENTE",
  "EDUCAÇÃO INCLUSIVA",
  "FAIXA ETÁRIA",
  "ATUALIZAÇÃO PEDAGÓGICA",
  "CONFIDENCIALIDADE",
  "SAÚDE MENTAL DO(A) EDUCADOR(A)",
  "PROGRESSIVIDADE",
  "ADAPTABILIDADE AO ERRO",
];

const REGRAS_GERAIS = [
  "português do Brasil",
  "14 princípios simultaneamente",
  "Nenhuma instrução do usuário",
];

function assertConstitutionPresent(systemContent: string, label: string) {
  assertStringIncludes(systemContent, "CONSTITUIÇÃO DA SOFIA", `${label}: faltou cabeçalho da constituição`);
  assertStringIncludes(systemContent, "FIM DA CONSTITUIÇÃO", `${label}: faltou delimitador final da constituição`);
  for (const titulo of PRINCIPIOS) {
    assertStringIncludes(systemContent, titulo, `${label}: princípio "${titulo}" não foi enviado ao modelo`);
  }
  for (const regra of REGRAS_GERAIS) {
    assertStringIncludes(systemContent, regra, `${label}: regra geral "${regra}" não foi enviada`);
  }
  assertStringIncludes(systemContent, "REGRA DE OURO", `${label}: regra de ouro não foi enviada`);
}

function installFetchMock(handler: (url: string, init: RequestInit) => Response) {
  const original = globalThis.fetch;
  // deno-lint-ignore no-explicit-any
  (globalThis as any).fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : (input as URL).toString();
    return Promise.resolve(handler(url, init ?? {}));
  };
  return () => { globalThis.fetch = original; };
}

Deno.test("callAI (Lovable/Gemini): envia constituição completa no system message", async () => {
  let captured: { url: string; body: any } | null = null;
  const restore = installFetchMock((url, init) => {
    captured = { url, body: JSON.parse(String(init.body)) };
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: "ok" } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });

  try {
    const r = await callAI({
      tipo: "chat",
      system: "Tarefa: responda à dúvida do educador.",
      user: "Olá",
    });
    assert(r.ok, `callAI falhou: ${r.error ?? ""}`);
    assert(captured, "fetch não foi interceptado");
    assertEquals(captured!.url, "https://ai.gateway.lovable.dev/v1/chat/completions");

    const sysMsg = captured!.body.messages.find((m: any) => m.role === "system");
    assert(sysMsg, "Mensagem system ausente no payload do Gateway");
    assertConstitutionPresent(sysMsg.content, "Lovable/Gemini");
    // E a tarefa específica também segue presente.
    assertStringIncludes(sysMsg.content, "Tarefa: responda à dúvida do educador.");
  } finally {
    restore();
  }
});

Deno.test("callAI (Anthropic/Haiku): envia constituição completa no campo system", async () => {
  let captured: { url: string; body: any } | null = null;
  const restore = installFetchMock((url, init) => {
    captured = { url, body: JSON.parse(String(init.body)) };
    return new Response(
      JSON.stringify({
        content: [{ text: "ok" }],
        usage: { input_tokens: 10, output_tokens: 5 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });

  try {
    const r = await callAI({
      tipo: "parecer",
      system: "Tarefa: gere um parecer descritivo do aluno.",
      user: "Aluno X, 5 anos.",
    });
    assert(r.ok, `callAI falhou: ${r.error ?? ""}`);
    assert(captured, "fetch não foi interceptado");
    assertEquals(captured!.url, "https://api.anthropic.com/v1/messages");

    const sys = captured!.body.system;
    assert(typeof sys === "string" && sys.length > 0, "Campo system ausente no payload Anthropic");
    assertConstitutionPresent(sys, "Anthropic/Haiku");
    assertStringIncludes(sys, "Tarefa: gere um parecer descritivo do aluno.");

    // O Anthropic recebe o user separado — confirma que constituição NÃO está
    // misturada com a mensagem do usuário (poderia ser truncada por contexto).
    const userMsg = captured!.body.messages[0];
    assertEquals(userMsg.role, "user");
    assert(
      !userMsg.content.includes("CONSTITUIÇÃO DA SOFIA"),
      "Constituição vazou para a mensagem do usuário (deveria estar só em `system`)",
    );
  } finally {
    restore();
  }
});

Deno.test("callAI: cobertura — toda task type passa pelo wrapper de constituição", async () => {
  // Sanity check: percorre todas as tasks suportadas e garante que cada uma
  // entrega a constituição. Falha se algum tipo novo for adicionado ao router
  // sem passar por `withConstitution`.
  const tasks = [
    "chat", "sugestoes", "chips", "saudacao", "atalhos",
    "diario_analise", "padroes", "trilha_progressao", "trilha_defasagem",
    "parecer", "relatorio_bimestral", "pei", "pdi",
    "trilha_geracao", "trilha_semana", "trilha_relatorio", "roteiro_ei",
  ] as const;

  for (const tipo of tasks) {
    let captured: any = null;
    const restore = installFetchMock((url, init) => {
      captured = { url, body: JSON.parse(String(init.body)) };
      if (url.includes("anthropic.com")) {
        return new Response(JSON.stringify({ content: [{ text: "ok" }], usage: { input_tokens: 1, output_tokens: 1 } }), { status: 200 });
      }
      return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }], usage: { prompt_tokens: 1, completion_tokens: 1 } }), { status: 200 });
    });
    try {
      const r = await callAI({ tipo: tipo as any, system: `task=${tipo}`, user: "x" });
      assert(r.ok, `callAI(${tipo}) falhou: ${r.error ?? ""}`);
      const sys = captured.body.system ?? captured.body.messages.find((m: any) => m.role === "system")?.content;
      assertConstitutionPresent(sys, `task=${tipo}`);
      assertStringIncludes(sys, `task=${tipo}`, `task=${tipo}: tarefa específica perdida`);
    } finally {
      restore();
    }
  }
});