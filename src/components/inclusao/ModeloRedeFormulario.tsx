import { useMemo } from "react";
import { PEISuggestions, appendText } from "./PEISuggestions";
import { campoDoModelo } from "@/lib/pei/camposModelo";
import type { Lacuna } from "@/lib/pei/modeloRede";
import type { NivelBncc } from "@/lib/pei/bncc";

const inputCss: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  fontSize: 13,
  fontFamily: "inherit",
  background: "#fff",
  color: "var(--text)",
};
const labelCss: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "var(--text)",
  marginBottom: 4,
  display: "block",
};

type Props = {
  lacunas: Lacuna[];
  valores: Record<string, string>;
  onChange: (id: string, valor: string) => void;
  /** Ids que a Sofia acabou de preencher (aparecem destacados). */
  daSofia: Set<string>;
  etapaPrefix?: string;
  nivelBncc: NivelBncc | null;
};

/**
 * O documento da rede, campo a campo, na mesma ordem e com as mesmas seções.
 * Cada campo tem as sugestões rápidas do PEI e, nos pedagógicos, a BNCC.
 */
export function ModeloRedeFormulario({
  lacunas,
  valores,
  onChange,
  daSofia,
  etapaPrefix,
  nivelBncc,
}: Props) {
  const grupos = useMemo(() => {
    const g: Array<{ secao: string; itens: Lacuna[] }> = [];
    for (const l of lacunas) {
      const ult = g[g.length - 1];
      if (ult && ult.secao === l.secao) ult.itens.push(l);
      else g.push({ secao: l.secao, itens: [l] });
    }
    return g;
  }, [lacunas]);

  return (
    <>
      {grupos.map((g, gi) => (
        <div
          key={gi}
          style={{
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 14,
            marginBottom: 12,
          }}
        >
          {g.secao && (
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, color: "#1F4FB8" }}>
              {g.secao}
            </div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {g.itens.map((l) => {
              const c = campoDoModelo(l);
              const v = valores[l.id] || "";
              const destaque = daSofia.has(l.id) && v.trim();
              const borda: React.CSSProperties = destaque
                ? { borderColor: "#7C9CF0", background: "#F5F8FF" }
                : {};
              return (
                <div
                  key={l.id}
                  style={{
                    flex: c.curto || l.tipo === "opcoes" ? "1 1 260px" : "1 1 100%",
                    minWidth: 0,
                  }}
                >
                  <label style={labelCss} htmlFor={`mr-${l.id}`}>
                    {l.rotulo}
                    {destaque && (
                      <span
                        style={{ fontWeight: 600, color: "#1F4FB8", marginLeft: 6, fontSize: 11 }}
                      >
                        ✨ Sofia
                      </span>
                    )}
                  </label>
                  {l.tipo === "opcoes" ? (
                    <Opcoes opcoes={l.opcoes || []} valor={v} onChange={(x) => onChange(l.id, x)} />
                  ) : c.curto ? (
                    <input
                      id={`mr-${l.id}`}
                      style={{ ...inputCss, ...borda }}
                      value={v}
                      onChange={(e) => onChange(l.id, e.target.value)}
                    />
                  ) : (
                    <>
                      <textarea
                        id={`mr-${l.id}`}
                        style={{ ...inputCss, ...borda, minHeight: 64 }}
                        value={v}
                        onChange={(e) => onChange(l.id, e.target.value)}
                      />
                      {(c.sugestao || c.bncc) && (
                        <PEISuggestions
                          fieldKey={c.sugestao || "__sem__"}
                          prefix={etapaPrefix}
                          bncc={c.bncc ? { campo: c.bncc, nivel: nivelBncc } : undefined}
                          onPick={(t) => onChange(l.id, appendText(v, t))}
                        />
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

/** Valor das opções: números marcados separados por vírgula ("1,3"), como no preenchimento. */
function Opcoes({
  opcoes,
  valor,
  onChange,
}: {
  opcoes: string[];
  valor: string;
  onChange: (v: string) => void;
}) {
  const marcadas = new Set(
    valor
      .split(/[^0-9]+/)
      .filter(Boolean)
      .map((n) => parseInt(n, 10)),
  );
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {opcoes.map((o, i) => {
        const on = marcadas.has(i + 1);
        return (
          <button
            key={i}
            type="button"
            onClick={() => {
              const n = new Set(marcadas);
              if (on) n.delete(i + 1);
              else n.add(i + 1);
              onChange([...n].sort((a, b) => a - b).join(","));
            }}
            style={{
              fontSize: 12,
              padding: "5px 10px",
              borderRadius: 999,
              border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
              background: on ? "var(--accent-soft)" : "#fff",
              color: on ? "#096746" : "var(--text)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {on ? "☒ " : "☐ "}
            {o}
          </button>
        );
      })}
    </div>
  );
}
