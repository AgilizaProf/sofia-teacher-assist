import { describe, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {} as any,
}));

import { Route } from "@/routes/api/public/webhooks/mercadopago";

describe("probe", () => {
  it("dump", () => {
    const r: any = Route;
    // eslint-disable-next-line no-console
    console.log("KEYS", Object.keys(r));
    console.log("OPTS", Object.keys(r.options || {}));
    console.log("SRV", Object.keys((r.options?.server) || {}));
    console.log("HND", typeof r.options?.server?.handlers, Object.keys((r.options?.server?.handlers) || {}));
  });
});
