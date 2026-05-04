import type { SofiaSuggestion } from "@/components/sofia/SofiaSuggestionCard";

// ---------- Tipos de contexto (preenchidos quando as tabelas existirem) ----------
export type ProfessoraContext = {
  professoraId: string;
  screen: string;
  entityType?: string | null;
  entityId?: string | null;
  // dados — vazios por enquanto, integraremos quando as tabelas existirem
  pareceresPendentes: { alunoId: string; alunoNome: string; prazoEmDias: number }[];
  alunosPCDComAulaAmanhaSemAdaptacao: { alunoId: string; alunoNome: string; turma: string }[];
  alunosPCDSemRegistro: { alunoId: string; alunoNome: string; diasSemRegistro: number }[];
  semanaTemPlano: boolean;
  ultimasAcoes: string[];
};

export async function loadProfessoraContext(opts: {
  professoraId: string;
  screen: string;
  entityType?: string | null;
  entityId?: string | null;
}): Promise<ProfessoraContext> {
  // TODO: substituir por queries reais (turmas, alunos, laudos, pareceres, planos)
  // quando as tabelas correspondentes existirem no Supabase.
  return {
    professoraId: opts.professoraId,
    screen: opts.screen,
    entityType: opts.entityType ?? null,
    entityId: opts.entityId ?? null,
    pareceresPendentes: [],
    alunosPCDComAulaAmanhaSemAdaptacao: [],
    alunosPCDSemRegistro: [],
    semanaTemPlano: true,
    ultimasAcoes: [],
  };
}

// ---------- Regras determinísticas ----------
type RuleResult = SofiaSuggestion & { priority: NonNullable<SofiaSuggestion["priority"]> };

export function runDeterministicRules(ctx: ProfessoraContext): RuleResult[] {
  const out: RuleResult[] = [];

  // R1 — Parecer pendente com prazo < 7 dias → urgent
  for (const p of ctx.pareceresPendentes) {
    if (p.prazoEmDias < 7) {
      out.push({
        id: `rule-parecer-${p.alunoId}`,
        priority: "urgent",
        tag: "Prazo curto",
        title: `Parecer de ${p.alunoNome} vence em ${p.prazoEmDias} ${p.prazoEmDias === 1 ? "dia" : "dias"}`,
        description: "Posso preparar uma primeira versão fundamentada nos seus registros.",
        prompt: `Gere uma primeira versão do parecer descritivo para ${p.alunoNome}, seguindo a Constituição da Sofia.`,
        context: `Radar Pedagógico · Parecer pendente`,
        actionLabel: "Gerar parecer",
      });
    }
  }

  // R2 — Aluno com PEI tem aula amanhã sem adaptação → urgent
  for (const a of ctx.alunosPCDComAulaAmanhaSemAdaptacao) {
    out.push({
      id: `rule-adapt-${a.alunoId}`,
      priority: "urgent",
      tag: "Aula amanhã",
      title: `${a.alunoNome} (${a.turma}) ainda sem adaptação para amanhã`,
      description: "Vamos garantir uma proposta alinhada ao PEI e à BNCC.",
      prompt: `Adapte a aula de amanhã para ${a.alunoNome}, considerando o PEI vigente.`,
      context: `Inclusão · Adaptações`,
      actionLabel: "Adaptar aula",
    });
  }

  // R3 — Aluno PCD sem registro há > 14 dias → recommended
  for (const a of ctx.alunosPCDSemRegistro) {
    if (a.diasSemRegistro > 14) {
      out.push({
        id: `rule-registro-${a.alunoId}`,
        priority: "recommended",
        tag: "Acompanhamento",
        title: `${a.alunoNome} está há ${a.diasSemRegistro} dias sem registro`,
        description: "Que tal fazermos uma observação rápida hoje?",
        prompt: `Me ajude a registrar uma observação pedagógica de ${a.alunoNome}.`,
        context: "Inclusão · Acompanhamento",
        actionLabel: "Registrar",
      });
    }
  }

  // R4 — Plano da semana ainda não criado → recommended
  if (!ctx.semanaTemPlano) {
    out.push({
      id: "rule-plano-semana",
      priority: "recommended",
      tag: "Planejamento",
      title: "Plano da semana ainda não foi criado",
      description: "Posso montar uma sequência didática alinhada à BNCC em minutos.",
      prompt: "Crie um plano da semana alinhado à BNCC para minhas turmas.",
      context: "Planejamento",
      actionLabel: "Criar plano",
    });
  }

  return out;
}

// ---------- Catálogo base por tela (fallback informativo) ----------
const BASE_BY_SCREEN: Record<string, SofiaSuggestion[]> = {
  home: [
    {
      id: "home-foco",
      priority: "info",
      tag: "Foco de hoje",
      title: "Vamos dar os próximos passos no AgilizaProf",
      description: "Cadastre sua primeira turma, adicione alunos e converse comigo.",
      prompt: "Me ajude a dar os próximos passos no AgilizaProf",
      context: "Foco de hoje · Página inicial",
      actionLabel: "Começar agora",
    },
  ],
  radar: [],
  inclusao: [
    {
      id: "inc-adapt",
      priority: "info",
      tag: "Adaptações",
      title: "Adaptar a aula de hoje para este aluno",
      description: "Geramos atividades alinhadas ao PEI e à BNCC.",
      prompt: "Adapte a aula de hoje para este aluno",
      context: "Inclusão · Adaptações",
      actionLabel: "Adaptar aula",
    },
    {
      id: "inc-parecer",
      priority: "info",
      tag: "Adaptações",
      title: "Parecer descritivo bimestral",
      description: "Linguagem humanizada e ancorada nos princípios da Sofia.",
      prompt: "Gere um parecer descritivo bimestral para este aluno",
      context: "Inclusão · Adaptações",
      actionLabel: "Gerar parecer",
    },
  ],
  cmdk: [
    { id: "cmdk-parecer", priority: "info", title: "Gerar parecer descritivo", prompt: "Gere um parecer descritivo", context: "Sugestões da IA · Command bar" },
    { id: "cmdk-adapt", priority: "info", title: "Adaptar atividade para aluno PCD", prompt: "Adapte uma atividade para um aluno PCD", context: "Sugestões da IA · Command bar" },
    { id: "cmdk-plano", priority: "info", title: "Criar plano de aula alinhado à BNCC", prompt: "Crie um plano de aula alinhado à BNCC", context: "Sugestões da IA · Command bar" },
  ],
  planejamento: [
    {
      id: "plan-bncc",
      priority: "info",
      tag: "Planejamento",
      title: "Plano de aula alinhado à BNCC",
      description: "Crie sequências didáticas em poucos minutos.",
      prompt: "Crie um plano de aula alinhado à BNCC",
      context: "Planejamento",
      actionLabel: "Criar plano",
    },
  ],
};

export function getBaseSuggestions(screen: string): SofiaSuggestion[] {
  return BASE_BY_SCREEN[screen] || [];
}

// ---------- Ordenação por prioridade ----------
const PRIORITY_ORDER: Record<NonNullable<SofiaSuggestion["priority"]>, number> = {
  urgent: 0,
  recommended: 1,
  info: 2,
};

export function sortByPriority(items: SofiaSuggestion[]): SofiaSuggestion[] {
  return [...items].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority || "info"];
    const pb = PRIORITY_ORDER[b.priority || "info"];
    return pa - pb;
  });
}

// ---------- Cache em memória (10 min, por professora+tela+entidade) ----------
type CacheEntry = { value: SofiaSuggestion[]; expiresAt: number };
const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 10 * 60 * 1000;

export function cacheKey(opts: { professoraId: string; screen: string; entityId?: string | null }) {
  return `${opts.professoraId}::${opts.screen}::${opts.entityId || "_"}`;
}

export function getCached(key: string): SofiaSuggestion[] | null {
  const hit = CACHE.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    CACHE.delete(key);
    return null;
  }
  return hit.value;
}

export function setCached(key: string, value: SofiaSuggestion[]) {
  CACHE.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

// ---------- Geração opcional de título empático via IA ----------
// Só chamada quando a regra produz sugestões e queremos refinar o tom.
// Hoje fica desativada por padrão para evitar custo; controlada por flag.
export async function maybePolishTitlesWithAI(
  items: SofiaSuggestion[],
  opts: { enabled: boolean }
): Promise<SofiaSuggestion[]> {
  if (!opts.enabled || items.length === 0) return items;
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return items;

  try {
    const titles = items.map((i, idx) => `${idx + 1}. ${i.title}`).join("\n");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Você é a Sofia, assistente de uma professora. Reescreva cada título mantendo o sentido, em tom acolhedor, curto (máx 80 caracteres), sem capacitismo. Responda apenas com a lista numerada.",
          },
          { role: "user", content: titles },
        ],
      }),
    });
    if (!res.ok) return items;
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content || "";
    const lines = content
      .split("\n")
      .map((l) => l.replace(/^\s*\d+[\.\)]\s*/, "").trim())
      .filter(Boolean);
    return items.map((i, idx) => (lines[idx] ? { ...i, title: lines[idx].slice(0, 120) } : i));
  } catch {
    return items;
  }
}