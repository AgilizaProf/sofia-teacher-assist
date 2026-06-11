import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/$ref")({
  beforeLoad: ({ params }) => {
    const code = String(params.ref || "").toUpperCase();
    if (!/^[A-Z0-9]{4,12}$/.test(code)) {
      throw redirect({ to: "/" });
    }
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("pending_ref_code", code);
      } catch {
        /* ignore */
      }
      // Fire-and-forget — não atrasa o redirect.
      void import("@/lib/tracking").then(({ trackReferral }) =>
        trackReferral("ref_cadastro_via_link", { code, meta: { referrer: typeof document !== "undefined" ? document.referrer : "" } }),
      );
    }
    throw redirect({ to: "/auth", search: { ref: code } as never });
  },
  component: () => null,
});