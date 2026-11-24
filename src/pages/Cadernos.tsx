import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { PainelNav, painelTokensCss, ICONS } from "@/components/painel/PainelNav";

// Cadernos prontos. Até 13/03/2027 a professora vê só a prévia desfocada
// (3 miniaturas reais das fichas, em public/cadernos/previa-N.jpg) e a data de
// liberação. A partir dessa data, e antes disso para o admin, a página vira a
// busca real: disciplina, código da BNCC ou assunto, com cada atividade e
// todos os PDFs onde ela aparece (ver CadernosBusca e lib/cadernos/catalogo).

import { CADERNOS_LIBERA_EM, CADERNOS_LIBERA_CURTO, TIPOS_FOLHA } from "@/lib/cadernos/folhas";
import { cadernosLiberados } from "@/lib/cadernos/catalogo";
import { CadernosBusca } from "@/components/cadernos/CadernosBusca";
import { useIsAdmin } from "@/lib/admin/useIsAdmin";

export { CADERNOS_LIBERA_EM };

const PREVIAS = ["/cadernos/previa-1.jpg", "/cadernos/previa-2.jpg", "/cadernos/previa-3.jpg"];

const css = `
.cd{min-height:100dvh;padding-bottom:40px;}
.cd-wrap{max-width:1100px;margin:0 auto;padding:22px 24px 0;}
.cd-eyebrow{font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--pn-green);}
.cd-title{margin:6px 0 4px;font-family:var(--pn-display);font-weight:800;font-size:32px;letter-spacing:-.045em;line-height:1.05;}
.cd-sub{margin:0;color:var(--pn-muted);font-size:15px;line-height:1.5;max-width:62ch;}
.cd-lock{display:flex;gap:10px;align-items:flex-start;margin:16px 0;padding:12px 16px;border-radius:14px;background:var(--pn-cream);border:2px solid var(--pn-ink);font-size:15px;line-height:1.45;}
.cd-lock svg{width:20px;height:20px;flex:none;margin-top:1px;}
.cd-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;}
.cd-card{background:var(--pn-surface);border:1.5px solid var(--pn-line);border-radius:16px;padding:10px;display:grid;gap:10px;}
.cd-th{position:relative;display:block;width:100%;padding:0;border:1px solid var(--pn-line);border-radius:10px;overflow:hidden;background:#fff;cursor:pointer;aspect-ratio:210/240;}
.cd-th img{display:block;width:100%;height:100%;object-fit:cover;object-position:top;filter:blur(7px);-webkit-filter:blur(7px);transform:scale(1.06);}
.cd-selo{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:inline-flex;align-items:center;gap:6px;white-space:nowrap;
  padding:6px 10px;border-radius:10px;background:var(--pn-ink);color:#fff;font-size:13px;font-weight:700;box-shadow:3px 3px 0 var(--pn-sun);}
.cd-selo svg{width:14px;height:14px;}
.cd-acts{display:flex;gap:6px;flex-wrap:wrap;}
.cd-acts button{height:34px;padding:0 12px;border-radius:9px;border:1.5px solid var(--pn-line);background:#fff;font-family:inherit;font-size:13.5px;font-weight:700;color:var(--pn-muted);cursor:pointer;display:inline-flex;align-items:center;gap:5px;}
.cd-acts button svg{width:13px;height:13px;}
.cd-acts button:hover{border-color:var(--pn-ink);color:var(--pn-ink);}
.cd-what{margin-top:22px;background:var(--pn-surface);border:1.5px solid var(--pn-line);border-radius:18px;padding:18px;}
.cd-what h2{margin:0 0 10px;font-family:var(--pn-display);font-size:18px;}
.cd-what ul{margin:0;padding-left:20px;display:grid;gap:6px;font-size:15px;line-height:1.45;}
.cd-what p{margin:12px 0 0;font-size:14px;color:var(--pn-muted);}
.cd-what a{color:var(--pn-green);font-weight:700;}
.cd-bg{position:fixed;inset:0;z-index:80;background:rgba(20,22,31,.5);display:flex;align-items:center;justify-content:center;padding:16px;}
.cd-modal{width:100%;max-width:520px;max-height:90vh;overflow:auto;background:var(--pn-surface);border:2px solid var(--pn-ink);border-radius:20px;box-shadow:6px 6px 0 var(--pn-ink);padding:20px;}
.cd-modal h2{margin:0 0 12px;font-family:var(--pn-display);font-size:22px;letter-spacing:-.03em;}
.cd-prev{position:relative;border:1.5px solid var(--pn-line);border-radius:12px;overflow:hidden;max-height:52vh;background:#fff;}
.cd-prev img{display:block;width:100%;filter:blur(12px);-webkit-filter:blur(12px);transform:scale(1.04);}
.cd-tag{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:var(--pn-ink);color:#fff;border-radius:16px;padding:18px 22px;display:grid;gap:4px;justify-items:center;text-align:center;box-shadow:4px 4px 0 var(--pn-sun);width:min(340px,86%);}
.cd-tag b{font-family:var(--pn-display);font-size:20px;}
.cd-tag span{font-size:13.5px;opacity:.9;}
@media (max-width:860px){
  .cd{padding-bottom:110px;}
  .cd-wrap{padding:16px max(16px,env(safe-area-inset-right,0px)) 0 max(16px,env(safe-area-inset-left,0px));}
  .cd-title{font-size:27px;}
  .cd-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
  .cd-grid .cd-card:nth-child(3){display:none;}
}
@media (max-width:380px){.cd-acts button{padding:0 9px;}}
`;

function Svg({ children }: { children: ReactNode }) {
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
      {children}
    </svg>
  );
}

export function Cadernos() {
  const { ready, isAdmin } = useIsAdmin();
  const liberado = cadernosLiberados();
  if (liberado || (ready && isAdmin)) return <CadernosAbertos admin={!liberado} />;
  return <CadernosTrancados />;
}

function CadernosAbertos({ admin }: { admin: boolean }) {
  return (
    <div className="pn cd">
      <style dangerouslySetInnerHTML={{ __html: painelTokensCss + css }} />
      <PainelNav />
      <main className="cd-wrap">
        <span className="cd-eyebrow">Cadernos prontos</span>
        <h1 className="cd-title">Atividades prontas para imprimir</h1>
        <p className="cd-sub">
          Procure pela disciplina, pelo código da BNCC ou pelo assunto. Cada atividade mostra todos
          os cadernos onde ela está e abre o PDF direto na página certa.
        </p>
        {admin && (
          <div className="cd-lock" role="note">
            <Svg>{ICONS.lock}</Svg>
            <span>
              <b>Prévia de administrador.</b> As professoras continuam vendo o cadeado até{" "}
              {CADERNOS_LIBERA_EM}. Os PDFs são enviados em{" "}
              <Link to="/admin/cadernos">Admin › Cadernos</Link>.
            </span>
          </div>
        )}
        <CadernosBusca />
        <p className="cd-sub" style={{ marginTop: 22 }}>
          Quer uma atividade nova sobre outro tema?{" "}
          <Link to="/planejamento/atividade" style={{ color: "var(--pn-green)", fontWeight: 700 }}>
            Criar com a Sofia
          </Link>
          .
        </p>
      </main>
    </div>
  );
}

function CadernosTrancados() {
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!aviso) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAviso(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aviso]);

  return (
    <div className="pn cd">
      <style dangerouslySetInnerHTML={{ __html: painelTokensCss + css }} />
      <PainelNav />
      <main className="cd-wrap">
        <span className="cd-eyebrow">Cadernos prontos</span>
        <h1 className="cd-title">Fichas prontas para imprimir</h1>
        <p className="cd-sub">
          Fichas organizadas por ano e disciplina, prontas para imprimir, com versão PCD.
        </p>

        <div className="cd-lock" role="note">
          <Svg>{ICONS.lock}</Svg>
          <span>
            <b>Cadernos prontos: acesso a partir de {CADERNOS_LIBERA_EM}.</b> Até lá, as fichas
            aparecem desfocadas, só para mostrar onde vão ficar.
          </span>
        </div>

        <div className="cd-grid">
          {PREVIAS.map((src, i) => (
            <div className="cd-card" key={src}>
              <button
                type="button"
                className="cd-th"
                aria-label={`Prévia ${i + 1}: acesso a partir de ${CADERNOS_LIBERA_EM}`}
                onClick={() => setAviso(src)}
              >
                <img src={src} alt="" loading="lazy" width={513} height={725} />
                <span className="cd-selo">
                  <Svg>{ICONS.lock}</Svg>a partir de {CADERNOS_LIBERA_CURTO}
                </span>
              </button>
              <div className="cd-acts">
                <button type="button" onClick={() => setAviso(src)}>
                  <Svg>{ICONS.lock}</Svg>Ver
                </button>
                <button type="button" onClick={() => setAviso(src)}>
                  <Svg>{ICONS.lock}</Svg>PDF
                </button>
                <button type="button" onClick={() => setAviso(src)}>
                  <Svg>{ICONS.lock}</Svg>PCD
                </button>
              </div>
            </div>
          ))}
        </div>

        <section className="cd-what" aria-labelledby="cd-what-h">
          <h2 id="cd-what-h">O que vai ter aqui</h2>
          <ul>
            <li>Fichas separadas por ano de escolaridade e disciplina.</li>
            <li>Prontas para imprimir, em PDF.</li>
            <li>
              Para Educação Infantil e Fundamental 1, seis tipos de folha:{" "}
              {TIPOS_FOLHA.map((t) => t.nome).join(", ")}.
            </li>
            <li>
              Ao buscar uma atividade da BNCC no Planejamento, o app sugere junto as folhas que
              estão de acordo com a busca.
            </li>
            <li>Um toque para guardar na Minha Biblioteca e usar de novo no próximo ano.</li>
          </ul>
          <p>
            Enquanto isso, guarde o que você já usa na{" "}
            <Link to="/biblioteca">Minha Biblioteca</Link>.
          </p>
        </section>
      </main>

      {aviso && (
        <div className="cd-bg" onClick={() => setAviso(null)}>
          <div
            className="cd-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cd-modal-h"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="cd-modal-h">Cadernos prontos</h2>
            <div className="cd-prev">
              <img src={aviso} alt="" />
              <div className="cd-tag">
                <b>Acesso a partir de {CADERNOS_LIBERA_EM}</b>
                <span>A visualização, o PDF e a versão adaptada ficam disponíveis nessa data.</span>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <button
                type="button"
                className="pn-btn primary"
                autoFocus
                onClick={() => setAviso(null)}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
