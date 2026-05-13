import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Sparkles, Save, Loader2, FileText, ChevronDown, ChevronUp, Plus, Trash2, RefreshCw, Bug, Eraser } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePersistentState } from "@/lib/persist/usePersistentState";

type Student = {
  id: string; name: string; turma?: string; anoEscolar?: string;
  diag?: string; cid?: string; aee?: string;
};

type PeiData = {
  perfil_aluno: { descricao: string; pontos_fortes: string[]; areas_suporte: string[] };
  objetivos_longo: Array<{ id: string; objetivo: string; criterio_avaliacao: string }>;
  objetivos_curto: Array<{ id: string; objetivo: string; indicador: string }>;
  estrategias: { comunicacao: string[]; organizacao: string[]; materiais: string[]; interacao: string[] };
  avaliacao: { como_avaliar: string; instrumentos: string[] };
  responsaveis: { lista: string[]; periodicidade_revisao: string };
};

type PeiRow = {
  id: string;
  aluno_client_id: string;
  aluno_nome: string;
  bimestre: string;
  versao: number;
  status: string;
  gerado_em: string;
  perfil_aluno: PeiData["perfil_aluno"];
  objetivos_longo: PeiData["objetivos_longo"];
  objetivos_curto: PeiData["objetivos_curto"];
  estrategias: PeiData["estrategias"];
  avaliacao: PeiData["avaliacao"];
  responsaveis: PeiData["responsaveis"];
};

const BIMESTRES = ["1º bimestre", "2º bimestre", "3º bimestre", "4º bimestre", "1º semestre", "2º semestre"];

const emptyPei: PeiData = {
  perfil_aluno: { descricao: "", pontos_fortes: [], areas_suporte: [] },
  objetivos_longo: [],
  objetivos_curto: [],
  estrategias: { comunicacao: [], organizacao: [], materiais: [], interacao: [] },
  avaliacao: { como_avaliar: "", instrumentos: [] },
  responsaveis: { lista: [], periodicidade_revisao: "Bimestral" },
};

export function PeiPdi() {
  const navigate = useNavigate();
  const [students] = usePersistentState<Student[]>("inc_students", []);

  const [alunoId, setAlunoId] = useState<string>("");
  const [bimestre, setBimestre] = useState<string>(BIMESTRES[0]);
  const [contexto, setContexto] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [pei, setPei] = useState<PeiData | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [versao, setVersao] = useState<number>(1);

  const [versions, setVersions] = useState<PeiRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  type DebugEntry = {
    ts: string;
    parte: "completo" | "a" | "b";
    stage: "request" | "raw" | "parsed" | "error";
    payload: unknown;
  };
  const [debugLog, setDebugLog] = useState<DebugEntry[]>([]);
  const [debugOpen, setDebugOpen] = useState<boolean>(true);
  const pushDebug = (e: Omit<DebugEntry, "ts">) =>
    setDebugLog((prev) => [...prev, { ...e, ts: new Date().toLocaleTimeString("pt-BR") }]);

  const aluno = useMemo(() => students.find((s) => s.id === alunoId) || null, [students, alunoId]);

  // Load list of saved PEIs
  const loadVersions = async () => {
    setLoadingList(true);
    const { data, error } = await supabase
      .from("pei_pdi")
      .select("id,aluno_client_id,aluno_nome,bimestre,versao,status,gerado_em,perfil_aluno,objetivos_longo,objetivos_curto,estrategias,avaliacao,responsaveis")
      .order("gerado_em", { ascending: false })
      .limit(50);
    setLoadingList(false);
    if (error) { toast.error("Falha ao carregar PEIs salvos"); return; }
    setVersions((data || []) as unknown as PeiRow[]);
  };

  useEffect(() => { loadVersions(); }, []);

  const gerarPei = async () => {
    if (!aluno) { toast.error("Selecione um aluno PCD"); return; }
    setGenerating(true);
    setDebugLog([]);

    const basePayload = {
      aluno: aluno.name,
      ano_escolar: aluno.anoEscolar || "",
      turma: aluno.turma || "",
      tipo_necessidade: aluno.diag || "",
      laudo: aluno.cid ? `CID: ${aluno.cid}` : "",
      bimestre,
      contexto_adicional: contexto,
      registros: [] as unknown[],
      adaptacoes: [] as string[],
    };

    type ParteA = Pick<PeiData, "perfil_aluno" | "objetivos_longo" | "objetivos_curto">;
    type ParteB = Pick<PeiData, "estrategias" | "avaliacao" | "responsaveis">;

    const callPei = async (parte: "completo" | "a" | "b") => {
      const payload = { ...basePayload, parte };
      console.log(`[PEI] → request (parte=${parte})`, payload);
      pushDebug({ parte, stage: "request", payload });
      const { data, error } = await supabase.functions.invoke("gerar-pei", { body: payload });
      console.log(`[PEI] ← raw response (parte=${parte})`, { data, error });
      pushDebug({ parte, stage: "raw", payload: { data, error: error ? { message: error.message, name: error.name } : null } });
      if (error) {
        pushDebug({ parte, stage: "error", payload: error.message || error.name });
        throw new Error(`Sofia falhou (parte=${parte}): ${error.message || error.name}`);
      }
      const peiResp = (data as { pei?: Record<string, unknown> })?.pei;
      console.log(`[PEI] ← parsed pei (parte=${parte})`, peiResp);
      pushDebug({ parte, stage: "parsed", payload: peiResp ?? null });
      if (!peiResp || typeof peiResp !== "object") {
        throw new Error(`Resposta vazia da Sofia (parte=${parte}). Conteúdo: ${JSON.stringify(data).slice(0, 200)}`);
      }
      return peiResp;
    };

    const explicarFaltantes = (obj: Record<string, unknown>, esperados: string[]) => {
      const presentes = esperados.filter((k) => obj[k] != null);
      const faltando = esperados.filter((k) => obj[k] == null);
      return `Recebido: [${presentes.join(", ") || "nada"}]. Faltando: [${faltando.join(", ") || "nenhum"}].`;
    };

    const isTokenOverflow = (msg: string) =>
      /token|max_tokens|too long|context length|truncat/i.test(msg);

    try {
      // 1) Tenta gerar tudo de uma vez.
      const peiResp = (await callPei("completo")) as Partial<PeiData> & Record<string, unknown>;

      let merged: PeiData;
      if (!peiResp.perfil_aluno) {
        // 2) Cenário 3: resposta sem perfil_aluno → split em 2 chamadas.
        const motivo = explicarFaltantes(peiResp, [
          "perfil_aluno", "objetivos_longo", "objetivos_curto",
          "estrategias", "avaliacao", "responsaveis",
        ]);
        console.warn("[PEI] resposta inválida — dividindo em 2 chamadas. " + motivo);
        toast.warning("Sofia devolveu resposta incompleta — gerando em 2 partes…");

        const [a, b] = await Promise.all([
          callPei("a") as Promise<ParteA>,
          callPei("b") as Promise<ParteB>,
        ]);

        if (!a.perfil_aluno) {
          throw new Error(
            `Falha na parte A do PEI (perfil/objetivos). ${explicarFaltantes(
              a as unknown as Record<string, unknown>,
              ["perfil_aluno", "objetivos_longo", "objetivos_curto"],
            )}`,
          );
        }
        if (!b.estrategias) {
          throw new Error(
            `Falha na parte B do PEI (estratégias/avaliação). ${explicarFaltantes(
              b as unknown as Record<string, unknown>,
              ["estrategias", "avaliacao", "responsaveis"],
            )}`,
          );
        }
        merged = { ...a, ...b };
      } else {
        merged = peiResp as PeiData;
      }

      setPei({
        perfil_aluno: { ...emptyPei.perfil_aluno, ...merged.perfil_aluno },
        objetivos_longo: merged.objetivos_longo || [],
        objetivos_curto: merged.objetivos_curto || [],
        estrategias: { ...emptyPei.estrategias, ...merged.estrategias },
        avaliacao: { ...emptyPei.avaliacao, ...merged.avaliacao },
        responsaveis: { ...emptyPei.responsaveis, ...merged.responsaveis },
      });
      setCurrentId(null);
      const next = versions
        .filter((v) => v.aluno_client_id === aluno.id && v.bimestre === bimestre)
        .reduce((m, v) => Math.max(m, v.versao), 0) + 1;
      setVersao(next);
      toast.success("PEI gerado pela Sofia");
    } catch (e) {
      const msg = (e as Error).message || "Falha ao gerar PEI";
      console.error("[PEI] erro final:", e);

      // Última tentativa: se foi estouro de tokens, divide em 2 e tenta de novo.
      if (isTokenOverflow(msg)) {
        try {
          toast.warning("Resposta longa demais — tentando em 2 partes…");
          const [a, b] = await Promise.all([
            callPei("a") as Promise<ParteA>,
            callPei("b") as Promise<ParteB>,
          ]);
          if (!a.perfil_aluno || !b.estrategias) {
            throw new Error("Sofia ainda devolveu partes incompletas após o split.");
          }
          const merged: PeiData = { ...a, ...b };
          setPei({
            perfil_aluno: { ...emptyPei.perfil_aluno, ...merged.perfil_aluno },
            objetivos_longo: merged.objetivos_longo || [],
            objetivos_curto: merged.objetivos_curto || [],
            estrategias: { ...emptyPei.estrategias, ...merged.estrategias },
            avaliacao: { ...emptyPei.avaliacao, ...merged.avaliacao },
            responsaveis: { ...emptyPei.responsaveis, ...merged.responsaveis },
          });
          setCurrentId(null);
          toast.success("PEI gerado pela Sofia (em 2 partes)");
          return;
        } catch (e2) {
          console.error("[PEI] split também falhou:", e2);
          toast.error(`Falha ao gerar PEI em 2 partes: ${(e2 as Error).message}`);
          return;
        }
      }

      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const salvar = async () => {
    if (!pei || !aluno) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Faça login para salvar"); setSaving(false); return; }
    const payload = {
      user_id: u.user.id,
      aluno_client_id: aluno.id,
      aluno_nome: aluno.name,
      bimestre,
      versao,
      status: "ativo",
      perfil_aluno: pei.perfil_aluno,
      objetivos_longo: pei.objetivos_longo,
      objetivos_curto: pei.objetivos_curto,
      estrategias: pei.estrategias,
      avaliacao: pei.avaliacao,
      responsaveis: pei.responsaveis,
      contexto_adicional: contexto || null,
      modelo: "claude-haiku-4-5-20251001",
    };
    const { data, error } = currentId
      ? await supabase.from("pei_pdi").update(payload).eq("id", currentId).select("id").single()
      : await supabase.from("pei_pdi").insert([payload]).select("id").single();
    setSaving(false);
    if (error) { toast.error("Falha ao salvar: " + error.message); return; }
    if (data?.id) setCurrentId(data.id);
    toast.success("PEI salvo");
    loadVersions();
  };

  const abrirVersao = (row: PeiRow) => {
    setAlunoId(row.aluno_client_id);
    setBimestre(row.bimestre);
    setVersao(row.versao);
    setCurrentId(row.id);
    setPei({
      perfil_aluno: { ...emptyPei.perfil_aluno, ...row.perfil_aluno },
      objetivos_longo: row.objetivos_longo || [],
      objetivos_curto: row.objetivos_curto || [],
      estrategias: { ...emptyPei.estrategias, ...row.estrategias },
      avaliacao: { ...emptyPei.avaliacao, ...row.avaliacao },
      responsaveis: { ...emptyPei.responsaveis, ...row.responsaveis },
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const apagarVersao = async (id: string) => {
    if (!confirm("Apagar esta versão do PEI?")) return;
    const { error } = await supabase.from("pei_pdi").delete().eq("id", id);
    if (error) { toast.error("Falha ao apagar"); return; }
    if (currentId === id) { setPei(null); setCurrentId(null); }
    toast.success("Versão apagada");
    loadVersions();
  };

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <header className="sticky top-0 z-10 border-b bg-card px-6 py-3 flex items-center gap-3">
        <button onClick={() => navigate({ to: "/inclusao" })} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Inclusão
        </button>
        <span className="text-sm font-semibold">PEI / PDI</span>
        <span className="ml-auto inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Claude Haiku
        </span>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <section className="bg-card border rounded-2xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 grid place-items-center text-lg">♿</div>
            <div>
              <h1 className="text-xl font-bold">Plano Educacional Individualizado</h1>
              <p className="text-sm text-muted-foreground">Sofia gera o PEI completo a partir dos dados cadastrados do aluno PCD. 6 seções editáveis. Versionado.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm">
              <span className="block font-semibold mb-1">Aluno PCD</span>
              <select value={alunoId} onChange={(e) => setAlunoId(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-background">
                <option value="">Selecione…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} {s.turma ? `· ${s.turma}` : ""}</option>
                ))}
              </select>
              {students.length === 0 && (
                <span className="block text-xs text-muted-foreground mt-1">Nenhum aluno PCD cadastrado em Inclusão.</span>
              )}
            </label>
            <label className="text-sm">
              <span className="block font-semibold mb-1">Bimestre / Semestre</span>
              <select value={bimestre} onChange={(e) => setBimestre(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-background">
                {BIMESTRES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            {aluno && (
              <div className="md:col-span-2 flex flex-wrap gap-2 text-xs">
                {aluno.diag && <span className="px-2 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">{aluno.diag}</span>}
                {aluno.anoEscolar && <span className="px-2 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200">{aluno.anoEscolar}</span>}
                {aluno.cid ? (
                  <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Laudo: {aluno.cid}</span>
                ) : (
                  <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Sem laudo · Sofia usa o tipo cadastrado</span>
                )}
              </div>
            )}
            <label className="md:col-span-2 text-sm">
              <span className="block font-semibold mb-1">Contexto adicional (opcional)</span>
              <textarea value={contexto} onChange={(e) => setContexto(e.target.value)} rows={3} placeholder="Acompanhamento externo, informações da família, etc." className="w-full border rounded-lg px-3 py-2 bg-background resize-y" />
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={gerarPei} disabled={!aluno || generating} className="inline-flex items-center gap-2 bg-rose-600 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-rose-700">
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generating ? "Sofia está escrevendo…" : (pei ? "Regenerar PEI" : "Sofia gera o PEI")}
            </button>
          </div>
        </section>

        {pei && aluno && (
          <PeiPanel
            aluno={aluno.name}
            bimestre={bimestre}
            versao={versao}
            currentId={currentId}
            pei={pei}
            onChange={setPei}
            onSave={salvar}
            saving={saving}
          />
        )}

        <section className="bg-card border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><FileText size={16} /> PEIs salvos</h2>
            <button onClick={loadVersions} className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <RefreshCw size={12} /> Atualizar
            </button>
          </div>
          {loadingList ? (
            <div className="text-sm text-muted-foreground">Carregando…</div>
          ) : versions.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum PEI salvo ainda.</div>
          ) : (
            <ul className="divide-y">
              {versions.map((v) => (
                <li key={v.id} className="py-3 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{v.aluno_nome}</div>
                    <div className="text-xs text-muted-foreground">{v.bimestre} · v{v.versao} · {new Date(v.gerado_em).toLocaleDateString("pt-BR")}</div>
                  </div>
                  <button onClick={() => abrirVersao(v)} className="text-xs px-3 py-1.5 rounded-lg border hover:bg-accent">Abrir</button>
                  <button onClick={() => apagarVersao(v.id)} className="text-xs p-1.5 rounded-lg border text-rose-600 hover:bg-rose-50" title="Apagar"><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="text-center pt-4">
          <Link to="/inclusao" className="text-xs text-muted-foreground hover:text-foreground">← Voltar para Inclusão</Link>
        </div>
      </main>
    </div>
  );
}

function PeiPanel(props: {
  aluno: string; bimestre: string; versao: number; currentId: string | null;
  pei: PeiData; onChange: (p: PeiData) => void;
  onSave: () => void; saving: boolean;
}) {
  const { pei, onChange, onSave, saving } = props;
  const update = (patch: Partial<PeiData>) => onChange({ ...pei, ...patch });

  return (
    <section className="bg-card border rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-sm font-semibold">{props.aluno}</div>
          <div className="text-xs text-muted-foreground">{props.bimestre} · Versão {props.versao} {props.currentId ? "· salvo" : "· não salvo"}</div>
        </div>
        <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-2 bg-emerald-600 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-emerald-700 text-sm">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Salvar PEI
        </button>
      </div>

      <Section title="1. Perfil do aluno" icon="🧭">
        <Field label="Descrição do perfil de aprendizagem">
          <textarea value={pei.perfil_aluno.descricao} onChange={(e) => update({ perfil_aluno: { ...pei.perfil_aluno, descricao: e.target.value } })} rows={3} className="w-full border rounded-lg px-3 py-2 bg-background resize-y" />
        </Field>
        <ListField label="Pontos fortes" items={pei.perfil_aluno.pontos_fortes} onChange={(v) => update({ perfil_aluno: { ...pei.perfil_aluno, pontos_fortes: v } })} />
        <ListField label="Áreas que precisam de suporte" items={pei.perfil_aluno.areas_suporte} onChange={(v) => update({ perfil_aluno: { ...pei.perfil_aluno, areas_suporte: v } })} />
      </Section>

      <Section title="2. Objetivos de longo prazo (semestre)" icon="🎯">
        <ObjectivesList
          items={pei.objetivos_longo}
          fields={[{ key: "objetivo", label: "Objetivo" }, { key: "criterio_avaliacao", label: "Critério de avaliação" }]}
          onChange={(v) => update({ objetivos_longo: v })}
          prefix="long"
        />
      </Section>

      <Section title="3. Objetivos de curto prazo (bimestre)" icon="📌">
        <ObjectivesList
          items={pei.objetivos_curto}
          fields={[{ key: "objetivo", label: "Objetivo" }, { key: "indicador", label: "Indicador de progresso" }]}
          onChange={(v) => update({ objetivos_curto: v })}
          prefix="curt"
        />
      </Section>

      <Section title="4. Estratégias por dimensão" icon="📐">
        <ListField label="Comunicação e linguagem" items={pei.estrategias.comunicacao} onChange={(v) => update({ estrategias: { ...pei.estrategias, comunicacao: v } })} />
        <ListField label="Organização e tempo" items={pei.estrategias.organizacao} onChange={(v) => update({ estrategias: { ...pei.estrategias, organizacao: v } })} />
        <ListField label="Materiais e espaço físico" items={pei.estrategias.materiais} onChange={(v) => update({ estrategias: { ...pei.estrategias, materiais: v } })} />
        <ListField label="Interação social e participação" items={pei.estrategias.interacao} onChange={(v) => update({ estrategias: { ...pei.estrategias, interacao: v } })} />
      </Section>

      <Section title="5. Critérios de avaliação adaptados" icon="📝">
        <Field label="Como avaliar este aluno">
          <textarea value={pei.avaliacao.como_avaliar} onChange={(e) => update({ avaliacao: { ...pei.avaliacao, como_avaliar: e.target.value } })} rows={3} className="w-full border rounded-lg px-3 py-2 bg-background resize-y" />
        </Field>
        <ListField label="Instrumentos recomendados" items={pei.avaliacao.instrumentos} onChange={(v) => update({ avaliacao: { ...pei.avaliacao, instrumentos: v } })} />
      </Section>

      <Section title="6. Responsáveis e periodicidade" icon="👥">
        <ListField label="Responsáveis" items={pei.responsaveis.lista} onChange={(v) => update({ responsaveis: { ...pei.responsaveis, lista: v } })} />
        <Field label="Periodicidade de revisão">
          <input value={pei.responsaveis.periodicidade_revisao} onChange={(e) => update({ responsaveis: { ...pei.responsaveis, periodicidade_revisao: e.target.value } })} className="w-full border rounded-lg px-3 py-2 bg-background" />
        </Field>
      </Section>
    </section>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-t">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 px-6 py-3 text-left hover:bg-accent/30">
        <span className="text-base">{icon}</span>
        <span className="font-semibold text-sm flex-1">{title}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && <div className="px-6 pb-5 space-y-3">{children}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground mb-1">{label}</div>
      {children}
    </div>
  );
}

function ListField({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  return (
    <Field label={label}>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <textarea
              value={it}
              onChange={(e) => { const next = items.slice(); next[i] = e.target.value; onChange(next); }}
              rows={1}
              className="flex-1 border rounded-lg px-3 py-2 bg-background resize-y text-sm"
            />
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg" title="Remover"><Trash2 size={14} /></button>
          </div>
        ))}
        <button onClick={() => onChange([...items, ""])} className="inline-flex items-center gap-1 text-xs text-rose-600 hover:underline">
          <Plus size={12} /> Adicionar
        </button>
      </div>
    </Field>
  );
}

function ObjectivesList<T extends { id: string } & Record<string, string>>(props: {
  items: T[];
  fields: Array<{ key: keyof T & string; label: string }>;
  onChange: (v: T[]) => void;
  prefix: string;
}) {
  const { items, fields, onChange, prefix } = props;
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={it.id || i} className="border rounded-lg p-3 space-y-2 bg-background">
          {fields.map((f) => (
            <div key={f.key}>
              <div className="text-xs font-semibold text-muted-foreground mb-1">{f.label}</div>
              <textarea
                value={(it[f.key] as string) || ""}
                onChange={(e) => {
                  const next = items.slice();
                  next[i] = { ...next[i], [f.key]: e.target.value };
                  onChange(next);
                }}
                rows={2}
                className="w-full border rounded-lg px-3 py-2 bg-card resize-y text-sm"
              />
            </div>
          ))}
          <div className="flex justify-end">
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-xs text-rose-600 hover:underline inline-flex items-center gap-1"><Trash2 size={12} /> Remover</button>
          </div>
        </div>
      ))}
      <button
        onClick={() => {
          const blank = { id: `${prefix}-${Date.now()}` } as Record<string, string>;
          fields.forEach((f) => { blank[f.key] = ""; });
          onChange([...items, blank as T]);
        }}
        className="inline-flex items-center gap-1 text-xs text-rose-600 hover:underline"
      >
        <Plus size={12} /> Adicionar objetivo
      </button>
    </div>
  );
}