import type React from "react";

export const emptyStateCss = `
.es-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:32px 20px;border:1.5px dashed #E4E8F0;border-radius:14px;background:#fafbfd;gap:10px;color:#5B6B82;}
.es-icon{width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,#FFF1E8,#FFD7B5);color:#FF7A45;display:flex;align-items:center;justify-content:center;font-size:22px;}
.es-title{font-family:'Fraunces',serif;font-weight:700;font-size:15px;color:#1B2A4E;margin:0;}
.es-desc{font-size:12.5px;color:#64708A;max-width:340px;line-height:1.45;margin:0;}
.es-cta{margin-top:6px;display:inline-flex;align-items:center;gap:6px;background:#FF7A45;color:#fff;border:none;padding:8px 14px;border-radius:9px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;}
.es-cta:hover{filter:brightness(1.05);}
`;

export function EmptyState({
  icon = "✨",
  title,
  description,
  ctaLabel,
  onCta,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <div className="es-wrap" role="status">
      <div className="es-icon" aria-hidden>{icon}</div>
      <p className="es-title">{title}</p>
      {description && <p className="es-desc">{description}</p>}
      {ctaLabel && (
        <button type="button" className="es-cta" onClick={onCta}>+ {ctaLabel}</button>
      )}
    </div>
  );
}