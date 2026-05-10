import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

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
    try {
      if (localStorage.getItem("agp_onboarding_completed") === "1") {
        window.location.replace("/");
        return;
      }
    } catch (_) {
      /* ignore */
    }
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <iframe
      src="/onboarding.html"
      title="AgilizaProf Onboarding"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        border: "none",
      }}
    />
  );
}