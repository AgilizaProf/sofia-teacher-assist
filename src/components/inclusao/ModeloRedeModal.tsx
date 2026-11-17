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
  preencherModelo,
  valoresDeIdentificacao,
  ErroModelo,
  type DadosIdentificacao,
  type Lacuna,
} from "@/lib/pei/modeloRede";
import type { NivelBncc } from "@/lib/pei/bncc";
import { ModeloRedeFormulario } from "./ModeloRedeFormulario";

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
};

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
 * (Word .docx) uma vez, e o app devolve esse mesmo modelo preenchido com o
 * PEI de cada aluno. Cada professora tem o seu modelo, salvo só na conta dela.
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
  // "inicio": anexar/trocar o modelo. "tela": preencher campo a campo, como no documento.
  const [modo, setModo] = useState<"inicio" | "tela">("inicio");
  const [daSofia, setDaSofia] = useState<Set<string>>(new Set());
  const [completando, setCompletando] = useState(false);
  const [lacunas, setLacunas] = useState<Lacuna[] | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [preenchendo, setPreenchendo] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const creditosGate = useCreditosGate();
  const temModelo = !!modelo.base64;

  // Ao abrir, confere o modelo salvo (mostra quantos espaços ele tem).
  useEffect(() => {
    if (!open || !modelo.base64) {
      setLacunas(null);
      return;
    }
    let vivo = true;
    analisarModelo(deBase64(modelo.base64))
      .then((l) => vivo && setLacunas(l))
      .catch(() => vivo && setLacunas([]));
    return () => {
      vivo = false;
    };
  }, [open, modelo.base64]);

  useEffect(() => {
    if (!open) {
      setModo("inicio");
      setDaSofia(new Set());
    }
  }, [open]);

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
      setModelo({
        nome: f.name,
        tamanho: f.size,
        enviadoEm: new Date().toISOString(),
        base64: paraBase64(buf),
        lacunas: l.length,
      });
      setLacunas(l);
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
    setModelo({});
    setLacunas(null);
    toast.success("Modelo removido da sua conta.");
  };

  const preencher = async () => {
    if (!modelo.base64) return;
    const custo = CUSTOS.pei_modelo_rede;
    if (!(await creditosGate.checar({ custo, acao: "PEI no modelo da rede" }))) return;
    setPreenchendo(true);
    try {
      const buf = deBase64(modelo.base64);
      const todas = lacunas && lacunas.length ? lacunas : await analisarModelo(buf);
      if (!todas.length) {
        toast.error(
          'Não achei espaços em branco no seu modelo. Confira se ele tem linhas ____, células vazias ou "Campo:".',
        );
        return;
      }
      // Identificação (nome, nascimento, escola...) vai direto, sem IA.
      const fixos = valoresDeIdentificacao(todas, dados);
      const resto = todas.filter((l) => !(l.id in fixos));
      let daIA: Record<string, string> = {};
      if (resto.length) {
        const resp = await invocarIA<{ valores?: Record<string, string> }>("preencher-modelo-pei", {
          body: { aluno: alunoNome, contexto, lacunas: resto },
          validar: (d) => !!d?.valores && typeof d.valores === "object",
        });
        daIA = resp.valores || {};
      }
      const valores = { ...daIA, ...fixos };
      const blob = await preencherModelo(buf, valores);
      const base = (modelo.nome || "modelo").replace(/\.docx$/i, "");
      baixar(blob, `PEI-${nomeArquivo(alunoNome)}-${nomeArquivo(base)}.docx`);
      const feitos = Object.values(valores).filter((v) => String(v || "").trim()).length;
      toast.success(
        `Modelo preenchido: ${feitos} de ${todas.length} espaços. Confira no Word antes de imprimir.`,
        { duration: 7000 },
      );
      if (resto.length)
        void consumirCreditos(custo, descricaoDoc("PEI no modelo da rede", alunoNome));
    } catch (e) {
      toast.error(
        e instanceof ErroIA || e instanceof ErroModelo
          ? e.message
          : "Não consegui preencher o modelo agora. Tente de novo.",
      );
      if (e instanceof ErroIA) console.warn("[modelo-rede]", e.tipo, e.detalhe);
    } finally {
      setPreenchendo(false);
    }
  };

  const exemplos = (lacunas || []).slice(0, 8).map((l) => l.rotulo);

  // ---- Preencher na tela ----
  const chaveModelo = modelo.enviadoEm || modelo.nome || "";
  const salvo = preenchidos[alunoId];
  const valoresTela: Record<string, string> =
    salvo && salvo.modelo === chaveModelo
      ? salvo.valores
      : lacunas
        ? valoresDeIdentificacao(lacunas, dados)
        : {};
  const gravar = (novos: Record<string, string>) =>
    setPreenchidos((prev) => ({
      ...prev,
      [alunoId]: { modelo: chaveModelo, valores: novos, em: new Date().toISOString() },
    }));
  const mudarCampo = (id: string, valor: string) => gravar({ ...valoresTela, [id]: valor });
  const vazios = (lacunas || []).filter((l) => !String(valoresTela[l.id] || "").trim());

  const completarComSofia = async () => {
    if (!lacunas || !vazios.length) {
      toast.info("Todos os campos já estão preenchidos.");
      return;
    }
    const custo = CUSTOS.pei_modelo_rede;
    if (!(await creditosGate.checar({ custo, acao: "PEI no modelo da rede" }))) return;
    setCompletando(true);
    try {
      const resp = await invocarIA<{ valores?: Record<string, string> }>("preencher-modelo-pei", {
        body: { aluno: alunoNome, contexto, lacunas: vazios },
        validar: (d) => !!d?.valores && typeof d.valores === "object",
      });
      const novos = { ...valoresTela };
      const marcados = new Set<string>();
      for (const l of vazios) {
        const v = String(resp.valores?.[l.id] || "").trim();
        if (v) {
          novos[l.id] = v;
          marcados.add(l.id);
        }
      }
      gravar(novos);
      setDaSofia(marcados);
      toast.success(
        marcados.size
          ? `A Sofia preencheu ${marcados.size} campo${marcados.size === 1 ? "" : "s"}. Revise e ajuste o que quiser.`
          : "O PEI ainda não tem informação para os campos vazios.",
      );
      if (marcados.size)
        void consumirCreditos(custo, descricaoDoc("PEI no modelo da rede", alunoNome));
    } catch (e) {
      toast.error(e instanceof ErroIA ? e.message : "A Sofia não conseguiu agora. Tente de novo.");
    } finally {
      setCompletando(false);
    }
  };

  const baixarDaTela = async () => {
    if (!modelo.base64) return;
    try {
      const blob = await preencherModelo(deBase64(modelo.base64), valoresTela);
      const base = (modelo.nome || "modelo").replace(/\.docx$/i, "");
      baixar(blob, `PEI-${nomeArquivo(alunoNome)}-${nomeArquivo(base)}.docx`);
      toast.success("Word baixado com o que está na tela.");
    } catch (e) {
      toast.error(
        e instanceof ErroModelo ? e.message : "Não consegui gerar o Word. Tente de novo.",
      );
    }
  };

  if (modo === "tela" && temModelo) {
    const total = lacunas?.length || 0;
    return (
      <div
        className="inc-modal-overlay open"
        style={{ zIndex: 260 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="inc-modal" style={{ maxWidth: 980 }}>
          <div className="inc-modal-bar" />
          <div className="inc-modal-head">
            <div>
              <h2>
                {(modelo.nome || "Modelo da rede").replace(/\.docx$/i, "")} · {alunoNome}
              </h2>
              <span className="meta" style={{ display: "block", marginTop: 4 }}>
                Os campos do documento da sua rede, na mesma ordem. {total - vazios.length} de{" "}
                {total} preenchidos · salvo automaticamente
              </span>
            </div>
            <button className="inc-modal-close" onClick={onClose} aria-label="Fechar">
              <X size={16} />
            </button>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              padding: "8px 14px",
              borderBottom: "1px solid var(--border)",
              background: "#fff",
            }}
          >
            <button className="inc-btn-ghost" onClick={() => setModo("inicio")}>
              <ArrowLeft size={14} /> Voltar
            </button>
            <button
              className="inc-btn-ghost"
              onClick={() => void completarComSofia()}
              disabled={completando || !vazios.length}
              title="A Sofia escreve só nos campos vazios, usando o PEI do aluno"
              style={{ color: "#1F4FB8", borderColor: "#B9C8F5" }}
            >
              {completando ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {completando
                ? " Preenchendo…"
                : ` Sofia completa ${vazios.length === 1 ? "o campo vazio" : `os ${vazios.length} campos vazios`} (${custoTexto(CUSTOS.pei_modelo_rede)})`}
            </button>
          </div>
          <div className="inc-modal-body" style={{ background: "var(--bg)" }}>
            {!lacunas ? (
              <p style={{ fontSize: 13, color: "var(--muted)" }}>Lendo o modelo…</p>
            ) : (
              <ModeloRedeFormulario
                lacunas={lacunas}
                valores={valoresTela}
                onChange={mudarCampo}
                daSofia={daSofia}
                etapaPrefix={etapaPrefix}
                nivelBncc={nivelBncc}
              />
            )}
          </div>
          <div className="inc-modal-foot">
            <span className="legal">Baixar o Word não gasta créditos</span>
            <button
              className="btn btn-primary"
              onClick={() => void baixarDaTela()}
              disabled={!lacunas}
            >
              <Download size={14} /> Baixar Word
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="inc-modal-overlay open"
      style={{ zIndex: 260 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="inc-modal" style={{ maxWidth: 560 }}>
        <div className="inc-modal-bar" />
        <div className="inc-modal-head">
          <div>
            <h2>Modelo de PEI da sua rede</h2>
            <span className="meta" style={{ display: "block", marginTop: 4 }}>
              Anexe o modelo que a sua rede usa. A Sofia preenche com o PEI de{" "}
              {alunoNome || "cada aluno"}.
            </span>
          </div>
          <button className="inc-modal-close" onClick={onClose} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>

        <div className="inc-modal-body" style={{ background: "var(--bg)" }}>
          <input
            ref={inputRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            hidden
            onChange={(e) => void escolherArquivo(e.target.files?.[0])}
          />

          {temModelo ? (
            <div
              style={{
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileText size={28} color="#1F4FB8" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 14,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {modelo.nome}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {modelo.enviadoEm
                      ? `Enviado em ${new Date(modelo.enviadoEm).toLocaleDateString("pt-BR")}`
                      : ""}
                    {lacunas
                      ? ` · ${lacunas.length} espaço${lacunas.length === 1 ? "" : "s"} para preencher`
                      : " · conferindo…"}
                  </div>
                </div>
              </div>
              {exemplos.length > 0 && (
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
                  Espaços encontrados: {exemplos.join(" · ")}
                  {(lacunas?.length || 0) > exemplos.length ? " …" : ""}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <button
                  className="inc-btn-ghost"
                  onClick={() => inputRef.current?.click()}
                  disabled={enviando || preenchendo}
                >
                  {enviando ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}{" "}
                  Trocar modelo
                </button>
                <button
                  className="inc-btn-ghost"
                  onClick={remover}
                  disabled={enviando || preenchendo}
                  style={{ color: "#C62B2B" }}
                >
                  <Trash2 size={14} /> Remover
                </button>
              </div>
            </div>
          ) : (
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
          )}

          <ul
            style={{
              fontSize: 12,
              color: "var(--muted)",
              margin: "12px 0 0",
              paddingLeft: 18,
              lineHeight: 1.5,
            }}
          >
            <li>
              A Sofia preenche os espaços em branco: linhas ____, células vazias de tabela, "Campo:"
              no fim da linha, caixas ( ) para marcar e campos do Word.
            </li>
            <li>O resto do documento (logo, cabeçalho, tabelas e letras) fica igual ao da rede.</li>
            <li>
              Usa o que está preenchido no PEI. O que o PEI não tiver fica em branco para você
              completar.
            </li>
            <li>🔒 O modelo fica salvo só na sua conta. Outras professoras não veem.</li>
          </ul>
        </div>

        <div className="inc-modal-foot">
          <span className="legal">Sofia: {custoTexto(CUSTOS.pei_modelo_rede)} por aluno</span>
          <button
            className="inc-btn-ghost"
            onClick={() => void preencher()}
            disabled={!temModelo || preenchendo || enviando}
            title="A Sofia preenche tudo e o Word já baixa, sem passar pela tela"
          >
            {preenchendo ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {preenchendo ? " Preenchendo…" : " Direto no Word"}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setModo("tela")}
            disabled={!temModelo || preenchendo || enviando}
            title="Preencher campo a campo, seguindo o documento da rede"
          >
            <PencilLine size={14} /> Preencher na tela
          </button>
        </div>
      </div>
    </div>
  );
}
