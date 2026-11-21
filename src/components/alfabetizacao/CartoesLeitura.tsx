// Os 1000 cartões de leitura, por nível, para ver e imprimir.
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { QTD_POR_NIVEL, cartaoPorId, cartoesDoNivel } from "@/lib/alfabetizacao/cartoes";
import { htmlCartoes, imprimirHtml } from "@/lib/alfabetizacao/imprimir";
import { normalizar } from "@/lib/alfabetizacao/analise";
import { NIVEIS_CARTAO, type Cartao } from "@/lib/alfabetizacao/tipos";
import { CartaoVisual } from "./comum";

const POR_PAGINA = 12;

export function CartoesLeitura() {
  const [nivel, setNivel] = useState<Cartao["nivel"]>(1);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(0);
  const [escolhidos, setEscolhidos] = useState<string[]>([]);

  const doNivel = useMemo(() => cartoesDoNivel(nivel), [nivel]);
  const filtrados = useMemo(() => {
    const q = normalizar(busca);
    if (!q) return doNivel;
    return doNivel.filter((c) =>
      normalizar(
        `${c.id} ${c.titulo} ${c.foco || ""} ${c.itens.join(" ")} ${c.texto || ""}`,
      ).includes(q),
    );
  }, [doNivel, busca]);
  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const pg = Math.min(pagina, paginas - 1);
  const visiveis = filtrados.slice(pg * POR_PAGINA, (pg + 1) * POR_PAGINA);
  const info = NIVEIS_CARTAO.find((n) => n.n === nivel)!;

  const alternar = (id: string) =>
    setEscolhidos((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));

  function imprimir(ids: string[]) {
    const cs = ids.map((i) => cartaoPorId(i)).filter((c): c is Cartao => !!c);
    if (!cs.length) return;
    if (!imprimirHtml(htmlCartoes(cs)))
      toast.error("O navegador bloqueou a janela de impressão. Libere os pop-ups e tente de novo.");
  }

  return (
    <div>
      <div className="af-card">
        <h2>1000 cartões de leitura, do mais fácil ao mais difícil</h2>
        <p className="dica">
          Escolha o nível, marque os cartões e imprima para os alunos treinarem. Os mesmos cartões
          são usados na avaliação da leitura.
        </p>
        <div className="af-chips" style={{ marginTop: 0 }}>
          {NIVEIS_CARTAO.map((n) => (
            <button
              key={n.n}
              type="button"
              aria-pressed={nivel === n.n}
              onClick={() => {
                setNivel(n.n);
                setPagina(0);
              }}
            >
              {n.n}. {n.nome} ({QTD_POR_NIVEL[n.n]})
            </button>
          ))}
        </div>
        <div className="af-linha" style={{ marginTop: 12 }}>
          <label className="af-campo">
            Procurar neste nível
            <input
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(0);
              }}
              placeholder="Ex.: lh, gato, chuva"
            />
          </label>
          <button
            type="button"
            className="af-mini"
            style={{ height: 44 }}
            onClick={() =>
              setEscolhidos((xs) => Array.from(new Set([...xs, ...visiveis.map((c) => c.id)])))
            }
          >
            Marcar os desta página
          </button>
        </div>
        <p className="dica" style={{ margin: "10px 0 0" }}>
          {info.para} {filtrados.length} cartões {busca ? "encontrados" : "neste nível"}.
        </p>
      </div>

      {visiveis.length === 0 ? (
        <div className="af-vazio">Nenhum cartão com esse termo neste nível.</div>
      ) : (
        <div className="af-grid">
          {visiveis.map((c) => {
            const on = escolhidos.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className="af-item"
                aria-pressed={on}
                onClick={() => alternar(c.id)}
              >
                <span className="cab">
                  <span>
                    {c.id}
                    {c.foco ? ` · ${c.foco}` : ""}
                  </span>
                  <em>{on ? "✓ marcado" : "marcar"}</em>
                </span>
                <CartaoVisual c={c} pequeno />
              </button>
            );
          })}
        </div>
      )}

      {paginas > 1 && (
        <div className="af-pag">
          <button
            type="button"
            className="af-mini"
            disabled={pg === 0}
            onClick={() => setPagina(pg - 1)}
          >
            Anterior
          </button>
          Página {pg + 1} de {paginas}
          <button
            type="button"
            className="af-mini"
            disabled={pg >= paginas - 1}
            onClick={() => setPagina(pg + 1)}
          >
            Próxima
          </button>
        </div>
      )}

      {escolhidos.length > 0 && (
        <div className="af-barra-fixa">
          {escolhidos.length} {escolhidos.length === 1 ? "cartão marcado" : "cartões marcados"}
          <span className="sp" />
          <button type="button" className="af-mini" onClick={() => setEscolhidos([])}>
            Limpar
          </button>
          <button type="button" className="af-mini" onClick={() => imprimir(escolhidos)}>
            Imprimir
          </button>
        </div>
      )}
    </div>
  );
}
