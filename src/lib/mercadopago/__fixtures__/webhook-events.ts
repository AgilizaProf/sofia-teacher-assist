/**
 * Fixtures for Mercado Pago webhook tests.
 * The signed examples were generated against secret `TEST_SECRET`.
 */
export const TEST_SECRET = "TEST_SECRET";
export const TEST_REQUEST_ID = "11111111-1111-1111-1111-111111111111";
export const TEST_TS = "1700000000";
export const TEST_DATA_ID = "preapproval_abc123";

/** Pre-computed v1 = HMAC_SHA256(TEST_SECRET, manifest) */
// manifest = `id:preapproval_abc123;request-id:11111111-1111-1111-1111-111111111111;ts:1700000000;`
export const TEST_V1_VALID =
  "9043c6c34416cba51bce762e21e88dd52e7817e4e118a74a94e0529592b2be99";

export const preapprovalAuthorized = {
  type: "subscription_preapproval",
  action: "updated",
  data: { id: TEST_DATA_ID },
};
export const preapprovalPaused = {
  type: "subscription_preapproval",
  action: "updated",
  data: { id: TEST_DATA_ID },
};
export const preapprovalCancelled = {
  type: "subscription_preapproval",
  action: "updated",
  data: { id: TEST_DATA_ID },
};
export const paymentEvent = {
  type: "payment",
  action: "payment.created",
  data: { id: "pay_999" },
};

export const upstreamAuthorized = {
  id: TEST_DATA_ID,
  status: "authorized",
  payer_email: "user@example.com",
  next_payment_date: "2026-06-12T00:00:00.000Z",
  date_created: "2026-05-12T00:00:00.000Z",
};
export const upstreamPaused = { ...upstreamAuthorized, status: "paused" };
export const upstreamCancelled = { ...upstreamAuthorized, status: "cancelled" };
export const upstreamPending = { ...upstreamAuthorized, status: "pending" };
export const upstreamNoEmail = { ...upstreamAuthorized, payer_email: "" };