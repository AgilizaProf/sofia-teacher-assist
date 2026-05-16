import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AppSidebar, sidebarCss } from "@/components/AppSidebar";
import { Header as AppHeader } from "@/components/Header";
import { GerarDocumentoButton } from "@/components/documentos/DocumentoDialog";
import type { DocumentoTipo } from "@/lib/documentos/types";

export const Route = createFileRoute("/documentos")({
  head: () => ({
    meta: [
      { title: "Planejamento de Documentos · AgilizaProf" },
      { name: "description", content: "Gere planejamentos formatados (PDF e Word) a partir de Atividades, PCD, Trilhas e sugestões da Sofia." },
    ],
  }),
  component: DocumentosPage,
});

const TABS: { value: DocumentoTipo; label: string; descricao: string }[] = [
  { value: "atividades", label: "📝 Atividades", descricao: "Planejamento semanal de atividades por turma, com objetivos BNCC e materiais." },
  { value: "pcd",        label: "🌈 Atividades PCD", descricao: "Planejamento inclusivo a partir dos alunos PCD e seus PEI cadastrados." },
  { value: "trilhas",    label: "🗓️ Trilhas Semestrais", descricao: "Documento da trilha semestral da turma, semana a semana." },
  { value: "sofia",      label: "🤖 Sugestões da Sofia", descricao: "Planejamento baseado nas sugestões e foco do dia da Sofia." },
];

function DocumentosPage() {
  const [tipo, setTipo] = useState<DocumentoTipo>("atividades");
  const ativa = TABS.find((t) => t.value === tipo) ?? TABS[0];
  return (
    <div className="pl-app" style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
      <style>{sidebarCss}</style>
      <AppSidebar />
      <div className="pl-main" style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <AppHeader />
        <main className="p-6 max-w-5xl w-full mx-auto">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>
              Planejamento de Documentos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Escolha o tipo de planejamento, preencha os dados básicos e gere o documento formatado para impressão, PDF ou Word.
            </p>
          </header>

          <Tabs value={tipo} onValueChange={(v) => setTipo(v as DocumentoTipo)}>
            <TabsList className="flex flex-wrap h-auto">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
              ))}
            </TabsList>

            {TABS.map((t) => (
              <TabsContent key={t.value} value={t.value} className="mt-6">
                <div className="rounded-lg border bg-card p-6">
                  <h2 className="text-lg font-semibold mb-2">{t.label}</h2>
                  <p className="text-sm text-muted-foreground mb-4">{t.descricao}</p>
                  <GerarDocumentoButton tipo={t.value} label={`Gerar ${ativa.label.replace(/^[^\s]+\s/, "")}`} />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </main>
      </div>
    </div>
  );
}