import { useEffect, useMemo, useState } from "react";
import { X, Sparkles, CheckCircle2, Loader2, Lightbulb, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type PlanoInclusao = {
  id: string;
  data: string; // ISO yyyy-mm-dd
  alunoId: string;
  disciplina: string;
  tema: string;
  duracao: string;
  tipoAtividade: string;
  titulo: string;
  objetivo: string;
  abertura: string;
  desenvolvimento: string;
  fechamento: string;
  habilidades: Array<{ codigo: string; descricao: string }>;
  adaptacoes: Array<{ categoria: string; texto: string }>;
  sugestoes: Array<{ titulo: string; descricao: string }>;
  materiais: string[];
  observacoes: string;
  avaliacao: string;
  metodologia: string;
};

type Aluno = {
  id: string;
  name: string;
  diag?: string;
  cid?: string;
  anoEscolar?: string;
  turma?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  aluno: Aluno | null;
  anamneseResumo: string;
  onSaved: (plano: PlanoInclusao) => void;
};

const TEMA_SUGESTOES = [
  "Leitura compartilhada", "Frações", "Sistema solar", "Verbos",
  "Tabuada do 2 ao 5", "Ciclo da água", "História do bairro",
  "Produção de texto narrativo", "Geometria - formas",
];

const METODOLOGIA_SUGESTOES = [
  "Ensino estruturado (TEACCH) com apoio visual passo a passo",
  "Aprendizagem cooperativa em duplas com mediação",
  "Rotina com pictogramas e antecipação das etapas",
  "Pareamento de conteúdo abstrato com material concreto",
  "Jogos pedagógicos com tempo controlado e pausas previstas",
  "Aprendizagem baseada em projeto curto (2-3 aulas)",
];

const AVALIACAO_SUGESTOES = [
  "Observação direta com lista de verificação dos objetivos",
  "Registro fotográfico do produto + roda de conversa",
  "Avaliação processual: o aluno explica o que fez, com mediação",
  "Portfólio: anexar produção ao caderno do PEI",
  "Rubrica simplificada (consolidado / em desenvolvimento / não alcançado)",
];

const OBSERVACOES_SUGESTOES = [
  "Respondeu bem a estímulos visuais e apoio individual",
  "Apresentou desregulação no início; melhorou após pausa sensorial",
  "Necessitou de mediação constante para iniciar a tarefa",
  "Trabalhou em dupla com sucesso, comunicando a ideia ao colega",
  "Concluiu parcialmente; reforçar na próxima aula",
];

const TIPOS = ["Aula expositiva dialogada", "Atividade prática", "Jogo pedagógico", "Leitura mediada", "Produção textual", "Roda de conversa"];

function ChipRow({ items, onPick }: { items: string[]; onPick: (t: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
      {items.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onPick(t)}
          style={{
            fontSize: 11.5, padding: "5px 10px", borderRadius: 999,
            border: "1px solid var(--border)", background: "var(--accent-soft)",
            color: "#B8410E", fontWeight: 600, cursor: "pointer",
          }}
        >
          + {t.length > 60 ? t.slice(0, 58) + "…" : t}
        </button>
      ))}
    </div>
  );
}

export function PlanoInclusaoModal({ open, onClose, aluno, anamneseResumo, onSaved }: Props) {
  const [disciplina, setDisciplina] = useState("");
  const [tema, setTema] = useState("");
  const [duracao, setDuracao] = useState("45 min");
  const [tipoAtividade, setTipoAtividade] = useState(TIPOS[0]);
  const [observacoes, setObservacoes] = useState("");
  const [avaliacao, setAvaliacao] = useState("");
  const [metodologia, setMetodologia] = useState("");
  const [loading, setLoading] = useState(false);
  const [plano, setPlano] = useState<Omit<PlanoInclusao, "id" | "data" | "alunoId" | "observacoes" | "avaliacao" | "metodologia"> | null>(null);

  useEffect(() => {
    if (open) {
      setPlano(null);
      setDisciplina("");
      setTema("");
      setObservacoes("");
      setAvaliacao("");
      setMetodologia("");
    }
  }, [open, aluno?.id]);

  const condicaoLabel = useMemo(() => {
    if (!aluno) return "";
    const parts = [aluno.diag, aluno.cid].filter(Boolean);
    return parts.join(" · ");
  }, [aluno]);

  async function gerar() {
    if (!aluno) return;
    setLoading(true);
    try {
      const anotacoesCombinadas = [
        condicaoLabel ? `Condição: ${condicaoLabel}` : "",
        anamneseResumo ? `Anamnese (resumo):\n${anamneseResumo}` : "Anamnese ainda não preenchida — gere assim mesmo, considerando práticas inclusivas gerais para a condição informada.",
      ].filter(Boolean).join("\n\n");

      const { data, error } = await supabase.functions.invoke("gerar-atividade", {
        body: {
          modo: "pcd",
          anoEscolar: aluno.anoEscolar || "",
          turma: aluno.turma || "",
          disciplina,
          tema,
          duracao,
          tipoAtividade,
          incluirPCD: true,
          alunoFoco: {
            nome: aluno.name,
            codigo: condicaoLabel || "PCD",
            anotacoes: anotacoesCombinadas,
          },
        },
      });
      if (error) throw error;
      const p = (data as { plano?: typeof plano })?.plano;
      if (!p) throw new Error("Sofia não conseguiu estruturar o plano.");
      setPlano(p);
      toast.success("Plano gerado pela Sofia");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar plano", { description: e instanceof Error ? e.message : "Tente novamente." });
    } finally {
      setLoading(false);
    }
  }

  function salvar() {
    if (!aluno || !plano) return;
    const novo: PlanoInclusao = {
      id: crypto.randomUUID(),
      data: new Date().toISOString().slice(0, 10),
      alunoId: aluno.id,
      disciplina,
      tema,
      duracao,
      tipoAtividade,
      ...plano,
      observacoes,
      avaliacao,
      metodologia,
    };
    onSaved(novo);
    toast.success("Plano adaptado salvo");
    onClose();
  }

  if (!aluno) return null;

  return (
    <div className={"inc-modal-overlay" + (open ? " open" : "")} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="inc-modal" style={{ maxWidth: 880 }}>
        <div className="inc-modal-bar" />
        <div className="inc-modal-head">
          <h2>Gerar plano adaptado · {aluno.name.split(" ")[0]}</h2>
          <span className="meta">
            {aluno.anoEscolar || "Ano não informado"}<br />
            {condicaoLabel || "Condição não informada"}
          </span>
          <button className="inc-modal-close" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </div>

        <div className="inc-modal-body plain" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {!plano && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                  Disciplina
                  <input value={disciplina} onChange={(e) => setDisciplina(e.target.value)} placeholder="Ex.: Matemática"
                    style={{ padding: "9px 11px", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, fontWeight: 500, color: "var(--text)", textTransform: "none", letterSpacing: 0 }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                  Duração
                  <select value={duracao} onChange={(e) => setDuracao(e.target.value)}
                    style={{ padding: "9px 11px", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, fontWeight: 500, color: "var(--text)", textTransform: "none", letterSpacing: 0, background: "#fff" }}>
                    {["30 min", "45 min", "60 min", "90 min"].map((d) => <option key={d}>{d}</option>)}
                  </select>
                </label>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                Tema
                <input value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Ex.: Frações"
                  style={{ padding: "9px 11px", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, fontWeight: 500, color: "var(--text)", textTransform: "none", letterSpacing: 0 }} />
                <ChipRow items={TEMA_SUGESTOES} onPick={(t) => setTema(t)} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                Tipo de atividade
                <select value={tipoAtividade} onChange={(e) => setTipoAtividade(e.target.value)}
                  style={{ padding: "9px 11px", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, fontWeight: 500, color: "var(--text)", textTransform: "none", letterSpacing: 0, background: "#fff" }}>
                  {TIPOS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <div style={{ background: "var(--accent-soft)", border: "1px solid #FFD4B8", color: "#B8410E", borderRadius: 8, padding: "10px 12px", fontSize: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <Lightbulb size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                <span>
                  A Sofia vai considerar <b>{aluno.anoEscolar || "ano não informado"}</b>, <b>{condicaoLabel || "perfil singular"}</b> e a anamnese ({anamneseResumo ? "preenchida" : "ainda em branco"}).
                  Campos faltantes não impedem a geração.
                </span>
              </div>
            </>
          )}

          {plano && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
                <h4 style={{ fontFamily: "'Fraunces',serif", fontSize: 17, marginBottom: 6 }}>{plano.titulo}</h4>
                <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>{plano.objetivo}</p>
                {plano.habilidades?.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    {plano.habilidades.map((h) => (
                      <span key={h.codigo} title={h.descricao} style={{ fontFamily: "'JetBrains Mono',monospace", background: "var(--bg)", padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700 }}>{h.codigo}</span>
                    ))}
                  </div>
                )}
                <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
                  <div><b>Abertura.</b> {plano.abertura}</div>
                  <div><b>Desenvolvimento.</b> {plano.desenvolvimento}</div>
                  <div><b>Fechamento.</b> {plano.fechamento}</div>
                </div>
                {plano.materiais?.length > 0 && (
                  <div style={{ marginTop: 10, fontSize: 12.5 }}>
                    <b>Materiais:</b> {plano.materiais.join(", ")}
                  </div>
                )}
                {plano.adaptacoes?.length > 0 && (
                  <div style={{ marginTop: 10, padding: 10, background: "var(--accent-soft)", borderRadius: 8 }}>
                    <b style={{ fontSize: 12, color: "#B8410E", textTransform: "uppercase", letterSpacing: ".06em" }}>Adaptações específicas</b>
                    <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12.5 }}>
                      {plano.adaptacoes.map((a, i) => <li key={i}><b>{a.categoria}:</b> {a.texto}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                Metodologia
                <textarea value={metodologia} onChange={(e) => setMetodologia(e.target.value)} rows={3} placeholder="Como você vai conduzir a aula com este aluno"
                  style={{ padding: "9px 11px", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, color: "var(--text)", textTransform: "none", letterSpacing: 0, resize: "vertical" }} />
                <ChipRow items={METODOLOGIA_SUGESTOES} onPick={(t) => setMetodologia((p) => p ? p + " " + t : t)} />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                Avaliação
                <textarea value={avaliacao} onChange={(e) => setAvaliacao(e.target.value)} rows={3} placeholder="Como você vai avaliar este aluno"
                  style={{ padding: "9px 11px", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, color: "var(--text)", textTransform: "none", letterSpacing: 0, resize: "vertical" }} />
                <ChipRow items={AVALIACAO_SUGESTOES} onPick={(t) => setAvaliacao((p) => p ? p + " " + t : t)} />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                Observações
                <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} placeholder="Anote o que aconteceu, ajustes, próximos passos"
                  style={{ padding: "9px 11px", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, color: "var(--text)", textTransform: "none", letterSpacing: 0, resize: "vertical" }} />
                <ChipRow items={OBSERVACOES_SUGESTOES} onPick={(t) => setObservacoes((p) => p ? p + " " + t : t)} />
              </label>
            </div>
          )}
        </div>

        <div className="inc-modal-foot">
          <span className="legal">O plano será salvo no histórico de {aluno.name.split(" ")[0]}.</span>
          <button className="inc-btn-ghost" onClick={onClose}>Cancelar</button>
          {!plano ? (
            <button className="btn btn-primary" onClick={gerar} disabled={loading}>
              {loading ? <><Loader2 size={14} className="animate-spin" /> Gerando…</> : <><Sparkles size={14} /> Gerar com a Sofia</>}
            </button>
          ) : (
            <>
              <button className="inc-btn-ghost" onClick={gerar} disabled={loading}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Regerar
              </button>
              <button className="btn btn-primary" onClick={salvar}>
                <CheckCircle2 size={14} /> Salvar plano
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}