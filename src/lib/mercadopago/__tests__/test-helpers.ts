import { vi } from "vitest";
import { createHmac } from "crypto";

export const TEST_SECRET = "TEST_SECRET";
export const TEST_TOKEN = "TEST_ACCESS_TOKEN";

export function setEnv() {
  process.env.MP_WEBHOOK_SECRET = TEST_SECRET;
  process.env.MP_ACCESS_TOKEN = TEST_TOKEN;
}
export function clearEnv() {
  delete process.env.MP_WEBHOOK_SECRET;
  delete process.env.MP_ACCESS_TOKEN;
}

/** Build a real Request with a valid (or arbitrary) MP signature. */
export function buildSignedRequest(opts: {
  url: string;
  body: unknown;
  dataId?: string;
  requestId?: string;
  ts?: string;
  secret?: string;
  /** Override the v1 hash to simulate a forged request. */
  v1Override?: string;
  /** Skip signature headers entirely. */
  noSignature?: boolean;
  extraHeaders?: Record<string, string>;
}): Request {
  const body = typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body);
  const requestId = opts.requestId ?? "req-test-1";
  const ts = opts.ts ?? "1700000000";
  const dataId =
    opts.dataId ??
    (typeof opts.body === "object" && opts.body
      ? String((opts.body as { data?: { id?: string | number } })?.data?.id ?? "")
      : "");
  const secret = opts.secret ?? TEST_SECRET;
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = opts.v1Override ?? createHmac("sha256", secret).update(manifest).digest("hex");
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(opts.extraHeaders ?? {}),
  };
  if (!opts.noSignature) {
    headers["x-signature"] = `ts=${ts},v1=${v1}`;
    headers["x-request-id"] = requestId;
  }
  return new Request(opts.url, { method: "POST", headers, body });
}

/** ----------------------------------------------------------------
 *  Chainable Supabase mock that records every call.
 *  Supports: from(table).select().ilike()/eq().maybeSingle()
 *            from(table).upsert(payload, opts)
 *            from(table).update(payload).eq().eq()
 *  Returns whatever the test queues via `queue` per (table, op).
 * ---------------------------------------------------------------- */
export type SupabaseCall = {
  table: string;
  op: "select" | "upsert" | "update" | "insert" | "delete";
  payload?: unknown;
  filters: Array<{ kind: string; column: string; value: unknown }>;
  upsertOptions?: unknown;
  selectColumns?: string;
};

export function createSupabaseMock() {
  const calls: SupabaseCall[] = [];
  /** queue["profiles:select"] = { data, error } */
  const queue: Record<string, { data: unknown; error: unknown } | undefined> = {};

  function buildBuilder(call: SupabaseCall) {
    const builder: Record<string, unknown> = {};
    const finalize = () => {
      const key = `${call.table}:${call.op}`;
      const result = queue[key] ?? { data: null, error: null };
      return Promise.resolve(result);
    };
    builder.select = (cols?: string) => {
      call.op = "select";
      call.selectColumns = cols;
      return builder;
    };
    builder.eq = (column: string, value: unknown) => {
      call.filters.push({ kind: "eq", column, value });
      return builder;
    };
    builder.ilike = (column: string, value: unknown) => {
      call.filters.push({ kind: "ilike", column, value });
      return builder;
    };
    builder.maybeSingle = () => finalize();
    builder.single = () => finalize();
    // For upsert/update the chain itself is awaitable:
    builder.then = (
      onFulfilled?: (v: { data: unknown; error: unknown }) => unknown,
      onRejected?: (e: unknown) => unknown
    ) => finalize().then(onFulfilled, onRejected);
    return builder;
  }

  const client = {
    from(table: string) {
      const baseCall: SupabaseCall = { table, op: "select", filters: [] };
      const tableApi = {
        select(cols?: string) {
          baseCall.op = "select";
          baseCall.selectColumns = cols;
          calls.push(baseCall);
          return buildBuilder(baseCall);
        },
        upsert(payload: unknown, options?: unknown) {
          baseCall.op = "upsert";
          baseCall.payload = payload;
          baseCall.upsertOptions = options;
          calls.push(baseCall);
          return buildBuilder(baseCall);
        },
        update(payload: unknown) {
          baseCall.op = "update";
          baseCall.payload = payload;
          calls.push(baseCall);
          return buildBuilder(baseCall);
        },
        insert(payload: unknown) {
          baseCall.op = "insert";
          baseCall.payload = payload;
          calls.push(baseCall);
          return buildBuilder(baseCall);
        },
      };
      return tableApi;
    },
  };

  return {
    client,
    calls,
    queue,
    reset() {
      calls.length = 0;
      for (const k of Object.keys(queue)) delete queue[k];
    },
    /** Convenience: get all calls for a table. */
    callsFor(table: string) {
      return calls.filter((c) => c.table === table);
    },
  };
}

/** Mock global fetch for the upstream MP /preapproval/{id} call. */
export function mockMpFetch(
  responder: (url: string, init?: RequestInit) =>
    | { status?: number; body: unknown }
    | Promise<{ status?: number; body: unknown }>
) {
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const r = await responder(url, init);
    return new Response(typeof r.body === "string" ? r.body : JSON.stringify(r.body), {
      status: r.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}