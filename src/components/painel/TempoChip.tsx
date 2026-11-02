import { useTempoEconomizado } from "@/lib/tempo/useTempoEconomizado";

// Contador pequeno "Tempo devolvido a você", igual em todas as páginas
// do visual Painel. O CSS fica em `tempoChipCss`.

const TIERS = [
  { max: 3, name: "Semente" },
  { max: 7, name: "Manhã livre" },
  { max: 19, name: "Dia inteiro" },
  { max: 39, name: "Rotina leve" },
  { max: 79, name: "Semana extra" },
  { max: 129, name: "Vida de volta" },
  { max: 199, name: "Mais leveza" },
  { max: 499, name: "Extraordinário" },
  { max: Infinity, name: "Lendário" },
];

export const tempoChipCss = `
.pn-strip{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.pn-chip{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 12px 0 6px;border-radius:10px;text-decoration:none;color:var(--pn-ink);font-size:13.5px;font-weight:600;white-space:nowrap;}
.pn-time{background:var(--pn-green-soft);border:1.5px solid var(--pn-green);}
.pn-time .ic{width:24px;height:24px;border-radius:7px;background:var(--pn-green);color:#fff;display:flex;align-items:center;justify-content:center;}
.pn-time .ic svg{width:14px;height:14px;}
.pn-time b{font-family:var(--pn-display);font-variant-numeric:tabular-nums;}
.pn-time .lvl{font-size:12px;font-weight:700;padding:2px 7px;border-radius:5px;background:#fff;}
@media (max-width:860px){.pn-time .lbl{display:none;}}
`;

export function TempoChip({ id }: { id?: string }) {
  const { minutos } = useTempoEconomizado();
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  const nivel = TIERS.find((t) => horas <= t.max)?.name ?? "Semente";
  return (
    <span id={id} className="pn-chip pn-time" title="Tempo que a plataforma já te devolveu">
      <span className="ic">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </span>
      <span>
        <span className="lbl">Tempo devolvido a você </span>
        <b suppressHydrationWarning>
          {horas}h {String(mins).padStart(2, "0")}min
        </b>
      </span>
      <span className="lvl" suppressHydrationWarning>
        {nivel}
      </span>
    </span>
  );
}
