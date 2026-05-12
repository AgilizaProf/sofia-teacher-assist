import { describe, it, expect } from "vitest";
import {
  parseSignatureHeader,
  buildManifest,
  computeV1,
  verifySignature,
  parseWebhookEvent,
  decidePlannedAction,
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
      }).valid
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
    const r = parseWebhookEvent(
      JSON.stringify({ type: "preapproval", data: { id: 4242 } }),
      url()
    );
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
      })
    ).toBe("skip:invalid_signature");
  });
  it("skip:not_preapproval for non-subscription events", () => {
    expect(
      decidePlannedAction({
        ...baseValid,
        isPreapproval: false,
        preapproval: upstreamAuthorized,
      })
    ).toBe("skip:not_preapproval");
  });
  it("skip:no_email when payer_email is empty", () => {
    expect(
      decidePlannedAction({ ...baseValid, preapproval: upstreamNoEmail })
    ).toBe("skip:no_email");
  });
  it("skip:no_profile when no matching user", () => {
    expect(
      decidePlannedAction({
        ...baseValid,
        userId: null,
        preapproval: upstreamAuthorized,
      })
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
      })
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
      })
    ).toBe("upsert:active");
  });
  it("upsert:active for authorized status", () => {
    expect(
      decidePlannedAction({ ...baseValid, preapproval: upstreamAuthorized })
    ).toBe("upsert:active");
  });
  it("update:canceled for paused", () => {
    expect(
      decidePlannedAction({ ...baseValid, preapproval: upstreamPaused })
    ).toBe("update:canceled");
  });
  it("update:canceled for cancelled", () => {
    expect(
      decidePlannedAction({ ...baseValid, preapproval: upstreamCancelled })
    ).toBe("update:canceled");
  });
  it("update:metadata_only for pending/unknown", () => {
    expect(
      decidePlannedAction({ ...baseValid, preapproval: upstreamPending })
    ).toBe("update:metadata_only");
  });
});