import { useState } from "react";
import { Shield, ChevronDown, Download } from "lucide-react";
import { AppSidebar, sidebarCss } from "@/components/AppSidebar";
import { SOFIA_CONSTITUTION, SOFIA_CONSTITUTION_VERSION } from "@/lib/sofia-constitution";

const PRINCIPLES: Array<{ n: number; emoji: string; name: string; summary: string }> = [
  { n: 1, emoji: "📋", name: "Dados reais", summary: "A Sofia só usa o que você cadastrou. Nunca inventa." },
  { n: 2, emoji: "📚", name: "BNCC", summary: "Todo plano e parecer cita habilidades BNCC oficiais." },
  { n: 3, emoji: "💛", name: "Linguagem humanizada", summary: "Zero linguagem capacitista. Pessoa antes da condição." },
  { n: 4, emoji: "⚖️", name: "Legalidade", summary: "Respeita LBI, Lei 14.254/2021, LDB, ECA, LGPD e BNCC." },
  { n: 5, emoji: "🎓", name: "Autores de referência", summary: "Apoiada em Freire, Vygotsky, Mantoan e mais." },
  { n: 6, emoji: "🔍", name: "Transparência", summary: "Toda resposta mostra fontes, habilidades e base teórica." },
  { n: 7, emoji: "✍️", name: "Sua autoria", summary: "Você é a autora. A Sofia é apoio, nunca substitui." },
];

function getPrincipleBody(idx: number): string {
  // Split SOFIA_CONSTITUTION by numbered headers "1.", "2." ... "8." or "REGRA DE OURO"
  const text = SOFIA_CONSTITUTION;
  const re = /(^|\n)(\d+)\.\s/g;
  const matches: Array<{ n: number; start: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    matches.push({ n: parseInt(m[2], 10), start: m.index + (m[1] ? 1 : 0) });
  }
  const target = matches.find((x) => x.n === idx);
  if (!target) return "";
  const next = matches.find((x) => x.start > target.start);
  const end = next ? next.start : text.indexOf("\nREGRA DE OURO", target.start);
  return text.slice(target.start, end > target.start ? end : text.length).trim();
}

export function Configuracoes() {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const toggle = (n: number) => setOpen((o) => ({ ...o, [n]: !o[n] }));

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6FB", color: "#1B2A4E", fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: sidebarCss }} />
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
        <AppSidebar active="settings" />
        <main style={{ padding: "32px 36px", maxWidth: 920, width: "100%" }}>
          <header style={{ marginBottom: 24 }}>
            <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 28, fontWeight: 700, margin: 0 }}>Configurações</h1>
            <p style={{ color: "#6B7691", fontSize: 14, marginTop: 4 }}>Ajustes da sua conta e princípios da Sofia.</p>
          </header>

          <section aria-labelledby="principios-title" style={{ background: "#fff", border: "1px solid #E4E8F0", borderRadius: 14, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Shield size={20} color="#FF7A45" />
              <h2 id="principios-title" style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 700, margin: 0 }}>
                🛡️ Princípios da Sofia
              </h2>
            </div>

            <div
              role="status"
              style={{
                background: "#FFF1E8",
                border: "1px solid #FED7AA",
                color: "#7C2D12",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 13,
                marginBottom: 18,
              }}
            >
              🛡️ Versão {SOFIA_CONSTITUTION_VERSION} · atualizada para a versão atual da BNCC e legislação brasileira
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PRINCIPLES.map((p) => {
                const isOpen = !!open[p.n];
                return (
                  <div key={p.n} style={{ border: "1px solid #E4E8F0", borderRadius: 12, background: "#FBFAF6" }}>
                    <div style={{ padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ fontSize: 22, lineHeight: 1 }} aria-hidden>{p.emoji}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                          {p.n}. {p.name}
                        </div>
                        <div style={{ color: "#6B7691", fontSize: 13, marginTop: 2 }}>{p.summary}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggle(p.n)}
                        aria-expanded={isOpen}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          background: isOpen ? "#FF7A45" : "transparent",
                          color: isOpen ? "#fff" : "#FF7A45",
                          border: "1px solid #FF7A45",
                          padding: "6px 10px", borderRadius: 8, fontWeight: 600, fontSize: 12,
                          cursor: "pointer", whiteSpace: "nowrap",
                        }}
                      >
                        {isOpen ? "Recolher" : "Ler na íntegra"}
                        <ChevronDown size={14} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: ".2s" }} />
                      </button>
                    </div>
                    {isOpen && (
                      <div style={{ padding: "0 14px 14px 48px", color: "#1B2A4E", fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {getPrincipleBody(p.n)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                title="Em breve"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "#fff", color: "#1B2A4E",
                  border: "1px solid #E4E8F0", borderRadius: 10,
                  padding: "10px 14px", fontWeight: 600, fontSize: 13, cursor: "not-allowed", opacity: .85,
                }}
              >
                <Download size={14} /> Baixar Constituição em PDF
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}