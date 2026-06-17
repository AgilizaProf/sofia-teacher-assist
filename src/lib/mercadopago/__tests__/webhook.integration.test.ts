import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  TEST_SECRET,
  buildSignedRequest,
  setEnv,
  clearEnv,
  mockMpFetch,
} from "./test-helpers";

/* Hoisted mock — vi.hoisted runs before any imports, including the route.
 * Everything used inside MUST be defined inside the factory (no outer refs). */
const { sb } = vi.hoisted(() => {
  type SupabaseCall = {
    table: string;
    op: "select" | "upsert" | "update" | "insert" | "delete";
    payload?: unknown;
    filters: Array<{ kind: string; column: string; value: unknown }>;
    upsertOptions?: unknown;
    selectColumns?: string;
  };
  const calls: SupabaseCall[] = [];
  const queue: Record<string, { data: unknown; error: unknown } | undefined> = {};
  const buildBuilder = (call: SupabaseCall) => {
    const finalize = () =>
      Promise.resolve(queue[`${call.table}:${call.op}`] ?? { data: null, error: null });
    const b: Record<string, unknown> = {};
    b.select = (cols?: string) => {
      call.op = "select";
      call.selectColumns = cols;
      return b;
    };
    b.eq = (column: string, value: unknown) => {
      call.filters.push({ kind: "eq", column, value });
      return b;
    };
    b.ilike = (column: string, value: unknown) => {
      call.filters.push({ kind: "ilike", column, value });
      return b;
    };
    b.maybeSingle = () => finalize();
    b.single = () => finalize();
    b.then = (
      onFulfilled?: (v: { data: unknown; error: unknown }) => unknown,
      onRejected?: (e: unknown) => unknown
    ) => finalize().then(onFulfilled, onRejected);
    return b;
  };
  const client = {
    from(table: string) {
      const baseCall: SupabaseCall = { table, op: "select", filters: [] };
      return {
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
    },
  };
  return {
    sb: {
      client,
      calls,
      queue,
      reset() {
        calls.length = 0;
        for (const k of Object.keys(queue)) delete queue[k];
      },
      callsFor(table: string) {
        return calls.filter((c) => c.table === table);
      },
    },
  };
});
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: sb.client,
}));

import { Route as ProdRoute } from "@/routes/api/public/webhooks/mercadopago";
import { Route as TestRoute } from "@/routes/api/public/webhooks/mercadopago_debug";

const URL_PROD = "https://x.test/api/public/webhooks/mercadopago";
const URL_DRY = "https://x.test/api/public/webhooks/mercadopago_debug";

function callProd(req: Request): Promise<Response> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (ProdRoute as any).options.server.handlers.POST({ request: req });
}
function callDry(req: Request): Promise<Response> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (TestRoute as any).options.server.handlers.POST({ request: req });
}

const PREAPPROVAL_ID = "pre_int_001";
const USER_ID = "user-int-1";
const EMAIL = "buyer@example.com";

const subscriptionEvent = {
  type: "subscription_preapproval",
  action: "updated",
  data: { id: PREAPPROVAL_ID },
};

function queueProfile(found = true) {
  sb.queue["profiles:select"] = {
    data: found ? { user_id: USER_ID } : null,
    error: null,
  };
}
function queueCurrentSub(
  current: { source?: string; plano?: string; current_period_end?: string } | null
) {
  sb.queue["subscriptions:select"] = { data: current, error: null };
}

beforeEach(() => {
  setEnv();
  sb.reset();
  // Default: writes succeed silently.
  sb.queue["subscriptions:upsert"] = { data: null, error: null };
  sb.queue["subscriptions:update"] = { data: null, error: null };
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  clearEnv();
});

/* =============================================================
 * PRODUCTION endpoint
 * ============================================================= */
describe("POST /api/public/webhooks/mercadopago (production)", () => {
  it("returns 500 when server is not configured", async () => {
    clearEnv();
    const res = await callProd(
      buildSignedRequest({ url: URL_PROD, body: subscriptionEvent })
    );
    expect(res.status).toBe(500);
  });

  it("returns 400 on invalid JSON body", async () => {
    const res = await callProd(
      buildSignedRequest({
        url: URL_PROD,
        body: "{not json",
        dataId: PREAPPROVAL_ID,
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 401 on missing signature headers", async () => {
    const res = await callProd(
      new Request(URL_PROD, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(subscriptionEvent),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 on tampered signature", async () => {
    const res = await callProd(
      buildSignedRequest({
        url: URL_PROD,
        body: subscriptionEvent,
        v1Override: "0".repeat(64),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 200 and skips DB for non-preapproval events", async () => {
    const fetchSpy = mockMpFetch(() => ({ body: {} }));
    const res = await callProd(
      buildSignedRequest({
        url: URL_PROD,
        body: { type: "payment", data: { id: "pay_1" } },
      })
    );
    expect(res.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(sb.calls.length).toBe(0);
  });

  it("returns 502 when MP upstream call fails", async () => {
    mockMpFetch(() => ({ status: 500, body: "boom" }));
    const res = await callProd(
      buildSignedRequest({ url: URL_PROD, body: subscriptionEvent })
    );
    expect(res.status).toBe(502);
  });

  it("returns 200 and ack when payer_email is missing", async () => {
    mockMpFetch(() => ({
      body: { id: PREAPPROVAL_ID, status: "authorized", payer_email: "" },
    }));
    const res = await callProd(
      buildSignedRequest({ url: URL_PROD, body: subscriptionEvent })
    );
    expect(res.status).toBe(200);
    // No DB writes attempted
    expect(sb.callsFor("subscriptions").length).toBe(0);
  });

  it("returns 200 and ack when no profile matches the email", async () => {
    mockMpFetch(() => ({
      body: { id: PREAPPROVAL_ID, status: "authorized", payer_email: EMAIL },
    }));
    queueProfile(false);
    const res = await callProd(
      buildSignedRequest({ url: URL_PROD, body: subscriptionEvent })
    );
    expect(res.status).toBe(200);
    expect(sb.callsFor("subscriptions").length).toBe(0);
  });

  it("upserts active subscription when MP status=authorized", async () => {
    const fetchSpy = mockMpFetch(() => ({
      body: {
        id: PREAPPROVAL_ID,
        status: "authorized",
        payer_email: EMAIL,
        next_payment_date: "2026-06-12T00:00:00.000Z",
        date_created: "2026-05-12T00:00:00.000Z",
      },
    }));
    queueProfile(true);
    queueCurrentSub(null);

    const res = await callProd(
      buildSignedRequest({ url: URL_PROD, body: subscriptionEvent })
    );

    expect(res.status).toBe(200);
    // Upstream MP called with bearer token
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchSpy.mock.calls[0];
    expect(String(calledUrl)).toBe(
      `https://api.mercadopago.com/preapproval/${PREAPPROVAL_ID}`
    );
    expect((calledInit as RequestInit)?.headers).toMatchObject({
      Authorization: expect.stringMatching(/^Bearer /),
    });

    const upserts = sb.calls.filter(
      (c) => c.table === "subscriptions" && c.op === "upsert"
    );
    expect(upserts).toHaveLength(1);
    expect(upserts[0].payload).toMatchObject({
      user_id: USER_ID,
      plano: "pro",
      ciclo: "mensal",
      status: "active",
      source: "mercadopago",
      current_period_end: "2026-06-12T00:00:00.000Z",
    });
    expect(upserts[0].upsertOptions).toEqual({ onConflict: "user_id" });
    // No update path triggered
    expect(
      sb.calls.filter((c) => c.table === "subscriptions" && c.op === "update")
    ).toHaveLength(0);
  });

  it("marks subscription canceled when MP status=cancelled", async () => {
    mockMpFetch(() => ({
      body: {
        id: PREAPPROVAL_ID,
        status: "cancelled",
        payer_email: EMAIL,
        next_payment_date: "2026-06-12T00:00:00.000Z",
      },
    }));
    queueProfile(true);
    queueCurrentSub({ source: "mercadopago", plano: "pro" });

    const res = await callProd(
      buildSignedRequest({ url: URL_PROD, body: subscriptionEvent })
    );
    expect(res.status).toBe(200);
    const updates = sb.calls.filter(
      (c) => c.table === "subscriptions" && c.op === "update"
    );
    expect(updates).toHaveLength(1);
    expect(updates[0].payload).toMatchObject({ status: "canceled" });
    // Update is scoped by user_id AND source=mercadopago
    expect(updates[0].filters).toEqual(
      expect.arrayContaining([
        { kind: "eq", column: "user_id", value: USER_ID },
        { kind: "eq", column: "source", value: "mercadopago" },
      ])
    );
  });

  it("only writes metadata for status=pending", async () => {
    mockMpFetch(() => ({
      body: { id: PREAPPROVAL_ID, status: "pending", payer_email: EMAIL },
    }));
    queueProfile(true);
    queueCurrentSub(null);
    const res = await callProd(
      buildSignedRequest({ url: URL_PROD, body: subscriptionEvent })
    );
    expect(res.status).toBe(200);
    const updates = sb.calls.filter(
      (c) => c.table === "subscriptions" && c.op === "update"
    );
    expect(updates).toHaveLength(1);
    expect(updates[0].payload).toMatchObject({
      metadata: expect.objectContaining({ mp_status: "pending" }),
    });
    // Status field NOT touched in metadata-only path
    expect((updates[0].payload as Record<string, unknown>).status).toBeUndefined();
  });

  it("respects an active admin_grant — no writes", async () => {
    mockMpFetch(() => ({
      body: { id: PREAPPROVAL_ID, status: "authorized", payer_email: EMAIL },
    }));
    queueProfile(true);
    queueCurrentSub({
      source: "admin_grant",
      plano: "pro",
      current_period_end: new Date(Date.now() + 86_400_000).toISOString(),
    });

    const res = await callProd(
      buildSignedRequest({ url: URL_PROD, body: subscriptionEvent })
    );
    expect(res.status).toBe(200);
    // Only the SELECTs ran; no upsert/update
    expect(
      sb.calls.filter(
        (c) =>
          c.table === "subscriptions" && (c.op === "upsert" || c.op === "update")
      )
    ).toHaveLength(0);
  });
});

/* =============================================================
 * DRY-RUN endpoint
 * ============================================================= */
describe("POST /api/public/webhooks/mercadopago_debug (dry-run)", () => {
  it("returns 401 when x-debug-token is missing/wrong", async () => {
    const req = new Request(URL_DRY + "?fetch=0", {
      method: "POST",
      headers: { "content-type": "application/json", "x-debug-token": "nope" },
      body: JSON.stringify(subscriptionEvent),
    });
    const res = await callDry(req);
    expect(res.status).toBe(401);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(false);
  });

  it("simulate=1 produces a valid signature and predicts upsert:active", async () => {
    mockMpFetch(() => ({
      body: {
        id: PREAPPROVAL_ID,
        status: "authorized",
        payer_email: EMAIL,
        next_payment_date: "2026-06-12T00:00:00.000Z",
      },
    }));
    queueProfile(true);
    queueCurrentSub(null);

    const req = new Request(URL_DRY + "?simulate=1", {
      method: "POST",
      headers: { "content-type": "application/json", "x-debug-token": TEST_SECRET },
      body: JSON.stringify(subscriptionEvent),
    });
    const res = await callDry(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      ok: boolean;
      dryRun: boolean;
      signature: { valid: boolean; simulated: boolean };
      extracted: { dataId: string; isPreapproval: boolean };
      plannedAction: string;
    };
    expect(json.ok).toBe(true);
    expect(json.dryRun).toBe(true);
    expect(json.signature.valid).toBe(true);
    expect(json.signature.simulated).toBe(true);
    expect(json.extracted.dataId).toBe(PREAPPROVAL_ID);
    expect(json.extracted.isPreapproval).toBe(true);
    expect(json.plannedAction).toBe("upsert:active");
    // Crucially: dry-run never writes
    expect(
      sb.calls.filter(
        (c) =>
          c.table === "subscriptions" && (c.op === "upsert" || c.op === "update")
      )
    ).toHaveLength(0);
  });

  it("predicts skip:invalid_signature when v1 is forged", async () => {
    const req = buildSignedRequest({
      url: URL_DRY,
      body: subscriptionEvent,
      v1Override: "0".repeat(64),
      extraHeaders: { "x-debug-token": TEST_SECRET },
    });
    const res = await callDry(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      signature: { valid: boolean };
      plannedAction: string;
    };
    expect(json.signature.valid).toBe(false);
    expect(json.plannedAction).toBe("skip:invalid_signature");
  });

  it("predicts update:canceled for status=cancelled", async () => {
    mockMpFetch(() => ({
      body: { id: PREAPPROVAL_ID, status: "cancelled", payer_email: EMAIL },
    }));
    queueProfile(true);
    queueCurrentSub({ source: "mercadopago", plano: "pro" });

    const req = new Request(URL_DRY + "?simulate=1", {
      method: "POST",
      headers: { "content-type": "application/json", "x-debug-token": TEST_SECRET },
      body: JSON.stringify(subscriptionEvent),
    });
    const res = await callDry(req);
    const json = (await res.json()) as { plannedAction: string };
    expect(json.plannedAction).toBe("update:canceled");
  });

  it("predicts skip:no_profile when user is not found", async () => {
    mockMpFetch(() => ({
      body: { id: PREAPPROVAL_ID, status: "authorized", payer_email: EMAIL },
    }));
    queueProfile(false);

    const req = new Request(URL_DRY + "?simulate=1", {
      method: "POST",
      headers: { "content-type": "application/json", "x-debug-token": TEST_SECRET },
      body: JSON.stringify(subscriptionEvent),
    });
    const res = await callDry(req);
    const json = (await res.json()) as {
      userLookup: { email: string; user_id: string | null };
      plannedAction: string;
    };
    expect(json.userLookup.user_id).toBeNull();
    expect(json.plannedAction).toBe("skip:no_profile");
  });

  it("fetch=0 skips upstream and signature path still validates", async () => {
    const fetchSpy = mockMpFetch(() => ({ body: {} }));
    const req = new Request(URL_DRY + "?simulate=1&fetch=0", {
      method: "POST",
      headers: { "content-type": "application/json", "x-debug-token": TEST_SECRET },
      body: JSON.stringify(subscriptionEvent),
    });
    const res = await callDry(req);
    const json = (await res.json()) as {
      signature: { valid: boolean };
      upstream: { called: boolean };
      plannedAction: string | null;
    };
    expect(res.status).toBe(200);
    expect(json.signature.valid).toBe(true);
    expect(json.upstream.called).toBe(false);
    expect(json.plannedAction).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});