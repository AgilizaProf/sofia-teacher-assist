import { useState } from "react";
import { Shield, ChevronDown } from "lucide-react";
import { AppSidebar, sidebarCss } from "@/components/AppSidebar";
import { Header as AppHeader } from "@/components/Header";
import { SOFIA_CONSTITUTION, SOFIA_CONSTITUTION_VERSION } from "@/lib/sofia-constitution";
import { ProfileEditor } from "@/components/settings/ProfileEditor";
import { ReferralCard } from "@/components/settings/ReferralCard";
import { PlanoCard } from "@/components/settings/PlanoCard";
import { useReducedMotion, type ReducedMotionMode } from "@/hooks/useReducedMotion";
import { useFontSize, useHighContrast, type FontSizeMode, type HighContrastMode } from "@/hooks/useA11y";

const PRINCIPLES: Array<{ n: number; emoji: string; name: string; summary: string }> = [
  { n: 1, emoji: "📋", name: "Dados reais", summary: "A Sofia só usa o que você cadastrou. Nunca inventa." },
  { n: 2, emoji: "📚", name: "BNCC", summary: "Todo plano e parecer cita habilidades BNCC oficiais." },
  { n: 3, emoji: "💛", name: "Linguagem humanizada", summary: "Zero linguagem capacitista. Pessoa antes da condição." },
  { n: 4, emoji: "⚖️", name: "Legalidade", summary: "Respeita LBI, Lei 14.254/2021, LDB, ECA, LGPD e BNCC." },
  { n: 5, emoji: "🎓", name: "Autores de referência", summary: "Apoiada em Freire, Vygotsky, Mantoan e mais." },
  { n: 6, emoji: "🔍", name: "Transparência", summary: "Toda resposta mostra fontes, habilidades e base teórica." },
  { n: 7, emoji: "✍️", name: "Sua autoria", summary: "Você é a autora. A Sofia é apoio, nunca substitui." },
  { n: 8, emoji: "🤝", name: "Educação inclusiva", summary: "Adapta automaticamente para alunos PCD, considerando CIDs e acessibilidade." },
  { n: 9, emoji: "🧒", name: "Faixa etária e desenvolvimento", summary: "Sugestões sempre adequadas à fase cognitiva, emocional e social da turma." },
  { n: 10, emoji: "🧠", name: "Atualização pedagógica", summary: "Apoiada em metodologias atuais: ABP, neurociência, socioemocional, design thinking." },
  { n: 11, emoji: "🔒", name: "Confidencialidade", summary: "Trata dados de alunos com sigilo total, conforme LGPD e ECA." },
  { n: 12, emoji: "🫶", name: "Saúde mental do(a) educador(a)", summary: "A Sofia alivia. Nunca cobra. Soluções aplicáveis à realidade da escola brasileira." },
  { n: 13, emoji: "📈", name: "Progressividade", summary: "A Sofia não vê retratos. Vê percursos. Compara registros anteriores para revelar avanços." },
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
  const [principlesOpen, setPrinciplesOpen] = useState(false);
  const [a11yOpen, setA11yOpen] = useState(false);
  const { mode: rmMode, setMode: setRmMode } = useReducedMotion();
  const { mode: fsMode, setMode: setFsMode } = useFontSize();
  const { mode: hcMode, setMode: setHcMode } = useHighContrast();

  const RM_OPTS: Array<{ v: ReducedMotionMode; label: string; desc: string }> = [
    { v: "system", label: "Seguir sistema", desc: "Usa a preferência do seu dispositivo." },
    { v: "on", label: "Ativado", desc: "Reduz animações em todo o app." },
    { v: "off", label: "Desativado", desc: "Mantém todas as animações." },
  ];
  const FS_OPTS: Array<{ v: FontSizeMode; label: string; desc: string }> = [
    { v: "normal", label: "Normal", desc: "Tamanho padrão do app." },
    { v: "large", label: "Grande", desc: "Aumenta o texto em 15%." },
    { v: "extra-large", label: "Muito grande", desc: "Aumenta o texto em 30%." },
  ];
  const HC_OPTS: Array<{ v: HighContrastMode; label: string; desc: string }> = [
    { v: "off", label: "Desativado", desc: "Aparência padrão." },
    { v: "on", label: "Ativado", desc: "Aumenta o contraste de textos e bordas." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6FB", color: "#1B2A4E", fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: sidebarCss }} />
      <style>{`
        .cfg-grid { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
        .cfg-pad { padding: 24px 36px 0; width: 100%; max-width: 100%; }
        .cfg-pad-b { padding: 16px 36px 32px; width: 100%; max-width: 100%; }
        @media (max-width: 900px) {
          .cfg-grid { grid-template-columns: 1fr; }
          .cfg-pad { padding: 20px 20px 0; }
          .cfg-pad-b { padding: 14px 20px 28px; }
        }
        @media (max-width: 560px) {
          .cfg-pad { padding: 16px 14px 0; }
          .cfg-pad-b { padding: 12px 14px 24px; }
          .cfg-section { padding: 18px !important; }
        }
      `}</style>
      <div className="cfg-grid">
        <AppSidebar active="settings" />
        <main style={{ width: "100%", minWidth: 0 }}>
          <AppHeader />
          <div className="cfg-pad">
            <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 28, fontWeight: 700, margin: 0 }}>Configurações</h1>
            <p style={{ color: "#6B7691", fontSize: 14, marginTop: 4 }}>Ajustes da sua conta e princípios da Sofia.</p>
          </div>
          <div className="cfg-pad-b">

          <section className="cfg-section" aria-labelledby="perfil-title" style={{ background: "#fff", border: "1px solid #E4E8F0", borderRadius: 14, padding: 24, marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h2 id="perfil-title" style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 700, margin: 0 }}>
                👤 Meu perfil
              </h2>
            </div>
            <p style={{ color: "#6B7691", fontSize: 13, margin: "0 0 18px" }}>
              Seus dados ficam privados. Só você consegue ver e editar.
            </p>
            <ProfileEditor />
          </section>

          <PlanoCard />

          <section id="convide" aria-labelledby="indique-title" style={{ marginBottom: 18, scrollMarginTop: 80 }}>
            <h2 id="indique-title" style={{ position: "absolute", left: -9999 }}>Programa de indicação</h2>
            <ReferralCard />
          </section>

          <section className="cfg-section" aria-labelledby="acessibilidade-title" style={{ background: "#fff", border: "1px solid #E4E8F0", borderRadius: 14, padding: 24, marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h2 id="acessibilidade-title" style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 700, margin: 0, flex: 1 }}>
                ♿ Acessibilidade
              </h2>
              <button
                type="button"
                onClick={() => setA11yOpen((v) => !v)}
                aria-expanded={a11yOpen}
                aria-controls="a11y-content"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: a11yOpen ? "#FF7A45" : "transparent",
                  color: a11yOpen ? "#fff" : "#FF7A45",
                  border: "1px solid #FF7A45",
                  padding: "6px 10px", borderRadius: 8, fontWeight: 600, fontSize: 12,
                  cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                {a11yOpen ? "Recolher" : "Expandir"}
                <ChevronDown size={14} style={{ transform: a11yOpen ? "rotate(180deg)" : "none", transition: ".2s" }} />
              </button>
            </div>
            {a11yOpen && (
              <div id="a11y-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <p style={{ color: "#6B7691", fontSize: 13, margin: 0 }}>
                  Ajuste como o app se comporta para tornar a navegação mais confortável. As preferências são salvas automaticamente.
                </p>

                {/* Tamanho do texto */}
                <div role="radiogroup" aria-label="Tamanho do texto" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1B2A4E" }}>Tamanho do texto</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
                    {FS_OPTS.map((opt) => {
                      const on = fsMode === opt.v;
                      return (
                        <button key={opt.v} type="button" role="radio" aria-checked={on} onClick={() => setFsMode(opt.v)}
                          style={{ textAlign: "left", padding: "12px 14px", borderRadius: 10, border: on ? "2px solid #FF7A45" : "1px solid #E4E8F0", background: on ? "#FFF1E8" : "#fff", color: "#1B2A4E", cursor: "pointer" }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{opt.label}</div>
                          <div style={{ fontSize: 12, color: "#6B7691", marginTop: 2 }}>{opt.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Alto contraste */}
                <div role="radiogroup" aria-label="Alto contraste" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1B2A4E" }}>Alto contraste</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
                    {HC_OPTS.map((opt) => {
                      const on = hcMode === opt.v;
                      return (
                        <button key={opt.v} type="button" role="radio" aria-checked={on} onClick={() => setHcMode(opt.v)}
                          style={{ textAlign: "left", padding: "12px 14px", borderRadius: 10, border: on ? "2px solid #FF7A45" : "1px solid #E4E8F0", background: on ? "#FFF1E8" : "#fff", color: "#1B2A4E", cursor: "pointer" }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{opt.label}</div>
                          <div style={{ fontSize: 12, color: "#6B7691", marginTop: 2 }}>{opt.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Reduzir movimento */}
                <div role="radiogroup" aria-label="Reduzir movimento" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1B2A4E" }}>Reduzir movimento</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
                    {RM_OPTS.map((opt) => {
                      const on = rmMode === opt.v;
                      return (
                        <button key={opt.v} type="button" role="radio" aria-checked={on} onClick={() => setRmMode(opt.v)}
                          style={{ textAlign: "left", padding: "12px 14px", borderRadius: 10, border: on ? "2px solid #FF7A45" : "1px solid #E4E8F0", background: on ? "#FFF1E8" : "#fff", color: "#1B2A4E", cursor: "pointer" }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{opt.label}</div>
                          <div style={{ fontSize: 12, color: "#6B7691", marginTop: 2 }}>{opt.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="cfg-section" aria-labelledby="principios-title" style={{ background: "#fff", border: "1px solid #E4E8F0", borderRadius: 14, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Shield size={20} color="#FF7A45" />
              <h2 id="principios-title" style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 700, margin: 0, flex: 1 }}>
                🛡️ Princípios da Sofia
              </h2>
              <button
                type="button"
                onClick={() => setPrinciplesOpen((v) => !v)}
                aria-expanded={principlesOpen}
                aria-controls="principios-content"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: principlesOpen ? "#FF7A45" : "transparent",
                  color: principlesOpen ? "#fff" : "#FF7A45",
                  border: "1px solid #FF7A45",
                  padding: "6px 10px", borderRadius: 8, fontWeight: 600, fontSize: 12,
                  cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                {principlesOpen ? "Recolher" : "Expandir"}
                <ChevronDown size={14} style={{ transform: principlesOpen ? "rotate(180deg)" : "none", transition: ".2s" }} />
              </button>
            </div>

            {principlesOpen && (
            <div id="principios-content">
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
            </div>
            )}
          </section>
          </div>
        </main>
      </div>
    </div>
  );
}
