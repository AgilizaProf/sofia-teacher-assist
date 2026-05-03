import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Inclusao } from "@/pages/Inclusao";

const schema = z.object({
  tab: fallback(z.enum(["anam", "pei", "plan", "reg", "rel", "doc"]), "anam").default("anam"),
});

export const Route = createFileRoute("/inclusao")({
  validateSearch: zodValidator(schema),
  head: () => ({
    meta: [
      { title: "Inclusão · PEI e pareceres — AgilizaProf" },
      { name: "description", content: "PEI, anamnese, registros e pareceres descritivos com a Sofia. Conforme Lei 14.254/2021 e BNCC Inclusão." },
      { property: "og:title", content: "Inclusão · PEI e pareceres — AgilizaProf" },
      { property: "og:description", content: "Acompanhamento PCD com PEI institucional, anamnese guiada e pareceres com IA." },
    ],
  }),
  component: Inclusao,
});
