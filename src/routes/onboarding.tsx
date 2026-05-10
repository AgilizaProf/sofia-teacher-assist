import { createFileRoute } from "@tanstack/react-router";

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