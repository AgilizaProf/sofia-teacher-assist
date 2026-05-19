import { useEffect, useMemo, useState } from "react";
import {
  Sparkles, RefreshCw, Plus, Copy, ChevronDown, ChevronUp, X,
  Check, Pencil, Lightbulb, AlertTriangle, Save, FileDown, CalendarPlus,
  Search, Trash2, FileText, Star, Printer, Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePersistentState } from "@/lib/persist/usePersistentState";
import { useSofiaUserData } from "@/lib/sofia/SofiaUserContext";
import { logActivity } from "@/lib/activity/activityLog";
import { consumirCreditos, descricaoDoc } from "@/lib/creditos/consume";
import { CUSTOS } from "@/lib/creditos/policy";
import { formatTurmaGrade } from "@/lib/turmaGrade";
import {
  printEditorial,
  editorialCover,
  editorialSection,
  editorialFieldsGrid,
  editorialLongField,
} from "@/lib/print/editorialPrint";
import { imprimirPlanejamentoDireto, salvarPlanejamentoDocx, type SecaoImpressao } from "@/lib/print/planejamentoDireto";
import { PrintInfoModal, type PrintInfo } from "@/components/print/PrintInfoModal";

/* ─────────────────────────── Types ─────────────────────────── */

export type Habilidade = { codigo: string; descricao: string };
export type Adaptacao = {
  categoria: "TEA" | "TDAH" | "DI" | "Deficiência física" | "Outra";
  texto: string;
  /**
   * Quando false, a adaptação NÃO entra no documento impresso/exportado
   * nem na versão salva enviada para outras telas. Default: true.
   */
  incluido?: boolean;
};
export type Sugestao = {
  titulo: string;
  descricao: string;
  /**
   * Quando true, a sugestão é considerada "utilizada" pelo professor e
   * entra no documento impresso/exportado. Default: false.
   */
  utilizado?: boolean;
};
export type OpcaoAula = { titulo: string; resumo: string; abordagem: string };
export type ContribuicaoInter = { disciplina: string; contribuicao: string };

export type PlanoAtividade = {
  titulo: string;
  objetivo: string;
  abertura: string;
  desenvolvimento: string;
  fechamento: string;
  habilidades: Habilidade[];
  adaptacoes: Adaptacao[];
  sugestoes: Sugestao[];
  materiais: string[];
  materiaisCheck?: Record<number, boolean>;
  contribuicoesInter?: ContribuicaoInter[];
  meta?: {
    ano: string; turma: string; disciplina: string; tema: string;
    duracao: string; tipo: string; incluirPCD: boolean;
    modo: "regular" | "pcd"; geradoEm: string;
  };
};

type PlanoSalvo = {
  id: string;
  remoteId?: string;
  titulo: string;
  turma: string;
  disciplina: string;
  ano: string;
  modo: "regular" | "pcd";
  salvoEm: string;
  plano: PlanoAtividade;
};

const EMPTY: PlanoAtividade = {
  titulo: "", objetivo: "", abertura: "", desenvolvimento: "", fechamento: "",
  habilidades: [], adaptacoes: [], sugestoes: [], materiais: [], materiaisCheck: {},
  contribuicoesInter: [],
};

const ANOS_FALLBACK = [
  "Educação Infantil",
  "1º ano EF", "2º ano EF", "3º ano EF", "4º ano EF", "5º ano EF",
  "6º ano EF", "7º ano EF", "8º ano EF", "9º ano EF",
  "1º ano EM", "2º ano EM", "3º ano EM",
];

const DISCIPLINAS = [
  "Língua Portuguesa", "Matemática", "Ciências", "História", "Geografia",
  "Arte", "Educação Física", "Inglês", "Ensino Religioso", "Interdisciplinar",
];

// Campos de Experiência da BNCC (Educação Infantil). Substituem as
// disciplinas tradicionais quando a turma/ano é de Ed. Infantil.
const DISCIPLINAS_EI = [
  "O eu, o outro e o nós",
  "Corpo, gestos e movimentos",
  "Traços, sons, cores e formas",
  "Escuta, fala, pensamento e imaginação",
  "Espaços, tempos, quantidades, relações e transformações",
  "Interdisciplinar",
];

const DURACOES = ["30 min", "45 min", "1h", "1h30"];
const TIPOS = ["Individual", "Em dupla", "Em grupo", "Livre"];

/* M1 card type — kept compatible with src/pages/Planejamento.tsx */
type DayKey = "seg" | "ter" | "qua" | "qui" | "sex";
type Variant = "port" | "mat" | "aval" | "esc" | "ci";
type M1Card = {
  id: string; v: Variant; tag: string; title: string;
  bncc: string; minutos: number; foco: string; motivo?: string;
};
type M1Plan = Record<DayKey, M1Card[]>;
const EMPTY_M1: M1Plan = { seg: [], ter: [], qua: [], qui: [], sex: [] };

const VARIANT_BY_DISC: Record<string, Variant> = {
  "Língua Portuguesa": "port",
  "Matemática": "mat",
  "Ciências": "ci",
  "História": "esc",
  "Geografia": "esc",
  "Arte": "esc",
  "Educação Física": "esc",
  "Inglês": "port",
};
const TAG_BY_DISC: Record<string, string> = {
  "Língua Portuguesa": "PORT",
  "Matemática": "MAT",
  "Ciências": "CIÊ",
  "História": "HIST",
  "Geografia": "GEO",
  "Arte": "ART",
  "Educação Física": "EDF",
  "Inglês": "ING",
};
const DUR_TO_MIN: Record<string, number> = {
  "30 min": 30, "45 min": 45, "1h": 60, "1h30": 90,
};

/* ───────────── Diário de bordo (M6) ─────────────
 * Lê os registros do diário em localStorage e devolve um resumo recente
 * para que a Sofia considere humores, observações e tags ao gerar
 * atividades. Filtra pela turma quando informada.
 */
type DiarioBordoItem = { emoji: string; titulo: string; texto: string; tags: string[]; data: string; turma?: string; atividadeTitulo?: string };
function lerDiarioBordo(turma: string): DiarioBordoItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("aprof:plan_m6_entries");
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const tnorm = (turma || "").toLowerCase().trim();
    const filtered = tnorm
      ? arr.filter((e: { turma?: string }) => !e.turma || e.turma.toLowerCase() === tnorm)
      : arr;
    return filtered.slice(0, 8).map((e: { emoji?: string; title?: string; text?: string; tags?: string[]; date?: string; turma?: string; atividadeTitulo?: string }) => ({
      emoji: e.emoji || "",
      titulo: e.title || "",
      texto: e.text || "",
      tags: Array.isArray(e.tags) ? e.tags : [],
      data: e.date || "",
      turma: e.turma,
      atividadeTitulo: e.atividadeTitulo,
    }));
  } catch {
    return [];
  }
}

/* ─────────────────────────── Component ─────────────────────────── */

export function PlanoAtividadeEditor({ modo }: { modo: "regular" | "pcd" }) {
  const sofia = useSofiaUserData();

  const [plano, setPlano] = usePersistentState<PlanoAtividade>(
    `plan_atividade_${modo}_v1`, EMPTY,
  );
  const [historico, setHistorico] = usePersistentState<PlanoSalvo[]>(
    `plan_atividade_${modo}_hist_v1`, [],
  );
  // IDs dos planos selecionados no histórico para impressão em lote.
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const toggleSelecionado = (id: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Sugestões favoritas, agrupadas por tema (chave normalizada).
  const [favoritas, setFavoritas] = usePersistentState<Record<string, Sugestao[]>>(
    `plan_atividade_${modo}_favoritas_v1`, {},
  );

  // M1 plan (mesma chave usada em Planejamento.tsx)
  const [m1Plan, setM1Plan] = usePersistentState<M1Plan>("plan_m1_plan", EMPTY_M1);

  // Eventos do usuário no calendário M4 (camadas). Mesma chave lida em
  // src/pages/Planejamento.tsx no módulo M4 para integrar visualmente as
  // atividades agendadas pela professora.
  type M4UserEvt = {
    id: string;
    cat: "aulas" | "aval";
    title: string;
    meta?: string;
    source: "atv" | "pcd";
    turma?: string;
    disciplina?: string;
    minutos?: number;
  };
  type M4UserStore = Record<string, M4UserEvt[]>;
  const [m4UserEvents, setM4UserEvents] = usePersistentState<M4UserStore>(
    "plan_m4_user_events", {},
  );

  const turmasPerfil = sofia.turmas;
  const [turma, setTurma] = useState<string>(turmasPerfil[0]?.nome ?? "");
  const [disciplina, setDisciplina] = useState<string>(DISCIPLINAS[0]);
  // Disciplinas integradas quando o usuário escolhe "Interdisciplinar".
  const [disciplinasInter, setDisciplinasInter] = useState<string[]>([]);
  const [tema, setTema] = useState<string>("");
  const [duracao, setDuracao] = useState<string>("45 min");
  const [tipo, setTipo] = useState<string>("Livre");
  const [generating, setGenerating] = useState(false);
  const [regenField, setRegenField] = useState<string>(""); // só visual
  const [erro, setErro] = useState<string>("");
  const [missing, setMissing] = useState<string[]>([]);
  const [salvo, setSalvo] = useState(false);
  const [toast, setToast] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [confirmDel, setConfirmDel] = useState<string>("");

  // Opções de aula (etapa antes de gerar o plano completo)
  const [opcoes, setOpcoes] = useState<OpcaoAula[]>([]);
  const [opcoesSel, setOpcoesSel] = useState<number[]>([]);
  const [loadingOpcoes, setLoadingOpcoes] = useState(false);

  // Quando a professora seleciona MAIS DE UMA opção e clica em "Gerar plano",
  // a Sofia gera um plano completo para CADA opção. Cada plano fica
  // disponível em uma aba editável separada — `plano` é sempre o ativo.
  const [planosMulti, setPlanosMulti] = useState<PlanoAtividade[]>([]);
  const [planoIdx, setPlanoIdx] = useState(0);
  const [progresso, setProgresso] = useState<{ feitos: number; total: number }>({ feitos: 0, total: 0 });

  // Chave de tema normalizada para indexar favoritas.
  const temaKey = useMemo(
    () => `${disciplina} · ${tema.trim().toLowerCase()}`,
    [disciplina, tema],
  );
  const favoritasTema = favoritas[temaKey] ?? [];

  const isFavorita = (s: Sugestao) =>
    favoritasTema.some((f) => f.titulo === s.titulo);

  const toggleFavorita = (s: Sugestao) => {
    const atuais = favoritas[temaKey] ?? [];
    const existe = atuais.some((f) => f.titulo === s.titulo);
    const next = existe
      ? atuais.filter((f) => f.titulo !== s.titulo)
      : [...atuais, s].slice(0, 12);
    setFavoritas({ ...favoritas, [temaKey]: next });
    showToast(existe ? "Removida das favoritas" : "⭐ Salva nas favoritas");
  };

  const removerFavorita = (titulo: string) => {
    const atuais = favoritas[temaKey] ?? [];
    setFavoritas({
      ...favoritas,
      [temaKey]: atuais.filter((f) => f.titulo !== titulo),
    });
  };

  // Ano escolar derivado da turma (badge não-editável quando há turma)
  const turmaInfo = useMemo(
    () => turmasPerfil.find((t) => t.nome === turma),
    [turmasPerfil, turma],
  );
  const [anoFallback, setAnoFallback] = useState<string>(ANOS_FALLBACK[3]);
  const anoTurma = formatTurmaGrade(turmaInfo?.ano || "");
  const anoEscolar = anoTurma || anoFallback;

  // Detecta Educação Infantil pelo ano (vindo da turma ou do fallback) e
  // troca a lista de "Disciplinas" pelos Campos de Experiência da BNCC.
  const isEI = useMemo(
    () => /\(EI\)/.test(anoEscolar) || /educa[cç][aã]o\s+infantil/i.test(anoEscolar),
    [anoEscolar],
  );
  const disciplinasOpts = isEI ? DISCIPLINAS_EI : DISCIPLINAS;
  const disciplinaLabel = isEI ? "Campo de Experiência" : "Disciplina";
  const interLabel = isEI ? "Campos a integrar" : "Disciplinas a integrar";

  // Quando alterna entre EI ↔ EF/EM, garante que a disciplina selecionada
  // pertença à lista atual; senão, recai para a primeira opção válida.
  useEffect(() => {
    if (!disciplinasOpts.includes(disciplina)) {
      setDisciplina(disciplinasOpts[0]);
    }
    // Também limpa seleções interdisciplinares incompatíveis.
    setDisciplinasInter((cur) => cur.filter((d) => disciplinasOpts.includes(d)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEI]);

  // Quando a turma muda, sincroniza o fallback com o ano da turma —
  // assim, ao desmarcar a turma, o ano permanece coerente.
  useEffect(() => {
    if (anoTurma) setAnoFallback(anoTurma);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anoTurma]);

  const alunosPCDDaTurma = useMemo(() => {
    if (!turma) return sofia.alunosPCD;
    return sofia.alunosPCDPorTurma[turma] ?? [];
  }, [sofia, turma]);

  // Toggle PCD: ligado por padrão se a turma tiver PCD
  const [incluirPCD, setIncluirPCD] = useState<boolean>(true);
  useEffect(() => {
    setIncluirPCD(alunosPCDDaTurma.length > 0);
  }, [turma, alunosPCDDaTurma.length]);

  // Em modo PCD, a professora foca a atividade em UM aluno PCD por vez,
  // para que Sofia respeite as especificidades dele(a). Quando a turma muda,
  // voltamos para o primeiro aluno disponível.
  const [alunoFocoIdx, setAlunoFocoIdx] = useState<number>(0);
  useEffect(() => {
    setAlunoFocoIdx(0);
    setOpcoes([]);
    setOpcoesSel([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turma, alunosPCDDaTurma.length]);
  const alunoFoco =
    modo === "pcd" ? alunosPCDDaTurma[alunoFocoIdx] ?? null : null;

  // Geração em lote: uma atividade PCD por aluno da turma.
  type LoteItem = {
    aluno: string;
    codigo?: string;
    plano?: PlanoAtividade;
    erro?: string;
  };
  const [gerandoLote, setGerandoLote] = useState(false);
  const [loteProg, setLoteProg] = useState<{ atual: number; total: number; nome: string }>({
    atual: 0, total: 0, nome: "",
  });
  const [lote, setLote] = useState<LoteItem[]>([]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2200);
  };

  // Mantém o array de planos múltiplos sincronizado com a edição atual.
  // Sempre que `plano` mudar (edição inline, regenerar campo, materiais…)
  // espelhamos no índice ativo de `planosMulti`.
  useEffect(() => {
    if (planosMulti.length <= 1) return;
    setPlanosMulti((prev) => {
      if (planoIdx >= prev.length) return prev;
      if (prev[planoIdx] === plano) return prev;
      const next = prev.slice();
      next[planoIdx] = plano;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plano]);

  /* ─────────── Geração (full ou por campo) ─────────── */

  const callSofia = async (
    field?: string,
    overrideOpcoes?: OpcaoAula[],
  ): Promise<PlanoAtividade | null> => {
    setErro("");
    const diarioBordo = lerDiarioBordo(turma);
    const payload = {
      modo, anoEscolar, disciplina, turma,
      tema: tema.trim(),
      duracao, tipoAtividade: tipo,
      incluirPCD: modo === "pcd" ? true : incluirPCD,
      regenField: field ?? "",
      planoAtual: field ? plano : null,
      disciplinasInter: disciplina === "Interdisciplinar" ? disciplinasInter : [],
      opcoesSelecionadas: !field
        ? (overrideOpcoes ?? opcoesSel.map((i) => opcoes[i]).filter(Boolean))
        : [],
      alunosPCD: alunosPCDDaTurma.map((a) => ({
        nome: a.primeiro_nome,
        tipo: a.pcd_codigo || "PCD",
        codigo: a.pcd_codigo || undefined,
        anotacoes: a.pcd_anotacoes || undefined,
      })),
      alunoFoco: alunoFoco
        ? {
            nome: alunoFoco.primeiro_nome,
            codigo: alunoFoco.pcd_codigo || undefined,
            anotacoes: alunoFoco.pcd_anotacoes || undefined,
          }
        : null,
      diarioBordo,
    };
    const { data, error } = await supabase.functions.invoke("gerar-atividade", {
      body: payload,
    });
    if (error) {
      const msg = (error as { context?: { error?: string } })?.context?.error
        || (error as Error)?.message || "Falha ao gerar.";
      setErro(msg);
      return null;
    }
    const novo = data?.plano as PlanoAtividade | undefined;
    if (!novo) { setErro("Sofia não retornou um plano válido."); return null; }
    void consumirCreditos(CUSTOS.plano_aula, "Plano de aula BNCC");
    return novo;
  };

  const sugerirOpcoes = async () => {
    setErro("");
    setLoadingOpcoes(true);
    const diarioBordo = lerDiarioBordo(turma);
    const payload = {
      modo, anoEscolar, disciplina, turma,
      tema: tema.trim(),
      duracao, tipoAtividade: tipo,
      incluirPCD: modo === "pcd" ? true : incluirPCD,
      etapa: "opcoes",
      disciplinasInter: disciplina === "Interdisciplinar" ? disciplinasInter : [],
      alunosPCD: alunosPCDDaTurma.map((a) => ({
        nome: a.primeiro_nome,
        tipo: a.pcd_codigo || "PCD",
      })),
      alunoFoco: alunoFoco
        ? {
            nome: alunoFoco.primeiro_nome,
            codigo: alunoFoco.pcd_codigo || undefined,
            anotacoes: alunoFoco.pcd_anotacoes || undefined,
          }
        : null,
      diarioBordo,
    };
    const { data, error } = await supabase.functions.invoke("gerar-atividade", {
      body: payload,
    });
    setLoadingOpcoes(false);
    if (error) {
      const msg = (error as { context?: { error?: string } })?.context?.error
        || (error as Error)?.message || "Falha ao sugerir opções.";
      setErro(msg);
      return;
    }
    const lista = (data?.opcoes as OpcaoAula[] | undefined) ?? [];
    if (lista.length === 0) {
      setErro("Sofia não retornou opções. Tente reformular o tema.");
      return;
    }
    setOpcoes(lista);
    setOpcoesSel([]);
    setPlano(EMPTY);
  };

  const toggleOpcao = (i: number) =>
    setOpcoesSel((sel) =>
      sel.includes(i) ? sel.filter((x) => x !== i) : [...sel, i],
    );

  const gerar = async () => {
    setGenerating(true);
    // Quando há mais de uma opção selecionada → gera UM plano por opção,
    // mantendo cada um editável em sua própria aba.
    if (opcoesSel.length > 1) {
      const selecionadas = opcoesSel.map((i) => opcoes[i]).filter(Boolean) as OpcaoAula[];
      setProgresso({ feitos: 0, total: selecionadas.length });
      const enrichedAll: PlanoAtividade[] = [];
      for (const opt of selecionadas) {
        const novo = await callSofia(undefined, [opt]);
        if (novo) {
          enrichedAll.push({
            ...EMPTY, ...novo, materiaisCheck: {},
            meta: {
              ano: anoEscolar, turma, disciplina, tema,
              duracao, tipo, incluirPCD: modo === "pcd" ? true : incluirPCD,
              modo, geradoEm: new Date().toISOString(),
            },
          });
        }
        setProgresso((p) => ({ ...p, feitos: p.feitos + 1 }));
      }
      setGenerating(false);
      setProgresso({ feitos: 0, total: 0 });
      if (enrichedAll.length === 0) return;
      setPlanosMulti(enrichedAll);
      setPlanoIdx(0);
      setPlano(enrichedAll[0]);
      setMissing([]);
      setOpcoes([]);
      setOpcoesSel([]);
      logActivity({
        type: "planejamento",
        description: `${enrichedAll.length} atividades geradas em paralelo`,
        detail: `${anoEscolar} · ${disciplina} · ${tema}`,
      });
      showToast(`${enrichedAll.length} planos prontos. Use as abas para revisar cada um.`);
      return;
    }
    const novo = await callSofia();
    setGenerating(false);
    if (!novo) return;
    const enriched: PlanoAtividade = {
      ...EMPTY, ...novo, materiaisCheck: {},
      meta: {
        ano: anoEscolar, turma, disciplina, tema,
        duracao, tipo, incluirPCD: modo === "pcd" ? true : incluirPCD,
        modo, geradoEm: new Date().toISOString(),
      },
    };
    setPlano(enriched);
    setPlanosMulti([]);
    setPlanoIdx(0);
    setMissing([]);
    setOpcoes([]);
    setOpcoesSel([]);
    logActivity({
      type: "planejamento",
      description: modo === "pcd"
        ? `Atividade PCD gerada: ${enriched.titulo}`
        : `Atividade gerada: ${enriched.titulo}`,
      detail: `${anoEscolar} · ${disciplina}`,
    });
  };

  const regenerarCampo = async (field: keyof PlanoAtividade) => {
    setRegenField(field as string);
    const novo = await callSofia(field as string);
    setRegenField("");
    if (!novo) return;
    setPlano({ ...plano, [field]: novo[field] as PlanoAtividade[typeof field] });
    showToast(`Sofia regenerou: ${field}`);
  };

  /* ─────────── Geração em lote (1 atividade por aluno PCD) ─────────── */

  const gerarParaTodos = async () => {
    if (modo !== "pcd" || alunosPCDDaTurma.length === 0 || gerandoLote) return;
    setErro("");
    setGerandoLote(true);
    setLote([]);
    const total = alunosPCDDaTurma.length;
    setLoteProg({ atual: 0, total, nome: "" });

    const resultados: LoteItem[] = [];
    for (let i = 0; i < alunosPCDDaTurma.length; i++) {
      const a = alunosPCDDaTurma[i];
      setLoteProg({ atual: i + 1, total, nome: a.primeiro_nome });

      const payload = {
        modo, anoEscolar, disciplina, turma,
        tema: tema.trim(),
        duracao, tipoAtividade: tipo,
        incluirPCD: true,
        disciplinasInter: disciplina === "Interdisciplinar" ? disciplinasInter : [],
        opcoesSelecionadas: [],
        alunosPCD: alunosPCDDaTurma.map((x) => ({
          nome: x.primeiro_nome,
          tipo: x.pcd_codigo || "PCD",
          codigo: x.pcd_codigo || undefined,
          anotacoes: x.pcd_anotacoes || undefined,
        })),
        alunoFoco: {
          nome: a.primeiro_nome,
          codigo: a.pcd_codigo || undefined,
          anotacoes: a.pcd_anotacoes || undefined,
        },
      };

      try {
        const { data, error } = await supabase.functions.invoke("gerar-atividade", {
          body: payload,
        });
        if (error) {
          const msg = (error as { context?: { error?: string } })?.context?.error
            || (error as Error)?.message || "Falha ao gerar.";
          resultados.push({ aluno: a.primeiro_nome, codigo: a.pcd_codigo || undefined, erro: msg });
        } else {
          const novo = data?.plano as PlanoAtividade | undefined;
          if (!novo) {
            resultados.push({ aluno: a.primeiro_nome, codigo: a.pcd_codigo || undefined, erro: "Plano vazio" });
          } else {
            const enriched: PlanoAtividade = {
              ...EMPTY, ...novo, materiaisCheck: {},
              meta: {
                ano: anoEscolar, turma, disciplina, tema,
                duracao, tipo, incluirPCD: true,
                modo, geradoEm: new Date().toISOString(),
              },
            };
            resultados.push({
              aluno: a.primeiro_nome,
              codigo: a.pcd_codigo || undefined,
              plano: enriched,
            });

            // Salva automaticamente no histórico, com o nome do aluno no título.
            const id = `p_${Date.now()}_${i}`;
            const tituloComAluno = `[${a.primeiro_nome}] ${enriched.titulo}`;
            const registro: PlanoSalvo = {
              id,
              titulo: tituloComAluno,
              turma, disciplina, ano: anoEscolar, modo,
              salvoEm: new Date().toISOString(),
              plano: { ...enriched, titulo: tituloComAluno },
            };
            setHistorico((h) => [registro, ...h].slice(0, 100));

            // Best-effort remoto.
            try {
              const { data: auth } = await supabase.auth.getUser();
              const uid = auth.user?.id;
              if (uid) {
                await supabase.from("planos_aula").insert({
                  user_id: uid,
                  client_id: id,
                  titulo: tituloComAluno,
                  data: { ...registro, plano: registro.plano },
                });
                void import("@/lib/admin/track").then(({ trackEvent }) => trackEvent("atividade_pcd_gerada", { aluno: a.primeiro_nome, ano: anoEscolar, disciplina, titulo: enriched.titulo }));
              }
            } catch { /* offline ok */ }

            logActivity({
              type: "planejamento",
              description: `Atividade PCD gerada para ${a.primeiro_nome}: ${enriched.titulo}`,
              detail: `${anoEscolar} · ${disciplina}`,
            });
            void consumirCreditos(CUSTOS.adaptacao_pcd, descricaoDoc("Adaptação inclusiva (PCD)", a.primeiro_nome));
          }
        }
      } catch (e) {
        resultados.push({
          aluno: a.primeiro_nome,
          codigo: a.pcd_codigo || undefined,
          erro: e instanceof Error ? e.message : "Falha",
        });
      }

      // Atualiza progressivamente para o usuário ver chegando.
      setLote([...resultados]);
    }

    setGerandoLote(false);
    const ok = resultados.filter((r) => r.plano).length;
    showToast(`${ok}/${total} atividades geradas e salvas no histórico`);
  };

  const carregarDoLote = (item: LoteItem) => {
    if (!item.plano) return;
    setPlano(item.plano);
    setPlanosMulti([]); setPlanoIdx(0);
    setOpcoes([]); setOpcoesSel([]); setMissing([]);
    showToast(`Plano de ${item.aluno} carregado`);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const limpar = () => {
    setPlano(EMPTY);
    setPlanosMulti([]); setPlanoIdx(0);
    setMissing([]); setErro(""); setSalvo(false);
    setOpcoes([]); setOpcoesSel([]);
  };

  const setField = <K extends keyof PlanoAtividade>(k: K, v: PlanoAtividade[K]) =>
    setPlano({ ...plano, [k]: v });

  const toggleMat = (i: number) =>
    setPlano({
      ...plano,
      materiaisCheck: { ...(plano.materiaisCheck ?? {}), [i]: !(plano.materiaisCheck ?? {})[i] },
    });

  const addMat = (s: string) => {
    const v = s.trim(); if (!v) return;
    setPlano({ ...plano, materiais: [...plano.materiais, v] });
  };
  const removeMat = (i: number) =>
    setPlano({ ...plano, materiais: plano.materiais.filter((_, j) => j !== i) });
  const removeHab = (i: number) =>
    setPlano({ ...plano, habilidades: plano.habilidades.filter((_, j) => j !== i) });
  const addHab = (codigo: string, descricao: string) => {
    if (!codigo.trim() || !descricao.trim()) return;
    setPlano({
      ...plano,
      habilidades: [...plano.habilidades, { codigo: codigo.trim(), descricao: descricao.trim() }],
    });
  };

  const usarSugestao = (s: Sugestao) => {
    setPlano({
      ...plano,
      titulo: s.titulo,
      desenvolvimento: s.descricao,
      sugestoes: plano.sugestoes.map((x) =>
        x.titulo === s.titulo && x.descricao === s.descricao ? { ...x, utilizado: true } : x,
      ),
    });
    logActivity({ type: "planejamento", description: `Variação aplicada: ${s.titulo}` });
    showToast("Variação aplicada");
  };

  const copiarMateriais = async () => {
    try { await navigator.clipboard.writeText(plano.materiais.map((m) => `• ${m}`).join("\n")); } catch { /* noop */ }
  };

  const temPlano = !!plano.titulo;

  /* ─────────── Validação ─────────── */

  const validar = (): string[] => {
    const f: string[] = [];
    if (!plano.titulo.trim()) f.push("titulo");
    if (!plano.objetivo.trim()) f.push("objetivo");
    if (!plano.abertura.trim() && !plano.desenvolvimento.trim() && !plano.fechamento.trim()) f.push("descricao");
    // Habilidades: tolerante — basta uma habilidade com código OU descrição.
    // Bloqueia apenas se todas estiverem completamente vazias.
    const habsValidas = plano.habilidades.filter(
      (h) => h.codigo.trim() !== "" || h.descricao.trim() !== "",
    );
    if (habsValidas.length === 0) f.push("habilidades");
    return f;
  };

  useEffect(() => {
    if (missing.length === 0) return;
    const ainda = validar();
    if (ainda.length !== missing.length) setMissing(ainda);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plano.titulo, plano.objetivo, plano.abertura, plano.desenvolvimento, plano.fechamento, plano.habilidades]);

  /* ─────────── Salvar / Histórico (local + remoto) ─────────── */

  const salvarPlano = async () => {
    const f = validar();
    setMissing(f);
    if (f.length > 0) { setSalvo(false); return; }

    const id = `p_${Date.now()}`;
    const registro: PlanoSalvo = {
      id, titulo: plano.titulo, turma, disciplina, ano: anoEscolar, modo,
      salvoEm: new Date().toISOString(),
      plano: { ...plano },
    };

    // 1) commit local imediato
    setHistorico([registro, ...historico].slice(0, 100));

    // 2) commit remoto best-effort (planos_aula)
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (uid) {
        const { data, error } = await supabase
          .from("planos_aula")
          .insert({
            user_id: uid,
            client_id: id,
            titulo: plano.titulo,
            data: { ...registro, plano },
          })
          .select("id")
          .single();
        if (!error && data?.id) {
          setHistorico((h) => h.map((p) => p.id === id ? { ...p, remoteId: data.id } : p));
        }
      }
    } catch { /* offline ok */ }

    logActivity({
      type: "planejamento",
      description: modo === "pcd"
        ? `Planejamento PCD salvo: ${plano.titulo}`
        : `Planejamento salvo: ${plano.titulo}`,
      detail: `${anoEscolar} · ${disciplina}`,
    });
    setSalvo(true);
    showToast("Plano salvo no histórico");
    window.setTimeout(() => setSalvo(false), 2000);
  };

  const carregarPlano = (p: PlanoSalvo) => {
    setPlano(p.plano);
    setPlanosMulti([]); setPlanoIdx(0);
    if (p.turma) setTurma(p.turma);
    if (p.disciplina) setDisciplina(p.disciplina);
    setAnoFallback(p.ano);
    showToast(`Plano "${p.titulo}" carregado`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const duplicarPlano = (p: PlanoSalvo) => {
    const copia: PlanoAtividade = { ...p.plano, titulo: `${p.plano.titulo} (cópia)` };
    setPlano(copia);
    setPlanosMulti([]); setPlanoIdx(0);
    showToast("Cópia editável criada");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removerPlano = async (p: PlanoSalvo) => {
    setHistorico(historico.filter((x) => x.id !== p.id));
    setConfirmDel("");
    if (p.remoteId) {
      try { await supabase.from("planos_aula").delete().eq("id", p.remoteId); } catch { /* noop */ }
    }
    showToast("Plano removido");
  };

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return historico;
    return historico.filter((p) =>
      p.titulo.toLowerCase().includes(q) || p.disciplina.toLowerCase().includes(q),
    );
  }, [historico, busca]);

  /* ─────────── Adicionar ao M1 ─────────── */

  // Picker de data para escolher EM QUE DIA a atividade será dada.
  // O resultado é gravado tanto na semana M1 (mapeando o dia da semana) quanto
  // no calendário M4 (data exata, com camada "Aulas"/"Avaliações").
  const todayIso = () => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${dd}`;
  };
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [agendaDate, setAgendaDate] = useState<string>(todayIso());
  const [agendaCat, setAgendaCat] = useState<"aulas" | "aval">("aulas");

  // Salvar todos os planos gerados em lote (multi-tabs).
  const [salvarTodosOpen, setSalvarTodosOpen] = useState(false);
  const [bulkSameDay, setBulkSameDay] = useState(true);
  const [bulkCommonDate, setBulkCommonDate] = useState<string>(todayIso());
  const [bulkCommonCat, setBulkCommonCat] = useState<"aulas" | "aval">("aulas");
  const [bulkRows, setBulkRows] = useState<{ data: string; cat: "aulas" | "aval" }[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);

  const abrirAgenda = () => {
    const f = validar();
    setMissing(f);
    if (f.length > 0) return;
    setAgendaDate(todayIso());
    setAgendaCat(tipo === "Avaliação" ? "aval" : "aulas");
    setAgendaOpen(true);
  };

  const confirmarAgenda = () => {
    if (!agendaDate) return;
    const dt = new Date(`${agendaDate}T00:00:00`);
    const wd = dt.getDay(); // 0=Dom..6=Sáb
    const map: Record<number, DayKey | null> = {
      0: null, 1: "seg", 2: "ter", 3: "qua", 4: "qui", 5: "sex", 6: null,
    };
    const alvo = map[wd];

    // 1) Empilha na grade semanal M1 (se cair em dia útil).
    if (alvo) {
      const card: M1Card = {
        id: `m1_${Date.now()}`,
        v: VARIANT_BY_DISC[disciplina] ?? "port",
        tag: TAG_BY_DISC[disciplina] ?? "ATV",
        title: plano.titulo,
        bncc: plano.habilidades[0]?.codigo ?? "—",
        minutos: DUR_TO_MIN[duracao] ?? 45,
        foco: plano.objetivo.slice(0, 80),
        motivo: `Agendado em ${dt.toLocaleDateString("pt-BR")} (${modo === "pcd" ? "PCD" : "regular"}).`,
      };
      setM1Plan({ ...m1Plan, [alvo]: [...(m1Plan[alvo] || []), card] });
    }

    // 2) Adiciona ao calendário M4 (camadas) na data exata escolhida.
    const evt: M4UserEvt = {
      id: `m4u_${Date.now()}`,
      cat: agendaCat,
      title: `${TAG_BY_DISC[disciplina] ?? "ATV"} · ${plano.titulo}`,
      meta: `${(DUR_TO_MIN[duracao] ?? 45)} min${turma ? ` · ${turma}` : ""}${modo === "pcd" ? " · PCD" : ""}`,
      source: modo === "pcd" ? "pcd" : "atv",
      turma: turma || undefined,
      disciplina,
      minutos: DUR_TO_MIN[duracao] ?? 45,
    };
    setM4UserEvents({
      ...m4UserEvents,
      [agendaDate]: [...(m4UserEvents[agendaDate] ?? []), evt],
    });

    // 3) Salvar o plano no histórico (local + remoto), para que sempre que a
    // atividade for colocada no calendário ela apareça também em "Histórico
    // de planos" — mesma semântica do fluxo de lote.
    const histId = `p_${Date.now()}`;
    const registro: PlanoSalvo = {
      id: histId,
      titulo: plano.titulo,
      turma,
      disciplina,
      ano: anoEscolar,
      modo,
      salvoEm: new Date().toISOString(),
      plano: { ...plano },
    };
    setHistorico((h) => [registro, ...h].slice(0, 100));
    void (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) return;
        const { data, error } = await supabase
          .from("planos_aula")
          .insert({
            user_id: uid,
            client_id: histId,
            titulo: plano.titulo,
            data: { ...registro, plano },
          })
          .select("id")
          .single();
        if (!error && data?.id) {
          setHistorico((h) => h.map((p) => p.id === histId ? { ...p, remoteId: data.id } : p));
        }
      } catch { /* offline ok */ }
    })();

    logActivity({
      type: "planejamento",
      description: `Atividade salva e agendada em ${dt.toLocaleDateString("pt-BR")}: ${plano.titulo}`,
      detail: `${anoEscolar} · ${disciplina}`,
    });
    showToast(
      `Salvo no histórico e agendado em ${dt.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })} · M1 + M4`,
    );
    setAgendaOpen(false);
  };

  /* ─────────── Salvar todos (lote multi-planos) ─────────── */

  const planosParaSalvar = useMemo<PlanoAtividade[]>(() => {
    if (planosMulti.length <= 1) return [];
    // Garante que a edição em curso esteja refletida no índice ativo.
    return planosMulti.map((p, i) => (i === planoIdx ? plano : p));
  }, [planosMulti, planoIdx, plano]);

  const abrirSalvarTodos = () => {
    if (planosParaSalvar.length === 0) return;
    const base = todayIso();
    setBulkSameDay(true);
    setBulkCommonDate(base);
    setBulkCommonCat(tipo === "Avaliação" ? "aval" : "aulas");
    setBulkRows(
      planosParaSalvar.map(() => ({
        data: base,
        cat: (tipo === "Avaliação" ? "aval" : "aulas") as "aulas" | "aval",
      })),
    );
    setSalvarTodosOpen(true);
  };

  const confirmarSalvarTodos = async () => {
    if (planosParaSalvar.length === 0) return;
    setBulkSaving(true);
    let okSave = 0;
    let okSched = 0;
    const m1Acc: M1Plan = { ...m1Plan };
    const m4Acc: M4UserStore = { ...m4UserEvents };
    for (let i = 0; i < planosParaSalvar.length; i++) {
      const p = planosParaSalvar[i];
      const data = bulkSameDay ? bulkCommonDate : (bulkRows[i]?.data || bulkCommonDate);
      const cat = bulkSameDay ? bulkCommonCat : (bulkRows[i]?.cat || bulkCommonCat);
      // Validação mínima — pula planos sem título/objetivo.
      if (!p.titulo.trim() || !p.objetivo.trim()) continue;

      // 1) Histórico
      const id = `p_${Date.now()}_${i}`;
      const registro: PlanoSalvo = {
        id, titulo: p.titulo, turma, disciplina, ano: anoEscolar, modo,
        salvoEm: new Date().toISOString(),
        plano: { ...p },
      };
      setHistorico((h) => [registro, ...h].slice(0, 100));
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (uid) {
          await supabase.from("planos_aula").insert({
            user_id: uid,
            client_id: id,
            titulo: p.titulo,
            data: { ...registro, plano: p },
          });
          void import("@/lib/admin/track").then(({ trackEvent }) => trackEvent("plano_aula_gerado", { titulo: p.titulo, turma, disciplina, ano: anoEscolar, modo }));
        }
      } catch { /* offline */ }
      okSave++;

      // 2) Agendar (M1 + M4)
      if (data) {
        const dt = new Date(`${data}T00:00:00`);
        const wd = dt.getDay();
        const map: Record<number, DayKey | null> = {
          0: null, 1: "seg", 2: "ter", 3: "qua", 4: "qui", 5: "sex", 6: null,
        };
        const alvo = map[wd];
        if (alvo) {
          const card: M1Card = {
            id: `m1_${Date.now()}_${i}`,
            v: VARIANT_BY_DISC[disciplina] ?? "port",
            tag: TAG_BY_DISC[disciplina] ?? "ATV",
            title: p.titulo,
            bncc: p.habilidades[0]?.codigo ?? "—",
            minutos: DUR_TO_MIN[duracao] ?? 45,
            foco: p.objetivo.slice(0, 80),
            motivo: `Agendado em ${dt.toLocaleDateString("pt-BR")} (lote · ${modo === "pcd" ? "PCD" : "regular"}).`,
          };
          m1Acc[alvo] = [...(m1Acc[alvo] || []), card];
        }
        const evt: M4UserEvt = {
          id: `m4u_${Date.now()}_${i}`,
          cat,
          title: `${TAG_BY_DISC[disciplina] ?? "ATV"} · ${p.titulo}`,
          meta: `${(DUR_TO_MIN[duracao] ?? 45)} min${turma ? ` · ${turma}` : ""}${modo === "pcd" ? " · PCD" : ""}`,
          source: modo === "pcd" ? "pcd" : "atv",
          turma: turma || undefined,
          disciplina,
          minutos: DUR_TO_MIN[duracao] ?? 45,
        };
        m4Acc[data] = [...(m4Acc[data] ?? []), evt];
        okSched++;
      }
    }
    setM1Plan(m1Acc);
    setM4UserEvents(m4Acc);
    logActivity({
      type: "planejamento",
      description: `${okSave} planos salvos em lote (${okSched} agendados)`,
      detail: `${anoEscolar} · ${disciplina}`,
    });
    setBulkSaving(false);
    setSalvarTodosOpen(false);
    showToast(`${okSave} planos salvos · ${okSched} agendados no calendário ✓`);
  };

  /* ─────────── PDF ─────────── */

  // Constrói as seções padrão (modelo novo) a partir do plano atual.
  const construirSecoesPlanoAtual = (): SecaoImpressao[] => {
    const blocos: SecaoImpressao["blocos"] = [];
    const descricao = [
      plano.abertura ? `Abertura\n${plano.abertura}` : "",
      plano.desenvolvimento ? `Desenvolvimento\n${plano.desenvolvimento}` : "",
      plano.fechamento ? `Fechamento\n${plano.fechamento}` : "",
    ].filter(Boolean).join("\n\n");
    if (descricao) blocos.push({ label: "Atividades:", body: descricao });
    const habs = (plano.habilidades || []).filter((h) => (h.codigo || h.descricao));
    if (plano.objetivo || habs.length) {
      blocos.push({
        label: "Objetivos:",
        body: plano.objetivo || undefined,
        bulletsBncc: habs.map((h) => ({
          texto: h.descricao?.trim() || h.codigo?.trim() || "—",
          codigo: h.codigo?.trim() || undefined,
        })),
      });
    }
    const adapts = plano.adaptacoes.filter((a) => a.incluido !== false);
    if (adapts.length > 0) {
      blocos.push({ label: "Adaptações PCD:", bullets: adapts.map((a) => `[${a.categoria}] ${a.texto}`) });
    }
    const sugs = (plano.sugestoes || []).filter((s) => s.utilizado === true);
    if (sugs.length > 0) {
      blocos.push({
        label: "Sugestões da Sofia:",
        bullets: sugs.map((s) => `${s.titulo} — ${s.descricao}`),
      });
    }
    if ((plano.contribuicoesInter ?? []).length > 0) {
      blocos.push({ label: "Interdisciplinar:", bullets: plano.contribuicoesInter!.map((c) => `${c.disciplina}: ${c.contribuicao}`) });
    }
    const matsUsados = (plano.materiais || []).filter((_, i) => !!plano.materiaisCheck?.[i]);
    if (matsUsados.length > 0) {
      blocos.push({ label: "Materiais e Recursos Utilizados:", bullets: matsUsados });
    }
    return [{ titulo: plano.titulo || "Plano de atividade", blocos }];
  };

  const [exportSingleOpen, setExportSingleOpen] = useState(false);
  /**
   * Procura a data agendada (YYYY-MM-DD) desta atividade no calendário M4.
   * Faz match pelo título do evento (gerado em `salvarPlanoNoCalendario`,
   * que prefixa a TAG da disciplina). Retorna a primeira ocorrência futura
   * se houver, ou a mais recente; `undefined` quando a atividade não está
   * agendada.
   */
  const dataAgendadaDoPlanoAtual = useMemo<string | undefined>(() => {
    const t = (plano.titulo || "").trim();
    if (!t) return undefined;
    const datas: string[] = [];
    for (const [iso, eventos] of Object.entries(m4UserEvents || {})) {
      if (!Array.isArray(eventos)) continue;
      const achou = eventos.some((e) => typeof e?.title === "string" && e.title.includes(t));
      if (achou) datas.push(iso);
    }
    if (datas.length === 0) return undefined;
    const hoje = todayIso();
    const futuras = datas.filter((d) => d >= hoje).sort();
    if (futuras.length > 0) return futuras[0];
    return datas.sort().pop();
  }, [m4UserEvents, plano.titulo]);

  const exportarPDF = async () => {
    const f = validar();
    setMissing(f);
    if (f.length > 0) {
      const labels = f.map((k) => LABELS[k] || k).join(", ");
      showToast(`⚠️ Preencha antes de exportar: ${labels}`);
      // dá tempo do banner renderizar antes de rolar até ele
      window.setTimeout(() => {
        const el = document.getElementById("atv-missing-banner");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("atv-error--flash");
          window.setTimeout(() => el.classList.remove("atv-error--flash"), 1600);
        }
      }, 50);
      return;
    }
    setExportSingleOpen(true);
  };

  const tituloDocPlano = modo === "pcd" ? "PLANO DE ATIVIDADE PCD" : "PLANO DE ATIVIDADE";

  const exportarPlanoAtual = (info: PrintInfo, comoWord: boolean) => {
    const args = {
      titulo: tituloDocPlano,
      escola: info.escola || undefined,
      turma: info.turma || turma || undefined,
      professor: info.professor || undefined,
      dataInicio: info.dataInicio || undefined,
      dataFim: info.dataFim || undefined,
      secoes: construirSecoesPlanoAtual(),
      rodapeLegal: modo === "pcd"
        ? "Documento gerado com apoio do AgilizaProf em consonância com a Lei 9.394/1996 (LDB) e a Lei 13.146/2015 (LBI)."
        : "Documento gerado com apoio do AgilizaProf em consonância com a Lei 9.394/1996 (LDB).",
    };
    if (comoWord) salvarPlanejamentoDocx(args, plano.titulo || tituloDocPlano);
    else imprimirPlanejamentoDireto(args);
    logActivity({
      type: "exportacao",
      description: `${comoWord ? "Word" : "PDF"} exportado: ${plano.titulo}`,
      detail: `${anoEscolar} · ${disciplina}`,
    });
    showToast(comoWord ? "💾 Arquivo Word baixado." : "📄 Documento aberto para impressão / PDF");
  };

  /**
   * Gera as "partes" editoriais de um plano salvo (mesmo layout do
   * `exportarPDF` individual) para ser concatenado na impressão em lote.
   */
  const _partesDoPlanoSalvo = (s: PlanoSalvo): string => {
    const p = s.plano;
    const titulo = p.titulo || s.titulo || "Plano de atividade";
    const meta = [
      { label: "Ano escolar", value: s.ano || "—" },
      { label: "Disciplina", value: s.disciplina || "—" },
      { label: "Turma", value: s.turma || "—" },
      { label: "Modo", value: s.modo === "pcd" ? "Atividade PCD" : "Regular" },
      { label: "Salvo em", value: new Date(s.salvoEm).toLocaleDateString("pt-BR") },
    ];
    const partes: string[] = [];
    partes.push(
      editorialCover({
        title: titulo,
        overline: s.modo === "pcd"
          ? "PLANO DE ATIVIDADE PCD • AGILIZAPROF"
          : "PLANO DE ATIVIDADE • AGILIZAPROF",
        subtitle: `${s.disciplina}${s.ano ? ` · ${s.ano}` : ""}${s.turma ? ` · ${s.turma}` : ""}`,
      }),
    );
    partes.push(editorialSection("Identificação"));
    partes.push(editorialFieldsGrid(meta));
    if (p.objetivo) {
      partes.push(editorialSection("Objetivo"));
      partes.push(editorialLongField(p.objetivo));
    }
    partes.push(editorialSection("Descrição da atividade"));
    partes.push(editorialLongField([
      p.abertura ? `Abertura\n${p.abertura}` : "",
      p.desenvolvimento ? `Desenvolvimento\n${p.desenvolvimento}` : "",
      p.fechamento ? `Fechamento\n${p.fechamento}` : "",
    ].filter(Boolean).join("\n\n")));
    if (p.habilidades.length > 0) {
      partes.push(editorialSection("Habilidades BNCC"));
      partes.push(editorialLongField(
        p.habilidades.map((h) => {
          const cod = h.codigo?.trim();
          const desc = h.descricao?.trim();
          if (cod && desc) return `• ${cod} — ${desc}`;
          return `• ${cod || desc || "—"}`;
        }).join("\n"),
      ));
    }
    if ((p.contribuicoesInter ?? []).length > 0) {
      partes.push(editorialSection("Contribuição por disciplina (interdisciplinar)"));
      partes.push(editorialLongField(
        p.contribuicoesInter!.map((c) => `• ${c.disciplina}: ${c.contribuicao}`).join("\n"),
      ));
    }
    {
      const adapts = p.adaptacoes.filter((a) => a.incluido !== false);
      if (adapts.length > 0) {
        partes.push(editorialSection("Adaptações PCD"));
        partes.push(editorialLongField(
          adapts.map((a) => `• [${a.categoria}] ${a.texto}`).join("\n"),
        ));
      }
    }
    {
      const sugs = p.sugestoes.filter((s) => s.utilizado === true);
      if (sugs.length > 0) {
        partes.push(editorialSection("Sugestões da Sofia"));
        partes.push(editorialLongField(
          sugs.map((x) => `• ${x.titulo} — ${x.descricao}`).join("\n"),
        ));
      }
    }
    {
      const matsUsados = p.materiais.filter((_, i) => !!p.materiaisCheck?.[i]);
      if (matsUsados.length > 0) {
        partes.push(editorialSection("Materiais necessários"));
        partes.push(editorialLongField(matsUsados.map((m) => `☐ ${m}`).join("\n")));
      }
    }
    return partes.join("\n");
  };

  /**
   * Imprime todas as atividades selecionadas no histórico em um único
   * documento, separadas por quebra de página.
   */
  const imprimirSelecionadas = () => {
    const lista = historico.filter((p) => selecionados.has(p.id));
    if (lista.length === 0) {
      showToast("Selecione ao menos uma atividade no histórico.");
      return;
    }
    setPrintModalOpen(true);
  };

  const [printModalOpen, setPrintModalOpen] = useState(false);

  const construirArgsImpressao = (info: PrintInfo) => {
    const lista = historico.filter((p) => selecionados.has(p.id));
    if (lista.length === 0) return null;
    const tituloDoc = modo === "pcd" ? "PLANEJAMENTO PCD" : "PLANEJAMENTO";
    const secoes: SecaoImpressao[] = lista.map((s) => {
      const p = s.plano;
      const descricao = [
        p.abertura ? `Abertura\n${p.abertura}` : "",
        p.desenvolvimento ? `Desenvolvimento\n${p.desenvolvimento}` : "",
        p.fechamento ? `Fechamento\n${p.fechamento}` : "",
      ].filter(Boolean).join("\n\n");
      const blocos: SecaoImpressao["blocos"] = [];
      if (descricao) blocos.push({ label: "Atividades:", body: descricao });
      const objetivo = p.objetivo?.trim();
      const habs = (p.habilidades || []).filter((h) => (h.codigo || h.descricao));
      if (objetivo || habs.length) {
        blocos.push({
          label: "Objetivos:",
          body: objetivo || undefined,
          bulletsBncc: habs.map((h) => ({
            texto: h.descricao?.trim() || h.codigo?.trim() || "—",
            codigo: h.codigo?.trim() || undefined,
          })),
        });
      }
      const adapts = (p.adaptacoes || []).filter((a) => a.incluido !== false);
      if (adapts.length) {
        blocos.push({
          label: "Adaptações PCD:",
          bullets: adapts.map((a) => `[${a.categoria}] ${a.texto}`),
        });
      }
      const sugs = (p.sugestoes || []).filter((s) => s.utilizado === true);
      if (sugs.length) {
        blocos.push({
          label: "Sugestões da Sofia:",
          bullets: sugs.map((s) => `${s.titulo} — ${s.descricao}`),
        });
      }
      const matsUsados = (p.materiais || []).filter((_, i) => !!p.materiaisCheck?.[i]);
      if (matsUsados.length) {
        blocos.push({ label: "Materiais e Recursos Utilizados:", bullets: matsUsados });
      }
      const titulo = [
        s.salvoEm ? new Date(s.salvoEm).toLocaleDateString("pt-BR") : "",
        p.titulo || s.titulo,
      ].filter(Boolean).join(" — ");
      return { titulo, blocos };
    });
    const turmas = Array.from(new Set(lista.map((p) => p.turma).filter(Boolean)));
    return {
      lista,
      titulo: tituloDoc,
      escola: info.escola || undefined,
      turma: info.turma || turmas.join(" · ") || undefined,
      professor: info.professor || undefined,
      dataInicio: info.dataInicio || undefined,
      dataFim: info.dataFim || undefined,
      secoes,
      rodapeLegal: modo === "pcd"
        ? "Documento gerado com apoio do AgilizaProf em consonância com a Lei 9.394/1996 (LDB) e a Lei 13.146/2015 (LBI)."
        : "Documento gerado com apoio do AgilizaProf em consonância com a Lei 9.394/1996 (LDB).",
    };
  };

  const executarImpressao = (info: PrintInfo) => {
    const a = construirArgsImpressao(info);
    if (!a) return;
    const { lista, ...args } = a;
    imprimirPlanejamentoDireto(args);
    logActivity({
      type: "exportacao",
      description: `Impressão em lote: ${lista.length} atividade(s)`,
      detail: lista.map((p) => p.titulo).join(" | "),
    });
    showToast(`📄 ${lista.length} atividade(s) abertas para impressão / PDF`);
  };

  const executarSalvarWord = (info: PrintInfo) => {
    const a = construirArgsImpressao(info);
    if (!a) return;
    const { lista, ...args } = a;
    salvarPlanejamentoDocx(args, `${args.titulo}_${lista.length}_atividades`);
    logActivity({
      type: "exportacao",
      description: `Word exportado em lote: ${lista.length} atividade(s)`,
      detail: lista.map((p) => p.titulo).join(" | "),
    });
    showToast(`💾 ${lista.length} atividade(s) salvas em Word.`);
  };

  /* ─────────── Render ─────────── */

  return (
    <div className="atv-root">
      <style>{css}</style>

      {/* ────── Toolbar de geração ────── */}
      <div className="atv-toolbar">
        <div className="atv-toolbar-row">
          <div className="atv-field">
            <label>Turma <span className="atv-opt">(opcional)</span></label>
            <select value={turma} onChange={(e) => setTurma(e.target.value)}>
              <option value="">
                {turmasPerfil.length === 0
                  ? "Sem turma — gerar mesmo assim"
                  : "Sem turma específica"}
              </option>
              {turmasPerfil.map((t) => (
                <option key={t.id} value={t.nome}>{t.nome}</option>
              ))}
            </select>
          </div>

          <div className="atv-field">
            <label>Ano escolar</label>
            {anoTurma ? (
              <div className="atv-badge-ano" title="Vindo do cadastro da turma">
                {anoTurma}
              </div>
            ) : (
              <select value={anoFallback} onChange={(e) => setAnoFallback(e.target.value)}>
                {ANOS_FALLBACK.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            )}
          </div>

          <div className="atv-field">
            <label>{disciplinaLabel}</label>
            <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)}>
              {disciplinasOpts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="atv-field">
            <label>Duração</label>
            <select value={duracao} onChange={(e) => setDuracao(e.target.value)}>
              {DURACOES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="atv-field">
            <label>Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="atv-field grow">
            <label>Tema ou conteúdo</label>
            <input
              type="text" value={tema} maxLength={140}
              onChange={(e) => setTema(e.target.value)}
              placeholder={modo === "pcd" ? "Ex.: Estímulo sensorial com sons" : "Ex.: Sistema solar"}
            />
          </div>
        </div>

        {disciplina === "Interdisciplinar" && (
          <div className="atv-inter">
            <div className="atv-inter-head">
              <span className="atv-inter-label">{interLabel}</span>
              <span className="atv-inter-hint">
                {isEI
                  ? "Marque 2 ou mais Campos de Experiência. A Sofia vai articulá-los em uma única vivência."
                  : "Marque 2 ou mais. Sofia vai articular as áreas em uma única atividade."}
              </span>
              {disciplinasInter.length > 0 && (
                <button
                  className="atv-inter-clear"
                  onClick={() => setDisciplinasInter([])}
                  type="button"
                >
                  Limpar
                </button>
              )}
            </div>
            <div className="atv-inter-chips">
              {disciplinasOpts.filter((d) => d !== "Interdisciplinar").map((d) => {
                const sel = disciplinasInter.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    className={`atv-inter-chip${sel ? " sel" : ""}`}
                    onClick={() =>
                      setDisciplinasInter((cur) =>
                        cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d],
                      )
                    }
                  >
                    {sel ? <Check size={11} /> : <Plus size={11} />}
                    {d}
                  </button>
                );
              })}
            </div>
            {disciplinasInter.length === 1 && (
              <p className="atv-inter-warn">
                {isEI
                  ? "Escolha pelo menos mais um Campo de Experiência para integrar."
                  : "Escolha pelo menos mais uma disciplina para gerar uma atividade interdisciplinar."}
              </p>
            )}
          </div>
        )}

        <div className="atv-toolbar-row second">
          {modo === "regular" && (
            <label className="atv-toggle">
              <input
                type="checkbox" checked={incluirPCD}
                onChange={(e) => setIncluirPCD(e.target.checked)}
              />
              <span>Incluir adaptações PCD</span>
              {alunosPCDDaTurma.length > 0 && (
                <span className="atv-toggle-hint">
                  {alunosPCDDaTurma.length} aluno(s) PCD em {turma || "—"}
                </span>
              )}
            </label>
          )}

          <div className="atv-actions">
            {(temPlano || opcoes.length > 0) && (
              <button className="atv-btn ghost" onClick={limpar}>
                <X size={14} /> Limpar
              </button>
            )}
            {temPlano ? (
              <button className="atv-btn primary" onClick={sugerirOpcoes} disabled={loadingOpcoes}>
                <RefreshCw size={14} />
                {loadingOpcoes ? "Sofia está pensando…" : "Sugerir novas opções"}
              </button>
            ) : opcoes.length === 0 ? (
              <button className="atv-btn primary" onClick={sugerirOpcoes} disabled={loadingOpcoes}>
                <Sparkles size={14} />
                {loadingOpcoes ? "Sofia está pensando…" : "Sugerir opções de aula"}
              </button>
            ) : (
              <>
                <button className="atv-btn ghost" onClick={sugerirOpcoes} disabled={loadingOpcoes}>
                  <RefreshCw size={14} />
                  {loadingOpcoes ? "Sofia…" : "Outras opções"}
                </button>
                <button
                  className="atv-btn primary"
                  onClick={gerar}
                  disabled={generating || opcoesSel.length === 0}
                >
                  <Sparkles size={14} />
                  {generating
                    ? (progresso.total > 1
                        ? `Sofia montando ${progresso.feitos}/${progresso.total}…`
                        : "Sofia está montando o plano…")
                    : opcoesSel.length === 0
                      ? "Selecione 1 ou mais opções"
                      : opcoesSel.length === 1
                        ? "Gerar plano com 1 opção"
                        : `Gerar ${opcoesSel.length} planos (1 por opção)`}
                </button>
              </>
            )}
          </div>
        </div>

        {modo === "pcd" && alunosPCDDaTurma.length === 0 && (
          <div className="atv-warn">
            <AlertTriangle size={14} />
            Nenhum aluno PCD encontrado{turma ? ` em ${turma}` : ""}. Sofia gerará
            uma atividade PCD genérica baseada no ano escolar.
          </div>
        )}

        {modo === "pcd" && alunosPCDDaTurma.length > 0 && (
          <div className="atv-foco">
            <div className="atv-foco-head">
              <span className="atv-foco-label">Aluno foco</span>
              <span className="atv-foco-hint">
                Sofia vai gerar uma atividade específica para este aluno,
                respeitando suas especificidades. Troque para gerar para outro.
              </span>
              <button
                type="button"
                className="atv-btn primary atv-foco-all"
                onClick={gerarParaTodos}
                disabled={gerandoLote || generating}
                title="Gerar uma atividade individual para cada aluno PCD da turma"
              >
                <Sparkles size={12} />
                {gerandoLote
                  ? `Gerando ${loteProg.atual}/${loteProg.total} · ${loteProg.nome}…`
                  : `Gerar para todos (${alunosPCDDaTurma.length})`}
              </button>
            </div>
            <div className="atv-foco-chips">
              {alunosPCDDaTurma.map((a, i) => {
                const sel = i === alunoFocoIdx;
                return (
                  <button
                    key={`${a.primeiro_nome}-${i}`}
                    type="button"
                    className={`atv-foco-chip${sel ? " sel" : ""}`}
                    onClick={() => {
                      setAlunoFocoIdx(i);
                      setOpcoes([]);
                      setOpcoesSel([]);
                    }}
                    title={a.pcd_anotacoes || ""}
                  >
                    {sel ? <Check size={11} /> : <Plus size={11} />}
                    <span className="atv-foco-name">{a.primeiro_nome}</span>
                    {a.pcd_codigo && (
                      <span className="atv-foco-tag">{a.pcd_codigo}</span>
                    )}
                  </button>
                );
              })}
            </div>
            {alunoFoco?.pcd_anotacoes && (
              <p className="atv-foco-notes">
                <strong>Anotações:</strong> {alunoFoco.pcd_anotacoes}
              </p>
            )}

            {(gerandoLote || lote.length > 0) && (
              <div className="atv-lote">
                <div className="atv-lote-head">
                  <span className="atv-foco-label">Atividades por aluno</span>
                  {gerandoLote ? (
                    <span className="atv-foco-hint">
                      Gerando {loteProg.atual} de {loteProg.total} — {loteProg.nome}…
                    </span>
                  ) : (
                    <span className="atv-foco-hint">
                      {lote.filter((l) => l.plano).length}/{lote.length} geradas e
                      salvas no histórico abaixo.
                    </span>
                  )}
                  {!gerandoLote && lote.length > 0 && (
                    <button
                      type="button"
                      className="atv-inter-clear"
                      onClick={() => setLote([])}
                    >
                      Limpar lista
                    </button>
                  )}
                </div>
                <ul className="atv-lote-list">
                  {lote.map((item, i) => (
                    <li key={`${item.aluno}-${i}`} className={`atv-lote-item${item.erro ? " err" : ""}`}>
                      <div className="atv-lote-info">
                        <span className="atv-lote-aluno">
                          {item.aluno}
                          {item.codigo && <span className="atv-foco-tag">{item.codigo}</span>}
                        </span>
                        <span className="atv-lote-titulo">
                          {item.erro ? `Erro: ${item.erro}` : item.plano?.titulo || "—"}
                        </span>
                      </div>
                      {item.plano && (
                        <button
                          type="button"
                          className="atv-btn ghost"
                          onClick={() => carregarDoLote(item)}
                        >
                          <Pencil size={12} /> Abrir
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {erro && (
          <div className="atv-error">
            <AlertTriangle size={14} /> {erro}
          </div>
        )}

        {missing.length > 0 && (
          <div className="atv-error" id="atv-missing-banner">
            <AlertTriangle size={14} />
            <span>
              Antes de salvar, preencha:{" "}
              {missing.map((m, i) => (
                <span key={m}>
                  <strong>{LABELS[m]}</strong>{i < missing.length - 1 ? ", " : ""}
                </span>
              ))}.
            </span>
          </div>
        )}
      </div>

      {!temPlano && !generating && (
        opcoes.length === 0 ? (
        <div className="atv-empty">
          <Sparkles size={28} />
          <h3>{modo === "pcd" ? "Plano de atividade para aluno PCD" : "Plano de atividade"}</h3>
          <p>
            Defina ano escolar, disciplina e tema (turma é opcional). Sofia sugere
            4 a 5 opções de aula com abordagens diferentes — você escolhe uma ou
            combina várias antes de gerar o plano completo.
          </p>
        </div>
        ) : (
          <div className="atv-opcoes">
            <div className="atv-opcoes-head">
              <h3><Sparkles size={14} /> Opções de aula sugeridas pela Sofia</h3>
              <p className="atv-muted">
                Marque uma ou mais opções para combinar em um único plano integrado.
              </p>
            </div>
            <div className="atv-opcoes-grid">
              {opcoes.map((o, i) => {
                const sel = opcoesSel.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    className={`atv-opcao${sel ? " sel" : ""}`}
                    onClick={() => toggleOpcao(i)}
                  >
                    <div className="atv-opcao-check">
                      {sel ? <Check size={14} /> : <Plus size={14} />}
                    </div>
                    <div className="atv-opcao-body">
                      <div className="atv-opcao-tag">{o.abordagem}</div>
                      <div className="atv-opcao-title">{o.titulo}</div>
                      <p>{o.resumo}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )
      )}

      {temPlano && planosMulti.length > 1 && (
        <section className="atv-card" style={{ padding: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--muted,#64748B)", marginRight: 4 }}>
              {planosMulti.length} planos gerados — revise cada um:
            </span>
            {planosMulti.map((p, i) => (
              <button
                key={i}
                className={`atv-btn${i === planoIdx ? " primary" : " ghost"}`}
                style={{ padding: "6px 10px", fontSize: 12 }}
                onClick={() => {
                  if (i === planoIdx) return;
                  setPlanosMulti((prev) => {
                    const updated = prev.map((x, k) => (k === planoIdx ? plano : x));
                    setPlano(updated[i]);
                    setPlanoIdx(i);
                    return updated;
                  });
                }}
                title={p.titulo || `Plano ${i + 1}`}
              >
                {i + 1}. {(p.titulo || "Sem título").slice(0, 28)}
                {(p.titulo || "").length > 28 ? "…" : ""}
              </button>
            ))}
            <span style={{ flex: 1 }} />
            <button
              className="atv-btn primary"
              style={{ padding: "6px 10px", fontSize: 12 }}
              onClick={abrirSalvarTodos}
              title="Salvar todos os planos no histórico e agendar no calendário"
            >
              <Save size={12} /> Salvar todos ({planosMulti.length})
            </button>
            <button
              className="atv-btn ghost"
              style={{ padding: "6px 10px", fontSize: 12 }}
              title="Remover esta versão da lista"
              onClick={() => {
                setPlanosMulti((prev) => {
                  const updated = prev.filter((_, k) => k !== planoIdx);
                  if (updated.length === 0) {
                    setPlano(EMPTY);
                    setPlanoIdx(0);
                    return [];
                  }
                  const newIdx = Math.min(planoIdx, updated.length - 1);
                  setPlano(updated[newIdx]);
                  setPlanoIdx(newIdx);
                  return updated;
                });
              }}
            >
              <X size={12} /> Descartar esta versão
            </button>
          </div>
        </section>
      )}

      {temPlano && (
        <PlanoBody
          plano={plano}
          modo={modo}
          alunosPCDCount={alunosPCDDaTurma.length}
          missing={missing}
          regenField={regenField}
          onChange={setField}
          onToggleMat={toggleMat}
          onRemoveMat={removeMat}
          onAddMat={addMat}
          onCopiarMat={copiarMateriais}
          onRemoveHab={removeHab}
          onAddHab={addHab}
          onUsarSugestao={usarSugestao}
          onRegenField={regenerarCampo}
          favoritas={favoritasTema}
          isFavorita={isFavorita}
          onToggleFavorita={toggleFavorita}
          onRemoverFavorita={removerFavorita}
        />
      )}

      {temPlano && (
        <div className="atv-actionbar">
          <button className="atv-btn primary" onClick={salvarPlano}>
            <Save size={14} /> {salvo ? "Salvo!" : "Salvar plano"}
          </button>
          <button className="atv-btn" onClick={exportarPDF}>
            <FileDown size={14} /> Exportar PDF / Word
          </button>
          <button className="atv-btn" onClick={abrirAgenda}>
            <CalendarPlus size={14} /> Agendar no calendário
          </button>
        </div>
      )}

      {salvarTodosOpen && (
        <div
          className="atv-modal-back"
          onClick={(e) => { if (e.target === e.currentTarget) setSalvarTodosOpen(false); }}
        >
          <div className="atv-modal" style={{ maxWidth: 560 }}>
            <div className="atv-modal-head">
              <Save size={16} />
              <h3>Salvar {planosParaSalvar.length} planos</h3>
              <button className="atv-modal-x" onClick={() => setSalvarTodosOpen(false)} aria-label="Fechar">
                <X size={14} />
              </button>
            </div>
            <p className="atv-muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.4 }}>
              Cada plano vai para o histórico e, se houver data, também para o calendário (M4 + M1 em dias úteis).
            </p>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={bulkSameDay}
                onChange={(e) => setBulkSameDay(e.target.checked)}
              />
              Agendar todos no mesmo dia
            </label>
            {bulkSameDay ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="atv-field">
                  <label>Data</label>
                  <input
                    type="date"
                    value={bulkCommonDate}
                    onChange={(e) => setBulkCommonDate(e.target.value)}
                  />
                </div>
                <div className="atv-field">
                  <label>Camada</label>
                  <select
                    value={bulkCommonCat}
                    onChange={(e) => setBulkCommonCat(e.target.value as "aulas" | "aval")}
                  >
                    <option value="aulas">📚 Aula</option>
                    <option value="aval">📝 Avaliação</option>
                  </select>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflow: "auto" }}>
                {planosParaSalvar.map((p, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 140px 120px",
                      gap: 8,
                      alignItems: "center",
                      padding: 8,
                      border: "1px solid var(--line,#E2E8F0)",
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <strong>{i + 1}.</strong> {p.titulo || "Sem título"}
                    </div>
                    <input
                      type="date"
                      value={bulkRows[i]?.data ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setBulkRows((prev) => prev.map((r, k) => (k === i ? { ...r, data: v } : r)));
                      }}
                      style={{ fontSize: 12 }}
                    />
                    <select
                      value={bulkRows[i]?.cat ?? "aulas"}
                      onChange={(e) => {
                        const v = e.target.value as "aulas" | "aval";
                        setBulkRows((prev) => prev.map((r, k) => (k === i ? { ...r, cat: v } : r)));
                      }}
                      style={{ fontSize: 12 }}
                    >
                      <option value="aulas">📚 Aula</option>
                      <option value="aval">📝 Avaliação</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
            <div className="atv-modal-foot">
              <button className="atv-btn ghost" onClick={() => setSalvarTodosOpen(false)} disabled={bulkSaving}>
                Cancelar
              </button>
              <button
                className="atv-btn primary"
                onClick={confirmarSalvarTodos}
                disabled={bulkSaving || (bulkSameDay ? !bulkCommonDate : bulkRows.some((r) => !r.data))}
              >
                <Check size={14} /> {bulkSaving ? "Salvando…" : `Salvar ${planosParaSalvar.length}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {agendaOpen && (
        <div
          className="atv-modal-back"
          onClick={(e) => { if (e.target === e.currentTarget) setAgendaOpen(false); }}
        >
          <div className="atv-modal">
            <div className="atv-modal-head">
              <CalendarPlus size={16} />
              <h3>Em qual dia será esta aula?</h3>
              <button className="atv-modal-x" onClick={() => setAgendaOpen(false)} aria-label="Fechar">
                <X size={14} />
              </button>
            </div>
            <p className="atv-muted" style={{ margin: "0 0 10px", fontSize: 12, lineHeight: 1.4 }}>
              Aparece no calendário M4 nesta data e, se for dia útil, também na semana M1.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="atv-field">
                <label>Data da aula</label>
                <input
                  type="date"
                  value={agendaDate}
                  onChange={(e) => setAgendaDate(e.target.value)}
                />
              </div>
              <div className="atv-field">
                <label>Camada</label>
                <select value={agendaCat} onChange={(e) => setAgendaCat(e.target.value as "aulas" | "aval")}>
                  <option value="aulas">📚 Aula</option>
                  <option value="aval">📝 Avaliação</option>
                </select>
              </div>
            </div>
            <div className="atv-modal-foot">
              <button className="atv-btn ghost" onClick={() => setAgendaOpen(false)}>
                Cancelar
              </button>
              <button className="atv-btn primary" onClick={confirmarAgenda} disabled={!agendaDate}>
                <Check size={14} /> Agendar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────── Histórico ────── */}
      <section className="atv-hist">
        <div className="atv-hist-head">
          <h3><FileText size={14} /> Histórico de planos {modo === "pcd" ? "PCD" : "regulares"}</h3>
          <div className="atv-search">
            <Search size={12} />
            <input
              placeholder="Buscar por título ou disciplina…"
              value={busca} onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
        {historico.length > 0 && (
          <div
            className="atv-hist-bulk"
            style={{
              display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
              padding: "8px 12px", borderBottom: "1px solid var(--line-soft,#eee)",
              fontSize: 12,
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={filtrados.length > 0 && filtrados.every((p) => selecionados.has(p.id))}
                onChange={(e) => {
                  setSelecionados((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) filtrados.forEach((p) => next.add(p.id));
                    else filtrados.forEach((p) => next.delete(p.id));
                    return next;
                  });
                }}
              />
              Selecionar todas {busca ? "(filtradas)" : ""}
            </label>
            <span style={{ color: "var(--muted,#888)" }}>
              {selecionados.size} selecionada(s)
            </span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {selecionados.size > 0 && (
                <button className="atv-btn ghost" onClick={() => setSelecionados(new Set())}>
                  Limpar
                </button>
              )}
              <button
                className="atv-btn primary"
                onClick={imprimirSelecionadas}
                disabled={selecionados.size === 0}
                title="Abre um único documento com todas as atividades selecionadas"
              >
                <Printer size={12} /> Imprimir selecionadas
              </button>
            </div>
          </div>
        )}
        {filtrados.length === 0 ? (
          <p className="atv-muted" style={{ padding: 12 }}>
            {historico.length === 0
              ? "Nenhum plano salvo ainda. Gere e clique em Salvar plano."
              : "Nenhum plano corresponde à busca."}
          </p>
        ) : (
          <ul className="atv-hist-list">
            {filtrados.map((p) => (
              <li key={p.id} className="atv-hist-item">
                <input
                  type="checkbox"
                  checked={selecionados.has(p.id)}
                  onChange={() => toggleSelecionado(p.id)}
                  aria-label={`Selecionar ${p.titulo}`}
                  style={{ margin: "0 6px 0 10px", flexShrink: 0 }}
                />
                <button className="atv-hist-main" onClick={() => carregarPlano(p)}>
                  <span className={`atv-hist-badge ${p.modo}`}>
                    {p.modo === "pcd" ? "PCD" : "REG"}
                  </span>
                  <span className="atv-hist-info">
                    <span className="atv-hist-title">{p.titulo}</span>
                    <span className="atv-hist-meta">
                      {p.turma || "sem turma"} · {p.disciplina} ·{" "}
                      {new Date(p.salvoEm).toLocaleDateString("pt-BR")}
                    </span>
                  </span>
                </button>
                <div className="atv-hist-actions">
                  <button className="atv-btn ghost" onClick={() => duplicarPlano(p)}>
                    <Copy size={12} /> Duplicar
                  </button>
                  {confirmDel === p.id ? (
                    <>
                      <button className="atv-btn danger" onClick={() => removerPlano(p)}>
                        <Check size={12} /> Confirmar
                      </button>
                      <button className="atv-btn ghost" onClick={() => setConfirmDel("")}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button className="atv-btn ghost" onClick={() => setConfirmDel(p.id)}>
                      <Trash2 size={12} /> Remover
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {toast && <div className="atv-toast">{toast}</div>}
      <PrintInfoModal
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        defaults={{ turma: turma || undefined }}
        onConfirm={executarImpressao}
        onConfirmWord={executarSalvarWord}
      />
      <PrintInfoModal
        open={exportSingleOpen}
        onOpenChange={setExportSingleOpen}
        defaults={{ turma: turma || undefined }}
        title="Exportar plano de atividade"
        askActivityDay
        scheduledDate={dataAgendadaDoPlanoAtual}
        onConfirm={(info) => exportarPlanoAtual(info, false)}
        onConfirmWord={(info) => exportarPlanoAtual(info, true)}
      />
    </div>
  );
}

const LABELS: Record<string, string> = {
  titulo: "título",
  objetivo: "objetivo",
  descricao: "descrição (abertura, desenvolvimento ou fechamento)",
  habilidades: "ao menos uma habilidade BNCC",
  habilidades_incompletas: "código e descrição em todas as habilidades BNCC",
};

/* ─────────────────────────── Body ─────────────────────────── */

function PlanoBody(props: {
  plano: PlanoAtividade;
  modo: "regular" | "pcd";
  alunosPCDCount: number;
  missing: string[];
  regenField: string;
  onChange: <K extends keyof PlanoAtividade>(k: K, v: PlanoAtividade[K]) => void;
  onToggleMat: (i: number) => void;
  onRemoveMat: (i: number) => void;
  onAddMat: (s: string) => void;
  onCopiarMat: () => void;
  onRemoveHab: (i: number) => void;
  onAddHab: (codigo: string, descricao: string) => void;
  onUsarSugestao: (s: Sugestao) => void;
  onRegenField: (field: keyof PlanoAtividade) => void;
  favoritas: Sugestao[];
  isFavorita: (s: Sugestao) => boolean;
  onToggleFavorita: (s: Sugestao) => void;
  onRemoverFavorita: (titulo: string) => void;
}) {
  const { plano, modo, alunosPCDCount, missing, regenField, onRegenField } = props;
  const [adaptOpen, setAdaptOpen] = useState(modo === "pcd" || alunosPCDCount > 0);
  useEffect(() => {
    if (modo === "regular" && alunosPCDCount > 0) setAdaptOpen(true);
  }, [modo, alunosPCDCount]);
  const [novoMat, setNovoMat] = useState("");
  const [novaHabCod, setNovaHabCod] = useState("");
  const [novaHabDesc, setNovaHabDesc] = useState("");
  const [copiado, setCopiado] = useState(false);

  const has = (k: string) => missing.includes(k);
  const isRegen = (f: string) => regenField === f;

  /* ───── Validação de inclusão / DUA (modo PCD = M2) ───── */
  const DUA_TERMS = [
    "dua", "desenho universal", "inclus", "acessib",
    "sensorial", "comunicação alternativa", "caa", "libras", "braille",
    "apoio visual", "pictograma", "rotina visual",
    "múltiplas formas", "múltiplas representaç", "múltiplos meios",
    "autorregulaç", "regulaç emocional", "antecipaç",
    "participaç", "protagonismo", "junto com a turma", "par mais experiente",
    "escolha", "tempo adicional", "ritmo próprio",
  ];
  const detectDUA = (text?: string): string[] => {
    if (!text) return [];
    const low = text.toLowerCase();
    return DUA_TERMS.filter((t) => low.includes(t));
  };
  const InclBadge = ({ hits }: { hits: string[] }) =>
    modo === "pcd" && hits.length > 0 ? (
      <span className="atv-incl-badge" title={`Sinais detectados: ${hits.slice(0, 4).join(", ")}`}>
        ✦ DUA · Inclusão
      </span>
    ) : null;

  const inclSecoes = modo === "pcd"
    ? {
        Objetivo: detectDUA(plano.objetivo),
        Abertura: detectDUA(plano.abertura),
        Desenvolvimento: detectDUA(plano.desenvolvimento),
        Fechamento: detectDUA(plano.fechamento),
        Sugestões: detectDUA(plano.sugestoes.map((s) => `${s.titulo} ${s.descricao}`).join(" ")),
      }
    : null;
  const inclVazias = inclSecoes
    ? Object.entries(inclSecoes).filter(([, v]) => v.length === 0).map(([k]) => k)
    : [];
  const inclOk = inclSecoes
    ? Object.values(inclSecoes).filter((v) => v.length > 0).length
    : 0;
  const adaptOk = modo === "pcd" && plano.adaptacoes.length >= 3;

  const RegenBtn = ({ field, label }: { field: keyof PlanoAtividade; label: string }) => (
    <button
      className="atv-regen"
      onClick={() => onRegenField(field)}
      disabled={!!regenField}
      title={`Regenerar ${label}`}
    >
      <RefreshCw size={11} className={isRegen(field) ? "spin" : undefined} />
      {isRegen(field) ? "Sofia…" : "Regenerar"}
    </button>
  );

  return (
    <div className="atv-grid">
      {modo === "pcd" && inclSecoes && (
        <section className={`atv-card atv-incl-banner${inclVazias.length > 2 || !adaptOk ? " warn" : " ok"}`}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className="atv-incl-pill">M2 · Inclusão obrigatória</span>
            <strong style={{ fontSize: 13 }}>
              {inclOk}/5 seções com sinais de DUA · {plano.adaptacoes.length} adaptação(ões) específica(s)
            </strong>
            <span style={{ flex: 1 }} />
            {(inclVazias.length > 2 || !adaptOk) ? (
              <span className="atv-incl-msg">
                Reforce a inclusão: {inclVazias.length > 0 && (
                  <>seções sem DUA — <em>{inclVazias.join(", ")}</em>. </>
                )}
                {!adaptOk && <>Mínimo de 3 adaptações específicas para o aluno foco.</>}
                {" "}Use “Regenerar” em cada bloco.
              </span>
            ) : (
              <span className="atv-incl-msg ok">
                Plano coerente com DUA — participação do aluno PCD presente em todas as etapas.
              </span>
            )}
          </div>
        </section>
      )}

      {/* 1. Título */}
      <section className={`atv-card title${has("titulo") ? " atv-invalid" : ""}`}>
        <div className="atv-card-head">
          <InlineText
            value={plano.titulo}
            onChange={(v) => props.onChange("titulo", v)}
            tag="h2" placeholder="Título da atividade"
          />
          <RegenBtn field="titulo" label="título" />
        </div>
        {plano.meta && (
          <div className="atv-meta">
            {plano.meta.ano} · {plano.meta.disciplina}
            {plano.meta.turma ? ` · ${plano.meta.turma}` : ""}
            {` · ${plano.meta.duracao} · ${plano.meta.tipo}`}
          </div>
        )}
      </section>

      {/* 2. Objetivo */}
      <section className={`atv-card${has("objetivo") ? " atv-invalid" : ""}`}>
        <div className="atv-card-head">
          <h3>① Objetivo {inclSecoes && <InclBadge hits={inclSecoes.Objetivo} />}</h3>
          <RegenBtn field="objetivo" label="objetivo" />
        </div>
        <InlineText
          value={plano.objetivo}
          onChange={(v) => props.onChange("objetivo", v)}
          tag="p" multiline placeholder="O que o aluno vai aprender"
        />
      </section>

      {/* 2. Habilidades BNCC — logo abaixo do objetivo pra evitar espaços vazios */}
      <section className={`atv-card${has("habilidades") || has("habilidades_incompletas") ? " atv-invalid" : ""}`}>
        <div className="atv-card-head">
          <h3>② Habilidades BNCC</h3>
          <RegenBtn field="habilidades" label="habilidades" />
        </div>
        <div className="atv-chips">
          {plano.habilidades.map((h, i) => (
            <span className="atv-chip" key={`${h.codigo}-${i}`} title={h.descricao}>
              {h.codigo}
              <button onClick={() => props.onRemoveHab(i)} aria-label="Remover">
                <X size={11} />
              </button>
            </span>
          ))}
          {plano.habilidades.length === 0 && (
            <span className="atv-empty-chip">Nenhuma habilidade. Adicione abaixo.</span>
          )}
        </div>
        <div className="atv-add-row">
          <input placeholder="Código (ex.: EF03MA03)" value={novaHabCod}
            onChange={(e) => setNovaHabCod(e.target.value)} />
          <input placeholder="Descrição da habilidade" value={novaHabDesc}
            onChange={(e) => setNovaHabDesc(e.target.value)} />
          <button className="atv-btn" onClick={() => {
            props.onAddHab(novaHabCod, novaHabDesc);
            setNovaHabCod(""); setNovaHabDesc("");
          }}>
            <Plus size={13} /> Adicionar
          </button>
        </div>
      </section>

      {/* 3. Contribuições interdisciplinares — logo após as habilidades BNCC */}
      {(plano.contribuicoesInter ?? []).length > 0 && (
        <section className="atv-card atv-contrib">
          <div className="atv-card-head">
            <h3>③ 🔗 Como cada disciplina contribui</h3>
          </div>
          <p className="atv-muted" style={{ marginBottom: 10 }}>
            Resumo da articulação interdisciplinar proposta pela Sofia.
          </p>
          <div className="atv-contrib-grid">
            {plano.contribuicoesInter!.map((c, i) => (
              <div className="atv-contrib-card" key={`${c.disciplina}-${i}`}>
                <div className="atv-contrib-disc">{c.disciplina}</div>
                <InlineText
                  value={c.contribuicao}
                  onChange={(v) => {
                    const next = [...plano.contribuicoesInter!];
                    next[i] = { ...c, contribuicao: v };
                    props.onChange("contribuicoesInter", next);
                  }}
                  tag="p" multiline
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Descrição */}
      <section className={`atv-card${has("descricao") ? " atv-invalid" : ""}`}>
        <div className="atv-card-head">
          <h3>④ Descrição da atividade</h3>
        </div>
        <BlockWithRegen
          label="Abertura" value={plano.abertura}
          onChange={(v) => props.onChange("abertura", v)}
          regen={<RegenBtn field="abertura" label="abertura" />}
          badge={inclSecoes && <InclBadge hits={inclSecoes.Abertura} />}
        />
        <BlockWithRegen
          label="Desenvolvimento" value={plano.desenvolvimento}
          onChange={(v) => props.onChange("desenvolvimento", v)}
          regen={<RegenBtn field="desenvolvimento" label="desenvolvimento" />}
          badge={inclSecoes && <InclBadge hits={inclSecoes.Desenvolvimento} />}
        />
        <BlockWithRegen
          label="Fechamento" value={plano.fechamento}
          onChange={(v) => props.onChange("fechamento", v)}
          regen={<RegenBtn field="fechamento" label="fechamento" />}
          badge={inclSecoes && <InclBadge hits={inclSecoes.Fechamento} />}
        />
      </section>

      {/* 5. Adaptações PCD */}
      <section className="atv-card adapt">
        <button
          type="button" className="atv-collapser"
          onClick={() => modo === "regular" && setAdaptOpen((v) => !v)}
          disabled={modo === "pcd"}
        >
          <h3>⑤ Adaptações PCD</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <RegenBtn field="adaptacoes" label="adaptações" />
            {modo === "regular" && (adaptOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
          </div>
        </button>
        {(adaptOpen || modo === "pcd") && (
          <>
            {modo === "regular" && alunosPCDCount === 0 ? (
              <p className="atv-muted">Nenhum aluno PCD nesta turma.</p>
            ) : plano.adaptacoes.length === 0 ? (
              <p className="atv-muted">Sofia não gerou adaptações. Regenere com tema mais específico.</p>
            ) : (
              <div className="atv-adapt-grid">
                {plano.adaptacoes.map((a, i) => (
                  <div
                    className="atv-adapt-card"
                    key={i}
                    style={{ opacity: a.incluido === false ? 0.55 : 1 }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div className="atv-adapt-cat">{a.categoria}</div>
                      <label
                        title="Incluir esta adaptação no documento impresso e na atividade salva"
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600, color: "var(--muted, #6B7280)", cursor: "pointer", userSelect: "none" }}
                      >
                        <input
                          type="checkbox"
                          checked={a.incluido !== false}
                          onChange={(e) => {
                            const next = [...plano.adaptacoes];
                            next[i] = { ...a, incluido: e.target.checked };
                            props.onChange("adaptacoes", next);
                          }}
                          style={{ accentColor: "#F97316" }}
                        />
                        Incluir
                      </label>
                    </div>
                    <InlineText
                      value={a.texto}
                      onChange={(v) => {
                        const next = [...plano.adaptacoes];
                        next[i] = { ...a, texto: v };
                        props.onChange("adaptacoes", next);
                      }}
                      tag="p" multiline
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* 6. Sugestões */}
      <section className="atv-card">
        <div className="atv-card-head">
          <h3>
            <Lightbulb size={14} style={{ verticalAlign: -2, marginRight: 4 }} />⑥ Sugestões da Sofia
            {inclSecoes && <InclBadge hits={inclSecoes.Sugestões} />}
          </h3>
          <RegenBtn field="sugestoes" label="sugestões" />
        </div>

        {props.favoritas.length > 0 && (
          <div className="atv-fav-block">
            <div className="atv-fav-head">
              <Star size={12} fill="#F59E0B" color="#F59E0B" />
              <span>Suas favoritas para este tema</span>
              <span className="atv-fav-count">{props.favoritas.length}</span>
            </div>
            <div className="atv-fav-grid">
              {props.favoritas.map((s, i) => (
                <div className="atv-fav" key={`fav-${i}`}>
                  <div className="atv-fav-title">{s.titulo}</div>
                  <p>{s.descricao}</p>
                  <div className="atv-fav-actions">
                    <button className="atv-btn ghost" onClick={() => props.onUsarSugestao(s)}>
                      <Check size={12} /> Usar esta
                    </button>
                    <button
                      className="atv-fav-x"
                      onClick={() => props.onRemoverFavorita(s.titulo)}
                      title="Remover das favoritas"
                      aria-label="Remover dos favoritos"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {plano.sugestoes.length === 0 ? (
          <p className="atv-muted">Sem sugestões.</p>
        ) : (
          <div className="atv-sug-grid">
            {plano.sugestoes.map((s, i) => (
              <div
                className="atv-sug"
                key={i}
                style={{ opacity: s.utilizado ? 1 : 0.75 }}
              >
                <button
                  className={`atv-sug-fav${props.isFavorita(s) ? " on" : ""}`}
                  onClick={() => props.onToggleFavorita(s)}
                  aria-label={props.isFavorita(s) ? "Remover dos favoritos" : "Salvar como favorita"}
                  title={props.isFavorita(s) ? "Favorita — clique para remover" : "Salvar como favorita"}
                >
                  <Star
                    size={14}
                    fill={props.isFavorita(s) ? "#F59E0B" : "none"}
                    color={props.isFavorita(s) ? "#F59E0B" : "#92400E"}
                  />
                </button>
                <div className="atv-sug-title">{s.titulo}</div>
                <p>{s.descricao}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 6 }}>
                  <label
                    title="Marcar como utilizada — entra no documento impresso/exportado"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600, color: "var(--muted, #6B7280)", cursor: "pointer", userSelect: "none" }}
                  >
                    <input
                      type="checkbox"
                      checked={!!s.utilizado}
                      onChange={(e) => {
                        const next = [...plano.sugestoes];
                        next[i] = { ...s, utilizado: e.target.checked };
                        props.onChange("sugestoes", next);
                      }}
                      style={{ accentColor: "#F59E0B" }}
                    />
                    Utilizada
                  </label>
                  <button className="atv-btn ghost" onClick={() => props.onUsarSugestao(s)}>
                    <Check size={12} /> Usar esta
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 7. Materiais */}
      <section className="atv-card">
        <div className="atv-card-head">
          <h3>⑦ Material necessário</h3>
          <div style={{ display: "flex", gap: 6 }}>
            <RegenBtn field="materiais" label="materiais" />
            <button
              className="atv-btn ghost"
              onClick={() => { props.onCopiarMat(); setCopiado(true); setTimeout(() => setCopiado(false), 1500); }}
              disabled={plano.materiais.length === 0}
            >
              <Copy size={12} /> {copiado ? "Copiado!" : "Copiar lista"}
            </button>
          </div>
        </div>
        <ul className="atv-mat">
          {plano.materiais.map((m, i) => (
            <li key={i}>
              <label>
                <input type="checkbox" checked={!!plano.materiaisCheck?.[i]} onChange={() => props.onToggleMat(i)} />
                <span style={{
                  fontWeight: plano.materiaisCheck?.[i] ? 600 : 400,
                  color: plano.materiaisCheck?.[i] ? "var(--atv-accent, #16a34a)" : undefined,
                }}>
                  {m}
                  {plano.materiaisCheck?.[i] && (
                    <span style={{
                      marginLeft: 8,
                      fontSize: 11,
                      padding: "2px 6px",
                      borderRadius: 999,
                      background: "color-mix(in oklab, var(--atv-accent, #16a34a) 15%, transparent)",
                      color: "var(--atv-accent, #16a34a)",
                      fontWeight: 600,
                    }}>
                      ✓ para usar
                    </span>
                  )}
                </span>
              </label>
              <button className="atv-x" onClick={() => props.onRemoveMat(i)} aria-label="Remover">
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
        <div className="atv-add-row">
          <input placeholder="Adicionar material" value={novoMat}
            onChange={(e) => setNovoMat(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { props.onAddMat(novoMat); setNovoMat(""); } }} />
          <button className="atv-btn" onClick={() => { props.onAddMat(novoMat); setNovoMat(""); }}>
            <Plus size={13} /> Adicionar item
          </button>
        </div>
      </section>
    </div>
  );
}

/* ─────────────────── inline-edit primitives ─────────────────── */

function InlineText({
  value, onChange, tag = "p", placeholder, multiline,
}: {
  value: string; onChange: (v: string) => void;
  tag?: "h2" | "h3" | "p"; placeholder?: string; multiline?: boolean;
}) {
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  const commit = () => { onChange(draft.trim()); setEdit(false); };
  if (edit) {
    return multiline ? (
      <textarea autoFocus className="atv-inline-input" value={draft}
        onChange={(e) => setDraft(e.target.value)} onBlur={commit} />
    ) : (
      <input autoFocus className="atv-inline-input" value={draft}
        onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); }} />
    );
  }
  const Tag = tag as "p";
  return (
    <Tag className="atv-inline" onClick={() => setEdit(true)}>
      {value || <span className="atv-placeholder">{placeholder || "Clique para editar"}</span>}
      <Pencil size={12} className="atv-inline-icon" />
    </Tag>
  );
}

function BlockWithRegen({
  label, value, onChange, regen, badge,
}: { label: string; value: string; onChange: (v: string) => void; regen: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="atv-block">
      <div className="atv-block-head">
        <div className="atv-block-label" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {label}
          {badge}
        </div>
        {regen}
      </div>
      <InlineText value={value} onChange={onChange} tag="p" multiline placeholder={`Descreva o ${label.toLowerCase()}…`} />
    </div>
  );
}

/* ─────────────────────────── Styles ─────────────────────────── */

const css = `
.atv-root{display:flex;flex-direction:column;gap:16px;}
.atv-root *{box-sizing:border-box;}
.atv-toolbar{background:#fff;border:1px solid var(--line,#E2E8F0);border-radius:12px;padding:14px;box-shadow:0 1px 2px rgba(15,23,42,.05);}
.atv-toolbar-row{display:grid;grid-template-columns:1.2fr 1fr 1fr .8fr .8fr 2fr;gap:10px;align-items:end;}
.atv-toolbar-row.second{display:flex;justify-content:space-between;align-items:center;margin-top:10px;gap:10px;flex-wrap:wrap;}
@media(max-width:1100px){.atv-toolbar-row{grid-template-columns:1fr 1fr;}}
.atv-field{display:flex;flex-direction:column;gap:4px;min-width:0;}
.atv-field.grow{min-width:0;}
.atv-field label{font-size:11px;font-weight:600;color:var(--muted,#64748B);text-transform:uppercase;letter-spacing:.05em;}
.atv-field label .atv-opt{font-weight:500;text-transform:none;letter-spacing:0;color:var(--muted,#94A3B8);margin-left:4px;}
.atv-field select,.atv-field input{height:36px;border:1px solid var(--line,#E2E8F0);border-radius:8px;padding:0 10px;font-size:13px;background:#fff;color:var(--ink,#0F172A);font-family:inherit;}
.atv-field select:focus,.atv-field input:focus{outline:none;border-color:var(--orange,#FF7A45);box-shadow:0 0 0 3px rgba(255,122,69,.15);}
.atv-badge-ano{height:36px;display:inline-flex;align-items:center;padding:0 12px;border-radius:8px;background:rgba(59,130,246,.10);color:#1E40AF;font-weight:700;font-size:12.5px;font-family:'JetBrains Mono',monospace;border:1px solid rgba(59,130,246,.2);}
.atv-toggle{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;color:var(--ink,#0F172A);cursor:pointer;}
.atv-toggle input{accent-color:var(--orange,#FF7A45);width:16px;height:16px;}
.atv-toggle-hint{color:var(--muted,#64748B);font-size:11.5px;margin-left:6px;}
.atv-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.atv-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;font-weight:600;font-size:13px;border:1px solid var(--line,#E2E8F0);background:#fff;color:var(--ink,#0F172A);cursor:pointer;font-family:inherit;}
.atv-btn:hover{background:#F8FAFC;}
.atv-btn.primary{background:var(--orange,#FF7A45);border-color:var(--orange,#FF7A45);color:#fff;}
.atv-btn.primary:hover{background:#F26B36;}
.atv-btn.ghost{background:transparent;}
.atv-btn.danger{background:#EF4444;border-color:#EF4444;color:#fff;}
.atv-btn.danger:hover{background:#DC2626;}
.atv-btn:disabled{opacity:.5;cursor:not-allowed;}
.atv-warn{margin-top:10px;padding:8px 12px;border-radius:8px;background:rgba(245,158,11,.10);color:#92400E;display:flex;align-items:center;gap:8px;font-size:12.5px;}
.atv-error{margin-top:10px;padding:8px 12px;border-radius:8px;background:rgba(239,68,68,.10);color:#991B1B;display:flex;align-items:center;gap:8px;font-size:12.5px;}
.atv-error--flash{animation:atvErrFlash 1.6s ease;box-shadow:0 0 0 2px rgba(239,68,68,.45);}
@keyframes atvErrFlash{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}30%{box-shadow:0 0 0 4px rgba(239,68,68,.55)}}
.atv-empty{background:#fff;border:1px dashed var(--line,#E2E8F0);border-radius:12px;padding:48px 24px;text-align:center;color:var(--muted,#64748B);}
.atv-empty h3{font-size:18px;color:var(--ink,#0F172A);margin:8px 0 4px;}
.atv-empty p{max-width:520px;margin:0 auto;font-size:13.5px;line-height:1.5;}
.atv-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start;grid-auto-rows:min-content;}
.atv-grid > *{align-self:start;height:auto;min-height:0;}
@media(max-width:980px){.atv-grid{grid-template-columns:1fr;}}
.atv-card{background:#fff;border:1px solid var(--line,#E2E8F0);border-radius:12px;padding:16px;box-shadow:0 1px 2px rgba(15,23,42,.05);height:auto;align-self:start;}
.atv-card.atv-invalid{border-color:#EF4444;box-shadow:0 0 0 3px rgba(239,68,68,.12);}
.atv-card.title{grid-column:1/-1;}
.atv-incl-banner{grid-column:1/-1;padding:12px 14px;border-radius:12px;border:1px solid;}
.atv-incl-banner.warn{background:rgba(245,158,11,.08);border-color:rgba(245,158,11,.45);color:#92400E;}
.atv-incl-banner.ok{background:rgba(16,185,129,.08);border-color:rgba(16,185,129,.4);color:#065F46;}
.atv-incl-pill{display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;background:#0F172A;color:#fff;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;}
.atv-incl-msg{font-size:12.5px;flex:1;min-width:240px;}
.atv-incl-msg.ok{color:#065F46;}
.atv-incl-badge{display:inline-flex;align-items:center;padding:2px 8px;margin-left:8px;border-radius:999px;background:linear-gradient(90deg,rgba(99,102,241,.15),rgba(16,185,129,.15));border:1px solid rgba(99,102,241,.35);color:#4338CA;font-size:10.5px;font-weight:700;letter-spacing:.02em;vertical-align:1px;}
.atv-card.adapt{background:linear-gradient(180deg,#FAF5FF,#FFFFFF);border-color:#E9D5FF;grid-column:1/-1;}
.atv-card h3{font-size:13.5px;font-weight:700;color:var(--ink,#0F172A);margin:0 0 10px;display:flex;align-items:center;gap:6px;}
.atv-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px;}
.atv-card-head h3{margin:0;}
.atv-meta{font-size:11.5px;color:var(--muted,#64748B);font-family:'JetBrains Mono',monospace;margin-top:4px;}
.atv-collapser{width:100%;display:flex;justify-content:space-between;align-items:center;background:none;border:none;cursor:pointer;padding:0;color:inherit;font-family:inherit;margin-bottom:8px;}
.atv-collapser h3{margin:0;}
.atv-collapser:disabled{cursor:default;}
.atv-muted{color:var(--muted,#64748B);font-size:13px;margin:0;}
.atv-inline{cursor:text;border-radius:6px;padding:4px 6px;margin:-4px -6px;display:block;line-height:1.5;color:var(--ink,#0F172A);font-size:14px;}
h2.atv-inline{font-size:22px;font-weight:600;font-family:'Fraunces',Georgia,serif;letter-spacing:-.01em;}
.atv-inline:hover{background:#F8FAFC;}
.atv-inline-icon{opacity:0;margin-left:6px;color:var(--muted,#64748B);}
.atv-inline:hover .atv-inline-icon{opacity:1;}
.atv-inline-input{width:100%;border:1px solid var(--orange,#FF7A45);border-radius:6px;padding:6px 8px;font-size:14px;font-family:inherit;line-height:1.5;color:var(--ink,#0F172A);}
textarea.atv-inline-input{min-height:44px;height:auto;resize:vertical;field-sizing:content;}
.atv-placeholder{color:var(--muted,#64748B);font-style:italic;}
.atv-block{margin-bottom:10px;}
.atv-block-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;}
.atv-block-label{font-size:11px;font-weight:700;color:var(--orange,#FF7A45);text-transform:uppercase;letter-spacing:.06em;font-family:'JetBrains Mono',monospace;}
.atv-regen{display:inline-flex;align-items:center;gap:4px;background:transparent;border:1px solid var(--line,#E2E8F0);border-radius:6px;padding:3px 8px;font-size:11px;color:var(--muted,#64748B);cursor:pointer;font-family:inherit;font-weight:600;}
.atv-regen:hover{background:#F8FAFC;color:var(--orange,#FF7A45);border-color:var(--orange,#FF7A45);}
.atv-regen:disabled{opacity:.5;cursor:not-allowed;}
.atv-regen .spin{animation:atv-spin 1s linear infinite;}
@keyframes atv-spin{to{transform:rotate(360deg);}}
.atv-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;}
.atv-chip{display:inline-flex;align-items:center;gap:6px;background:rgba(59,130,246,.12);color:#1E40AF;padding:4px 8px 4px 10px;border-radius:14px;font-size:11.5px;font-weight:700;font-family:'JetBrains Mono',monospace;cursor:help;}
.atv-chip button{background:none;border:none;color:inherit;cursor:pointer;padding:2px;display:flex;align-items:center;border-radius:4px;}
.atv-chip button:hover{background:rgba(0,0,0,.1);}
.atv-empty-chip{font-size:12px;color:var(--muted,#64748B);font-style:italic;}
.atv-add-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}
.atv-add-row input{flex:1 1 140px;height:32px;border:1px solid var(--line,#E2E8F0);border-radius:6px;padding:0 8px;font-size:12.5px;font-family:inherit;}
.atv-adapt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;align-items:start;}
.atv-adapt-grid > *{align-self:start;height:auto;min-height:0;}
.atv-adapt-card{background:#fff;border:1px solid #E9D5FF;border-radius:8px;padding:10px;}
.atv-adapt-cat{font-size:10.5px;font-weight:700;color:#7C3AED;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;font-family:'JetBrains Mono',monospace;}
.atv-sug-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;align-items:start;}
.atv-sug-grid > *{align-self:start;height:auto;min-height:0;}
.atv-sug{position:relative;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:10px 10px 10px 10px;display:flex;flex-direction:column;gap:6px;}
.atv-sug-fav{position:absolute;top:6px;right:6px;background:transparent;border:none;width:26px;height:26px;border-radius:6px;display:grid;place-items:center;cursor:pointer;color:#92400E;}
.atv-sug-fav:hover{background:rgba(245,158,11,.15);}
.atv-sug-fav.on{background:rgba(245,158,11,.18);}
.atv-sug-title{font-weight:700;font-size:13px;color:#92400E;}
.atv-sug p{font-size:12.5px;color:var(--ink-2,#334155);margin:0;line-height:1.45;}
.atv-sug button{align-self:flex-start;}
.atv-sug button.atv-sug-fav{align-self:auto;}
.atv-fav-block{background:linear-gradient(180deg,#FFFBEB,#FFFFFF);border:1px dashed #F59E0B;border-radius:10px;padding:10px;margin-bottom:10px;}
.atv-fav-head{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:.06em;font-family:'JetBrains Mono',monospace;margin-bottom:8px;}
.atv-fav-count{margin-left:auto;background:#F59E0B;color:#fff;padding:1px 7px;border-radius:10px;font-size:11px;}
.atv-fav-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;align-items:start;}
.atv-fav-grid > *{align-self:start;height:auto;min-height:0;}
.atv-fav{background:#fff;border:1px solid #FDE68A;border-radius:8px;padding:9px;display:flex;flex-direction:column;gap:5px;}
.atv-fav-title{font-weight:700;font-size:12.5px;color:#92400E;line-height:1.3;}
.atv-fav p{font-size:12px;color:var(--ink-2,#334155);margin:0;line-height:1.4;}
.atv-fav-actions{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-top:2px;}
.atv-fav-x{background:transparent;border:none;width:22px;height:22px;border-radius:5px;cursor:pointer;color:var(--muted,#64748B);display:grid;place-items:center;}
.atv-fav-x:hover{background:rgba(239,68,68,.12);color:#EF4444;}
.atv-mat{list-style:none;padding:0;margin:0 0 10px;display:flex;flex-direction:column;gap:4px;}
.atv-mat li{display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-radius:6px;font-size:13px;}
.atv-mat li:hover{background:#F8FAFC;}
.atv-mat label{display:flex;align-items:center;gap:8px;cursor:pointer;flex:1;}
.atv-x{background:none;border:none;color:var(--muted,#64748B);cursor:pointer;padding:4px;border-radius:4px;display:flex;align-items:center;}
.atv-x:hover{background:rgba(239,68,68,.1);color:#EF4444;}
.atv-actionbar{position:sticky;bottom:0;display:flex;gap:8px;justify-content:flex-end;padding:12px 14px;background:rgba(255,255,255,.95);backdrop-filter:blur(8px);border:1px solid var(--line,#E2E8F0);border-radius:12px;box-shadow:0 -4px 12px rgba(15,23,42,.06);z-index:5;}
.atv-hist{background:#fff;border:1px solid var(--line,#E2E8F0);border-radius:12px;padding:14px;box-shadow:0 1px 2px rgba(15,23,42,.05);}
.atv-hist-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;}
.atv-hist-head h3{font-size:13.5px;font-weight:700;color:var(--ink,#0F172A);margin:0;display:flex;align-items:center;gap:6px;}
.atv-search{display:flex;align-items:center;gap:6px;border:1px solid var(--line,#E2E8F0);border-radius:8px;padding:0 8px;background:#fff;}
.atv-search input{border:none;outline:none;height:30px;font-size:12.5px;width:220px;background:transparent;font-family:inherit;color:var(--ink,#0F172A);}
.atv-hist-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px;}
.atv-hist-item{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px;border:1px solid var(--line,#E2E8F0);border-radius:8px;}
.atv-hist-item:hover{background:#FAFBFD;}
.atv-hist-main{flex:1;display:flex;align-items:center;gap:10px;background:none;border:none;text-align:left;cursor:pointer;padding:0;font-family:inherit;color:inherit;}
.atv-hist-badge{font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:rgba(255,122,69,.15);color:#9A3412;font-family:'JetBrains Mono',monospace;letter-spacing:.04em;}
.atv-hist-badge.pcd{background:rgba(139,92,246,.15);color:#5B21B6;}
.atv-hist-info{display:flex;flex-direction:column;}
.atv-hist-title{font-weight:600;font-size:13px;color:var(--ink,#0F172A);}
.atv-hist-meta{font-size:11px;color:var(--muted,#64748B);font-family:'JetBrains Mono',monospace;}
.atv-hist-actions{display:flex;gap:6px;flex-wrap:wrap;}
.atv-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0F172A;color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;z-index:50;box-shadow:0 8px 24px rgba(0,0,0,.2);}
.atv-opcoes{background:#fff;border:1px solid var(--line,#E2E8F0);border-radius:12px;padding:16px;box-shadow:0 1px 2px rgba(15,23,42,.05);}
.atv-opcoes-head{margin-bottom:12px;}
.atv-opcoes-head h3{font-size:14px;font-weight:700;color:var(--ink,#0F172A);margin:0 0 4px;display:flex;align-items:center;gap:6px;}
.atv-opcoes-head h3 svg{color:var(--orange,#FF7A45);}
.atv-opcoes-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;align-items:start;}
.atv-opcoes-grid > *{align-self:start;height:auto;min-height:0;}
.atv-opcao{display:flex;gap:10px;text-align:left;background:#fff;border:1.5px solid var(--line,#E2E8F0);border-radius:10px;padding:12px;cursor:pointer;font-family:inherit;color:inherit;transition:all .15s;align-items:flex-start;}
.atv-opcao:hover{border-color:var(--orange,#FF7A45);background:#FFF7F2;}
.atv-opcao.sel{border-color:var(--orange,#FF7A45);background:#FFF1E8;box-shadow:0 0 0 3px rgba(255,122,69,.15);}
.atv-opcao-check{width:22px;height:22px;border-radius:6px;display:grid;place-items:center;background:#F1F5F9;color:var(--muted,#64748B);flex-shrink:0;}
.atv-opcao.sel .atv-opcao-check{background:var(--orange,#FF7A45);color:#fff;}
.atv-opcao-body{flex:1;min-width:0;}
.atv-opcao-tag{font-size:10px;font-weight:700;color:var(--orange,#FF7A45);text-transform:uppercase;letter-spacing:.06em;font-family:'JetBrains Mono',monospace;margin-bottom:4px;}
.atv-opcao-title{font-weight:700;font-size:13.5px;color:var(--ink,#0F172A);margin-bottom:4px;line-height:1.3;}
.atv-opcao p{font-size:12.5px;color:var(--muted,#64748B);margin:0;line-height:1.45;}
.atv-inter{margin-top:12px;padding:10px 12px;border-radius:10px;background:linear-gradient(180deg,#EEF6FF,#FFFFFF);border:1px dashed #93C5FD;}
.atv-inter-head{display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;}
.atv-inter-label{font-size:11px;font-weight:700;color:#1E40AF;text-transform:uppercase;letter-spacing:.06em;font-family:'JetBrains Mono',monospace;}
.atv-inter-hint{font-size:11.5px;color:var(--muted,#64748B);}
.atv-inter-clear{margin-left:auto;background:transparent;border:none;color:#1E40AF;font-size:11.5px;font-weight:600;cursor:pointer;font-family:inherit;text-decoration:underline;}
.atv-inter-chips{display:flex;flex-wrap:wrap;gap:6px;}
.atv-inter-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:14px;font-size:12px;font-weight:600;border:1.5px solid #BFDBFE;background:#fff;color:#1E3A8A;cursor:pointer;font-family:inherit;}
.atv-inter-chip:hover{border-color:#3B82F6;}
.atv-inter-chip.sel{background:#3B82F6;border-color:#3B82F6;color:#fff;}
.atv-inter-warn{margin:8px 0 0;font-size:11.5px;color:#92400E;}
.atv-card.atv-contrib{background:linear-gradient(180deg,#EEF6FF,#FFFFFF);border-color:#BFDBFE;grid-column:1/-1;}
.atv-contrib-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;align-items:start;}
.atv-contrib-grid > *{align-self:start;height:auto;min-height:0;}
.atv-contrib-card{background:#fff;border:1px solid #BFDBFE;border-radius:8px;padding:10px;}
.atv-contrib-disc{font-size:10.5px;font-weight:700;color:#1E40AF;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;font-family:'JetBrains Mono',monospace;}
.atv-foco{margin-top:10px;padding:10px 12px;border-radius:10px;background:linear-gradient(180deg,#FAF5FF,#FFFFFF);border:1px dashed #C4B5FD;}
.atv-foco-head{display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;}
.atv-foco-label{font-size:11px;font-weight:700;color:#5B21B6;text-transform:uppercase;letter-spacing:.06em;font-family:'JetBrains Mono',monospace;}
.atv-foco-hint{font-size:11.5px;color:var(--muted,#64748B);}
.atv-foco-chips{display:flex;flex-wrap:wrap;gap:6px;}
.atv-foco-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:14px;font-size:12px;font-weight:600;border:1.5px solid #DDD6FE;background:#fff;color:#5B21B6;cursor:pointer;font-family:inherit;}
.atv-foco-chip:hover{border-color:#8B5CF6;}
.atv-foco-chip.sel{background:#8B5CF6;border-color:#8B5CF6;color:#fff;}
.atv-foco-tag{font-size:10px;font-weight:700;padding:1px 6px;border-radius:8px;background:rgba(139,92,246,.15);color:#5B21B6;font-family:'JetBrains Mono',monospace;}
.atv-foco-chip.sel .atv-foco-tag{background:rgba(255,255,255,.25);color:#fff;}
.atv-foco-notes{margin:8px 0 0;font-size:11.5px;color:#4C1D95;}
.atv-foco-all{margin-left:auto;}
.atv-lote{margin-top:10px;border-top:1px dashed #C4B5FD;padding-top:10px;}
.atv-lote-head{display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;}
.atv-lote-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;}
.atv-lote-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:#fff;border:1px solid #E9D5FF;}
.atv-lote-item.err{border-color:#FCA5A5;background:#FEF2F2;}
.atv-lote-info{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1;}
.atv-lote-aluno{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#5B21B6;}
.atv-lote-titulo{font-size:11.5px;color:#475569;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.atv-lote-item.err .atv-lote-titulo{color:#991B1B;}
.atv-modal-back{position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;z-index:60;padding:12px;}
.atv-modal{background:#fff;border-radius:14px;border:1px solid var(--line,#E2E8F0);padding:12px 14px;width:100%;max-width:440px;height:auto;max-height:calc(100dvh - 24px);overflow:auto;box-shadow:0 24px 48px -12px rgba(15,23,42,.25);display:flex;flex-direction:column;gap:8px;}
.atv-modal > *{margin:0;flex:0 0 auto;}
.atv-modal-head{display:flex;align-items:center;gap:8px;}
.atv-modal-head h3{margin:0;font-size:14px;color:#0F172A;flex:1;line-height:1.25;}
.atv-modal-x{background:transparent;border:none;cursor:pointer;color:var(--muted,#64748B);padding:4px;border-radius:6px;}
.atv-modal-x:hover{background:#F1F5F9;}
.atv-modal-foot{display:flex;justify-content:flex-end;gap:8px;margin-top:2px;}
@media (max-height: 520px){
  .atv-modal-back{align-items:flex-start;padding:8px;}
  .atv-modal{padding:10px 12px;gap:6px;border-radius:12px;max-height:calc(100dvh - 16px);}
}
`;