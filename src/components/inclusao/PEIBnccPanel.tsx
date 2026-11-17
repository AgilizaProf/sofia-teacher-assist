import { useEffect, useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
import {
  COMPONENTES,
  TODOS_NIVEIS,
  carregarBncc,
  chaveNivel,
  componentePadrao,
  itensBncc,
  nivelDaChave,
  nomeDoNivel,
  type NivelBncc,
} from "@/lib/pei/bncc";

type Dados = Awaited<ReturnType<typeof carregarBncc>>;

function norm(v: string) {
  return v
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Lista das habilidades (EF/EM) ou objetivos de aprendizagem (EI) da BNCC do
 * ano do aluno, com filtro. Um clique coloca "CÓDIGO – texto" no campo.
 */
export function PEIBnccPanel({
  campo,
  nivel,
  incerto,
  onPick,
}: {
  campo: string;
  nivel: NivelBncc;
  incerto?: boolean;
  onPick: (t: string) => void;
}) {
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState(false);
  const [nivelK, setNivelK] = useState(chaveNivel(nivel));
  const nivelAtual = nivelDaChave(nivelK) || nivel;
  const comps = COMPONENTES[nivelAtual.etapa];
  const [comp, setComp] = useState<string>(componentePadrao(campo, nivel.etapa) || comps[0].k);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    let vivo = true;
    carregarBncc()
      .then((d) => vivo && setDados(d))
      .catch(() => vivo && setErro(true));
    return () => {
      vivo = false;
    };
  }, []);

  // Trocou de etapa (ex.: 1º ano → Pré II): volta ao componente padrão da nova etapa.
  useEffect(() => {
    if (!comps.some((c) => c.k === comp))
      setComp(componentePadrao(campo, nivelAtual.etapa) || comps[0].k);
  }, [nivelAtual.etapa]); // eslint-disable-line react-hooks/exhaustive-deps

  const itens = useMemo(() => {
    const n = nivelDaChave(nivelK);
    return dados && n ? itensBncc(dados, n, comp) : [];
  }, [dados, nivelK, comp]);
  const visiveis = useMemo(() => {
    const q = norm(filtro).trim();
    if (!q) return itens;
    const ps = q.split(/\s+/);
    return itens.filter((i) => {
      const b = norm(`${i.cod} ${i.t}`);
      return ps.every((p) => b.includes(p));
    });
  }, [itens, filtro]);

  const ehEI = nivelAtual.etapa === "ei";
  const chip = (on: boolean): React.CSSProperties => ({
    fontSize: 11,
    padding: "3px 8px",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 700,
    border: `1px solid ${on ? "#1F4FB8" : "var(--border)"}`,
    background: on ? "#E9F0FF" : "#fff",
    color: on ? "#1F4FB8" : "var(--text)",
  });

  return (
    <div
      style={{
        width: "100%",
        borderBottom: "1px dashed var(--border)",
        paddingBottom: 8,
        marginBottom: 4,
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}
      >
        <BookOpen size={12} color="#1F4FB8" />
        <b style={{ fontSize: 11, color: "#1F4FB8" }}>
          {ehEI ? "Objetivos de aprendizagem da BNCC" : "Habilidades da BNCC"}
        </b>
        <select
          value={nivelK}
          onChange={(e) => setNivelK(e.target.value)}
          aria-label="Ano da BNCC"
          title="Troque se o aluno trabalha com habilidades de outro ano (ano de referência)"
          style={{
            fontSize: 11,
            padding: "2px 6px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "#fff",
          }}
        >
          {TODOS_NIVEIS.map((n) => (
            <option key={chaveNivel(n)} value={chaveNivel(n)}>
              {nomeDoNivel(n)}
            </option>
          ))}
        </select>
        {incerto && nivelK === chaveNivel(nivel) && (
          <span style={{ fontSize: 11, color: "#B45309" }}>
            Escolha o ano do aluno (a série não está preenchida).
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
        {comps.map((c) => (
          <button key={c.k} type="button" style={chip(c.k === comp)} onClick={() => setComp(c.k)}>
            {c.nome}
          </button>
        ))}
      </div>
      {erro ? (
        <span style={{ fontSize: 11, color: "var(--muted)" }}>
          Não consegui carregar a BNCC agora. Feche e abra as sugestões de novo.
        </span>
      ) : !dados ? (
        <span style={{ fontSize: 11, color: "var(--muted)" }}>Carregando a BNCC…</span>
      ) : (
        <>
          {itens.length > 6 && (
            <input
              type="search"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder={`Filtrar as ${itens.length} ${ehEI ? "metas" : "habilidades"} por palavra ou código`}
              aria-label="Filtrar habilidades da BNCC"
              style={{
                width: "100%",
                fontSize: 12,
                padding: "5px 8px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                marginBottom: 6,
              }}
            />
          )}
          <div
            style={{
              maxHeight: 220,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {visiveis.length === 0 && (
              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                {itens.length
                  ? "Nada encontrado com esse filtro."
                  : "A BNCC não tem habilidades deste componente para este ano."}
              </span>
            )}
            {visiveis.map((i) => (
              <button
                key={i.cod}
                type="button"
                onClick={() => onPick(`${i.cod} – ${i.t}`)}
                title="Clique para colocar no campo"
                style={{
                  textAlign: "left",
                  fontSize: 11,
                  lineHeight: 1.35,
                  padding: "5px 8px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "#fff",
                  color: "var(--text)",
                  cursor: "pointer",
                }}
              >
                <b style={{ color: "#1F4FB8" }}>{i.cod}</b> {i.t}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
