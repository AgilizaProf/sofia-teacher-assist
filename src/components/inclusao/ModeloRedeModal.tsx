import { useEffect, useRef, useState } from "react";
import {
  X,
  Upload,
  FileText,
  Trash2,
  Loader2,
  Download,
  ArrowLeft,
  Sparkles,
  PencilLine,
} from "lucide-react";
import { toast } from "sonner";
import { usePersistentState } from "@/lib/persist/usePersistentState";
import { invocarIA, ErroIA } from "@/lib/sofia/invocarIA";
import { consumirCreditos, descricaoDoc } from "@/lib/creditos/consume";
import { CUSTOS, custoTexto } from "@/lib/creditos/policy";
import { useCreditosGate } from "@/lib/creditos/CreditosGate";
import {
  analisarModelo,
  visualizarModelo,
  type ModeloVisual,
  preencherModelo,
  valoresDeIdentificacao,
  ErroModelo,
  type DadosIdentificacao,
} from "@/lib/pei/modeloRede";
import type { NivelBncc } from "@/lib/pei/bncc";
import { ModeloRedeDocumento } from "./ModeloRedeDocumento";
import { PEISuggestions, appendText } from "./PEISuggestions";
import { campoDoModelo } from "@/lib/pei/camposModelo";
import { supabase } from "@/integrations/supabase/client";
import {
  diarioDoAluno,
  montarFontesDoAluno,
  type FontesBrutas,
  type FontesDoAluno,
} from "@/lib/pei/fontesDoAluno";

/** Lê um bloco salvo pelo app (mesmas chaves do usePersistentState), sem criar outra sincronização. */
function lerLocal<T>(chave: string): T | null {
  try {
    const raw = window.localStorage.getItem(`aprof:${chave}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

const semAcento = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

/**
 * O que o app já sabe do aluno fora do PEI: anamnese, registros, relatório de
 * inclusão, diário de bordo e mensagens do WhatsApp confirmadas.
 */
async function juntarFontes(alunoId: string, alunoNome: string): Promise<FontesDoAluno> {
  const por = <T,>(chave: string) => lerLocal<Record<string, T>>(chave)?.[alunoId] ?? null;
  const brutas: FontesBrutas = {
    anamnese: por<FontesBrutas["anamnese"]>("inc_anam"),
    anamneseObsGeral: por<string>("inc_anam_obs_geral"),
    registros: por<FontesBrutas["registros"]>("inc_reg"),
    parecer: por<FontesBrutas["parecer"]>("inc_parecer"),
    diario: diarioDoAluno(
      lerLocal<
        Array<{ date?: string; title?: string; text?: string; tags?: string[]; alunoIds?: unknown }>
      >("plan_m6_entries"),
      alunoId,
      alunoNome,
    ),
  };
  try {
    // Só as mensagens que a professora já conferiu em "Para confirmar".
    const { data } = await supabase
      .from("whatsapp_entradas")
      .select("recebido_em, texto, aluno_id, aluno_nome")
      .eq("status", "confirmado")
      .order("recebido_em", { ascending: false })
      .limit(200);
    const nome = semAcento(alunoNome);
    brutas.whatsapp = (data || []).filter(
      (m) =>
        m.aluno_id === alunoId || (!!nome && !m.aluno_id && semAcento(m.aluno_nome || "") === nome),
    );
  } catch {
    // Sem a tabela ou sem internet: segue só com o que está no app.
  }
  return montarFontesDoAluno(brutas);
}

/** O que a professora escreveu no modelo, por aluno (vale enquanto o modelo for o mesmo). */
type PreenchidoPorAluno = Record<
  string,
  { modelo: string; valores: Record<string, string>; em: string }
>;

/** Modelo guardado na conta da professora (app_snapshots: só ela lê). */
type ModeloSalvo = {
  nome?: string;
  tamanho?: number;
  enviadoEm?: string;
  base64?: string;
  lacunas?: number;
  /** Marca do conteúdo do arquivo: o mesmo arquivo anexado de novo mantém o que foi escrito. */
  marca?: string;
};

/** A Sofia responde em partes, para modelos grandes não voltarem cortados. */
const POR_PEDIDO = 40;

function marcaDoArquivo(b64: string): string {
  let h = 5381;
  for (let i = 0; i < b64.length; i++) h = ((h << 5) + h + b64.charCodeAt(i)) | 0;
  return `${b64.length}-${(h >>> 0).toString(36)}`;
}

const MAX_BYTES = 1_500_000;

function paraBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function deBase64(b64: string): ArrayBuffer {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes.buffer;
}
function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function nomeArquivo(t: string) {
  return (
    t
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .replace(/\s+/g, "-") || "aluno"
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  alunoId: string;
  alunoNome: string;
  etapaPrefix?: string;
  nivelBncc: NivelBncc | null;
  /** PEI do aluno em texto (buildPEIContext), mais os dados de identificação. */
  contexto: string;
  dados: DadosIdentificacao;
};

/**
 * "Modelo da minha rede": a professora anexa o modelo de PEI da rede dela
 * (Word .docx) uma vez. O documento aparece na tela e ela escreve direto nos
 * espaços dele; a Sofia pode completar o que estiver vazio. Depois baixa o
 * mesmo arquivo preenchido. Cada professora tem o seu modelo, só na conta dela.
 */
export function ModeloRedeModal({
  open,
  onClose,
  alunoId,
  alunoNome,
  etapaPrefix,
  nivelBncc,
  contexto,
  dados,
}: Props) {
  const [modelo, setModelo] = usePersistentState<ModeloSalvo>("pei_modelo_rede", {});
  const [preenchidos, setPreenchidos] = usePersistentState<PreenchidoPorAluno>(
    "pei_modelo_rede_valores",
    {},
  );
  const [visual, setVisual] = useState<ModeloVisual | null>(null);
  const [erroLeitura, setErroLeitura] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [completando, setCompletando] = useState(false);
  const [daSofia, setDaSofia] = useState<Set<string>>(new Set());
  const [ativo, setAtivo] = useState<string | null>(null);
  // O que a Sofia vai usar além do PEI (anamnese, registros, WhatsApp...).
  const [fontes, setFontes] = useState<FontesDoAluno>({ texto: "", resumo: [] });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const creditosGate = useCreditosGate();
  const temModelo = !!modelo.base64;

  // Lê o modelo salvo para mostrar o documento na tela.
  useEffect(() => {
    if (!open || !modelo.base64) {
      setVisual(null);
      return;
    }
    let vivo = true;
    setErroLeitura(false);
    visualizarModelo(deBase64(modelo.base64))
      .then((v) => vivo && setVisual(v))
      .catch(() => vivo && setErroLeitura(true));
    return () => {
      vivo = false;
    };
  }, [open, modelo.base64]);

  useEffect(() => {
    if (!open) {
      setDaSofia(new Set());
      setAtivo(null);
      return;
    }
    let vivo = true;
    void juntarFontes(alunoId, alunoNome).then((f) => vivo && setFontes(f));
    return () => {
      vivo = false;
    };
  }, [open, alunoId, alunoNome]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  const escolherArquivo = async (f: File | undefined) => {
    if (!f) return;
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    if (ext !== "docx") {
      toast.error(
        ext === "pdf" || ext === "doc" || ext === "odt"
          ? "Envie o modelo em Word (.docx). Abra o arquivo no Word e use Arquivo › Salvar como › Documento do Word (.docx)."
          : "Envie o modelo em Word (.docx).",
        { duration: 8000 },
      );
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error(
        "O modelo passa de 1,5 MB. Tire imagens grandes do arquivo (deixe só o logo) e envie de novo.",
      );
      return;
    }
    setEnviando(true);
    try {
      const buf = await f.arrayBuffer();
      const l = await analisarModelo(buf);
      const base64 = paraBase64(buf);
      setModelo({
        nome: f.name,
        tamanho: f.size,
        enviadoEm: new Date().toISOString(),
        base64,
        lacunas: l.length,
        marca: marcaDoArquivo(base64),
      });
      if (l.length === 0) {
        toast.warning(
          'Guardei o modelo, mas não achei espaços em branco nele (linhas ____, células vazias ou "Campo:").',
        );
      } else {
        toast.success(
          `Modelo guardado. Encontrei ${l.length} espaço${l.length === 1 ? "" : "s"} para preencher.`,
        );
      }
    } catch (e) {
      toast.error(
        e instanceof ErroModelo
          ? e.message
          : "Não consegui ler esse arquivo. Confira se é um .docx.",
      );
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remover = () => {
    if (
      !window.confirm(
        "Remover o modelo da sua conta? O que você escreveu nele volta se anexar o mesmo arquivo de novo.",
      )
    )
      return;
    setModelo({});
    setVisual(null);
    toast.success("Modelo removido da sua conta.");
  };

  // O que está escrito no documento deste aluno. Vale enquanto o modelo for o mesmo.
  const lacunas = visual?.lacunas || [];
  const chaveModelo = modelo.marca || modelo.enviadoEm || modelo.nome || "";
  const salvo = preenchidos[alunoId];
  const valores: Record<string, string> =
    salvo && salvo.modelo === chaveModelo ? salvo.valores : valoresDeIdentificacao(lacunas, dados);
  // Sempre parte do que está salvo agora (a professora pode escrever enquanto a Sofia responde).
  const gravar = (mudancas: Record<string, string>) =>
    setPreenchidos((prev) => {
      const atual = prev[alunoId];
      const base =
        atual && atual.modelo === chaveModelo
          ? atual.valores
          : valoresDeIdentificacao(lacunas, dados);
      return {
        ...prev,
        [alunoId]: {
          modelo: chaveModelo,
          valores: { ...base, ...mudancas },
          em: new Date().toISOString(),
        },
      };
    });
  const mudarCampo = (id: string, valor: string) => gravar({ [id]: valor });
  const vazios = lacunas.filter((l) => !String(valores[l.id] || "").trim());

  const completarComSofia = async () => {
    if (!vazios.length) return;
    const custo = CUSTOS.pei_modelo_rede;
    if (!(await creditosGate.checar({ custo, acao: "PEI no modelo da rede" }))) return;
    setCompletando(true);
    // Lê de novo na hora: a professora pode ter acabado de confirmar uma mensagem.
    const f = await juntarFontes(alunoId, alunoNome).catch(() => fontes);
    setFontes(f);
    const tudo = f.texto
      ? `${contexto}\n\nOUTROS REGISTROS DO ALUNO NO APP (use quando o PEI não trouxer a informação):\n${f.texto}`
      : contexto;
    const marcados = new Set<string>();
    let falhou: unknown = null;
    try {
      const partes: (typeof vazios)[] = [];
      for (let i = 0; i < vazios.length; i += POR_PEDIDO)
        partes.push(vazios.slice(i, i + POR_PEDIDO));
      for (const parte of partes) {
        try {
          const resp = await invocarIA<{ valores?: Record<string, string> }>(
            "preencher-modelo-pei",
            {
              body: { aluno: alunoNome, contexto: tudo, lacunas: parte },
              validar: (d) => !!d?.valores && typeof d.valores === "object",
            },
          );
          const novos: Record<string, string> = {};
          for (const l of parte) {
            const v = String(resp.valores?.[l.id] || "").trim();
            if (v) {
              novos[l.id] = v;
              marcados.add(l.id);
            }
          }
          // Só entra onde continua vazio: não passa por cima do que ela escreveu enquanto esperava.
          if (Object.keys(novos).length)
            setPreenchidos((prev) => {
              const atual = prev[alunoId];
              const base =
                atual && atual.modelo === chaveModelo
                  ? atual.valores
                  : valoresDeIdentificacao(lacunas, dados);
              const junto = { ...base };
              for (const [id, v] of Object.entries(novos))
                if (!String(junto[id] || "").trim()) junto[id] = v;
              return {
                ...prev,
                [alunoId]: { modelo: chaveModelo, valores: junto, em: new Date().toISOString() },
              };
            });
        } catch (e) {
          falhou = e;
          break;
        }
      }
      setDaSofia(marcados);
      // Parou no meio: não cobra agora; a cobrança vem quando ela terminar.
      if (marcados.size && !falhou)
        void consumirCreditos(custo, descricaoDoc("PEI no modelo da rede", alunoNome));
      if (falhou && !marcados.size) throw falhou;
      if (falhou) {
        toast.warning(
          `A Sofia preencheu ${marcados.size} espaço${marcados.size === 1 ? "" : "s"} e parou. Clique de novo para ela continuar.`,
        );
        if (falhou instanceof ErroIA) console.warn("[modelo-rede]", falhou.tipo, falhou.detalhe);
      } else
        toast.success(
          marcados.size
            ? `A Sofia preencheu ${marcados.size} espaço${marcados.size === 1 ? "" : "s"} (em azul). Revise e ajuste o que quiser.`
            : "O PEI ainda não tem informação para os espaços vazios.",
        );
    } catch (e) {
      toast.error(e instanceof ErroIA ? e.message : "A Sofia não conseguiu agora. Tente de novo.");
      if (e instanceof ErroIA) console.warn("[modelo-rede]", e.tipo, e.detalhe);
    } finally {
      setCompletando(false);
    }
  };

  const baixarWord = async () => {
    if (!modelo.base64) return;
    try {
      const blob = await preencherModelo(deBase64(modelo.base64), valores);
      const base = (modelo.nome || "modelo").replace(/\.docx$/i, "");
      baixar(blob, `PEI-${nomeArquivo(alunoNome)}-${nomeArquivo(base)}.docx`);
      toast.success("Word baixado com o que está no documento.");
    } catch (e) {
      toast.error(
        e instanceof ErroModelo ? e.message : "Não consegui gerar o Word. Tente de novo.",
      );
    }
  };

  const campoAtivo = lacunas.find((l) => l.id === ativo) || null;
  const ajuda = campoAtivo && campoAtivo.tipo !== "opcoes" ? campoDoModelo(campoAtivo) : null;
  const total = lacunas.length;

  return (
    <div
      className="inc-modal-overlay open"
      style={{ zIndex: 260 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="inc-modal" style={{ maxWidth: temModelo ? 980 : 560 }}>
        <div className="inc-modal-bar" />
        <div className="inc-modal-head">
          <div>
            <h2>
              {temModelo
                ? `${(modelo.nome || "Modelo da rede").replace(/\.docx$/i, "")} · ${alunoNome}`
                : "Modelo de PEI da sua rede"}
            </h2>
            <span className="meta" style={{ display: "block", marginTop: 4 }}>
              {temModelo
                ? `Escreva direto nos espaços amarelos do documento. ${total - vazios.length} de ${total} preenchidos · salvo automaticamente`
                : "Anexe o modelo que a sua rede usa e preencha direto nele."}
            </span>
          </div>
          <button className="inc-modal-close" onClick={onClose} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          hidden
          onChange={(e) => void escolherArquivo(e.target.files?.[0])}
        />

        {temModelo && (
          <div
            style={{
              padding: "8px 14px",
              borderBottom: "1px solid var(--border)",
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button
                className="inc-btn-ghost"
                onClick={() => void completarComSofia()}
                disabled={completando || !vazios.length}
                title="A Sofia escreve só nos espaços vazios, usando o PEI do aluno"
                style={{ color: "#1F4FB8", borderColor: "#B9C8F5" }}
              >
                {completando ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                {completando
                  ? " Preenchendo…"
                  : !vazios.length
                    ? " Tudo preenchido"
                    : ` Sofia completa ${vazios.length === 1 ? "o espaço vazio" : `os ${vazios.length} espaços vazios`} (${custoTexto(CUSTOS.pei_modelo_rede)})`}
              </button>
              <span style={{ flex: 1 }} />
              <button
                className="inc-btn-ghost"
                onClick={() => inputRef.current?.click()}
                disabled={enviando}
              >
                {enviando ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}{" "}
                Trocar modelo
              </button>
              <button className="inc-btn-ghost" onClick={remover} style={{ color: "#C62B2B" }}>
                <Trash2 size={14} /> Remover
              </button>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
              A Sofia usa o que você já registrou deste aluno: PEI
              {fontes.resumo.length ? `, ${fontes.resumo.join(", ")}` : ""}.
            </div>
            {/* Sugestões do espaço em que a professora está escrevendo */}
            <div style={{ marginTop: 6, maxHeight: "34vh", overflowY: "auto", fontSize: 12 }}>
              {campoAtivo ? (
                <>
                  <span style={{ color: "var(--muted)" }}>Você está em: </span>
                  <b>{campoAtivo.rotulo}</b>
                  {ajuda && (
                    <PEISuggestions
                      key={campoAtivo.id}
                      fieldKey={ajuda.sugestao || "__sem__"}
                      prefix={etapaPrefix}
                      bncc={ajuda.bncc ? { campo: ajuda.bncc, nivel: nivelBncc } : undefined}
                      cid={dados.cid}
                      diagnostico={dados.diagnostico}
                      onPick={(t) =>
                        mudarCampo(campoAtivo.id, appendText(valores[campoAtivo.id] || "", t))
                      }
                    />
                  )}
                </>
              ) : (
                <span style={{ color: "var(--muted)" }}>
                  Clique em um espaço amarelo para escrever. As sugestões rápidas e a BNCC aparecem
                  aqui.
                </span>
              )}
            </div>
          </div>
        )}

        <div className="inc-modal-body" style={{ background: temModelo ? "#E4E7EC" : "var(--bg)" }}>
          {temModelo ? (
            erroLeitura ? (
              <p style={{ fontSize: 13 }}>
                Não consegui abrir o modelo guardado. Use "Trocar modelo" e anexe o arquivo de novo.
              </p>
            ) : !visual ? (
              <p style={{ fontSize: 13, color: "var(--muted)" }}>Abrindo o documento…</p>
            ) : (
              <ModeloRedeDocumento
                visual={visual}
                valores={valores}
                onChange={mudarCampo}
                daSofia={daSofia}
                ativo={ativo}
                onAtivo={setAtivo}
              />
            )
          ) : (
            <>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={enviando}
                style={{
                  width: "100%",
                  padding: "26px 14px",
                  borderRadius: 12,
                  border: "2px dashed var(--border)",
                  background: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {enviando ? (
                  <Loader2 size={26} className="animate-spin" />
                ) : (
                  <Upload size={26} color="#1F4FB8" />
                )}
                <b style={{ fontSize: 14 }}>Anexar o modelo da rede (Word .docx)</b>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  Até 1,5 MB. Se o modelo for PDF, abra no Word e salve como .docx.
                </span>
              </button>
              <ul
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  margin: "12px 0 0",
                  paddingLeft: 18,
                  lineHeight: 1.5,
                }}
              >
                <li>O documento da rede abre na tela e você escreve direto nos espaços dele.</li>
                <li>A Sofia pode completar os espaços vazios com o que está no PEI do aluno.</li>
                <li>No fim você baixa o mesmo Word, com logo e tabelas, já preenchido.</li>
                <li>🔒 O modelo fica salvo só na sua conta. Outras professoras não veem.</li>
              </ul>
            </>
          )}
        </div>

        <div className="inc-modal-foot">
          <span className="legal">
            {temModelo
              ? "Baixar o Word não gasta créditos"
              : "Anexe uma vez; vale para todos os alunos"}
          </span>
          <button className="inc-btn-ghost" onClick={onClose}>
            Fechar
          </button>
          {temModelo && (
            <button
              className="btn btn-primary"
              onClick={() => void baixarWord()}
              disabled={!visual}
            >
              <Download size={14} /> Baixar Word
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
