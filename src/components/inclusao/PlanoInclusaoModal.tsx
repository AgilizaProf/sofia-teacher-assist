import { useEffect, useMemo, useRef, useState } from "react";
import { X, Sparkles, CheckCircle2, Loader2, Lightbulb, RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buildAnoReferenciaPromptBlock, isAnoReferenciaDivergente } from "@/lib/inclusao/anoReferencia";
import { useKeyboardAwareModal } from "@/hooks/useKeyboardAwareModal";
import { consumirCreditos, descricaoDoc } from "@/lib/creditos/consume";
import { CUSTOS } from "@/lib/creditos/policy";
import { useCreditosGate } from "@/lib/creditos/CreditosGate";

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
  anoReferenciaPedagogico?: string;
  turma?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  aluno: Aluno | null;
  anamneseResumo: string;
  peiResumo?: string;
  onSaved: (plano: PlanoInclusao) => void;
};

const METODOLOGIA_BASE = [
  "Ensino estruturado (TEACCH) com apoio visual passo a passo",
  "Aprendizagem cooperativa em duplas com mediação",
  "Rotina com pictogramas e antecipação das etapas",
  "Pareamento de conteúdo abstrato com material concreto",
  "Jogos pedagógicos com tempo controlado e pausas previstas",
];

const AVALIACAO_BASE = [
  "Observação direta com lista de verificação dos objetivos",
  "Avaliação processual: o aluno explica o que fez, com mediação",
  "Portfólio: anexar produção ao caderno do PEI",
  "Rubrica simplificada (consolidado / em desenvolvimento / não alcançado)",
];

const OBSERVACOES_BASE = [
  "Respondeu bem a estímulos visuais e apoio individual",
  "Apresentou desregulação no início; melhorou após pausa sensorial",
  "Necessitou de mediação constante para iniciar a tarefa",
  "Trabalhou em dupla com sucesso, comunicando a ideia ao colega",
  "Concluiu parcialmente; reforçar na próxima aula",
];

/** Divide "Mat + Port" em disciplinas e devolve a primeira como referência. */
function disciplinaPrimaria(d: string): string {
  return (d || "").split("+")[0].trim();
}

function getMetodologiaSugestoes(disciplina: string, ano?: string): string[] {
  const d = disciplinaPrimaria(disciplina);
  const ei = isEducacaoInfantil(ano);
  const especificas: Record<string, string[]> = {
    "Língua Portuguesa": ["Leitura compartilhada com apoio do alfabeto móvel", "Produção textual coletiva com escriba", "Caça-palavras temático com pistas visuais"],
    "Matemática": ["Material dourado e ábaco para representar quantidades", "Resolução de problemas com desenhos e manipuláveis", "Calculadora como apoio quando o foco é o raciocínio"],
    "Ciências": ["Experimento prático com roteiro ilustrado", "Observação guiada com lupa e registro por desenho", "Vídeo curto + roda de conversa"],
    "História": ["Linha do tempo visual com imagens", "Dramatização de cenas históricas", "Mapa conceitual coletivo"],
    "Geografia": ["Mapas táteis e maquetes", "Saída pedagógica curta pelo entorno da escola", "Análise de imagens com legendas simples"],
    "Arte": ["Releitura com técnica livre", "Produção em estações rotativas", "Música e movimento como suporte"],
    "Educação Física": ["Circuito com estações e pausas previstas", "Jogos cooperativos com regras adaptadas", "Tempo reduzido e função flexível para o aluno"],
    "Inglês": ["Flashcards com imagem + palavra", "TPR (resposta física total) com comandos curtos", "Música com gestos para fixação"],
    "Ensino Religioso": ["Roda de conversa com história ilustrada", "Mural coletivo de valores", "Produção de cartaz em duplas"],
    "O eu, o outro e o nós": ["Roda de conversa com objeto da vez", "Brincadeiras de turnos com mediação", "Mural dos sentimentos"],
    "Corpo, gestos e movimentos": ["Circuito sensório-motor", "Imitação de animais com música", "Massinha e materiais de diferentes texturas"],
    "Traços, sons, cores e formas": ["Pintura livre em diferentes suportes", "Estação de música com instrumentos de sucata", "Carimbos e colagem"],
    "Escuta, fala, pensamento e imaginação": ["Contação com fantoches", "Reconto coletivo com imagens-pista", "Brincadeira de adivinhação"],
    "Espaços, tempos, quantidades, relações e transformações": ["Contagem com objetos do cotidiano", "Calendário ilustrado da rotina", "Misturas e transformações observadas"],
  };
  const extra = especificas[d] || [];
  return [...extra, ...(ei ? METODOLOGIA_BASE.slice(0, 3) : METODOLOGIA_BASE)].slice(0, 7);
}

function getAvaliacaoSugestoes(disciplina: string, ano?: string): string[] {
  const d = disciplinaPrimaria(disciplina);
  const ei = isEducacaoInfantil(ano);
  const especificas: Record<string, string[]> = {
    "Língua Portuguesa": ["Ditado com banco de palavras visível", "Reconto oral da história lida", "Produção textual avaliada por critérios (ideia / coesão / ortografia)"],
    "Matemática": ["Resolução de 3 problemas com manipuláveis disponíveis", "Verificação oral do raciocínio com mediação", "Tarefa adaptada com menor número de itens"],
    "Ciências": ["Registro do experimento por desenho legendado", "Explicação oral do que observou", "Classificação de imagens em categorias"],
    "História": ["Linha do tempo preenchida com figuras", "Roda de conversa: o que aprendi hoje", "Cartaz coletivo avaliado por participação"],
    "Geografia": ["Identificação de elementos no mapa com pistas", "Maquete em dupla avaliada por critérios", "Descrição oral da paisagem"],
    "Arte": ["Avaliação por processo + produto final", "Apresentação da obra com fala curta", "Autoavaliação com carinhas (😀 😐 😟)"],
    "Educação Física": ["Observação da participação e cooperação", "Lista de verificação dos movimentos solicitados", "Registro de evolução em circuito"],
    "Inglês": ["Reconhecimento oral de vocabulário com imagens", "Atividade de ligar palavra-imagem", "Pronúncia de 5 palavras-chave"],
    "Ensino Religioso": ["Participação na roda + cartaz", "Reconto da história com valores destacados", "Autoavaliação guiada"],
  };
  const extra = especificas[d] || [];
  return [...extra, ...(ei ? AVALIACAO_BASE.slice(0, 2) : AVALIACAO_BASE)].slice(0, 7);
}

function getObservacoesSugestoes(disciplina: string, _ano?: string): string[] {
  const d = disciplinaPrimaria(disciplina);
  const especificas: Record<string, string[]> = {
    "Língua Portuguesa": ["Ainda confunde sons semelhantes; reforçar consciência fonológica", "Avançou na leitura de palavras simples"],
    "Matemática": ["Ainda depende do material concreto para somar", "Resolveu com autonomia usando o ábaco"],
    "Ciências": ["Engajou-se no experimento; descreveu com precisão", "Precisou de roteiro visual para acompanhar"],
    "História": ["Relacionou bem o conteúdo à própria família", "Dificuldade com a noção de tempo cronológico"],
    "Geografia": ["Localizou pontos com pista visual", "Confundiu direções; retomar com jogo"],
    "Arte": ["Demonstrou criatividade e autonomia no traço", "Precisou de mediação para iniciar"],
    "Educação Física": ["Cooperou bem no jogo; aceitou as regras adaptadas", "Apresentou cansaço; reduzir o tempo na próxima"],
    "Inglês": ["Fixou o vocabulário com apoio das imagens", "Pronúncia ainda travada; reforçar com música"],
  };
  const extra = especificas[d] || [];
  return [...extra, ...OBSERVACOES_BASE].slice(0, 7);
}

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
  const [open, setOpen] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8, padding: "8px 10px", background: "var(--bg)", borderRadius: 8, border: "1px dashed var(--border)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: 0, padding: 0, cursor: "pointer", fontSize: 10.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: "left" }}
      >
        <Lightbulb size={12} /> {label} {open ? "▾" : "▸"}
      </button>
      {open && (
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
      )}
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

export function PlanoInclusaoModal({ open, onClose, aluno, anamneseResumo, peiResumo, onSaved }: Props) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  useKeyboardAwareModal(modalRef, open);
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const el = modalRef.current?.querySelector<HTMLElement>('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button.inc-btn-ghost, button.btn');
      el?.focus();
    }, 60);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);
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

  // Ano pedagógico efetivo: o ano de referência pedagógico, quando informado,
  // prevalece sobre o ano de matrícula em todas as decisões da Sofia.
  const anoEfetivo = (aluno?.anoReferenciaPedagogico || aluno?.anoEscolar || "").trim();
  const anoRefDivergente = !!aluno?.anoReferenciaPedagogico
    && isAnoReferenciaDivergente(aluno?.anoEscolar, aluno?.anoReferenciaPedagogico);
  const isEI = isEducacaoInfantil(anoEfetivo);
  const opcoesDisciplinas = isEI ? CAMPOS_EI : DISCIPLINAS_EF;
  const labelDisciplina = isEI ? "Campos de experiência" : "Disciplinas";
  const temaSugestoes = useMemo(
    () => getTemaSugestoes(disciplinas, anoEfetivo),
    [disciplinas, anoEfetivo],
  );

  function toggleDisciplina(d: string) {
    setDisciplinas((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  }

  async function gerarUm(disciplina: string, interdisciplinar = false): Promise<PlanoCore | null> {
    if (!aluno) return null;
    const anotacoesCombinadas = [
      condicaoLabel ? `Condição: ${condicaoLabel}` : "",
      anamneseResumo ? `Anamnese (resumo):\n${anamneseResumo}` : "Anamnese ainda não preenchida — gere assim mesmo, considerando práticas inclusivas gerais para a condição informada.",
      peiResumo ? `\nPEI vigente (objetivos e metas — a atividade DEVE ser progressiva em relação a eles):\n${peiResumo}` : "\n(Sem PEI cadastrado — use boas práticas inclusivas para a condição informada.)",
    ].filter(Boolean).join("\n\n");
    const anoReferenciaInstrucao = buildAnoReferenciaPromptBlock(
      aluno.anoEscolar,
      aluno.anoReferenciaPedagogico,
    );
    const { data, error } = await supabase.functions.invoke("gerar-atividade", {
      body: {
        modo: "pcd",
        anoEscolar: aluno.anoEscolar || "",
        anoReferenciaPedagogico: aluno.anoReferenciaPedagogico || "",
        anoReferenciaInstrucao,
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
    const plano = (data as { plano?: PlanoCore })?.plano ?? null;
    if (plano) {
      void consumirCreditos(CUSTOS.adaptacao_pcd, descricaoDoc("Adaptação inclusiva (PCD)", aluno?.name));
    }
    return plano;
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
      <div className="inc-modal" ref={modalRef} style={{ maxWidth: 880 }}>
        <div className="inc-modal-bar" />
        <div className="inc-modal-head">
          <h2>Gerar plano adaptado · {aluno.name.split(" ")[0]}</h2>
          <span className="meta">
            {aluno.anoEscolar || "Ano não informado"}
            {anoRefDivergente && aluno.anoReferenciaPedagogico
              ? ` · 📚 Referência: ${aluno.anoReferenciaPedagogico}`
              : ""}
            <br />
            {condicaoLabel || "Condição não informada"}
          </span>
          <button className="inc-modal-close" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </div>

        <div className="inc-modal-body plain" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {planos.length === 0 && (
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
                  Selecione uma ou mais. A Sofia gera <b>um plano por disciplina</b> e você escolhe quais salvar.
                </span>
              </div>
              {disciplinas.length > 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>Modo de geração</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {([
                      { v: "separado", l: `Um plano por disciplina (${disciplinas.length})`, d: "Cada disciplina/campo gera um plano independente." },
                      { v: "integrado", l: "Um plano interdisciplinar único", d: "A Sofia combina todas em uma única aula coesa." },
                    ] as const).map((opt) => {
                      const ativo = modoGeracao === opt.v;
                      return (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => setModoGeracao(opt.v)}
                          title={opt.d}
                          style={{
                            flex: 1, padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, textAlign: "left",
                            border: ativo ? "1px solid var(--accent)" : "1px solid var(--border)",
                            background: ativo ? "var(--accent-soft)" : "#fff",
                            color: ativo ? "#B8410E" : "var(--text)",
                          }}
                        >
                          {ativo ? "● " : "○ "}{opt.l}
                          <div style={{ fontWeight: 400, fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{opt.d}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
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
                  label={`Sugestões para ${anoEfetivo || "este aluno"}${anoRefDivergente ? " (referência)" : ""}${disciplinas[0] ? ` · ${disciplinas[0]}` : ""}`}
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
                  A Sofia vai considerar{" "}
                  <b>
                    {anoRefDivergente && aluno.anoReferenciaPedagogico
                      ? `${aluno.anoReferenciaPedagogico} (referência pedagógica · matrícula ${aluno.anoEscolar || "—"})`
                      : (anoEfetivo || "ano não informado")}
                  </b>, <b>{condicaoLabel || "perfil singular"}</b> e a anamnese ({anamneseResumo ? "preenchida" : "ainda em branco"}).
                  Campos faltantes não impedem a geração.
                </span>
              </div>
            </>
          )}

          {planos.length > 0 && (() => {
            const atual = planos[abaAtiva];
            if (!atual) return null;
            const plano = atual.plano;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {planos.length > 1 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
                    {planos.map((it, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setAbaAtiva(i)}
                        style={{
                          padding: "6px 10px", borderRadius: "8px 8px 0 0", cursor: "pointer", fontSize: 12, fontWeight: 600,
                          border: "1px solid var(--border)", borderBottom: i === abaAtiva ? "1px solid #fff" : "1px solid var(--border)",
                          marginBottom: -7,
                          background: i === abaAtiva ? "#fff" : "var(--bg)",
                          color: it.incluir ? "var(--text)" : "var(--muted)",
                          opacity: it.incluir ? 1 : 0.6,
                          display: "flex", alignItems: "center", gap: 6,
                        }}
                      >
                        {it.incluir && <Check size={12} color="var(--success)" />}
                        {it.disciplina}
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={atual.incluir}
                      onChange={(e) => patchAtual({ incluir: e.target.checked })}
                      style={{ width: 16, height: 16, accentColor: "var(--accent)" }}
                    />
                    Incluir <b>{atual.disciplina}</b> ao salvar
                  </label>
                  <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
                    {planos.filter(p => p.incluir).length} de {planos.length} marcado(s)
                  </span>
                </div>

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
                  <textarea value={atual.metodologia} onChange={(e) => patchAtual({ metodologia: e.target.value })} rows={3} placeholder="Como você vai conduzir a aula com este aluno"
                    style={{ padding: "9px 11px", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, color: "var(--text)", textTransform: "none", letterSpacing: 0, resize: "vertical" }} />
                  <ChipRow
                    items={getMetodologiaSugestoes(atual.disciplina, anoEfetivo)}
                    onPick={(t) => patchAtual({ metodologia: atual.metodologia ? atual.metodologia + " " + t : t })}
                    label={`Metodologia · ${disciplinaPrimaria(atual.disciplina) || "geral"}`}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                  Avaliação
                  <textarea value={atual.avaliacao} onChange={(e) => patchAtual({ avaliacao: e.target.value })} rows={3} placeholder="Como você vai avaliar este aluno"
                    style={{ padding: "9px 11px", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, color: "var(--text)", textTransform: "none", letterSpacing: 0, resize: "vertical" }} />
                  <ChipRow
                    items={getAvaliacaoSugestoes(atual.disciplina, anoEfetivo)}
                    onPick={(t) => patchAtual({ avaliacao: atual.avaliacao ? atual.avaliacao + " " + t : t })}
                    label={`Avaliação · ${disciplinaPrimaria(atual.disciplina) || "geral"}`}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                  Observações
                  <textarea value={atual.observacoes} onChange={(e) => patchAtual({ observacoes: e.target.value })} rows={3} placeholder="Anote o que aconteceu, ajustes, próximos passos"
                    style={{ padding: "9px 11px", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, color: "var(--text)", textTransform: "none", letterSpacing: 0, resize: "vertical" }} />
                  <ChipRow
                    items={getObservacoesSugestoes(atual.disciplina, anoEfetivo)}
                    onPick={(t) => patchAtual({ observacoes: atual.observacoes ? atual.observacoes + " " + t : t })}
                    label={`Observações · ${disciplinaPrimaria(atual.disciplina) || "geral"}`}
                  />
                </label>
              </div>
            );
          })()}
        </div>

        <div className="inc-modal-foot">
          <span className="legal">O plano será salvo no histórico de {aluno.name.split(" ")[0]}.</span>
          <button className="inc-btn-ghost" onClick={onClose}>Cancelar</button>
          {planos.length === 0 ? (
            <button className="btn btn-primary bg-orange-400 text-orange-400" onClick={gerar} disabled={loading}>
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> Gerando {disciplinas.length > 1 && modoGeracao === "separado" ? `${disciplinas.length} planos` : "plano"}…</>
                : <><Sparkles size={14} /> Gerar {disciplinas.length > 1 && modoGeracao === "separado" ? `${disciplinas.length} planos` : "plano"} com a Sofia</>}
            </button>
          ) : (
            <>
              <button className="inc-btn-ghost" onClick={regerarAtual} disabled={loading} title="Regerar apenas a aba atual">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Regerar este
              </button>
              <button className="btn btn-primary bg-orange-400 text-orange-400" onClick={salvar}>
                <CheckCircle2 size={14} /> Salvar selecionados ({planos.filter(p => p.incluir).length})
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
