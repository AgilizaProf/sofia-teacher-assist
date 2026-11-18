import { useEffect, useState } from "react";
import {
  CADERNOS_LIBERA_CURTO,
  CADERNOS_LIBERA_EM,
  CATALOGO_FOLHAS,
  TIPOS_FOLHA,
  tiposDeAcordo,
  type EtapaFolha,
} from "@/lib/cadernos/folhas";

// Bloco "Atividades em folha (PDF)": complemento à atividade da BNCC que a
// professora está buscando. Aparece só para Educação Infantil e Fundamental 1.
// Enquanto os cadernos estão trancados, mostra os seis tipos de folha com a
// prévia desfocada e a data de acesso, igual à página Cadernos. Quando o
// catálogo existir, mostra só os tipos que têm folha de acordo com a busca.

const PREVIAS = ["/cadernos/previa-1.jpg", "/cadernos/previa-2.jpg", "/cadernos/previa-3.jpg"];

const css = `
.fs{background:#fff;border:2px solid #14161F;border-radius:20px;box-shadow:4px 4px 0 #14161F;padding:18px;color:#14161F;font-family:'DM Sans',-apple-system,sans-serif;text-align:left;}
.fs-eyebrow{font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#0B7A55;}
.fs h2{margin:4px 0 4px;font-family:'Sora',sans-serif;font-weight:700;font-size:19px;letter-spacing:-.02em;line-height:1.2;}
.fs-sub{margin:0;font-size:14.5px;line-height:1.5;color:#596074;}
.fs-chips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0;padding:0;list-style:none;}
.fs-chips li{font-size:13px;font-weight:700;padding:4px 10px;border-radius:999px;background:#CDEFE2;border:1.5px solid #14161F;}
.fs-lock{display:flex;gap:8px;align-items:flex-start;margin:12px 0;padding:10px 12px;border-radius:12px;background:#FFE2A8;border:2px solid #14161F;font-size:14px;line-height:1.45;}
.fs-lock svg{width:18px;height:18px;flex:none;margin-top:1px;}
.fs-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;}
.fs-card{display:grid;gap:6px;padding:0;border:0;background:none;font:inherit;color:inherit;text-align:left;cursor:pointer;min-width:0;}
.fs-th{position:relative;display:block;border:1.5px solid #D6DBE5;border-radius:10px;overflow:hidden;background:#fff;aspect-ratio:210/170;}
.fs-card:hover .fs-th,.fs-card:focus-visible .fs-th{border-color:#14161F;}
.fs-th img{display:block;width:100%;height:100%;object-fit:cover;object-position:top;filter:blur(7px);-webkit-filter:blur(7px);transform:scale(1.08);}
.fs-selo{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:inline-flex;align-items:center;gap:5px;white-space:nowrap;padding:5px 8px;border-radius:9px;background:#14161F;color:#fff;font-size:12px;font-weight:700;box-shadow:2px 2px 0 #FFB224;}
.fs-selo svg{width:12px;height:12px;}
.fs-nome{font-size:14px;font-weight:700;line-height:1.2;}
.fs-res{font-size:12.5px;color:#596074;line-height:1.3;}
.fs-bg{position:fixed;inset:0;z-index:90;background:rgba(20,22,31,.5);display:flex;align-items:center;justify-content:center;padding:16px;}
.fs-modal{width:100%;max-width:440px;background:#fff;border:2px solid #14161F;border-radius:20px;box-shadow:6px 6px 0 #14161F;padding:20px;color:#14161F;font-family:'DM Sans',-apple-system,sans-serif;}
.fs-modal h3{margin:0 0 8px;font-family:'Sora',sans-serif;font-size:20px;letter-spacing:-.03em;}
.fs-modal p{margin:0 0 14px;font-size:15px;line-height:1.5;}
.fs-ok{height:44px;padding:0 18px;border-radius:12px;border:2px solid #14161F;background:#0B7A55;color:#fff;font:inherit;font-weight:700;box-shadow:3px 3px 0 #14161F;cursor:pointer;}
@media (max-width:1100px){.fs-grid{grid-template-columns:repeat(3,minmax(0,1fr));}}
@media (max-width:520px){.fs{padding:14px;border-radius:18px;box-shadow:3px 3px 0 #14161F;}.fs-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
`;

function Cadeado() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function FolhasSugeridas(props: {
  etapa: EtapaFolha | null;
  ano?: string;
  componentes?: string[];
  habilidades?: string[];
  className?: string;
}) {
  const { etapa, ano, className } = props;
  const componentes = (props.componentes ?? []).filter(Boolean);
  const habilidades = (props.habilidades ?? []).filter(Boolean);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!aviso) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAviso(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aviso]);

  // Só Educação Infantil e Fundamental 1 têm atividades em folha.
  if (!etapa) return null;

  // Com catálogo: só os tipos que têm folha de acordo com a busca.
  // Sem catálogo (cadernos trancados): os seis tipos, todos desfocados.
  const tipos = CATALOGO_FOLHAS.length
    ? TIPOS_FOLHA.filter((t) =>
        tiposDeAcordo({ etapa, ano, componentes, habilidades }).includes(t.id),
      )
    : TIPOS_FOLHA;
  if (tipos.length === 0) return null;

  const chips = [
    etapa === "infantil" ? "Educação Infantil" : "Fundamental 1",
    ano,
    ...componentes.slice(0, 3),
    ...habilidades.slice(0, 3),
  ].filter((c, i, a): c is string => !!c && a.indexOf(c) === i);

  return (
    <section className={"fs" + (className ? " " + className : "")} aria-labelledby="fs-h">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <span className="fs-eyebrow">Complemento</span>
      <h2 id="fs-h">Atividades em folha (PDF)</h2>
      <p className="fs-sub">
        Junto com a atividade da BNCC, o app sugere as folhas prontas para imprimir. Aparecem só as
        que estão de acordo com a sua busca.
      </p>
      <ul className="fs-chips" aria-label="Sua busca">
        {chips.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>

      <div className="fs-lock" role="note">
        <Cadeado />
        <span>
          <b>Acesso a partir de {CADERNOS_LIBERA_EM}.</b> Até lá, as folhas aparecem desfocadas.
        </span>
      </div>

      <div className="fs-grid">
        {tipos.map((t, i) => (
          <button
            type="button"
            className="fs-card"
            key={t.id}
            aria-label={`${t.nome}: acesso a partir de ${CADERNOS_LIBERA_EM}`}
            onClick={() => setAviso(t.nome)}
          >
            <span className="fs-th">
              <img src={PREVIAS[i % PREVIAS.length]} alt="" loading="lazy" />
              <span className="fs-selo">
                <Cadeado />a partir de {CADERNOS_LIBERA_CURTO}
              </span>
            </span>
            <span className="fs-nome">{t.nome}</span>
            <span className="fs-res">{t.resumo}</span>
          </button>
        ))}
      </div>

      {aviso && (
        <div className="fs-bg" onClick={() => setAviso(null)}>
          <div
            className="fs-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fs-modal-h"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="fs-modal-h">{aviso}</h3>
            <p>
              Acesso a partir de {CADERNOS_LIBERA_EM}. Nessa data, a folha em PDF fica disponível
              para ver e imprimir.
            </p>
            <button type="button" className="fs-ok" autoFocus onClick={() => setAviso(null)}>
              Entendi
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
