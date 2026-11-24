import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  abrirPdf,
  buscarNoCatalogo,
  carregarCatalogo,
  nomeCaderno,
  NOME_TIPO,
  type Atividade,
  type CadernoCatalogo,
  type Catalogo,
} from "@/lib/cadernos/catalogo";

// Busca dos Cadernos AgilizaProf: a professora digita a disciplina, o código
// da BNCC ou o assunto e vê cada atividade (ficha) com todos os PDFs onde
// ela aparece, já abrindo na página certa. Embaixo, os cadernos inteiros.

const ANOS = ["Educação Infantil", "1º ano", "2º ano", "3º ano", "4º ano", "5º ano"];
const COMPONENTES = [
  "Língua Portuguesa",
  "Matemática",
  "Ciências",
  "História",
  "Geografia",
  "Temas do ano",
  "Jogos",
];
const EXEMPLOS = [
  "Frações",
  "EF02LP06",
  "Ciclo da água",
  "Matemática 3º ano",
  "Carnaval",
  "Sílabas",
];
const PASSO = 30;

const css = `
.cb-form{display:grid;grid-template-columns:minmax(0,1fr) 170px 190px;gap:10px;margin:16px 0 8px;}
.cb-form input,.cb-form select{height:46px;border-radius:12px;border:2px solid var(--pn-ink);background:#fff;padding:0 14px;font:inherit;font-size:16px;color:var(--pn-ink);min-width:0;}
.cb-form input:focus,.cb-form select:focus{outline:3px solid var(--pn-sun);outline-offset:1px;}
.cb-ex{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 0;}
.cb-ex button{height:32px;padding:0 12px;border-radius:999px;border:1.5px solid var(--pn-line);background:var(--pn-surface);font:inherit;font-size:13.5px;font-weight:700;color:var(--pn-muted);cursor:pointer;}
.cb-ex button:hover{border-color:var(--pn-ink);color:var(--pn-ink);}
.cb-res{margin:18px 0 8px;font-size:14.5px;color:var(--pn-muted);}
.cb-res b{color:var(--pn-ink);}
.cb-h2{margin:22px 0 10px;font-family:var(--pn-display);font-size:19px;letter-spacing:-.02em;}
.cb-lista{display:grid;gap:10px;}
.cb-at{background:var(--pn-surface);border:1.5px solid var(--pn-line);border-radius:16px;padding:14px 16px;display:grid;gap:8px;}
.cb-meta{font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--pn-green);}
.cb-tit{margin:0;font-family:var(--pn-display);font-size:17px;line-height:1.25;letter-spacing:-.015em;}
.cb-habs{display:flex;flex-wrap:wrap;gap:6px;}
.cb-hab{font-size:12.5px;font-weight:700;padding:3px 9px;border-radius:999px;background:var(--pn-cream);border:1.5px solid var(--pn-ink);cursor:help;}
.cb-desc{margin:0;font-size:14px;line-height:1.45;color:var(--pn-muted);}
.cb-pdfs{display:flex;flex-wrap:wrap;gap:6px;}
.cb-pdf{height:36px;padding:0 12px;border-radius:10px;border:1.5px solid var(--pn-ink);background:#fff;font:inherit;font-size:13.5px;font-weight:700;color:var(--pn-ink);cursor:pointer;display:inline-flex;align-items:center;gap:6px;}
.cb-pdf small{font-weight:600;color:var(--pn-muted);font-size:12px;}
.cb-pdf:hover{background:var(--pn-mint,#CDEFE2);}
.cb-pdf.prim{background:var(--pn-green);color:#fff;}
.cb-pdf.prim small{color:#e6fff4;}
.cb-pdf[disabled]{opacity:.6;cursor:wait;}
.cb-cads{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
.cb-cad{display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--pn-surface);border:1.5px solid var(--pn-line);border-radius:12px;padding:10px 12px;font-size:14.5px;}
.cb-cad span{min-width:0;}
.cb-cad small{display:block;color:var(--pn-muted);font-size:12.5px;}
.cb-mais{margin-top:12px;height:42px;padding:0 18px;border-radius:12px;border:2px solid var(--pn-ink);background:#fff;font:inherit;font-weight:700;cursor:pointer;}
.cb-vazio{margin-top:18px;padding:18px;border-radius:16px;border:1.5px dashed var(--pn-line);color:var(--pn-muted);font-size:15px;line-height:1.5;}
@media (max-width:860px){
  .cb-form{grid-template-columns:1fr 1fr;}
  .cb-form input{grid-column:1/-1;}
  .cb-cads{grid-template-columns:1fr;}
}
`;

function qInicial(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

export function CadernosBusca() {
  const [cat, setCat] = useState<Catalogo | null>(null);
  const [erro, setErro] = useState(false);
  const [q, setQ] = useState(qInicial);
  const [ano, setAno] = useState("");
  const [comp, setComp] = useState("");
  const [limite, setLimite] = useState(PASSO);
  const [abrindo, setAbrindo] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    carregarCatalogo()
      .then((c) => vivo && setCat(c))
      .catch(() => vivo && setErro(true));
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => setLimite(PASSO), [q, ano, comp]);

  const res = useMemo(() => {
    if (!cat) return null;
    if (!q.trim() && !ano && !comp) return null;
    return buscarNoCatalogo(cat, q, {
      ano: ano || undefined,
      componente: comp || undefined,
      etapa: ano === "Educação Infantil" ? "infantil" : ano ? "fund1" : null,
    });
  }, [cat, q, ano, comp]);

  const abrir = async (arquivo: string, pagina: number | null, chave: string) => {
    setAbrindo(chave);
    try {
      await abrirPdf(arquivo, pagina);
    } catch {
      toast.error("Não consegui abrir esse PDF agora. Tente de novo em instantes.");
    } finally {
      setAbrindo(null);
    }
  };

  return (
    <section aria-label="Buscar nos cadernos">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <form className="cb-form" role="search" onSubmit={(e) => e.preventDefault()}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Disciplina, código da BNCC ou assunto (ex.: frações, EF03CI01)"
          aria-label="O que você procura"
          enterKeyHint="search"
        />
        <select value={ano} onChange={(e) => setAno(e.target.value)} aria-label="Ano">
          <option value="">Todos os anos</option>
          {ANOS.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <select value={comp} onChange={(e) => setComp(e.target.value)} aria-label="Disciplina">
          <option value="">Todas as disciplinas</option>
          {COMPONENTES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </form>

      {!q && !ano && !comp && (
        <div className="cb-ex" aria-label="Exemplos de busca">
          {EXEMPLOS.map((e) => (
            <button type="button" key={e} onClick={() => setQ(e)}>
              {e}
            </button>
          ))}
        </div>
      )}

      {erro && (
        <div className="cb-vazio">Não consegui carregar os cadernos. Atualize a página.</div>
      )}
      {!cat && !erro && (q || ano || comp) && <p className="cb-res">Carregando os cadernos…</p>}

      {res && res.atividades.length === 0 && res.cadernos.length === 0 && (
        <div className="cb-vazio">
          Nada encontrado para <b>{q || [ano, comp].filter(Boolean).join(" · ")}</b>. Tente outra
          palavra, só o código da BNCC (ex.: EF03MA09) ou tire o filtro de ano.
        </div>
      )}

      {res && (res.atividades.length > 0 || res.cadernos.length > 0) && (
        <>
          <p className="cb-res" aria-live="polite">
            <b>{res.atividades.length}</b>{" "}
            {res.atividades.length === 1 ? "atividade" : "atividades"} em{" "}
            <b>{res.cadernos.length}</b> {res.cadernos.length === 1 ? "caderno" : "cadernos"}
          </p>

          {res.atividades.length > 0 && (
            <>
              <h2 className="cb-h2">Atividades</h2>
              <div className="cb-lista">
                {res.atividades.slice(0, limite).map((a) => (
                  <CartaoAtividade
                    key={a.chave}
                    a={a}
                    cat={cat!}
                    abrindo={abrindo}
                    onAbrir={abrir}
                  />
                ))}
              </div>
              {res.atividades.length > limite && (
                <button
                  type="button"
                  className="cb-mais"
                  onClick={() => setLimite((l) => l + PASSO)}
                >
                  Mostrar mais {Math.min(PASSO, res.atividades.length - limite)}
                </button>
              )}
            </>
          )}

          {res.cadernos.length > 0 && (
            <>
              <h2 className="cb-h2">Cadernos completos</h2>
              <div className="cb-cads">
                {res.cadernos.map((c) => (
                  <CartaoCaderno key={c.arquivo} c={c} abrindo={abrindo} onAbrir={abrir} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

function CartaoAtividade(props: {
  a: Atividade;
  cat: Catalogo;
  abrindo: string | null;
  onAbrir: (arquivo: string, pagina: number | null, chave: string) => void;
}) {
  const { a, cat, abrindo, onAbrir } = props;
  const local =
    a.componente === "Jogos"
      ? `Caderno de Jogos · Jogo ${String(a.n).padStart(2, "0")}`
      : a.etapa === "infantil"
        ? `Educação Infantil${a.tema ? ` · ${a.tema}` : ""}`
        : `${a.componente} · ${a.ano} · Ficha ${String(a.n).padStart(2, "0")}${a.tema ? ` · ${a.tema}` : ""}`;
  const desc = a.habilidades[0] ? cat.bncc[a.habilidades[0]] : "";
  return (
    <article className="cb-at">
      <span className="cb-meta">{local}</span>
      <h3 className="cb-tit">{a.titulo}</h3>
      {a.habilidades.length > 0 && (
        <div className="cb-habs">
          {a.habilidades.map((h) => (
            <span className="cb-hab" key={h} title={cat.bncc[h] ?? ""}>
              {h}
            </span>
          ))}
        </div>
      )}
      {desc && <p className="cb-desc">{desc}</p>}
      <div className="cb-pdfs">
        {a.pdfs.map((p, i) => {
          const chave = `${p.arquivo}#${p.pagina}`;
          return (
            <button
              type="button"
              key={chave}
              className={"cb-pdf" + (i === 0 ? " prim" : "")}
              disabled={abrindo === chave}
              onClick={() => onAbrir(p.arquivo, p.pagina, chave)}
              aria-label={`Abrir ${NOME_TIPO[p.tipo]}${p.pagina ? `, página ${p.pagina}` : ""}`}
            >
              {abrindo === chave ? "Abrindo…" : NOME_TIPO[p.tipo]}
              {p.pagina && abrindo !== chave ? <small>p. {p.pagina}</small> : null}
            </button>
          );
        })}
      </div>
    </article>
  );
}

function CartaoCaderno(props: {
  c: CadernoCatalogo;
  abrindo: string | null;
  onAbrir: (arquivo: string, pagina: number | null, chave: string) => void;
}) {
  const { c, abrindo, onAbrir } = props;
  const chave = `${c.arquivo}#inteiro`;
  const mb = (c.tamanho / 1048576).toFixed(c.tamanho > 10485760 ? 0 : 1).replace(".", ",");
  return (
    <div className="cb-cad">
      <span>
        {nomeCaderno(c)}
        <small>
          {c.fichas.length
            ? `${c.fichas.length} ${c.tipo === "jogos" ? "jogos" : "fichas"} · `
            : ""}
          {c.paginas ? `${c.paginas} páginas · ` : ""}
          {mb} MB
        </small>
      </span>
      <button
        type="button"
        className="cb-pdf"
        disabled={abrindo === chave}
        onClick={() => onAbrir(c.arquivo, null, chave)}
      >
        {abrindo === chave ? "Abrindo…" : "Abrir PDF"}
      </button>
    </div>
  );
}
