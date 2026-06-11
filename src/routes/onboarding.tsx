import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { markOnboardingDone, shouldShowOnboarding } from "@/lib/onboarding";
import { trackEvent } from "@/lib/tracking";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "AgilizaProf · Onboarding" },
      { name: "description", content: "Configure sua conta AgilizaProf em poucos passos." },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    trackEvent("onboarding_iniciado", { location: "onboarding" });
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const uid = data.user?.id;
        if (uid) {
          const show = await shouldShowOnboarding(uid);
          if (!show) {
            window.location.replace("/");
            return;
          }
        }
      } catch {
        /* ignore — fail open */
      }
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // Listen for completion signal from the iframe and persist to Supabase.
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e?.data;
      if (d && typeof d === "object" && d.type === "agp_onboarding_done") {
        trackEvent("onboarding_concluido", { location: "onboarding" });
        const lead = (d.lead && typeof d.lead === "object")
          ? { name: typeof d.lead.name === "string" ? d.lead.name : undefined,
              phone: typeof d.lead.phone === "string" ? d.lead.phone : undefined }
          : undefined;
        const route = typeof d.route === "string" && d.route.startsWith("/") ? d.route : "/";
        // Persiste ANTES de navegar. Como a navegação é de página inteira
        // (o conteúdo vive num <iframe>), navegar antes abortava o UPDATE no
        // Supabase — daí nome/telefone às vezes não chegavam e o onboarding
        // reaparecia. Aguardamos a gravação e, dê certo ou não, seguimos.
        void (async () => {
          try { await markOnboardingDone(lead); }
          finally { window.location.assign(route); }
        })();
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  if (!ready) return null;

  return (
    <iframe
      src="/onboarding.html"
      title="AgilizaProf Onboarding"
      scrolling="yes"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        border: "none",
        display: "block",
      }}
    />
  );
}
