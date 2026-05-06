import type React from "react";

export const verOfertaCss = `
.ver-oferta-btn{margin-top:6px;display:inline-flex;align-items:center;gap:4px;background:#F97316;color:#fff;padding:4px 8px;border-radius:7px;font-size:10px;font-weight:700;border:none;cursor:pointer;box-shadow:0 4px 10px rgba(249,115,22,.35);transition:background .15s;}
.ver-oferta-btn:hover{background:#EA580C;}
.ver-oferta-btn:focus-visible{outline:2px solid #FDBA74;outline-offset:2px;}
.ver-oferta-btn svg{width:11px;height:11px;}
`;

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label?: string;
};

export function VerOfertaButton({ label = "Ver oferta", className, ...rest }: Props) {
  return (
    <button
      type="button"
      aria-label="Ver oferta do plano anual"
      {...rest}
      className={`ver-oferta-btn${className ? ` ${className}` : ""}`}
    >
      {label}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    </button>
  );
}