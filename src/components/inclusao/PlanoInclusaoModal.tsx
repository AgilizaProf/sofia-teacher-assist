import { useEffect, useMemo, useState } from "react";
import { X, Sparkles, CheckCircle2, Loader2, Lightbulb, RefreshCw, Check } from "lucide-react";
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

const DISCIPLINAS_EF = [
  "Língua Portuguesa", "Matemática", "Ciências", "História", "Geografia",
  "Arte", "Educação Física", "Inglês", "Ensino Religioso",
];

const CAMPOS_EI = [
  "O eu, o outro e o nós",
  "Corpo, gestos e movimentos",
  "Traços, sons, cores e formas",
  "Escuta, fala, pensamento e imaginação",
  "Espaços, tempos, quantidades, relações e transformações",
];

function isEducacaoInfantil(ano?: string) {
  return !!ano && /infantil|creche|pr[eé]/i.test(ano);
}

function anoNumerico(ano?: string): number {
  const m = (ano || "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/** Sugestões rápidas de tema, calibradas por disciplina/campo + ano escolar. */
function getTemaSugestoes(disciplinas: string[], ano?: string): string[] {
  const ei = isEducacaoInfantil(ano);
  const n = anoNumerico(ano);
  const d0 = disciplinas[0] || "";

  if (ei) {
    const map: Record<string, string[]> = {
      "O eu, o outro e o nós": ["Quem sou eu", "Minha família", "Sentimentos", "Combinados da turma", "Brincadeiras de roda"],
      "Corpo, gestos e movimentos": ["Circuito motor", "Dança das partes do corpo", "Equilíbrio com cordas", "Imitar animais", "Massinha e modelagem"],
      "Traços, sons, cores e formas": ["Cores primárias", "Pintura com guache", "Carimbos com folhas", "Música com sucata", "Colagem de formas"],
      "Escuta, fala, pensamento e imaginação": ["Leitura de história", "Reconto com fantoches", "Roda de poesia", "Trava-língua", "Inventando finais"],
      "Espaços, tempos, quantidades, relações e transformações": ["Contagem até 10 com objetos", "Grande e pequeno", "Calendário da semana", "Hortinha", "Misturas de cores"],
    };
    if (d0 && map[d0]) return map[d0];
    return ["Quem sou eu", "Cores primárias", "Contagem com objetos", "Leitura de história", "Circuito motor"];
  }

  // Fundamental — calibrar por disciplina + ano
  const ciclo: "I" | "II" = n >= 6 ? "II" : "I";
  const por: Record<string, Record<"I" | "II", string[]>> = {
    "Língua Portuguesa": {
      I: ["Sílabas simples", "Leitura compartilhada", "Lista de palavras", "Bilhete", "Reconto de história"],
      II: ["Crônica", "Notícia", "Verbos", "Concordância verbal", "Interpretação de poema"],
    },
    "Matemática": {
      I: ["Adição até 20", "Tabuada do 2 ao 5", "Sequência numérica", "Formas geométricas", "Sistema monetário"],
      II: ["Frações equivalentes", "Equações de 1º grau", "Razão e proporção", "Área e perímetro", "Estatística básica"],
    },
    "Ciências": {
      I: ["Os 5 sentidos", "Ciclo da água", "Animais vertebrados", "Higiene e saúde", "Plantas"],
      II: ["Sistema solar", "Células", "Cadeia alimentar", "Estados físicos da matéria", "Energia e calor"],
    },
    "História": {
      I: ["Minha família", "Brincadeiras de antigamente", "História do bairro", "Linha do tempo pessoal", "Profissões"],
      II: ["Brasil colônia", "Independência do Brasil", "Idade Média", "Revolução Industrial", "Era Vargas"],
    },
    "Geografia": {
      I: ["Pontos de referência", "Tipos de moradia", "Paisagens natural e cultural", "Mapa da escola", "Meios de transporte"],
      II: ["Cartografia", "Clima e relevo do Brasil", "Urbanização", "Globalização", "Hidrografia"],
    },
    "Arte": {
      I: ["Cores primárias e secundárias", "Cantigas populares", "Releitura de obra", "Modelagem com argila", "Brincadeiras cantadas"],
      II: ["Movimento modernista", "Música brasileira", "Fotografia", "Teatro de sombras", "Grafite e arte urbana"],
    },
    "Educação Física": {
      I: ["Brincadeiras de roda", "Circuito motor", "Pega-pega cooperativo", "Amarelinha", "Queimada"],
      II: ["Voleibol — fundamentos", "Basquete — passe e drible", "Ginástica artística", "Esportes de combate", "Dança contemporânea"],
    },
    "Inglês": {
      I: ["Greetings", "Colors and numbers", "My family", "Animals", "Food"],
      II: ["Simple present", "Past tense", "Daily routine", "Job interview", "Reading short stories"],
    },
    "Ensino Religioso": {
      I: ["Respeito ao outro", "Diversidade cultural", "Símbolos religiosos", "Histórias e tradições", "Convivência"],
      II: ["Ética e cidadania", "Religiões afro-brasileiras", "Direitos humanos", "Cultura indígena", "Tolerância"],
    },
  };
  if (d0 && por[d0]) return por[d0][ciclo];

  // Sem disciplina escolhida — sugestões gerais por ciclo
  return ciclo === "I"
    ? ["Leitura compartilhada", "Adição até 20", "Ciclo da água", "Minha família", "Cores primárias"]
    : ["Frações", "Sistema solar", "Verbos", "Independência do Brasil", "Cartografia"];
}

function ChipRow({ items, onPick, label = "Sugestões rápidas" }: { items: string[]; onPick: (t: string) => void; label?: string }) {
  if (!items.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8, padding: "8px 10px", background: "var(--bg)", borderRadius: 8, border: "1px dashed var(--border)" }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
        💡 {label} · clique para inserir
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onPick(t)}
            title={t}
            style={{
              fontSize: 11.5, padding: "5px 10px", borderRadius: 999,
              border: "1px solid #FFD4B8", background: "var(--accent-soft)",
              color: "#B8410E", fontWeight: 600, cursor: "pointer",
              transition: "transform .12s, background .12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#FFE4D2"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--accent-soft)"; }}
          >
            + {t.length > 60 ? t.slice(0, 58) + "…" : t}
          </button>
        ))}
      </div>
    </div>
  );
}

type PlanoCore = Omit<PlanoInclusao, "id" | "data" | "alunoId" | "observacoes" | "avaliacao" | "metodologia" | "disciplina" | "tema" | "duracao" | "tipoAtividade">;

type PlanoItem = {
  disciplina: string;     // disciplina/campo de origem (ou "Interdisciplinar")
  plano: PlanoCore;
  metodologia: string;
  avaliacao: string;
  observacoes: string;
  incluir: boolean;
};

export function PlanoInclusaoModal({ open, onClose, aluno, anamneseResumo, onSaved }: Props) {
  const [disciplinas, setDisciplinas] = useState<string[]>([]);
  const [tema, setTema] = useState("");
  const [duracao, setDuracao] = useState("45 min");
  const [tipoAtividade, setTipoAtividade] = useState(TIPOS[0]);
  const [modoGeracao, setModoGeracao] = useState<"separado" | "integrado">("separado");
  const [loading, setLoading] = useState(false);
  const [planos, setPlanos] = useState<PlanoItem[]>([]);
  const [abaAtiva, setAbaAtiva] = useState(0);

  useEffect(() => {
    if (open) {
      setPlanos([]);
      setAbaAtiva(0);
      setDisciplinas([]);
      setTema("");
      setModoGeracao("separado");
    }
  }, [open, aluno?.id]);

  const condicaoLabel = useMemo(() => {
    if (!aluno) return "";
    const parts = [aluno.diag, aluno.cid].filter(Boolean);
    return parts.join(" · ");
  }, [aluno]);

  const isEI = isEducacaoInfantil(aluno?.anoEscolar);
  const opcoesDisciplinas = isEI ? CAMPOS_EI : DISCIPLINAS_EF;
  const labelDisciplina = isEI ? "Campos de experiência" : "Disciplinas";
  const temaSugestoes = useMemo(
    () => getTemaSugestoes(disciplinas, aluno?.anoEscolar),
    [disciplinas, aluno?.anoEscolar],
  );

  function toggleDisciplina(d: string) {
    setDisciplinas((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  }

  async function gerarUm(disciplina: string, interdisciplinar = false): Promise<PlanoCore | null> {
    if (!aluno) return null;
    const anotacoesCombinadas = [
      condicaoLabel ? `Condição: ${condicaoLabel}` : "",
      anamneseResumo ? `Anamnese (resumo):\n${anamneseResumo}` : "Anamnese ainda não preenchida — gere assim mesmo, considerando práticas inclusivas gerais para a condição informada.",
    ].filter(Boolean).join("\n\n");
    const { data, error } = await supabase.functions.invoke("gerar-atividade", {
      body: {
        modo: "pcd",
        anoEscolar: aluno.anoEscolar || "",
        turma: aluno.turma || "",
        disciplina: interdisciplinar ? "" : disciplina,
        disciplinasInter: interdisciplinar ? disciplinas : [],
        tema,
        duracao,
        tipoAtividade,
        incluirPCD: true,
        alunoFoco: { nome: aluno.name, codigo: condicaoLabel || "PCD", anotacoes: anotacoesCombinadas },
      },
    });
    if (error) throw error;
    return (data as { plano?: PlanoCore })?.plano ?? null;
  }

  async function gerar() {
    if (!aluno || disciplinas.length === 0) {
      toast.error("Selecione ao menos uma disciplina ou campo de experiência.");
      return;
    }
    setLoading(true);
    try {
      if (modoGeracao === "integrado" && disciplinas.length > 1) {
        const p = await gerarUm("", true);
        if (!p) throw new Error("Sofia não conseguiu estruturar o plano.");
        setPlanos([{ disciplina: disciplinas.join(" + "), plano: p, metodologia: "", avaliacao: "", observacoes: "", incluir: true }]);
        setAbaAtiva(0);
        toast.success("Plano interdisciplinar gerado");
      } else {
        const results = await Promise.all(disciplinas.map((d) => gerarUm(d).then((p) => ({ d, p })).catch((e) => ({ d, p: null, e }))));
        const okItens: PlanoItem[] = [];
        let falhou = 0;
        for (const r of results) {
          if (r.p) okItens.push({ disciplina: r.d, plano: r.p, metodologia: "", avaliacao: "", observacoes: "", incluir: true });
          else falhou++;
        }
        if (okItens.length === 0) throw new Error("Nenhum plano foi gerado.");
        setPlanos(okItens);
        setAbaAtiva(0);
        toast.success(`${okItens.length} plano(s) gerado(s)${falhou ? ` · ${falhou} falhou` : ""}`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar plano", { description: e instanceof Error ? e.message : "Tente novamente." });
    } finally {
      setLoading(false);
    }
  }

  function patchAtual(patch: Partial<PlanoItem>) {
    setPlanos((prev) => prev.map((it, i) => i === abaAtiva ? { ...it, ...patch } : it));
  }

  async function regerarAtual() {
    const atual = planos[abaAtiva];
    if (!atual) return;
    setLoading(true);
    try {
      const interd = atual.disciplina.includes(" + ");
      const p = await gerarUm(atual.disciplina, interd);
      if (!p) throw new Error("Falha ao regerar.");
      patchAtual({ plano: p });
      toast.success("Plano regerado");
    } catch (e) {
      toast.error("Erro ao regerar", { description: e instanceof Error ? e.message : "" });
    } finally {
      setLoading(false);
    }
  }

  function salvar() {
    if (!aluno) return;
    const escolhidos = planos.filter((p) => p.incluir);
    if (escolhidos.length === 0) {
      toast.error("Marque ao menos um plano para salvar.");
      return;
    }
    const hoje = new Date().toISOString().slice(0, 10);
    for (const it of escolhidos) {
      const novo: PlanoInclusao = {
        id: crypto.randomUUID(),
        data: hoje,
        alunoId: aluno.id,
        ...it.plano,
        disciplina: it.disciplina,
        tema,
        duracao,
        tipoAtividade,
        observacoes: it.observacoes,
        avaliacao: it.avaliacao,
        metodologia: it.metodologia,
      };
      onSaved(novo);
    }
    toast.success(`${escolhidos.length} plano(s) salvo(s)`);
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
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                  {labelDisciplina} {disciplinas.length > 1 && <span style={{ color: "var(--accent)", marginLeft: 6 }}>· interdisciplinar ({disciplinas.length})</span>}
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {opcoesDisciplinas.map((d) => {
                    const ativo = disciplinas.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDisciplina(d)}
                        style={{
                          fontSize: 12, padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontWeight: 600,
                          border: ativo ? "1px solid var(--accent)" : "1px solid var(--border)",
                          background: ativo ? "var(--accent)" : "#fff",
                          color: ativo ? "#fff" : "var(--text)",
                        }}
                      >
                        {ativo ? "✓ " : ""}{d}
                      </button>
                    );
                  })}
                </div>
                <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
                  Selecione uma para aula simples, ou várias para uma aula <b>interdisciplinar</b>.
                </span>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", maxWidth: 220 }}>
                Duração
                <select value={duracao} onChange={(e) => setDuracao(e.target.value)}
                  style={{ padding: "9px 11px", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, fontWeight: 500, color: "var(--text)", textTransform: "none", letterSpacing: 0, background: "#fff" }}>
                  {["30 min", "45 min", "60 min", "90 min"].map((d) => <option key={d}>{d}</option>)}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                Tema
                <input value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Ex.: Frações"
                  style={{ padding: "9px 11px", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, fontWeight: 500, color: "var(--text)", textTransform: "none", letterSpacing: 0 }} />
                <ChipRow
                  items={temaSugestoes}
                  onPick={(t) => setTema(t)}
                  label={`Sugestões para ${aluno.anoEscolar || "este aluno"}${disciplinas[0] ? ` · ${disciplinas[0]}` : ""}`}
                />
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