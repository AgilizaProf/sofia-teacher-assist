import { describe, it, expect } from "vitest";
import {
  parseSignatureHeader,
  buildManifest,
  computeV1,
  verifySignature,
  parseWebhookEvent,
  decidePlannedAction,
  computePeriodEnd,
  escapeLikeExact,
  isStalePreapproval,
  pickProfileByEmail,
  userIdFromExternalReference,
} from "./webhook-logic";
import {
  TEST_SECRET,
  TEST_REQUEST_ID,
  TEST_TS,
  TEST_DATA_ID,
  TEST_V1_VALID,
  preapprovalAuthorized,
  paymentEvent,
  upstreamAuthorized,
  upstreamPaused,
  upstreamCancelled,
  upstreamPending,
  upstreamNoEmail,
} from "./__fixtures__/webhook-events";

const url = (qs = "") => new URL(`https://x.test/api/public/webhooks/mercadopago${qs}`);

describe("parseSignatureHeader", () => {
  it("parses ts and v1 from canonical header", () => {
    expect(parseSignatureHeader("ts=123,v1=abc")).toEqual({ ts: "123", v1: "abc" });
  });
  it("tolerates whitespace and trailing commas", () => {
    expect(parseSignatureHeader(" ts = 123 , v1 = abc ,")).toEqual({
      ts: "123",
      v1: "abc",
    });
  });
  it("returns empty object for empty header", () => {
    expect(parseSignatureHeader("")).toEqual({});
  });
});

describe("buildManifest / computeV1", () => {
  it("builds canonical MP manifest", () => {
    expect(buildManifest("D", "R", "T")).toBe("id:D;request-id:R;ts:T;");
  });
  it("matches the precomputed fixture HMAC", () => {
    const m = buildManifest(TEST_DATA_ID, TEST_REQUEST_ID, TEST_TS);
    expect(computeV1(TEST_SECRET, m)).toBe(TEST_V1_VALID);
  });
});

describe("verifySignature", () => {
  it("accepts a valid signature", () => {
    const r = verifySignature({
      secret: TEST_SECRET,
      signatureHeader: `ts=${TEST_TS},v1=${TEST_V1_VALID}`,
      requestId: TEST_REQUEST_ID,
      dataId: TEST_DATA_ID,
    });
    expect(r.valid).toBe(true);
    expect(r.v1Expected).toBe(TEST_V1_VALID);
  });
  it("rejects a tampered v1", () => {
    const r = verifySignature({
      secret: TEST_SECRET,
      signatureHeader: `ts=${TEST_TS},v1=${"0".repeat(64)}`,
      requestId: TEST_REQUEST_ID,
      dataId: TEST_DATA_ID,
    });
    expect(r.valid).toBe(false);
  });
  it("rejects a tampered request-id (manifest mismatch)", () => {
    const r = verifySignature({
      secret: TEST_SECRET,
      signatureHeader: `ts=${TEST_TS},v1=${TEST_V1_VALID}`,
      requestId: "bogus-request-id",
      dataId: TEST_DATA_ID,
    });
    expect(r.valid).toBe(false);
  });
  it("rejects a wrong secret", () => {
    const r = verifySignature({
      secret: "WRONG_SECRET",
      signatureHeader: `ts=${TEST_TS},v1=${TEST_V1_VALID}`,
      requestId: TEST_REQUEST_ID,
      dataId: TEST_DATA_ID,
    });
    expect(r.valid).toBe(false);
  });
  it("rejects when headers are missing", () => {
    expect(
      verifySignature({
        secret: TEST_SECRET,
        signatureHeader: "",
        requestId: TEST_REQUEST_ID,
        dataId: TEST_DATA_ID,
      }).valid,
    ).toBe(false);
  });
});

describe("parseWebhookEvent", () => {
  it("extracts dataId and event type from JSON body", () => {
    const r = parseWebhookEvent(JSON.stringify(preapprovalAuthorized), url());
    expect(r.parseError).toBeNull();
    expect(r.dataId).toBe(TEST_DATA_ID);
    expect(r.eventType).toBe("subscription_preapproval");
    expect(r.isPreapproval).toBe(true);
  });
  it("falls back to query params when body has no data.id", () => {
    const r = parseWebhookEvent("{}", url("?data.id=Q123&type=preapproval"));
    expect(r.dataId).toBe("Q123");
    expect(r.isPreapproval).toBe(true);
  });
  it("flags non-preapproval events", () => {
    const r = parseWebhookEvent(JSON.stringify(paymentEvent), url());
    expect(r.isPreapproval).toBe(false);
  });
  it("captures invalid JSON in parseError", () => {
    const r = parseWebhookEvent("{not json", url());
    expect(r.parseError).not.toBeNull();
    expect(r.dataId).toBe("");
  });
  it("coerces numeric data.id to string", () => {
    const r = parseWebhookEvent(JSON.stringify({ type: "preapproval", data: { id: 4242 } }), url());
    expect(r.dataId).toBe("4242");
  });
});

describe("decidePlannedAction", () => {
  const baseValid = {
    signatureValid: true,
    isPreapproval: true,
    userId: "user-1",
    currentSubscription: null,
    now: new Date("2026-05-12T12:00:00Z"),
  };

  it("skip:invalid_signature wins first", () => {
    expect(
      decidePlannedAction({
        ...baseValid,
        signatureValid: false,
        preapproval: upstreamAuthorized,
      }),
    ).toBe("skip:invalid_signature");
  });
  it("skip:not_preapproval for non-subscription events", () => {
    expect(
      decidePlannedAction({
        ...baseValid,
        isPreapproval: false,
        preapproval: upstreamAuthorized,
      }),
    ).toBe("skip:not_preapproval");
  });
  it("skip:no_email when payer_email is empty", () => {
    expect(decidePlannedAction({ ...baseValid, preapproval: upstreamNoEmail })).toBe(
      "skip:no_email",
    );
  });
  it("skip:no_profile when no matching user", () => {
    expect(
      decidePlannedAction({
        ...baseValid,
        userId: null,
        preapproval: upstreamAuthorized,
      }),
    ).toBe("skip:no_profile");
  });
  it("skip:active_admin_grant when admin grant is still valid", () => {
    expect(
      decidePlannedAction({
        ...baseValid,
        preapproval: upstreamAuthorized,
        currentSubscription: {
          source: "admin_grant",
          plano: "pro",
          current_period_end: "2026-12-31T00:00:00Z",
        },
      }),
    ).toBe("skip:active_admin_grant");
  });
  it("does NOT block when admin grant is expired", () => {
    expect(
      decidePlannedAction({
        ...baseValid,
        preapproval: upstreamAuthorized,
        currentSubscription: {
          source: "admin_grant",
          plano: "pro",
          current_period_end: "2026-01-01T00:00:00Z",
        },
      }),
    ).toBe("upsert:active");
  });
  it("upsert:active for authorized status", () => {
    expect(decidePlannedAction({ ...baseValid, preapproval: upstreamAuthorized })).toBe(
      "upsert:active",
    );
  });
  it("update:canceled for paused", () => {
    expect(decidePlannedAction({ ...baseValid, preapproval: upstreamPaused })).toBe(
      "update:canceled",
    );
  });
  it("update:canceled for cancelled", () => {
    expect(decidePlannedAction({ ...baseValid, preapproval: upstreamCancelled })).toBe(
      "update:canceled",
    );
  });
  it("update:metadata_only for pending/unknown", () => {
    expect(decidePlannedAction({ ...baseValid, preapproval: upstreamPending })).toBe(
      "update:metadata_only",
    );
  });
});

describe("userIdFromExternalReference (A6)", () => {
  it("aceita uuid e normaliza para minúsculas", () => {
    expect(userIdFromExternalReference(" 3F2504E0-4F89-11D3-9A0C-0305E82C3301 ")).toBe(
      "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
    );
  });
  it("recusa qualquer coisa que não seja uuid", () => {
    expect(userIdFromExternalReference("abc")).toBeNull();
    expect(userIdFromExternalReference("")).toBeNull();
    expect(userIdFromExternalReference(null)).toBeNull();
    expect(userIdFromExternalReference(123)).toBeNull();
  });
});

describe("e-mail exato (A6)", () => {
  it("escapa curingas do ilike", () => {
    expect(escapeLikeExact("ana_paula%@x.com")).toBe("ana\\_paula\\%@x.com");
  });
  it("não casa e-mail parecido (curinga _)", () => {
    const rows = [{ user_id: "u2", email: "anaXpaula@x.com" }];
    expect(pickProfileByEmail(rows, "ana_paula@x.com")).toEqual({
      userId: null,
      reason: "no_profile",
    });
  });
  it("casa ignorando maiúsculas e espaços", () => {
    const rows = [{ user_id: "u1", email: "Ana.Paula@X.com " }];
    expect(pickProfileByEmail(rows, "ana.paula@x.com")).toEqual({ userId: "u1", reason: "email" });
  });
  it("duas contas com o mesmo e-mail = ambíguo (não escolhe)", () => {
    const rows = [
      { user_id: "u1", email: "a@x.com" },
      { user_id: "u2", email: "A@x.com" },
    ];
    expect(pickProfileByEmail(rows, "a@x.com")).toEqual({ userId: null, reason: "ambiguous" });
  });
});

describe("computePeriodEnd (A5: idempotente)", () => {
  const now = new Date("2026-11-16T12:00:00.000Z");
  const DIA = 24 * 60 * 60 * 1000;

  it("usa next_payment_date do MP quando existe", () => {
    const r = computePeriodEnd({
      ciclo: "mensal",
      preapprovalId: "pre1",
      nextPaymentDate: "2026-12-16T00:00:00.000Z",
      periodDays: 30,
      current: null,
      now,
    });
    expect(r.periodEnd).toBe("2026-12-16T00:00:00.000Z");
    expect(r.carriedOver).toBe(false);
  });

  it("'authorized' repetido do mesmo anual não soma outro ano", () => {
    const fimAnual = "2027-11-16T00:00:00.000Z";
    const primeira = computePeriodEnd({
      ciclo: "anual",
      preapprovalId: "preAnual",
      nextPaymentDate: fimAnual,
      periodDays: 365,
      current: {
        source: "mercadopago",
        plano: "pro",
        ciclo: "mensal",
        current_period_end: new Date(now.getTime() + 10 * DIA).toISOString(),
        metadata: { preapproval_id: "preMensal" },
      },
      now,
    });
    expect(primeira.carriedOver).toBe(true);
    expect(primeira.previousPreapprovalId).toBe("preMensal");
    const esperado = new Date(new Date(fimAnual).getTime() + 10 * DIA).toISOString();
    expect(primeira.periodEnd).toBe(esperado);

    // 2ª, 3ª... notificação do MESMO preapproval anual
    for (let i = 0; i < 3; i++) {
      const repetida = computePeriodEnd({
        ciclo: "anual",
        preapprovalId: "preAnual",
        nextPaymentDate: fimAnual,
        periodDays: 365,
        current: {
          source: "mercadopago",
          plano: "pro",
          ciclo: "anual",
          current_period_end: primeira.periodEnd,
          metadata: { preapproval_id: "preAnual" },
        },
        now,
      });
      expect(repetida.carriedOver).toBe(false);
      expect(repetida.previousPreapprovalId).toBeNull();
      expect(repetida.periodEnd).toBe(fimAnual);
    }
  });

  it("anual já ativo (sem troca) não soma o próprio restante", () => {
    const r = computePeriodEnd({
      ciclo: "anual",
      preapprovalId: "preAnualNovo",
      nextPaymentDate: "2027-11-16T00:00:00.000Z",
      periodDays: 365,
      current: {
        source: "mercadopago",
        plano: "pro",
        ciclo: "anual",
        current_period_end: "2027-06-01T00:00:00.000Z",
        metadata: { preapproval_id: "preAnualVelho" },
      },
      now,
    });
    expect(r.carriedOver).toBe(false);
    expect(r.periodEnd).toBe("2027-11-16T00:00:00.000Z");
  });

  it("mensal repetido sem next_payment_date mantém o fim atual", () => {
    const fim = new Date(now.getTime() + 20 * DIA).toISOString();
    const r = computePeriodEnd({
      ciclo: "mensal",
      preapprovalId: "pre1",
      nextPaymentDate: null,
      periodDays: 30,
      current: {
        source: "mercadopago",
        plano: "pro",
        ciclo: "mensal",
        current_period_end: fim,
        metadata: { preapproval_id: "pre1" },
      },
      now,
    });
    expect(r.periodEnd).toBe(fim);
  });
});

describe("isStalePreapproval", () => {
  const now = new Date("2026-11-16T12:00:00.000Z");
  const currentAnual = {
    source: "mercadopago",
    plano: "pro",
    ciclo: "anual",
    current_period_end: "2027-11-16T00:00:00.000Z",
    metadata: { preapproval_id: "preAnual" },
  };
  it("cancelamento do mensal antigo não cancela o anual", () => {
    expect(
      isStalePreapproval({
        preapprovalId: "preMensal",
        status: "cancelled",
        ciclo: "mensal",
        current: currentAnual,
        now,
      }),
    ).toBe(true);
  });
  it("autorização atrasada do mensal antigo não rebaixa o anual", () => {
    expect(
      isStalePreapproval({
        preapprovalId: "preMensal",
        status: "authorized",
        ciclo: "mensal",
        current: currentAnual,
        now,
      }),
    ).toBe(true);
  });
  it("notificação do preapproval atual segue normal", () => {
    expect(
      isStalePreapproval({
        preapprovalId: "preAnual",
        status: "cancelled",
        ciclo: "anual",
        current: currentAnual,
        now,
      }),
    ).toBe(false);
  });
  it("sem assinatura atual do MP, nada é antigo", () => {
    expect(
      isStalePreapproval({
        preapprovalId: "x",
        status: "authorized",
        ciclo: "mensal",
        current: null,
      }),
    ).toBe(false);
  });
});
