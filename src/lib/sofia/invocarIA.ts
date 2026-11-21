// Chamada única às edge functions de IA da Sofia.
//
// Por que existe: as funções respondem de vários jeitos quando algo dá errado.
//   - HTTP 200 com { ok: false, error } (sofia-router.ts → aiErrorResponse);
//   - HTTP 200 com { error } (catch das funções);
//   - HTTP 4xx/5xx: o supabase-js devolve um FunctionsHttpError cuja mensagem é
//     "Edge Function returned a non-2xx status code" e cujo `context` é o
//     Response (o corpo com a mensagem de verdade precisa ser lido dali);
//   - resposta vazia ou JSON cortado (campo `truncated` / `_truncated`).
// Antes, cada tela checava só `error` e gravava `{}` como se fosse sucesso,
// sobrescrevendo o documento anterior e cobrando créditos.
//
// Regra para quem usa: `invocarIA` só devolve dados quando há conteúdo válido.
// Em qualquer falha lança `ErroIA` com uma mensagem em português simples
// (`e.message`), pronta para toast. Grave, mostre sucesso e cobre créditos
// SOMENTE depois que `invocarIA` devolver.

export const MSG_PADRAO = "A Sofia não conseguiu agora. Tente de novo em instantes.";
export const MSG_INCOMPLETA = "A resposta veio incompleta. Gere de novo.";
export const MSG_VAZIA = "A Sofia não devolveu conteúdo desta vez. Gere de novo.";
export const MSG_SEM_CONEXAO = "Sem conexão com a internet. Confira a rede e tente de novo.";
export const MSG_SEM_CREDITOS =
  "Seus créditos acabaram. Eles renovam no próximo ciclo do seu plano.";
export const MSG_MUITOS_PEDIDOS =
  "A Sofia está com muitos pedidos agora. Tente de novo em instantes.";
export const MSG_INSTAVEL = "A Sofia está instável agora. Tente de novo em alguns segundos.";
export const MSG_CREDITOS_INDISPONIVEIS =
  "Não consegui conferir seus créditos agora. Tente de novo em instantes.";

export type TipoErroIA =
  | "rede"
  | "sem_creditos"
  | "creditos_indisponiveis"
  | "muitos_pedidos"
  | "incompleta"
  | "vazia"
  | "servidor";

export class ErroIA extends Error {
  tipo: TipoErroIA;
  status?: number;
  /** Texto técnico, só para console. Nunca mostre na tela. */
  detalhe?: string;
  constructor(mensagem: string, tipo: TipoErroIA, status?: number, detalhe?: string) {
    super(mensagem);
    this.name = "ErroIA";
    this.tipo = tipo;
    this.status = status;
    this.detalhe = detalhe;
  }
}

/** Cliente mínimo (permite injetar um falso nos testes). */
export type ClienteFunctions = {
  functions: {
    invoke: (
      fn: string,
      opts?: { body?: unknown; headers?: Record<string, string> },
    ) => Promise<{ data: unknown; error: unknown }>;
  };
};

export type OpcoesInvocarIA<T> = {
  /** Corpo enviado à função. */
  body?: unknown;
  headers?: Record<string, string>;
  /**
   * Confere se a resposta tem o conteúdo esperado (ex.: `d => !!d.parecer?.texto`).
   * Se devolver false, lança ErroIA "vazia". Se devolver uma string, ela vira a
   * mensagem do erro.
   */
  validar?: (data: T) => boolean | string;
  /** Aceita resposta marcada como truncada (padrão: false → lança "incompleta"). */
  aceitarIncompleta?: boolean;
  /** Cliente Supabase (padrão: o do app). */
  client?: ClienteFunctions;
};

// Textos que nunca devem chegar à professora: técnicos, em inglês, ou com
// referências a painel de fornecedor.
const TECNICO =
  /non-2xx|edge function|failed to fetch|fetch failed|networkerror|load failed|typeerror|syntaxerror|unexpected token|json|settings|workspace|lovable|gateway|api[_ ]?key|status code|internal server|undefined|null|stack|exception|deno|supabase|relay|abort|timeout|timed out|\bhttp\b|[{}<>]|\bat \w+ \(/i;

function pareceTecnico(msg: string): boolean {
  if (!msg) return true;
  if (msg.length > 220) return true;
  if (TECNICO.test(msg)) return true;
  // Inglês (mensagens do banco/da rede): "new row violates...", "permission denied".
  if (
    /\b(the|violates|failed|cannot|could not|unable|invalid|column|relation|permission denied|duplicate key|constraint)\b/i.test(
      msg,
    )
  )
    return true;
  // Frases em inglês comuns ("Error", "Invalid", "Not found"...).
  if (/^(error|invalid|not found|unauthorized|forbidden|bad request|missing)\b/i.test(msg.trim()))
    return true;
  return false;
}

function mensagemPorStatus(status?: number): { msg: string; tipo: TipoErroIA } {
  if (status === 402) return { msg: MSG_SEM_CREDITOS, tipo: "sem_creditos" };
  if (status === 429) return { msg: MSG_MUITOS_PEDIDOS, tipo: "muitos_pedidos" };
  if (status === 503) return { msg: MSG_INSTAVEL, tipo: "servidor" };
  if (status && status >= 500) return { msg: MSG_INSTAVEL, tipo: "servidor" };
  return { msg: MSG_PADRAO, tipo: "servidor" };
}

type Corpo = {
  ok?: boolean;
  error?: unknown;
  message?: unknown;
  blocked?: boolean;
  creditCheckFailed?: boolean;
  upstreamStatus?: number;
  truncated?: boolean;
  _truncated?: boolean;
  [k: string]: unknown;
};

function erroDoCorpo(corpo: Corpo, statusHttp?: number): ErroIA {
  const status = Number(corpo.upstreamStatus || statusHttp || 0) || undefined;
  const detalhe = [corpo.error, corpo.message, (corpo as { detail?: unknown }).detail]
    .filter((x) => typeof x === "string" && x)
    .join(" | ");
  if (corpo.creditCheckFailed) {
    return new ErroIA(MSG_CREDITOS_INDISPONIVEIS, "creditos_indisponiveis", status, detalhe);
  }
  if (corpo.blocked) {
    const m =
      typeof corpo.error === "string" && !pareceTecnico(corpo.error)
        ? corpo.error
        : MSG_SEM_CREDITOS;
    return new ErroIA(m, "sem_creditos", status, detalhe);
  }
  // Preferência: `message` (texto para a pessoa) > `error` (às vezes um código).
  const candidatos = [corpo.message, corpo.error].filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0,
  );
  const amigavel = candidatos.find((c) => !pareceTecnico(c) && !/^[a-z0-9_]+$/.test(c));
  const porStatus = mensagemPorStatus(status);
  if (amigavel) return new ErroIA(amigavel.trim(), porStatus.tipo, status, detalhe);
  return new ErroIA(porStatus.msg, porStatus.tipo, status, detalhe);
}

async function lerCorpo(ctx: unknown): Promise<Corpo | null> {
  if (!ctx || typeof ctx !== "object") return null;
  const r = ctx as {
    clone?: () => unknown;
    json?: () => Promise<unknown>;
    text?: () => Promise<string>;
  };
  try {
    const alvo = (typeof r.clone === "function" ? r.clone() : r) as typeof r;
    if (typeof alvo.text === "function") {
      const t = await alvo.text();
      try {
        const j = JSON.parse(t);
        return j && typeof j === "object" ? (j as Corpo) : null;
      } catch {
        return t ? { error: t } : null;
      }
    }
    if (typeof alvo.json === "function") {
      const j = await alvo.json();
      return j && typeof j === "object" ? (j as Corpo) : null;
    }
  } catch {
    /* corpo ilegível */
  }
  // Formato antigo (context já é o objeto do corpo).
  const c = ctx as Corpo;
  if ("error" in c || "message" in c) return c;
  return null;
}

/** Converte qualquer erro vindo de functions.invoke em ErroIA amigável. */
export async function erroDeInvoke(error: unknown): Promise<ErroIA> {
  if (error instanceof ErroIA) return error;
  const e = error as { name?: string; message?: string; context?: unknown } | null;
  const nome = e?.name || "";
  const msg = e?.message || String(error ?? "");
  if (
    nome === "FunctionsFetchError" ||
    /failed to fetch|fetch failed|networkerror|load failed/i.test(msg)
  ) {
    return new ErroIA(MSG_SEM_CONEXAO, "rede", undefined, msg);
  }
  const ctx = e?.context as { status?: number } | undefined;
  const status = typeof ctx?.status === "number" ? ctx.status : undefined;
  const corpo = await lerCorpo(e?.context);
  if (corpo) return erroDoCorpo(corpo, status);
  if (nome === "FunctionsRelayError") return new ErroIA(MSG_INSTAVEL, "servidor", status, msg);
  if (!pareceTecnico(msg)) {
    return new ErroIA(msg, mensagemPorStatus(status).tipo, status, msg);
  }
  const p = mensagemPorStatus(status);
  return new ErroIA(p.msg, p.tipo, status, msg);
}

/**
 * Mensagem amigável para qualquer erro (para usar em `catch (e)` e toasts).
 * Síncrona: não lê o corpo do Response; use `erroDeInvoke` quando puder.
 */
export function mensagemAmigavel(e: unknown, padrao = MSG_PADRAO): string {
  if (e instanceof ErroIA) return e.message;
  const msg = (e as { message?: string } | null)?.message || (typeof e === "string" ? e : "");
  if (/failed to fetch|fetch failed|networkerror|load failed/i.test(msg)) return MSG_SEM_CONEXAO;
  if (msg && !pareceTecnico(msg)) return msg;
  return padrao;
}

function vazio(data: unknown): boolean {
  if (data === null || data === undefined) return true;
  if (typeof data === "string") return data.trim() === "";
  if (typeof data === "object" && !Array.isArray(data))
    return Object.keys(data as object).length === 0;
  return false;
}

function marcadaTruncada(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (d.truncated === true || d._truncated === true) return true;
  // Funções devolvem o documento dentro de uma chave (parecer, pei, trilha...).
  for (const v of Object.values(d)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const o = v as Record<string, unknown>;
      if (o._truncated === true) return true;
    }
  }
  return false;
}

/**
 * Chama uma edge function de IA e só devolve quando a resposta é válida.
 * Lança `ErroIA` (mensagem em português, pronta para toast) em qualquer falha.
 */
export async function invocarIA<T = Record<string, unknown>>(
  fn: string,
  opts: OpcoesInvocarIA<T> = {},
): Promise<T> {
  const client: ClienteFunctions =
    opts.client ??
    ((await import("@/integrations/supabase/client")).supabase as unknown as ClienteFunctions);

  let res: { data: unknown; error: unknown };
  try {
    res = await client.functions.invoke(fn, {
      body: opts.body,
      ...(opts.headers ? { headers: opts.headers } : {}),
    });
  } catch (e) {
    const err = await erroDeInvoke(e);
    console.warn(`[invocarIA] ${fn}:`, err.detalhe || err.message);
    throw err;
  }

  if (res.error) {
    const err = await erroDeInvoke(res.error);
    console.warn(`[invocarIA] ${fn}:`, err.detalhe || err.message);
    throw err;
  }

  let data = res.data as unknown;
  // Corpo em texto (content-type errado): tenta JSON.
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      /* mantém string */
    }
  }

  if (vazio(data)) throw new ErroIA(MSG_VAZIA, "vazia");

  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    const corpo = data as Corpo;
    if (
      corpo.ok === false ||
      (corpo.error !== undefined && corpo.error !== null && corpo.error !== "")
    ) {
      const err = erroDoCorpo(corpo);
      console.warn(`[invocarIA] ${fn}:`, err.detalhe || err.message);
      throw err;
    }
  }

  if (!opts.aceitarIncompleta && marcadaTruncada(data)) {
    throw new ErroIA(MSG_INCOMPLETA, "incompleta");
  }

  if (opts.validar) {
    const v = opts.validar(data as T);
    if (v !== true) {
      throw new ErroIA(typeof v === "string" && v ? v : MSG_VAZIA, "vazia");
    }
  }

  return data as T;
}

/** Ajuda para validar: texto não vazio. */
export function temTexto(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

/** Ajuda para validar: objeto com ao menos um campo de texto/lista preenchido. */
export function temConteudo(o: unknown): boolean {
  if (!o || typeof o !== "object") return false;
  return Object.entries(o as Record<string, unknown>).some(([k, v]) => {
    if (k.startsWith("_")) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    if (v && typeof v === "object") return temConteudo(v);
    return false;
  });
}
