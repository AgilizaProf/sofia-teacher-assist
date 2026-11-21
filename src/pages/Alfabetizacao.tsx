import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PainelNav, painelTokensCss } from "@/components/painel/PainelNav";
import { useInclusaoStudents } from "@/hooks/useInclusaoStudents";
import { useTurmas } from "@/hooks/useTurmas";
import { AvaliarLeitura } from "@/components/alfabetizacao/AvaliarLeitura";
import { CartoesLeitura } from "@/components/alfabetizacao/CartoesLeitura";
import { CorrigirTexto, imprimirAtividade } from "@/components/alfabetizacao/CorrigirTexto";
import {
  COR_ESCRITA,
  COR_LEITURA,
  Seta,
  alfaCss,
  type AlunoAlfa,
} from "@/components/alfabetizacao/comum";
import { anoDe } from "@/lib/alfabetizacao/analise";
import { errosPorCategoria, htmlAtividades } from "@/lib/alfabetizacao/erros";
import { imprimirHtml } from "@/lib/alfabetizacao/imprimir";
import {
  dataCurta,
  escritasDoAluno,
  leiturasDoAluno,
  resumoDoAluno,
  useAlfaDados,
} from "@/lib/alfabetizacao/store";
import {
  METAS_PADRAO,
  NIVEIS_ESCRITA,
  NIVEIS_LEITURA,
  nomeNivelEscrita,
  nomeNivelLeitura,
  type AlfaDados,
  type AvaliacaoEscrita,
  type AvaliacaoLeitura,
} from "@/lib/alfabetizacao/tipos";

// Criança alfabetizada: leitura e escrita de cada aluno, com a evolução da
// turma. Os níveis confirmados aqui ficam na conta da professora (chave
// "alfa_dados") e são lidos pelos pareceres e pela Sofia.
// Áudio e foto NÃO são guardados: só o resultado confirmado.

type Aba = "turma" | "leitura" | "texto" | "cartoes";

type Linha = {
  aluno: AlunoAlfa;
  leituras: AvaliacaoLeitura[];
  escritas: AvaliacaoEscrita[];
};

function mudou(xs: Array<{ nivel: number }>): "subiu" | "igual" | "caiu" | null {
  if (xs.length < 2) return null;
  const a = xs[0].nivel;
  const b = xs[xs.length - 1].nivel;
  return b > a ? "subiu" : b < a ? "caiu" : "igual";
}

function Distribuicao({
  titulo,
  niveis,
  cores,
  contagem,
  semAvaliar,
}: {
  titulo: string;
  niveis: Array<{ n: number; nome: string }>;
  cores: Record<number, string>;
  contagem: Record<number, number>;
  semAvaliar: number;
}) {
  const max = Math.max(1, semAvaliar, ...niveis.map((n) => contagem[n.n] || 0));
  return (
    <div className="af-card">
      <h3>{titulo}</h3>
      <div className="af-barras">
        {niveis.map((n) => (
          <div className="af-barra" key={n.n}>
            <span>{n.nome}</span>
            <div className="tr">
              {(contagem[n.n] || 0) > 0 && (
                <i
                  style={{
                    width: `${((contagem[n.n] || 0) / max) * 100}%`,
                    background: cores[n.n],
                  }}
                />
              )}
            </div>
            <b>{contagem[n.n] || 0}</b>
          </div>
        ))}
        <div className="af-barra" style={{ color: "var(--pn-muted)" }}>
          <span>Ainda sem avaliação</span>
          <div className="tr">
            {semAvaliar > 0 && (
              <i
                style={{
                  width: `${(semAvaliar / max) * 100}%`,
                  background: "#fff",
                  borderColor: "var(--pn-line)",
                }}
              />
            )}
          </div>
          <b>{semAvaliar}</b>
        </div>
      </div>
    </div>
  );
}

function Ficha({
  linha,
  dados,
  onClose,
  apagarLeitura,
  apagarEscrita,
  abrir,
}: {
  linha: Linha;
  dados: AlfaDados;
  onClose: () => void;
  apagarLeitura: (id: string) => void;
  apagarEscrita: (id: string) => void;
  abrir: (aba: Aba) => void;
}) {
  const { aluno, leituras, escritas } = linha;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const resumo = resumoDoAluno(dados, aluno.id, aluno.nome);
  return (
    <div className="af-bg" onClick={onClose}>
      <div
        className="af-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Leitura e escrita de ${aluno.nome}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="af-linha" style={{ alignItems: "center" }}>
          <h2 style={{ flex: 1 }}>{aluno.nome}</h2>
          <button type="button" className="af-mini" onClick={onClose}>
            Fechar
          </button>
        </div>
        <p className="af-sub" style={{ margin: "4px 0 12px" }}>
          {aluno.turma || "Sem turma"}
          {aluno.ano ? ` · ${aluno.ano}º ano` : ""}
        </p>
        {resumo ? (
          <div className="af-aviso">{resumo}</div>
        ) : (
          <div className="af-vazio">Este aluno ainda não tem leitura nem texto registrados.</div>
        )}

        <h3 style={{ margin: "16px 0 0", fontFamily: "var(--pn-display)", fontSize: 16 }}>
          Evolução da leitura
        </h3>
        {leituras.length > 0 && (
          <div className="af-graf" aria-hidden>
            {leituras.slice(-10).map((l) => (
              <span
                key={l.id}
                style={{ height: `${(l.nivel / 6) * 100}%`, background: COR_LEITURA[l.nivel] }}
                title={`${dataCurta(l.data)}: ${nomeNivelLeitura(l.nivel)}`}
              >
                {l.nivel}
              </span>
            ))}
          </div>
        )}
        <div className="af-hist">
          {leituras.length === 0 && <div>Nenhuma leitura avaliada ainda.</div>}
          {[...leituras].reverse().map((l) => (
            <div key={l.id}>
              <b>{dataCurta(l.data)}</b>
              <span className="af-nv" style={{ background: COR_LEITURA[l.nivel] }}>
                {nomeNivelLeitura(l.nivel)}
              </span>
              <span>
                Cartão {l.cartaoId}: {l.corretas} de {l.total} certas
                {l.tipo === "texto" || l.tipo === "frases" ? `, ${l.pcpm} por minuto` : ""}
              </span>
              {l.obs && <span style={{ color: "var(--pn-muted)" }}>{l.obs}</span>}
              <span className="sp" />
              <button
                type="button"
                className="af-link"
                onClick={() => {
                  if (window.confirm("Apagar esta avaliação de leitura?")) apagarLeitura(l.id);
                }}
              >
                Apagar
              </button>
            </div>
          ))}
        </div>

        <h3 style={{ margin: "8px 0 0", fontFamily: "var(--pn-display)", fontSize: 16 }}>
          Evolução da escrita
        </h3>
        <div className="af-hist">
          {escritas.length === 0 && <div>Nenhum texto corrigido ainda.</div>}
          {[...escritas].reverse().map((e) => {
            const cats = errosPorCategoria(e.erros)
              .slice(0, 3)
              .map((g) => g.cat.nome);
            return (
              <div key={e.id}>
                <b>{dataCurta(e.data)}</b>
                <span className="af-nv" style={{ background: COR_ESCRITA[e.nivel] }}>
                  {nomeNivelEscrita(e.nivel)}
                </span>
                <span>
                  {e.erros.length} {e.erros.length === 1 ? "erro" : "erros"}
                  {cats.length ? `: ${cats.join(", ")}` : ""}
                </span>
                <span className="sp" />
                {e.erros.length > 0 && (
                  <button type="button" className="af-mini" onClick={() => imprimirAtividade(e)}>
                    Imprimir atividade
                  </button>
                )}
                <button
                  type="button"
                  className="af-link"
                  onClick={() => {
                    if (window.confirm("Apagar esta correção de texto?")) apagarEscrita(e.id);
                  }}
                >
                  Apagar
                </button>
              </div>
            );
          })}
        </div>
        <div className="af-botoes">
          <button type="button" className="pn-btn primary" onClick={() => abrir("leitura")}>
            Avaliar a leitura
          </button>
          <button type="button" className="pn-btn" onClick={() => abrir("texto")}>
            Corrigir um texto
          </button>
        </div>
      </div>
    </div>
  );
}

export function Alfabetizacao() {
  const { students, loading, create } = useInclusaoStudents();
  const { turmas } = useTurmas();
  const { dados, salvarLeitura, salvarEscrita, apagarLeitura, apagarEscrita, salvarMetas } =
    useAlfaDados();

  const [aba, setAba] = useState<Aba>("turma");
  const [turma, setTurma] = useState("");
  const [alunoSel, setAlunoSel] = useState<string | undefined>(undefined);
  const [fichaId, setFichaId] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [novaTurma, setNovaTurma] = useState("");
  const [salvando, setSalvando] = useState(false);

  const todos = useMemo<AlunoAlfa[]>(
    () =>
      students.map((s) => {
        const t = s.turma && s.turma !== "Sem turma" ? s.turma : "";
        const cls = turmas.find((x) => x.name === t);
        return {
          id: s.id,
          nome: s.name,
          turma: t,
          ano: anoDe(s.anoEscolar) || anoDe(cls?.grade) || anoDe(t),
        };
      }),
    [students, turmas],
  );
  const nomesTurmas = useMemo(() => {
    const set = new Set<string>();
    turmas.forEach((t) => t.name && set.add(t.name));
    todos.forEach((a) => a.turma && set.add(a.turma));
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [turmas, todos]);
  const alunos = useMemo(
    () => (turma ? todos.filter((a) => a.turma === turma) : todos),
    [todos, turma],
  );

  const linhas = useMemo<Linha[]>(
    () =>
      alunos.map((aluno) => ({
        aluno,
        leituras: leiturasDoAluno(dados, aluno.id),
        escritas: escritasDoAluno(dados, aluno.id),
      })),
    [alunos, dados],
  );

  const painel = useMemo(() => {
    const leit: Record<number, number> = {};
    const escr: Record<number, number> = {};
    let semL = 0;
    let semE = 0;
    const evoL = { subiu: 0, igual: 0, caiu: 0 };
    const evoE = { subiu: 0, igual: 0, caiu: 0 };
    const cats = new Map<string, { nome: string; alunos: Set<string> }>();
    for (const l of linhas) {
      const ul = l.leituras[l.leituras.length - 1];
      if (ul) leit[ul.nivel] = (leit[ul.nivel] || 0) + 1;
      else semL++;
      const ue = l.escritas[l.escritas.length - 1];
      if (ue) {
        escr[ue.nivel] = (escr[ue.nivel] || 0) + 1;
        for (const g of errosPorCategoria(ue.erros)) {
          if (g.cat.id === "outro") continue;
          if (!cats.has(g.cat.id)) cats.set(g.cat.id, { nome: g.cat.nome, alunos: new Set() });
          cats.get(g.cat.id)!.alunos.add(l.aluno.nome);
        }
      } else semE++;
      const ml = mudou(l.leituras);
      if (ml) evoL[ml]++;
      const me = mudou(l.escritas);
      if (me) evoE[me]++;
    }
    const erros = [...cats.values()]
      .map((c) => ({ nome: c.nome, alunos: [...c.alunos] }))
      .sort((a, b) => b.alunos.length - a.alunos.length);
    return { leit, escr, semL, semE, evoL, evoE, erros };
  }, [linhas]);

  const fluentes = (painel.leit[6] || 0) + (painel.leit[5] || 0);
  const avaliadosL = linhas.length - painel.semL;

  function abrirPara(alunoId: string, destino: Aba) {
    setAlunoSel(alunoId);
    setFichaId(null);
    setAba(destino);
    window.scrollTo({ top: 0 });
  }

  function imprimirTurma() {
    const folhas = linhas
      .map((l) => l.escritas[l.escritas.length - 1])
      .filter((e): e is AvaliacaoEscrita => !!e && e.erros.length > 0)
      .map((e) => ({
        alunoNome: e.alunoNome,
        turma: e.turma,
        data: dataCurta(e.data),
        erros: e.erros,
        semente: e.id,
      }));
    if (!folhas.length) {
      toast.message("Ainda não há textos corrigidos com erros marcados nesta turma.");
      return;
    }
    if (!imprimirHtml(htmlAtividades(folhas)))
      toast.error("O navegador bloqueou a janela de impressão. Libere os pop-ups e tente de novo.");
  }

  async function adicionarAluno() {
    const nome = novoNome.trim();
    if (nome.length < 2) {
      toast.error("Escreva o nome do aluno.");
      return;
    }
    setSalvando(true);
    try {
      await create({
        name: nome,
        initials:
          nome
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0] ?? "")
            .join("")
            .toUpperCase() || "AL",
        age: "—",
        turma: novaTurma || turma || "Sem turma",
        diag: "",
        cid: "",
        aee: "",
        anamnese: "0/14",
        registros: "0",
        trend: "—",
        trendTone: "muted",
        pcd: "nao",
      });
      setNovoNome("");
      toast.success(`${nome} entrou na lista.`);
    } catch {
      toast.error("Não consegui cadastrar agora. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  const ficha = fichaId ? linhas.find((l) => l.aluno.id === fichaId) : undefined;
  const frase = (e: { subiu: number; igual: number; caiu: number }) => {
    const n = e.subiu + e.igual + e.caiu;
    if (!n) return "A evolução aparece aqui quando um aluno tiver duas avaliações ou mais.";
    return `De ${n} ${n === 1 ? "aluno avaliado" : "alunos avaliados"} mais de uma vez: ${e.subiu} ${e.subiu === 1 ? "subiu" : "subiram"} de nível, ${e.igual} ${e.igual === 1 ? "ficou" : "ficaram"} no mesmo e ${e.caiu} ${e.caiu === 1 ? "caiu" : "caíram"}.`;
  };

  return (
    <div className="pn af">
      <style dangerouslySetInnerHTML={{ __html: painelTokensCss + alfaCss }} />
      <PainelNav />
      <main className="af-wrap">
        <span className="af-eyebrow">Criança alfabetizada</span>
        <h1 className="af-title">Leitura e escrita, aluno por aluno.</h1>
        <p className="af-sub">
          Ouça a leitura, corrija o texto pela foto e veja em que nível cada criança está. O app
          sugere e você confirma. Nem o áudio nem a foto ficam guardados.
        </p>

        {nomesTurmas.length > 0 && (
          <div className="af-chips" role="group" aria-label="Turma">
            <span>Turma:</span>
            <button type="button" aria-pressed={turma === ""} onClick={() => setTurma("")}>
              Todas
            </button>
            {nomesTurmas.map((t) => (
              <button key={t} type="button" aria-pressed={turma === t} onClick={() => setTurma(t)}>
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="af-tabs" role="tablist">
          {(
            [
              ["turma", "Turma"],
              ["leitura", "Avaliar leitura"],
              ["texto", "Corrigir texto"],
              ["cartoes", "Cartões de leitura"],
            ] as Array<[Aba, string]>
          ).map(([id, nome]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={aba === id}
              onClick={() => setAba(id)}
            >
              {nome}
            </button>
          ))}
        </div>

        {aba === "turma" && (
          <>
            {loading ? (
              <div className="af-vazio">Carregando os alunos…</div>
            ) : linhas.length === 0 ? (
              <div className="af-card forte">
                <h2>Comece cadastrando os alunos</h2>
                <p className="dica">
                  Escreva o nome de cada criança. Depois é só tocar em “Ouvir leitura” ou “Corrigir
                  texto” na linha do aluno.
                </p>
              </div>
            ) : (
              <>
                <div className="af-nums">
                  <div className="af-num">
                    <b>{linhas.length}</b>
                    <span>{linhas.length === 1 ? "aluno" : "alunos"}</span>
                  </div>
                  <div className="af-num">
                    <b>{avaliadosL}</b>
                    <span>com leitura avaliada</span>
                  </div>
                  <div className="af-num">
                    <b>{fluentes}</b>
                    <span>já leem textos</span>
                  </div>
                  <div className="af-num">
                    <b>{linhas.length - painel.semE}</b>
                    <span>com texto corrigido</span>
                  </div>
                </div>
                <div className="af-g2">
                  <Distribuicao
                    titulo="Leitura: quantos alunos em cada nível"
                    niveis={NIVEIS_LEITURA}
                    cores={COR_LEITURA}
                    contagem={painel.leit}
                    semAvaliar={painel.semL}
                  />
                  <Distribuicao
                    titulo="Escrita: quantos alunos em cada nível"
                    niveis={NIVEIS_ESCRITA}
                    cores={COR_ESCRITA}
                    contagem={painel.escr}
                    semAvaliar={painel.semE}
                  />
                </div>
                <div className="af-card">
                  <h3>Evolução da turma</h3>
                  <p className="dica" style={{ margin: 0 }}>
                    <b>Leitura.</b> {frase(painel.evoL)}
                    <br />
                    <b>Escrita.</b> {frase(painel.evoE)}
                  </p>
                </div>

                <div className="af-card">
                  <h3>Aluno por aluno</h3>
                  <div className="af-rol">
                    <table className="af-tabela">
                      <thead>
                        <tr>
                          <th>Aluno</th>
                          <th>Leitura</th>
                          <th>Escrita</th>
                          <th>Última vez</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {linhas.map((l) => {
                          const ul = l.leituras[l.leituras.length - 1];
                          const ue = l.escritas[l.escritas.length - 1];
                          const ultima = [ul?.data, ue?.data].filter(Boolean).sort().pop();
                          return (
                            <tr key={l.aluno.id}>
                              <td>
                                <b>{l.aluno.nome}</b>
                                {!turma && l.aluno.turma && (
                                  <div style={{ fontSize: 12.5, color: "var(--pn-muted)" }}>
                                    {l.aluno.turma}
                                  </div>
                                )}
                              </td>
                              <td>
                                {ul ? (
                                  <>
                                    <span
                                      className="af-nv"
                                      style={{ background: COR_LEITURA[ul.nivel] }}
                                    >
                                      {nomeNivelLeitura(ul.nivel)}
                                    </span>
                                    {l.leituras.length > 1 && (
                                      <Seta antes={l.leituras[0].nivel} agora={ul.nivel} />
                                    )}
                                  </>
                                ) : (
                                  <span className="af-nv vazio">Sem avaliação</span>
                                )}
                              </td>
                              <td>
                                {ue ? (
                                  <>
                                    <span
                                      className="af-nv"
                                      style={{ background: COR_ESCRITA[ue.nivel] }}
                                    >
                                      {nomeNivelEscrita(ue.nivel)}
                                    </span>
                                    {l.escritas.length > 1 && (
                                      <Seta antes={l.escritas[0].nivel} agora={ue.nivel} />
                                    )}
                                  </>
                                ) : (
                                  <span className="af-nv vazio">Sem avaliação</span>
                                )}
                              </td>
                              <td style={{ whiteSpace: "nowrap", color: "var(--pn-muted)" }}>
                                {ultima ? dataCurta(ultima) : "—"}
                              </td>
                              <td>
                                <div className="af-acoes">
                                  <button
                                    type="button"
                                    className="af-mini"
                                    onClick={() => abrirPara(l.aluno.id, "leitura")}
                                  >
                                    Ouvir leitura
                                  </button>
                                  <button
                                    type="button"
                                    className="af-mini"
                                    onClick={() => abrirPara(l.aluno.id, "texto")}
                                  >
                                    Corrigir texto
                                  </button>
                                  <button
                                    type="button"
                                    className="af-mini"
                                    onClick={() => setFichaId(l.aluno.id)}
                                  >
                                    Ver evolução
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="af-card">
                  <h3>O que a turma mais erra na escrita</h3>
                  {painel.erros.length === 0 ? (
                    <p className="dica" style={{ margin: 0 }}>
                      Aparece aqui depois que você corrigir os primeiros textos.
                    </p>
                  ) : (
                    <>
                      <div className="af-hist">
                        {painel.erros.slice(0, 6).map((e) => (
                          <div key={e.nome}>
                            <b>{e.nome}</b>
                            <span style={{ color: "var(--pn-muted)" }}>
                              {e.alunos.length} {e.alunos.length === 1 ? "aluno" : "alunos"}:{" "}
                              {e.alunos.slice(0, 8).join(", ")}
                              {e.alunos.length > 8 ? " e outros" : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                      <button type="button" className="pn-btn" onClick={imprimirTurma}>
                        Imprimir a atividade de cada aluno
                      </button>
                      <p className="dica" style={{ margin: "10px 0 0" }}>
                        Sai uma folha por aluno, só com os tipos de erro do último texto dele.
                      </p>
                    </>
                  )}
                </div>
              </>
            )}

            <div className="af-card">
              <h3>Adicionar aluno</h3>
              <div className="af-linha">
                <label className="af-campo" style={{ flex: 2 }}>
                  Nome
                  <input
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void adicionarAluno()}
                    maxLength={80}
                  />
                </label>
                {nomesTurmas.length > 0 && (
                  <label className="af-campo">
                    Turma
                    <select
                      value={novaTurma || turma}
                      onChange={(e) => setNovaTurma(e.target.value)}
                    >
                      <option value="">Sem turma</option>
                      {nomesTurmas.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <button
                  type="button"
                  className="pn-btn primary"
                  disabled={salvando}
                  onClick={() => void adicionarAluno()}
                >
                  Adicionar
                </button>
              </div>
            </div>

            <details className="af-card">
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                Metas de leitura por ano (para considerar “leitor fluente”)
              </summary>
              <p className="dica" style={{ marginTop: 8 }}>
                Palavras lidas certo por minuto. Ajuste para a meta da sua rede, se for diferente.
              </p>
              <div className="af-linha">
                {Object.keys(METAS_PADRAO).map((ano) => (
                  <label key={ano} className="af-campo" style={{ minWidth: 90 }}>
                    {ano}º ano
                    <input
                      type="number"
                      min={10}
                      max={250}
                      value={dados.metas[ano] ?? METAS_PADRAO[ano]}
                      onChange={(e) =>
                        salvarMetas({ ...dados.metas, [ano]: Number(e.target.value) || 0 })
                      }
                    />
                  </label>
                ))}
              </div>
            </details>
          </>
        )}

        {aba === "leitura" && (
          <AvaliarLeitura
            key={`l-${alunoSel || ""}-${turma}`}
            alunos={alunos}
            dados={dados}
            alunoInicial={alunoSel && alunos.some((a) => a.id === alunoSel) ? alunoSel : undefined}
            salvarLeitura={salvarLeitura}
          />
        )}
        {aba === "texto" && (
          <CorrigirTexto
            key={`t-${alunoSel || ""}-${turma}`}
            alunos={alunos}
            alunoInicial={alunoSel && alunos.some((a) => a.id === alunoSel) ? alunoSel : undefined}
            salvarEscrita={salvarEscrita}
          />
        )}
        {aba === "cartoes" && <CartoesLeitura />}
      </main>

      {ficha && (
        <Ficha
          linha={ficha}
          dados={dados}
          onClose={() => setFichaId(null)}
          apagarLeitura={apagarLeitura}
          apagarEscrita={apagarEscrita}
          abrir={(d) => abrirPara(ficha.aluno.id, d)}
        />
      )}
    </div>
  );
}
