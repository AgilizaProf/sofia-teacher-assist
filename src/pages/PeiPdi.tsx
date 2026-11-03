import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PainelNav, painelTokensCss } from "@/components/painel/PainelNav";
import { TempoChip, tempoChipCss } from "@/components/painel/TempoChip";
import { ArrowLeft, Sparkles, Save, Loader2, FileText, ChevronDown, ChevronUp, Plus, Trash2, RefreshCw, Bug, Eraser } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePersistentState } from "@/lib/persist/usePersistentState";
import { consumirCreditos, descricaoDoc } from "@/lib/creditos/consume";
import { acumularTempo } from "@/lib/tempo/acumular";
import { CUSTOS } from "@/lib/creditos/policy";
import { useCreditosGate } from "@/lib/creditos/CreditosGate";

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
  // Heavy JSONB fields are fetched on demand in `abrirVersao` para evitar
  // baixar todos os PEIs com todo o conteúdo só para listá-los.
  perfil_aluno?: PeiData["perfil_aluno"];
  objetivos_longo?: PeiData["objetivos_longo"];
  objetivos_curto?: PeiData["objetivos_curto"];
  estrategias?: PeiData["estrategias"];
  avaliacao?: PeiData["avaliacao"];
  responsaveis?: PeiData["responsaveis"];
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
  const [students] = usePersistentState<Student[]>("inc_students", []);
  const [regByStudent] = usePersistentState<Record<string, Array<{ when?: string; cat?: string; body?: string }>>>("inc_reg", {});
  const [anamByStudent] = usePersistentState<Record<string, unknown[]>>("inc_anam", {});
  const [anamObsGeralByStudent] = usePersistentState<Record<string, string>>("inc_anam_obs_geral", {});
  const [peiByStudent] = usePersistentState<Record<string, Record<string, unknown>>>("inc_pei", {});

  const [alunoId, setAlunoId] = useState<string>("");
  const [bimestre, setBimestre] = useState<string>(BIMESTRES[0]);
  const [contexto, setContexto] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const creditosGate = useCreditosGate();

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
      // Lista: apenas campos exibidos nos cards (sem JSONB pesado).
      .select("id,aluno_client_id,aluno_nome,bimestre,versao,status,gerado_em")
      .order("gerado_em", { ascending: false })
      .limit(50);
    setLoadingList(false);
    if (error) { toast.error("Falha ao carregar PEIs salvos"); return; }
    setVersions((data || []) as unknown as PeiRow[]);
  };

  useEffect(() => { loadVersions(); }, []);

  const gerarPei = async () => {
    if (!aluno) { toast.error("Selecione um aluno PCD"); return; }
    const okGate = await creditosGate.checar({ custo: CUSTOS.pei_completo, acao: "PEI completo" });
    if (!okGate) return;
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
      registros: (regByStudent[aluno.id] || []).slice(0, 60).map((r) => ({
        when: r.when, cat: r.cat, body: r.body,
      })),
      anamneseResumo: (() => {
        const data = anamByStudent[aluno.id] as Array<{ l?: string; obs?: string; items?: Array<{ d?: string; s?: string }> }> | undefined;
        const obsGeral = (anamObsGeralByStudent[aluno.id] || "").trim();
        if (!data && !obsGeral) return "";
        const eixosTxt = (data || []).map((e) => {
          const itens = (e.items || []).filter((i) => i.s !== "naoObservado").map((i) => i.d).join("; ");
          const obs = (e.obs || "").trim();
          if (!itens && !obs) return "";
          return `${e.l}: ${itens}${obs ? ` — ${obs}` : ""}`;
        }).filter(Boolean).join("\n");
        return [eixosTxt, obsGeral ? `Observações gerais: ${obsGeral}` : ""].filter(Boolean).join("\n\n");
      })(),
      peiAnterior: (() => {
        const pei = peiByStudent[aluno.id] || {};
        const linhas = Object.entries(pei)
          .filter(([, v]) => typeof v === "string" && (v as string).trim())
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n");
        return linhas || "";
      })(),
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
      void consumirCreditos(CUSTOS.pei_completo, descricaoDoc("PEI completo", aluno?.name));
      void acumularTempo("pei_aluno", `PEI — ${aluno?.name ?? "aluno"}`);
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
          void consumirCreditos(CUSTOS.pei_completo, descricaoDoc("PEI completo", aluno?.name));
          void acumularTempo("pei_aluno", `PEI — ${aluno?.name ?? "aluno"}`);
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
      modelo: "google/gemini-2.5-flash",
    };
    const { data, error } = currentId
      ? await supabase.from("pei_pdi").update(payload).eq("id", currentId).select("id").single()
      : await supabase.from("pei_pdi").insert([payload]).select("id").single();
    setSaving(false);
    if (error) { toast.error("Falha ao salvar: " + error.message); return; }
    if (data?.id) setCurrentId(data.id);
    toast.success("PEI salvo");
    void import("@/lib/admin/track").then(({ trackEvent }) => trackEvent(currentId ? "pei_atualizado" : "pei_criado", { aluno_nome: aluno?.name ?? null, bimestre }));
    loadVersions();
  };

  const abrirVersao = async (row: PeiRow) => {
    setAlunoId(row.aluno_client_id);
    setBimestre(row.bimestre);
    setVersao(row.versao);
    setCurrentId(row.id);
    // Busca sob demanda apenas o conteúdo JSONB desta versão específica.
    const { data: full, error } = await supabase
      .from("pei_pdi")
      .select("perfil_aluno,objetivos_longo,objetivos_curto,estrategias,avaliacao,responsaveis")
      .eq("id", row.id)
      .single();
    if (error || !full) { toast.error("Falha ao abrir PEI"); return; }
    setPei({
      perfil_aluno: { ...emptyPei.perfil_aluno, ...(full.perfil_aluno as PeiData["perfil_aluno"]) },
      objetivos_longo: (full.objetivos_longo as PeiData["objetivos_longo"]) || [],
      objetivos_curto: (full.objetivos_curto as PeiData["objetivos_curto"]) || [],
      estrategias: { ...emptyPei.estrategias, ...(full.estrategias as PeiData["estrategias"]) },
      avaliacao: { ...emptyPei.avaliacao, ...(full.avaliacao as PeiData["avaliacao"]) },
      responsaveis: { ...emptyPei.responsaveis, ...(full.responsaveis as PeiData["responsaveis"]) },
    });
  };

  const apagarVersao = async (id: string) => {
    if (!confirm("Apagar esta versão do PEI?")) return;
    const { error } = await supabase.from("pei_pdi").delete().eq("id", id);
    if (error) { toast.error("Falha ao apagar"); return; }
    if (currentId === id) { setPei(null); setCurrentId(null); }
    toast.success("Versão apagada");
    loadVersions();
  };

  const mostrarDebug = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug");

  return (
    <div className="pn pei-root">
      <style>{painelTokensCss + tempoChipCss + peiCss}</style>
      <PainelNav />
      <main className="pei-main">
        <div className="pn-strip"><TempoChip /></div>
        <Link to="/inclusao" className="pei-voltar"><ArrowLeft size={16} /> Inclusão</Link>
        <h1 className="pei-title">PEI / PDI</h1>
        <p className="pei-sub">A Sofia escreve o plano individual do aluno com o que você já registrou. Você revisa, ajusta e salva.</p>

        <section className="pei-card">
          <h2 className="pei-h2"><span className="pei-num">1</span> Para quem é o plano?</h2>
          {students.length === 0 ? (
            <div className="pei-vazio">
              <p>Você ainda não cadastrou alunos em Inclusão.</p>
              <Link to="/inclusao" className="pn-btn primary">Cadastrar aluno</Link>
            </div>
          ) : (
            <>
              <div className="pei-alunos" role="radiogroup" aria-label="Aluno">
                {students.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={alunoId === s.id}
                    className={"pei-aluno" + (alunoId === s.id ? " on" : "")}
                    onClick={() => setAlunoId(s.id)}
                  >
                    <span className="av" aria-hidden>{s.name.trim().charAt(0).toUpperCase()}</span>
                    <span className="tx"><b>{s.name}</b>{(s.turma || s.diag) && <small>{[s.turma, s.diag].filter(Boolean).join(" · ")}</small>}</span>
                  </button>
                ))}
              </div>

              <div className="pei-linha">
                <label className="pei-campo">
                  <span>Período</span>
                  <select value={bimestre} onChange={(e) => setBimestre(e.target.value)}>
                    {BIMESTRES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </label>
                {aluno && (
                  <div className="pei-tags">
                    {aluno.anoEscolar && <span className="pei-tag">{aluno.anoEscolar}</span>}
                    {aluno.cid ? <span className="pei-tag ok">Laudo: {aluno.cid}</span> : <span className="pei-tag aviso">Sem laudo</span>}
                  </div>
                )}
              </div>

              <details className="pei-mais">
                <summary>Quer contar algo a mais para a Sofia? (opcional)</summary>
                <textarea value={contexto} onChange={(e) => setContexto(e.target.value)} rows={3} placeholder="Ex.: faz terapia ocupacional, a família relatou avanços na leitura…" />
              </details>

              <button type="button" onClick={gerarPei} disabled={!aluno || generating} className="pn-btn primary pei-gerar">
                {generating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {generating ? "A Sofia está escrevendo…" : !aluno ? "Escolha um aluno acima" : pei ? "Escrever de novo" : "Sofia escreve o PEI"}
              </button>
            </>
          )}
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

        <section className="pei-card">
          <div className="pei-cab">
            <h2 className="pei-h2"><FileText size={18} /> PEIs salvos</h2>
            <button type="button" onClick={loadVersions} className="pei-link"><RefreshCw size={14} /> Atualizar</button>
          </div>
          {loadingList ? (
            <p className="pei-muted">Carregando…</p>
          ) : versions.length === 0 ? (
            <p className="pei-muted">Nenhum PEI salvo ainda. Os que você salvar aparecem aqui.</p>
          ) : (
            <ul className="pei-salvos">
              {versions.map((v) => (
                <li key={v.id} className={currentId === v.id ? "on" : ""}>
                  <div className="tx">
                    <b>{v.aluno_nome}</b>
                    <small>{v.bimestre} · versão {v.versao} · {new Date(v.gerado_em).toLocaleDateString("pt-BR")}</small>
                  </div>
                  <button type="button" onClick={() => abrirVersao(v)} className="pn-btn pei-abrir">Abrir</button>
                  <button type="button" onClick={() => apagarVersao(v.id)} className="pei-apagar" title="Apagar" aria-label={`Apagar PEI de ${v.aluno_nome}`}><Trash2 size={16} /></button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {mostrarDebug && (
          <section className="pei-card pei-debug">
            <div className="pei-cab">
              <h2 className="pei-h2"><Bug size={16} /> Debug Sofia · PEI ({debugLog.length})</h2>
              <span>
                <button type="button" className="pei-link" onClick={() => setDebugLog([])}><Eraser size={14} /> Limpar</button>
                <button type="button" className="pei-link" onClick={() => setDebugOpen((v) => !v)}>{debugOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
              </span>
            </div>
            {debugOpen && debugLog.map((e, i) => (
              <div key={i} className="pei-debug-item">
                <small>{e.ts} · {e.stage} · parte={e.parte}</small>
                <pre>{(() => { try { return JSON.stringify(e.payload, null, 2); } catch { return String(e.payload); } })()}</pre>
              </div>
            ))}
          </section>
        )}
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
  const ref = useRef<HTMLElement>(null);
  // Assim que o PEI aparece, leva a pessoa direto até ele.
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    ref.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, []);

  const botaoSalvar = (
    <button type="button" onClick={onSave} disabled={saving} className="pn-btn primary">
      {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
      {props.currentId ? "Salvar alterações" : "Salvar PEI"}
    </button>
  );

  return (
    <section className="pei-card pei-plano" ref={ref}>
      <div className="pei-cab">
        <div>
          <h2 className="pei-h2"><span className="pei-num">2</span> Revise o plano de {props.aluno.split(" ")[0]}</h2>
          <p className="pei-muted">
            {props.bimestre} · versão {props.versao} ·{" "}
            <span className={"pei-status" + (props.currentId ? " ok" : "")}>{props.currentId ? "salvo" : "ainda não salvo"}</span>
          </p>
        </div>
        {botaoSalvar}
      </div>
      <p className="pei-dica">Toque em qualquer texto para mudar. Tudo que a Sofia escreveu é só um ponto de partida.</p>

      <Section title="Quem é o aluno" icon="🧭" cor="green" aberto>
        <Field label="Como ele(a) aprende">
          <textarea value={pei.perfil_aluno.descricao} onChange={(e) => update({ perfil_aluno: { ...pei.perfil_aluno, descricao: e.target.value } })} rows={3} />
        </Field>
        <ListField label="Pontos fortes" items={pei.perfil_aluno.pontos_fortes} onChange={(v) => update({ perfil_aluno: { ...pei.perfil_aluno, pontos_fortes: v } })} />
        <ListField label="Onde precisa de apoio" items={pei.perfil_aluno.areas_suporte} onChange={(v) => update({ perfil_aluno: { ...pei.perfil_aluno, areas_suporte: v } })} />
      </Section>

      <Section title="Metas do semestre" icon="🎯" cor="sun" qtd={pei.objetivos_longo.length}>
        <ObjectivesList
          items={pei.objetivos_longo}
          fields={[{ key: "objetivo", label: "Meta" }, { key: "criterio_avaliacao", label: "Como saber que conseguiu" }]}
          onChange={(v) => update({ objetivos_longo: v })}
          prefix="long"
        />
      </Section>

      <Section title="Metas do bimestre" icon="📌" cor="coral" qtd={pei.objetivos_curto.length}>
        <ObjectivesList
          items={pei.objetivos_curto}
          fields={[{ key: "objetivo", label: "Meta" }, { key: "indicador", label: "Sinal de avanço" }]}
          onChange={(v) => update({ objetivos_curto: v })}
          prefix="curt"
        />
      </Section>

      <Section title="Como ajudar na sala" icon="🤝" cor="sky">
        <ListField label="Comunicação" items={pei.estrategias.comunicacao} onChange={(v) => update({ estrategias: { ...pei.estrategias, comunicacao: v } })} />
        <ListField label="Rotina e tempo" items={pei.estrategias.organizacao} onChange={(v) => update({ estrategias: { ...pei.estrategias, organizacao: v } })} />
        <ListField label="Materiais e espaço" items={pei.estrategias.materiais} onChange={(v) => update({ estrategias: { ...pei.estrategias, materiais: v } })} />
        <ListField label="Convivência e participação" items={pei.estrategias.interacao} onChange={(v) => update({ estrategias: { ...pei.estrategias, interacao: v } })} />
      </Section>

      <Section title="Como avaliar" icon="📝" cor="lilac">
        <Field label="Jeito de avaliar">
          <textarea value={pei.avaliacao.como_avaliar} onChange={(e) => update({ avaliacao: { ...pei.avaliacao, como_avaliar: e.target.value } })} rows={3} />
        </Field>
        <ListField label="Instrumentos" items={pei.avaliacao.instrumentos} onChange={(v) => update({ avaliacao: { ...pei.avaliacao, instrumentos: v } })} />
      </Section>

      <Section title="Quem acompanha" icon="👥" cor="cream">
        <ListField label="Pessoas envolvidas" items={pei.responsaveis.lista} onChange={(v) => update({ responsaveis: { ...pei.responsaveis, lista: v } })} />
        <Field label="Revisar o plano a cada">
          <input value={pei.responsaveis.periodicidade_revisao} onChange={(e) => update({ responsaveis: { ...pei.responsaveis, periodicidade_revisao: e.target.value } })} />
        </Field>
      </Section>

      <div className="pei-rodape">{botaoSalvar}</div>
    </section>
  );
}

function Section({ title, icon, cor, qtd, aberto, children }: { title: string; icon: string; cor: string; qtd?: number; aberto?: boolean; children: React.ReactNode }) {
  return (
    <details className="pei-sec" open={aberto}>
      <summary>
        <span className={"ic " + cor} aria-hidden>{icon}</span>
        <b>{title}</b>
        {qtd != null && <span className="qtd">{qtd}</span>}
        <ChevronDown size={18} className="seta" aria-hidden />
      </summary>
      <div className="pei-sec-corpo">{children}</div>
    </details>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pei-field">
      <div className="lb">{label}</div>
      {children}
    </div>
  );
}

function ListField({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  return (
    <Field label={label}>
      <div className="pei-lista">
        {items.map((it, i) => (
          <div key={i} className="pei-item">
            <textarea
              value={it}
              onChange={(e) => { const next = items.slice(); next[i] = e.target.value; onChange(next); }}
              rows={1}
            />
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="pei-apagar" title="Remover" aria-label="Remover"><Trash2 size={16} /></button>
          </div>
        ))}
        <button type="button" onClick={() => onChange([...items, ""])} className="pei-link">
          <Plus size={14} /> Adicionar
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
    <div className="pei-lista">
      {items.map((it, i) => (
        <div key={it.id || i} className="pei-meta">
          <span className="n">{i + 1}</span>
          <div className="campos">
            {fields.map((f) => (
              <div key={f.key} className="pei-field">
                <div className="lb">{f.label}</div>
                <textarea
                  value={(it[f.key] as string) || ""}
                  onChange={(e) => {
                    const next = items.slice();
                    next[i] = { ...next[i], [f.key]: e.target.value };
                    onChange(next);
                  }}
                  rows={2}
                />
              </div>
            ))}
          </div>
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="pei-apagar" title="Remover meta" aria-label="Remover meta"><Trash2 size={16} /></button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          const blank = { id: `${prefix}-${Date.now()}` } as Record<string, string>;
          fields.forEach((f) => { blank[f.key] = ""; });
          onChange([...items, blank as T]);
        }}
        className="pei-link"
      >
        <Plus size={14} /> Adicionar meta
      </button>
    </div>
  );
}

const peiCss = `
.pei-root{min-height:100vh;background:var(--pn-bg);font-family:var(--pn-body);color:var(--pn-ink);}
.pei-main{max-width:880px;margin:0 auto;padding:22px 24px 120px;display:flex;flex-direction:column;gap:18px;}
.pei-voltar{display:inline-flex;align-items:center;gap:6px;color:var(--pn-muted);font-weight:600;font-size:14px;text-decoration:none;margin-top:-6px;}
.pei-voltar:hover{color:var(--pn-ink);}
.pei-title{font-family:var(--pn-display);font-weight:800;font-size:34px;letter-spacing:-.045em;line-height:1.1;margin:-8px 0 0;}
.pei-sub{margin:-10px 0 0;color:var(--pn-muted);font-size:15px;max-width:60ch;}
.pei-card{background:var(--pn-surface);border:2px solid var(--pn-ink);border-radius:20px;box-shadow:4px 4px 0 var(--pn-ink);padding:20px;scroll-margin-top:80px;}
.pei-h2{display:flex;align-items:center;gap:10px;font-family:var(--pn-display);font-weight:700;font-size:19px;letter-spacing:-.02em;margin:0;}
.pei-num{flex:none;width:30px;height:30px;border-radius:50%;background:var(--pn-sun);border:2px solid var(--pn-ink);display:grid;place-items:center;font-size:15px;font-weight:800;}
.pei-cab{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.pei-muted{color:var(--pn-muted);font-size:14px;margin:6px 0 0;}
.pei-vazio{margin-top:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;color:var(--pn-muted);}
.pei-vazio p{margin:0;}
.pei-alunos{margin-top:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;}
.pei-aluno{display:flex;align-items:center;gap:10px;text-align:left;padding:10px 12px;border:1.5px solid var(--pn-line);border-radius:14px;background:var(--pn-surface);cursor:pointer;color:var(--pn-ink);font:inherit;min-width:0;}
.pei-aluno:hover{border-color:var(--pn-ink);}
.pei-aluno.on{border:2px solid var(--pn-ink);background:var(--pn-green-soft);box-shadow:3px 3px 0 var(--pn-ink);}
.pei-aluno .av{flex:none;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:var(--pn-lilac);border:1.5px solid var(--pn-ink);font-weight:800;font-family:var(--pn-display);}
.pei-aluno.on .av{background:var(--pn-green);color:#fff;}
.pei-aluno .tx{display:flex;flex-direction:column;min-width:0;}
.pei-aluno b{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pei-aluno small{color:var(--pn-muted);font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pei-linha{margin-top:16px;display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;}
.pei-campo{display:flex;flex-direction:column;gap:6px;font-size:14px;font-weight:700;}
.pei-campo select,.pei-root textarea,.pei-root input{font:inherit;font-weight:400;font-size:15px;color:var(--pn-ink);background:var(--pn-surface);border:1.5px solid var(--pn-line);border-radius:12px;padding:10px 12px;width:100%;box-sizing:border-box;}
.pei-campo select{min-width:200px;height:44px;}
.pei-root textarea{resize:vertical;line-height:1.45;}
.pei-root textarea:focus,.pei-root input:focus,.pei-campo select:focus{outline:none;border-color:var(--pn-ink);box-shadow:0 0 0 3px rgba(11,122,85,.18);}
.pei-tags{display:flex;gap:6px;flex-wrap:wrap;padding-bottom:10px;}
.pei-tag{font-size:12.5px;font-weight:600;padding:4px 10px;border-radius:999px;background:var(--pn-blue-soft);border:1.5px solid var(--pn-ink);}
.pei-tag.ok{background:var(--pn-green-soft);}
.pei-tag.aviso{background:var(--pn-cream);}
.pei-mais{margin-top:14px;}
.pei-mais summary{cursor:pointer;font-weight:600;font-size:14px;color:var(--pn-green);}
.pei-mais textarea{margin-top:8px;}
.pei-gerar{margin-top:16px;width:100%;height:52px;font-size:16px;}
.pei-link{display:inline-flex;align-items:center;gap:6px;background:none;border:0;padding:6px 4px;color:var(--pn-green);font:inherit;font-weight:700;font-size:14px;cursor:pointer;}
.pei-link:hover{text-decoration:underline;}
.pei-apagar{flex:none;width:38px;height:38px;display:grid;place-items:center;border-radius:10px;border:1.5px solid var(--pn-line);background:var(--pn-surface);color:var(--pn-coral);cursor:pointer;}
.pei-apagar:hover{border-color:var(--pn-coral);background:#FFF1EE;}
.pei-status{font-weight:700;color:#8A5A00;}
.pei-status.ok{color:var(--pn-green);}
.pei-dica{margin:14px 0 6px;font-size:14px;background:var(--pn-cream);border-radius:12px;padding:10px 12px;}
.pei-sec{border-top:1.5px solid var(--pn-line);}
.pei-sec:first-of-type{margin-top:8px;}
.pei-sec summary{list-style:none;display:flex;align-items:center;gap:12px;padding:14px 2px;cursor:pointer;}
.pei-sec summary::-webkit-details-marker{display:none;}
.pei-sec summary b{flex:1;font-family:var(--pn-display);font-size:17px;font-weight:700;letter-spacing:-.02em;}
.pei-sec .ic{flex:none;width:38px;height:38px;border-radius:11px;display:grid;place-items:center;font-size:18px;border:1.5px solid var(--pn-ink);background:var(--pn-green-soft);}
.pei-sec .ic.sun{background:var(--pn-sun);} .pei-sec .ic.coral{background:var(--pn-pink);} .pei-sec .ic.sky{background:var(--pn-blue-soft);}
.pei-sec .ic.lilac{background:var(--pn-lilac);} .pei-sec .ic.cream{background:var(--pn-cream);}
.pei-sec .qtd{font-size:12.5px;font-weight:700;padding:2px 9px;border-radius:999px;background:var(--pn-bg);border:1.5px solid var(--pn-line);}
.pei-sec .seta{transition:transform .15s;color:var(--pn-muted);}
.pei-sec[open] .seta{transform:rotate(180deg);}
.pei-sec-corpo{padding:0 2px 18px;display:flex;flex-direction:column;gap:14px;}
.pei-field .lb{font-size:13px;font-weight:700;color:var(--pn-muted);margin-bottom:6px;}
.pei-lista{display:flex;flex-direction:column;gap:8px;align-items:stretch;}
.pei-lista > .pei-link{align-self:flex-start;}
.pei-item{display:flex;gap:8px;align-items:flex-start;}
.pei-item textarea{min-height:44px;field-sizing:content;}
.pei-meta{display:flex;gap:10px;align-items:flex-start;padding:12px;border:1.5px solid var(--pn-line);border-radius:14px;background:#FAFBFD;}
.pei-meta .n{flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:var(--pn-ink);color:#fff;font-size:13px;font-weight:800;margin-top:2px;}
.pei-meta .campos{flex:1;min-width:0;display:flex;flex-direction:column;gap:10px;}
.pei-rodape{display:flex;justify-content:flex-end;padding-top:16px;border-top:1.5px solid var(--pn-line);}
.pei-salvos{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column;gap:8px;}
.pei-salvos li{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1.5px solid var(--pn-line);border-radius:14px;}
.pei-salvos li.on{border-color:var(--pn-green);background:var(--pn-green-soft);}
.pei-salvos .tx{flex:1;min-width:0;display:flex;flex-direction:column;}
.pei-salvos b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pei-salvos small{color:var(--pn-muted);font-size:13px;}
.pei-abrir{height:38px;padding:0 14px;}
.pei-debug pre{font-size:11px;white-space:pre-wrap;word-break:break-word;max-height:260px;overflow:auto;background:var(--pn-bg);padding:8px;border-radius:8px;}
.pei-debug-item{margin-top:10px;}
@media(max-width:640px){
  .pei-main{padding:16px 16px 120px;gap:14px;}
  .pei-title{font-size:28px;}
  .pei-card{padding:16px;border-radius:18px;box-shadow:3px 3px 0 var(--pn-ink);}
  .pei-alunos{grid-template-columns:1fr;}
  .pei-campo,.pei-campo select{width:100%;min-width:0;}
  .pei-cab > .pn-btn{width:100%;}
  .pei-rodape .pn-btn{width:100%;}
  .pei-meta{padding:10px;gap:8px;}
  .pei-meta .n{display:none;}
}
`;
