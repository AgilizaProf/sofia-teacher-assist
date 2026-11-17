import { useEffect, useRef } from "react";
import type { BlocoVisual, Lacuna, ModeloVisual, TrechoVisual } from "@/lib/pei/modeloRede";
import { campoDoModelo } from "@/lib/pei/camposModelo";

type Props = {
  visual: ModeloVisual;
  valores: Record<string, string>;
  onChange: (id: string, valor: string) => void;
  /** Ids que a Sofia acabou de preencher (aparecem em azul). */
  daSofia: Set<string>;
  ativo: string | null;
  onAtivo: (id: string) => void;
};

const corCampo = (temValor: boolean, sofia: boolean, ativo: boolean): React.CSSProperties => ({
  background: sofia ? "#EAF0FF" : temValor ? "#F3FBF6" : "#FFF7D6",
  border: "none",
  borderBottom: `1.5px ${ativo ? "solid #1F4FB8" : "dashed #B9A24A"}`,
  outline: ativo ? "2px solid #B9C8F5" : "none",
  borderRadius: 3,
  font: "inherit",
  color: "#111",
  padding: "2px 4px",
});

/** Caixa de texto que cresce com o conteúdo, como se fosse o papel. */
function AreaTexto({
  id,
  valor,
  estilo,
  rotulo,
  onChange,
  onFocus,
  minimo,
}: {
  id: string;
  valor: string;
  estilo: React.CSSProperties;
  rotulo: string;
  minimo: number;
  onChange: (v: string) => void;
  onFocus: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(minimo, el.scrollHeight)}px`;
  }, [valor, minimo]);
  return (
    <textarea
      ref={ref}
      id={`mr-${id}`}
      aria-label={rotulo}
      title={rotulo}
      value={valor}
      rows={1}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      style={{
        ...estilo,
        display: "block",
        width: "100%",
        resize: "none",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    />
  );
}

/**
 * O documento da rede na tela, parecido com o Word: mesmo texto, tabelas e
 * logo. Cada espaço em branco é um campo onde a professora escreve.
 */
export function ModeloRedeDocumento({ visual, valores, onChange, daSofia, ativo, onAtivo }: Props) {
  const porId = new Map<string, Lacuna>(visual.lacunas.map((l) => [l.id, l]));

  const campo = (id: string, bloco: boolean, chave: string) => {
    const l = porId.get(id);
    if (!l) return null;
    const v = valores[id] || "";
    const estilo = corCampo(!!v.trim(), daSofia.has(id) && !!v.trim(), ativo === id);
    if (bloco) {
      return (
        <AreaTexto
          key={chave}
          id={id}
          valor={v}
          rotulo={l.rotulo}
          estilo={estilo}
          minimo={campoDoModelo(l).curto ? 26 : 44}
          onChange={(x) => onChange(id, x)}
          onFocus={() => onAtivo(id)}
        />
      );
    }
    return (
      <input
        key={chave}
        id={`mr-${id}`}
        aria-label={l.rotulo}
        title={l.rotulo}
        value={v}
        onChange={(e) => onChange(id, e.target.value)}
        onFocus={() => onAtivo(id)}
        style={{
          ...estilo,
          width: `${Math.min(46, Math.max(10, v.length + 2))}ch`,
          maxWidth: "100%",
        }}
      />
    );
  };

  const opcao = (id: string, n: number, chave: string) => {
    const marcadas = new Set(
      (valores[id] || "")
        .split(/[^0-9]+/)
        .filter(Boolean)
        .map((x) => parseInt(x, 10)),
    );
    const on = marcadas.has(n);
    return (
      <button
        key={chave}
        type="button"
        role="checkbox"
        aria-checked={on}
        aria-label={`${porId.get(id)?.rotulo || ""}: ${porId.get(id)?.opcoes?.[n - 1] || n}`}
        onClick={() => {
          onAtivo(id);
          const novo = new Set(marcadas);
          if (on) novo.delete(n);
          else novo.add(n);
          onChange(id, [...novo].sort((a, b) => a - b).join(","));
        }}
        style={{
          font: "inherit",
          fontWeight: 700,
          cursor: "pointer",
          padding: "0 5px",
          minWidth: 26,
          borderRadius: 4,
          border: `1.5px solid ${on ? "#096746" : "#B9A24A"}`,
          background: on ? "#D9F5E5" : "#FFF7D6",
          color: "#096746",
        }}
      >
        {on ? "X" : " "}
      </button>
    );
  };

  const trecho = (t: TrechoVisual, i: number, blocoUnico: boolean) => {
    if (t.t === "br") return <br key={i} />;
    if (t.t === "campo") return campo(t.id, blocoUnico, `c${i}`);
    if (t.t === "opcao") return opcao(t.id, t.n, `o${i}`);
    if (t.t === "img")
      return (
        <img
          key={i}
          src={t.src}
          alt=""
          style={{ width: t.w, maxWidth: "100%", height: "auto", verticalAlign: "middle" }}
        />
      );
    return (
      <span
        key={i}
        style={{
          fontWeight: t.b ? 700 : undefined,
          fontStyle: t.i ? "italic" : undefined,
          textDecoration: t.u ? "underline" : undefined,
          fontSize: t.tam ? `${Math.min(22, Math.max(9, t.tam))}pt` : undefined,
          color: t.cor && t.cor.toLowerCase() !== "#ffffff" ? t.cor : undefined,
          whiteSpace: "pre-wrap",
        }}
      >
        {t.texto}
      </span>
    );
  };

  const blocos = (bs: BlocoVisual[], naCelula: boolean): React.ReactNode =>
    bs.map((b, i) => {
      if (b.t === "tabela") {
        return (
          <table
            key={i}
            style={{
              width: "100%",
              borderCollapse: "collapse",
              margin: naCelula ? "4px 0" : "8px 0",
              tableLayout: "fixed",
            }}
          >
            <tbody>
              {b.linhas.map((cels, li) => (
                <tr key={li}>
                  {cels.map((c, ci) => (
                    <td
                      key={ci}
                      colSpan={c.colSpan}
                      rowSpan={c.rowSpan}
                      style={{
                        border: "1px solid #555",
                        padding: "4px 6px",
                        verticalAlign: "top",
                        background: c.fundo,
                        width: c.largura ? `${c.largura}%` : undefined,
                        wordBreak: "break-word",
                      }}
                    >
                      {blocos(c.blocos, true)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
      }
      const campos = b.filhos.filter((f) => f.t === "campo");
      const temTexto = b.filhos.some((f) => f.t === "texto" && f.texto.trim());
      // Campo sozinho (linha ____ ou célula vazia) ocupa a largura toda.
      const sozinho = campos.length === 1 && !temTexto;
      // "Rótulo:" no fim da linha com um único campo: o campo vai embaixo, largo.
      const ultimo = b.filhos[b.filhos.length - 1];
      const noFim =
        campos.length === 1 &&
        temTexto &&
        ultimo?.t === "campo" &&
        !campoDoModelo(porId.get(ultimo.id)!).curto;
      const vazio =
        b.filhos.length === 0 || b.filhos.every((f) => f.t === "texto" && !f.texto.trim());
      return (
        <div
          key={i}
          style={{
            textAlign: b.alinh,
            margin: naCelula ? "1px 0" : "5px 0",
            minHeight: vazio ? (naCelula ? 4 : 10) : undefined,
            fontWeight: b.titulo ? 700 : undefined,
            fontSize: b.titulo ? "12.5pt" : undefined,
            lineHeight: 1.45,
          }}
        >
          {b.filhos.map((f, fi) => trecho(f, fi, sozinho || (noFim && f === ultimo)))}
        </div>
      );
    });

  return (
    <div
      style={{
        background: "#fff",
        color: "#111",
        maxWidth: 820,
        margin: "0 auto",
        padding: "28px 34px",
        borderRadius: 4,
        boxShadow: "0 1px 6px rgba(0,0,0,.18)",
        fontFamily: "Calibri, Carlito, Arial, sans-serif",
        fontSize: "11pt",
      }}
    >
      {visual.cabecalho.length > 0 && (
        <div style={{ borderBottom: "1px solid #ddd", marginBottom: 10, paddingBottom: 6 }}>
          {blocos(visual.cabecalho, false)}
        </div>
      )}
      {blocos(visual.corpo, false)}
    </div>
  );
}
