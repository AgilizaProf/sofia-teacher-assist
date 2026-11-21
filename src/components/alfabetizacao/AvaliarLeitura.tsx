// Avaliar a leitura de um aluno: a criança lê um cartão, a Sofia ouve (ou a
// professora marca), o app sugere o nível e a professora confirma.
// O áudio fica só na memória e é apagado ao confirmar ou desistir.
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CUSTOS } from "@/lib/creditos/policy";
import {
  alinhar,
  alvosDoCartao,
  metaFluencia,
  nivelCartaoPara,
  palavrasDe,
  resumir,
  sugerirNivel,
} from "@/lib/alfabetizacao/analise";
import { ouvirLeitura } from "@/lib/alfabetizacao/api";
import {
  iniciarGravacao,
  mensagemErroMicrofone,
  podeGravar,
  prepararParaEnvio,
  type Gravador,
} from "@/lib/alfabetizacao/audio";
import { proximoCartao } from "@/lib/alfabetizacao/cartoes";
import { leiturasDoAluno, novoId } from "@/lib/alfabetizacao/store";
import {
  NIVEIS_CARTAO,
  NIVEIS_LEITURA,
  type AlfaDados,
  type AvaliacaoLeitura,
  type Cartao,
  type Marca,
  type NivelLeitura,
} from "@/lib/alfabetizacao/tipos";
import { CartaoVisual, type AlunoAlfa } from "./comum";

const LIMITE_SEGUNDOS = 60;
/** Leitura feita sem cartão do app (livro, folha da professora). */
export const CARTAO_LIVRE = "LIVRE";
const ORDEM: Marca[] = ["ok", "troca", "pulou", "nao"];
const ROTULO: Record<Marca, string> = {
  ok: "leu certo",
  troca: "trocou",
  pulou: "pulou",
  nao: "não leu",
};

type Passo = "preparar" | "gravando" | "enviando" | "revisar";

function mmss(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r < 10 ? "0" : ""}${r}`;
}

export function AvaliarLeitura({
  alunos,
  dados,
  alunoInicial,
  salvarLeitura,
  aoSalvar,
}: {
  alunos: AlunoAlfa[];
  dados: AlfaDados;
  alunoInicial?: string;
  salvarLeitura: (l: AvaliacaoLeitura) => void;
  aoSalvar?: () => void;
}) {
  const [alunoId, setAlunoId] = useState(alunoInicial || alunos[0]?.id || "");
  const aluno = alunos.find((a) => a.id === alunoId);
  const historico = useMemo(() => leiturasDoAluno(dados, alunoId), [dados, alunoId]);
  const ultimo = historico[historico.length - 1];

  const [nivelCartao, setNivelCartao] = useState<Cartao["nivel"]>(2);
  const [pulados, setPulados] = useState<string[]>([]);
  const [passo, setPasso] = useState<Passo>("preparar");
  const [comAudio, setComAudio] = useState(true);
  const [tempo, setTempo] = useState(0);
  const [segundos, setSegundos] = useState(0);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [ditos, setDitos] = useState<Array<string | undefined>>([]);
  const [obsSofia, setObsSofia] = useState("");
  const [obs, setObs] = useState("");
  const [nivel, setNivel] = useState<NivelLeitura | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const gravador = useRef<Gravador | null>(null);
  const relogio = useRef<number | null>(null);
  const inicio = useRef(0);
  const urlRef = useRef<string | null>(null);

  // Cartão sugerido: combina com o último nível confirmado do aluno.
  useEffect(() => {
    setNivelCartao(nivelCartaoPara(ultimo?.nivel));
    setPulados([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alunoId]);

  // Sem cartão: a criança lê um livro ou outro texto. Se a professora colar o
  // texto, o app compara; se não, a Sofia escreve o que ouviu e a professora
  // marca os erros.
  const [fonte, setFonte] = useState<"cartao" | "livre">("cartao");
  const [textoLivre, setTextoLivre] = useState("");
  const [alvosLivres, setAlvosLivres] = useState<string[]>([]);
  const temTextoLivre = palavrasDe(textoLivre).length >= 3;

  const cartao = useMemo<Cartao>(() => {
    if (fonte === "livre") {
      const texto = temTextoLivre ? textoLivre.trim() : "";
      return {
        id: CARTAO_LIVRE,
        nivel: 5,
        tipo: "texto",
        titulo: "Texto escolhido por você",
        itens: [],
        texto,
        total: palavrasDe(texto).length,
      };
    }
    const usados = [...historico.map((h) => h.cartaoId), ...pulados];
    return proximoCartao(nivelCartao, usados);
  }, [fonte, textoLivre, temTextoLivre, nivelCartao, historico, pulados]);
  const semTexto = fonte === "livre" && !temTextoLivre;
  const alvos = useMemo(
    () => (semTexto ? alvosLivres : alvosDoCartao(cartao)),
    [semTexto, alvosLivres, cartao],
  );

  function apagarAudio() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setAudioUrl(null);
  }
  function pararRelogio() {
    if (relogio.current) window.clearInterval(relogio.current);
    relogio.current = null;
  }
  // Ao sair da tela: nada de áudio sobrando.
  useEffect(
    () => () => {
      pararRelogio();
      gravador.current?.cancelar();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  function ligarRelogio(aoLimite: () => void) {
    inicio.current = Date.now();
    setTempo(0);
    pararRelogio();
    relogio.current = window.setInterval(() => {
      const s = (Date.now() - inicio.current) / 1000;
      setTempo(s);
      if (s >= LIMITE_SEGUNDOS) aoLimite();
    }, 250);
  }

  async function comecar(usarAudio: boolean) {
    if (!aluno) {
      toast.error("Escolha o aluno primeiro.");
      return;
    }
    setComAudio(usarAudio);
    if (usarAudio) {
      if (!podeGravar()) {
        toast.error("Este navegador não grava áudio. Use a opção de marcar sem gravar.");
        return;
      }
      try {
        gravador.current = await iniciarGravacao();
      } catch (e) {
        toast.error(mensagemErroMicrofone(e));
        return;
      }
    }
    setPasso("gravando");
    ligarRelogio(() => void terminar(usarAudio));
  }

  const terminando = useRef(false);
  async function terminar(usarAudio = comAudio) {
    if (terminando.current) return;
    terminando.current = true;
    pararRelogio();
    const cron = Math.min(LIMITE_SEGUNDOS, Math.max(1, (Date.now() - inicio.current) / 1000));
    try {
      if (!usarAudio) {
        setSegundos(Math.round(cron));
        setMarcas(alvos.map(() => "ok"));
        setDitos(alvos.map(() => undefined));
        setObsSofia("");
        abrirRevisao(
          alvos.map(() => "ok" as Marca),
          Math.round(cron),
        );
        return;
      }
      const g = await gravador.current!.parar();
      gravador.current = null;
      const seg = Math.round(g.segundos || cron);
      setSegundos(seg);
      apagarAudio();
      urlRef.current = URL.createObjectURL(g.blob);
      setAudioUrl(urlRef.current);
      setPasso("enviando");
      try {
        const env = await prepararParaEnvio(g);
        const r = await ouvirLeitura({
          audioBase64: env.base64,
          mime: env.mime,
          cartaoTexto: alvos.join(" "),
          cartaoTipo: semTexto ? "livre" : cartao.tipo,
          ano: aluno?.ano || "",
          alunoNome: aluno?.nome || "",
        });
        if (semTexto) {
          // Sem texto de referência: o que a Sofia ouviu vira a lista de palavras.
          const ouvidas = palavrasDe(r.transcricao);
          if (!ouvidas.length) throw new Error("A Sofia não ouviu nenhuma palavra na gravação.");
          const ms = ouvidas.map(() => "ok" as Marca);
          setAlvosLivres(ouvidas);
          setMarcas(ms);
          setDitos(ouvidas.map(() => undefined));
          setObsSofia(r.observacao);
          abrirRevisao(ms, seg);
          return;
        }
        const al = alinhar(alvos, palavrasDe(r.transcricao));
        const ms = al.map((x) => x.marca);
        setMarcas(ms);
        setDitos(al.map((x) => x.dito));
        setObsSofia(r.observacao);
        abrirRevisao(ms, seg);
      } catch (e) {
        toast.error(
          (e instanceof Error ? e.message : "A Sofia não conseguiu ouvir agora.") +
            (semTexto
              ? " Grave de novo. Nada foi cobrado."
              : " Você pode ouvir a gravação e marcar as palavras. Nada foi cobrado."),
        );
        if (semTexto) {
          apagarAudio();
          setPasso("preparar");
          return;
        }
        const ms = alvos.map(() => "ok" as Marca);
        setMarcas(ms);
        setDitos(alvos.map(() => undefined));
        setObsSofia("");
        abrirRevisao(ms, seg);
      }
    } finally {
      terminando.current = false;
    }
  }

  function abrirRevisao(ms: Marca[], seg: number) {
    const r = resumir(ms, seg);
    setNivel(sugerirNivel(cartao.tipo, r, metaFluencia(aluno?.ano || "", dados.metas)).nivel);
    setObs("");
    setPasso("revisar");
  }

  const resumo = useMemo(() => resumir(marcas, segundos), [marcas, segundos]);
  const sugestao = useMemo(
    () => sugerirNivel(cartao.tipo, resumo, metaFluencia(aluno?.ano || "", dados.metas)),
    [cartao.tipo, resumo, aluno?.ano, dados.metas],
  );
  // Enquanto a professora não escolher outro nível, o sugerido acompanha as marcações.
  const [mexeuNivel, setMexeuNivel] = useState(false);
  const nivelFinal: NivelLeitura = mexeuNivel && nivel ? nivel : sugestao.nivel;

  function trocarMarca(k: number) {
    setMarcas((ms) =>
      ms.map((m, j) => (j === k ? ORDEM[(ORDEM.indexOf(m) + 1) % ORDEM.length] : m)),
    );
  }
  function leuAte(n: number) {
    setMarcas((ms) => ms.map((m, j) => (j >= n ? "nao" : m === "nao" ? "ok" : m)));
  }
  const lidasAte = useMemo(() => {
    let u = -1;
    marcas.forEach((m, k) => {
      if (m !== "nao") u = k;
    });
    return u + 1;
  }, [marcas]);

  function recomecar() {
    pararRelogio();
    gravador.current?.cancelar();
    gravador.current = null;
    apagarAudio();
    setAlvosLivres([]);
    setMexeuNivel(false);
    setPasso("preparar");
  }

  function confirmar() {
    if (!aluno) return;
    salvarLeitura({
      id: novoId("lei"),
      alunoId: aluno.id,
      alunoNome: aluno.nome,
      turma: aluno.turma,
      data: new Date().toISOString(),
      cartaoId: cartao.id,
      cartaoNivel: cartao.nivel,
      tipo: cartao.tipo,
      total: resumo.total,
      lidas: resumo.lidas,
      corretas: resumo.corretas,
      precisao: resumo.precisao,
      pcpm: resumo.pcpm,
      segundos,
      nivelSugerido: sugestao.nivel,
      nivel: nivelFinal,
      obs: obs.trim() || undefined,
    });
    const tinhaAudio = !!urlRef.current;
    apagarAudio();
    setAlvosLivres([]);
    setMexeuNivel(false);
    setPasso("preparar");
    toast.success(
      tinhaAudio
        ? `Leitura de ${aluno.nome} registrada. O áudio foi apagado.`
        : `Leitura de ${aluno.nome} registrada.`,
    );
    aoSalvar?.();
  }

  // No celular, cada etapa começa no topo do quadro (o cartão fica inteiro na tela).
  const quadro = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (passo === "preparar") return;
    quadro.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [passo]);

  if (!alunos.length)
    return <div className="af-vazio">Cadastre os alunos na aba Turma para começar a avaliar.</div>;

  const unidade = cartao.tipo === "silabas" ? "sílabas" : "palavras";

  return (
    <div ref={quadro} style={{ scrollMarginTop: 70 }}>
      {passo === "preparar" && (
        <>
          <div className="af-card">
            <h2>1. Escolha o aluno e o que ele vai ler</h2>
            <p className="dica">
              A criança lê em voz alta por até um minuto. Pode ser um cartão do app, que já vem no
              nível do aluno, ou um livro ou outro texto que você escolher.
            </p>
            <div className="af-chips" role="group" aria-label="O que a criança vai ler">
              <button
                type="button"
                aria-pressed={fonte === "cartao"}
                onClick={() => setFonte("cartao")}
              >
                Com cartão do app
              </button>
              <button
                type="button"
                aria-pressed={fonte === "livre"}
                onClick={() => setFonte("livre")}
              >
                Sem cartão (livro ou outro texto)
              </button>
            </div>
            <div style={{ height: 12 }} />
            <div className="af-linha">
              <label className="af-campo">
                Aluno
                <select value={alunoId} onChange={(e) => setAlunoId(e.target.value)}>
                  {alunos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                      {a.turma ? ` (${a.turma})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="af-campo" hidden={fonte === "livre"}>
                Tipo de cartão
                <select
                  value={nivelCartao}
                  onChange={(e) => {
                    setNivelCartao(Number(e.target.value) as Cartao["nivel"]);
                    setPulados([]);
                  }}
                >
                  {NIVEIS_CARTAO.map((n) => (
                    <option key={n.n} value={n.n}>
                      {n.n}. {n.nome}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {ultimo ? (
              <div className="af-aviso">
                Na última avaliação, {aluno?.nome.split(" ")[0]} estava no nível{" "}
                <b>{NIVEIS_LEITURA.find((n) => n.n === ultimo.nivel)?.nome}</b>.
              </div>
            ) : (
              <div className="af-aviso">
                Primeira avaliação deste aluno.
                {fonte === "cartao"
                  ? " Comece por palavras simples. Se ficar fácil ou difícil, troque o tipo de cartão."
                  : ""}
              </div>
            )}
          </div>
          <div className="af-card forte">
            {fonte === "cartao" ? (
              <>
                <div className="af-linha" style={{ alignItems: "center", marginBottom: 10 }}>
                  <h2 style={{ flex: 1, margin: 0 }}>
                    Cartão {cartao.id}
                    {cartao.foco ? ` · ${cartao.foco}` : ""}
                  </h2>
                  <button
                    type="button"
                    className="af-mini"
                    onClick={() => setPulados((p) => [...p, cartao.id])}
                  >
                    Trocar cartão
                  </button>
                </div>
                <CartaoVisual c={cartao} />
              </>
            ) : (
              <>
                <h2>Leitura sem cartão</h2>
                <p className="dica">
                  Se quiser, cole ou digite aqui o trecho que a criança vai ler. Assim o app compara
                  palavra por palavra. Se deixar em branco, a Sofia escreve o que ouviu e você marca
                  o que a criança errou.
                </p>
                <label className="af-campo">
                  Texto que a criança vai ler (opcional)
                  <textarea
                    rows={5}
                    value={textoLivre}
                    onChange={(e) => setTextoLivre(e.target.value)}
                    maxLength={1500}
                    placeholder="Ex.: o primeiro parágrafo do livro da semana"
                  />
                </label>
              </>
            )}
            <div className="af-botoes">
              <button type="button" className="pn-btn primary" onClick={() => void comecar(true)}>
                Gravar e a Sofia ouve ({CUSTOS.leitura_avaliada} créditos)
              </button>
              <button
                type="button"
                className="pn-btn"
                disabled={semTexto}
                title={semTexto ? "Para marcar sem gravar, escreva o texto acima" : undefined}
                onClick={() => void comecar(false)}
              >
                Marcar eu mesma, sem gravar (grátis)
              </button>
            </div>
            <p className="dica" style={{ margin: "10px 0 0" }}>
              A gravação não fica guardada. Ela é apagada assim que você confirma o nível.
            </p>
          </div>
        </>
      )}

      {passo === "gravando" && (
        <div className="af-card forte">
          {semTexto ? (
            <div className="af-aviso">
              A criança lê o livro ou a folha que você escolheu. A Sofia vai escrever o que ouvir.
            </div>
          ) : (
            <CartaoVisual c={cartao} />
          )}
          <div className="af-grav">
            {comAudio ? (
              <span className="af-rec">
                <i /> Gravando a leitura de {aluno?.nome.split(" ")[0]}
              </span>
            ) : (
              <span className="af-rec" style={{ color: "var(--pn-ink)" }}>
                Marcando o tempo da leitura
              </span>
            )}
            <div className="af-tempo" aria-live="off">
              {mmss(tempo)}{" "}
              <small style={{ fontSize: 16, color: "var(--pn-muted)" }}>de 1:00</small>
            </div>
            <div className="af-botoes" style={{ marginTop: 0 }}>
              <button type="button" className="pn-btn ink" onClick={() => void terminar()}>
                Terminou de ler
              </button>
              <button type="button" className="af-link" onClick={recomecar}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {passo === "enviando" && (
        <div className="af-card forte">
          <div className="af-grav">
            <div className="af-tempo" style={{ fontSize: 24 }}>
              A Sofia está ouvindo a leitura…
            </div>
            <p className="dica">Leva alguns segundos. Não feche esta tela.</p>
          </div>
        </div>
      )}

      {passo === "revisar" && (
        <div className="af-card forte">
          <h2>2. Confira o que {aluno?.nome.split(" ")[0]} leu</h2>
          <p className="dica">
            {semTexto
              ? "Estas são as palavras que a Sofia ouviu. Toque nas que a criança leu errado. "
              : "Toque em uma palavra para corrigir a marcação. "}
            Cada toque muda entre: leu certo, trocou, pulou e não leu.
          </p>
          {audioUrl && (
            <audio controls src={audioUrl} style={{ width: "100%", margin: "4px 0 8px" }}>
              <track kind="captions" />
            </audio>
          )}
          {obsSofia && <div className="af-aviso sol">Sofia: {obsSofia}</div>}
          <div className="af-leg">
            <span>
              <i style={{ background: "#C5EBD9" }} /> leu certo
            </span>
            <span>
              <i style={{ background: "#FDE2C4" }} /> trocou
            </span>
            <span>
              <i style={{ background: "#FBD5D0" }} /> pulou
            </span>
            <span>
              <i style={{ background: "#fff", borderColor: "var(--pn-line)" }} /> não leu
            </span>
          </div>
          <div className="af-pals">
            {alvos.map((p, k) => (
              <button
                key={k}
                type="button"
                className={marcas[k]}
                onClick={() => trocarMarca(k)}
                aria-label={`${p}: ${ROTULO[marcas[k]]}`}
              >
                {p}
                <small>
                  {marcas[k] === "troca" && ditos[k] ? `disse ${ditos[k]}` : ROTULO[marcas[k]]}
                </small>
              </button>
            ))}
          </div>
          <label className="af-campo" style={{ maxWidth: 420 }}>
            Leu até a {unidade === "sílabas" ? "sílaba" : "palavra"} número {lidasAte} de{" "}
            {alvos.length}
            <input
              type="range"
              min={0}
              max={alvos.length}
              value={lidasAte}
              onChange={(e) => leuAte(Number(e.target.value))}
              style={{ padding: 0, height: 32 }}
            />
          </label>
          <div className="af-nums" style={{ marginTop: 12 }}>
            <div className="af-num">
              <b>
                {resumo.corretas} de {resumo.total}
              </b>
              <span>{unidade} lidas certo</span>
            </div>
            <div className="af-num">
              <b>{Math.round(resumo.precisao * 100)}%</b>
              <span>de acerto no que leu</span>
            </div>
            <div className="af-num">
              <b>{resumo.pcpm}</b>
              <span>{unidade} certas por minuto</span>
            </div>
            <div className="af-num">
              <b>{mmss(segundos)}</b>
              <span>tempo de leitura</span>
            </div>
          </div>
          <div className="af-sug">
            <b className="t">Nível sugerido pelo app</b>
            <div className="n">{NIVEIS_LEITURA.find((n) => n.n === sugestao.nivel)?.nome}</div>
            <p>{sugestao.porque}</p>
            <div className="af-linha">
              <label className="af-campo">
                Nível que você confirma
                <select
                  value={nivelFinal}
                  onChange={(e) => {
                    setNivel(Number(e.target.value) as NivelLeitura);
                    setMexeuNivel(true);
                  }}
                >
                  {NIVEIS_LEITURA.map((n) => (
                    <option key={n.n} value={n.n}>
                      {n.n}. {n.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="af-campo" style={{ flex: 2 }}>
                Observação (opcional)
                <input
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  placeholder="Ex.: estava tímido, leu baixinho"
                  maxLength={200}
                />
              </label>
            </div>
          </div>
          <div className="af-botoes">
            <button type="button" className="pn-btn primary" onClick={confirmar}>
              {audioUrl ? "Confirmar e apagar o áudio" : "Confirmar o nível"}
            </button>
            <button type="button" className="af-link" onClick={recomecar}>
              Descartar e começar de novo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
