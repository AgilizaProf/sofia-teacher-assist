import type { CurriculoMunicipal } from "@/hooks/useCurriculoMunicipal";
import { useEffect } from "react";

export type SeletorCurriculoProps = {
  curriculos: CurriculoMunicipal[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

/**
 * Seletor de referencial curricular (BNCC ou um dos currículos municipais ativos).
 * Renderiza pills compactas para uso inline em Relatórios e Planejamento.
 */
export function SeletorCurriculo({ curriculos, value, onChange, className }: SeletorCurriculoProps) {
  // Auto-selecionar o único currículo ativo se ainda estiver em BNCC e nenhum padrão BNCC explícito.
  useEffect(() => {
    if (curriculos.length === 1 && value === "bncc") {
      onChange(curriculos[0].id);
    }
  }, [curriculos, value, onChange]);

  const opcoes: Array<{ id: string; label: string }> = [
    { id: "bncc", label: "BNCC" },
    ...curriculos.map((c) => ({
      id: c.id,
      label: `Currículo — ${c.municipio}${c.estado ? ` (${c.estado})` : ""}`,
    })),
  ];

  return (
    <div
      className={className}
      role="radiogroup"
      aria-label="Selecionar referencial curricular"
      style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
    >
      {opcoes.map((op) => {
        const ativo = op.id === value;
        return (
          <button
            key={op.id}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => onChange(op.id)}
            style={{
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 999,
              border: `1px solid ${ativo ? "#FF7A45" : "#e2e5ea"}`,
              background: ativo ? "#FF7A45" : "#fff",
              color: ativo ? "#fff" : "#3a3f4b",
              fontWeight: 600,
              cursor: "pointer",
              lineHeight: 1.4,
              transition: "all .12s ease",
            }}
          >
            {op.label}
          </button>
        );
      })}
    </div>
  );
}

export default SeletorCurriculo;