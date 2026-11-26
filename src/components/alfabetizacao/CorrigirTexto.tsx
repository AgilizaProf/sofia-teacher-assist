// Corrigir um texto escrito à mão pela foto: a Sofia lê, aponta os erros e
// sugere o nível de escrita. A professora confere, ajusta e confirma.
// A foto fica só na memória e some ao confirmar ou desistir.
import { useRef, useState } from "react";
import { toast } from "sonner";
import { CUSTOS } from "@/lib/creditos/policy";
import { corrigirTexto } from "@/lib/alfabetizacao/api";
import { CATEGORIAS, htmlAtividades } from "@/lib/alfabetizacao/erros";
import { prepararFoto } from "@/lib/alfabetizacao/imagem";
import { imprimirHtml } from "@/lib/alfabetizacao/imprimir";
import { dataCurta, novoId } from "@/lib/alfabetizacao/store";
import {
  CRITERIOS_ESCRITA,
  NIVEIS_ESCRITA,
  type AvaliacaoEscrita,
  type ErroEscrita,
  type NivelEscrita,
} from "@/lib/alfabetizacao/tipos";
import type { AlunoAlfa } from "./comum";

type Foto = { base64: string; mime: string; url: string };
type Passo = "foto" | "enviando" | "revisar" | "pronto";

const NOTAS = [
  { v: 1, t: "1. Ainda não faz" },
  { v: 2, t: "2. Faz com muita ajuda" },
  { v: 3, t: "3. Faz quase sempre" },
  { v: 4, t: "4. Faz bem" },
];

export function imprimirAtividade(e: AvaliacaoEscrita): void {
  if (!e.erros.length) {
    toast.message("Este texto não tem erros marcados para virar atividade.");
    return;
  }
  const ok = imprimirHtml(
    htmlAtividades([
      {
        alunoNome: e.alunoNome,
        turma: e.turma,
        data: dataCurta(e.data),
        erros: e.erros,
        semente: e.id,
      },
    ]),
  );
  if (!ok)
    toast.error("O navegador bloqueou a janela de impressão. Libere os pop-ups e tente de novo.");
}

export function CorrigirTexto({
  alunos,
  alunoInicial,
  salvarEscrita,
}: {
  alunos: AlunoAlfa[];
  alunoInicial?: string;
  salvarEscrita: (e: AvaliacaoEscrita) => void;
}) {
  const [alunoId, setAlunoId] = useState(alunoInicial || alunos[0]?.id || "");
  const aluno = alunos.find((a) => a.id === alunoId);
  const [proposta, setProposta] = useState("");
  const [foto, setFoto] = useState<Foto | null>(null);
  const [passo, setPasso] = useState<Passo>("foto");
  const arquivo = useRef<HTMLInputElement>(null);

  const [transcricao, setTranscricao] = useState("");
  const [nivelSug, setNivelSug] = useState<NivelEscrita>(4);
  const [porque, setPorque] = useState("");
  const [nivel, setNivel] = useState<NivelEscrita>(4);
  const [criterios, setCriterios] = useState<Record<string, number>>({});
  const [erros, setErros] = useState<ErroEscrita[]>([]);
  const [fortes, setFortes] = useState("");
  const [comentario, setComentario] = useState("");
  const [salvo, setSalvo] = useState<AvaliacaoEscrita | null>(null);

  async function escolher(f: File | undefined) {
    if (!f) return;
    try {
      setFoto(await prepararFoto(f));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui abrir esta foto.");
    }
  }

  function limparRevisao() {
    setTranscricao("");
    setPorque("");
    setCriterios({});
    setErros([]);
    setFortes("");
    setComentario("");
  }

  async function enviar() {
    if (!aluno || !foto) return;
    setPasso("enviando");
    try {
      const r = await corrigirTexto({
        imagemBase64: foto.base64,
        mime: foto.mime,
        ano: aluno.ano,
        proposta: proposta.trim(),
        alunoNome: aluno.nome,
      });
      setTranscricao(r.transcricao);
      setNivelSug(r.nivel_escrita);
      setNivel(r.nivel_escrita);
      setPorque(r.justificativa_nivel);
      setCriterios(r.criterios);
      setErros(r.erros);
      setFortes(r.pontos_fortes);
      setComentario(r.comentario);
      setPasso("revisar");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "A Sofia não conseguiu corrigir agora.");
      setPasso("foto");
    }
  }

  function semSofia() {
    if (!aluno) return;
    limparRevisao();
    setNivelSug(4);
    setNivel(4);
    setPasso("revisar");
  }

  function confirmar() {
    if (!aluno) return;
    const limpos = erros
      .map((e) => ({ ...e, escrita: e.escrita.trim(), correta: e.correta.trim() }))
      .filter((e) => e.escrita || e.correta);
    const av: AvaliacaoEscrita = {
      id: novoId("esc"),
      alunoId: aluno.id,
      alunoNome: aluno.nome,
      turma: aluno.turma,
      data: new Date().toISOString(),
      proposta: proposta.trim() || undefined,
      transcricao: transcricao.trim(),
      nivelSugerido: nivelSug,
      nivel,
      criterios,
      erros: limpos,
      comentario: comentario.trim(),
      pontosFortes: fortes.trim() || undefined,
    };
    salvarEscrita(av);
    setSalvo(av);
    setFoto(null); // a foto não fica guardada
    setPasso("pronto");
    toast.success(`Texto de ${aluno.nome} registrado. A foto foi descartada.`);
  }

  function outro() {
    setFoto(null);
    setSalvo(null);
    limparRevisao();
    setPasso("foto");
  }

  if (!alunos.length)
    return <div className="af-vazio">Cadastre os alunos na aba Turma para começar a corrigir.</div>;

  return (
    <div>
      {passo === "foto" && (
        <div className="af-card forte">
          <h2>1. Tire a foto do texto</h2>
          <p className="dica">
            Fotografe a folha inteira, de cima, com boa luz. A Sofia lê a letra da criança, aponta
            os erros e sugere o nível de escrita. Você confere antes de salvar.
          </p>
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
            <label className="af-campo" style={{ flex: 2 }}>
              O que foi pedido (opcional)
              <input
                value={proposta}
                onChange={(e) => setProposta(e.target.value)}
                placeholder="Ex.: reescrever a história da Chapeuzinho Vermelho"
                maxLength={300}
              />
            </label>
          </div>
          <input
            ref={arquivo}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              void escolher(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {foto && (
            <div style={{ marginTop: 12 }}>
              <img className="af-foto" src={foto.url} alt="Foto do texto do aluno" />
            </div>
          )}
          <div className="af-botoes">
            <button
              type="button"
              className={"pn-btn" + (foto ? "" : " primary")}
              onClick={() => arquivo.current?.click()}
            >
              {foto ? "Trocar a foto" : "Tirar ou escolher a foto"}
            </button>
            {foto && (
              <button type="button" className="pn-btn primary" onClick={() => void enviar()}>
                Corrigir com a Sofia ({CUSTOS.texto_corrigido} créditos)
              </button>
            )}
            <button type="button" className="af-link" onClick={semSofia}>
              Registrar eu mesma, sem a Sofia (grátis)
            </button>
          </div>
          <p className="dica" style={{ margin: "10px 0 0" }}>
            A foto não fica guardada. Só o resultado que você confirmar vai para a ficha do aluno.
          </p>
        </div>
      )}

      {passo === "enviando" && (
        <div className="af-card forte">
          <div className="af-grav">
            <div className="af-tempo" style={{ fontSize: 24 }}>
              A Sofia está lendo o texto…
            </div>
            <p className="dica">Pode levar até um minuto. Não feche esta tela.</p>
          </div>
        </div>
      )}

      {passo === "revisar" && (
        <div className="af-card forte">
          <h2>2. Confira a correção de {aluno?.nome.split(" ")[0]}</h2>
          <p className="dica">Tudo aqui pode ser ajustado por você antes de salvar.</p>
          <div className="af-g2">
            {foto && <img className="af-foto" src={foto.url} alt="Foto do texto do aluno" />}
            <label className="af-campo">
              O que a criança escreveu
              <textarea
                rows={8}
                value={transcricao}
                onChange={(e) => setTranscricao(e.target.value)}
                placeholder="Copie aqui o texto do jeito que a criança escreveu"
              />
            </label>
          </div>

          <div className="af-sug">
            <b className="t">{porque ? "Nível sugerido pela Sofia" : "Nível de escrita"}</b>
            {porque && (
              <>
                <div className="n">{NIVEIS_ESCRITA.find((n) => n.n === nivelSug)?.nome}</div>
                <p>{porque}</p>
              </>
            )}
            <label className="af-campo" style={{ maxWidth: 460 }}>
              Nível que você confirma
              <select
                value={nivel}
                onChange={(e) => setNivel(Number(e.target.value) as NivelEscrita)}
              >
                {NIVEIS_ESCRITA.map((n) => (
                  <option key={n.n} value={n.n}>
                    {n.n}. {n.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <h3 style={{ marginTop: 16 }}>Como está cada ponto</h3>
          <div className="af-crit">
            {CRITERIOS_ESCRITA.map((c) => (
              <label key={c.id} className="af-campo">
                {c.nome}
                <select
                  value={criterios[c.id] || 0}
                  onChange={(e) => setCriterios((x) => ({ ...x, [c.id]: Number(e.target.value) }))}
                >
                  <option value={0}>Não avaliado</option>
                  {NOTAS.map((n) => (
                    <option key={n.v} value={n.v}>
                      {n.t}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <h3 style={{ marginTop: 16 }}>Erros encontrados</h3>
          <p className="dica">
            Cada erro tem um tipo. É por ele que o app monta a atividade de fixação deste aluno.
          </p>
          {erros.map((er, k) => (
            <div className="af-erro" key={k}>
              <input
                aria-label="Como a criança escreveu"
                placeholder="Como escreveu"
                value={er.escrita}
                onChange={(e) =>
                  setErros((xs) =>
                    xs.map((x, j) => (j === k ? { ...x, escrita: e.target.value } : x)),
                  )
                }
              />
              <input
                aria-label="Como se escreve"
                placeholder="Como se escreve"
                value={er.correta}
                onChange={(e) =>
                  setErros((xs) =>
                    xs.map((x, j) => (j === k ? { ...x, correta: e.target.value } : x)),
                  )
                }
              />
              <select
                aria-label="Tipo de erro"
                value={er.cat}
                onChange={(e) =>
                  setErros((xs) => xs.map((x, j) => (j === k ? { ...x, cat: e.target.value } : x)))
                }
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label="Tirar este erro"
                onClick={() => setErros((xs) => xs.filter((_, j) => j !== k))}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="af-mini"
            onClick={() => setErros((xs) => [...xs, { escrita: "", correta: "", cat: "outro" }])}
          >
            Adicionar um erro
          </button>

          <div className="af-g2" style={{ marginTop: 16 }}>
            <label className="af-campo">
              O que a criança já faz bem
              <textarea rows={3} value={fortes} onChange={(e) => setFortes(e.target.value)} />
            </label>
            <label className="af-campo">
              Comentário para você
              <textarea
                rows={3}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
              />
            </label>
          </div>

          <div className="af-botoes">
            <button type="button" className="pn-btn primary" onClick={confirmar}>
              {foto ? "Confirmar e descartar a foto" : "Confirmar e salvar"}
            </button>
            <button type="button" className="af-link" onClick={outro}>
              Descartar
            </button>
          </div>
        </div>
      )}

      {passo === "pronto" && salvo && (
        <div className="af-card forte">
          <h2>Pronto. O texto de {salvo.alunoNome.split(" ")[0]} está na ficha.</h2>
          <p className="dica">
            Nível confirmado: <b>{NIVEIS_ESCRITA.find((n) => n.n === salvo.nivel)?.nome}</b>.{" "}
            {salvo.erros.length
              ? "O app já montou uma atividade de fixação só para este aluno, com os tipos de erro que apareceram no texto."
              : "Nenhum erro foi marcado neste texto."}
          </p>
          <div className="af-botoes">
            {salvo.erros.length > 0 && (
              <button
                type="button"
                className="pn-btn primary"
                onClick={() => imprimirAtividade(salvo)}
              >
                Imprimir a atividade de {salvo.alunoNome.split(" ")[0]}
              </button>
            )}
            <button type="button" className="pn-btn" onClick={outro}>
              Corrigir outro texto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
