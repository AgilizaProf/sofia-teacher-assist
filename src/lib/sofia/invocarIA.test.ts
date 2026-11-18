import { describe, it, expect } from "vitest";
import {
  invocarIA,
  erroDeInvoke,
  mensagemAmigavel,
  ErroIA,
  temConteudo,
  MSG_INCOMPLETA,
  MSG_VAZIA,
  MSG_SEM_CONEXAO,
  MSG_SEM_CREDITOS,
  MSG_MUITOS_PEDIDOS,
  MSG_CREDITOS_INDISPONIVEIS,
  MSG_PADRAO,
  type ClienteFunctions,
} from "./invocarIA";

function cliente(res: { data?: unknown; error?: unknown } | (() => never)): ClienteFunctions {
  return {
    functions: {
      invoke: async () => {
        if (typeof res === "function") return res();
        return { data: res.data ?? null, error: res.error ?? null };
      },
    },
  };
}

// Simula o FunctionsHttpError do supabase-js: mensagem genérica em inglês e
// o Response verdadeiro em `context`.
function httpError(status: number, corpo: unknown) {
  const e = new Error("Edge Function returned a non-2xx status code") as Error & {
    context: Response;
  };
  e.name = "FunctionsHttpError";
  e.context = new Response(typeof corpo === "string" ? corpo : JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
  return e;
}

async function falha(p: Promise<unknown>): Promise<ErroIA> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(ErroIA);
    return e as ErroIA;
  }
  throw new Error("esperava erro");
}

describe("invocarIA", () => {
  it("devolve os dados quando a resposta é válida", async () => {
    const d = await invocarIA<{ parecer: { texto: string } }>("gerar-parecer-inclusao", {
      client: cliente({ data: { parecer: { texto: "Ana avançou." } } }),
      validar: (x) => !!x.parecer?.texto,
    });
    expect(d.parecer.texto).toBe("Ana avançou.");
  });

  it("HTTP 200 com ok:false vira erro com a mensagem do servidor", async () => {
    const e = await falha(
      invocarIA("gerar-pei", {
        client: cliente({
          data: {
            ok: false,
            error: "Estou com muitas conversas agora. Tente em instantes.",
            upstreamStatus: 429,
          },
        }),
      }),
    );
    expect(e.message).toBe("Estou com muitas conversas agora. Tente em instantes.");
    expect(e.tipo).toBe("muitos_pedidos");
  });

  it("HTTP 200 com { error } técnico não mostra texto técnico", async () => {
    const e = await falha(
      invocarIA("gerar-pei", {
        client: cliente({ data: { error: "TypeError: Cannot read properties of undefined" } }),
      }),
    );
    expect(e.message).toBe(MSG_PADRAO);
  });

  it("lê o corpo do Response em FunctionsHttpError (402)", async () => {
    const e = await falha(
      invocarIA("gerar-atividade", {
        client: cliente({
          error: httpError(402, {
            error: "Créditos da IA esgotados. Adicione créditos em Settings → Workspace → Usage.",
          }),
        }),
      }),
    );
    expect(e.message).toBe(MSG_SEM_CREDITOS);
    expect(e.message).not.toMatch(/non-2xx|Settings/);
    expect(e.tipo).toBe("sem_creditos");
  });

  it("lê a mensagem amigável do corpo em 422", async () => {
    const e = await falha(
      invocarIA("processar-calendario", {
        client: cliente({
          error: httpError(422, {
            error: "Nenhum evento encontrado. Verifique se o PDF é um calendário escolar.",
          }),
        }),
      }),
    );
    expect(e.message).toBe("Nenhum evento encontrado. Verifique se o PDF é um calendário escolar.");
  });

  it("429 sem corpo legível usa a mensagem de muitos pedidos", async () => {
    const e = await falha(
      invocarIA("gerar-trilha", { client: cliente({ error: httpError(429, "") }) }),
    );
    expect(e.message).toBe(MSG_MUITOS_PEDIDOS);
  });

  it("prefere `message` quando `error` é um código", async () => {
    const e = await falha(
      invocarIA("gerar-parecer-inclusao", {
        client: cliente({
          error: httpError(400, {
            ok: false,
            error: "formato_obrigatorio",
            message: "Selecione o formato do relatório antes de gerar.",
          }),
        }),
      }),
    );
    expect(e.message).toBe("Selecione o formato do relatório antes de gerar.");
  });

  it("falha ao conferir créditos tem mensagem própria (não é 'sem créditos')", async () => {
    const e = await falha(
      invocarIA("gerar-pei", {
        client: cliente({
          data: { ok: false, creditCheckFailed: true, error: "x", upstreamStatus: 503 },
        }),
      }),
    );
    expect(e.message).toBe(MSG_CREDITOS_INDISPONIVEIS);
    expect(e.tipo).toBe("creditos_indisponiveis");
  });

  it("bloqueio por créditos usa mensagem do servidor quando é amigável", async () => {
    const e = await falha(
      invocarIA("gerar-pei", {
        client: cliente({
          data: {
            ok: false,
            blocked: true,
            error: "Créditos insuficientes para esta ação (precisa de 20, você tem 3).",
          },
        }),
      }),
    );
    expect(e.tipo).toBe("sem_creditos");
    expect(e.message).toMatch(/precisa de 20/);
  });

  it("erro de rede vira mensagem de conexão", async () => {
    const err = new Error("Failed to fetch");
    err.name = "FunctionsFetchError";
    const e = await falha(invocarIA("gerar-pei", { client: cliente({ error: err }) }));
    expect(e.message).toBe(MSG_SEM_CONEXAO);
  });

  it("exceção lançada pelo invoke também é tratada", async () => {
    const e = await falha(
      invocarIA("gerar-pei", {
        client: cliente(() => {
          throw new TypeError("fetch failed");
        }),
      }),
    );
    expect(e.message).toBe(MSG_SEM_CONEXAO);
  });

  it("resposta vazia (null, {}, '') é erro", async () => {
    for (const data of [null, {}, ""]) {
      const e = await falha(invocarIA("gerar-pei", { client: cliente({ data }) }));
      expect(e.message).toBe(MSG_VAZIA);
    }
  });

  it("resposta truncada avisa em vez de devolver", async () => {
    const e1 = await falha(
      invocarIA("gerar-pei", { client: cliente({ data: { pei: { a: 1 }, truncated: true } }) }),
    );
    expect(e1.message).toBe(MSG_INCOMPLETA);
    const e2 = await falha(
      invocarIA("gerar-trilha", {
        client: cliente({ data: { trilha: { _truncated: true, _raw: "{" } } }),
      }),
    );
    expect(e2.tipo).toBe("incompleta");
  });

  it("aceitarIncompleta deixa passar", async () => {
    const d = await invocarIA<{ truncated: boolean }>("x", {
      client: cliente({ data: { a: 1, truncated: true } }),
      aceitarIncompleta: true,
    });
    expect(d.truncated).toBe(true);
  });

  it("validar=false bloqueia conteúdo vazio (ex.: PEI {})", async () => {
    const e = await falha(
      invocarIA<{ pei: Record<string, unknown> }>("gerar-pei", {
        client: cliente({ data: { pei: {}, model: "m" } }),
        validar: (d) => temConteudo(d.pei),
      }),
    );
    expect(e.message).toBe(MSG_VAZIA);
  });

  it("validar pode devolver mensagem própria", async () => {
    const e = await falha(
      invocarIA<{ trilha: { semanas?: unknown[] } }>("gerar-trilha", {
        client: cliente({ data: { trilha: { semanas: [] } } }),
        validar: (d) =>
          d.trilha.semanas?.length ? true : "A trilha veio sem semanas. Gere de novo.",
      }),
    );
    expect(e.message).toBe("A trilha veio sem semanas. Gere de novo.");
  });
});

describe("erroDeInvoke / mensagemAmigavel", () => {
  it("contexto antigo (objeto com error) ainda funciona", async () => {
    const e = await erroDeInvoke({
      message: "Edge Function returned a non-2xx status code",
      context: { error: "Documento não reconhecido como calendário escolar." },
    });
    expect(e.message).toBe("Documento não reconhecido como calendário escolar.");
  });

  it("mensagemAmigavel esconde texto técnico", () => {
    expect(mensagemAmigavel(new Error("Edge Function returned a non-2xx status code"))).toBe(
      MSG_PADRAO,
    );
    expect(mensagemAmigavel(new Error("Failed to fetch"))).toBe(MSG_SEM_CONEXAO);
    expect(mensagemAmigavel(new Error("Escolha uma turma."))).toBe("Escolha uma turma.");
  });
});

describe("temConteudo", () => {
  it("ignora campos internos e vazios", () => {
    expect(temConteudo({})).toBe(false);
    expect(temConteudo({ _raw: "x", a: "", b: [] })).toBe(false);
    expect(temConteudo({ a: { b: "texto" } })).toBe(true);
  });
});

describe("mensagemAmigavel (inglês do banco)", () => {
  it("não mostra erro do Postgres em inglês", () => {
    expect(
      mensagemAmigavel(new Error('new row violates row-level security policy for table "x"')),
    ).toBe(MSG_PADRAO);
    expect(mensagemAmigavel(new Error("permission denied for table trilhas"))).toBe(MSG_PADRAO);
  });
});
